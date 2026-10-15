import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import {
  auditHumanSummary,
  humanizeAction,
  prettyJson,
} from "@/lib/audit-detail";

export type AuditActor = { name: string; email: string | null };

export type ActivityAuditRow = {
  id: number;
  action: string;
  created_at: string;
  target_table: string | null;
  before: unknown;
  after: unknown;
  actor_id: string | null;
};

type ActorFilter = "all" | "member" | "admin" | "system";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actorKind(
  actorId: string | null,
  userId: string,
): Exclude<ActorFilter, "all"> {
  if (!actorId) return "system";
  if (actorId === userId) return "member";
  return "admin";
}

const ACTOR_CHIP: Record<Exclude<ActorFilter, "all">, string> = {
  member: "bg-purple-500/10 text-purple-400",
  admin: "bg-amber-500/10 text-amber-400",
  system: "bg-muted text-muted-foreground",
};

export function ActivityLogSection({
  userId,
  rows,
  actors,
}: {
  userId: string;
  rows: ActivityAuditRow[];
  actors: Record<string, AuditActor>;
}) {
  const [actorFilter, setActorFilter] = useState<ActorFilter>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const distinctActions = useMemo(() => {
    const set = new Set(rows.map((r) => r.action).filter(Boolean));
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const kind = actorKind(r.actor_id, userId);
      if (actorFilter !== "all" && kind !== actorFilter) return false;
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (!q) return true;
      const actor = r.actor_id ? actors[r.actor_id] : null;
      const hay = [
        r.action,
        humanizeAction(r.action),
        r.target_table ?? "",
        actor?.name ?? "",
        actor?.email ?? "",
        auditHumanSummary(r.action, r.before, r.after),
        JSON.stringify(r.before ?? {}),
        JSON.stringify(r.after ?? {}),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, userId, actorFilter, actionFilter, search, actors]);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm uppercase tracking-wider text-foreground font-bold flex items-center gap-2 mb-3">
        <span className="text-purple">
          <ScrollText className="w-4 h-4" />
        </span>{" "}
        Activity log
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums normal-case tracking-normal">
          {filtered.length}
          {filtered.length !== rows.length ? ` / ${rows.length}` : ""}
        </span>
      </h3>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No logged actions for this user.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value as ActorFilter)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              aria-label="Filter by actor"
            >
              <option value="all">All actors</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="system">System</option>
            </select>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground max-w-[11rem]"
              aria-label="Filter by action"
            >
              <option value="all">All actions</option>
              {distinctActions.map((a) => (
                <option key={a} value={a}>
                  {humanizeAction(a)}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-8 flex-1 min-w-[8rem] rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground"
              aria-label="Search activity log"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground">No rows match these filters.</p>
          ) : (
            <ol className="space-y-1 max-h-96 overflow-y-auto">
              {filtered.map((a) => {
                const kind = actorKind(a.actor_id, userId);
                const actor = a.actor_id ? actors[a.actor_id] : null;
                const summary = auditHumanSummary(a.action, a.before, a.after);
                const open = expandedId === a.id;
                return (
                  <li key={a.id} className="rounded-lg border border-transparent hover:border-border/60">
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : a.id)}
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
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={
                              "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase " +
                              ACTOR_CHIP[kind]
                            }
                          >
                            {kind}
                          </span>
                          {actor ? (
                            <span
                              className="text-[11px] text-muted-foreground truncate max-w-[10rem]"
                              title={actor.email ?? undefined}
                            >
                              {actor.name}
                              {actor.email && actor.name !== actor.email
                                ? ` · ${actor.email}`
                                : ""}
                            </span>
                          ) : null}
                          <span className="font-medium text-sm text-foreground">
                            {humanizeAction(a.action)}
                          </span>
                        </span>
                        {summary ? (
                          <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
                            {summary}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0 pt-0.5">
                        {fmtDateTime(a.created_at)}
                      </span>
                    </button>

                    {open ? (
                      <div className="mx-1.5 mb-2 rounded-md border border-border bg-background/50 p-2.5 space-y-2">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          <span>
                            id <span className="tabular-nums text-foreground">{a.id}</span>
                          </span>
                          {a.target_table ? (
                            <span>
                              table{" "}
                              <span className="text-foreground">{a.target_table}</span>
                            </span>
                          ) : null}
                          {a.actor_id ? (
                            <span className="font-mono truncate max-w-full">
                              actor {a.actor_id}
                            </span>
                          ) : (
                            <span>actor system</span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                              Before
                            </div>
                            <pre className="text-[11px] leading-relaxed overflow-x-auto max-h-48 p-2 rounded bg-muted/40 text-foreground whitespace-pre-wrap break-all">
                              {prettyJson(a.before)}
                            </pre>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                              After
                            </div>
                            <pre className="text-[11px] leading-relaxed overflow-x-auto max-h-48 p-2 rounded bg-muted/40 text-foreground whitespace-pre-wrap break-all">
                              {prettyJson(a.after)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
