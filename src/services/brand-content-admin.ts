import { getApi, patchApi, postApi } from "@/services/api";

export type BrandTextRow = {
  key: string;
  field: string;
  label: string;
  group: "disclaimers" | "social" | "partners" | string;
  help: string;
  kind: "text" | "multiline" | "url";
  maxLen: number;
  default: string;
  clientSafe: boolean;
  value: string;
  isDefault: boolean;
};

export function listBrandContent() {
  return getApi<{ settings: BrandTextRow[]; needsMigration?: boolean }>("/api/admin/brand-content");
}

export function updateBrandContent(key: string, value: string) {
  return patchApi<{ ok: boolean; value: string }>(`/api/admin/brand-content/${key}`, { value });
}

export function resetBrandContent(key: string) {
  return postApi<{ ok: boolean; value: string }>(`/api/admin/brand-content/${key}/reset`);
}
