"use client";

import { getApi } from "@/services/api";
import { Link } from "react-router-dom";
import { Globe, Users, TrendingUp, DollarSign, Trophy, X, Clock } from "lucide-react";
import { DailyActivityChart } from "@/components/cypher/DailyActivityChart";

import React, { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

function RangeChip({ current, value, label }: { current: string | undefined; value: string; label: string }) {
  const active = (current ?? "30d") === value;
  return (
    <Link
      to={`?range=${value}`}
      className={"px-3 py-1 rounded-lg text-xs font-semibold border transition " + (active ? "bg-purple text-white border-purple" : "border-border bg-surface text-secondary-foreground hover:border-purple/50")}
    >
      {label}
    </Link>
  );
}

function BigStat({ icon, label, value, sub, onClick }: { icon: React.ReactNode; label: string; value: string; sub?: string; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`rounded-xl border border-border bg-surface p-4 ${onClick ? "cursor-pointer hover:border-purple/50 hover:-translate-y-0.5 active:scale-95 transition-all shadow-sm hover:shadow-md" : ""}`}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-display font-bold text-foreground tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1 font-medium">{sub}</div>}
    </div>
  );
}

function Champion({ title, name, metric }: { title: string; name: string; metric: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-[10px] uppercase text-muted-foreground mb-1 font-bold tracking-wider">{title}</div>
      <div className="text-sm font-bold text-foreground truncate">{name || "-"}</div>
      <div className="text-xs text-muted-foreground mt-1 tabular-nums">{metric}</div>
    </div>
  );
}

function fmtName(p: { first_name?: string | null; last_name?: string | null; email?: string | null } | null | undefined): string {
  if (!p) return "-";
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ");
  return full || p.email || "-";
}

