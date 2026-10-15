import { createClient } from "@/lib/supabase/client";
import { datetimeLocalToIso } from "@/lib/datetime-local";

const ALLOWED_KINDS = new Set([
  "league",
  "referral_race",
  "best_analysis",
  "custom",
]);
const ALLOWED_ENTRY_MODES = new Set(["auto", "manual"]);
const THUMBNAIL_BUCKET = "competition-thumbnails";
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
const ALLOWED_THUMBNAIL_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

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

function parseOptionalNumber(raw: unknown): number | undefined {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function parseConditions(raw: unknown): Array<{ metric: string; op: string; value: number }> {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is { metric: string; op: string; value: number } =>
        !!x &&
        typeof x === "object" &&
        typeof (x as { metric?: unknown }).metric === "string" &&
        typeof (x as { op?: unknown }).op === "string" &&
        typeof (x as { value?: unknown }).value === "number",
    );
  } catch {
    return [];
  }
}

/** Build the `rules` jsonb from structured form fields. */
export function buildCompetitionRules(formData: FormData): Record<string, unknown> | null {
  const rules: Record<string, unknown> = {};
  const minTrades = parseOptionalNumber(formData.get("rule_min_trades"));
  const topWinners = parseOptionalNumber(formData.get("rule_top_winners"));
  const prizePoolUsd = parseOptionalNumber(formData.get("rule_prize_pool_usd"));
  const maxDrawdownPct = parseOptionalNumber(formData.get("rule_max_drawdown_pct"));
  const tierMin = parseOptionalNumber(formData.get("rule_tier_min"));
  const details = String(formData.get("rule_details") ?? "").trim();
  const conditions = parseConditions(formData.get("rule_conditions"));

  if (minTrades !== undefined) rules.min_trades = minTrades;
  if (topWinners !== undefined) rules.top_winners = topWinners;
  if (prizePoolUsd !== undefined) rules.prize_pool_usd = prizePoolUsd;
  if (maxDrawdownPct !== undefined) rules.max_drawdown_pct = maxDrawdownPct;
  if (tierMin !== undefined) rules.tier_min = tierMin;
  if (details) rules.details = details;
  if (conditions.length) rules.conditions = conditions;

  return Object.keys(rules).length ? rules : null;
}

async function ensureUniqueSlug(
  supabase: ReturnType<typeof createClient>,
  baseSlug: string,
  excludeId?: string | null,
): Promise<string> {
  const root = (baseSlug || "competition").slice(0, 80);
  let candidate = root;

  for (let n = 2; n <= 99; n++) {
    const { data } = await supabase
      .from("competitions")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    const row = data as { id: string } | null;
    if (!row || (excludeId && row.id === excludeId)) return candidate;
    candidate = `${root}-${n}`.slice(0, 80);
  }
  return `${root}-${Date.now()}`.slice(0, 80);
}

type UpsertBody = {
  id?: string | null;
  name: string;
  slug?: string | null;
  description?: string | null;
  kind: string;
  starts_at: string;
  ends_at: string;
  prize_pool_label?: string | null;
  thumbnail_url?: string | null;
  entry_mode?: string | null;
  is_active: boolean;
  rules?: Record<string, unknown> | null;
};

/** Staff RLS write - same pattern as live-events admin CRUD. */
export async function upsertCompetitionDirect(
  body: UpsertBody,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You are not signed in. Please log in again." };

  const id = body.id?.trim() || null;
  const name = String(body.name ?? "").trim();
  const description = body.description?.trim() || null;
  const kindRaw = String(body.kind ?? "custom").trim();
  const kind = ALLOWED_KINDS.has(kindRaw) ? kindRaw : "custom";
  const entryModeRaw = String(body.entry_mode ?? "auto").trim();
  const entry_mode = ALLOWED_ENTRY_MODES.has(entryModeRaw) ? entryModeRaw : "auto";
  const starts_at = datetimeLocalToIso(String(body.starts_at ?? "").trim());
  const ends_at = datetimeLocalToIso(String(body.ends_at ?? "").trim());
  const prize_pool_label = body.prize_pool_label?.trim() || null;
  const thumbnail_url = body.thumbnail_url?.trim() || null;
  const is_active = !!body.is_active;
  const rules = body.rules ?? null;

  if (!name || !starts_at || !ends_at) {
    return { ok: false, error: "Name, start, and end times are required." };
  }

  const startDate = new Date(starts_at);
  const endDate = new Date(ends_at);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { ok: false, error: "Start and end times must be valid datetimes." };
  }
  if (endDate.getTime() <= startDate.getTime()) {
    return { ok: false, error: "End time must be after start time." };
  }

  const customSlug = (body.slug ?? "").trim();
  const baseSlug = customSlug || `${slugify(name)}-${slugDatePart(starts_at)}`;

  const row = {
    name,
    description,
    kind,
    starts_at: startDate.toISOString(),
    ends_at: endDate.toISOString(),
    prize_pool_label,
    thumbnail_url,
    entry_mode,
    is_active,
    rules,
  };

  if (id) {
    const slug = await ensureUniqueSlug(supabase, baseSlug, id);
    const { error } = await supabase
      .from("competitions")
      .update({ ...row, slug } as never)
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, id };
  }

  const slug = await ensureUniqueSlug(supabase, baseSlug);
  const { data: inserted, error } = await supabase
    .from("competitions")
    .insert({ ...row, slug } as never)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (inserted as { id: string }).id };
}

export async function deleteCompetitionDirect(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id.trim()) return { ok: false, error: "Missing competition id." };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You are not signed in. Please log in again." };

  const { error } = await supabase.from("competitions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function uploadCompetitionThumbnailDirect(
  file: File,
  competitionId?: string | null,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Choose an image file to upload." };
  }
  if (!ALLOWED_THUMBNAIL_TYPES.has(file.type)) {
    return { ok: false, error: "Use a PNG, JPEG, WebP, or GIF image." };
  }
  if (file.size > MAX_THUMBNAIL_BYTES) {
    return { ok: false, error: "Image must be 5 MB or smaller." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You are not signed in. Please log in again." };

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";
  const folder = competitionId?.trim() || "drafts";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) return { ok: false, error: error.message };

  const { data: pub } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) return { ok: false, error: "Upload succeeded but no public URL was returned." };
  return { ok: true, url: pub.publicUrl };
}
