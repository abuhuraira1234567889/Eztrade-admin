import { api, getApi, deleteApi } from "@/services/api";

export type AssetItemRow = {
  key: string;
  label: string;
  path: string;
  accept: string[];
  replaced: boolean;
  url: string;
  updatedAt: string | null;
};
export type AssetSlotRow = { slot: string; label: string; group: string; items: AssetItemRow[] };

export function listAssets() {
  return getApi<{ slots: AssetSlotRow[]; bunnyConfigured: boolean; needsMigration?: boolean }>(
    "/api/admin/assets",
  );
}

export async function uploadAsset(slot: string, item: string, file: File): Promise<{ ok: boolean; url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post<{ ok: boolean; url: string }>(
    `/api/admin/assets/${slot}/${item}`,
    fd,
  );
  return data;
}

export function revertAsset(slot: string, item: string) {
  return deleteApi<{ ok: boolean }>(`/api/admin/assets/${slot}/${item}`);
}
