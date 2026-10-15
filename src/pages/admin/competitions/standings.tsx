"use client";

import { useEffect, useState } from "react";
import { getApi } from "@/services/api";
import { TIER_NAMES } from "@/lib/constants";

/**
 * Admin standings table for one competition.
 *
 * The member board is a top-50 podium with anonymised names; this is the
 * operational view behind it: every entrant (ranked or not), the real identity
 * to pay out to, the account the entry is locked to, and why the scorer skipped
 * anyone it could not rank. Data comes from /api/admin/data/competition-standings
 * (service-role) - a browser-direct read can see competition_entries but not the
 * joined profiles, so it would render a board of nameless rows.
 */

type StandingRow = {
  user_id: string;
  rank: number | null;
  metric_value: number | null;
  pnl: number | null;
  trades_count: number | null;
  points: number | null;
  scored_at: string | null;
  excluded_reason: string | null;
  joined_at: string;
  account_login: string | number | null;
  anonymous: boolean;
  starting_balance: number | null;
  /** When the baseline balance was read. Must be at/before the anchor. */
  baseline_at: string | null;
  profile: {
    id: string;
    email: string | null;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    tier: number | null;
    country: string | null;
  } | null;
};

type Payload = {
  competition: {
    id: string;
    name: string;
    metric?: string | null;
    entry_mode?: string | null;
    rules?: unknown;
  } | null;
  rows: StandingRow[];
  scoredAt: string | null;
};

const METRIC_LABEL: Record<string, string> = {
  profit_pct: "% profit",
  profit_usd: "Net profit",
  lots: "Lots",
};

function formatMetric(v: number | null, metric: string): string {
  if (v === null || !Number.isFinite(v)) return "-";
  if (metric === "profit_usd")
    return `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (metric === "lots") return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

/** [500, 300, 200] → prize for a given placing, or null. */
function prizeSplit(rules: unknown): number[] {
  if (!rules || typeof rules !== "object") return [];
  const v = (rules as Record<string, unknown>).prize_split_usd;
  return Array.isArray(v) ? v.filter((n): n is number => typeof n === "number") : [];
}

/**
 * Days between the baseline reading and the join. The baseline may only come
 * from a reading at/before the anchor, so a large positive gap means the score
 * is measured against a balance from well before the member entered - the
 * distortion behind an implausible percentage. null when either date is missing.
 */
function baselineStaleDays(row: StandingRow): number | null {
  if (!row.baseline_at || !row.joined_at) return null;
  const gap = (Date.parse(row.joined_at) - Date.parse(row.baseline_at)) / 86_400_000;
  return Number.isFinite(gap) ? gap : null;
}

function memberName(row: StandingRow): string {
  const p = row.profile;
  return (
    p?.display_name ||
    [p?.first_name, p?.last_name].filter(Boolean).join(" ") ||
    p?.email ||
    "Unknown member"
  );
}

export function CompetitionStandings({ competitionId }: { competitionId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getApi<Payload>("/api/admin/data/competition-standings", { competition: competitionId })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: unknown) => {
        // Never fall back to an empty table - "nobody entered" and "the read
        // failed" must not look the same on an operational page.
        if (!cancelled) setError(e instanceof Error ? e.message : "Standings read failed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  const rows = data?.rows ?? [];
  const metric = data?.competition?.metric ?? "profit_pct";
  const split = prizeSplit(data?.competition?.rules);
  const ranked = rows.filter((r) => r.rank !== null).length;
  // Tied entrants share a place, so more than one row can sit on a paying rank.
  // Splitting the money is a payout decision - flag the tie instead of quoting
  // each of them the full amount.
  const rankCounts = rows.reduce<Record<number, number>>((acc, r) => {
    if (r.rank !== null) acc[r.rank] = (acc[r.rank] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="mt-8 rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="font-display text-base font-bold">Standings</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {loading
              ? "Loading entrants…"
              : `${rows.length} entrant${rows.length === 1 ? "" : "s"} · ${ranked} ranked${
                  data?.competition?.entry_mode
                    ? ` · ${data.competition.entry_mode} entry`
                    : ""
                }`}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {data?.scoredAt
            ? `Last scored ${new Date(data.scoredAt).toLocaleString()}`
            : "Never scored"}
        </div>
      </div>

      {error ? (
        <div className="px-4 py-6 text-sm text-red">
          Standings could not be loaded: {error}
        </div>
      ) : loading ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No entries yet. Members appear here once they are entered and the scorer has run.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-soft text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="w-14 px-4 py-2.5 text-left">Rank</th>
                <th className="px-4 py-2.5 text-left">Member</th>
                <th className="px-4 py-2.5 text-left">Tier</th>
                <th className="px-4 py-2.5 text-left">Account</th>
                <th className="px-4 py-2.5 text-right">Baseline</th>
                <th className="px-4 py-2.5 text-right">Trades</th>
                {split.length > 0 && <th className="px-4 py-2.5 text-right">Prize</th>}
                <th className="px-4 py-2.5 text-right">{METRIC_LABEL[metric] ?? METRIC_LABEL.profit_pct}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const name = memberName(r);
                const prize =
                  r.rank !== null && r.rank >= 1 && r.rank <= split.length ? split[r.rank - 1] : null;
                const tied = r.rank !== null && (rankCounts[r.rank] ?? 0) > 1;
                return (
                  <tr key={r.user_id} className="border-t border-border align-top">
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.rank === null ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <span className="font-display font-bold">#{r.rank}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-foreground">
                        {name}
                        {r.anonymous && (
                          <span
                            className="ml-2 whitespace-nowrap rounded bg-surface-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground"
                            title="This member is hidden from the public board. Admins still see the real name."
                          >
                            Hidden publicly
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.profile?.email ?? r.user_id}
                      </div>
                      {r.excluded_reason && (
                        <div className="mt-0.5 text-[11px] text-amber">
                          Not ranked: {r.excluded_reason}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                      {r.profile?.tier != null ? (TIER_NAMES[r.profile.tier] ?? r.profile.tier) : "-"}
                      {r.profile?.country ? ` · ${r.profile.country}` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
                      {r.account_login ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
                      {r.starting_balance == null
                        ? "-"
                        : `$${r.starting_balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                      {(() => {
                        const gap = baselineStaleDays(r);
                        if (gap == null || gap <= 1) return null;
                        return (
                          <div
                            className="mt-0.5 whitespace-nowrap text-[10px] font-semibold text-amber"
                            title={`Baseline was read ${gap.toFixed(1)} days before this member joined. The score is measured against a pre-join balance and may be distorted.`}
                          >
                            ⚠ stale {gap.toFixed(0)}d
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
                      {r.trades_count ?? 0}
                    </td>
                    {split.length > 0 && (
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums">
                        {prize === null ? (
                          <span className="text-muted-foreground">-</span>
                        ) : tied ? (
                          <span className="whitespace-nowrap text-amber" title={`$${prize.toLocaleString()}`}>
                            Tied place
                          </span>
                        ) : (
                          <span className="font-bold text-amber">${prize.toLocaleString()}</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">
                      {r.excluded_reason ? (
                        <span className="text-xs font-normal text-muted-foreground">-</span>
                      ) : (
                        <span className={(r.metric_value ?? 0) < 0 ? "text-red" : "text-green"}>
                          {formatMetric(r.metric_value, metric)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
