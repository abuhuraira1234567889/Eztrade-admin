"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldX, ShieldQuestion, Search } from "lucide-react";
import {
  checkMemberIb,
  IB_CHECK_BROKERS,
  type IbCheckBroker,
  type IbCheckResponse,
} from "@/lib/admin-crons";

/**
 * Admin tool: "is this member under our IB?".
 *
 * Runs the SAME provider check the daily cron runs, but writes nothing - no
 * status change, no notification, no Telegram/TradingView change. Support can
 * answer the question without gambling a member's access on it.
 *
 * Accepts an email, a user id, a broker UID, or an MT login. It also flags the
 * commonest false failure: the member typed their MT LOGIN into the broker-UID
 * field, so the check looks up the wrong identifier and can never match.
 *
 * The broker selector exists because the two brokers are checked on different
 * keys: PU Prime by UID, TradeQuo by ACCOUNT EMAIL. TradeQuo onboarding stores
 * no client id, so there is often no UID and no broker to infer from - "Auto"
 * then has nothing to go on and the admin has to say which broker to ask.
 */

const OUTCOME: Record<
  string,
  { label: string; tone: string; Icon: typeof ShieldCheck; blurb: string }
> = {
  verified: {
    label: "Under our IB",
    tone: "text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/5",
    Icon: ShieldCheck,
    blurb: "The broker confirms this account sits in the EZ Trade IB network.",
  },
  not_under_ib: {
    label: "NOT under our IB",
    tone: "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/5",
    Icon: ShieldX,
    blurb: "The broker does not have this account in the EZ Trade IB network.",
  },
  unavailable: {
    label: "Inconclusive",
    tone: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5",
    Icon: ShieldQuestion,
    blurb:
      "The broker's verification service could not be reached. This is NOT evidence the member left the IB.",
  },
  no_verifier: {
    label: "No verifier",
    tone: "text-muted-foreground border-border bg-surface-soft",
    Icon: ShieldQuestion,
    blurb: "This broker has no verification API, so membership cannot be checked automatically.",
  },
};

export function MemberIbCheck() {
  const [target, setTarget] = useState("");
  const [broker, setBroker] = useState<"" | IbCheckBroker>("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<IbCheckResponse | null>(null);

  async function onCheck() {
    const t = target.trim();
    if (!t) {
      toast.error("Enter a member email, user id or broker UID.");
      return;
    }
    setLoading(true);
    setRes(null);
    try {
      const r = await checkMemberIb(t, broker || undefined);
      if (!r.ok) {
        toast.error(r.error ?? "Check failed.");
        return;
      }
      setRes(r);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  const o = res?.outcome ? OUTCOME[res.outcome] : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="font-display font-bold text-sm">Is this member under our IB?</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Runs the same broker check as the daily IB cron, but changes nothing - no status update, no
        notification, no Telegram or TradingView change. Enter an email, user id, broker UID or MT login.
        Pick a broker when the member has no UID on file - TradeQuo verifies by account email.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) void onCheck();
          }}
          placeholder="email, user id, broker UID or MT login"
          className="flex-1 rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-purple/50 focus:outline-none"
        />
        <select
          value={broker}
          onChange={(e) => setBroker(e.target.value as "" | IbCheckBroker)}
          aria-label="Broker to check against"
          className="rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground focus:border-purple/50 focus:outline-none"
        >
          {IB_CHECK_BROKERS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void onCheck()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:border-purple/50 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Check IB
        </button>
      </div>

      {res?.error && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{res.error}</p>}

      {/* A raw UID that belongs to no member - checked against each broker. */}
      {res && res.member === null && res.results && (
        <div className="mt-3 rounded-lg border border-border bg-surface-soft p-3 text-xs">
          <div className="font-semibold text-foreground">UID {res.uid}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">{res.note}</p>
          <ul className="mt-2 space-y-1">
            {res.results.map((r) => (
              <li key={r.slug} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{r.broker}</span>
                <span
                  className={
                    r.outcome === "verified"
                      ? "font-semibold text-green-600 dark:text-green-400"
                      : r.outcome === "not_under_ib"
                        ? "font-semibold text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400"
                  }
                >
                  {OUTCOME[r.outcome]?.label ?? r.outcome}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {res?.member && o && (
        <div className="mt-3 space-y-2">
          <div className={`rounded-lg border p-3 ${o.tone}`}>
            <div className="flex items-center gap-2">
              <o.Icon className="h-4 w-4 shrink-0" />
              <span className="text-sm font-bold">{o.label}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed opacity-90">{o.blurb}</p>
          </div>

          {/* Exempt members still get the provider's honest answer above, which
              reads as a failure unless we say why it does not matter. */}
          {res.ibBypass && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-[11px] leading-relaxed text-green-700 dark:text-green-400">
              <strong>Exempt from the IB check.</strong> This account email is on the IB bypass
              allowlist, so the result above is informational only - onboarding Step 1 lets them
              through and the daily run never restricts them. Manage the list under IB Check Bypass
              on this page.
            </div>
          )}

          {/* The single most common cause of a false failure. */}
          {res.uidIsMtLogin && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              <strong>Wrong identifier on file.</strong> The stored UID ({res.uid}) is identical to this
              member's MT login, and those are different numbers. The check is looking up the wrong one, so
              it will keep failing regardless of what the broker does - a "NOT under our IB" result here is
              not reliable. Ask the member for their broker <em>client ID</em> and have them re-enter it.
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface-soft p-3 text-xs">
            <div className="font-semibold text-foreground break-all">
              {res.member.name ? `${res.member.name} · ` : ""}
              {res.member.email}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
              <Field label="Broker" value={res.broker} />
              <Field label="Stored UID" value={res.uid} mono />
              <Field label="MT login" value={res.mtLogin ?? "-"} mono />
              <Field label="Current status" value={res.member.ibStatus ?? "-"} />
              <Field label="Tier" value={res.member.tier != null ? String(res.member.tier) : "-"} />
              <Field label="TradingView" value={res.member.tradingview ?? "-"} />
              <Field label="Telegram" value={res.member.telegram ?? "-"} />
              <Field label="Grace ends" value={fmt(res.member.graceExpiresAt)} />
              <Field label="Last checked" value={fmt(res.member.lastCheckedAt)} />
            </div>
            {res.message && (
              <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">{res.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground/70">{label}</div>
      <div className={`text-foreground break-all ${mono ? "tabular-nums" : ""}`}>{value ?? "-"}</div>
    </div>
  );
}

function fmt(iso: string | null | undefined): string {
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
