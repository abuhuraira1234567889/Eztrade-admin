"use client";

import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_CRON_JOBS,
  ADMIN_CRON_JOB_LABEL,
  BACKFILL_CRON_JOBS,
  cancelAdminCron,
  fetchApiHealth,
  isCronJobInProgress,
  RANK_THRESHOLD_CRON_JOBS,
  runAdminCron,
  waitForCronRunSettled,
} from "@/lib/admin-crons";
import { CronJobCard, type CronJobLastRun } from "@/components/admin/CronJobCard";
import { SingleMemberReeval } from "@/components/admin/SingleMemberReeval";
import { MemberLiveBalance } from "@/components/admin/MemberLiveBalance";
import { MembersByCountry } from "@/components/admin/MembersByCountry";
import { MemberIbCheck } from "@/components/admin/MemberIbCheck";
import { IbPartnerLookup } from "@/components/admin/IbPartnerLookup";
import { FreeAccessManager } from "@/components/admin/FreeAccessManager";
import { IbBypassManager } from "@/components/admin/IbBypassManager";
import { IbVerificationHistory } from "@/components/admin/IbVerificationHistory";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { toast } from "sonner";
import { RotateCw } from "lucide-react";
import { TIER_NAMES } from "@/lib/constants";

const OTHER_CRON_JOBS = ADMIN_CRON_JOBS.filter((j) => !j.rankThresholds && !j.backfill);
const JOB_LABEL = ADMIN_CRON_JOB_LABEL;

type CronRun = {
  id: number;
  job: string;
  trigger: string;
  status: "running" | "ok" | "error";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  summary: any;
  error: string | null;
};

type AuditRow = {
  id: number;
  action: string;
  target_table: string | null;
  target_id: string | null;
  before: any;
  after: any;
  created_at: string;
};

