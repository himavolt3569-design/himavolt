"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, RemoveFormatting } from "lucide-react";

// Tags we keep when persisting the editor's HTML. Everything else is unwrapped
// and every attribute is dropped, so stored descriptions can never carry style
// injection, event handlers, or broken markup into the public pages.
const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "OL", "UL", "LI", "P", "BR", "DIV", "SPAN"]);

/** Strip to an allowlist of formatting tags and remove all attributes. */
export function sanitizeRichText(html: string): string {
  if (typeof document === "undefined" || !html) return html ?? "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
        if (ALLOWED_TAGS.has(el.tagName)) {
          walk(el);
        } else {
          // Unwrap disallowed elements, keeping their contents.
          while (el.firstChild) node.insertBefore(el.firstChild, el);
          node.removeChild(el);
        }
      } else if (child.nodeType === Node.COMMENT_NODE) {
        node.removeChild(child);
      }
    }
  };
  walk(doc.body);
  return doc.body.innerHTML.trim();
}

/** Plain-text projection of rich HTML — for card previews and line-clamping. */
export function stripHtml(html?: string | null): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

type Cmd = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList" | "removeFormat";

const TOOLS: { cmd: Cmd; icon: typeof Bold; label: string }[] = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { cmd: "insertUnorderedList", icon: List, label: "Bulleted list" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
  { cmd: "removeFormat", icon: RemoveFormatting, label: "Clear formatting" },
];

/**
 * Lightweight rich-text editor: bold / italic / underline / bulleted &
 * numbered lists. Built on contentEditable + execCommand so it ships with zero
 * new dependencies. Uncontrolled internally (execCommand manages the caret) and
 * emits sanitized HTML on every change.
 */
export default function RichTextEditor({ value, onChange, placeholder, className = "" }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(!stripHtml(value));
  const [active, setActive] = useState<Record<string, boolean>>({});

  // Seed the editable region once on mount; execCommand owns it thereafter.
  useEffect(() => {
    if (ref.current && value) ref.current.innerHTML = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    if (!ref.current) return;
    setEmpty(!stripHtml(ref.current.innerHTML));
    onChange(sanitizeRichText(ref.current.innerHTML));
  };

  const refreshActive = () => {
    if (typeof document === "undefined") return;
    try {
      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      /* queryCommandState can throw when the selection is detached */
    }
  };

  const run = (cmd: Cmd) => {
    ref.current?.focus();
    document.execCommand(cmd, false);
    emit();
    refreshActive();
  };

  return (
    <div className={`overflow-hidden rounded-xl ring-1 ring-[var(--border)] bg-[var(--canvas-sub)] focus-within:ring-2 focus-within:ring-[var(--accent)] transition-all ${className}`}>
      <div className="flex items-center gap-0.5 border-b border-[var(--border)] bg-[var(--canvas)] px-1.5 py-1">
        {TOOLS.map(({ cmd, icon: Icon, label }, i) => (
          <div key={cmd} className="flex items-center">
            {cmd === "removeFormat" && <span className="mx-1 h-4 w-px bg-[var(--border)]" />}
            <button
              type="button"
              // onMouseDown (not onClick) so the editor keeps its selection.
              onMouseDown={(e) => { e.preventDefault(); run(cmd); }}
              title={label}
              aria-label={label}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                active[cmd]
                  ? "bg-[var(--accent-muted)] text-[var(--accent-text)]"
                  : "text-[var(--text-2)] hover:bg-[var(--canvas-sub)] hover:text-[var(--text-1)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          </div>
        ))}
      </div>

      <div className="relative">
        {empty && placeholder && (
          <span className="pointer-events-none absolute left-3.5 top-2.5 text-[13px] text-[var(--text-3)]">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={emit}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
          onFocus={refreshActive}
          className="rich-text-content min-h-[92px] max-h-64 overflow-y-auto px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-[var(--text-1)] outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-0.5"
        />
      </div>
    </div>
  );
}
