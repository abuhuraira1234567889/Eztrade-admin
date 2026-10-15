"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Gift } from "lucide-react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { getApi, postApi } from "@/services/api";

type Redemption = {
  id: string;
  user_id: string;
  reward_slug: string;
  reward_name: string;
  value_usd: number;
  xp_cost: number;
  status: "pending" | "approved" | "rejected" | "fulfilled" | "cancelled";
  member_note: string | null;
  admin_note: string | null;
  refunded_at: string | null;
  created_at: string;
  decided_at: string | null;
  user?: { email?: string; first_name?: string | null; last_name?: string | null; username?: string | null } | null;
};

const TABS = ["pending", "approved", "fulfilled", "rejected", "cancelled", "all"] as const;
type Tab = (typeof TABS)[number];

const STATUS_STYLE: Record<Redemption["status"], string> = {
  pending: "bg-amber-dim text-amber",
  approved: "bg-purple-dim text-purple",
  fulfilled: "bg-green/15 text-green",
  rejected: "bg-red/15 text-red",
  cancelled: "bg-surface-soft text-muted-foreground",
};

const money = (n: number) =>
  Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const xp = (n: number) => `${Number(n).toLocaleString("en-US")} XP`;
function when(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function memberName(r: Redemption) {
  const u = r.user;
  const full = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim();
  return full || u?.username || u?.email || r.user_id.slice(0, 8);
}

export default function AdminRedemptionsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [rows, setRows] = useState<Redemption[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, c] = await Promise.all([
        getApi<{ redemptions: Redemption[] }>("/api/admin/xp-redemptions", tab === "all" ? {} : { status: tab }),
        getApi<{ counts: Record<string, number> }>("/api/admin/xp-redemptions/counts"),
      ]);
      setRows(list.redemptions ?? []);
      setCounts(c.counts ?? {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load redemptions.");
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, status: Redemption["status"], adminNote?: string) {
    setBusyId(id);
    try {
      const res = await postApi<{ ok: boolean; refunded?: boolean; error?: string }>(
        `/api/admin/xp-redemptions/${id}/decision`,
        { status, note: adminNote },
      );
      if (res.ok) {
        toast.success(
          status === "rejected" || status === "cancelled"
            ? "Rejected - XP refunded to the member."
            : status === "approved"
              ? "Approved."
              : "Marked fulfilled.",
        );
        setRejectingId(null);
        setNote("");
        await load();
      } else {
        toast.error(res.error ?? "Action failed.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-purple/25 bg-purple-dim/40 text-purple">
          <Gift className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">XP Redemptions</h1>
          <p className="text-sm text-muted-foreground">Review reward requests. Rejecting or cancelling refunds the member's XP.</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition " +
              (tab === s ? "bg-purple text-white" : "border border-border bg-surface text-secondary-foreground hover:border-purple/50")
            }
          >
            {s}
            {s !== "all" && counts[s] ? <span className="ml-1.5 opacity-70">{counts[s]}</span> : null}
          </button>
        ))}
      </div>

      {loading ? (
        <PageSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          No {tab === "all" ? "" : tab} redemptions.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-foreground">{r.reward_name}</span>
                    <span className={"rounded-full px-2 py-0.5 text-[10px] font-medium capitalize " + STATUS_STYLE[r.status]}>
                      {r.status}
                    </span>
                    {r.refunded_at && <span className="text-[10px] text-muted-foreground">refunded</span>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {memberName(r)}
                    {r.user?.email ? ` · ${r.user.email}` : ""} · {xp(r.xp_cost)} · {money(r.value_usd)} · {when(r.created_at)}
                  </div>
                  {r.member_note && <div className="mt-1 text-xs text-secondary-foreground">“{r.member_note}”</div>}
                  {r.admin_note && <div className="mt-1 text-[11px] text-muted-foreground">Note: {r.admin_note}</div>}
                </div>

                <div className="flex flex-none flex-col items-end gap-2">
                  {(r.status === "pending" || r.status === "approved") && rejectingId !== r.id && (
                    <div className="flex items-center gap-2">
                      {r.status === "pending" && (
                        <button
                          onClick={() => decide(r.id, "approved")}
                          disabled={busyId === r.id}
                          className="rounded-lg bg-purple px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                        >
                          Approve
                        </button>
                      )}
                      {r.status === "approved" && (
                        <button
                          onClick={() => decide(r.id, "fulfilled")}
                          disabled={busyId === r.id}
                          className="rounded-lg bg-green px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                        >
                          Mark fulfilled
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setRejectingId(r.id);
                          setNote("");
                        }}
                        disabled={busyId === r.id}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:border-red/50 hover:text-red disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {rejectingId === r.id && (
                    <div className="w-64">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Reason (optional, shown to member)"
                        rows={2}
                        className="w-full rounded-lg border border-border bg-surface-soft px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-purple"
                      />
                      <div className="mt-1.5 flex justify-end gap-2">
                        <button
                          onClick={() => setRejectingId(null)}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => decide(r.id, "rejected", note.trim() || undefined)}
                          disabled={busyId === r.id}
                          className="rounded-lg bg-red px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                        >
                          Confirm reject · refund {xp(r.xp_cost)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
