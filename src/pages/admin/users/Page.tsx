"use client";

import { getApi } from "@/services/api";
import { Users, Clock, Eye, Search, Send, Wallet, Zap, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { startViewAs } from "@/services/action-stubs";

const PLATFORM_URL = (
  (import.meta.env.VITE_PLATFORM_URL as string | undefined) ??
  "https://ezfe.blockmob.xyz"
).replace(/\/$/, "");

// tier → rank label (mirrors analytics rank distribution).
const RANK_LABELS = ["Unverified", "Beginner", "Starter", "Bronze", "Silver", "Gold", "Platinum", "VIP"];
const rankLabel = (t: number | null) => (t == null ? "-" : RANK_LABELS[t] ?? `T${t}`);

type Row = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  username: string | null;
  country: string | null;
  tier: number | null;
  status: string | null;
  is_banned: boolean | null;
  ib_status: string | null;
  xp_total: number | null;
  created_at: string | null;
  last_active_date: string | null;
  telegram_username: string | null;
  telegram_user_id: number | null;
  telegram_group_status: "none" | "member" | "removed" | null;
  telegram_group_joined_at: string | null;
  tradingview_username: string | null;
  onboarding_broker_uid: string | null;
  balance: number | null;
  total_lots: number | null;
  avg_rr: number | null;
  win_rate: number | null;
  closed_trades: number | null;
  mt5_logins: string | null;
};

// Server-side sort options (column + direction). nulls sort last.
const SORTS: Record<string, { label: string; col: string; asc: boolean }> = {
  recent: { label: "Newest", col: "created_at", asc: false },
  active: { label: "Last active", col: "last_active_date", asc: false },
  balance: { label: "Balance", col: "balance", asc: false },
  xp: { label: "XP", col: "xp_total", asc: false },
  lots: { label: "Lots", col: "total_lots", asc: false },
  rr: { label: "Avg RR", col: "avg_rr", asc: false },
  winrate: { label: "Win rate", col: "win_rate", asc: false },
  rank: { label: "Rank", col: "tier", asc: false },
};

// The Users list is fetched from the backend (`/api/admin/data/users`), which
// reads v_user_search on the service-role client - so BAL / LOTS always populate.
// Querying Supabase directly from the browser failed here: base-table RLS starved
// the view's aggregates and the client silently fell back to a balance-less query.
const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;

