"use client";

import { createClient } from "@/lib/supabase/client";
import {
  Send, LogIn, LogOut, ShieldCheck, Search, RefreshCw, Clock, Users as UsersIcon,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { TelegramGroupsEditor } from "./telegram-groups-editor";
import { cn } from "@/lib/utils";

// How many recent events to hold in the live feed. It's a monitoring stream, so
// a rolling window of the most recent activity (newest first) is what matters.
const FEED_LIMIT = 300;
// Backstop poll - Realtime pushes inserts instantly, but a periodic refetch
// keeps the feed correct if the socket drops or the table isn't yet published.
const POLL_MS = 20_000;

// group_id (telegram_membership_events / signal_groups) → display label. The
// 'silver' group is branded "Synergy" (see backend lib/telegram/groups). A null
// group_id is a verification (account link), which precedes any group join.
const GROUP_LABEL: Record<string, string> = {
  eztrade: "EZ Trade",
  silver: "Synergy",
  cypher: "Cypher Trading",
};
function groupLabel(id: string | null): string {
  if (!id) return "-";
  return GROUP_LABEL[id] ?? id;
}
/** Group filter values - "" is "all groups". Keep in sync with GROUP_LABEL. */
type GroupFilter = "" | "eztrade" | "silver" | "cypher";

// Human-readable labels for the reason codes the platform records when it kicks
// a member from a group (backend lib/telegram/group-access RemovalReason).
const TG_REMOVAL_REASON: Record<string, string> = {
  suspended: "Account suspended (compliance lock)",
  rank_below_tier: "Rank dropped below group tier",
  ib_ownership_lost: "Broker account left EZ Trade's IB",
  unlinked: "Telegram manually disconnected",
};

type Kind = "joined" | "left" | "verified";

type EventRow = {
  id: number;
  user_id: string | null;
  telegram_user_id: number | null;
  group_id: string | null;
  event: Kind;
  status: string | null;
  reason: string | null;
  source: string | null;
  at: string;
};

type ProfileLite = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  telegram_username: string | null;
};