export default function AdminAnalyticsPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<"signups" | "deposits" | "withdrawals" | null>(null);

  // Signup cohort rows for the "Signups" detail modal. The cross-user directory
  // and read-only "View as" launch moved to /admin/users.
  const signupRows: any[] = data?.profiles ?? [];

  const sp = Object.fromEntries(searchParams.entries());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params: Record<string, string> = {};
        if (sp.range) params.range = sp.range;
        if (sp.country) params.country = sp.country;

        // Admin reads run server-side on the service-role client (bypasses RLS),
        // so this returns real membership/broker/trade data instead of the empty
        // set the browser anon client used to get back.
        const res = await getApi<any>("/api/admin/data/analytics", params);

        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t, navigate, searchParams]);

  if (loading) return <PageSkeleton />;
  if (!data) return null;

  return (
    <div className="">
      {/* Header + filters */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">EZ Trade membership pulse · cohort filters · country slices.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <RangeChip current={sp.range} value="7d" label="7d" />
          <RangeChip current={sp.range} value="30d" label="30d" />
          <RangeChip current={sp.range} value="90d" label="90d" />
          <RangeChip current={sp.range} value="all" label="All time" />
          {sp.country && (
            <Link to="?" className="ml-2 text-xs uppercase tracking-wider px-2.5 py-1 rounded-lg bg-purple-dim text-purple border border-purple/30">
              {sp.country} ✕
            </Link>
          )}
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <BigStat 
          icon={<Users className="w-4 h-4" />} 
          label="Signups" 
          value={(data.profileCount ?? 0).toLocaleString()} 
          sub={`${data.activeUsers} active`} 
          onClick={() => setActiveModal("signups")}
        />
        <BigStat 
          icon={<DollarSign className="w-4 h-4 text-green" />} 
          label="Deposits" 
          value={`$${data.totalIn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          sub={`${data.deposits.length} txns`} 
          onClick={() => setActiveModal("deposits")}
        />
        <BigStat 
          icon={<DollarSign className="w-4 h-4 text-red" />} 
          label="Withdrawals" 
          value={`$${data.totalOut.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          sub={`${data.withdrawals.length} txns`} 
          onClick={() => setActiveModal("withdrawals")}
        />
        <BigStat 
          icon={<TrendingUp className="w-4 h-4 text-purple" />} 
          label="Net flow" 
          value={`$${(data.totalIn - data.totalOut).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          sub="in - out" 
        />
      </div>

      {/* Daily activity chart */}
      <div className="mb-6">
        <DailyActivityChart data={data.dailyActivity} height={180} />
      </div>

      {/* Champions */}
      <h2 className="text-sm uppercase tracking-wider text-purple mb-3">
        <Trophy className="w-4 h-4 inline mr-1.5 -mt-0.5" /> Champions {sp.country ? `· ${sp.country}` : "· global"}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <Champion
          title="Top depositor"
          name={fmtName(data.topDepositor?.profile)}
          metric={data.topAccount ? `$${data.topAccount[1].toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}
        />
        <Champion
          title="Top profiter"
          name={fmtName(data.topProfiter)}
          metric={data.topProfiterEntry ? `${data.topProfiterEntry[1] >= 0 ? "+" : ""}$${data.topProfiterEntry[1].toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}
        />
      </div>

      {/* Country breakdown */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm uppercase tracking-wider text-foreground font-bold flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-purple" /> Top countries
          </h3>
          {data.topCountries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No signups in this range.</p>
          ) : (
            <ol className="space-y-2">
              {data.topCountries.map(([country, count]: any) => {
                const max = data.topCountries[0][1];
                const pct = (count / max) * 100;
                return (
                  <li key={country}>
                    <Link to={`?country=${encodeURIComponent(country)}${sp.range ? `&range=${sp.range}` : ""}`} className="block group">
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className=" group-hover:text-purple">{country}</span>
                        <span className=" tabular-nums text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-soft overflow-hidden">
                        <div className="h-full bg-purple/60 group-hover:bg-purple transition" style={{ width: `${pct}%` }} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm uppercase tracking-wider text-foreground font-bold mb-1">Rank distribution</h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            Current member ranks{sp.country ? ` · ${sp.country}` : " · all members"}
          </p>
          {(() => {
            const labels = ["Unverified", "Beginner", "Starter", "Bronze", "Silver", "Gold", "Platinum", "VIP"];
            const max = Math.max(1, ...(data.tierDist as number[]));
            return (
              <ol className="space-y-2">
                {labels.map((label, tier) => {
                  const n = data.tierDist[tier] ?? 0;
                  return (
                    <li key={tier}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="">{tier}. {label}</span>
                        <span className=" tabular-nums text-muted-foreground">{n}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-soft overflow-hidden">
                        <div className="h-full bg-green/60" style={{ width: `${(n / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            );
          })()}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {data.since ? `Window: ${data.range}d` : "All time"} · {data.profileCount ?? 0} profiles · {(data.allocationsCount ?? 0)} broker allocations · {(data.closedTradesCount ?? 0)} closed trades.
        {sp.country ? <> · Filtered to <strong>{sp.country}</strong>.</> : null}
      </p>

      {/* Details Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-display font-bold text-lg capitalize flex items-center gap-2">
                {activeModal === "signups" && <Users className="w-5 h-5 text-purple" />}
                {activeModal === "deposits" && <DollarSign className="w-5 h-5 text-green" />}
                {activeModal === "withdrawals" && <DollarSign className="w-5 h-5 text-red" />}
                {activeModal}
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1.5 hover:bg-surface-soft rounded-md transition">
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
               {activeModal === "signups" && signupRows.map((p: any) => (
                 <div key={p.id} className="p-3 border border-border rounded-lg bg-surface flex justify-between items-center gap-3 text-sm">
                   <div className="min-w-0">
                     <div className="font-bold truncate">{[p.first_name, p.last_name].filter(Boolean).join(" ") || p.email}</div>
                     <div className="text-xs text-muted-foreground mt-0.5 truncate">{p.email}</div>
                   </div>
                   <div className="text-right flex-shrink-0">
                     <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold inline-block mb-1 ${p.status === 'active' ? 'bg-green-dim text-green border border-green/30' : 'bg-surface-soft border border-border text-muted-foreground'}`}>{p.status}</span>
                     <div className="text-xs text-muted-foreground flex items-center justify-end gap-1"><Clock className="w-3 h-3"/> {new Date(p.created_at).toLocaleDateString()}</div>
                   </div>
                 </div>
               ))}
               {activeModal === "deposits" && data?.deposits?.map((d: any, i: number) => (
                 <div key={i} className="p-3 border border-border rounded-lg bg-surface flex justify-between items-center text-sm">
                   <div>
                     <div className="font-bold">Account {d.account}</div>
                     <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(d.created_at_pu).toLocaleDateString()}</div>
                   </div>
                   <div className="font-bold text-green tabular-nums">+${Number(d.amount).toLocaleString()}</div>
                 </div>
               ))}
               {activeModal === "withdrawals" && data?.withdrawals?.map((d: any, i: number) => (
                 <div key={i} className="p-3 border border-border rounded-lg bg-surface flex justify-between items-center text-sm">
                   <div>
                     <div className="font-bold">Account {d.account}</div>
                     <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(d.created_at_pu).toLocaleDateString()}</div>
                   </div>
                   <div className="font-bold text-red tabular-nums">-${Number(d.amount).toLocaleString()}</div>
                 </div>
               ))}
               {((activeModal === "deposits" && data?.deposits?.length === 0) ||
                 (activeModal === "withdrawals" && data?.withdrawals?.length === 0) ||
                 (activeModal === "signups" && signupRows.length === 0)) ? (
                 <div className="py-8 text-center text-sm text-muted-foreground">
                   No records found for this period.
                 </div>
               ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
