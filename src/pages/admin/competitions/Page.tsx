"use client";

import { Link } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";

/**
 * Admin competitions list. Mirrors /admin/live-events: upcoming/active group
 * at the top, ended group below, single-line rows with name + kind + dates
 * + active pill. The edit/delete actions live on the detail page.
 */

import { useEffect, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type CompType = {
  id: string;
  slug: string | null;
  name: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  thumbnail_url: string | null;
  prize_pool_label: string | null;
};

function CompRow({ comp, memberCount }: { comp: CompType; memberCount: number }) {
  const isLive = comp.is_active && new Date(comp.ends_at).getTime() >= Date.now();
  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-surface-soft transition">
      <div className="flex-1 min-w-0">
        <Link
          to={`/admin/competitions/${comp.id}`}
          className="text-sm font-semibold text-foreground hover:text-purple transition truncate block"
        >
          {comp.name}
        </Link>
        <div className="text-xs text-muted-foreground mt-0.5">
          {comp.kind} &middot; {new Date(comp.starts_at).toLocaleDateString()} – {new Date(comp.ends_at).toLocaleDateString()}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-muted-foreground">{memberCount} members</span>
        {isLive && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-500 font-semibold uppercase">
            Live
          </span>
        )}
        {!comp.is_active && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold uppercase">
            Inactive
          </span>
        )}
      </div>
    </li>
  );
}

export default function AdminCompetitionsPage() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const [content, setContent] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();

 const { data: compsData } = await supabase
 .from("competitions")
 .select("id, slug, name, kind, starts_at, ends_at, is_active, thumbnail_url, prize_pool_label")
 .order("starts_at", { ascending: false })
 .limit(200);

 const comps = (compsData ?? []) as unknown as Array<{
 id: string;
 slug: string | null;
 name: string;
 kind: string;
 starts_at: string;
 ends_at: string;
 is_active: boolean;
 thumbnail_url: string | null;
 prize_pool_label: string | null;
 }>;

 // For each competition we want a quick "member count" - the number of rows
 // in competition_entries. Pull them all in one query and bucket client-side
 // rather than fanning out N COUNT() queries.
 const ids = comps.map((c) => c.id);
 const counts: Record<string, number> = {};
 if (ids.length > 0) {
 const { data: entries } = await supabase
 .from("competition_entries")
 .select("competition_id")
 .in("competition_id", ids);
 for (const e of (entries ?? []) as Array<{ competition_id: string }>) {
 counts[e.competition_id] = (counts[e.competition_id] ?? 0) + 1;
 }
 }

 const now = Date.now();
 const liveOrUpcoming = comps.filter((c) => new Date(c.ends_at).getTime() >= now);
 const past = comps.filter((c) => new Date(c.ends_at).getTime() < now);

 const __jsx = (
 <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
 <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
 <div>
 <h1 className="text-2xl font-display font-bold">Competitions</h1>
 <p className="text-sm text-muted-foreground mt-1">
 Schedule contests, set the prize pool, add a thumbnail. Members see active competitions on /rewards/competitions.
 </p>
 </div>
 <Link
 to="/admin/competitions/new"
 className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple/90 transition"
 >
 + New competition
 </Link>
 </div>

 <section className="mb-8">
 <h2 className="text-xs uppercase text-muted-foreground font-bold mb-3">
 Live + upcoming ({liveOrUpcoming.length})
 </h2>
 {liveOrUpcoming.length === 0 ? (
 <div className="rounded-xl border border-dashed border-border bg-surface-soft px-4 py-8 text-center text-sm text-muted-foreground">
 No live or upcoming competitions. Create one above.
 </div>
 ) : (
 <ul className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
 {liveOrUpcoming.map((c) => (
 <CompRow key={c.id} comp={c} memberCount={counts[c.id] ?? 0} />
 ))}
 </ul>
 )}
 </section>

 {past.length > 0 && (
 <section>
 <h2 className="text-xs uppercase text-muted-foreground font-bold mb-3">
 Past ({past.length})
 </h2>
 <ul className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
 {past.slice(0, 50).map((c) => (
 <CompRow key={c.id} comp={c} memberCount={counts[c.id] ?? 0} />
 ))}
 </ul>
 </section>
 )}
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
