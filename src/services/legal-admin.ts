import { getApi, patchApi, deleteApi } from "@/services/api";

export type LegalDocRow = {
  slug: string;
  defaultTitle: string;
  title: string;
  body: string;
  isPublished: boolean;
  hasOverride: boolean;
  /** The current built-in page content (markdown) — used to pre-fill the editor. */
  builtinTitle: string;
  builtinBody: string;
  updatedAt: string | null;
};

export type LegalPatch = { title?: string; body?: string; isPublished?: boolean };

export function listLegal() {
  return getApi<{ docs: LegalDocRow[]; needsMigration?: boolean }>("/api/admin/legal");
}

export function updateLegal(slug: string, patch: LegalPatch) {
  return patchApi<{ ok: boolean }>(`/api/admin/legal/${slug}`, patch);
}

export function removeLegal(slug: string) {
  return deleteApi<{ ok: boolean }>(`/api/admin/legal/${slug}`);
}
