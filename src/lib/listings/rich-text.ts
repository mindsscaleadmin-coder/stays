/**
 * Minimal markdown subset used for listing descriptions.
 * Supported: blank-line paragraphs, "## " headings, "- " bullets,
 * "1. " numbered items, **bold** and *italic*.
 */

export type RichTextInline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string };

export type RichTextBlock =
  | { kind: "heading"; content: RichTextInline[] }
  | { kind: "paragraph"; content: RichTextInline[] }
  | { kind: "bullets"; items: RichTextInline[][] }
  | { kind: "numbers"; items: RichTextInline[][] };

const BULLET = /^\s*[-*•]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;
const HEADING = /^\s*#{1,6}\s+/;

export function parseInline(text: string): RichTextInline[] {
  const out: RichTextInline[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      out.push({ kind: "text", text: text.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      out.push({ kind: "bold", text: match[1] });
    } else if (match[2] !== undefined) {
      out.push({ kind: "italic", text: match[2] });
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    out.push({ kind: "text", text: text.slice(last) });
  }
  return out.length ? out : [{ kind: "text", text }];
}

export function parseRichText(raw: string): RichTextBlock[] {
  const lines = (raw ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: RichTextBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (text) blocks.push({ kind: "paragraph", content: parseInline(text) });
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (HEADING.test(trimmed)) {
      flushParagraph();
      blocks.push({ kind: "heading", content: parseInline(trimmed.replace(HEADING, "")) });
      continue;
    }

    if (BULLET.test(trimmed)) {
      flushParagraph();
      const item = parseInline(trimmed.replace(BULLET, ""));
      const previous = blocks[blocks.length - 1];
      if (previous?.kind === "bullets") previous.items.push(item);
      else blocks.push({ kind: "bullets", items: [item] });
      continue;
    }

    if (NUMBER.test(trimmed)) {
      flushParagraph();
      const item = parseInline(trimmed.replace(NUMBER, ""));
      const previous = blocks[blocks.length - 1];
      if (previous?.kind === "numbers") previous.items.push(item);
      else blocks.push({ kind: "numbers", items: [item] });
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  return blocks;
}

export function richTextToPlain(raw: string): string {
  return parseRichText(raw)
    .map((block) => {
      if (block.kind === "bullets" || block.kind === "numbers") {
        return block.items.map((item) => item.map((part) => part.text).join("")).join(" ");
      }
      return block.content.map((part) => part.text).join("");
    })
    .join(" ")
    .trim();
}
