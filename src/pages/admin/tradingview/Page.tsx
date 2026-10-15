"use client";

import { createClient } from "@/lib/supabase/client";
import {
  LineChart, LogIn, LogOut, PlusCircle, Search, RefreshCw, Clock, Users as UsersIcon, AlertTriangle,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { cn } from "@/lib/utils";

// Recent-activity window for the feed (newest first).
const FEED_LIMIT = 300;
// TradingView grants/revokes are written by the 6-hourly sync cron (+ the
// per-user rank cascade), so they're infrequent - audit_log is high-write and
// not Realtime-published, so this page auto-refreshes on a timer instead.
const POLL_MS = 30_000;

// The audit_log actions the TradingView (Cypher Scanner) access lifecycle writes
// - set by tradingview.service (username requested) and syncTradingView (script
// grant/revoke). target_id is the member; before/after carry the handle + reason.
const TV_ACTIONS = [
  "tradingview_granted", "tradingview_revoked", "tradingview_set", "tradingview_errored",
] as const;

// Labels for the reason stored on a tradingview_revoked audit entry.
const TV_REVOKE_REASON: Record<string, string> = {
  suspended: "Account suspended",
  ineligible: "No longer eligible (rank / onboarding)",
};

type Action = (typeof TV_ACTIONS)[number];

type AuditRow = {
  id: number;
  action: Action;
  created_at: string;
  target_id: string | null;
  before: { username?: string | null } | null;
  after: { username?: string | null; reason?: string | null; error?: string | null } | null;
};

type ProfileLite = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  tradingview_username: string | null;
};

