import { createClient } from "@/lib/supabase/client";
import { normalizeBannerPath } from "@/pages/admin/live-events/session-banners";
import { parseTierMin } from "@/lib/tier";

const REPEAT_CADENCES = new Set(["daily", "weekly", "monthly"]);
// ponytail: each occurrence costs one slug-uniqueness query, so keep A ceiling
// (typo protection) - raise it further if 1000 is ever actually hit.
const MAX_OCCURRENCES = 1000;
const DEFAULT_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function slugDatePart(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse the posted `days` list ("1,2,4") into a valid weekday set (0–6). */
function parseDays(raw: unknown): number[] {
  const parsed = String(raw ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const unique = [...new Set(parsed)];
  return unique.length ? unique : DEFAULT_DAYS;
}

/**
 * Start instants for a series. Weekly/monthly step by fixed intervals from the
 * chosen start. Daily runs only on the selected weekdays (default Mon–Fri):
 * walk forward day by day from the start and keep each date whose weekday is
 * ticked, until `count` sessions are collected. Time-of-day is preserved.
 */
function computeOccurrenceStarts(
  start: Date,
  cadence: string,
  count: number,
  days: number[],
): Date[] {
  if (cadence === "daily") {
    const allowed = new Set(days.length ? days : DEFAULT_DAYS);
    const out: Date[] = [];
    const d = new Date(start);
    // Bounded walk so an empty/degenerate day set can never loop forever, but
    // long enough that MAX_OCCURRENCES stays reachable even with one selected
    // weekday (1000 * 7 = 7000 days).
    for (let guard = 0; out.length < count && guard < 366 * 20; guard++) {
      if (allowed.has(d.getDay())) out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    if (cadence === "weekly") d.setDate(d.getDate() + 7 * i);
    else if (cadence === "monthly") d.setMonth(d.getMonth() + i);
    out.push(d);
  }
  return out;
}

function parseEventInstant(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function ensureUniqueSlug(
  supabase: ReturnType<typeof createClient>,
  baseSlug: string,
  excludeId?: string | null,
): Promise<string> {
  const root = baseSlug.slice(0, 80);
  let candidate = root;

  for (let n = 2; n <= 99; n++) {
    const { data } = await supabase.from("live_events").select("id").eq("slug", candidate).maybeSingle();
    const row = data as { id: string } | null;
    if (!row || (excludeId && row.id === excludeId)) return candidate;
    candidate = `${root}-${n}`.slice(0, 80);
  }
  return candidate;
}

type UpsertBody = {
  id?: string;
  title?: string;
  description?: string | null;
  topic?: string | null;
  host_name?: string | null;
  starts_at?: string;
  ends_at?: string;
  transcript_url?: string | null;
  recording_url?: string | null;
  banner_image_url?: string | null;
  language?: string;
  tier_min?: number;
  recurrence?: string;
  is_published?: boolean;
  slug?: string | null;
  repeat?: string;
  occurrences?: number;
  days?: string | number[];
  zoom_join_url?: string | null;
  delivery_mode?: string;
};

/** Staff RLS write - avoids backend API auth for basic session CRUD. */
export async function upsertLiveEventDirect(
  body: UpsertBody,
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You are not signed in. Please log in again." };

  const id = body.id?.trim() || null;
  const title = String(body.title ?? "").trim();
  const description = body.description?.trim() || null;
  const topic = body.topic?.trim() || null;
  const host_name = body.host_name?.trim() || null;
  const starts_at = String(body.starts_at ?? "").trim();
  const ends_at = String(body.ends_at ?? "").trim();
  const transcript_url = body.transcript_url?.trim() || "";
  const recording_url = body.recording_url?.trim() || null;
  const banner_image_url = normalizeBannerPath(body.banner_image_url?.trim());
  const language = (body.language ?? "en").trim();
  const tier_min = parseTierMin(body.tier_min, 1);
  const recurrence = (body.recurrence ?? "once").trim();
  const is_published = !!body.is_published;
  // Sessions are Zoom-only now; the in-platform stream was removed.
  const delivery_mode = "zoom";
  const zoom_join_url = body.zoom_join_url?.trim() || null;

  const repeatRaw = (body.repeat ?? "none").trim();
  const repeat = REPEAT_CADENCES.has(repeatRaw) ? repeatRaw : "none";
  const days = parseDays(Array.isArray(body.days) ? body.days.join(",") : body.days);
  const occurrencesRaw = Number(body.occurrences ?? 1);
  const occurrences = Number.isFinite(occurrencesRaw)
    ? Math.min(Math.max(Math.trunc(occurrencesRaw), 1), MAX_OCCURRENCES)
    : 1;

  if (!title || !starts_at || !ends_at) {
    return { ok: false, error: "Title, start, and end times are required." };
  }

  const startDate = parseEventInstant(starts_at);
  const endDate = parseEventInstant(ends_at);
  if (!startDate || !endDate) {
    return {
      ok: false,
      error:
        "Start and end times must be valid datetimes. Refresh the page and try again.",
    };
  }
  if (endDate.getTime() <= startDate.getTime()) {
    return { ok: false, error: "End time must be after start time." };
  }

  const customSlug = (body.slug ?? "").trim();
  const baseSlug = customSlug || `${slugify(title)}-${slugDatePart(starts_at)}`;

  const baseRow = {
    title,
    description,
    topic,
    host_name,
    transcript_url,
    recording_url,
    banner_image_url,
    language,
    tier_min,
    recurrence,
    is_published,
    delivery_mode,
    zoom_join_url,
    host_user_id: user.id,
  };

  if (id) {
    const slug = await ensureUniqueSlug(supabase, baseSlug, id);
    // Content shared by every occurrence in a series. Per-occurrence fields
    // (starts_at/ends_at/slug/series_id) are handled separately below.
    const sharedFields = {
      title,
      description,
      topic,
      host_name,
      transcript_url,
      recording_url,
      banner_image_url,
      language,
      tier_min,
      recurrence,
      is_published,
      delivery_mode,
      zoom_join_url,
    };

    // A series edit applies to every occurrence: shared content is copied
    // verbatim, and the new time-of-day + duration is applied to each on its
    // OWN date. The edited occurrence keeps exactly the date/time/slug entered.
    const { data: current } = await supabase
      .from("live_events")
      .select("series_id")
      .eq("id", id)
      .maybeSingle();
    const seriesId =
      (current as { series_id: string | null } | null)?.series_id ?? null;

    if (seriesId) {
      const { data: siblings } = await supabase
        .from("live_events")
        .select("id, starts_at")
        .eq("series_id", seriesId);
      const durationMs = endDate.getTime() - startDate.getTime();
      const rows = (siblings ?? []) as Array<{ id: string; starts_at: string }>;
      for (const sib of rows) {
        const isEdited = sib.id === id;
        const occStart = isEdited ? new Date(startDate) : new Date(sib.starts_at);
        if (!isEdited) {
          // Keep this occurrence's own date; move it to the new wall-clock time.
          occStart.setHours(
            startDate.getHours(),
            startDate.getMinutes(),
            startDate.getSeconds(),
            startDate.getMilliseconds(),
          );
        }
        const occEnd = new Date(occStart.getTime() + durationMs);
        const { error } = await supabase
          .from("live_events")
          .update({
            ...sharedFields,
            starts_at: occStart.toISOString(),
            ends_at: occEnd.toISOString(),
            ...(isEdited ? { slug } : {}),
          })
          .eq("id", sib.id);
        if (error) return { ok: false, error: error.message };
      }
      return { ok: true, ids: rows.map((r) => r.id) };
    }

    const { error } = await supabase
      .from("live_events")
      .update({
        ...sharedFields,
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        slug,
      })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, ids: [id] };
  }

  if (repeat !== "none" && occurrences > 1) {
    const occStarts = computeOccurrenceStarts(startDate, repeat, occurrences, days);
    if (occStarts.length === 0) {
      return {
        ok: false,
        error: "Pick at least one weekday for a daily series.",
      };
    }
    const seriesId = crypto.randomUUID();
    const durationMs = endDate.getTime() - startDate.getTime();
    const rows = [];
    for (let i = 0; i < occStarts.length; i++) {
      const occStart = occStarts[i];
      const occEnd = new Date(occStart.getTime() + durationMs);
      const occSlugBase = customSlug
        ? `${customSlug}-${i + 1}`
        : `${slugify(title)}-${slugDatePart(occStart.toISOString())}`;
      const occSlug = await ensureUniqueSlug(supabase, occSlugBase);
      rows.push({
        ...baseRow,
        starts_at: occStart.toISOString(),
        ends_at: occEnd.toISOString(),
        slug: occSlug,
        series_id: seriesId,
      });
    }
    const { data: insertedRows, error } = await supabase
      .from("live_events")
      .insert(rows)
      .select("id");
    if (error) return { ok: false, error: error.message };
    return { ok: true, ids: (insertedRows ?? []).map((r) => r.id as string) };
  }

  const slug = await ensureUniqueSlug(supabase, baseSlug);
  const { data: inserted, error } = await supabase
    .from("live_events")
    .insert({
      ...baseRow,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      slug,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, ids: [inserted.id as string] };
}

export async function deleteLiveEventDirect(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id.trim()) return { ok: false, error: "Missing session id." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You are not signed in. Please log in again." };

  // Deleting any occurrence removes the whole series it belongs to; a standalone
  // session (no series_id) deletes just itself.
  const { data: row } = await supabase
    .from("live_events")
    .select("series_id")
    .eq("id", id)
    .maybeSingle();
  const seriesId = (row as { series_id: string | null } | null)?.series_id ?? null;

  const { error } = seriesId
    ? await supabase.from("live_events").delete().eq("series_id", seriesId)
    : await supabase.from("live_events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
