"use client";

import { getApi } from "@/services/api";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Send, Flame, Zap, DollarSign, TrendingUp, LogIn, LogOut, Eye, Clock, Wallet,
  ShieldCheck, ShieldAlert, Landmark, Award, Users as UsersIcon, FileText, ListTree, UserCircle,
  LineChart, BarChart2, Ban, ShieldOff, X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import {
  ActivityLogSection,
  type ActivityAuditRow,
  type AuditActor,
} from "@/components/admin/ActivityLogSection";
import {
  LifecycleEventsSection,
  type LifecycleEventRow,
} from "@/components/admin/LifecycleEventsSection";
import { toast } from "sonner";
import { startViewAs, banUser, unbanUser } from "@/services/action-stubs";

const PLATFORM_URL = (
  (import.meta.env.VITE_PLATFORM_URL as string | undefined) ??
  "https://ezfe.blockmob.xyz"
).replace(/\/$/, "");

type TgEvent = {
  id: number;
  event: "joined" | "left" | "verified";
  status: string | null;
  at: string;
  reason?: string | null;
  source?: string | null;
  group_id?: string | null;
};
type XpEvent = { id: number; type: string; points: number; created_at: string };
type Alloc = { amount: number | null; kind: "in" | "out"; created_at_pu: string; account: number | null };
type Snapshot = { tradesync_account_id: string; balance: number | null; equity: number | null; snapshotted_at: string };
type Trade = {
  id: string; symbol: string; side: string;
  profit: number | null; swap: number | null; commission: number | null;
  closed_at: string | null; opened_at: string;
};
type Role = { role: string; granted_at: string | null };
type Compliance = {
  state: string; reason: string | null; funded_at?: string | null;
  grace_started_at: string | null; suspended_at: string | null; last_checked_at: string | null; updated_at: string | null;
} | null;
type Account = {
  id: string; login: number | null; server: string | null; platform: string | null;
  currency: string | null; status: string | null; last_sync_at: string | null; created_at: string | null;
};
type BrokerSub = {
  id: string; pu_account_number: string | null; mt_login: string | null; mt_server: string | null;
  mt_platform: string | null; verification_status: string | null; submitted_at: string | null; verified_at: string | null;
};
type BadgeRow = { awarded_at: string; badge: { name: string | null; slug: string | null; category: string | null; icon_url: string | null } | null };
type Referral = { id: string; referee_id: string; qualified: boolean; signed_up_at: string; qualified_at: string | null };
type AuditRow = ActivityAuditRow;

// Human-readable labels for the reason codes recorded when the platform kicks a
// member from a Telegram group (see backend lib/telegram/group-access RemovalReason).
// signal_groups.id → display name. Mirrors GROUP_LABEL on the Telegram feed page.
const TG_GROUP_LABEL: Record<string, string> = {
  eztrade: "EZ Trade",
  silver: "Aurex",
  cypher: "Cypher Trading",
};

const TG_REMOVAL_REASON: Record<string, string> = {
  suspended: "Account suspended (compliance lock)",
  rank_below_tier: "Rank dropped below group tier",
  ib_ownership_lost: "Broker account left EZ Trade's IB",
  unlinked: "Telegram manually disconnected",
  banned: "Account banned by admin",
  broker_disconnected: "Broker account disconnected",
  compliance_blocked: "Compliance blocked platform access",
};

// Labels for the reason stored on a tradingview_revoked audit entry.
const TV_REVOKE_REASON: Record<string, string> = {
  suspended: "Account suspended",
  ineligible: "No longer eligible (rank / onboarding)",
  banned: "Account banned by admin",
};

/** Display-only IB gate labels - mirrors backend `isIbRestricted` vocabulary. */
const IB_STATUS_LABEL: Record<string, string> = {
  grace: "IB grace",
  flagged: "IB grace",
  revoked: "IB revoked",
};

function isIbRestrictedStatus(status: string | null | undefined): boolean {
  return status === "grace" || status === "flagged" || status === "revoked";
}
type Stats = { total_lots: number | null; avg_rr: number | null; win_rate: number | null; closed_trades: number | null } | null;

/** TradeQuo feed view (GET /api/admin/data/users/:id/tradequo). `member` = ranked from the feed; otherwise a pre-migration preview by broker email. */
type TradequoView = {
  member: boolean;
  email?: string | null;
  pending?: boolean;
  clientIds?: string[];
  totalBalanceUsd?: number;
  activeCount?: number;
  syncedAt?: string | null;
  accounts: Array<{
    accountNumber: string;
    platform: string | null;
    accountType: string | null;
    currency: string | null;
    balanceLocal: number;
    balanceUsd: number;
    leverage: number | null;
    status: string | null;
    openedOn: string | null;
    syncedAt: string | null;
  }>;
};

type Profile = Record<string, any> | null;

