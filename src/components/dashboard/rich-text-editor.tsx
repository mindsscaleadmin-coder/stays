"use client";

import { useRef, useState } from "react";
import { Bold, Eye, Heading, Italic, List, ListOrdered, Pencil } from "lucide-react";
import { RichTextView } from "@/components/listing/rich-text-view";
import { cn } from "@/lib/utils";

type LinePrefix = "## " | "- " | "1. ";

const TOOLS: {
  label: string;
  icon: typeof Bold;
  marker?: string;
  prefix?: LinePrefix;
}[] = [
  { label: "Bold", icon: Bold, marker: "**" },
  { label: "Italic", icon: Italic, marker: "*" },
  { label: "Heading", icon: Heading, prefix: "## " },
  { label: "Bullet list", icon: List, prefix: "- " },
  { label: "Numbered list", icon: ListOrdered, prefix: "1. " },
];

export function RichTextEditor({
  id,
  name,
  value,
  onChange,
  rows = 8,
  placeholder,
  className,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  function applySelection(next: string, start: number, end: number) {
    onChange(next);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, end);
    });
  }

  function wrap(marker: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end) || "text";
    const next = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;
    const from = start + marker.length;
    applySelection(next, from, from + selected.length);
  }

  function prefixLines(prefix: LinePrefix) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEndIndex = value.indexOf("\n", end);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const block = value.slice(lineStart, lineEnd) || "text";

    const updated = block
      .split("\n")
      .map((line, i) => {
        const clean = line.replace(/^\s*(?:#{1,6}\s+|[-*•]\s+|\d+[.)]\s+)/, "");
        const marker = prefix === "1. " ? `${i + 1}. ` : prefix;
        return `${marker}${clean}`;
      })
      .join("\n");

    const next = `${value.slice(0, lineStart)}${updated}${value.slice(lineEnd)}`;
    applySelection(next, lineStart, lineStart + updated.length);
  }

  const toolButton =
    "inline-flex items-center justify-center gap-1 h-8 px-2 rounded-lg border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 transition-colors";

  return (
    <div className={cn("rounded-lg border border-gray-200 overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-2 py-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            // Keep the textarea selection so formatting applies where the cursor is.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              tool.marker ? wrap(tool.marker) : prefixLines(tool.prefix as LinePrefix)
            }
            disabled={preview}
            className={cn(toolButton, preview && "opacity-40 cursor-not-allowed")}
            title={tool.label}
            aria-label={tool.label}
          >
            <tool.icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreview((open) => !open)}
          className={cn(toolButton, "ms-auto text-xs font-semibold px-2.5")}
          title={preview ? "Back to editing" : "Preview formatting"}
        >
          {preview ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {preview ? "Edit" : "Preview"}
        </button>
      </div>

      {preview ? (
        <div className="px-3 py-2.5 min-h-[7rem] bg-white">
          {name && <input type="hidden" name={name} value={value} />}
          {value.trim() ? (
            <RichTextView value={value} />
          ) : (
            <p className="text-sm text-gray-400">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          id={id}
          name={name}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
        />
      )}

      <p className="border-t border-gray-100 bg-gray-50 px-3 py-1.5 text-[11px] text-gray-400">
        Blank line starts a new paragraph. **bold**, *italic*, - bullets, 1. numbered.
      </p>
    </div>
  );
}
