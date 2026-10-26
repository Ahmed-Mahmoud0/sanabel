"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  SquareCode,
  Undo2,
} from "lucide-react";

import { updateLessonContentAction } from "@/lib/modules/course-authoring/actions";
import type { CourseContentLanguage } from "@/lib/modules/course-authoring/course";
import {
  isAllowedLinkHref,
  isTextCodeLanguage,
  normalizeCodeLanguage,
  parseTextBody,
  TEXT_CODE_LANGUAGES,
  type TextDoc,
} from "@/lib/modules/course-authoring/text-body";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/auth/form-message";

import { createTextExtensions } from "./text-editor-extensions";

type Saver = () => Promise<boolean>;

/**
 * The Text Lesson surface (Story 2.5): a Tiptap editor + toolbar that autosaves
 * the lesson body as AD-4 field-group (b) through the same debounced
 * `scheduleSave` the Video panel uses. With `editable={false}` it is the
 * read-only renderer Stories 2.9 / Epic 4 reuse (no toolbar).
 *
 * Direction (AC #3): the base direction is the **Course's** content language
 * (AD-9), never the viewer's UI locale. Code blocks and inline code are fixed
 * LTR (see `.lesson-prose` in `globals.css`).
 */
export function TextLessonPanel({
  lessonId,
  contentLanguage,
  initialDoc,
  scheduleSave,
  flushSave,
  editable = true,
}: {
  lessonId: string;
  contentLanguage: CourseContentLanguage;
  initialDoc: TextDoc | null;
  scheduleSave?: (fieldKey: string, saver: Saver) => void;
  /** Dispatch debounced saves now — called when the editor loses focus. */
  flushSave?: () => void;
  editable?: boolean;
}) {
  const t = useTranslations("Course");
  const labelId = useId();
  const [tooLong, setTooLong] = useState(false);

  // The editor is created once; its callbacks read the latest props via refs
  // (written in an effect — `react-hooks/refs` forbids writing during render).
  const scheduleRef = useRef(scheduleSave);
  const flushRef = useRef(flushSave);
  useEffect(() => {
    scheduleRef.current = scheduleSave;
    flushRef.current = flushSave;
  }, [scheduleSave, flushSave]);

  const extensions = useMemo(() => createTextExtensions(), []);

  const editor = useEditor({
    extensions,
    content: initialDoc ?? undefined,
    editable,
    immediatelyRender: false,
    editorProps: {
      // The textbox semantics only make sense while editable; the read-only
      // renderer (Stories 2.9 / Epic 4) is plain content.
      attributes: editable
        ? {
            role: "textbox",
            "aria-multiline": "true",
            "aria-labelledby": labelId,
            class: "lesson-prose-content",
          }
        : { class: "lesson-prose-content" },
    },
    // Leaving the editor (a click on a nav link, Tab away) blurs it *before* the
    // route changes, so the pending save is sent from this page — the one whose
    // bundle owns `updateLessonContentAction`.
    onBlur: () => flushRef.current?.(),
    onUpdate: ({ editor: current }) => {
      // Same parser the server runs: an over-limit / too-complex document shows
      // the inline message at once.
      setTooLong(!parseTextBody({ doc: current.getJSON() }).ok);
      // Always schedule, so the header status machine tracks the edit (and the
      // beforeunload guard arms). getJSON() runs inside the saver so the
      // debounced write sends the latest state — and re-checks it: a doc that is
      // invalid *now* is never sent (the server would reject it and Retry would
      // loop); returning false surfaces the header error instead.
      scheduleRef.current?.(`content:${lessonId}`, async () => {
        const doc = current.getJSON();
        if (!parseTextBody({ doc }).ok) return false;
        return (await updateLessonContentAction(lessonId, { doc })).ok;
      });
    },
  });

  const dir = contentLanguage === "ar" ? "rtl" : "ltr";

  return (
    <div className="mt-6 flex flex-col gap-3">
      {editable && (
        <span id={labelId} className="text-label text-text-primary">
          {t("lesson.text.editorLabel")}
        </span>
      )}

      {editable && editor && <TextToolbar editor={editor} />}

      <div
        dir={dir}
        lang={contentLanguage}
        data-readonly={editable ? undefined : ""}
        className={cn(
          "lesson-prose relative rounded-lg border border-border-hairline bg-surface-raised",
          editable && "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        )}
      >
        {editor ? (
          <>
            {editable && <EditorPlaceholder editor={editor} text={t("lesson.text.placeholder")} />}
            <EditorContent editor={editor} />
          </>
        ) : (
          <div className="min-h-48" aria-hidden="true" />
        )}
      </div>

      {tooLong && <FormMessage tone="error">{t("lesson.text.error.tooLong")}</FormMessage>}
    </div>
  );
}

function EditorPlaceholder({ editor, text }: { editor: Editor; text: string }) {
  // Only a document that is a single empty paragraph — an empty first heading /
  // list / code block would collide with the overlay.
  const isBlank = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current.isEmpty &&
      current.state.doc.childCount === 1 &&
      current.state.doc.firstChild?.type.name === "paragraph",
  });
  if (!isBlank) return null;
  return (
    <p
      aria-hidden="true"
      className="pointer-events-none absolute start-4 top-3 text-body text-text-disabled"
    >
      {text}
    </p>
  );
}

