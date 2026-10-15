"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Copy, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { TIER_NAMES } from "@/lib/constants";
import {
  fetchSupportKnowledgeBase,
  type SupportKnowledgeBase,
} from "@/services/support";

/**
 * Admin "Support knowledge base" page.
 *
 * Read-only mirror of the single ground-truth document the AI support agent
 * answers from (backend PLATFORM_KNOWLEDGE_BASE). It lives only in code and has
 * no editor on purpose - an old DB editor was removed because a published copy
 * silently outranked later code edits. This page therefore only DISPLAYS the
 * live document; changing it means editing the constant and deploying.
 *
 * The document arrives already filled at the strictest default member floor, so
 * there are no {{PLACEHOLDER}} tokens to read around. At answer time the rank and
 * feature-gate sections are re-scoped to each member's country floor.
 */

// ---------------------------------------------------------------------------
// Minimal, dependency-free Markdown rendering.
//
// The KB is authored Markdown (headings, bullets, **bold**, `code`). We render a
// safe conservative subset with React elements only - never dangerouslySetInnerHTML
// - so there is no XSS surface and no new dependency. Anything we don't recognise
// falls through as plain text, and the "Raw" toggle always shows the exact source.
// ---------------------------------------------------------------------------

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "code"; text: string }
  | { kind: "p"; text: string };

function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let i = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: "p", text: para.join(" ") });
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Fenced code block.
    if (/^```/.test(line)) {
      flushPara();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: "code", text: buf.join("\n") });
      continue;
    }

    if (line.trim() === "") {
      flushPara();
      i++;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      const level = heading[1].length;
      blocks.push({ kind: level === 1 ? "h1" : level === 2 ? "h2" : "h3", text: heading[2] });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length) {
        const m = /^[-*]\s+(.*)$/.exec(lines[i].trimEnd());
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length) {
        const m = /^\d+\.\s+(.*)$/.exec(lines[i].trimEnd());
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flushPara();
  return blocks;
}

/** Render inline **bold** and `code` spans; everything else is plain text. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b${k}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          key={`${keyPrefix}-c${k}`}
          className="rounded bg-surface-soft px-1 py-0.5 font-mono text-[0.85em] text-purple"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
    k++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function MarkdownDoc({ md }: { md: string }) {
  const blocks = useMemo(() => parseBlocks(md), [md]);
  return (
    <div className="max-w-3xl text-[13.5px] leading-relaxed text-secondary-foreground">
      {blocks.map((b, idx) => {
        const key = `blk-${idx}`;
        switch (b.kind) {
          case "h1":
            return (
              <h2 key={key} className="mt-8 mb-3 font-display text-xl font-bold text-foreground first:mt-0">
                {renderInline(b.text, key)}
              </h2>
            );
          case "h2":
            return (
              <h3 key={key} className="mt-6 mb-2 font-display text-base font-bold text-foreground">
                {renderInline(b.text, key)}
              </h3>
            );
          case "h3":
            return (
              <h4 key={key} className="mt-4 mb-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {renderInline(b.text, key)}
              </h4>
            );
          case "ul":
            return (
              <ul key={key} className="my-2 list-disc space-y-1 pl-5">
                {b.items.map((it, j) => (
                  <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="my-2 list-decimal space-y-1 pl-5">
                {b.items.map((it, j) => (
                  <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
          case "code":
            return (
              <pre
                key={key}
                className="my-3 overflow-x-auto rounded-md border border-border bg-surface-soft p-3 font-mono text-xs text-foreground"
              >
                {b.text}
              </pre>
            );
          default:
            return (
              <p key={key} className="my-2.5">
                {renderInline(b.text, key)}
              </p>
            );
        }
      })}
    </div>
  );
}

export default function AdminKnowledgeBasePage() {
  const [data, setData] = useState<SupportKnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSupportKnowledgeBase()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load the knowledge base.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const copyDoc = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.document);
      setCopied(true);
      toast.success("Knowledge base copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy - your browser blocked clipboard access");
    }
  };

  if (loading) return <PageSkeleton />;

  if (error || !data) {
    return (
      <div className="max-w-3xl">
        <h1 className="font-display text-2xl font-bold">Support knowledge base</h1>
        <div className="mt-6 flex items-start gap-2 rounded-md border border-red/30 bg-red-dim/40 p-4 text-sm text-red">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error ?? "The knowledge base could not be loaded."}</span>
        </div>
      </div>
    );
  }

  const floorName = TIER_NAMES[data.defaultFloorTier] ?? `tier ${data.defaultFloorTier}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <BookOpen className="h-6 w-6 text-purple" />
            Support knowledge base
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The single ground-truth document {data.agentName} (the AI support agent) answers members
            from. This is a read-only mirror of what ships in code - there is no editor by design.
          </p>
        </div>
        <button
          type="button"
          onClick={copyDoc}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-surface-soft"
        >
          {copied ? <Check className="h-4 w-4 text-green" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy document"}
        </button>
      </div>

      {/* Meta row */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        {data.placeholdersIntact ? (
          <span className="inline-flex items-center gap-1 rounded border border-green/30 bg-green-dim px-2 py-1 font-semibold text-green">
            <ShieldCheck className="h-3.5 w-3.5" />
            Document integrity OK
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded border border-red/30 bg-red-dim px-2 py-1 font-semibold text-red">
            <AlertTriangle className="h-3.5 w-3.5" />
            {data.missingPlaceholders.length} placeholder(s) missing
          </span>
        )}
        <span className="rounded border border-border bg-surface-soft px-2 py-1 text-muted-foreground">
          {data.lineCount.toLocaleString()} lines · {data.characterCount.toLocaleString()} chars
        </span>
        <div className="ml-auto inline-flex overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => setRaw(false)}
            className={
              "px-3 py-1.5 text-xs font-semibold transition-colors " +
              (!raw ? "bg-purple-dim text-foreground" : "bg-surface text-muted-foreground hover:bg-surface-soft")
            }
          >
            Reading view
          </button>
          <button
            type="button"
            onClick={() => setRaw(true)}
            className={
              "border-l border-border px-3 py-1.5 text-xs font-semibold transition-colors " +
              (raw ? "bg-purple-dim text-foreground" : "bg-surface text-muted-foreground hover:bg-surface-soft")
            }
          >
            Raw markdown
          </button>
        </div>
      </div>

      {/* Scope note */}
      <div className="mb-4 flex gap-2 rounded-md border border-amber/30 bg-amber-dim/40 p-3 text-xs leading-relaxed text-secondary-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber" />
        <span>
          Rank ladder and feature-gate sections below are shown at the strictest default floor
          (<strong>{floorName}</strong>). At answer time {data.agentName} re-scopes them to each
          member's country floor and the live feature gates - so a member may see a different unlock
          rank than the one printed here.
        </span>
      </div>

      {/* Document */}
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 md:p-8">
        {raw ? (
          <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-secondary-foreground">
            {data.document}
          </pre>
        ) : (
          <MarkdownDoc md={data.document} />
        )}
      </div>
    </div>
  );
}
