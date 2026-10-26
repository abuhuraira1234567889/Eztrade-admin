"use client";

import { createClient } from "@/lib/supabase/client";
import { Check, X, AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Closed-beta QA harness.
 *
 * Pings every external dependency and core internal table so we can see at a glance
 * which surfaces are wired up before opening the closed beta. Acts as a smoke test -
 * "is the plumbing connected?" - not a unit-test substitute.
 */

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function CheckIcon({ ok, severity }: { ok: boolean; severity: "fatal" | "warn" | "info" }) {
  if (ok) return <Check className="w-4 h-4 text-green flex-shrink-0 mt-0.5" />;
  if (severity === "fatal") return <X className="w-4 h-4 text-red flex-shrink-0 mt-0.5" />;
  return <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />;
}

function SeverityBadge({ severity, ok }: { severity: "fatal" | "warn" | "info"; ok: boolean }) {
  if (ok) return null;
  const styles = severity === "fatal" ? "bg-red-dim text-red border-red/30" : severity === "warn" ? "bg-amber-dim text-amber border-amber/30" : "bg-surface-soft text-muted-foreground border-border";
  return <span className={"text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border " + styles}>{severity}</span>;
}

export default function QAHarnessPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [content, setContent] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();

 const checks: Array<{ name: string; ok: boolean; detail: string; severity: "fatal" | "warn" | "info" }> = [];

 // 1. Env vars (only check client-side accessible ones)
 const envVars = [
 { key: "VITE_SUPABASE_URL", severity: "fatal" as const },
 { key: "VITE_SUPABASE_ANON_KEY", severity: "fatal" as const },
 { key: "VITE_API_URL", severity: "warn" as const },
 ];
 for (const v of envVars) {
 const present = !!(import.meta.env as Record<string, string | undefined>)[v.key];
 checks.push({
 name: `env: ${v.key}`,
 ok: present,
 detail: present ? "set" : "missing · fill in .env",
 severity: v.severity,
 });
 }

 // 2. Tables present (count = 0 is fine; we only fail if the table doesn't exist)
 async function tableCheck(table: string, sev: "fatal" | "warn" | "info" = "fatal") {
 const { count, error } = await supabase.from(table as never).select("*", { count: "exact", head: true });
 checks.push({
 name: `table: ${table}`,
 ok: !error,
 detail: error ? error.message : `${count ?? 0} rows`,
 severity: sev,
 });
 }
 await Promise.all([
 tableCheck("profiles"),
 tableCheck("broker_submissions"),
 tableCheck("tradesync_accounts", "warn"),
 tableCheck("trades", "warn"),
 tableCheck("signals", "warn"),
 tableCheck("signal_streams", "warn"),
 tableCheck("signal_updates", "warn"),
 tableCheck("courses", "warn"),
 tableCheck("lessons", "warn"),
 tableCheck("course_progress", "warn"),
 tableCheck("xp_events", "warn"),
 tableCheck("badges", "warn"),
 tableCheck("badge_inventory", "warn"),
 tableCheck("journal_entries", "warn"),
 tableCheck("journal_ai_messages", "warn"),
 tableCheck("ib_allocations", "warn"),
 tableCheck("ib_pulled_accounts", "warn"),
 tableCheck("audit_log", "info"),
 ]);

 // 3. Seed data sanity
 const { count: streamCount } = await supabase.from("signal_streams").select("*", { count: "exact", head: true });
 checks.push({
 name: "seed: signal_streams (Aurex/Vektor/Lux/Retro)",
 ok: (streamCount ?? 0) >= 4,
 detail: `${streamCount ?? 0} streams found, expected ≥4`,
 severity: "warn",
 });

 const { count: courseCount } = await supabase.from("courses").select("*", { count: "exact", head: true });
 checks.push({
 name: "seed: courses",
 ok: (courseCount ?? 0) > 0,
 detail: `${courseCount ?? 0} courses`,
 severity: "info",
 });

 // 4. RPC helpers
 const { error: isStaffErr } = await supabase.rpc("is_staff" as never).single();
 checks.push({
 name: "rpc: is_staff()",
 ok: !isStaffErr,
 detail: isStaffErr ? isStaffErr.message : "callable",
 severity: "fatal",
 });

 // Tally
 const fatals = checks.filter((c) => c.severity === "fatal" && !c.ok);
 const warns = checks.filter((c) => c.severity === "warn" && !c.ok);
 const ready = fatals.length === 0;

 // Manual happy-path checklist
 const HAPPY_PATH = [
 { step: "Sign up with email + password", path: "/signup" },
 { step: "Hit the dashboard, see preview state", path: "/dashboard" },
 { step: "Submit broker verification form", path: "/account/broker" },
 { step: "Run /api/cron/verify-brokers, status flips to active", path: null },
 { step: "Open a course lesson, hit Mark complete, XP awards", path: "/academy" },
 { step: "Visit /signals, see latest signal cards", path: "/signals" },
 { step: "Open a signal, see entry/SL/TPs and updates timeline", path: "/signals" },
 { step: "/tools/journal · Overview tab shows ET Score + metrics", path: "/tools/journal" },
 { step: "/tools/journal/coach · chat streams a response", path: "/tools/journal/coach" },
 { step: "/rewards · leaderboard renders, referral link works", path: "/rewards" },
 { step: "Public profile at /u/[username] loads", path: null },
 { step: "Admin /qa shows all green for fatal+warn", path: "/admin/qa" },
 ];

 const __jsx = (
 <div className="">
 <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
 <div>
 <h1 className="text-2xl font-display font-bold">QA harness</h1>
 <p className="text-sm text-muted-foreground mt-1">
 Closed-beta smoke test. Run before each round of QA, before flipping to public, and after every major migration.
 </p>
 </div>
 <div className={"px-4 py-2 rounded-md uppercase text-xs font-bold "+ (ready ? "bg-green-dim text-green border border-green/30" : "bg-red-dim text-red border border-red/30")}>
 {ready ? "READY" : `${fatals.length} fatal · ${warns.length} warn`}
 </div>
 </div>

 {/* Auto checks */}
 <div className="rounded-xl border border-border bg-surface overflow-hidden mb-6">
 <div className="bg-surface-soft px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-bold">
 Automated checks ({checks.length})
 </div>
 <ol className="divide-y divide-border">
 {checks.map((c, i) => (
 <li key={i} className="flex items-start gap-3 px-4 py-2.5 text-sm">
 <CheckIcon ok={c.ok} severity={c.severity} />
 <div className="flex-1 min-w-0">
 <div className=" text-xs">{c.name}</div>
 <div className={"text-[11px] "+ (c.ok ? "text-muted-foreground" : "text-red")}>{c.detail}</div>
 </div>
 <SeverityBadge severity={c.severity} ok={c.ok} />
 </li>
 ))}
 </ol>
 </div>

 {/* Manual happy path */}
 <div className="rounded-xl border border-border bg-surface overflow-hidden">
 <div className="bg-surface-soft px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground font-bold">
 Manual happy-path walkthrough ({HAPPY_PATH.length} steps)
 </div>
 <ol className="divide-y divide-border">
 {HAPPY_PATH.map((s, i) => (
 <li key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
 <span className="w-6 h-6 rounded-full bg-purple-dim text-purple text-[10px] font-bold grid place-items-center flex-shrink-0">
 {i + 1}
 </span>
 <span className="flex-1">{s.step}</span>
 {s.path && (
 <Link to={s.path} className="text-xs text-purple hover:underline inline-flex items-center gap-1 ">
 Open <ExternalLink className="w-3 h-3" />
 </Link>
 )}
 </li>
 ))}
 </ol>
 </div>

 <div className="mt-6 rounded-md border border-amber/30 bg-amber-dim/40 p-3 flex gap-2 text-xs text-secondary-foreground leading-relaxed">
 <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
 <span>
 Warns marked <strong>info</strong> are V2 features (Bunny.net Stream, Resend) that aren't required for closed beta.
 Warns marked <strong>warn</strong> should be green before public launch but won't break login flows.
 </span>
 </div>
 </div>
 );
        if (!cancelled) { setContent(__jsx); setLoading(false); }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t, navigate]);

  if (loading) return <PageSkeleton />;
  return content;
}
