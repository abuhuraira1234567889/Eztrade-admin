"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Save, RotateCcw, Upload, ImageOff } from "lucide-react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import {
  listMilestones,
  updateMilestone,
  resetMilestone,
  uploadMilestoneBadge,
  revertMilestoneBadge,
  type MilestoneCategoryRow,
  type MilestoneTierRow,
} from "@/services/milestones-admin";

const inputCls =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm outline-none focus:border-purple";
const numCls =
  "w-24 px-2.5 py-1.5 text-right tabular-nums rounded-md border border-border bg-background text-sm outline-none focus:border-purple";

type Draft = { name: string; threshold: string; xp: string };

function toDraft(t: MilestoneTierRow): Draft {
  return { name: t.name, threshold: String(t.threshold), xp: String(t.xp) };
}

export default function AdminMilestonesPage() {
  const [cats, setCats] = useState<MilestoneCategoryRow[] | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [bunnyConfigured, setBunnyConfigured] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const pendingSlug = useRef<string | null>(null);

  async function load() {
    const res = await listMilestones();
    setCats(res.categories);
    setNeedsMigration(!!res.needsMigration);
    setBunnyConfigured(res.bunnyConfigured);
    const d: Record<string, Draft> = {};
    for (const c of res.categories) for (const t of c.tiers) d[t.slug] = toDraft(t);
    setDrafts(d);
  }

  function pickBadge(slug: string) {
    if (!bunnyConfigured) return toast.error("Configure Bunny storage to replace badge images.");
    pendingSlug.current = slug;
    if (fileInput.current) {
      fileInput.current.value = "";
      fileInput.current.click();
    }
  }

  async function onBadgeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const slug = pendingSlug.current;
    pendingSlug.current = null;
    if (!file || !slug) return;
    setBusy(slug);
    try {
      const { url } = await uploadMilestoneBadge(slug, file);
      toast.success("Badge updated.");
      setCats((prev) =>
        (prev ?? []).map((c) => ({
          ...c,
          tiers: c.tiers.map((x) => (x.slug === slug ? { ...x, badgeUrl: url, badgeReplaced: true } : x)),
        })),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function revertBadge(t: MilestoneTierRow) {
    setBusy(t.slug);
    try {
      await revertMilestoneBadge(t.slug);
      toast.success("Badge reverted to default.");
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Revert failed");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    load().catch((e) => toast.error(e?.message ?? "Failed to load milestones"));
  }, []);

  if (!cats) return <PageSkeleton />;

  const changed = (t: MilestoneTierRow) => {
    const d = drafts[t.slug];
    return !d || d.name !== t.name || d.threshold !== String(t.threshold) || d.xp !== String(t.xp);
  };

  function patch(slug: string, key: keyof Draft, value: string) {
    setDrafts((d) => ({ ...d, [slug]: { ...d[slug], [key]: value } }));
  }

  async function save(t: MilestoneTierRow) {
    const d = drafts[t.slug];
    const threshold = Number(d.threshold);
    const xp = Number(d.xp);
    if (!d.name.trim()) return toast.error("Name cannot be empty.");
    if (!Number.isFinite(threshold) || threshold < 0) return toast.error("Threshold must be ≥ 0.");
    if (!Number.isFinite(xp) || xp < 0) return toast.error("XP must be ≥ 0.");
    setBusy(t.slug);
    try {
      await updateMilestone(t.slug, { name: d.name.trim(), threshold, xp });
      toast.success(`${d.name.trim()} saved.`);
      setCats((prev) =>
        (prev ?? []).map((c) => ({
          ...c,
          tiers: c.tiers.map((x) =>
            x.slug === t.slug
              ? { ...x, name: d.name.trim(), threshold, xp: Math.round(xp), isDefault: false }
              : x,
          ),
        })),
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function reset(t: MilestoneTierRow) {
    setBusy(t.slug);
    try {
      await resetMilestone(t.slug);
      toast.success(`${t.defaultName} reset to default.`);
      setCats((prev) =>
        (prev ?? []).map((c) => ({
          ...c,
          tiers: c.tiers.map((x) =>
            x.slug === t.slug
              ? { ...x, name: x.defaultName, threshold: x.defaultThreshold, xp: x.defaultXp, isDefault: true }
              : x,
          ),
        })),
      );
      setDrafts((d) => ({
        ...d,
        [t.slug]: { name: t.defaultName, threshold: String(t.defaultThreshold), xp: String(t.defaultXp) },
      }));
    } catch (e: any) {
      toast.error(e?.message ?? "Reset failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <input ref={fileInput} type="file" accept=".png,.webp,.svg" className="hidden" onChange={onBadgeFile} />

      <div>
        <h1 className="text-2xl font-display font-bold">Milestones</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Tune each milestone badge’s name, threshold, XP - and its image. Click a badge to upload a
          replacement. Changes apply live (within ~60s). “Reset” restores the shipped name/threshold/XP;
          the badge’s revert icon restores the shipped artwork.
        </p>
      </div>

      {needsMigration && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Showing defaults - the <code className="text-xs">milestone_config</code> table isn’t in the
          database yet. Run <code className="text-xs">schema/183_milestone_config.sql</code> in the
          Supabase SQL Editor to make edits persist.
        </div>
      )}
      {!bunnyConfigured && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Badge-image replacement needs Bunny storage. Set <code className="text-xs">BUNNY_STORAGE_ZONE</code>,{" "}
          <code className="text-xs">BUNNY_STORAGE_API_KEY</code> and{" "}
          <code className="text-xs">BUNNY_PULL_ZONE_URL</code> on the backend to enable uploads.
        </div>
      )}

      {cats.map((c) => (
        <section key={c.key} className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="bg-surface-soft px-4 py-2.5 text-xs uppercase text-muted-foreground font-bold flex justify-between">
            <span>{c.label}</span>
            <span className="normal-case font-normal">threshold in {c.unit}</span>
          </div>
          <div className="divide-y divide-border">
            {c.tiers.map((t) => (
              <div key={t.slug} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <BadgeThumb
                  t={t}
                  busy={busy === t.slug}
                  onPick={() => pickBadge(t.slug)}
                  onRevert={() => revertBadge(t)}
                />
                <input
                  id={`ms-name-${t.slug}`}
                  className={inputCls + " flex-1 min-w-[180px] font-semibold"}
                  value={drafts[t.slug]?.name ?? ""}
                  disabled={busy === t.slug}
                  onChange={(e) => patch(t.slug, "name", e.target.value)}
                />
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Threshold
                  <input
                    id={`ms-thr-${t.slug}`}
                    type="number"
                    className={numCls}
                    min={0}
                    value={drafts[t.slug]?.threshold ?? ""}
                    disabled={busy === t.slug}
                    onChange={(e) => patch(t.slug, "threshold", e.target.value)}
                  />
                </label>
                <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  XP
                  <input
                    id={`ms-xp-${t.slug}`}
                    type="number"
                    className={numCls}
                    min={0}
                    value={drafts[t.slug]?.xp ?? ""}
                    disabled={busy === t.slug}
                    onChange={(e) => patch(t.slug, "xp", e.target.value)}
                  />
                </label>
                {!t.isDefault && (
                  <span className="text-[10px] uppercase tracking-wide text-purple border border-purple/40 rounded px-1.5 py-0.5">
                    edited
                  </span>
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => save(t)}
                    disabled={busy === t.slug || !changed(t)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition disabled:opacity-40"
                  >
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                  <button
                    type="button"
                    onClick={() => reset(t)}
                    disabled={busy === t.slug || t.isDefault}
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

function BadgeThumb({
  t, busy, onPick, onRevert,
}: {
  t: MilestoneTierRow;
  busy: boolean;
  onPick: () => void;
  onRevert: () => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative group flex-shrink-0">
      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        title="Click to replace this badge image"
        className="w-11 h-11 rounded-md border border-border bg-surface-soft grid place-items-center overflow-hidden hover:border-purple transition disabled:opacity-50"
      >
        {broken ? (
          <ImageOff className="w-4 h-4 text-muted-foreground" />
        ) : (
          <img
            src={t.badgeUrl}
            alt={t.slug}
            loading="lazy"
            className="max-w-full max-h-full object-contain"
            onError={() => setBroken(true)}
          />
        )}
        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center">
          <Upload className="w-3.5 h-3.5 text-white" />
        </span>
      </button>
      {t.badgeReplaced && (
        <button
          type="button"
          onClick={onRevert}
          disabled={busy}
          title="Revert to the default badge image"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-surface border border-border grid place-items-center hover:bg-surface-soft"
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}
