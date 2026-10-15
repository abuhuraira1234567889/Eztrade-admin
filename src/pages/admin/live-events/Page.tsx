"use client";

import { Link } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { TIER_NAMES } from "@/lib/constants";
import { formatDurationMs, getLiveSessionTiming } from "@/lib/live/session-timing";

type EventRowData = {
  id: string;
  slug: string | null;
  title: string;
  host_name: string | null;
  starts_at: string;
  ends_at: string;
  tier_min: number;
  is_published: boolean;
  recurrence: string;
  series_id: string | null;
};

// Meta shown on a collapsed series card: which weekdays it runs on + how many
// occurrences exist across the whole series.
type SeriesMeta = { weekdays: number[]; count: number };

// One rendered card: a representative occurrence for the section (live / next
// upcoming / most recent past) plus optional series meta when it's a series.
type SectionEntry = { rep: EventRowData; series?: SeriesMeta };

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Human label for the weekday set a daily series runs on. */
function formatWeekdays(days: number[]): string {
  const set = new Set(days);
  if (set.size === 7) return "Every day";
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "Mon–Fri";
  // Mon-first order, weekends last.
  return [1, 2, 3, 4, 5, 6, 0]
    .filter((d) => set.has(d))
    .map((d) => DOW[d])
    .join(", ");
}

