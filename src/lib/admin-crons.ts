/** Admin-triggerable cron jobs (mirrors backend CRON_JOBS). */

import axios from "axios";
import { getApi, postApi } from "@/services/api";

export type AdminCronJob = {
  id: string;
  label: string;
  schedule: string;
  desc: string;
  /** Jobs that apply rank-threshold / feature-gate saves to existing members. */
  rankThresholds?: boolean;
  /** One-off rank-repair jobs (grouped in their own "Rank backfill" section). */
  backfill?: boolean;
};

export const ADMIN_CRON_JOBS: AdminCronJob[] = [
  // Legacy engine crons (sync-trades, refresh-balances, recheck-tiers,
  // recheck-compliance) removed - the lifecycle evaluator owns rank + access.
  {
    id: "lifecycle-reviews",
    label: "Lifecycle reviews",
    schedule: "Hourly",
    desc: "Members whose 30-day review is due: targeted broker pull + one evaluator pass each (pass / grace / suspend).",
  },
  {
    id: "lifecycle-grace",
    label: "Lifecycle grace checks",
    schedule: "Every 15 min",
    desc: "Resolves expired 48h grace windows: recovered members stay active, still-failing ones are suspended (blown at ≤ $25).",
  },
  {
    id: "inactive-updates",
    label: "Inactive member updates",
    schedule: "Every 14 days · 10 AM",
    desc: "Emails paused (inactive) members a restore nudge + product update. Skips anyone contacted in the last 14 days, banned accounts, and email-opted-out prefs. Also mirrors in-app + Telegram DM when linked.",
  },
  {
    id: "lifecycle-reevaluate",
    label: "Re-evaluate all members",
    schedule: "On demand",
    desc: "Fleet re-evaluation off stored snapshots - apply edited rank thresholds / country tiers / lifecycle settings to existing members. Promote-only, never demotes.",
    rankThresholds: true,
  },
  {
    id: "sync-tradingview",
    label: "Sync TradingView",
    schedule: "Every 6 hours",
    desc: "Grants or revokes Cypher Scanner access from feature gates",
    rankThresholds: true,
  },
  {
    id: "ib-daily-verification",
    label: "Daily IB verification",
    schedule: "Daily · 3 AM",
    desc: "Re-runs the Step-1 broker check (TradeQuo) against every member's stored UID. A UID no longer under EZ Trade's IB restricts the member immediately and opens a 2-day grace window (in-app + Telegram + email notice with transfer instructions); verifying again inside the window restores access automatically; letting it expire removes the UID verification and sends the member back to Step 1. Idempotent - re-runs never extend a deadline or re-warn. Full history under \"IB verification history\" below.",
  },
  {
    id: "tradequo-migration",
    label: "TradeQuo SQL migration",
    schedule: "Daily · 4 AM",
    desc: "Moves legacy TradeQuo members (verified by Client ID / MT5) onto the SQL-based verification. A Client ID + email that resolve to the same TradeQuo client in the feed migrate silently (rank recalculated from the cumulative TradeQuo balance). Mismatches and no-matches get a 7-day window to verify their TradeQuo email via Step 1; when it lapses the verification is revoked and the member returns to Step 1. Idempotent.",
  },
  {
    id: "sync-telegram-announcements",
    label: "Sync announcements",
    schedule: "Every 15 min",
    desc: "Mirrors the Telegram announcements feed",
  },
  {
    id: "live-session-notifications",
    label: "Live session alerts",
    schedule: "Every 5 min",
    desc: "30-min and live-now reminders for rank-eligible members",
  },
  {
    id: "score-competitions",
    label: "Score competitions",
    schedule: "Hourly · :20",
    desc: "Recomputes standings for every live competition from closed trades in the UTC window. The run that lands after a competition's end time settles its final result.",
  },
  {
    id: "backfill-ranks-dry",
    label: "Backfill ranks - dry run",
    schedule: "On demand",
    desc: "Preview only. Lists every connected member whose current balance already earns a HIGHER rank than they're showing (the stranded strand). Writes nothing - check the run details before applying.",
    backfill: true,
  },
  {
    id: "backfill-ranks",
    label: "Backfill ranks - apply",
    schedule: "On demand",
    desc: "Promotes every member stranded below the rank they've earned. Promote-only (never demotes anyone), idempotent, and notifications are suppressed. Run the dry run first.",
    backfill: true,
  },
];

