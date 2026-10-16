import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search, ShieldAlert } from "lucide-react";
import { getApi } from "@/services/api";

/**
 * Admin history for the daily IB UID verification cron.
 *
 * Two views over the same job:
 *   - "Restricted now" - who is currently in grace / revoked, with deadlines
 *   - "History"        - the ib_verification_log event stream (every access
 *                        restriction, restoration, grace expiry and error;
 *                        `All attempts` also shows the routine passes)
 *
 * Search accepts an email or a user id and scopes both views to that member.
 */

type LogRow = {
  id: number;
  user_id: string;
  email: string | null;
  broker_slug: string | null;
  broker_uid: string | null;
  check_result: string;
  event: string;
  status_before: string | null;
  status_after: string | null;
  failure_reason: string | null;
  grace_expires_at: string | null;
  trigger: string | null;
  cron_run_id: number | null;
  created_at: string;
};

type RestrictedRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  ib_status: string;
  ib_first_failed_at: string | null;
  ib_grace_expires_at: string | null;
  ib_restricted_at: string | null;
  ib_revoked_at: string | null;
  ib_last_checked_at: string | null;
  ib_last_verified_at: string | null;
  ib_last_failure_reason: string | null;
  onboarding_broker_uid: string | null;
  broker_slug: string | null;
  broker_name: string | null;
};

/** Brokers get their own filter because each verifies against a different
 *  system - a combined count hides which provider is actually failing. */
const BROKER_LABEL: Record<string, string> = {
  tradequo: "TradeQuo",
};

const brokerLabel = (slug: string | null | undefined): string =>
  !slug ? "Unknown" : (BROKER_LABEL[slug] ?? slug);

const EVENT_LABEL: Record<string, string> = {
  checked: "Verified",
  restricted: "Access restricted",
  still_failing: "Still failing",
  restored: "Access restored",
  grace_expired: "Grace expired - verification removed",
  skipped: "Skipped",
  error: "Error",
};

const EVENT_COLOR: Record<string, string> = {
  checked: "text-muted-foreground",
  restricted: "text-amber-600",
  still_failing: "text-amber-600",
  restored: "text-green-600",
  grace_expired: "text-red-600",
  skipped: "text-muted-foreground",
  error: "text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  ok: "Verified",
  grace: "Grace",
  flagged: "Grace (legacy)",
  revoked: "Revoked",
};

