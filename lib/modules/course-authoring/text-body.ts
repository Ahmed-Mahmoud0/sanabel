/**
 * Course Authoring — Text Lesson content body: shape, limits, and the
 * server-side sanitizer (Story 2.5).
 *
 * Import-free (no `db`, no `drizzle-orm`, no Tiptap), the same rule as
 * `media.ts` / `course.ts`: the browser editor and `updateLessonContentAction`
 * both call `parseTextBody`, so the shape rule has exactly one home.
 *
 * The stored value is ProseMirror/Tiptap JSON — never HTML. `parseTextBody`
 * **rebuilds** the document from a hard allowlist instead of validating and
 * passing the input through, so unknown nodes, marks, attributes and
 * `javascript:` links can never reach the database (or, later, the learner's
 * browser). AD-4 field-group (b): the body lives in `lesson.content_body`.
 */

/** One membership-guard factory instead of a hand-rolled body per tuple. */
function memberOf<T extends string>(
  values: readonly T[],
): (value: unknown) => value is T {
  const set: ReadonlySet<string> = new Set(values);
  return (value): value is T => typeof value === "string" && set.has(value);
}

/**
 * Languages a code block can be highlighted as. Proper names, not i18n'd
 * (except the "plaintext" label). `plaintext` is an explicit, registered
 * choice rather than `null`: Tiptap's lowlight plugin treats a null language as
 * "use the default / auto-detect", which would colour plain prose as code.
 */
export const TEXT_CODE_LANGUAGES = [
  "sql",
  "python",
  "javascript",
  "typescript",
  "json",
  "bash",
  "html",
  "css",
  "plaintext",
] as const;
export type TextCodeLanguage = (typeof TEXT_CODE_LANGUAGES)[number];
export const isTextCodeLanguage = memberOf(TEXT_CODE_LANGUAGES);

/** v1's exercise scope is SQL-only (AD-8) and the AC's own example is SQL. */
export const DEFAULT_CODE_LANGUAGE: TextCodeLanguage = "sql";

/**
 * Fence names the editor's highlighter resolves (highlight.js aliases) mapped to
 * the canonical language we store — so ```js is stored as `javascript`, not
 * degraded to plain text.
 */
const CODE_LANGUAGE_ALIASES: Readonly<Record<string, TextCodeLanguage>> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  htm: "html",
  xml: "html",
  text: "plaintext",
  txt: "plaintext",
  plain: "plaintext",
};

/**
 * The one rule for a code block's language: absent/`null` → the default (what
 * the editor highlights it as), a canonical name or known alias → canonical,
 * anything else (`ruby`, a non-string) → plain text.
 */
export function normalizeCodeLanguage(value: unknown): TextCodeLanguage {
  if (value === null || value === undefined) return DEFAULT_CODE_LANGUAGE;
  if (typeof value !== "string") return "plaintext";
  const name = value.trim().toLowerCase();
  if (isTextCodeLanguage(name)) return name;
  return Object.hasOwn(CODE_LANGUAGE_ALIASES, name)
    ? CODE_LANGUAGE_ALIASES[name]
    : "plaintext";
}

/**
 * `[ASSUMPTION]` Limits on a stored Text body. Adjust with a one-line edit.
 * 100 KB of serialized JSON is far above any realistic lesson and far below the
 * Server Action default body limit (1 MB), so `next.config.ts` stays untouched.
 */
export const TEXT_BODY_MAX_BYTES = 100_000;
// Counts every container level (a nested list costs 2: list + listItem), so 24
// allows ~10 levels of nested lists while still stopping a nesting bomb.
export const TEXT_BODY_MAX_DEPTH = 24;
export const TEXT_BODY_MAX_NODES = 5_000;
export const TEXT_LINK_MAX_LENGTH = 2048;

