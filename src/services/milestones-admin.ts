import { api, getApi, patchApi, postApi, deleteApi } from "@/services/api";

export type MilestoneTierRow = {
  slug: string;
  name: string;
  threshold: number;
  xp: number;
  defaultName: string;
  defaultThreshold: number;
  defaultXp: number;
  isDefault: boolean;
  icon: string;
  badgeUrl: string;
  badgeReplaced: boolean;
};

export type MilestoneCategoryRow = {
  key: string;
  label: string;
  metric: string;
  unit: string;
  tiers: MilestoneTierRow[];
};

export type MilestonePatch = { name?: string; threshold?: number; xp?: number };

export function listMilestones() {
  return getApi<{ categories: MilestoneCategoryRow[]; bunnyConfigured: boolean; needsMigration?: boolean }>(
    "/api/admin/milestones",
  );
}

export function updateMilestone(slug: string, patch: MilestonePatch) {
  return patchApi<{ ok: boolean }>(`/api/admin/milestones/${slug}`, patch);
}

export function resetMilestone(slug: string) {
  return postApi<{ ok: boolean }>(`/api/admin/milestones/${slug}/reset`);
}

export async function uploadMilestoneBadge(slug: string, file: File): Promise<{ ok: boolean; url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<{ ok: boolean; url: string }>(`/api/admin/milestones/${slug}/badge`, fd);
  return data;
}

export function revertMilestoneBadge(slug: string) {
  return deleteApi<{ ok: boolean }>(`/api/admin/milestones/${slug}/badge`);
}
