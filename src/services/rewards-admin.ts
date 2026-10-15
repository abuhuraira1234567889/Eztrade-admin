import { createClient } from "@/lib/supabase/client";
import { getApi, postApi, patchApi, deleteApi } from "@/services/api";

/** One XP-shop reward (prizes row). */
export type Prize = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string;
  xp_cost: number;
  retail_value_usd: number | null;
  stock: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PrizeInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  category?: string | null;
  xp_cost?: number;
  retail_value_usd?: number | null;
  stock?: number | null;
  is_active?: boolean;
  image_url?: string | null;
};

/** The shop groups rewards by these; the member page builds its filter from
 *  whatever categories the active rewards actually use. */
export const SHOP_CATEGORIES = [
  "Tech",
  "Subscriptions",
  "Experiences",
  "Gaming",
  "Merch",
  "Other",
] as const;

export function listPrizes() {
  return getApi<{ prizes: Prize[] }>("/api/admin/prizes");
}

export function createPrize(body: PrizeInput) {
  return postApi<{ ok: boolean; id?: string; error?: string }>("/api/admin/prizes", body);
}

export function updatePrize(id: string, body: PrizeInput) {
  return patchApi<{ ok: boolean; error?: string }>(`/api/admin/prizes/${id}`, body);
}

export function deletePrize(id: string) {
  return deleteApi<{ ok: boolean; error?: string }>(`/api/admin/prizes/${id}`);
}

const REWARD_IMAGE_BUCKET = "reward-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/**
 * Upload a reward image straight to the public `reward-images` storage bucket
 * and return its public URL (stored on prizes.image_url). Same browser-direct,
 * staff-RLS pattern as the competition thumbnail upload.
 */
export async function uploadRewardImageDirect(
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Choose an image file to upload." };
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: "Use a PNG, JPEG, WebP, or GIF image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
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
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(REWARD_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) return { ok: false, error: error.message };

  const { data: pub } = supabase.storage.from(REWARD_IMAGE_BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) {
    return { ok: false, error: "Upload succeeded but no public URL was returned." };
  }
  return { ok: true, url: pub.publicUrl };
}
