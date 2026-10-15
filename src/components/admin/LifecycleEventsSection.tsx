import { useState } from "react";
import { ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import { TIER_NAMES } from "@/lib/constants";
import { humanizeAction, prettyJson } from "@/lib/audit-detail";

export type LifecycleEventRow = {
  id: number;
  event: string;
  from_state: string | null;
  to_state: string | null;
  from_rank: number | null;
  to_rank: number | null;
  trigger: string;
  reason: string | null;
  snapshot: unknown;
  created_at: string;
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rankLabel(rank: number | null | undefined): string {
  if (rank == null) return "";
  return TIER_NAMES[rank] ?? `T${rank}`;
}

function transition(from: string, to: string): string {
  if (from && to && from !== to) return `${from} → ${to}`;
  return to || from || "";
}

export function LifecycleEventsSection({ rows }: { rows: LifecycleEventRow[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm uppercase tracking-wider text-foreground font-bold flex items-center gap-2 mb-3">
        <span className="text-purple">
          <GitBranch className="w-4 h-4" />
        </span>{" "}
        Lifecycle
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums normal-case tracking-normal">
          {rows.length}
        </span>
      </h3>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No lifecycle events for this user yet.
        </p>
      ) : (
        <ol className="space-y-1 max-h-72 overflow-y-auto">
          {rows.map((ev) => {
            const open = expandedId === ev.id;
            const statePart = transition(ev.from_state ?? "", ev.to_state ?? "");
            const rankPart = transition(
              rankLabel(ev.from_rank),
              rankLabel(ev.to_rank),
            );
            const summary = [statePart, rankPart, ev.reason]
              .filter(Boolean)
              .join(" · ");

            return (
              <li
                key={ev.id}
                className="rounded-lg border border-transparent hover:border-border/60"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : ev.id)}
                  className="w-full flex items-start gap-2 text-left px-1.5 py-1.5 rounded-lg"
                >
                  <span className="mt-0.5 text-muted-foreground flex-shrink-0">
                    {open ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-sm text-foreground">
                      {humanizeAction(ev.event)}
                      <span className="text-[11px] text-muted-foreground font-normal">
                        {" "}
                        · {humanizeAction(ev.trigger)}
                      </span>
                    </span>
                    {summary ? (
                      <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
                        {summary}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0 pt-0.5">
                    {fmtDateTime(ev.created_at)}
                  </span>
                </button>

                {open ? (
                  <div className="mx-1.5 mb-2 rounded-md border border-border bg-background/50 p-2.5 space-y-2">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span>
                        id <span className="tabular-nums text-foreground">{ev.id}</span>
                      </span>
                      {statePart ? (
                        <span>
                          state <span className="text-foreground">{statePart}</span>
                        </span>
                      ) : null}
                      {rankPart ? (
                        <span>
                          rank <span className="text-foreground">{rankPart}</span>
                        </span>
                      ) : null}
                      {ev.reason ? (
                        <span>
                          reason <span className="text-foreground">{ev.reason}</span>
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                        Snapshot
                      </div>
                      <pre className="text-[11px] leading-relaxed overflow-x-auto max-h-48 p-2 rounded bg-muted/40 text-foreground whitespace-pre-wrap break-all">
                        {prettyJson(ev.snapshot)}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
