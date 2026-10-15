import { getApi, patchApi, postApi } from "@/services/api";

export type IbRankCondition = {
  metric: string;
  group: "all" | "network";
  threshold: number;
  defaultThreshold: number;
};

export type IbRankRow = {
  slug: string;
  level: number;
  name: string;
  defaultName: string;
  benefits: string[];
  defaultBenefits: string[];
  conditions: IbRankCondition[];
  isDefault: boolean;
};

export type IbRankPatch = {
  name?: string;
  benefits?: string[];
  thresholds?: Record<string, number>;
};

export function listIbRanks() {
  return getApi<{ ranks: IbRankRow[]; needsMigration?: boolean }>("/api/admin/ib-ranks");
}

export function updateIbRank(slug: string, patch: IbRankPatch) {
  return patchApi<{ ok: boolean }>(`/api/admin/ib-ranks/${slug}`, patch);
}

export function resetIbRank(slug: string) {
  return postApi<{ ok: boolean }>(`/api/admin/ib-ranks/${slug}/reset`);
}