function TextToolbar({ editor }: { editor: Editor }) {
  const t = useTranslations("Course");
  const uid = useId();
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState(false);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      code: current.isActive("code"),
      h2: current.isActive("heading", { level: 2 }),
      h3: current.isActive("heading", { level: 3 }),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      blockquote: current.isActive("blockquote"),
      link: current.isActive("link"),
      codeBlock: current.isActive("codeBlock"),
      // Same rule the server applies, so an alias (js) shows its real option.
      language: normalizeCodeLanguage(current.getAttributes("codeBlock").language),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });

  function openLink() {
    setLinkUrl((editor.getAttributes("link").href as string | undefined) ?? "");
    setLinkError(false);
    setLinkOpen(true);
  }

  function closeLink() {
    setLinkOpen(false);
    editor.chain().focus().run();
  }

  function applyLink() {
    const trimmed = linkUrl.trim();
    const href = toLinkHref(trimmed);
    if (!trimmed || !isAllowedLinkHref(href)) {
      setLinkError(true);
      return;
    }
    const chain = editor.chain().focus();
    if (editor.state.selection.empty && !editor.isActive("link")) {
      chain
        .insertContent({
          type: "text",
          text: href,
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    } else {
      chain.extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  function removeLink() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="toolbar"
        aria-label={t("lesson.text.toolbarLabel")}
        className="flex flex-wrap items-center gap-1 rounded-lg border border-border-hairline bg-surface-raised p-1"
      >
        <ToolButton
          label={t("lesson.text.bold")}
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolButton>
        <ToolButton
          label={t("lesson.text.italic")}
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolButton>
        <ToolButton
          label={t("lesson.text.code")}
          active={state.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code />
        </ToolButton>
        <ToolButton
          label={t("lesson.text.heading2")}
          active={state.h2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 />
        </ToolButton>
        <ToolButton
          label={t("lesson.text.heading3")}
          active={state.h3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 />
        </ToolButton>
        <ToolButton
          label={t("lesson.text.bulletList")}
          active={state.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolButton>
        <ToolButton
          label={t("lesson.text.orderedList")}
          active={state.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolButton>
        <ToolButton
          label={t("lesson.text.quote")}
          active={state.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </ToolButton>
        <ToolButton
          label={t("lesson.text.link")}
          active={state.link}
          expanded={linkOpen}
          onClick={openLink}
        >
          <Link2 />
        </ToolButton>
        <ToolButton
          label={t("lesson.text.codeBlock")}
          active={state.codeBlock}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <SquareCode />
        </ToolButton>
        <ToolButton
          label={t("lesson.text.undo")}
          disabled={!state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="rtl:-scale-x-100" />
        </ToolButton>
        <ToolButton
          label={t("lesson.text.redo")}
          disabled={!state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="rtl:-scale-x-100" />
        </ToolButton>

        <div className="ms-auto flex items-center gap-2 ps-2">
          <label htmlFor={`${uid}-code-language`} className="text-body-sm text-text-secondary">
            {t("lesson.text.codeLanguageLabel")}
          </label>
          <select
            id={`${uid}-code-language`}
            value={state.codeBlock ? state.language : ""}
            disabled={!state.codeBlock}
            onChange={(event) => {
              const next = event.target.value;
              if (!isTextCodeLanguage(next)) return;
              editor.chain().focus().updateAttributes("codeBlock", { language: next }).run();
            }}
            className="h-11 rounded-lg border border-border-hairline bg-surface-raised px-2 text-body-sm text-text-primary disabled:opacity-50"
          >
            {!state.codeBlock && <option value="" />}
            {TEXT_CODE_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language === "plaintext" ? t("lesson.text.codeLanguagePlain") : language}
              </option>
            ))}
          </select>
        </div>
      </div>

      {linkOpen && (
        <div className="flex flex-col gap-2 rounded-lg border border-border-hairline bg-surface-raised p-3">
          <label htmlFor={`${uid}-link-url`} className="text-label text-text-primary">
            {t("lesson.text.linkUrlLabel")}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={`${uid}-link-url`}
              type="url"
              dir="ltr"
              value={linkUrl}
              aria-invalid={linkError}
              onChange={(event) => {
                setLinkUrl(event.target.value);
                setLinkError(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                }
                if (event.key === "Escape") closeLink();
              }}
              className="h-11 min-w-0 flex-1"
              autoFocus
            />
            <Button type="button" onClick={applyLink}>
              {t("lesson.text.linkApply")}
            </Button>
            {state.link && (
              <Button type="button" variant="outline" onClick={removeLink}>
                {t("lesson.text.linkRemove")}
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={closeLink}>
              {t("lesson.text.linkCancel")}
            </Button>
          </div>
          {linkError && <FormMessage tone="error">{t("lesson.text.linkInvalid")}</FormMessage>}
        </div>
      )}
    </div>
  );
}

/**
 * Bare "example.com" -> https://; a bare e-mail -> mailto:; host:port is
 * schemeless. An explicit scheme is kept as typed so javascript: is rejected by
 * the allowlist rather than rewritten.
 */
function toLinkHref(input: string): string {
  if (/^[^\s@/:]+@[^\s@/:]+\.[^\s@/:]+$/.test(input)) return `mailto:${input}`;
  const hasScheme =
    /^[a-z][a-z0-9+.-]*:/i.test(input) && !/^[^:/?#]+:\d+(?:[/?#]|$)/.test(input);
  return hasScheme ? input : `https://${input}`;
}

function ToolButton({
  label,
  active,
  expanded,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  /** Disclosure buttons (Link) expose aria-expanded instead of aria-pressed. */
  expanded?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={expanded !== undefined || active === undefined ? undefined : active}
      aria-expanded={expanded}
      disabled={disabled}
      // Keep the editor's focus + selection when a toolbar button is clicked.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
