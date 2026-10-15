"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { reevaluateMember, restoreMemberRank, type MemberReevalResult } from "@/lib/admin-crons";
import { TIER_NAMES } from "@/lib/constants";

function tierName(t: number | null | undefined): string {
  if (t == null) return "-";
  return `${TIER_NAMES[t] ?? `Tier ${t}`} (T${t})`;
}

function money(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "-";
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Admin tool: inspect and repair a SINGLE member's rank on demand.
 *  - "Dry run (check)" peeks read-only (writes nothing) and shows current vs.
 *    earned rank, country floor, and historical peak.
 *  - "Apply promotion" appears when their balance currently earns a higher rank.
 *  - "Restore rank" appears when a bug wiped their rank below what they earned
 *    (they qualified before, but their current balance no longer earns it - a
 *    re-eval can't fix that). It sets the rank directly and reconciles access.
 */
export function SingleMemberReeval() {
  const [target, setTarget] = useState("");
  const [checking, setChecking] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<MemberReevalResult | null>(null);
  const [restoreTier, setRestoreTier] = useState<number | null>(null);

  const busy = checking || promoting || restoring;

  async function check(t: string) {
    setChecking(true);
    try {
      const res = await reevaluateMember(t, false);
      if (!res.ok || !res.result?.found) {
        toast.error(res.result?.error ?? res.error ?? "Member not found.");
        setResult(res.result ?? null);
        return null;
      }
      setResult(res.result);
      setRestoreTier(Math.max(res.result.floor_tier, res.result.peak_tier));
      return res.result;
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Request failed.");
      return null;
    } finally {
      setChecking(false);
    }
  }

  async function onCheck() {
    const t = target.trim();
    if (!t) {
      toast.error("Enter a member email or user id.");
      return;
    }
    await check(t);
  }

  async function onPromote() {
    const t = target.trim();
    setPromoting(true);
    try {
      const res = await reevaluateMember(t, true);
      if (!res.ok || !res.result?.found) {
        toast.error(res.result?.error ?? res.error ?? "Failed.");
        return;
      }
      toast.success(
        res.result.changed ? `Promoted to ${tierName(res.result.to_tier)}.` : "No change - already correct.",
      );
      await check(t); // refresh the panel
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Request failed.");
    } finally {
      setPromoting(false);
    }
  }

  async function onRestore() {
    const t = target.trim();
    if (restoreTier == null) return;
    setRestoring(true);
    try {
      const res = await restoreMemberRank(t, { toTier: restoreTier, apply: true });
      if (!res.ok || !res.result?.found) {
        toast.error(res.result?.error ?? res.error ?? "Restore failed.");
        return;
      }
      if (res.result.applied) {
        toast.success(`Rank restored to ${tierName(res.result.to_tier)} - scanner + Telegram reconciled.`);
      } else {
        toast.message(res.result.error ?? "Nothing to restore.");
      }
      await check(t); // refresh the panel
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Request failed.");
    } finally {
      setRestoring(false);
    }
  }

  const r = result?.found ? result : null;
  const suggested = r ? Math.max(r.floor_tier, r.peak_tier) : 0;
  const canPromote = !!r && r.changed && !r.applied;
  // Restore is offered when the member once held a rank that's now above their
  // stored tier (the wiped-rank case the promote path can't address).
  const canRestore = !!r && r.had_qualified && suggested > r.from_tier;
  // Tiers you can restore to: from the member's floor up to VIP (never lower).
  const restoreOptions = r
    ? Array.from({ length: 7 }, (_, i) => i + 1).filter((t) => t >= Math.max(1, r.floor_tier))
    : [];

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="font-display font-bold text-sm">Re-evaluate / restore a single member</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        A per-member dry run. <span className="font-semibold text-foreground">Dry run (check)</span> is read-only -
        it writes nothing and shows current vs. earned rank, country floor, and peak.{" "}
        <span className="font-semibold text-foreground">Apply promotion</span> shows when their balance earns more;{" "}
        <span className="font-semibold text-foreground">Restore rank</span> shows when a bug wiped a rank they'd
        earned. Neither ever demotes.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) void onCheck();
          }}
          placeholder="member email or user id"
          className="flex-1 rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-purple/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void onCheck()}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:border-purple/50 disabled:opacity-60"
        >
          {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Dry run (check)
        </button>
      </div>

      {r && (
        <div className="mt-3 rounded-lg border border-border bg-surface-soft p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground break-all">{r.email ?? r.user_id}</span>
            <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {r.state || "-"}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                r.hasAccess
                  ? "bg-green-500/15 text-green-700 dark:text-green-400"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              }`}
            >
              {r.hasAccess ? "has access" : "no access"}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums sm:grid-cols-4">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground/70">Current</div>
              <div className="font-semibold text-foreground">{tierName(r.from_tier)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground/70">Earns now</div>
              <div className={r.changed ? "font-semibold text-green-700 dark:text-green-400" : "text-muted-foreground"}>
                {tierName(r.to_tier)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground/70">Country floor</div>
              <div className="text-foreground">{tierName(r.floor_tier)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground/70">Peak held</div>
              <div className="text-foreground">{tierName(r.peak_tier)}</div>
            </div>
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">Balance: <span className="font-semibold text-foreground tabular-nums">{money(r.balance)}</span></div>

          {/* Promote - their balance currently earns a higher rank */}
          {canPromote && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                Dry run · nothing written yet
              </span>
              <button
                type="button"
                onClick={() => void onPromote()}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-purple px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple/90 disabled:opacity-60"
              >
                {promoting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                Apply promotion → {tierName(r.to_tier)}
              </button>
            </div>
          )}

          {/* Restore - a bug wiped a rank they'd earned; their balance no longer earns it */}
          {canRestore && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="text-[11px] text-amber-700 dark:text-amber-300">
                This member held a higher rank that isn't reflected in their current tier (floor{" "}
                {tierName(r.floor_tier)}, peak {tierName(r.peak_tier)}). Restore it directly:
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={restoreTier ?? suggested}
                  onChange={(e) => setRestoreTier(Number(e.target.value))}
                  className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-purple/50 focus:outline-none"
                >
                  {restoreOptions.map((t) => (
                    <option key={t} value={t}>
                      {tierName(t)}
                      {t === suggested ? " · suggested" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void onRestore()}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/15 disabled:opacity-60 dark:text-amber-300"
                >
                  {restoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Restore rank
                </button>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground/70">
                Writes the rank + reconciles scanner/Telegram. Never lowers a rank.
              </div>
            </div>
          )}

          {!canPromote && !canRestore && (
            <div className="mt-3 border-t border-border pt-3 text-muted-foreground/70">
              {r.applied ? (
                <span className="inline-flex items-center gap-1.5 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Done - nothing more to change.
                </span>
              ) : (
                "Nothing to apply - this member is already at the rank they've earned."
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
