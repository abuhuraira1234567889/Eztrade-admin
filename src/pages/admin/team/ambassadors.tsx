"use client";

import { useEffect, useState, useTransition } from "react";
import { UserPlus, Trash2, Star } from "lucide-react";
import {
  grantAmbassador,
  listAmbassadors,
  revokeAmbassador,
  type Ambassador,
} from "@/services/action-stubs";

/**
 * Ambassador access = the WHOLE platform unlocked for a member (every tier gate,
 * the broker requirement, and onboarding all bypassed). Granted/revoked by email
 * here; the backend sets profiles.is_ambassador. Self-contained: loads its own
 * list so it can drop into the Team page without touching its data loader.
 */
export function AmbassadorManager() {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const { ambassadors } = await listAmbassadors();
      setAmbassadors(ambassadors);
    } catch {
      /* leave the current list on a transient fetch error */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function add() {
    setErr(null);
    if (!email.trim()) return setErr("Enter an email");
    startTransition(() => {
      void grantAmbassador({ email: email.trim().toLowerCase() }).then((r) => {
        if (r.ok) {
          setEmail("");
          void refresh();
        } else setErr(r.error ?? null);
      });
    });
  }

  function revoke(userId: string) {
    startTransition(() => {
      void revokeAmbassador({ userId }).then((r) => {
        if (r.ok) void refresh();
        else setErr(r.error ?? null);
      });
    });
  }

  return (
    <div className="space-y-6">
      <div className="mb-1">
        <h2 className="text-lg font-display font-bold flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" /> Ambassador access
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Grants a member the <strong>entire platform</strong> - every rank-locked feature
          (AI Coach, Scanner, Journal, Academy, the Aurex Telegram group), with the broker
          and onboarding requirements bypassed. Independent of their rank.
        </p>
      </div>

      {/* Grant */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm uppercase tracking-wider font-bold">Grant ambassador access</h3>
        </div>
        <div className="grid sm:grid-cols-[1fr_auto] gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="user@example.com (must already have an account)"
            className="px-3 py-2 rounded-md border border-border bg-background text-sm outline-none focus:border-purple"
          />
          <button
            onClick={add}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-60"
          >
            <Star className="w-4 h-4" /> Grant access
          </button>
        </div>
        {err && <div className="text-xs text-red mt-2">{err}</div>}
      </div>

      {/* Current ambassadors */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="bg-surface-soft px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-bold">
          Ambassadors ({ambassadors.length})
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : ambassadors.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No ambassadors yet · grant the first one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {ambassadors.map((a) => (
                  <tr key={a.userId} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-display font-bold">{a.name ?? a.email ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">{a.email ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => revoke(a.userId)}
                        disabled={pending}
                        title="Revoke ambassador access"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
