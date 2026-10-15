import { getApi, patchApi, deleteApi } from "@/services/api";

export type EmailVar = { name: string; description: string };

export type EmailTemplateRow = {
  slug: string;
  label: string;
  description: string;
  variables: EmailVar[];
  hasCta: boolean;
  defaultSubject: string;
  defaultTitle: string;
  defaultBody: string;
  defaultCtaLabel: string | null;
  // Effective values the editor pre-fills with (override if present, else default).
  subject: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  hasOverride: boolean;
  updatedAt: string | null;
};

export type EmailTemplatePatch = { subject?: string; title?: string; body?: string; ctaLabel?: string };

export function listEmailTemplates() {
  return getApi<{ templates: EmailTemplateRow[]; needsMigration?: boolean }>("/api/admin/email-templates");
}

export function updateEmailTemplate(slug: string, patch: EmailTemplatePatch) {
  return patchApi<{ ok: boolean }>(`/api/admin/email-templates/${slug}`, patch);
}

export function resetEmailTemplate(slug: string) {
  return deleteApi<{ ok: boolean }>(`/api/admin/email-templates/${slug}`);
}
