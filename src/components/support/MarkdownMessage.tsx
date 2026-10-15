import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Tiny, safe markdown renderer for support-chat message bodies.
 *
 * Supports the subset the AI and staff actually use: **bold**, *italic*,
 * `inline code`, [links](url), bullet lists, numbered lists, short headings,
 * and paragraphs with soft line breaks. It builds React elements (never
 * dangerouslySetInnerHTML), so every piece of text is escaped and XSS-safe, and
 * link hrefs are sanitized to http(s)/mailto/relative only.
 *
 * Deliberately does NOT treat underscores as emphasis: this app is full of
 * snake_case identifiers (read_only, tv_granted_username) that must render as-is.
 *
 * Kept in sync with the member app's copy of this component.
 */

type Props = { text: string; className?: string };

/** Allow only safe URL schemes; block javascript:, data:, etc. */
function safeHref(url: string): string | null {
  const u = url.trim();
  if (/^(https?:\/\/|mailto:)/i.test(u)) return u;
  if (u.startsWith("/")) return u; // in-app relative link
  return null;
}

/** Render inline markup (bold, italic, code, links) inside a line of text. */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let n = 0;

  while (rest.length > 0) {
    const candidates: Array<{ index: number; length: number; node: ReactNode }> = [];

    const code = /`([^`]+)`/.exec(rest);
    if (code) {
      candidates.push({
        index: code.index,
        length: code[0].length,
        node: (
          <code
            key={`${keyBase}-c${n++}`}
            className="rounded bg-black/10 px-1 py-0.5 text-[0.85em] font-mono"
          >
            {code[1]}
          </code>
        ),
      });
    }

    const link = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
    if (link) {
      const href = safeHref(link[2]);
      candidates.push({
        index: link.index,
        length: link[0].length,
        node: href ? (
          <a
            key={`${keyBase}-l${n++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {renderInline(link[1], `${keyBase}-lt${n}`)}
          </a>
        ) : (
          link[0]
        ),
      });
    }

    // Bold is checked before italic; since both start with `*`, the bold match
    // begins one char earlier on `**...**`, so the earliest-index pick wins.
    const bold = /\*\*([^*]+)\*\*/.exec(rest);
    if (bold) {
      candidates.push({
        index: bold.index,
        length: bold[0].length,
        node: (
          <strong key={`${keyBase}-b${n++}`} className="font-semibold">
            {renderInline(bold[1], `${keyBase}-bt${n}`)}
          </strong>
        ),
      });
    }

    const italic = /\*([^*]+)\*/.exec(rest);
    if (italic) {
      candidates.push({
        index: italic.index,
        length: italic[0].length,
        node: (
          <em key={`${keyBase}-i${n++}`} className="italic">
            {renderInline(italic[1], `${keyBase}-it${n}`)}
          </em>
        ),
      });
    }

    if (candidates.length === 0) {
      nodes.push(rest);
      break;
    }

    // Earliest match wins; on a tie the first pushed wins (code, link, bold).
    candidates.sort((a, b) => a.index - b.index);
    const best = candidates[0];
    if (best.index > 0) nodes.push(rest.slice(0, best.index));
    nodes.push(best.node);
    rest = rest.slice(best.index + best.length);
  }

  return nodes;
}

const UL_RE = /^\s*[-*•]\s+(.+)$/;
const OL_RE = /^\s*(\d+)[.)]\s+(.+)$/;
const H_RE = /^(#{1,6})\s+(.+)$/;
// Blockquote. The support AI uses "> " to lay out email templates it asks
// members to send; without this the marker rendered literally as ">".
const BQ_RE = /^\s*>\s?(.*)$/;

/** Parse the body into block-level elements (paragraphs, lists, headings, quotes). */
function parseBlocks(src: string): ReactNode[] {
  const lines = (src ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (BQ_RE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && BQ_RE.test(lines[i])) {
        inner.push(BQ_RE.exec(lines[i])![1]);
        i++;
      }
      out.push(
        <blockquote
          key={key++}
          className="border-s-2 border-purple/40 bg-purple-dim/30 ps-3 pe-2 py-1.5 rounded-e space-y-2"
        >
          {parseBlocks(inner.join("\n"))}
        </blockquote>,
      );
      continue;
    }

    const h = H_RE.exec(line);
    if (h) {
      const level = h[1].length;
      out.push(
        <p key={key++} className={cn("font-semibold", level <= 2 ? "text-[1.05em]" : "")}>
          {renderInline(h[2], `h${key}`)}
        </p>,
      );
      i++;
      continue;
    }

    if (UL_RE.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && UL_RE.test(lines[i])) {
        const m = UL_RE.exec(lines[i])!;
        items.push(<li key={items.length}>{renderInline(m[1], `ul${key}-${items.length}`)}</li>);
        i++;
      }
      out.push(
        <ul key={key++} className="list-disc ps-5 space-y-0.5">
          {items}
        </ul>,
      );
      continue;
    }

    if (OL_RE.test(line)) {
      const start = Number(OL_RE.exec(line)![1]) || 1;
      const items: ReactNode[] = [];
      while (i < lines.length && OL_RE.test(lines[i])) {
        const m = OL_RE.exec(lines[i])!;
        items.push(<li key={items.length}>{renderInline(m[2], `ol${key}-${items.length}`)}</li>);
        i++;
      }
      out.push(
        <ol key={key++} start={start} className="list-decimal ps-5 space-y-0.5">
          {items}
        </ol>,
      );
      continue;
    }

    // Plain paragraph: gather consecutive lines, keeping soft line breaks.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !UL_RE.test(lines[i]) &&
      !OL_RE.test(lines[i]) &&
      !BQ_RE.test(lines[i]) &&
      !H_RE.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(
      <p key={key++}>
        {para.map((ln, idx) => (
          <span key={idx}>
            {idx > 0 && <br />}
            {renderInline(ln, `p${key}-${idx}`)}
          </span>
        ))}
      </p>,
    );
  }

  return out;
}

export function MarkdownMessage({ text, className }: Props) {
  return <div className={cn("space-y-2 break-words", className)}>{parseBlocks(text)}</div>;
}
