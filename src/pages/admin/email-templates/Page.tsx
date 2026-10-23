"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, RotateCcw, Eye, EyeOff } from "lucide-react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import {
  listEmailTemplates,
  updateEmailTemplate,
  resetEmailTemplate,
  type EmailTemplateRow,
} from "@/services/email-templates-admin";

const inputCls =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm outline-none focus:border-purple";

type Draft = { subject: string; title: string; body: string; ctaLabel: string };

function toDraft(t: EmailTemplateRow): Draft {
  return { subject: t.subject, title: t.title, body: t.body, ctaLabel: t.ctaLabel ?? "" };
}

/** Fill {{var}} / {{#var}}…{{/var}} with example values for the preview only. */
function previewHtml(body: string, vars: { name: string }[]): string {
  const sample: Record<string, string> = {};
  for (const v of vars) sample[v.name] = `[${v.name}]`;
  const withSections = body.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_m, _k: string, inner: string) => inner,
  );
  return withSections.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => sample[k] ?? `[${k}]`);
}

export default function AdminEmailTemplatesPage() {
  const [rows, setRows] = useState<EmailTemplateRow[] | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [active, setActive] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  async function load() {
    const res = await listEmailTemplates();
    setRows(res.templates);
    setNeedsMigration(!!res.needsMigration);
    setDrafts(Object.fromEntries(res.templates.map((t) => [t.slug, toDraft(t)])));
    if (res.templates[0] && !res.templates.some((t) => t.slug === active)) setActive(res.templates[0].slug);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e?.message ?? "Failed to load email templates"));
  }, []);

  const current = useMemo(() => rows?.find((t) => t.slug === active) ?? null, [rows, active]);

  if (!rows) return <PageSkeleton />;

  function patch(up: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [active]: { ...d[active], ...up } }));
  }

  async function save() {
    if (!current) return;
    const d = drafts[active];
    if (!d.subject.trim() || !d.body.trim()) return toast.error("Subject and body can't be empty.");
    setBusy(true);
    try {
      await updateEmailTemplate(active, {
        subject: d.subject,
        title: d.title,
        body: d.body,
        ...(current.hasCta ? { ctaLabel: d.ctaLabel } : {}),
      });
      toast.success(`${current.label} saved.`);
      setRows((prev) =>
        (prev ?? []).map((x) =>
          x.slug === active
            ? { ...x, subject: d.subject, title: d.title, body: d.body, ctaLabel: current.hasCta ? d.ctaLabel : null, hasOverride: true }
            : x,
        ),
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!current) return;
    setBusy(true);
    try {
      await resetEmailTemplate(active);
      toast.success(`${current.label} reset to default.`);
      setRows((prev) =>
        (prev ?? []).map((x) =>
          x.slug === active
            ? {
                ...x,
                subject: x.defaultSubject,
                title: x.defaultTitle,
                body: x.defaultBody,
                ctaLabel: x.defaultCtaLabel,
                hasOverride: false,
              }
            : x,
        ),
      );
      setDrafts((d) => ({
        ...d,
        [active]: {
          subject: current.defaultSubject,
          title: current.defaultTitle,
          body: current.defaultBody,
          ctaLabel: current.defaultCtaLabel ?? "",
        },
      }));
    } catch (e: any) {
      toast.error(e?.message ?? "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  const d = drafts[active];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Email templates</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          The subject, title and body of each member email. Edit from the current content and Save to
          use your own version; Reset restores the built-in default. The shared header/footer branding
          lives under <span className="font-medium">Brand content → Email branding</span>. Changes apply
          live (within ~60s). Use <code className="text-xs">{"{{variable}}"}</code> placeholders - they're
          filled per member at send time.
        </p>
      </div>

      {needsMigration && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Showing defaults - the <code className="text-xs">email_templates</code> table isn’t in the
          database yet. Run <code className="text-xs">schema/190_email_templates.sql</code> in Supabase.
        </div>
      )}

      <div className="grid md:grid-cols-[220px_1fr] gap-5">
        {/* Template list */}
        <div className="flex md:flex-col gap-1.5 flex-wrap md:flex-nowrap">
          {rows.map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => setActive(t.slug)}
              className={
                "text-left px-3 py-2 rounded-lg text-sm border transition " +
                (t.slug === active
                  ? "bg-purple text-white border-purple"
                  : "border-border text-muted-foreground hover:bg-surface-soft")
              }
            >
              <span className="font-medium">{t.label}</span>
              {t.hasOverride && (
                <span className={"ml-1.5 text-[10px] " + (t.slug === active ? "text-white/80" : "text-purple")}>
                  · edited
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Editor */}
        {current && d && (
          <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-base">{current.label}</h2>
                <span
                  className={
                    "text-[10px] px-1.5 py-0.5 rounded " +
                    (current.hasOverride
                      ? "bg-purple/15 text-purple"
                      : "bg-surface-soft text-muted-foreground border border-border")
                  }
                >
                  {current.hasOverride ? "EDITED" : "DEFAULT"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{current.description}</p>
            </div>

            {current.variables.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold">Variables: </span>
                {current.variables.map((v, i) => (
                  <span key={v.name}>
                    <code className="text-[11px] text-purple">{`{{${v.name}}}`}</code>
                    <span className="opacity-70"> {v.description}</span>
                    {i < current.variables.length - 1 ? " · " : ""}
                  </span>
                ))}
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground font-semibold" htmlFor="et-subject">Subject</label>
              <input
                id="et-subject"
                className={inputCls + " mt-1"}
                value={d.subject}
                disabled={busy}
                onChange={(e) => patch({ subject: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-semibold" htmlFor="et-title">
                Heading (large title shown at the top of the email)
              </label>
              <input
                id="et-title"
                className={inputCls + " mt-1"}
                value={d.title}
                disabled={busy}
                onChange={(e) => patch({ title: e.target.value })}
              />
            </div>

            {current.hasCta && (
              <div>
                <label className="text-xs text-muted-foreground font-semibold" htmlFor="et-cta">
                  Button label
                </label>
                <input
                  id="et-cta"
                  className={inputCls + " mt-1"}
                  value={d.ctaLabel}
                  disabled={busy}
                  onChange={(e) => patch({ ctaLabel: e.target.value })}
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground font-semibold" htmlFor="et-body">
                  Body (HTML)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-purple"
                >
                  {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPreview ? "Hide preview" : "Preview"}
                </button>
              </div>
              <textarea
                id="et-body"
                className={inputCls + " mt-1 min-h-[260px] font-mono text-[12px] resize-y"}
                value={d.body}
                disabled={busy}
                onChange={(e) => patch({ body: e.target.value })}
              />
              {showPreview && (
                <div className="mt-2 rounded-lg border border-border bg-white text-black p-4 text-sm overflow-auto">
                  {/* Admin-authored HTML; variables shown as [name] placeholders. */}
                  <div dangerouslySetInnerHTML={{ __html: previewHtml(d.body, current.variables) }} />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={busy || !current.hasOverride}
                title="Discard the override and restore the built-in default"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-surface-soft transition disabled:opacity-40"
              >
                <RotateCcw className="w-4 h-4" /> Reset to default
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