function fmtWhen(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "in 1d 4h" / "expired" - how long a grace window has left. */
function graceLeft(iso: string | null | undefined): string {
  if (!iso) return "-";
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return "-";
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  return days > 0 ? `in ${days}d ${hours % 24}h` : `in ${hours}h`;
}

export function IbVerificationHistory() {
  const [tab, setTab] = useState<"restricted" | "history">("restricted");
  const [broker, setBroker] = useState<string>("all");
  const [allAttempts, setAllAttempts] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [restricted, setRestricted] = useState<RestrictedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("user", query);
      if (allAttempts) params.set("events", "all");
      params.set("limit", "200");
      const [logRes, restrictedRes] = await Promise.all([
        getApi<{ rows: LogRow[] }>(`/api/admin/data/ib-verification-log?${params}`),
        getApi<{ rows: RestrictedRow[] }>("/api/admin/data/ib-restricted-members"),
      ]);
      setLogs(logRes.rows ?? []);
      const rows = restrictedRes.rows ?? [];
      const q = query.trim().toLowerCase();
      setRestricted(
        q ? rows.filter((r) => (r.email ?? "").toLowerCase().includes(q) || r.id === query) : rows,
      );
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Couldn't load IB verification history.");
    } finally {
      setLoading(false);
    }
  }, [query, allAttempts]);

  useEffect(() => {
    void load();
  }, [load]);

  // Every broker present in the data, so a new broker shows up without a code
  // change. Ordered by how many restricted members it has.
  const brokerCounts = restricted.reduce<Record<string, number>>((acc, r) => {
    const k = r.broker_slug ?? "unknown";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const brokerTabs = Object.entries(brokerCounts).sort((a, b) => b[1] - a[1]);

  const matchesBroker = (slug: string | null | undefined): boolean =>
    broker === "all" || (slug ?? "unknown") === broker;

  const visibleRestricted = restricted.filter((r) => matchesBroker(r.broker_slug));
  const visibleLogs = logs.filter((r) => matchesBroker(r.broker_slug));

  // Status split for whatever broker is selected - "140 in grace, 3 revoked"
  // is the number that actually drives support work.
  const statusCounts = visibleRestricted.reduce<Record<string, number>>((acc, r) => {
    acc[r.ib_status] = (acc[r.ib_status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h3 className="text-sm uppercase tracking-wider text-foreground font-bold flex items-center gap-2">
          <span className="text-purple">
            <ShieldAlert className="w-4 h-4" />
          </span>
          IB verification history
        </h3>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setTab("restricted")}
              className={`px-3 py-1.5 text-xs font-semibold ${
                tab === "restricted" ? "bg-purple text-white" : "text-muted-foreground"
              }`}
            >
              Restricted now ({visibleRestricted.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("history")}
              className={`px-3 py-1.5 text-xs font-semibold ${
                tab === "history" ? "bg-purple text-white" : "text-muted-foreground"
              }`}
            >
              History
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search.trim());
            }}
            className="flex items-center gap-1.5"
          >
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Member email or id"
                className="pl-7 pr-2 py-1.5 text-xs rounded-lg border border-border bg-background w-52"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-surface-soft"
            >
              Search
            </button>
            {query && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setQuery("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </form>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="p-1.5 rounded-lg border border-border hover:bg-surface-soft disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Broker filter + per-broker counts. Applies to BOTH tabs. */}
      {brokerTabs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => setBroker("all")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
              broker === "all"
                ? "border-purple bg-purple/10 text-purple"
                : "border-border text-muted-foreground hover:bg-surface-soft"
            }`}
          >
            All brokers ({restricted.length})
          </button>
          {brokerTabs.map(([slug, count]) => (
            <button
              key={slug}
              type="button"
              onClick={() => setBroker(slug)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                broker === slug
                  ? "border-purple bg-purple/10 text-purple"
                  : "border-border text-muted-foreground hover:bg-surface-soft"
              }`}
            >
              {brokerLabel(slug)} ({count})
            </button>
          ))}

          {visibleRestricted.length > 0 && (
            <span className="ml-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              <span className="opacity-60">·</span>
              {(["grace", "flagged", "revoked"] as const)
                .filter((s) => statusCounts[s])
                .map((s) => (
                  <span
                    key={s}
                    className={s === "revoked" ? "text-red-600" : "text-amber-600"}
                  >
                    {statusCounts[s]} {STATUS_LABEL[s] ?? s}
                  </span>
                ))}
            </span>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {tab === "restricted" ? (
        visibleRestricted.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {restricted.length === 0
              ? "No members are currently restricted by the IB check."
              : `No restricted members for ${brokerLabel(broker)}.`}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-1.5 pr-3 font-semibold">Member</th>
                  <th className="py-1.5 pr-3 font-semibold">Broker</th>
                  <th className="py-1.5 pr-3 font-semibold">UID</th>
                  <th className="py-1.5 pr-3 font-semibold">Status</th>
                  <th className="py-1.5 pr-3 font-semibold">First failed</th>
                  <th className="py-1.5 pr-3 font-semibold">Grace ends</th>
                  <th className="py-1.5 pr-3 font-semibold">Last checked</th>
                  <th className="py-1.5 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleRestricted.map((r) => (
                  <tr key={r.id}>
                    <td className="py-1.5 pr-3 font-medium text-foreground break-all">
                      {r.email ?? r.id}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">
                      {brokerLabel(r.broker_slug)}
                    </td>
                    <td className="py-1.5 pr-3 tabular-nums">{r.onboarding_broker_uid ?? "-"}</td>
                    <td
                      className={`py-1.5 pr-3 font-semibold ${
                        r.ib_status === "revoked" ? "text-red-600" : "text-amber-600"
                      }`}
                    >
                      {STATUS_LABEL[r.ib_status] ?? r.ib_status}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">
                      {fmtWhen(r.ib_first_failed_at)}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">
                      {r.ib_status === "revoked"
                        ? `revoked ${fmtWhen(r.ib_revoked_at)}`
                        : `${fmtWhen(r.ib_grace_expires_at)} (${graceLeft(r.ib_grace_expires_at)})`}
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">
                      {fmtWhen(r.ib_last_checked_at)}
                    </td>
                    <td className="py-1.5 text-muted-foreground">
                      {r.ib_last_failure_reason ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2 select-none">
            <input
              type="checkbox"
              checked={allAttempts}
              onChange={(e) => setAllAttempts(e.target.checked)}
            />
            Show every attempt (including routine passes)
          </label>
          {visibleLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {logs.length === 0
                ? "No IB verification events recorded yet."
                : `No ${brokerLabel(broker)} events in the latest ${logs.length} records.`}
            </p>
          ) : (
            <ul className="divide-y divide-border max-h-96 overflow-y-auto">
              {visibleLogs.map((row) => (
                <li key={row.id} className="py-1.5 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-foreground break-all">
                      {row.email ?? row.user_id}
                    </span>
                    <span
                      className={`font-semibold shrink-0 ${EVENT_COLOR[row.event] ?? "text-muted-foreground"}`}
                    >
                      {EVENT_LABEL[row.event] ?? row.event}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground/80 tabular-nums">
                    <span>{fmtWhen(row.created_at)}</span>
                    {row.broker_slug && (
                      <span>
                        {row.broker_slug}
                        {row.broker_uid ? ` · UID ${row.broker_uid}` : ""}
                      </span>
                    )}
                    <span>provider: {row.check_result}</span>
                    {row.status_before && row.status_after && row.status_before !== row.status_after && (
                      <span>
                        {STATUS_LABEL[row.status_before] ?? row.status_before} →{" "}
                        {STATUS_LABEL[row.status_after] ?? row.status_after}
                      </span>
                    )}
                    {row.grace_expires_at && <span>grace ends {fmtWhen(row.grace_expires_at)}</span>}
                    {row.failure_reason && <span>reason: {row.failure_reason}</span>}
                    {row.trigger && <span>via {row.trigger}</span>}
                    {row.cron_run_id != null && <span>run #{row.cron_run_id}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
