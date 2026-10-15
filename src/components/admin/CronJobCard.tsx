import { Clock, Loader2, Play, X } from "lucide-react";
import type { AdminCronJob } from "@/lib/admin-crons";

export type CronJobLastRun = {
  status: string;
  started_at: string;
  duration_ms: number | null;
  summary: unknown;
};

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  const rel =
    mins < 1
      ? "just now"
      : mins < 60
        ? `${mins}m ago`
        : mins < 1440
          ? `${Math.round(mins / 60)}h ago`
          : `${Math.round(mins / 1440)}d ago`;
  return `${d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${rel}`;
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function summaryChips(summary: unknown): Array<[string, string | number]> {
  if (!summary || typeof summary !== "object") return [];
  const root = summary as Record<string, unknown>;
  const inner =
    root.summary && typeof root.summary === "object"
      ? (root.summary as Record<string, unknown>)
      : root;
  const chips: Array<[string, string | number]> = [];
  for (const [k, v] of Object.entries(inner)) {
    if (k === "ok" || k === "statusCode" || k === "details") continue;
    if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
      chips.push([k.replace(/_/g, " "), v as string | number]);
    } else if (Array.isArray(v)) {
      chips.push([k.replace(/_/g, " "), v.length]);
    }
  }
  return chips;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "ok"
      ? "bg-green-500/15 text-green-700 dark:text-green-400"
      : status === "error"
        ? "bg-red-500/15 text-red-700 dark:text-red-400"
        : "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return (
    <span className={`shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 uppercase ${cls}`}>
      {status}
    </span>
  );
}

function NoRunsBadge() {
  return (
    <span className="shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 uppercase bg-surface-soft text-muted-foreground border border-border">
      No runs yet
    </span>
  );
}

type CronJobCardProps = {
  job: AdminCronJob;
  last?: CronJobLastRun | null;
  inProgress: boolean;
  onRun: () => void;
  onCancel?: () => void;
  cancelling?: boolean;
};

export function CronJobCard({ job, last, inProgress, onRun, onCancel, cancelling }: CronJobCardProps) {
  const chips = last ? summaryChips(last.summary).slice(0, 4) : [];
  const isRunning = inProgress || last?.status === "running";

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="font-display font-bold text-sm leading-snug">{job.label}</span>
        {last ? <StatusBadge status={last.status} /> : <NoRunsBadge />}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-purple">
        <Clock className="h-3 w-3 shrink-0" /> Runs {job.schedule.toLowerCase()}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{job.desc}</p>

      <div className="mt-2 min-h-[3.25rem] flex-1 text-[11px] text-muted-foreground">
        {last ? (
          <>
            <div>
              {fmtWhen(last.started_at)} · {fmtDuration(last.duration_ms)}
            </div>
            {isRunning ? (
              <div className="mt-1 text-amber-700 dark:text-amber-300">
                In progress - may take a few minutes for large member lists.
              </div>
            ) : chips.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {chips.map(([k, v]) => (
                  <span key={k} className="rounded bg-surface-soft px-1.5 py-0.5 tabular-nums">
                    {k}: <span className="font-semibold text-foreground">{String(v)}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-1 text-muted-foreground/70">No summary stats</div>
            )}
          </>
        ) : (
          <div className="text-muted-foreground/70">Run manually or wait for the next schedule.</div>
        )}
      </div>

      <button
        type="button"
        onClick={onRun}
        disabled={isRunning}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-purple px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple/90 disabled:opacity-60"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" /> Run now
          </>
        )}
      </button>

      {isRunning && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelling}
          className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-500/10 disabled:opacity-60 dark:text-red-400"
        >
          {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          {cancelling ? "Cancelling…" : "Cancel stuck run"}
        </button>
      )}
    </div>
  );
}