function TelegramBadge({ p }: { p: Row }) {
  if (!p.telegram_username && (p.telegram_group_status ?? "none") === "none") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold bg-surface-soft border border-border text-muted-foreground">
        <Send className="w-3 h-3" /> Not linked
      </span>
    );
  }
  const status = p.telegram_group_status ?? "none";
  const map: Record<string, { label: string; cls: string }> = {
    member: { label: "In group", cls: "bg-green-dim text-green border-green/30" },
    removed: { label: "Removed", cls: "bg-red/10 text-red border-red/30" },
    none: { label: "Linked", cls: "bg-surface-soft text-muted-foreground border-border" },
  };
  const s = map[status] ?? map.none;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border ${s.cls}`}>
      <Send className="w-3 h-3" /> {s.label}
    </span>
  );
}

/** Display-only IB gate badge - separate from profiles.status / Telegram. */
function IbBadge({ status }: { status: string | null | undefined }) {
  if (status !== "grace" && status !== "flagged" && status !== "revoked") return null;
  const revoked = status === "revoked";
  return (
    <span
      title="IB ownership gate - independent of Active / Tier"
      className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold flex-shrink-0 border ${
        revoked
          ? "bg-red/10 text-red border-red/30"
          : "bg-amber-dim text-amber border-amber/30"
      }`}
    >
      {revoked ? "IB revoked" : "IB grace"}
    </span>
  );
}

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "-";
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [rank, setRank] = useState<string>("");        // "" = any, else tier number
  const [tg, setTg] = useState<string>("");            // "", member, removed, none, linked
  const [searching, setSearching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewAsId, setViewAsId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const navigate = useNavigate();

  const isSearching = search.trim().length > 0;
  const totalPages = totalCount != null ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : null;
  const rangeStart = page * PAGE_SIZE + 1;
  const rangeEnd = page * PAGE_SIZE + (rows?.length ?? 0);

  useEffect(() => {
    let cancelled = false;

    const handle = window.setTimeout(async () => {
      setSearching(true);
      setLoadError(null);
      try {
        const params: Record<string, string> = { sort, page: String(page) };
        if (search.trim()) params.search = search.trim();
        if (rank !== "") params.rank = rank;
        if (tg !== "") params.tg = tg;
        const res = await getApi<{ rows: Row[]; count: number }>(
          "/api/admin/data/users",
          params,
        );
        if (cancelled) return;
        setRows(res.rows ?? []);
        setTotalCount(res.count ?? 0);
      } catch (e) {
        if (cancelled) return;
        console.error("Users load failed:", e);
        setLoadError(e instanceof Error ? e.message : "Could not load users.");
        setRows([]);
        setTotalCount(0);
      } finally {
        if (!cancelled) {
          setSearching(false);
          setLoading(false);
        }
      }
    }, isSearching ? SEARCH_DEBOUNCE_MS : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [search, isSearching, sort, rank, tg, page]);

  async function handleViewAs(userId: string) {
    setViewAsId(userId);
    const res = await startViewAs(userId);
    setViewAsId(null);
    if (!res.ok) { toast.error(res.error); return; }
    window.open(`${PLATFORM_URL}/dashboard#__imp=${encodeURIComponent(res.token)}`, "_blank", "noopener,noreferrer");
    toast.success(`Opening read-only view as ${res.user.name ?? res.user.email ?? "user"}`);
  }

  if (loading) return <PageSkeleton />;
  const list = rows ?? [];

  const selectCls = "rounded-lg bg-surface-soft border border-border text-xs font-semibold text-foreground px-2.5 py-2 focus:outline-none focus:border-purple/50 cursor-pointer";

  return (
    <div className="">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-purple" /> Users
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search by name, email, username, country, broker UID, MT5 login, TradingView handle, Telegram, or referral code. Sort and filter by rank, balance, XP, lots, RR. Click a row for full detail.
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search name, email, UID, MT5, @telegram, @tradingview, country…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-surface-soft border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple/50"
          />
        </div>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }} className={selectCls} title="Sort by">
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Sort: {v.label}</option>)}
        </select>
        <select value={rank} onChange={(e) => { setRank(e.target.value); setPage(0); }} className={selectCls} title="Filter by rank">
          <option value="">All ranks</option>
          {RANK_LABELS.map((l, i) => <option key={i} value={i}>{i}. {l}</option>)}
        </select>
        <select value={tg} onChange={(e) => { setTg(e.target.value); setPage(0); }} className={selectCls} title="Filter by Telegram">
          <option value="">All Telegram</option>
          <option value="linked">Linked</option>
          <option value="member">In group</option>
          <option value="removed">Removed</option>
          <option value="none">Not in group</option>
        </select>
      </div>

      {loadError && (
        <div className="mb-4 text-sm text-red px-3 py-2 rounded-md bg-red-dim border border-red/20">{loadError}</div>
      )}

      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 px-0.5">
        {searching
          ? "Loading…"
          : totalCount != null && totalCount > 0
            ? `${totalCount.toLocaleString()} user${totalCount === 1 ? "" : "s"} total`
            : `${list.length} user${list.length === 1 ? "" : "s"}`}
      </div>

      {/* Results */}
      <div className="space-y-2">
        {list.map((p) => {
          const mt5Count = p.mt5_logins ? p.mt5_logins.trim().split(/\s+/).filter(Boolean).length : 0;
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/admin/users/${p.id}`)}
              className="p-3 border border-border rounded-lg bg-surface flex justify-between items-center gap-3 text-sm cursor-pointer hover:border-purple/50 transition"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold truncate">{[p.first_name, p.last_name].filter(Boolean).join(" ") || p.display_name || p.email}</span>
                  <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${p.status === "active" ? "bg-green-dim text-green" : "bg-surface-soft text-muted-foreground"}`}>{p.status}</span>
                  {p.is_banned && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold flex-shrink-0 bg-red/10 text-red">banned</span>}
                  <IbBadge status={p.ib_status} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{p.email}</div>
                <div className="flex items-center gap-x-3 gap-y-0.5 mt-1 flex-wrap text-[11px] text-muted-foreground">
                  <span className="text-purple font-semibold">{p.tier ?? 0}. {rankLabel(p.tier)}</span>
                  {p.country && <span>{p.country}</span>}
                  {mt5Count > 0 && <span>MT5 ×{mt5Count}</span>}
                  {p.onboarding_broker_uid && <span>UID {p.onboarding_broker_uid}</span>}
                  {p.tradingview_username && <span>TV @{p.tradingview_username}</span>}
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                {/* Numeric stats */}
                <div className="hidden sm:grid grid-cols-3 gap-x-3 text-right">
                  <div title="Current balance">
                    <div className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider flex items-center justify-end gap-0.5"><Wallet className="w-2.5 h-2.5" />Bal</div>
                    <div className="text-xs font-bold tabular-nums">{fmtMoney(p.balance)}</div>
                  </div>
                  <div title="Total XP">
                    <div className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider flex items-center justify-end gap-0.5"><Zap className="w-2.5 h-2.5" />XP</div>
                    <div className="text-xs font-bold tabular-nums">{(p.xp_total ?? 0).toLocaleString()}</div>
                  </div>
                  <div title="Total lots · avg RR">
                    <div className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider flex items-center justify-end gap-0.5"><BarChart2 className="w-2.5 h-2.5" />Lots</div>
                    <div className="text-xs font-bold tabular-nums">{Number(p.total_lots ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <TelegramBadge p={p} />
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {p.last_active_date ? new Date(p.last_active_date).toLocaleDateString() : "-"}
                  </span>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleViewAs(p.id); }}
                  disabled={viewAsId === p.id}
                  title="Open this user's app, read-only"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-purple/40 text-purple hover:bg-purple/10 disabled:opacity-50 transition whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" /> {viewAsId === p.id ? "Opening…" : "View as"}
                </button>
              </div>
            </div>
          );
        })}
        {!searching && list.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {isSearching ? `No users found for "${search.trim()}".` : "No users match your filters."}
          </div>
        )}
      </div>

      {totalPages != null && totalPages > 1 && (
        <nav
          aria-label="Users pagination"
          className="mt-6 rounded-xl border border-border bg-surface overflow-hidden"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 bg-surface-soft border-b border-border">
            <p className="text-xs text-secondary-foreground">
              Showing{" "}
              <span className="font-display font-semibold text-foreground tabular-nums">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-display font-semibold text-foreground tabular-nums">
                {totalCount?.toLocaleString()}
              </span>{" "}
              users
            </p>
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 px-4 py-3">
            <button
              type="button"
              disabled={page === 0 || searching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-display font-semibold transition",
                "border-border bg-surface text-foreground hover:border-purple/40 hover:bg-purple-dim/40",
                "disabled:opacity-40 disabled:pointer-events-none",
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
                .map((i, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev != null && i - prev > 1;
                  return (
                    <React.Fragment key={i}>
                      {showEllipsis && (
                        <span className="px-1 text-xs text-muted-foreground select-none">…</span>
                      )}
                      <button
                        type="button"
                        disabled={searching}
                        onClick={() => setPage(i)}
                        className={cn(
                          "min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-display font-semibold tabular-nums transition",
                          i === page
                            ? "bg-purple text-white border border-purple shadow-sm"
                            : "border border-border bg-surface text-secondary-foreground hover:border-purple/40 hover:bg-purple-dim/40",
                        )}
                      >
                        {i + 1}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={searching || page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-display font-semibold transition",
                "border-purple/30 bg-purple-dim/30 text-purple hover:bg-purple-dim hover:border-purple/50",
                "disabled:opacity-40 disabled:pointer-events-none",
              )}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