type FeedRow = AuditRow & { profile: ProfileLite | null };

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "-";
  const sec = Math.round((Date.now() - then) / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function displayName(p: ProfileLite | null, row: AuditRow): string {
  if (p) return [p.first_name, p.last_name].filter(Boolean).join(" ") || p.display_name || p.email || "User";
  return row.target_id ? "Unknown member" : "-";
}

const ACTION_META: Record<Action, { label: string; icon: React.ReactNode; cls: string }> = {
  tradingview_set: { label: "Access requested", icon: <PlusCircle className="w-3.5 h-3.5" />, cls: "bg-purple-dim text-purple" },
  tradingview_granted: { label: "Access granted", icon: <LogIn className="w-3.5 h-3.5" />, cls: "bg-green-dim text-green" },
  tradingview_revoked: { label: "Access revoked", icon: <LogOut className="w-3.5 h-3.5" />, cls: "bg-red/10 text-red" },
  tradingview_errored: { label: "Grant failed", icon: <AlertTriangle className="w-3.5 h-3.5" />, cls: "bg-red/10 text-red" },
};

export default function AdminTradingViewFeedPage() {
  const [rows, setRows] = useState<FeedRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [action, setAction] = useState<"" | Action>("");

  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    setError(null);
    const sb = createClient() as any;
    try {
      const { data: auditData, error: auditErr } = await sb
        .from("audit_log")
        .select("id, action, created_at, target_id, before, after")
        .in("action", TV_ACTIONS as unknown as string[])
        .order("created_at", { ascending: false })
        .limit(FEED_LIMIT);
      if (auditErr) throw auditErr;
      const audit = (auditData ?? []) as AuditRow[];

      const ids = Array.from(new Set(audit.map((a) => a.target_id).filter((v): v is string => !!v)));
      const byId = new Map<string, ProfileLite>();
      if (ids.length) {
        const { data: profData } = await sb
          .from("profiles")
          .select("id, first_name, last_name, display_name, email, tradingview_username")
          .in("id", ids);
        for (const p of (profData ?? []) as ProfileLite[]) byId.set(p.id, p);
      }

      setRows(audit.map((a) => ({ ...a, profile: a.target_id ? byId.get(a.target_id) ?? null : null })));
      setLastUpdated(new Date());
    } catch (e) {
      setError((e as Error).message ?? "Could not load TradingView activity.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
    const iv = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(iv);
  }, [load]);

  if (loading) return <PageSkeleton />;

  const all = rows ?? [];
  const q = search.trim().toLowerCase().replace(/^@/, "");
  const list = all.filter((r) => {
    if (action && r.action !== action) return false;
    if (q) {
      const handle = r.after?.username ?? r.before?.username ?? "";
      const hay = [
        displayName(r.profile, r),
        r.profile?.email ?? "",
        r.profile?.tradingview_username ?? "",
        handle,
      ].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const selectCls =
    "rounded-lg bg-surface-soft border border-border text-xs font-semibold text-foreground px-2.5 py-2 focus:outline-none focus:border-purple/50 cursor-pointer";

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <LineChart className="w-6 h-6 text-purple" /> TradingView Access
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Feed of Cypher Scanner (TradingView) access changes across all members - when a member
            requested access with their handle, when the sync granted it on the script, and when it was
            revoked (with the reason). Click a row to open that member's full profile.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold border bg-surface-soft text-muted-foreground border-border"
            title="Auto-refreshes every 30s"
          >
            <RefreshCw className="w-3 h-3" /> Auto
          </span>
          <button
            onClick={() => void load()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-purple/40 text-purple hover:bg-purple/10 disabled:opacity-50 transition"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, @tradingview handle…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-soft border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple/50"
          />
        </div>
        <select value={action} onChange={(e) => setAction(e.target.value as "" | Action)} className={selectCls} title="Filter by action">
          <option value="">All changes</option>
          <option value="tradingview_set">Requested</option>
          <option value="tradingview_granted">Granted</option>
          <option value="tradingview_revoked">Revoked</option>
          <option value="tradingview_errored">Failed</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red px-3 py-2 rounded-md bg-red-dim border border-red/20">{error}</div>
      )}

      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-3 px-0.5">
        <span>{list.length} change{list.length === 1 ? "" : "s"}{list.length !== all.length ? ` of ${all.length}` : ""}</span>
        {lastUpdated && <span>updated {timeAgo(lastUpdated.toISOString())}</span>}
      </div>

      {/* Feed */}
      <div className="space-y-2">
        {list.map((r) => {
          const meta = ACTION_META[r.action];
          const name = displayName(r.profile, r);
          const handle = r.after?.username ?? r.before?.username ?? r.profile?.tradingview_username;
          const reasonCode = r.action === "tradingview_revoked" ? r.after?.reason : null;
          const reason = reasonCode ? (TV_REVOKE_REASON[reasonCode] ?? reasonCode) : null;
          const errorMsg = r.action === "tradingview_errored" ? r.after?.error : null;
          const inner = (
            <>
              <span className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center", meta.cls)}>
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="font-semibold text-sm truncate">{name}</span>
                  {handle && <span className="text-[11px] text-muted-foreground">@{handle}</span>}
                </div>
                <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{meta.label}</span>
                  {reason && <span className="text-red/90">· {reason}</span>}
                  {r.profile?.email && <span className="text-muted-foreground truncate">· {r.profile.email}</span>}
                </div>
                {errorMsg && (
                  <div className="text-[11px] text-red/90 mt-1 truncate" title={errorMsg}>{errorMsg}</div>
                )}
              </div>
              <span className="flex-shrink-0 text-right" title={fmtDateTime(r.created_at)}>
                <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" /> {timeAgo(r.created_at)}
                </span>
                <span className="block text-[10px] text-muted-foreground/70 tabular-nums mt-0.5">{fmtDateTime(r.created_at)}</span>
              </span>
            </>
          );
          const base = "p-3 border border-border rounded-lg bg-surface flex items-center gap-3 transition";
          return r.target_id ? (
            <Link key={r.id} to={`/admin/users/${r.target_id}`} className={cn(base, "hover:border-purple/50")}>
              {inner}
            </Link>
          ) : (
            <div key={r.id} className={base}>{inner}</div>
          );
        })}
        {list.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <UsersIcon className="w-6 h-6 opacity-50" />
            {all.length === 0 ? "No TradingView access changes recorded yet." : "No changes match your filters."}
          </div>
        )}
      </div>
    </div>
  );
}
