"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { listSettings, updateSetting, resetSetting, type SettingRow } from "@/services/settings-admin";

const GROUP_LABELS: Record<string, string> = {
  gamification: "XP & Gamification",
  compliance: "Compliance & Eligibility",
  limits: "Rate Limits",
};

const GROUP_ORDER = ["gamification", "compliance", "limits"];

const numCls =
  "w-28 px-2.5 py-1.5 text-right tabular-nums rounded-md border border-border bg-background text-sm outline-none focus:border-purple disabled:opacity-50";

/** Format a value for the input (keep integers clean, allow decimals for floats). */
function fmt(v: number): string {
  return Number.isFinite(v) ? String(v) : "";
}

export default function AdminSettingsPage() {
  const [rows, setRows] = useState<SettingRow[] | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await listSettings();
    setRows(res.settings);
    setNeedsMigration(!!res.needsMigration);
    setDrafts(Object.fromEntries(res.settings.map((s) => [s.key, fmt(s.value)])));
  }

  useEffect(() => {
    load().catch((e) => toast.error(e?.message ?? "Failed to load settings"));
  }, []);

  const groups = useMemo(() => {
    const by: Record<string, SettingRow[]> = {};
    for (const r of rows ?? []) (by[r.group] ??= []).push(r);
    const keys = [
      ...GROUP_ORDER.filter((g) => by[g]),
      ...Object.keys(by).filter((g) => !GROUP_ORDER.includes(g)),
    ];
    return keys.map((g) => ({ key: g, label: GROUP_LABELS[g] ?? g, items: by[g] }));
  }, [rows]);

  if (!rows) return <PageSkeleton />;

  const changed = (r: SettingRow) => (drafts[r.key] ?? "") !== fmt(r.value);

  async function save(r: SettingRow) {
    const raw = Number(drafts[r.key]);
    if (!Number.isFinite(raw)) return toast.error(`${r.label} must be a number.`);
    if (raw < r.min || raw > r.max) {
      return toast.error(`${r.label} must be between ${r.min} and ${r.max}.`);
    }
    setBusy(r.key);
    try {
      const res = await updateSetting(r.key, raw);
      toast.success(`${r.label} saved.`);
      setRows((prev) =>
        (prev ?? []).map((x) => (x.key === r.key ? { ...x, value: res.value, isDefault: false } : x)),
      );
      setDrafts((d) => ({ ...d, [r.key]: fmt(res.value) }));
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function reset(r: SettingRow) {
    setBusy(r.key);
    try {
      const res = await resetSetting(r.key);
      toast.success(`${r.label} reset to default.`);
      setRows((prev) =>
        (prev ?? []).map((x) => (x.key === r.key ? { ...x, value: res.value, isDefault: true } : x)),
      );
      setDrafts((d) => ({ ...d, [r.key]: fmt(res.value) }));
    } catch (e: any) {
      toast.error(e?.message ?? "Reset failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Platform settings</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Business knobs that used to be hardcoded. Changes apply live (within ~60s). Each value
          is clamped to a safe range; “Reset” restores the shipped default.
        </p>
      </div>

      {needsMigration && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Showing defaults — the <code className="text-xs">platform_settings</code> table isn’t in
          the database yet. Run <code className="text-xs">schema/182_platform_settings.sql</code> in
          the Supabase SQL Editor to make edits persist.
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key} className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="bg-surface-soft px-4 py-2.5 text-xs uppercase text-muted-foreground font-bold">
            {g.label}
          </div>
          <div className="divide-y divide-border">
            {g.items.map((r) => (
              <div key={r.key} className="flex items-start gap-4 px-4 py-3.5 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {r.label}
                    {r.isDefault && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">{r.help}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Range {r.min}–{r.max}
                    {r.unit ? ` · ${r.unit}` : ""} · default {r.default}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id={`setting-${r.key}`}
                    type="number"
                    className={numCls}
                    step={r.type === "float" ? "0.01" : "1"}
                    min={r.min}
                    max={r.max}
                    value={drafts[r.key] ?? ""}
                    disabled={busy === r.key}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.key]: e.target.value }))}
                  />
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
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