export const RANK_THRESHOLD_CRON_JOBS = ADMIN_CRON_JOBS.filter((j) => j.rankThresholds);
export const BACKFILL_CRON_JOBS = ADMIN_CRON_JOBS.filter((j) => j.backfill);

export const ADMIN_CRON_JOB_LABEL: Record<string, string> = Object.fromEntries(
  ADMIN_CRON_JOBS.map((j) => [j.id, j.label]),
);

export type RunAdminCronResult = { ok?: boolean; started?: boolean; error?: string };

export function apiUnreachableMessage(): string {
  return "Backend API is not reachable. Start it: cd eztrade-platform/backend && npm run dev (port 3001).";
}

/** POST /api/admin/crons/run with readable errors when the Vite proxy cannot reach :3001. */
export async function runAdminCron(job: string): Promise<RunAdminCronResult> {
  try {
    return await postApi<RunAdminCronResult>("/api/admin/crons/run", { job });
  } catch (e) {
    if (axios.isAxiosError(e)) {
      if (!e.response) {
        throw new Error(apiUnreachableMessage());
      }
      const msg = (e.response.data as { message?: string })?.message;
      if (e.response.status >= 500) {
        throw new Error(msg ?? apiUnreachableMessage());
      }
      if (e.response.status === 403) {
        throw new Error("You don't have staff access to run cron jobs.");
      }
      if (e.response.status === 401) {
        throw new Error("Session expired. Sign in again.");
      }
      throw new Error(msg ?? `Request failed (${e.response.status}).`);
    }
    throw e;
  }
}

export type MemberReevalResult = {
  found: boolean;
  user_id: string | null;
  email: string | null;
  from_tier: number;
  to_tier: number;
  balance: number;
  state: string;
  hasAccess: boolean;
  changed: boolean;
  applied: boolean;
  /** Rank-restore context (for the "wrongly reset" case a re-eval can't fix). */
  floor_tier: number;
  peak_tier: number;
  had_qualified: boolean;
  error?: string;
};

export type ReevalResponse = { ok: boolean; result?: MemberReevalResult; error?: string };

/**
 * POST /api/admin/crons/reevaluate-member - re-evaluate ONE member's rank.
 * apply=false peeks (read-only, shows what would change); apply=true promotes
 * (never demotes). `target` is an email or a user id.
 */
export async function reevaluateMember(target: string, apply: boolean): Promise<ReevalResponse> {
  return callMemberEndpoint<ReevalResponse>("/api/admin/crons/reevaluate-member", { target, apply });
}

export type RestoreRankResult = {
  found: boolean;
  user_id: string | null;
  email: string | null;
  from_tier: number;
  floor_tier: number;
  peak_tier: number;
  suggested_tier: number;
  to_tier: number;
  had_qualified: boolean;
  state: string;
  applied: boolean;
  error?: string;
};

export type RestoreResponse = { ok: boolean; result?: RestoreRankResult; error?: string };

/**
 * POST /api/admin/crons/restore-member-rank - directly restore a rank a bug
 * wiped below what the member earned. apply=false previews. `toTier` overrides
 * the default (max of country floor + historical peak). Never lowers a rank.
 */
export async function restoreMemberRank(
  target: string,
  opts: { toTier?: number; apply: boolean },
): Promise<RestoreResponse> {
  return callMemberEndpoint<RestoreResponse>("/api/admin/crons/restore-member-rank", {
    target,
    toTier: opts.toTier,
    apply: opts.apply,
  });
}