type FeedRow = EventRow & { profile: ProfileLite | null };

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (isNaN(then)) return "-";
  const sec = Math.round(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function displayName(p: ProfileLite | null, row: EventRow): string {
  if (p) return [p.first_name, p.last_name].filter(Boolean).join(" ") || p.display_name || p.email || "User";
  return row.telegram_user_id ? `Telegram #${row.telegram_user_id}` : "Unlinked user";
}

const EVENT_META: Record<Kind, { label: string; icon: React.ReactNode; cls: string }> = {
  verified: { label: "Verified", icon: <ShieldCheck className="w-3.5 h-3.5" />, cls: "bg-purple-dim text-purple" },
  joined: { label: "Joined group", icon: <LogIn className="w-3.5 h-3.5" />, cls: "bg-green-dim text-green" },
  left: { label: "Left group", icon: <LogOut className="w-3.5 h-3.5" />, cls: "bg-red/10 text-red" },
};

function eventSubtitle(e: EventRow): { text: string; danger: boolean } | null {
  if (e.event === "verified") return { text: "Telegram account linked", danger: false };
  if (e.event === "left") {
    const reason = e.reason ? (TG_REMOVAL_REASON[e.reason] ?? e.reason) : null;
    if (reason) return { text: reason, danger: true };
    return { text: e.status === "kicked" ? "Removed from group" : "Left voluntarily", danger: false };
  }
  if (e.status && e.status !== "member") return { text: e.status, danger: false };
  return null;
}

export default function AdminTelegramFeedPage() {
  const [rows, setRows] = useState<FeedRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [live, setLive] = useState(false);

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"" | Kind>("");
  const [group, setGroup] = useState<GroupFilter>("");

  // Guards a fetch already in flight so overlapping Realtime + poll + manual
  // triggers collapse into a single refetch rather than stacking.
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    setError(null);
    const sb = createClient() as any;
    try {
      const { data: evData, error: evErr } = await sb
        .from("telegram_membership_events")
        .select("id, user_id, telegram_user_id, group_id, event, status, reason, source, at")
        .order("at", { ascending: false })
        .limit(FEED_LIMIT);
      if (evErr) throw evErr;
      const events = (evData ?? []) as EventRow[];

      // Resolve profiles in one batched query (mirrors the user-detail page's
      // cast-to-any pattern - these columns aren't all in the generated types).
      const ids = Array.from(new Set(events.map((e) => e.user_id).filter((v): v is string => !!v)));
      const byId = new Map<string, ProfileLite>();
      if (ids.length) {
        const { data: profData } = await sb
          .from("profiles")
          .select("id, first_name, last_name, display_name, email, telegram_username")
          .in("id", ids);
        for (const p of (profData ?? []) as ProfileLite[]) byId.set(p.id, p);
      }

      setRows(events.map((e) => ({ ...e, profile: e.user_id ? byId.get(e.user_id) ?? null : null })));
      setLastUpdated(new Date());
    } catch (e) {
      setError((e as Error).message ?? "Could not load Telegram activity.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      inFlight.current = false;
    }
  }, []);

  // Initial load + poll backstop.
  useEffect(() => {
    void load();
    const iv = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(iv);
  }, [load]);

  // Realtime: push new join/leave/verify events into the feed the instant the
  // membership log receives them (published in migration 077). Debounced through
  // load()'s in-flight guard so a burst collapses into one refetch.
  useEffect(() => {
    const sb = createClient() as any;
    const channel = sb
      .channel("admin-telegram-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "telegram_membership_events" },
        () => void load(),
      )
      .subscribe((status: string) => setLive(status === "SUBSCRIBED"));
    return () => {
      setLive(false);
      sb.removeChannel(channel);
    };
  }, [load]);

  if (loading) return <PageSkeleton />;

  const all = rows ?? [];
  const q = search.trim().toLowerCase().replace(/^@/, "");
  const list = all.filter((r) => {
    if (kind && r.event !== kind) return false;
    if (group && r.group_id !== group) return false;
    if (q) {
      const hay = [
        displayName(r.profile, r),
        r.profile?.email ?? "",
        r.profile?.telegram_username ?? "",
        r.telegram_user_id != null ? String(r.telegram_user_id) : "",
      ].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const selectCls =
    "rounded-lg bg-surface-soft border border-border text-xs font-semibold text-foreground px-2.5 py-2 focus:outline-none focus:border-purple/50 cursor-pointer";

  return (
    <div>
      {/* Rename the Telegram community groups (feeds the member app everywhere). */}
      <TelegramGroupsEditor />

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Send className="w-6 h-6 text-purple" /> Telegram Additions / Removals
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Live feed of Telegram account verifications and group joins / removals across all members.
            Each row shows who, which group (EZ Trade / Synergy), the action, and the reason a member
            was removed. Click a row to open that member's full profile.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded font-bold border",
              live ? "bg-green-dim text-green border-green/30" : "bg-surface-soft text-muted-foreground border-border",
            )}
            title={live ? "Realtime connected" : "Realtime offline - refreshing every 20s"}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", live ? "bg-green animate-pulse" : "bg-muted-foreground")} />
            {live ? "Live" : "Polling"}
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
            placeholder="Search name, email, @telegram, Telegram ID…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-soft border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple/50"
          />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value as "" | Kind)} className={selectCls} title="Filter by event">
          <option value="">All events</option>
          <option value="verified">Verified</option>
          <option value="joined">Joined</option>
          <option value="left">Removed / left</option>
        </select>
        <select value={group} onChange={(e) => setGroup(e.target.value as GroupFilter)} className={selectCls} title="Filter by group">
          <option value="">All groups</option>
          <option value="eztrade">EZ Trade</option>
          <option value="silver">Synergy</option>
          <option value="cypher">Cypher Trading</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red px-3 py-2 rounded-md bg-red-dim border border-red/20">{error}</div>
      )}

      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-3 px-0.5">
        <span>{list.length} event{list.length === 1 ? "" : "s"}{list.length !== all.length ? ` of ${all.length}` : ""}</span>
        {lastUpdated && <span>updated {timeAgo(lastUpdated.toISOString())}</span>}
      </div>

      {/* Feed */}
      <div className="space-y-2">
        {list.map((r) => {
          const meta = EVENT_META[r.event];
          const sub = eventSubtitle(r);
          const name = displayName(r.profile, r);
          const handle = r.profile?.telegram_username;
          const inner = (
            <>
              <span className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center", meta.cls)}>
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="font-semibold text-sm truncate">{name}</span>
                  {handle && <span className="text-[11px] text-muted-foreground">@{handle}</span>}
                  {r.group_id && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold bg-surface-soft border border-border text-muted-foreground">
                      {groupLabel(r.group_id)}
                    </span>
                  )}
                </div>
                <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">{meta.label}</span>
                  {sub && <span className={sub.danger ? "text-red/90" : "text-muted-foreground"}>· {sub.text}</span>}
                  {r.profile?.email && <span className="text-muted-foreground truncate">· {r.profile.email}</span>}
                </div>
              </div>
              <span className="flex-shrink-0 text-right" title={fmtDateTime(r.at)}>
                <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" /> {timeAgo(r.at)}
                </span>
                <span className="block text-[10px] text-muted-foreground/70 tabular-nums mt-0.5">{fmtDateTime(r.at)}</span>
              </span>
            </>
          );
          const base = "p-3 border border-border rounded-lg bg-surface flex items-center gap-3 transition";
          return r.user_id ? (
            <Link key={r.id} to={`/admin/users/${r.user_id}`} className={cn(base, "hover:border-purple/50")}>
              {inner}
            </Link>
          ) : (
            <div key={r.id} className={base}>{inner}</div>
          );
        })}
        {list.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <UsersIcon className="w-6 h-6 opacity-50" />
            {all.length === 0 ? "No Telegram activity recorded yet." : "No events match your filters."}
          </div>
        )}
      </div>
    </div>
  );
}