function AdminEventRow({
  entry,
  now,
}: {
  entry: SectionEntry;
  now: number;
}) {
  const { t } = useTranslation("live");
  const event = entry.rep;
  const isPast = new Date(event.ends_at).getTime() < now;
  const timing = getLiveSessionTiming(event.starts_at, event.ends_at, now);
  const countdown =
    !isPast && !timing.isLive && timing.msUntilStart > 0
      ? formatDurationMs(timing.msUntilStart, t, "starts")
      : !isPast && !timing.joinOpens
        ? formatDurationMs(timing.msUntilJoinOpens, t, "opens")
        : null;

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-soft transition">
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground truncate">{event.title}</span>
          {timing.isLive && !isPast && (
            <span className="text-[10px] font-semibold bg-red-500/15 text-red-600 rounded-full px-2 py-0.5 uppercase animate-pulse">
              Live now
            </span>
          )}
          {event.is_published ? (
            <span className="text-[10px] font-semibold bg-green-500/15 text-green-600 rounded-full px-2 py-0.5">Published</span>
          ) : (
            <span className="text-[10px] font-semibold bg-yellow-500/15 text-yellow-600 rounded-full px-2 py-0.5">Draft</span>
          )}
          {event.recurrence && event.recurrence !== "once" && (
            <span className="text-[10px] font-semibold bg-blue-500/15 text-blue-600 rounded-full px-2 py-0.5">{event.recurrence}</span>
          )}
          {entry.series && entry.series.count > 1 && (
            <span className="text-[10px] font-semibold bg-purple/15 text-purple rounded-full px-2 py-0.5">
              {entry.series.count} sessions
            </span>
          )}
          <span className="text-[10px] font-semibold bg-surface-raised text-muted-foreground rounded-full px-2 py-0.5">
            Min {TIER_NAMES[event.tier_min] ?? event.tier_min}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {event.host_name && <span className="mr-2">{event.host_name}</span>}
          <span>{new Date(event.starts_at).toLocaleString()}</span>
          {countdown && <span className="ml-2 text-purple">· {countdown}</span>}
          {isPast && <span className="ml-2 text-muted-foreground/60">(past)</span>}
        </div>
        {entry.series && (
          <div className="text-[11px] text-muted-foreground/80">
            Runs {formatWeekdays(entry.series.weekdays)} · {entry.series.count}{" "}
            session{entry.series.count === 1 ? "" : "s"} in this series
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          to={`/admin/live-events/${event.id}`}
          className="text-xs text-purple hover:underline"
        >
          Edit / Delete
        </Link>
      </div>
    </li>
  );
}

/**
 * Collapse occurrences into one entry per series and slot each series into the
 * sections it has occurrences for. A daily series can appear in all three at
 * once: its live occurrence in "Live now", its next future one in "Upcoming",
 * and its most recent finished one in "Past". Standalone sessions (no series_id)
 * stay individual and land in exactly one section by their own timing.
 */
function buildSections(events: EventRowData[], now: number): {
  liveNow: SectionEntry[];
  upcoming: SectionEntry[];
  past: SectionEntry[];
} {
  const groups = new Map<string, EventRowData[]>();
  for (const e of events) {
    const key = e.series_id ?? `single:${e.id}`;
    const arr = groups.get(key);
    if (arr) arr.push(e);
    else groups.set(key, [e]);
  }

  const liveNow: SectionEntry[] = [];
  const upcoming: SectionEntry[] = [];
  const past: SectionEntry[] = [];

  for (const occs of groups.values()) {
    const sorted = [...occs].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
    const isSeries = !!sorted[0].series_id;
    const series: SeriesMeta | undefined = isSeries
      ? {
          weekdays: [...new Set(sorted.map((o) => new Date(o.starts_at).getDay()))],
          count: sorted.length,
        }
      : undefined;

    const liveOcc = sorted.find(
      (o) => getLiveSessionTiming(o.starts_at, o.ends_at, now).isLive,
    );
    // Next future occurrence that isn't the currently-live one.
    const upcomingOcc = sorted.find(
      (o) =>
        new Date(o.ends_at).getTime() >= now &&
        !getLiveSessionTiming(o.starts_at, o.ends_at, now).isLive,
    );
    // Most recent finished occurrence.
    const pastOccs = sorted.filter((o) => new Date(o.ends_at).getTime() < now);
    const pastOcc = pastOccs.length ? pastOccs[pastOccs.length - 1] : undefined;

    if (liveOcc) liveNow.push({ rep: liveOcc, series });
    if (upcomingOcc) upcoming.push({ rep: upcomingOcc, series });
    if (pastOcc) past.push({ rep: pastOcc, series });
  }

  liveNow.sort(
    (a, b) => new Date(a.rep.starts_at).getTime() - new Date(b.rep.starts_at).getTime(),
  );
  // Soonest next session first.
  upcoming.sort(
    (a, b) => new Date(a.rep.starts_at).getTime() - new Date(b.rep.starts_at).getTime(),
  );
  // Most recently finished first.
  past.sort(
    (a, b) => new Date(b.rep.ends_at).getTime() - new Date(a.rep.ends_at).getTime(),
  );

  return { liveNow, upcoming, past };
}

export default function AdminLiveEventsPage() {
  const [events, setEvents] = useState<EventRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        // Latest sessions on top: most recently CREATED first (so a session you
        // just added shows at the top regardless of its scheduled date), then
        // by start time for batch/recurring sessions, id as a stable tiebreak.
        // Page through EVERYTHING: a single capped request starved the list
        // when one big series (up to 1000 rows) filled the whole window and
        // every other session silently vanished from this page.
        const PAGE = 1000;
        const all: EventRowData[] = [];
        for (let from = 0; from < 20_000; from += PAGE) {
          const { data: page } = await supabase
            .from("live_events")
            .select(
              "id, slug, title, host_name, starts_at, ends_at, tier_min, is_published, recurrence, series_id",
            )
            .order("created_at", { ascending: false })
            .order("starts_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, from + PAGE - 1);
          const rows = (page ?? []) as EventRowData[];
          all.push(...rows);
          if (rows.length < PAGE) break;
        }
        if (!cancelled) {
          setEvents(all);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageSkeleton />;

  const { liveNow, upcoming, past } = buildSections(events, now);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Live sessions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule sessions here. Members join through the Zoom link you set on each session.
          </p>
        </div>
        <Link
          to="/admin/live-events/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple/90 transition"
        >
          + New session
        </Link>
      </div>

      {liveNow.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase text-muted-foreground font-bold mb-3">
            Live now ({liveNow.length})
          </h2>
          <ul className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
            {liveNow.map((e) => (
              <AdminEventRow key={`live:${e.rep.series_id ?? e.rep.id}`} entry={e} now={now} />
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-xs uppercase text-muted-foreground font-bold mb-3">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-soft px-4 py-8 text-center text-sm text-muted-foreground">
            No upcoming sessions. Create one above.
          </div>
        ) : (
          <ul className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
            {upcoming.map((e) => (
              <AdminEventRow key={`up:${e.rep.series_id ?? e.rep.id}`} entry={e} now={now} />
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
            {past.slice(0, 20).map((e) => (
              <AdminEventRow key={`past:${e.rep.series_id ?? e.rep.id}`} entry={e} now={now} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
