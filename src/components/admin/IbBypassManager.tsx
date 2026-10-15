"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, LoaderCircle, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";
import {
  addIbBypassEmail,
  listIbBypassEmails,
  removeIbBypassEmail,
  type IbBypassEntry,
} from "@/services/action-stubs";

function dateLabel(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** Badge for the member's current IB state, when the address belongs to one. */
function MemberState({ member }: { member: IbBypassEntry["member"] }) {
  if (!member) {
    return (
      <span className="text-xs text-muted-foreground">
        No account yet — applies when they sign up
      </span>
    );
  }
  const status = member.ibStatus ?? "ok";
  const restricted = status !== "ok";
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="text-foreground">{member.name || "Member"}</span>
      <span
        className={
          "rounded px-1.5 py-0.5 font-semibold " +
          (restricted ? "bg-red-dim text-red" : "bg-green-dim text-green")
        }
      >
        {restricted ? `ib_status: ${status}` : "unrestricted"}
      </span>
    </span>
  );
}

/**
 * IB bypass allowlist — addresses here skip the broker IB check at onboarding
 * Step 1 and in the daily verification cron. Sits beside Free Access Management
 * on the Cron Jobs page, because the two answer adjacent questions and a grant
 * deliberately does NOT cover IB restrictions.
 */
export function IbBypassManager() {
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<IbBypassEntry[]>([]);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function refresh() {
    try {
      const { rows: next } = await listIbBypassEmails();
      setRows(next ?? []);
    } catch {
      /* keep what's on screen */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function add() {
    setErr(null);
    setSuccess(null);
    const clean = email.trim().toLowerCase();
    if (!clean) return setErr("Enter an email.");
    startTransition(() => {
      void (async () => {
        const r = await addIbBypassEmail({ email: clean, note: note.trim() });
        if (!r.ok) return setErr(r.error ?? "Failed to add the email.");
        setEmail("");
        setNote("");
        setSuccess(
          r.restored
            ? `${clean} added — their existing IB restriction was lifted and access restored.`
            : `${clean} added. They will skip the IB check from now on.`,
        );
        await refresh();
      })();
    });
  }

  function remove(target: string) {
    setErr(null);
    setSuccess(null);
    startTransition(() => {
      void (async () => {
        const r = await removeIbBypassEmail({ email: target });
        if (!r.ok) return setErr(r.error ?? "Failed to remove the email.");
        setSuccess(`${target} removed. They are checked again on the next daily run.`);
        await refresh();
      })();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5" /> Onboarding Verification Bypass
        </h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
          Accounts listed here clear every verification gate in onboarding: the TradeQuo 6-digit
          email code (no code is sent and the step never appears), the “is this broker UID under
          our IB?” check at Step 1, and the same check in the daily{" "}
          <code>ib-daily-verification</code> run — so they can never fall into grace or revoked.
          Use it for staff, reviewers and partners who were never meant to go under the IB. This is
          the account email they <strong>sign in with</strong>, not an address typed into the
          onboarding form. It can be added before that person signs up.
        </p>
        <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
          Two things are deliberately still enforced. <strong>Uniqueness</strong>: a broker UID or
          broker email already claimed by another member is still refused, because two members on
          one broker account makes balance and rank ambiguous for both — it only fires on a real
          collision, so it costs an exempt member nothing. And <strong>bans, rank gates and
          lifecycle blocks</strong> are untouched; for those, use Free Access Management above.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-purple" />
          <h3 className="text-sm uppercase tracking-wider font-bold">Add an email</h3>
        </div>

        {success && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-lg border border-green/30 bg-green-dim px-4 py-3 text-green"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 text-sm">{success}</p>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              aria-label="Dismiss"
              className="rounded p-0.5 text-green hover:bg-green/10"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Account email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="person@example.com"
              className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm outline-none focus:border-purple"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">
              Note (optional) — why they are exempt
            </span>
            <input
              type="text"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="e.g. support lead, partner review account"
              className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm outline-none focus:border-purple"
            />
          </label>
          <button
            type="button"
            onClick={add}
            disabled={pending}
            className="inline-flex items-center justify-center gap-1.5 h-[38px] px-5 rounded-md bg-purple text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60"
          >
            {pending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Add
          </button>
        </div>

        {err && (
          <p className="text-xs px-3 py-2 rounded-md border border-red/20 bg-red-dim text-red">{err}</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="text-sm uppercase tracking-wider font-bold mb-3">
          Allowlisted emails {rows.length > 0 && <span className="text-muted-foreground">({rows.length})</span>}
        </h3>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nobody is exempt. Every member goes through the IB check.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.email} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground break-all">{r.email}</div>
                  <div className="mt-0.5">
                    <MemberState member={r.member} />
                  </div>
                  {r.note && <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Added {dateLabel(r.createdAt)}
                    {r.createdByEmail ? ` by ${r.createdByEmail}` : ""} · Last used{" "}
                    {dateLabel(r.lastUsedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(r.email)}
                  disabled={pending}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-red/50 hover:text-red transition disabled:opacity-60"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
