import { getApi, patchApi, postApi } from "@/services/api";

/** One tunable platform setting: its definition (from the backend registry) + live value. */
export type SettingRow = {
  key: string;
  field: string;
  label: string;
  group: "gamification" | "compliance" | "limits" | string;
  help: string;
  type: "int" | "float";
  min: number;
  max: number;
  default: number;
  unit?: string;
  clientSafe: boolean;
  value: number;
  isDefault: boolean;
};

export function listSettings() {
  return getApi<{ settings: SettingRow[]; needsMigration?: boolean }>("/api/admin/settings");
}

export function updateSetting(key: string, value: number) {
  return patchApi<{ ok: boolean; value: number }>(`/api/admin/settings/${key}`, { value });
}

export function resetSetting(key: string) {
  return postApi<{ ok: boolean; value: number }>(`/api/admin/settings/${key}/reset`);
}
