import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { parseRichText, type RichTextInline } from "@/lib/listings/rich-text";

function Inline({ parts }: { parts: RichTextInline[] }) {
  return (
    <>
      {parts.map((part, i) => {
        if (part.kind === "bold") {
          return (
            <strong key={i} className="font-semibold text-gray-800">
              {part.text}
            </strong>
          );
        }
        if (part.kind === "italic") {
          return (
            <em key={i} className="italic">
              {part.text}
            </em>
          );
        }
        return <Fragment key={i}>{part.text}</Fragment>;
      })}
    </>
  );
}

export function RichTextView({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const blocks = parseRichText(value);
  if (!blocks.length) return null;

  return (
    <div className={cn("text-gray-600 text-sm leading-relaxed space-y-3 text-start", className)}>
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return (
            <h3 key={i} className="text-sm font-bold text-gray-800 mt-4 first:mt-0">
              <Inline parts={block.content} />
            </h3>
          );
        }

        if (block.kind === "bullets") {
          return (
            <ul key={i} className="space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="mt-[0.45rem] w-1.5 h-1.5 rounded-full bg-green-600 shrink-0" />
                  <span className="min-w-0">
                    <Inline parts={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.kind === "numbers") {
          return (
            <ol key={i} className="space-y-1.5">
              {block.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-green-700 mt-0.5 shrink-0 tabular-nums">
                    {j + 1}.
                  </span>
                  <span className="min-w-0">
                    <Inline parts={item} />
                  </span>
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={i}>
            <Inline parts={block.content} />
          </p>
        );
      })}
    </div>
  );
}
