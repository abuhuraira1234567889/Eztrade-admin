"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import {
  listBrandContent,
  updateBrandContent,
  resetBrandContent,
  type BrandTextRow,
} from "@/services/brand-content-admin";

const GROUP_LABELS: Record<string, string> = {
  disclaimers: "Disclaimers",
  social: "Social links",
  partners: "Partner links",
  email: "Email branding",
};
const GROUP_ORDER = ["disclaimers", "social", "partners", "email"];

const inputCls =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm outline-none focus:border-purple disabled:opacity-50";

export default function AdminBrandContentPage() {
  const [rows, setRows] = useState<BrandTextRow[] | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await listBrandContent();
    setRows(res.settings);
    setNeedsMigration(!!res.needsMigration);
    setDrafts(Object.fromEntries(res.settings.map((s) => [s.key, s.value])));
  }

  useEffect(() => {
    load().catch((e) => toast.error(e?.message ?? "Failed to load brand content"));
  }, []);

  const groups = useMemo(() => {
    const by: Record<string, BrandTextRow[]> = {};
    for (const r of rows ?? []) (by[r.group] ??= []).push(r);
    const keys = [
      ...GROUP_ORDER.filter((g) => by[g]),
      ...Object.keys(by).filter((g) => !GROUP_ORDER.includes(g)),
    ];
    return keys.map((g) => ({ key: g, label: GROUP_LABELS[g] ?? g, items: by[g] }));
  }, [rows]);

  if (!rows) return <PageSkeleton />;

  const changed = (r: BrandTextRow) => (drafts[r.key] ?? "") !== r.value;

  async function save(r: BrandTextRow) {
    setBusy(r.key);
    try {
      const res = await updateBrandContent(r.key, drafts[r.key] ?? "");
      toast.success(`${r.label} saved.`);
      setRows((prev) => (prev ?? []).map((x) => (x.key === r.key ? { ...x, value: res.value, isDefault: false } : x)));
      setDrafts((d) => ({ ...d, [r.key]: res.value }));
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function reset(r: BrandTextRow) {
    setBusy(r.key);
    try {
      const res = await resetBrandContent(r.key);
      toast.success(`${r.label} reset to default.`);
      setRows((prev) => (prev ?? []).map((x) => (x.key === r.key ? { ...x, value: res.value, isDefault: true } : x)));
      setDrafts((d) => ({ ...d, [r.key]: res.value }));
    } catch (e: any) {
      toast.error(e?.message ?? "Reset failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Brand content</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Disclaimers, social links and partner URLs shown to members. Changes apply live (within
          ~60s). Leave a social link blank to hide it; “Reset” restores the shipped default.
        </p>
      </div>

      {needsMigration && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Showing defaults — the <code className="text-xs">platform_settings</code> table isn’t in the
          database yet. Run <code className="text-xs">schema/182_platform_settings.sql</code> in Supabase.
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key} className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="bg-surface-soft px-4 py-2.5 text-xs uppercase text-muted-foreground font-bold">
            {g.label}
          </div>
          <div className="divide-y divide-border">
            {g.items.map((r) => (
              <div key={r.key} className="px-4 py-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold flex items-center gap-2" htmlFor={`bc-${r.key}`}>
                    {r.label}
                    {r.isDefault && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        default
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => save(r)}
                      disabled={busy === r.key || !changed(r)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition disabled:opacity-40"
                    >
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => reset(r)}
                      disabled={busy === r.key || r.isDefault}
                      title="Reset to default"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-sm hover:bg-surface-soft transition disabled:opacity-40"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{r.help}</p>
                {r.kind === "multiline" ? (
                  <textarea
                    id={`bc-${r.key}`}
                    className={inputCls + " min-h-[72px] resize-y"}
                    maxLength={r.maxLen}
                    value={drafts[r.key] ?? ""}
                    disabled={busy === r.key}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    id={`bc-${r.key}`}
                    type={r.kind === "url" ? "url" : "text"}
                    placeholder={r.kind === "url" ? "https://…" : ""}
                    className={inputCls}
                    maxLength={r.maxLen}
                    value={drafts[r.key] ?? ""}
                    disabled={busy === r.key}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
