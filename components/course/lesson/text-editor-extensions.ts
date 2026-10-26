import StarterKit from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import type { Extensions } from "@tiptap/react";
import { createLowlight } from "lowlight";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";

import {
  DEFAULT_CODE_LANGUAGE,
  isAllowedLinkHref,
} from "@/lib/modules/course-authoring/text-body";

/**
 * Only the languages in `TEXT_CODE_LANGUAGES` are registered — not lowlight's
 * `common` set (~36 grammars the product never offers). `html` is the `xml`
 * grammar under another name.
 */
const lowlight = createLowlight({
  bash,
  css,
  javascript,
  json,
  plaintext,
  python,
  sql,
  typescript,
  xml,
});
lowlight.registerAlias({ xml: ["html"] });

/**
 * The single source of truth for what a Text Lesson can contain. The authoring
 * editor (Story 2.5) and every read-only renderer (Story 2.9 preview, the Epic 4
 * learner view) build their editor from this list, so the schema cannot drift
 * between author and reader. Mirrors the allowlist in `parseTextBody` — if a
 * node or mark is added here, add it there (and vice versa).
 */
export function createTextExtensions(): Extensions {
  // A fresh array per call: Tiptap keeps per-instance extension state, so editors
  // must not share one instance. Callers create it once (useMemo).
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      codeBlock: false,
      strike: false,
      underline: false,
      horizontalRule: false,
      link: {
        openOnClick: false,
        autolink: true,
        isAllowedUri: (url) => isAllowedLinkHref(url),
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      },
    }),
    CodeBlockLowlight.configure({
      lowlight,
      // A block with no explicit language attr (`null`) is highlighted as this;
      // `parseTextBody` stores the same default so author, server and reader agree.
      defaultLanguage: DEFAULT_CODE_LANGUAGE,
      // AC #1 / AC #3: a code block is LTR + monospace regardless of the page
      // or the document's direction.
      HTMLAttributes: { dir: "ltr", class: "lesson-code" },
    }),
  ];
}
