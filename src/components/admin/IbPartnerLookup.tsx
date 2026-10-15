"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { lookupIbPartner, type IbLookupResult, type IbPartnerRow } from "@/lib/admin-crons";

/**
 * Admin tool: "is this person an IB partner, and why can't they see the
 * Client/IB switch?"
 *
 * Deliberately NOT the same question as "Is this member under our IB?" above.
 * That one asks the BROKER whether a member's trading account sits in our IB
 * network (member as client). This one reads `ib_partners` and answers whether
 * they ARE a partner with a portal (member as partner).
 *
 * Read-only. `switchVisible` comes from the same method the member's own
 * /api/ib/portal-access calls, so this can't disagree with what they see.
 */

function Row({ r, meId }: { r: IbPartnerRow; meId: string | null }) {
  const claimedByOther = !!r.userId && r.userId !== meId;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border py-2 first:border-t-0">
      <span className="font-semibold text-foreground">{r.brokerIbId ?? r.id.slice(0, 8)}</span>
      {r.name && <span className="text-muted-foreground">{r.name}</span>}
      <span className="text-muted-foreground">{r.broker ?? "-"}</span>
      <span
        className={
          r.status === "active"
            ? "text-green-600 dark:text-green-400"
            : "text-amber-600 dark:text-amber-400"
        }
      >
        {r.status ?? "no status"}
      </span>
      <span className="text-muted-foreground">{r.email ?? "-"}</span>
      <span className={claimedByOther ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}>
        {r.userId ? (claimedByOther ? `claimed by ${r.userId.slice(0, 8)}…` : "claimed by them") : "unclaimed"}
      </span>
      <span className="text-muted-foreground">
        {r.accessVerifiedAt ? "OTP done" : "OTP pending"}
      </span>
    </li>
  );
}

export function IbPartnerLookup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<IbLookupResult | null>(null);

  async function onCheck() {
    const value = email.trim();
    if (value.length < 3) {
      toast.error("Enter an email, profile id or broker IB id.");
      return;
    }
    setLoading(true);
    setRes(null);
    try {
      setRes(await lookupIbPartner(value));
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  // Dedupe: a claimed row comes back from both queries.
  const rows = res ? [...res.byEmail, ...res.byUserId.filter((u) => !res.byEmail.some((e) => e.id === u.id))] : [];

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="font-display font-bold text-sm">Is this member an IB partner?</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Reads their IB partner records and says whether the Client/IB switch should be showing, and
        why not if it isn't. Takes an email, a profile id or a broker IB id. When nothing matches it
        also looks for near-matching partner records, since a partner filed under a different email
        looks exactly like a stranger. Read-only - changes nothing. This is the IB PORTAL question;
        the check above is the different one of whether their trading account sits under our IB
        network.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) void onCheck();
          }}
          placeholder="email, profile id or broker IB id"
          className="flex-1 rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-purple/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void onCheck()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:border-purple/50 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          Check IB partner
        </button>
      </div>

      {res && (
        <div className="mt-3 space-y-2">
          <div
            className={`rounded-lg border p-3 ${
              res.switchVisible
                ? "border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400"
                : "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              {res.switchVisible ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              {res.switchVisible ? "Switch SHOWS for them" : "Switch is HIDDEN for them"}
              {res.portalVerified && <span className="text-[11px] font-normal">· portal data open</span>}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-foreground/80">{res.verdict}</p>
          </div>

          <div className="rounded-lg border border-border bg-surface-soft p-3 text-[11px]">
            <div className="text-muted-foreground">
              {res.profile ? (
                <>
                  Profile <span className="text-foreground">{res.profile.id}</span> · {res.profile.email ?? "-"}
                  {res.profile.brokerEmail && res.profile.brokerEmail !== res.profile.email && (
                    <> · broker email {res.profile.brokerEmail}</>
                  )}
                </>
              ) : (
                "No EZ Trade account with that email."
              )}
            </div>

            {res.similar.length > 0 && (
              <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                <div className="font-semibold text-amber-600 dark:text-amber-400">
                  Near matches - NOT linked to this member
                </div>
                <ul className="mt-1">
                  {res.similar.map((r) => (
                    <Row key={r.id} r={r} meId={res.profile?.id ?? null} />
                  ))}
                </ul>
              </div>
            )}

            {rows.length > 0 ? (
              <ul className="mt-2">
                {rows.map((r) => (
                  <Row key={r.id} r={r} meId={res.profile?.id ?? null} />
                ))}
              </ul>
            ) : (
              res.profile && <div className="mt-2 text-muted-foreground">No ib_partners rows.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default IbPartnerLookup;
