"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
import { fetchMemberLiveBalance, type MemberBalanceResult } from "@/lib/admin-crons";

function money(v: number | null | undefined, currency = "USD"): string {
  if (v == null || !Number.isFinite(v)) return "-";
  try {
    return v.toLocaleString(undefined, { style: "currency", currency });
  } catch {
    return `${currency} ${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
}

/**
 * Admin tool: fetch a member's LIVE balance straight from their primary connected
 * MT5 account (read-only, writes no snapshot). Enter an email or a user id.
 */
export function MemberLiveBalance() {
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MemberBalanceResult | null>(null);

  async function onFetch() {
    const t = target.trim();
    if (!t) {
      toast.error("Enter a member email or user id.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetchMemberLiveBalance(t);
      if (!res.ok || !res.result) {
        toast.error(res.error ?? "Could not fetch balance.");
        return;
      }
      setResult(res.result);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="font-display font-bold text-sm">Member live balance</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Fetches the member's live balance from their primary connected MT5 account, runs a full trades/lots
        sync across their connected accounts, then refreshes their rank/access status off it (same as the
        member Refresh status button, admin-forced, no cooldown).
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) void onFetch();
          }}
          placeholder="member email or user id"
          className="flex-1 rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-purple/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void onFetch()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:border-purple/50 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
          Fetch balance
        </button>
      </div>

      {result && (
        <div className="mt-3 rounded-lg border border-border bg-surface-soft p-3 text-xs">
          <div className="font-semibold text-foreground break-all">{result.email}</div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums sm:grid-cols-3">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground/70">Balance</div>
              <div className="font-semibold text-foreground">{money(result.balance, result.currency)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground/70">Equity</div>
              <div className="text-foreground">{money(result.equity, result.currency)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground/70">MT login</div>
              <div className="text-foreground">{result.login ?? "-"}</div>
            </div>
          </div>
          <div className="mt-2 space-y-1 text-[11px]">
            <div>
              {result.statusRefreshed ? (
                <span className="text-green-600 dark:text-green-400">Rank/access status refreshed.</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  Balance fetched, but the status refresh didn't complete.
                </span>
              )}
            </div>
            {result.tradesSynced != null && (
              <div className="text-muted-foreground">
                Trades/lots synced: {result.tradesSynced} updated
                {result.accountsSynced != null ? ` across ${result.accountsSynced} account${result.accountsSynced === 1 ? "" : "s"}` : ""}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
