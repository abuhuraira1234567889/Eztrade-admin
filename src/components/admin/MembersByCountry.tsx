"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Users } from "lucide-react";
import { fetchMembersByCountry, type MembersByCountry as Data } from "@/lib/admin-crons";

/**
 * Member headcount: total and per country. Exact (the backend pages through
 * every profile), unlike the analytics country list which is range-scoped and
 * capped. Country names resolved from ISO codes with Intl.DisplayNames.
 */
export function MembersByCountry() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      return null;
    }
  }, []);
  const name = (code: string) => {
    try {
      return regionNames?.of(code) ?? code;
    } catch {
      return code;
    }
  };

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchMembersByCountry());
    } catch (e) {
      setError((e as { message?: string })?.message ?? "Request failed.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const q = filter.trim().toLowerCase();
  const rows = (data?.byCountry ?? []).filter(
    (r) => !q || r.country.toLowerCase().includes(q) || name(r.country).toLowerCase().includes(q),
  );
  const pct = (n: number) => (data && data.total > 0 ? `${((n / data.total) * 100).toFixed(1)}%` : "-");

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-sm flex items-center gap-1.5">
            <Users className="h-4 w-4 text-purple" /> Members by country
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Every registered member counted once by profile country. Exact headcount, not range-scoped.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition hover:border-purple/50 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red">{error}</p>}

      {data && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-surface-soft p-3">
              <div className="text-[10px] uppercase text-muted-foreground/70">Total members</div>
              <div className="text-lg font-display font-bold tabular-nums">{data.total.toLocaleString()}</div>
            </div>
            <div className="rounded-lg border border-border bg-surface-soft p-3">
              <div className="text-[10px] uppercase text-muted-foreground/70">Countries</div>
              <div className="text-lg font-display font-bold tabular-nums">{data.byCountry.length}</div>
            </div>
            <div className="rounded-lg border border-border bg-surface-soft p-3">
              <div className="text-[10px] uppercase text-muted-foreground/70">No country set</div>
              <div className="text-lg font-display font-bold tabular-nums">{data.unknown.toLocaleString()}</div>
            </div>
          </div>

          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filter by country or code"
            className="mt-3 w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-purple/50 focus:outline-none"
          />

          <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-soft text-[10px] uppercase text-muted-foreground/70">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Country</th>
                  <th className="px-3 py-2 text-right font-semibold">Members</th>
                  <th className="px-3 py-2 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.country} className="border-t border-border">
                    <td className="px-3 py-1.5">
                      <span className="font-semibold text-foreground">{name(r.country)}</span>{" "}
                      <span className="font-mono text-muted-foreground">{r.country}</span>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{r.count.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{pct(r.count)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-center text-muted-foreground">
                      No countries match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            As of {new Date(data.generatedAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}