export type MemberBalanceResult = {
  email: string;
  login: number | null;
  balance: number;
  equity: number;
  currency: string;
  statusRefreshed?: boolean;
  /** Trades inserted + updated across the member's connected accounts. */
  tradesSynced?: number;
  /** Number of connected accounts the trades sync ran over. */
  accountsSynced?: number;
};

export type MemberBalanceResponse = { ok: boolean; result?: MemberBalanceResult; error?: string };

/**
 * POST /api/admin/crons/member-live-balance - fetch a member's LIVE balance from
 * their primary connected MT5 account. Read-only. `target` is an email or user id.
 */
export async function fetchMemberLiveBalance(target: string): Promise<MemberBalanceResponse> {
  return callMemberEndpoint<MemberBalanceResponse>("/api/admin/crons/member-live-balance", { target });
}

export type IbCheckResponse = {
  ok: boolean;
  error?: string;
  note?: string;
  member?: {
    id: string;
    email: string | null;
    name?: string | null;
    ibStatus?: string | null;
    graceExpiresAt?: string | null;
    lastCheckedAt?: string | null;
    tier?: number | null;
    tradingview?: string | null;
    telegram?: string | null;
  } | null;
  broker?: string;
  brokerSlug?: string;
  uid?: string;
  mtLogin?: string | null;
  /** True when the stored UID is actually the member's MT login - the check
   *  is then looking up the wrong identifier and can never match. */
  uidIsMtLogin?: boolean;
  outcome?: "verified" | "not_under_ib" | "unavailable" | "no_verifier";
  underOurIb?: boolean;
  /** Account email is on the IB bypass allowlist - the provider result above is
   *  informational only, nothing will restrict this member. */
  ibBypass?: boolean;
  message?: string | null;
  /** Only when the UID belongs to no member - checked against each broker. */
  results?: Array<{ broker: string; slug: string; outcome: string }>;
};

/**
 * POST /api/admin/crons/check-member-ib - "is this member under our IB?".
 * `target` is an email, user id or broker UID. `broker` forces which broker to
 * check against (omit to use the member's own) - TradeQuo verifies by account
 * email and keeps no UID on file, so it often can't be inferred. Runs the same
 * provider check as the daily cron but writes nothing: no status change, no
 * notification, no access change.
 */
export async function checkMemberIb(
  target: string,
  broker?: IbCheckBroker,
): Promise<IbCheckResponse> {
  return callMemberEndpoint<IbCheckResponse>("/api/admin/crons/check-member-ib", {
    target,
    ...(broker ? { broker } : {}),
  });
}

/** Brokers with an IB verifier. "" = infer from the member's own broker. */
export type IbCheckBroker = "puprime" | "tradequo";

export const IB_CHECK_BROKERS: Array<{ value: "" | IbCheckBroker; label: string }> = [
  { value: "", label: "Auto (member's broker)" },
  { value: "tradequo", label: "TradeQuo" },
];

/** Shared POST with the same readable error handling the cron calls use. */
async function callMemberEndpoint<T>(path: string, body: unknown): Promise<T> {
  try {
    return await postApi<T>(path, body);
  } catch (e) {
    if (axios.isAxiosError(e)) {
      if (!e.response) throw new Error(apiUnreachableMessage());
      const msg = (e.response.data as { message?: string })?.message;
      if (e.response.status === 403) throw new Error("You don't have staff access for this.");
      if (e.response.status === 401) throw new Error("Session expired. Sign in again.");
      throw new Error(msg ?? `Request failed (${e.response.status}).`);
    }
    throw e;
  }
}

export type CancelAdminCronResult = { ok?: boolean; cancelled?: number; error?: string };