function fmtWhen(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  const rel =
    mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.round(mins / 60)}h ago` : `${Math.round(mins / 1440)}d ago`;
  return `${d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${rel}`;
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

/** Pull the meaningful counts out of a run summary (handles the {ok, summary} wrapper). */
function summaryChips(summary: any): Array<[string, string | number]> {
  if (!summary || typeof summary !== "object") return [];
  const inner = summary.summary && typeof summary.summary === "object" ? summary.summary : summary;
  const chips: Array<[string, string | number]> = [];
  for (const [k, v] of Object.entries(inner)) {
    if (k === "ok" || k === "statusCode") continue;
    if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
      chips.push([k.replace(/_/g, " "), v as string | number]);
    } else if (Array.isArray(v)) {
      chips.push([`${k.replace(/_/g, " ")}`, v.length]);
    }
  }
  return chips;
}

/** Unwrap the {ok, summary} envelope to the inner job summary. */
function innerSummary(summary: any): any {
  return summary?.summary && typeof summary.summary === "object" ? summary.summary : summary;
}

const OUTCOME_ORDER = [
  "would_promote",
  "promoted",
  "demoted",
  "errored",
  // Daily IB verification (ib-daily-verification)
  "grace_expired",
  "restricted",
  "still_failing",
  "restored",
  "error",
  "skipped",
  "skipped_no_row",
  "skipped_stale",
  "skipped_unverified",
  "unchanged",
] as const;
const OUTCOME_LABEL: Record<string, string> = {
  would_promote: "Would promote",
  promoted: "Promoted",
  demoted: "Demoted",
  errored: "Errored",
  skipped_no_row: "Skipped · never evaluated (no lifecycle row)",
  skipped_stale: "Skipped · stale balance",
  skipped_unverified: "Skipped · not verified (preview)",
  unchanged: "Unchanged",
  // Daily IB verification
  restricted: "IB lost · access restricted (grace started)",
  still_failing: "IB still failing (inside grace)",
  restored: "IB restored · access back",
  grace_expired: "Grace expired · verification removed",
  skipped: "Skipped",
  error: "Errored",
};
const OUTCOME_COLOR: Record<string, string> = {
  would_promote: "text-green-600",
  promoted: "text-green-600",
  demoted: "text-amber-600",
  errored: "text-red-600",
  skipped_no_row: "text-muted-foreground",
  skipped_stale: "text-amber-600",
  skipped_unverified: "text-muted-foreground",
  unchanged: "text-muted-foreground",
  restricted: "text-amber-600",
  still_failing: "text-amber-600",
  restored: "text-green-600",
  grace_expired: "text-red-600",
  skipped: "text-muted-foreground",
  error: "text-red-600",
};

function tierName(t: number | null | undefined): string {
  if (t == null) return "-";
  // Tier 0 is "Unverified" in TIER_NAMES, but that's a rank name that reads
  // wrong for a broker-verified member sitting at tier 0 - show "Unranked".
  if (t === 0) return "Unranked";
  return TIER_NAMES[t] ?? `T${t}`;
}

/** profiles.status → readable label (what the member actually IS, vs a tier name). */
const STATUS_LABEL: Record<string, string> = {
  preview: "Preview (no broker)",
  pending: "Pending",
  inactive: "Inactive",
  active: "Active",
  grace: "Grace",
  suspended: "Suspended",
};

/** The "from" side of a change - prefer the member's real status over tier 0. */
function fromLabel(d: any): string {
  if (d.status) return STATUS_LABEL[d.status] ?? d.status;
  return tierName(d.from_tier);
}

/** Compact age like "2m" / "3h" / "5d" for a snapshot/synced timestamp. */
function relAge(iso: string | null | undefined): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

function money(v: unknown): string | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** All user ids referenced in a run's `details` array (for email resolution). */
function detailUserIds(summary: any): string[] {
  const details = innerSummary(summary)?.details;
  if (!Array.isArray(details)) return [];
  return details
    .map((d: any) => d?.user_id)
    .filter((x: unknown): x is string => typeof x === "string" && x.length > 0);
}

/**
 * Per-member breakdown for runs that carry a `details` array (all rank/access
 * jobs): groups members by outcome and shows their EMAIL (resolved from the id
 * when the job didn't embed it) + from→to tier (or the error).
 */
function RunDetails({ summary, emailById }: { summary: any; emailById: Map<string, string> }) {
  const details = innerSummary(summary)?.details;
  if (!Array.isArray(details) || details.length === 0) return null;
  // This view groups by member outcome, so it only understands per-member rows.
  // Jobs with a different details shape (score-competitions returns one row per
  // COMPETITION) render nothing here and must keep their details in the JSON.
  if (!isMemberDetails(details)) return null;

  const groups = new Map<string, any[]>();
  for (const d of details) {
    const o = (d?.outcome as string) ?? "unchanged";
    if (!groups.has(o)) groups.set(o, []);
    groups.get(o)!.push(d);
  }

  return (
    <div className="space-y-3 mb-2">
      {OUTCOME_ORDER.filter((o) => groups.get(o)?.length).map((o) => (
        <div key={o}>
          <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${OUTCOME_COLOR[o] ?? ""}`}>
            {OUTCOME_LABEL[o] ?? o} ({groups.get(o)!.length})
          </div>
          <ul className="rounded-md border border-border bg-surface divide-y divide-border">
            {groups.get(o)!.map((d: any, i: number) => (
              <li key={i} className="px-3 py-1.5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground break-all">
                    {d.email ?? (d.user_id ? emailById.get(d.user_id) : null) ?? d.user_id}
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0 text-right">
                    {o === "errored" || o === "error"
                      ? d.error ?? d.reason ?? "error"
                      : // IB-verification rows carry ib_status transitions, not tiers.
                        d.status_before !== undefined
                        ? d.status_before === d.status_after
                          ? (d.reason ?? d.status_after ?? "")
                          : `${d.status_before} → ${d.status_after}`
                        : o === "unchanged"
                          ? fromLabel(d)
                          : `${fromLabel(d)} → ${tierName(d.to_tier)}`}
                  </span>
                </div>
                {/* IB-verification diagnostic line: what was checked and when
                    the member's grace window closes. */}
                {(d.uid || d.grace_expires_at || d.check_result) && (
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] tabular-nums text-muted-foreground/70">
                    {d.broker && d.uid && (
                      <span>
                        {d.broker} <span className="text-muted-foreground">UID {d.uid}</span>
                      </span>
                    )}
                    {d.check_result && (
                      <span>provider <span className="text-muted-foreground">{d.check_result}</span></span>
                    )}
                    {d.grace_expires_at && (
                      <span>
                        grace ends <span className="text-muted-foreground">{fmtWhen(d.grace_expires_at)}</span>
                      </span>
                    )}
                    {d.reason && d.status_before !== d.status_after && (
                      <span>reason <span className="text-muted-foreground">{d.reason}</span></span>
                    )}
                  </div>
                )}
                {/* Diagnostic line (present on rank-backfill details) - the data
                    needed to judge WHY a member is a candidate. */}
                {o !== "errored" &&
                  (d.status || d.balance != null || d.stored_state || d.last_synced || d.cycle_started_at) && (
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] tabular-nums text-muted-foreground/70">
                      {money(d.balance) && (
                        <span>bal <span className="text-muted-foreground">{money(d.balance)}</span></span>
                      )}
                      {d.stored_state && (
                        <span>lifecycle <span className="text-muted-foreground">{d.stored_state}</span></span>
                      )}
                      {d.last_synced !== undefined && (
                        <span>synced <span className="text-muted-foreground">{relAge(d.last_synced)}</span></span>
                      )}
                      {d.cycle_started_at && (
                        <span>cycle from <span className="text-muted-foreground">{fmtWhen(d.cycle_started_at)}</span></span>
                      )}
                    </div>
                  )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Does this details array carry the per-member shape RunDetails can render? */
function isMemberDetails(details: any[]): boolean {
  return details.some((d) => d && typeof d === "object" && "user_id" in d);
}

/**
 * The raw JSON, with the `details` array collapsed ONLY when RunDetails has
 * actually rendered it above. Collapsing unconditionally told the reader to
 * look for rows that were never drawn - score-competitions returns one row per
 * competition, which RunDetails skips, so its details vanished entirely.
 */
function summaryForJson(summary: any): any {
  const inner = innerSummary(summary);
  if (!inner || !Array.isArray(inner.details)) return summary ?? {};
  if (!isMemberDetails(inner.details)) return summary ?? {};
  const clone = JSON.parse(JSON.stringify(summary));
  const target = clone.summary && typeof clone.summary === "object" ? clone.summary : clone;
  target.details = `[${inner.details.length} rows - shown above]`;
  return clone;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "ok"
      ? "bg-green-500/15 text-green-700 dark:text-green-400"
      : status === "error"
        ? "bg-red-500/15 text-red-700 dark:text-red-400"
        : "bg-amber-500/15 text-amber-700 dark:text-amber-400 animate-pulse";
  return (
    <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 uppercase ${cls}`}>
      {status}
    </span>
  );
}

function compactJson(v: any): string {
  if (v == null) return "-";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function AdminCronsPage() {
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [cancelling, setCancelling] = useState<Set<string>>(new Set());
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  // Collapsed by default - and the history component isn't mounted until opened,
  // so its two heavy admin queries (log + restricted list) don't run on load.
  const [ibOpen, setIbOpen] = useState(false);
  // Resolves the user ids in a run's per-member details to emails so the
  // breakdown reads as emails for EVERY job (some embed the email, some don't).
  const [emailById, setEmailById] = useState<Map<string, string>>(new Map());

  async function refreshApiHealth() {
    setApiUp(await fetchApiHealth());
  }

  /** Fetch emails for any user ids we haven't resolved yet. */
  async function resolveEmailsForIds(rawIds: (string | null | undefined)[]) {
    const ids = [...new Set(rawIds)].filter(
      (id): id is string => typeof id === "string" && id.length > 0 && !emailById.has(id),
    );
    if (ids.length === 0) return;
    const supabase = createClient();
    const found = new Map<string, string>();
    // Small chunks: a big `.in()` list of UUIDs overflows the URL and the
    // request silently fails (no rows) - keep each batch well under the limit.
    for (let i = 0; i < ids.length; i += 150) {
      const chunk = ids.slice(i, i + 150);
      const { data } = await supabase.from("profiles").select("id, email").in("id", chunk);
      for (const p of (data ?? []) as { id: string; email: string | null }[]) {
        if (p.email) found.set(p.id, p.email);
      }
    }
    if (found.size) setEmailById((prev) => new Map([...prev, ...found]));
  }
  const resolveEmails = (summary: any) => resolveEmailsForIds(detailUserIds(summary));

  async function loadData() {
    const supabase = createClient();
    const [{ data: runRows }, { data: auditRows }] = await Promise.all([
      supabase
        .from("cron_runs" as never)
        .select("id, job, trigger, status, started_at, finished_at, duration_ms, summary, error")
        .order("started_at", { ascending: false })
        .limit(200),
      supabase
        .from("audit_log")
        .select("id, action, target_table, target_id, before, after, created_at")
        // Only automated (cron) changes - human/admin actions carry an actor_id.
        .is("actor_id", null)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);
    setRuns((runRows ?? []) as unknown as CronRun[]);
    setAudit((auditRows ?? []) as unknown as AuditRow[]);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Promise.all([loadData(), refreshApiHealth()]);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve the "Data changed by crons" rows that point at a profile to emails.
  useEffect(() => {
    const ids = audit
      .filter((a) => a.target_table === "profiles" && a.target_id)
      .map((a) => a.target_id as string);
    if (ids.length) void resolveEmailsForIds(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audit]);

  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([loadData(), refreshApiHealth()]);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }

  const lastByJob = useMemo(() => {
    const m = new Map<string, CronJobLastRun>();
    for (const r of runs) {
      if (!m.has(r.job)) {
        m.set(r.job, {
          status: r.status,
          started_at: r.started_at,
          duration_ms: r.duration_ms,
          summary: r.summary,
        });
      }
    }
    return m;
  }, [runs]);

  async function onRun(job: string) {
    if (isCronJobInProgress(lastByJob.get(job), running.has(job))) {
      toast.error(`${JOB_LABEL[job] ?? job} is already running.`);
      return;
    }
    setRunning((s) => new Set(s).add(job));
    try {
      const res = await runAdminCron(job);
      if (res?.ok === false) {
        toast.error(res.error ?? "Couldn't start job.");
        return;
      }
      toast.success(`${JOB_LABEL[job] ?? job} started - may take a few minutes.`);
      await loadData();
      const settled = await waitForCronRunSettled(job, () => {
        void loadData();
      });
      await loadData();
      if (settled?.status === "ok") {
        toast.success(`${JOB_LABEL[job] ?? job} finished.`);
      } else if (settled?.status === "error") {
        toast.error(`${JOB_LABEL[job] ?? job} failed - see Recent runs for details.`);
      } else if (settled?.status === "running") {
        toast.message(`${JOB_LABEL[job] ?? job} is still running in the background.`);
      }
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't start job.");
    } finally {
      setRunning((s) => {
        const n = new Set(s);
        n.delete(job);
        return n;
      });
    }
  }

  async function onCancel(job: string) {
    setCancelling((s) => new Set(s).add(job));
    try {
      const res = await cancelAdminCron(job);
      if (res?.ok === false) {
        toast.error(res.error ?? "Couldn't cancel job.");
        return;
      }
      // Drop the local "running" flag so the Run button re-enables immediately.
      setRunning((s) => {
        const n = new Set(s);
        n.delete(job);
        return n;
      });
      toast.success(`${JOB_LABEL[job] ?? job} cancelled - you can run it again.`);
      await loadData();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't cancel job.");
    } finally {
      setCancelling((s) => {
        const n = new Set(s);
        n.delete(job);
        return n;
      });
    }
  }

  function renderJobGrid(jobs: typeof ADMIN_CRON_JOBS, layout: "pair" | "triple" = "pair") {
    const gridCls =
      layout === "triple"
        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-stretch"
        : "grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch";
    return (
      <div className={gridCls}>
        {jobs.map((job) => (
          <CronJobCard
            key={job.id}
            job={job}
            last={lastByJob.get(job.id)}
            inProgress={isCronJobInProgress(lastByJob.get(job.id), running.has(job.id))}
            onRun={() => onRun(job.id)}
            onCancel={() => onCancel(job.id)}
            cancelling={cancelling.has(job.id)}
          />
        ))}
      </div>
    );
  }

  const filtered = useMemo(
    () => (jobFilter === "all" ? runs : runs.filter((r) => r.job === jobFilter)),
    [runs, jobFilter],
  );

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold">Cron jobs</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            History of scheduled jobs - what ran, when, how long it took, and what changed.
            Use <span className="font-semibold text-foreground">Run now</span> to trigger one
            manually. Schedules are configured on the host; this shows recorded executions.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-purple/50 transition disabled:opacity-60"
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {apiUp === false && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-100">
          Backend API is offline. Cron jobs cannot run until you start the API server on port 3001:{" "}
          <code className="text-xs">cd eztrade-platform/backend && npm run dev</code>
        </div>
      )}

      {/* Rank thresholds jobs */}
      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase text-muted-foreground">Rank thresholds</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Run after saving changes on{" "}
              <Link to="/admin/tiers" className="font-medium text-purple hover:underline">
                Rank thresholds
              </Link>
              .
            </p>
          </div>
        </div>
        {renderJobGrid(RANK_THRESHOLD_CRON_JOBS)}
      </section>

      {/* Rank backfill - repair members stranded below their earned rank */}
      <section className="mb-8">
        <div className="mb-3">
          <h2 className="text-xs font-bold uppercase text-muted-foreground">Rank backfill</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Repair members stranded below the rank their balance already earns (e.g. funded after
            connecting, but their rank never caught up). Run the{" "}
            <span className="font-semibold text-foreground">dry run</span> to preview who would move -
            the affected members appear under the run's details - then{" "}
            <span className="font-semibold text-foreground">apply</span>. This is promote-only: it never
            demotes or suspends anyone. Or re-evaluate a single member below.
          </p>
        </div>
        {renderJobGrid(BACKFILL_CRON_JOBS)}
        <div className="mt-3">
          <SingleMemberReeval />
        </div>
      </section>

      {/* Member tools - headcount, live balance + read-only IB lookups (client + partner) */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase text-muted-foreground">Member tools</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <MembersByCountry />
          <MemberLiveBalance />
          <MemberIbCheck />
          {/* Different question to MemberIbCheck: partner/portal, not client. */}
          <IbPartnerLookup />
        </div>
      </section>

      {/* Free Access Management - per-module complimentary unlocks */}
      <section className="mb-8">
        <FreeAccessManager />
      </section>

      {/* The gap a free-access grant deliberately leaves: IB restrictions. */}
      <section className="mb-8">
        <IbBypassManager />
      </section>

      {/* Other scheduled jobs */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase text-muted-foreground">Platform maintenance</h2>
        {renderJobGrid(OTHER_CRON_JOBS, "triple")}
      </section>

      {/* Daily IB verification - who is restricted and the full event history.
          Collapsed by default; the table is heavy, so it only mounts on open. */}
      <section className="mb-8">
        <details onToggle={(e) => setIbOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer select-none text-xs font-bold uppercase text-muted-foreground">
            IB verification
          </summary>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Output of the <span className="font-semibold text-foreground">Daily IB verification</span>{" "}
            job above: members whose broker UID is no longer registered under EZ Trade's IB, their
            2-day grace deadlines, and every verification attempt, restriction, restoration and
            expiry recorded for them.
          </p>
          {ibOpen && (
            <div className="mt-3">
              <IbVerificationHistory />
            </div>
          )}
        </details>
      </section>

      {/* Run history */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-xs uppercase text-muted-foreground font-bold">Recent runs ({filtered.length})</h2>
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="text-xs px-2 py-1.5 rounded-md border border-border bg-surface text-foreground"
          >
            <option value="all">All jobs</option>
            {ADMIN_CRON_JOBS.map((j) => (
              <option key={j.id} value={j.id}>{j.label}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-soft px-4 py-8 text-center text-sm text-muted-foreground">
            No recorded runs yet. Runs appear here once the cron endpoints fire (after this is deployed + migrated).
          </div>
        ) : (
          <ul className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
            {filtered.map((run) => {
              const isOpen = expanded === run.id;
              return (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const opening = !isOpen;
                      setExpanded(opening ? run.id : null);
                      if (opening) void resolveEmails(run.summary);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-surface-soft transition flex items-center gap-3 flex-wrap"
                  >
                    <StatusBadge status={run.status} />
                    <span className="font-semibold text-sm text-foreground">{JOB_LABEL[run.job] ?? run.job}</span>
                    <span className="text-[10px] font-semibold bg-surface-raised text-muted-foreground rounded-full px-2 py-0.5 uppercase">
                      {run.trigger}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmtWhen(run.started_at)}</span>
                    <span className="text-xs text-muted-foreground">· {fmtDuration(run.duration_ms)}</span>
                    <span className="ml-auto flex flex-wrap gap-1 justify-end">
                      {summaryChips(run.summary).slice(0, 4).map(([k, v]) => (
                        <span key={k} className="text-[11px] rounded bg-surface-soft px-1.5 py-0.5 tabular-nums text-muted-foreground">
                          {k}: <span className="text-foreground font-semibold">{String(v)}</span>
                        </span>
                      ))}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 -mt-1">
                      {run.error && (
                        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-600 mb-2 break-all">
                          {run.error}
                        </div>
                      )}
                      <RunDetails summary={run.summary} emailById={emailById} />
                      <pre className="text-[11px] bg-surface-soft border border-border rounded-md p-3 overflow-x-auto text-muted-foreground">
                        {JSON.stringify(summaryForJson(run.summary), null, 2)}
                      </pre>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Recent data changes (audit_log) */}
      <section>
        <h2 className="text-xs uppercase text-muted-foreground font-bold mb-3">
          Data changed by crons ({audit.length})
        </h2>
        {audit.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-soft px-4 py-6 text-center text-sm text-muted-foreground">
            No recorded changes yet.
          </div>
        ) : (
          <ul className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
            {audit.map((a) => (
              <li key={a.id} className="px-4 py-2.5 flex items-center gap-3 flex-wrap text-xs">
                <span className="font-semibold text-foreground">{a.action}</span>
                {a.target_table && (
                  <span className="text-muted-foreground">
                    {a.target_table === "profiles" && a.target_id && emailById.get(a.target_id)
                      ? emailById.get(a.target_id)
                      : `${a.target_table}${a.target_id ? `/${a.target_id.slice(0, 8)}` : ""}`}
                  </span>
                )}
                <span className="text-muted-foreground/80 truncate max-w-[28rem]">
                  {compactJson(a.before)} → {compactJson(a.after)}
                </span>
                <span className="ml-auto text-muted-foreground">{fmtWhen(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