/** Link schemes a Text Lesson may carry (XSS gate — no `javascript:`/`data:`). */
const ALLOWED_LINK_PROTOCOLS: ReadonlySet<string> = new Set([
  "http:",
  "https:",
  "mailto:",
]);

export interface TextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TextNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TextNode[];
  marks?: TextMark[];
  text?: string;
}

export interface TextDoc {
  type: "doc";
  content: TextNode[];
}

/** `lesson.content_body` for a Text Lesson. `{}` means "empty lesson". */
export interface TextContentBody {
  doc?: TextDoc;
}

export type ParseTextBodyResult =
  | { ok: true; value: TextContentBody }
  | { ok: false; error: "content_invalid" };

/** True when `value` is a safe link target per the allowlist above. */
export function isAllowedLinkHref(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.length > TEXT_LINK_MAX_LENGTH) return false;
  try {
    return ALLOWED_LINK_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

const BLOCKS = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "blockquote",
  "codeBlock",
] as const;
const INLINE = ["text", "hardBreak"] as const;

/** Which child node types each parent may contain. */
const CHILDREN: Record<string, readonly string[]> = {
  doc: BLOCKS,
  paragraph: INLINE,
  heading: INLINE,
  bulletList: ["listItem"],
  orderedList: ["listItem"],
  listItem: BLOCKS,
  blockquote: BLOCKS,
  codeBlock: ["text"],
  text: [],
  hardBreak: [],
};

const MARK_TYPES: ReadonlySet<string> = new Set(["bold", "italic", "code", "link"]);

/** NUL and unpaired surrogates serialize to JSON escapes Postgres jsonb rejects. */
const UNSTORABLE_TEXT =
  /\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

class InvalidBody extends Error {}

function fail(): never {
  throw new InvalidBody();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rebuildMarks(raw: unknown, inCodeBlock: boolean): TextMark[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) fail();
  if (raw.length === 0) return undefined;
  if (inCodeBlock) fail();

  const seen = new Set<string>();
  const marks: TextMark[] = [];
  for (const entry of raw) {
    if (!isPlainObject(entry) || typeof entry.type !== "string") fail();
    if (!MARK_TYPES.has(entry.type)) fail();
    if (seen.has(entry.type)) continue;
    seen.add(entry.type);

    if (entry.type === "link") {
      const attrs = entry.attrs;
      if (!isPlainObject(attrs) || !isAllowedLinkHref(attrs.href)) fail();
      marks.push({ type: "link", attrs: { href: attrs.href } });
    } else {
      marks.push({ type: entry.type });
    }
  }
  return marks.length > 0 ? marks : undefined;
}