/** POST /api/admin/crons/cancel - frees a stuck job's 'running' row so it can be re-run. */
export async function cancelAdminCron(job: string): Promise<CancelAdminCronResult> {
  try {
    return await postApi<CancelAdminCronResult>("/api/admin/crons/cancel", { job });
  } catch (e) {
    if (axios.isAxiosError(e)) {
      if (!e.response) throw new Error(apiUnreachableMessage());
      const msg = (e.response.data as { message?: string })?.message;
      if (e.response.status === 403) throw new Error("You don't have staff access to cancel cron jobs.");
      if (e.response.status === 401) throw new Error("Session expired. Sign in again.");
      throw new Error(msg ?? `Request failed (${e.response.status}).`);
    }
    throw e;
  }
}

export async function fetchApiHealth(): Promise<boolean> {
  try {
    const baseURL = import.meta.env.VITE_API_URL ?? "";
    const { data } = await axios.get<{ ok?: boolean }>(`${baseURL}/api/health`, { timeout: 5000 });
    return data?.ok === true;
  } catch {
    return false;
  }
}

export type CronRunSnapshot = {
  status: string;
  started_at: string;
  duration_ms: number | null;
  summary: unknown;
};

export async function fetchLatestCronRun(job: string): Promise<CronRunSnapshot | null> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data } = await supabase
    .from("cron_runs" as never)
    .select("status, started_at, duration_ms, summary")
    .eq("job", job)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    status: String(row.status),
    started_at: String(row.started_at),
    duration_ms: row.duration_ms == null ? null : Number(row.duration_ms),
    summary: row.summary,
  };
}

/** Poll until the latest run leaves "running" (recheck ranks can take several minutes). */
export async function waitForCronRunSettled(
  job: string,
  onTick?: (snap: CronRunSnapshot | null) => void,
  maxWaitMs = 600_000,
  intervalMs = 5000,
): Promise<CronRunSnapshot | null> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const snap = await fetchLatestCronRun(job);
    onTick?.(snap);
    if (snap && snap.status !== "running") return snap;
  }
  return fetchLatestCronRun(job);
}

export function isCronJobInProgress(last?: { status: string } | null, localRunning = false): boolean {
  return localRunning || last?.status === "running";
}

// ── IB partner lookup (Cron jobs page) ──────────────────────────────────────
// Deliberately NOT the same thing as checkMemberIb above: that asks the broker
// whether a member's TRADING ACCOUNT sits under our IB network. This asks
// whether the person IS an IB partner with a portal, and why their Client/IB
// switch is or isn't showing.

export type IbPartnerRow = {
  id: string;
  name: string | null;
  brokerIbId: string | null;
  broker: string | null;
  email: string | null;
  status: string | null;
  userId: string | null;
  accessVerifiedAt: string | null;
};

export type IbLookupResult = {
  query: string;
  email: string;
  profile: { id: string; email: string | null; brokerEmail: string | null } | null;
  byEmail: IbPartnerRow[];
  byUserId: IbPartnerRow[];
  /** Loose matches (broker IB id / name / partial email) when nothing matched. */
  similar: IbPartnerRow[];
  switchVisible: boolean;
  portalVerified: boolean;
  verdict: string;
};

export async function lookupIbPartner(query: string): Promise<IbLookupResult> {
  try {
    return await getApi<IbLookupResult>("/api/admin/ib/lookup", { email: query });
  } catch (e) {
    if (axios.isAxiosError(e)) {
      if (!e.response) throw new Error(apiUnreachableMessage());
      const msg = (e.response.data as { message?: string })?.message;
      if (e.response.status === 403) throw new Error("You don't have admin access for this.");
      if (e.response.status === 401) throw new Error("Session expired. Sign in again.");
      throw new Error(msg ?? `Request failed (${e.response.status}).`);
    }
    throw e;
  }
}

export type MembersByCountry = {
  total: number;
  unknown: number;
  byCountry: Array<{ country: string; count: number }>;
  generatedAt: string;
};

/** Member headcount, total and per country (exact - the backend pages through every profile). */
export function fetchMembersByCountry(): Promise<MembersByCountry> {
  return getApi<MembersByCountry>("/api/admin/data/members-by-country");
}