type ActivityData = {
  profile: Profile;
  referredByName: string | null;
  roles: Role[];
  compliance: Compliance;
  accounts: Account[];
  brokerSubs: BrokerSub[];
  badges: BadgeRow[];
  referrals: Referral[];
  tgEvents: TgEvent[];
  tvAudit: AuditRow[];
  auditLog: AuditRow[];
  auditActors: Record<string, AuditActor>;
  lifecycleEvents: LifecycleEventRow[];
  stats: Stats;
  xp: XpEvent[];
  allocs: Alloc[];
  trades: Trade[];
  balance: number;
  equity: number;
  balanceAt: string | null;
  hasBalance: boolean;
  /** Null when the member has nothing to do with TradeQuo. */
  tradequo: TradequoView | null;
};

// Profile columns that hold secrets / churny internals - hidden from the raw dump.
const HIDDEN_FIELDS = new Set(["id", "telegram_link_code", "telegram_link_code_expires_at", "profile_field_visibility"]);

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function humanize(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function looksLikeTimestamp(key: string, v: unknown) {
  return typeof v === "string" && (/_(at|date)$/.test(key) || /^\d{4}-\d{2}-\d{2}T/.test(v));
}

function fmtValue(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (looksLikeTimestamp(key, v)) {
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? String(v) : (/_date$/.test(key) ? d.toLocaleDateString() : fmtDateTime(v as string));
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function Section({ icon, title, children, count }: { icon: React.ReactNode; title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm uppercase tracking-wider text-foreground font-bold flex items-center gap-2 mb-3">
        <span className="text-purple">{icon}</span> {title}
        {typeof count === "number" && (
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums normal-case tracking-normal">{count}</span>
        )}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</div>
      <div className="text-sm text-foreground break-words">{value}</div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams() as Record<string, string>;
  const userId = params.id;
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsBusy, setViewAsBusy] = useState(false);
  const [banBusy, setBanBusy] = useState(false);
  const [banModal, setBanModal] = useState<"ban" | "unban" | null>(null);
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      // Several tables/columns aren't in the generated admin types; cast to any.
      const sb = createClient() as any;

      const [
        profileRes, rolesRes, complRes, acctRes, brokerRes, badgeRes, refRes,
        tgRes, xpRes, tradesRes, snapRes, auditRes, lifeRes, statsRes,
      ] = await Promise.all([
        sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
        sb.from("app_roles").select("role, granted_at").eq("user_id", userId),
        sb.from("compliance_status").select("*").eq("user_id", userId).maybeSingle(),
        sb.from("tradesync_accounts")
          .select("id, login, server, platform, currency, status, last_sync_at, created_at")
          .eq("user_id", userId).order("created_at", { ascending: false }),
        sb.from("broker_submissions")
          .select("id, pu_account_number, mt_login, mt_server, mt_platform, verification_status, submitted_at, verified_at")
          .eq("user_id", userId).order("submitted_at", { ascending: false }),
        sb.from("user_badges")
          .select("awarded_at, badge:badges(name, slug, category, icon_url)")
          .eq("user_id", userId).order("awarded_at", { ascending: false }),
        sb.from("referrals")
          .select("id, referee_id, qualified, signed_up_at, qualified_at")
          .eq("referrer_id", userId).order("signed_up_at", { ascending: false }).limit(100),
        sb.from("telegram_membership_events")
          .select("id, event, status, at, reason, source, group_id")
          .eq("user_id", userId).order("at", { ascending: false }).limit(50),
        sb.from("xp_events")
          .select("id, type, points, created_at")
          .eq("user_id", userId).order("created_at", { ascending: false }).limit(25),
        sb.from("trades")
          .select("id, symbol, side, profit, swap, commission, closed_at, opened_at")
          .eq("user_id", userId).not("closed_at", "is", null)
          .order("closed_at", { ascending: false }).limit(25),
        sb.from("account_snapshots")
          .select("tradesync_account_id, balance, equity, snapshotted_at")
          .eq("user_id", userId).order("snapshotted_at", { ascending: false }).limit(60),
        sb.from("audit_log")
          .select("id, action, created_at, target_table, before, after, actor_id")
          .eq("target_id", userId).order("created_at", { ascending: false }).limit(150),
        sb.from("lifecycle_events")
          .select("id, event, from_state, to_state, from_rank, to_rank, trigger, reason, snapshot, created_at")
          .eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        sb.from("v_user_search")
          .select("total_lots, avg_rr, win_rate, closed_trades")
          .eq("id", userId).maybeSingle(),
      ]);

      // TradeQuo feed accounts (service-role data, so it comes via the API, not
      // a direct table read). Best-effort: the page must render without it.
      const tradequo = await getApi<TradequoView>(`/api/admin/data/users/${userId}/tradequo`)
        .then((v) => (v && (v.member || (v.accounts?.length ?? 0) > 0) ? v : null))
        .catch(() => null);

      const profile = (profileRes.data as Profile) ?? null;

      // Resolve who referred this user (by name) for a friendlier display.
      let referredByName: string | null = null;
      if (profile?.referred_by_user_id) {
        const { data: ref } = await sb.from("profiles")
          .select("first_name, last_name, email")
          .eq("id", profile.referred_by_user_id).maybeSingle();
        if (ref) referredByName = [ref.first_name, ref.last_name].filter(Boolean).join(" ") || ref.email || null;
      }

      // Current balance = latest snapshot per TradeSync account, summed.
      const snaps = (snapRes.data ?? []) as Snapshot[];
      const latestByAccount = new Map<string, Snapshot>();
      for (const s of snaps) {
        if (!latestByAccount.has(s.tradesync_account_id)) latestByAccount.set(s.tradesync_account_id, s);
      }
      let balance = 0, equity = 0;
      for (const s of latestByAccount.values()) {
        balance += Number(s.balance ?? 0);
        equity += Number(s.equity ?? 0);
      }
      const balanceAt = snaps[0]?.snapshotted_at ?? null;

      // Deposits / withdrawals keyed by broker login → ib_allocations.account.
      const logins = ((acctRes.data ?? []) as { login: number | null }[])
        .map((a) => a.login).filter((l): l is number => l != null);
      let allocs: Alloc[] = [];
      if (logins.length > 0) {
        const { data: aData } = await sb.from("ib_allocations")
          .select("amount, kind, created_at_pu, account")
          .in("account", logins)
          .order("created_at_pu", { ascending: false })
          .limit(100);
        allocs = (aData ?? []) as Alloc[];
      }

      const auditRows = (auditRes.data ?? []) as AuditRow[];
      const lifecycleEvents = (lifeRes.data ?? []) as LifecycleEventRow[];

      const actorIds = [
        ...new Set(
          auditRows
            .map((r) => r.actor_id)
            .filter((id): id is string => !!id),
        ),
      ];
      const auditActors: Record<string, AuditActor> = {};
      if (actorIds.length > 0) {
        const { data: actorRows } = await sb
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", actorIds);
        for (const row of (actorRows ?? []) as {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        }[]) {
          const name =
            [row.first_name, row.last_name].filter(Boolean).join(" ") ||
            row.email ||
            row.id.slice(0, 8);
          auditActors[row.id] = { name, email: row.email };
        }
      }

      if (!cancelled) {
        setData({
          profile,
          referredByName,
          roles: (rolesRes.data ?? []) as Role[],
          compliance: (complRes.data as Compliance) ?? null,
          accounts: (acctRes.data ?? []) as Account[],
          brokerSubs: (brokerRes.data ?? []) as BrokerSub[],
          badges: (badgeRes.data ?? []) as BadgeRow[],
          referrals: (refRes.data ?? []) as Referral[],
          tgEvents: (tgRes.data ?? []) as TgEvent[],
          tvAudit: auditRows.filter((a) => a.action?.startsWith("tradingview")),
          auditLog: auditRows,
          auditActors,
          lifecycleEvents,
          stats: (statsRes.data as Stats) ?? null,
          xp: (xpRes.data ?? []) as XpEvent[],
          allocs,
          trades: (tradesRes.data ?? []) as Trade[],
          balance, equity, balanceAt,
          hasBalance: latestByAccount.size > 0,
          tradequo,
        });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  async function handleViewAs() {
    setViewAsBusy(true);
    const res = await startViewAs(userId);
    setViewAsBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    window.open(`${PLATFORM_URL}/dashboard#__imp=${encodeURIComponent(res.token)}`, "_blank", "noopener,noreferrer");
    toast.success(`Opening read-only view as ${res.user.name ?? res.user.email ?? "user"}`);
  }

  function openBanModal() {
    if (!data?.profile) return;
    setBanReason("");
    setBanModal(data.profile.is_banned ? "unban" : "ban");
  }

  function closeBanModal() {
    if (banBusy) return;
    setBanModal(null);
    setBanReason("");
  }

  async function confirmBanAction() {
    if (!userId || !banModal) return;
    setBanBusy(true);
    if (banModal === "unban") {
      const res = await unbanUser(userId);
      setBanBusy(false);
      if (!res.ok) { toast.error(res.error); return; }
      toast.success("User unbanned");
      setData((prev) =>
        prev
          ? {
              ...prev,
              profile: {
                ...prev.profile,
                is_banned: false,
                banned_at: null,
                banned_by: null,
                ban_reason: null,
              },
            }
          : prev,
      );
      setBanModal(null);
      setBanReason("");
      return;
    }
    const reason = banReason.trim();
    const res = await banUser(userId, reason || undefined);
    setBanBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("User banned");
    setData((prev) =>
      prev
        ? {
            ...prev,
            profile: {
              ...prev.profile,
              is_banned: true,
              banned_at: new Date().toISOString(),
              ban_reason: reason || null,
            },
          }
        : prev,
    );
    setBanModal(null);
    setBanReason("");
  }

  if (loading) return <PageSkeleton />;

  const p = data?.profile ?? {};
  const displayName = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.display_name || p.email || "User";
  const tgStatus = p.telegram_group_status ?? "none";
  const ibStatus = typeof p.ib_status === "string" ? p.ib_status : null;
  const ibRestricted = isIbRestrictedStatus(ibStatus);
  const ibRevoked = ibStatus === "revoked";
  const totalIn = (data?.allocs ?? []).filter((a) => a.kind === "in").reduce((s, a) => s + Number(a.amount ?? 0), 0);
  const totalOut = (data?.allocs ?? []).filter((a) => a.kind === "out").reduce((s, a) => s + Number(a.amount ?? 0), 0);
  const qualifiedRefs = (data?.referrals ?? []).filter((r) => r.qualified).length;
  // Only show columns that actually hold a value - skip hidden + null/empty ones.
  const profileEntries = Object.entries(p).filter(
    ([k, v]) => !HIDDEN_FIELDS.has(k) && v !== null && v !== undefined && v !== "",
  );

  return (
    <>
    <div className="max-w-5xl mx-auto">
      <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          {p.avatar_url
            ? <img src={p.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border border-border flex-shrink-0" />
            : <div className="w-12 h-12 rounded-full bg-surface-soft border border-border flex items-center justify-center flex-shrink-0"><UserCircle className="w-7 h-7 text-muted-foreground" /></div>}
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-bold truncate">{displayName}</h1>
            <div className="text-sm text-muted-foreground truncate">{p.email ?? "-"}{p.username ? ` · @${p.username}` : ""}</div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border ${p.status === "active" ? "bg-green-dim text-green border-green/30" : "bg-surface-soft border-border text-muted-foreground"}`}>{p.status ?? "-"}</span>
              {p.is_banned && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border bg-red/10 text-red border-red/30">banned</span>}
              {ibRestricted && ibStatus && (
                <span
                  title="Separate from Active/Tier - platform access gated by IB ownership"
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border ${
                    ibRevoked
                      ? "bg-red/10 text-red border-red/30"
                      : "bg-amber-dim text-amber border-amber/30"
                  }`}
                >
                  {IB_STATUS_LABEL[ibStatus] ?? `IB ${ibStatus}`}
                </span>
              )}
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border bg-surface-soft border-border text-muted-foreground">tier {p.tier ?? 0}</span>
              {p.is_ambassador && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border bg-purple-dim text-purple border-purple/30">ambassador</span>}
              {p.country && <span className="text-[11px] text-muted-foreground">{p.country}</span>}
              {p.created_at && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> joined {new Date(p.created_at).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openBanModal}
            disabled={banBusy}
            title={p.is_banned ? "Lift the ban" : "Ban this user"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50 transition whitespace-nowrap ${
              p.is_banned
                ? "border-green/40 text-green hover:bg-green/10"
                : "border-red/40 text-red hover:bg-red/10"
            }`}
          >
            {p.is_banned
              ? <><ShieldOff className="w-4 h-4" /> Unban</>
              : <><Ban className="w-4 h-4" /> Ban</>}
          </button>
          <button
            onClick={handleViewAs}
            disabled={viewAsBusy}
            title="Open this user's app, read-only"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-purple/40 text-purple hover:bg-purple/10 disabled:opacity-50 transition whitespace-nowrap"
          >
            <Eye className="w-4 h-4" /> {viewAsBusy ? "Opening…" : "View as"}
          </button>
        </div>
      </div>

      {p.is_banned && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/5 p-3 text-sm">
          <div className="font-semibold text-red">This user is banned</div>
          <div className="text-xs text-muted-foreground mt-1">
            {p.ban_reason ? `Reason: ${p.ban_reason}` : "No reason recorded."}
            {p.banned_at ? ` · since ${fmtDateTime(p.banned_at)}` : ""}
          </div>
        </div>
      )}

      {ibRestricted && (
        <div
          className={`mb-4 rounded-xl border p-3 text-sm ${
            ibRevoked
              ? "border-red/30 bg-red/5"
              : "border-amber/30 bg-amber-dim/40"
          }`}
        >
          <div className={`font-semibold flex items-center gap-1.5 ${ibRevoked ? "text-red" : "text-amber"}`}>
            <ShieldAlert className="w-4 h-4" />
            {ibRevoked
              ? "IB verification removed - platform access restricted"
              : "IB verification failed - inside grace window"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Active / Tier are unchanged; access is gated by <code className="text-[11px]">ib_status</code>
            {p.onboarding_broker_uid ? ` · UID ${p.onboarding_broker_uid}` : ""}
            {ibRevoked
              ? p.ib_revoked_at
                ? ` · revoked ${fmtDateTime(p.ib_revoked_at)}`
                : ""
              : p.ib_grace_expires_at
                ? ` · grace ends ${fmtDateTime(p.ib_grace_expires_at)}`
                : ""}
            {p.ib_last_failure_reason ? ` · ${p.ib_last_failure_reason}` : ""}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-surface-soft p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1"><Wallet className="w-3.5 h-3.5" /> Balance</div>
            {/* Feed-verified TradeQuo members are ranked on their cumulative TradeQuo
                balance (active accounts), not on an MT5 snapshot. */}
            {data?.tradequo?.member ? (
              <>
                <div className="text-lg font-display font-bold tabular-nums">${(data.tradequo.totalBalanceUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <div className="text-[10px] text-muted-foreground font-medium">TradeQuo · {data.tradequo.activeCount ?? 0} active account{(data.tradequo.activeCount ?? 0) === 1 ? "" : "s"}{data.tradequo.pending ? " · awaiting first sync" : ""}</div>
              </>
            ) : (
              <>
                <div className="text-lg font-display font-bold tabular-nums">{data?.hasBalance ? `$${(data?.balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}</div>
                {data?.hasBalance && <div className="text-[10px] text-muted-foreground font-medium">eq ${(data?.equity ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
              </>
            )}
          </div>
          <div className="rounded-xl border border-border bg-surface-soft p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1"><Zap className="w-3.5 h-3.5" /> XP</div>
            <div className="text-lg font-display font-bold tabular-nums">{(p.xp_total ?? 0).toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface-soft p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1"><Flame className="w-3.5 h-3.5" /> Streak</div>
            <div className="text-lg font-display font-bold tabular-nums">{p.current_streak ?? 0}<span className="text-xs text-muted-foreground font-medium"> / {p.longest_streak ?? 0} best</span></div>
          </div>
          <div className="rounded-xl border border-border bg-surface-soft p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1"><TrendingUp className="w-3.5 h-3.5" /> Net flow</div>
            <div className="text-lg font-display font-bold tabular-nums">${(totalIn - totalOut).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        <div className="columns-1 lg:columns-2 [column-gap:1rem] [&>*]:mb-4 [&>*]:break-inside-avoid">
          {/* Roles + access */}
          <Section icon={<ShieldCheck className="w-4 h-4" />} title="Roles & access" count={data?.roles.length}>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {data && data.roles.length > 0
                ? data.roles.map((r) => <span key={r.role} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-dim text-purple border border-purple/30 font-semibold">{r.role}</span>)
                : <span className="text-xs text-muted-foreground">No staff roles (member).</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Field label="Onboarding done" value={fmtValue("completed_onboarding", p.completed_onboarding)} />
              <Field label="Public profile" value={fmtValue("is_public_profile", p.is_public_profile)} />
              <Field label="Banned" value={fmtValue("is_banned", p.is_banned)} />
              <Field label="Marketing opt-in" value={fmtValue("marketing_opt_in", p.marketing_opt_in)} />
              <Field label="Last login" value={fmtValue("last_login_at", p.last_login_at)} />
              {p.is_banned && p.ban_reason && (
                <div className="col-span-2"><Field label="Ban reason" value={p.ban_reason} /></div>
              )}
            </div>
          </Section>

          {/* Compliance */}
          <Section icon={<ShieldCheck className="w-4 h-4" />} title="Compliance">
            {data?.compliance ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Field label="State" value={<span className="font-semibold capitalize">{data.compliance.state}</span>} />
                <Field label="Last checked" value={fmtValue("last_checked_at", data.compliance.last_checked_at)} />
                <Field label="Funded at" value={fmtValue("funded_at", data.compliance.funded_at)} />
                <Field label="Grace started" value={fmtValue("grace_started_at", data.compliance.grace_started_at)} />
                <Field label="Suspended at" value={fmtValue("suspended_at", data.compliance.suspended_at)} />
                <Field label="Updated" value={fmtValue("updated_at", data.compliance.updated_at)} />
                {data.compliance.reason && <div className="col-span-2"><Field label="Reason" value={data.compliance.reason} /></div>}
              </div>
            ) : <p className="text-xs text-muted-foreground">No compliance record.</p>}
          </Section>

          {/* Telegram timeline */}
          <Section icon={<Send className="w-4 h-4" />} title="Telegram" count={data?.tgEvents.length}>
            <div className="flex items-center gap-2 flex-wrap mb-3 text-xs">
              <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border ${
                tgStatus === "member" ? "bg-green-dim text-green border-green/30"
                : tgStatus === "removed" ? "bg-red/10 text-red border-red/30"
                : "bg-surface-soft text-muted-foreground border-border"
              }`}>{tgStatus === "member" ? "In group" : tgStatus === "removed" ? "Removed" : "Not in group"}</span>
              {p.telegram_username ? <span className="text-muted-foreground">@{p.telegram_username}</span> : <span className="text-muted-foreground">Not linked</span>}
            </div>
            {data && data.tgEvents.length > 0 ? (
              <ol className="space-y-2">
                {data.tgEvents.map((e) => {
                  const left = e.event === "left";
                  const verified = e.event === "verified";
                  // Group ids are branded for display (backend lib/telegram/groups):
                  // 'silver' → Aurex, 'cypher' → Cypher Trading.
                  const groupName = TG_GROUP_LABEL[e.group_id ?? ""] ?? e.group_id;
                  // Prefer the platform-recorded reason; fall back to the raw Telegram
                  // status so an external kick / voluntary leave still reads clearly.
                  const reasonLabel = e.reason ? (TG_REMOVAL_REASON[e.reason] ?? e.reason) : null;
                  const label = verified ? "Verified account" : e.event === "joined" ? "Joined group" : "Left group";
                  const sub = verified
                    ? "Telegram account linked"
                    : left
                      ? reasonLabel
                        ?? (e.status === "kicked" ? "Removed from group" : "Left voluntarily")
                      : groupName
                        ? groupName
                        : e.status && e.status !== "member"
                          ? e.status
                          : null;
                  return (
                    <li key={e.id} className="flex items-start gap-2.5 text-sm">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${verified ? "bg-purple-dim text-purple" : e.event === "joined" ? "bg-green-dim text-green" : "bg-red/10 text-red"}`}>
                        {verified ? <ShieldCheck className="w-3.5 h-3.5" /> : e.event === "joined" ? <LogIn className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold">{label}</span>
                        {sub && <div className={`text-[11px] ${left && reasonLabel ? "text-red/90" : "text-muted-foreground"}`}>{sub}</div>}
                      </div>
                      <span className="ml-auto flex-shrink-0 text-xs text-muted-foreground tabular-nums">{fmtDateTime(e.at)}</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">
                {tgStatus === "member" && p.telegram_group_joined_at
                  ? `Currently in the group (joined ${fmtDateTime(p.telegram_group_joined_at)}). Detailed join/leave history is recorded from now on.`
                  : "No Telegram join/leave events recorded yet."}
              </p>
            )}
          </Section>

          {/* TradingView timeline (granted/revoked/set from audit_log) */}
          <Section icon={<LineChart className="w-4 h-4" />} title="TradingView" count={data?.tvAudit.length}>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <Field label="Username" value={p.tradingview_username ? `@${p.tradingview_username}` : "-"} />
              <Field label="Granted on script" value={p.tv_granted_username ? `@${p.tv_granted_username}` : "-"} />
            </div>
            {data && data.tvAudit.length > 0 ? (
              <ol className="space-y-2 max-h-56 overflow-y-auto">
                {data.tvAudit.map((a) => {
                  const granted = a.action === "tradingview_granted";
                  const revoked = a.action === "tradingview_revoked";
                  const label = granted ? "Access granted" : revoked ? "Access revoked" : "Username set";
                  const after = (a.after ?? {}) as Record<string, unknown>;
                  const before = (a.before ?? {}) as Record<string, unknown>;
                  const handle = (after.username ?? before.username) as string | undefined;
                  const reasonCode = revoked ? (after.reason as string | undefined) : null;
                  const reasonLabel = reasonCode ? (TV_REVOKE_REASON[reasonCode] ?? reasonCode) : null;
                  return (
                    <li key={a.id} className="flex items-start gap-2.5 text-sm">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${granted ? "bg-green-dim text-green" : revoked ? "bg-red/10 text-red" : "bg-surface-soft text-muted-foreground"}`}>
                        {granted ? <LogIn className="w-3.5 h-3.5" /> : revoked ? <LogOut className="w-3.5 h-3.5" /> : <LineChart className="w-3.5 h-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold">{label}</span>
                        {handle && <span className="ml-2 text-[11px] text-muted-foreground">@{handle}</span>}
                        {reasonLabel && <div className="text-[11px] text-red/90">{reasonLabel}</div>}
                      </div>
                      <span className="ml-auto flex-shrink-0 text-xs text-muted-foreground tabular-nums">{fmtDateTime(a.created_at)}</span>
                    </li>
                  );
                })}
              </ol>
            ) : <p className="text-xs text-muted-foreground">No TradingView access changes recorded.</p>}
          </Section>

          {/* Trading performance */}
          <Section icon={<BarChart2 className="w-4 h-4" />} title="Trading performance">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Field label="Total lots" value={data?.stats?.total_lots != null ? Number(data.stats.total_lots).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"} />
              <Field label="Avg RR" value={data?.stats?.avg_rr != null ? `${Number(data.stats.avg_rr).toFixed(2)} : 1` : "-"} />
              <Field label="Win rate" value={data?.stats?.win_rate != null ? `${Number(data.stats.win_rate).toFixed(1)}%` : "-"} />
              <Field label="Closed trades" value={(data?.stats?.closed_trades ?? 0).toString()} />
              <Field label="Lifetime deposits" value={p.broker_deposits_usd != null ? `$${Number(p.broker_deposits_usd).toLocaleString()}` : "-"} />
              <Field label="Lifetime withdrawals" value={p.broker_withdrawals_usd != null ? `$${Number(p.broker_withdrawals_usd).toLocaleString()}` : "-"} />
            </div>
          </Section>

          {/* Financials */}
          <Section icon={<DollarSign className="w-4 h-4" />} title="Deposits & withdrawals" count={data?.allocs.length}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-lg border border-border bg-surface-soft p-2.5">
                <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Deposited</div>
                <div className="text-base font-bold text-green tabular-nums">+${totalIn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
              <div className="rounded-lg border border-border bg-surface-soft p-2.5">
                <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Withdrawn</div>
                <div className="text-base font-bold text-red tabular-nums">-${totalOut.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              </div>
            </div>
            {data && data.allocs.length > 0 ? (
              <ol className="space-y-1.5 max-h-64 overflow-y-auto">
                {data.allocs.map((a, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(a.created_at_pu).toLocaleDateString()} · #{a.account}</span>
                    <span className={`font-bold tabular-nums ${a.kind === "in" ? "text-green" : "text-red"}`}>{a.kind === "in" ? "+" : "-"}${Number(a.amount ?? 0).toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-xs text-muted-foreground">No broker allocations linked to this user.</p>}
          </Section>

          {/* TradeQuo feed accounts (verified members: the source of their rank;
              unmigrated legacy members: a preview of what the migration will find) */}
          {data?.tradequo && (
            <Section icon={<Landmark className="w-4 h-4" />} title="TradeQuo accounts" count={data.tradequo.accounts.length}>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div><div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Qualifying balance</div><div className="font-semibold tabular-nums">${(data.tradequo.totalBalanceUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Source</div><div className="font-semibold">{data.tradequo.member ? "Feed-verified (ranks on this)" : "Preview by broker email (not migrated)"}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">TradeQuo email</div><div className="font-mono text-xs break-all">{data.tradequo.email ?? "-"}</div></div>
                <div><div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Client IDs · synced</div><div className="text-xs">{(data.tradequo.clientIds ?? []).join(", ") || "-"} · {data.tradequo.syncedAt ? fmtDateTime(data.tradequo.syncedAt) : "-"}</div></div>
              </div>
              {data.tradequo.accounts.length > 0 ? (
                <ul className="space-y-2">
                  {data.tradequo.accounts.map((a) => (
                    <li key={a.accountNumber} className={`text-sm border border-border rounded-lg p-2.5 bg-surface-soft ${a.status === "archived" ? "opacity-60" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold tabular-nums">#{a.accountNumber}</span>
                        <span className="font-semibold tabular-nums">${a.balanceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}{a.currency && a.currency !== "USD" ? <span className="text-[10px] text-muted-foreground font-medium"> · {a.balanceLocal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {a.currency}</span> : null}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{[a.platform?.toUpperCase(), a.accountType, a.leverage ? `1:${a.leverage}` : null, a.openedOn ? `opened ${a.openedOn}` : null].filter(Boolean).join(" · ") || "-"}</span>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border ${a.status === "archived" ? "bg-surface-soft border-border text-muted-foreground" : "bg-green-dim text-green border-green/30"}`}>{a.status ?? "active"}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-muted-foreground">{data.tradequo.pending ? "Verified - awaiting the feed's first sync of this email." : "No TradeQuo accounts found for this email."}</p>}
            </Section>
          )}

          {/* Broker accounts */}
          <Section icon={<Landmark className="w-4 h-4" />} title="Broker accounts" count={data?.accounts.length}>
            {data && data.accounts.length > 0 ? (
              <ul className="space-y-2">
                {data.accounts.map((a) => (
                  <li key={a.id} className="text-sm border border-border rounded-lg p-2.5 bg-surface-soft">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold tabular-nums">#{a.login ?? "-"}</span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border ${a.status === "connected" ? "bg-green-dim text-green border-green/30" : "bg-surface-soft border-border text-muted-foreground"}`}>{a.status ?? "-"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{[a.platform, a.server, a.currency].filter(Boolean).join(" · ") || "-"}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">last sync {fmtValue("last_sync_at", a.last_sync_at)}</div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-muted-foreground">No connected broker accounts.</p>}
          </Section>

          {/* Broker submissions */}
          <Section icon={<FileText className="w-4 h-4" />} title="Broker submissions" count={data?.brokerSubs.length}>
            {data && data.brokerSubs.length > 0 ? (
              <ul className="space-y-2">
                {data.brokerSubs.map((b) => (
                  <li key={b.id} className="text-sm border border-border rounded-lg p-2.5 bg-surface-soft">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">PU {b.pu_account_number ?? "-"} · MT {b.mt_login ?? "-"}</span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border ${b.verification_status === "verified" ? "bg-green-dim text-green border-green/30" : b.verification_status === "rejected" ? "bg-red/10 text-red border-red/30" : "bg-surface-soft border-border text-muted-foreground"}`}>{b.verification_status ?? "-"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{[b.mt_platform, b.mt_server].filter(Boolean).join(" · ") || "-"}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">submitted {fmtValue("submitted_at", b.submitted_at)}</div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-muted-foreground">No broker submissions.</p>}
          </Section>

          {/* Recent trades */}
          <Section icon={<TrendingUp className="w-4 h-4" />} title="Recent closed trades" count={data?.trades.length}>
            {data && data.trades.length > 0 ? (
              <ol className="space-y-1.5 max-h-64 overflow-y-auto">
                {data.trades.map((t) => {
                  const pnl = Number(t.profit ?? 0) + Number(t.swap ?? 0) + Number(t.commission ?? 0);
                  return (
                    <li key={t.id} className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{t.symbol} <span className="text-[11px] text-muted-foreground uppercase">{t.side}</span></span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground tabular-nums">{t.closed_at ? new Date(t.closed_at).toLocaleDateString() : "-"}</span>
                        <span className={`font-bold tabular-nums ${pnl >= 0 ? "text-green" : "text-red"}`}>{pnl >= 0 ? "+" : ""}${pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : <p className="text-xs text-muted-foreground">No closed trades.</p>}
          </Section>

          {/* XP events */}
          <Section icon={<Zap className="w-4 h-4" />} title="Recent XP events" count={data?.xp.length}>
            {data && data.xp.length > 0 ? (
              <ol className="space-y-1.5 max-h-64 overflow-y-auto">
                {data.xp.map((x) => (
                  <li key={x.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{x.type.replace(/_/g, " ")}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground tabular-nums">{new Date(x.created_at).toLocaleDateString()}</span>
                      <span className={`font-bold tabular-nums ${x.points >= 0 ? "text-green" : "text-red"}`}>{x.points >= 0 ? "+" : ""}{x.points}</span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : <p className="text-xs text-muted-foreground">No XP events.</p>}
          </Section>

          {/* Badges */}
          <Section icon={<Award className="w-4 h-4" />} title="Badges" count={data?.badges.length}>
            {data && data.badges.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {data.badges.map((b, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-surface-soft border border-border" title={`${b.badge?.category ?? ""} · ${fmtDateTime(b.awarded_at)}`}>
                    {b.badge?.icon_url && <img src={b.badge.icon_url} alt="" className="w-4 h-4 rounded-full" />}
                    <span className="font-semibold">{b.badge?.name ?? b.badge?.slug ?? "Badge"}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-muted-foreground">No badges earned.</p>}
          </Section>

          {/* Referrals */}
          <Section icon={<UsersIcon className="w-4 h-4" />} title="Referrals" count={data?.referrals.length}>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <Field label="Referral code" value={p.referral_code ?? "-"} />
              <Field label="Referred by" value={data?.referredByName ?? (p.referred_by_user_id ? "-" : "Direct signup")} />
              <Field label="Total referred" value={(data?.referrals.length ?? 0).toString()} />
              <Field label="Qualified" value={qualifiedRefs.toString()} />
            </div>
            {data && data.referrals.length > 0 && (
              <ol className="space-y-1 max-h-40 overflow-y-auto">
                {data.referrals.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground tabular-nums">{new Date(r.signed_up_at).toLocaleDateString()}</span>
                    <span className={r.qualified ? "text-green font-semibold" : "text-muted-foreground"}>{r.qualified ? "qualified" : "pending"}</span>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <LifecycleEventsSection rows={data?.lifecycleEvents ?? []} />

          <ActivityLogSection
            userId={userId}
            rows={data?.auditLog ?? []}
            actors={data?.auditActors ?? {}}
          />
        </div>

        {/* All profile fields - raw dump so nothing is hidden */}
        <Section icon={<ListTree className="w-4 h-4" />} title="All profile fields" count={profileEntries.length}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
            {profileEntries.map(([k, v]) => (
              <Field key={k} label={humanize(k)} value={fmtValue(k, v)} />
            ))}
          </div>
        </Section>

        <p className="text-[11px] text-muted-foreground pt-1">
          {data?.hasBalance && data?.balanceAt ? `Balance as of ${fmtDateTime(data.balanceAt)} · ` : ""}activity windows (Telegram, finances, trades, XP, referrals) are capped to the most recent records.
        </p>
      </div>
    </div>

    {banModal && createPortal(
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
        onClick={closeBanModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ban-modal-title"
      >
        <div
          className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
            <div className="min-w-0">
              <h2
                id="ban-modal-title"
                className="font-display font-bold text-lg flex items-center gap-2 text-foreground"
              >
                {banModal === "ban" ? (
                  <Ban className="w-5 h-5 text-red flex-shrink-0" />
                ) : (
                  <ShieldOff className="w-5 h-5 text-green flex-shrink-0" />
                )}
                {banModal === "ban" ? "Ban user" : "Unban user"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {banModal === "ban"
                  ? `Revoke platform, Telegram, and TradingView access for ${displayName} until you unban them.`
                  : `Lift the ban on ${displayName}. Access restores if they still meet requirements.`}
              </p>
            </div>
            <button
              type="button"
              onClick={closeBanModal}
              disabled={banBusy}
              className="p-1.5 -mt-0.5 -me-1 hover:bg-surface-soft rounded-md transition flex-shrink-0 disabled:opacity-50"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {banModal === "ban" && (
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold" htmlFor="ban-reason">
                  Reason <span className="normal-case tracking-normal font-medium">(optional)</span>
                </label>
                <textarea
                  id="ban-reason"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Why is this account being banned?"
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple/50 resize-none"
                  disabled={banBusy}
                  autoFocus
                />
                <div className="text-[10px] text-muted-foreground mt-1 tabular-nums text-right">{banReason.length}/500</div>
              </div>
            )}
            {banModal === "unban" && p.ban_reason && (
              <div className="rounded-lg border border-border bg-surface-soft p-3 text-sm">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Previous ban reason</div>
                <div className="text-foreground">{p.ban_reason}</div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
            <button
              type="button"
              onClick={closeBanModal}
              disabled={banBusy}
              className="px-3 py-2 rounded-lg text-sm font-semibold border border-border text-muted-foreground hover:bg-surface-soft hover:text-foreground disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmBanAction()}
              disabled={banBusy}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50 transition ${
                banModal === "ban"
                  ? "border-red/40 bg-red/10 text-red hover:bg-red/20"
                  : "border-green/40 bg-green/10 text-green hover:bg-green/20"
              }`}
            >
              {banBusy
                ? banModal === "ban" ? "Banning…" : "Unbanning…"
                : banModal === "ban" ? "Ban user" : "Unban user"}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )}
    </>
  );
}