function rebuildNode(
  raw: unknown,
  parentType: string,
  depth: number,
  counter: { nodes: number },
): TextNode {
  if (!isPlainObject(raw) || typeof raw.type !== "string") fail();
  if (depth > TEXT_BODY_MAX_DEPTH) fail();
  counter.nodes += 1;
  if (counter.nodes > TEXT_BODY_MAX_NODES) fail();

  const type = raw.type;
  if (!CHILDREN[parentType]?.includes(type)) fail();

  if (type === "text") {
    if (typeof raw.text !== "string" || raw.text.length === 0) fail();
    if (UNSTORABLE_TEXT.test(raw.text)) fail();
    const node: TextNode = { type: "text", text: raw.text };
    const marks = rebuildMarks(raw.marks, parentType === "codeBlock");
    if (marks) node.marks = marks;
    return node;
  }

  if (type === "hardBreak") {
    // ProseMirror lets a hard break inherit the surrounding marks (Shift+Enter
    // inside bold text, a pasted <strong>a<br>b</strong>). Validate them against
    // the allowlist but store none — marks on a line break carry no meaning.
    rebuildMarks(raw.marks, false);
    return { type };
  }

  // Every other non-text node carries no marks.
  if (raw.marks !== undefined && !(Array.isArray(raw.marks) && raw.marks.length === 0)) {
    fail();
  }

  const rawChildren = raw.content;
  if (rawChildren !== undefined && !Array.isArray(rawChildren)) fail();
  const children = (rawChildren ?? []).map((child: unknown) =>
    rebuildNode(child, type, depth + 1, counter),
  );

  // Containers whose schema requires at least one child.
  if (
    (type === "bulletList" ||
      type === "orderedList" ||
      type === "listItem" ||
      type === "blockquote") &&
    children.length === 0
  ) {
    fail();
  }
  // Tiptap's listItem content is `paragraph block*` — a list item must open
  // with a paragraph (the editor's schema rejects anything else).
  if (type === "listItem" && children[0].type !== "paragraph") fail();

  const node: TextNode = { type };

  if (type === "heading") {
    const level = isPlainObject(raw.attrs) ? raw.attrs.level : undefined;
    if (level !== 2 && level !== 3) fail();
    node.attrs = { level };
  } else if (type === "codeBlock") {
    const language = isPlainObject(raw.attrs) ? raw.attrs.language : undefined;
    // `normalizeCodeLanguage`: no language → the default the editor highlights
    // it as; an alias (`js`) → canonical; unknown (`ruby`) → plain text — a
    // pasted fence must not fail the autosave.
    node.attrs = { language: normalizeCodeLanguage(language) };
  } else if (type === "orderedList") {
    // Keep a custom start number (typing `3. ` starts a list at 3); 1 is the
    // default and is not stored.
    const start = isPlainObject(raw.attrs) ? raw.attrs.start : undefined;
    if (Number.isInteger(start) && (start as number) > 1 && (start as number) <= 999_999) {
      node.attrs = { start };
    }
  }

  if (children.length > 0) node.content = children;
  return node;
}

function isEmptyDoc(blocks: readonly TextNode[]): boolean {
  return blocks.every((block) => block.type === "paragraph" && !block.content);
}

/**
 * Validate and rebuild a Text Lesson body from an untrusted source. Pure and
 * import-free: called by `parseLessonContentBody("text", …)` on the server and
 * by the editor for a client-side "too long" pre-check.
 */
export function parseTextBody(raw: unknown): ParseTextBodyResult {
  try {
    if (!isPlainObject(raw)) fail();
    if (Object.keys(raw).some((key) => key !== "doc")) fail();
    if (raw.doc === undefined) return { ok: true, value: {} };

    const doc = raw.doc;
    if (!isPlainObject(doc) || doc.type !== "doc") fail();
    if (doc.content !== undefined && !Array.isArray(doc.content)) fail();

    const counter = { nodes: 0 };
    const blocks = (doc.content ?? []).map((child: unknown) =>
      rebuildNode(child, "doc", 1, counter),
    );

    if (isEmptyDoc(blocks)) return { ok: true, value: {} };

    const rebuilt: TextDoc = { type: "doc", content: blocks };
    if (new TextEncoder().encode(JSON.stringify(rebuilt)).length > TEXT_BODY_MAX_BYTES) {
      fail();
    }
    return { ok: true, value: { doc: rebuilt } };
  } catch (error) {
    if (error instanceof InvalidBody) return { ok: false, error: "content_invalid" };
    throw error;
  }
}

/** True when a stored body holds no text (null, `{}`, or no `doc`). */
export function isTextBodyEmpty(body: TextContentBody | null | undefined): boolean {
  return !body?.doc;
}

/**
 * The stored doc of a Text Lesson body, or `null` when empty / not a Text body.
 * Re-runs the sanitizer on read, so a row written before it existed (or by any
 * other path) can never hand unvetted content to the editor or a renderer.
 */
export function textDocOf(body: object | null | undefined): TextDoc | null {
  if (!body || !("doc" in body)) return null;
  const parsed = parseTextBody({ doc: (body as { doc?: unknown }).doc });
  return parsed.ok ? (parsed.value.doc ?? null) : null;
}
