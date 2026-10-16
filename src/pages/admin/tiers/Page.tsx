"use client";

import { createClient } from "@/lib/supabase/client";
import { TIER_NAMES } from "@/lib/constants";
import {
  FEATURE_GATE_DEFAULTS,
  sortFeatureGates,
  type FeatureGateRow,
} from "@/lib/feature-gates";
import { RANK_THRESHOLD_CRON_JOBS, fetchApiHealth, isCronJobInProgress, runAdminCron, waitForCronRunSettled } from "@/lib/admin-crons";
import { CronJobCard, type CronJobLastRun } from "@/components/admin/CronJobCard";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { toast } from "sonner";
import { Plus, Save, Search, X, Upload, RotateCcw, ImageOff } from "lucide-react";
import { listAssets, uploadAsset, revertAsset, type AssetItemRow } from "@/services/assets-admin";

type ThreshRow = { tier: number; name: string; min_balance_usd: string; min_lots: string };

// Ranks a feature can unlock at (Beginner..VIP). Tier 0 = unverified (pre-onboarding).
const RANK_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

// Member rank badge artwork lives in the `rank_badges` slot (/badges/<key>.png);
// tier N maps to this key. Matches frontend lib/constants.ts TIER_BADGES.
const TIER_BADGE_KEY: Record<number, string> = {
  1: "beginner", 2: "starter", 3: "bronze", 4: "silver", 5: "gold", 6: "platinum", 7: "vip",
};

const balanceInputCls =
  "w-28 px-2 py-1 text-right tabular-nums rounded-md border border-border bg-background text-sm outline-none focus:border-purple";
const selectCls =
  "min-w-[7.5rem] pl-2.5 pr-8 py-1.5 rounded-md border border-border bg-background text-sm outline-none focus:border-purple";
const addSelectCls =
  "min-w-[8rem] pl-2 pr-7 py-1 rounded-md border border-dashed border-border bg-background text-xs text-muted-foreground outline-none focus:border-purple";

type CronRunRow = {
  job: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  summary: unknown;
};

export default function TierThresholdsAdminPage() {
  const [thresh, setThresh] = useState<ThreshRow[] | null>(null);
  const [gates, setGates] = useState<FeatureGateRow[] | null>(null);
  const [gatesPersisted, setGatesPersisted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningCrons, setRunningCrons] = useState<Set<string>>(new Set());
  const [cronRuns, setCronRuns] = useState<CronRunRow[]>([]);
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const [badges, setBadges] = useState<Record<string, AssetItemRow>>({});
  const [bunnyConfigured, setBunnyConfigured] = useState(true);
  const [badgeBusy, setBadgeBusy] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const pendingTier = useRef<number | null>(null);

  async function loadBadges() {
    try {
      const res = await listAssets();
      const slot = res.slots.find((s) => s.slot === "rank_badges");
      setBunnyConfigured(res.bunnyConfigured);
      setBadges(Object.fromEntries((slot?.items ?? []).map((it) => [it.key, it])));
    } catch {
      /* assets table/route unavailable — badges just won't show */
    }
  }

  function pickBadge(tier: number) {
    if (!bunnyConfigured) return toast.error("Configure Bunny storage to replace rank badges.");
    pendingTier.current = tier;
    if (fileInput.current) {
      fileInput.current.value = "";
      fileInput.current.click();
    }
  }

  async function onBadgeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const tier = pendingTier.current;
    pendingTier.current = null;
    if (!file || tier == null) return;
    const key = TIER_BADGE_KEY[tier];
    if (!key) return;
    setBadgeBusy(tier);
    try {
      await uploadAsset("rank_badges", key, file);
      toast.success("Badge updated.");
      await loadBadges();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Upload failed");
    } finally {
      setBadgeBusy(null);
    }
  }

  async function revertBadge(tier: number) {
    const key = TIER_BADGE_KEY[tier];
    if (!key) return;
    setBadgeBusy(tier);
    try {
      await revertAsset("rank_badges", key);
      toast.success("Badge reverted to default.");
      await loadBadges();
    } catch (err: any) {
      toast.error(err?.message ?? "Revert failed");
    } finally {
      setBadgeBusy(null);
    }
  }

  async function loadCronRuns() {
    const supabase = createClient();
    const { data } = await supabase
      .from("cron_runs" as never)
      .select("job, status, started_at, duration_ms, summary")
      .in("job", RANK_THRESHOLD_CRON_JOBS.map((j) => j.id) as never)
      .order("started_at", { ascending: false })
      .limit(20);
    setCronRuns((data ?? []) as unknown as CronRunRow[]);
  }

  const lastCronByJob = useMemo(() => {
    const m = new Map<string, CronJobLastRun>();
    for (const r of cronRuns) {
      if (!m.has(r.job)) {
        m.set(r.job, {
          status: r.status,
          started_at: r.started_at,
          duration_ms: r.duration_ms,
          summary: r.summary,
        });
      }
    }
    return m;
  }, [cronRuns]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const fg = supabase as unknown as { from: (t: string) => any };
      const [{ data: tData }, { data: gData, error: gError }] = await Promise.all([
        fg.from("tier_thresholds").select("tier, name, min_balance_usd, min_lots").order("tier"),
        fg.from("feature_gates").select("feature, label, min_tier"),
      ]);
      if (cancelled) return;
      setThresh(
        ((tData ?? []) as Array<Record<string, unknown>>).map((t) => ({
          tier: Number(t.tier),
          name: String(t.name ?? ""),
          min_balance_usd: String(t.min_balance_usd ?? ""),
          min_lots: String(t.min_lots ?? ""),
        })),
      );
      const loaded =
        !gError && gData?.length
          ? ((gData ?? []) as Array<Record<string, unknown>>).map((g) => ({
              feature: String(g.feature),
              label: String(g.label ?? g.feature),
              min_tier: Number(g.min_tier),
            }))
          : FEATURE_GATE_DEFAULTS;
      setGates(sortFeatureGates(loaded));
      setGatesPersisted(!gError && !!gData?.length);
      setLoading(false);
      void loadBadges();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadCronRuns();
    void fetchApiHealth().then(setApiUp);
  }, []);

  const setBalance = (tier: number, value: string) =>
    setThresh((p) => p?.map((r) => (r.tier === tier ? { ...r, min_balance_usd: value } : r)) ?? p);

  const setName = (tier: number, value: string) =>
    setThresh((p) => p?.map((r) => (r.tier === tier ? { ...r, name: value } : r)) ?? p);
  const setMinLots = (tier: number, value: string) =>
    setThresh((p) => p?.map((r) => (r.tier === tier ? { ...r, min_lots: value } : r)) ?? p);

  const setGateTier = (feature: string, min_tier: number) =>
    setGates((p) => (p ? sortFeatureGates(p.map((g) => (g.feature === feature ? { ...g, min_tier } : g))) : p));

  const removeFromTier = (feature: string, tier: number) => {
    if (tier <= 1) return;
    setGateTier(feature, tier - 1);
  };

  const gatesAtTier = (tier: number) => (gates ?? []).filter((g) => g.min_tier === tier);

  const gatesNotAtTier = (tier: number) => (gates ?? []).filter((g) => g.min_tier !== tier);

  async function runCronJob(jobId: string, label: string) {
    if (isCronJobInProgress(lastCronByJob.get(jobId), runningCrons.has(jobId))) {
      toast.error(`${label} is already running.`);
      return;
    }
    setRunningCrons((s) => new Set(s).add(jobId));
    try {
      const res = await runAdminCron(jobId);
      if (res?.ok === false || res?.started === false) {
        toast.error(res?.error ?? `Couldn't start ${label}.`);
        return;
      }
      toast.success(`${label} started - may take a few minutes.`);
      await loadCronRuns();
      const settled = await waitForCronRunSettled(jobId, () => {
        void loadCronRuns();
      });
      await loadCronRuns();
      if (settled?.status === "ok") {
        toast.success(`${label} finished.`);
      } else if (settled?.status === "error") {
        toast.error(`${label} failed.`);
      } else if (settled?.status === "running") {
        toast.message(`${label} is still running in the background.`);
      }
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? `Couldn't start ${label}.`);
    } finally {
      setRunningCrons((s) => {
        const next = new Set(s);
        next.delete(jobId);
        return next;
      });
    }
  }

  async function save() {
    if (!thresh || !gates) return;
    const ordered = [...thresh].sort((a, b) => a.tier - b.tier);
    for (const r of ordered) {
      if (!r.name.trim()) {
        toast.error(`Rank ${r.tier}: name can't be empty.`);
        return;
      }
      const bal = Number(r.min_balance_usd);
      if (!Number.isFinite(bal) || bal < 0) {
        toast.error(`${r.name}: min balance must be a number ≥ 0.`);
        return;
      }
      const lots = Number(r.min_lots);
      if (!Number.isFinite(lots) || lots < 0) {
        toast.error(`${r.name}: min lots must be a number ≥ 0.`);
        return;
      }
    }
    for (let i = 1; i < ordered.length; i++) {
      if (Number(ordered[i].min_balance_usd) < Number(ordered[i - 1].min_balance_usd)) {
        toast.error(`Min balance must rise with rank: ${ordered[i].name} is below ${ordered[i - 1].name}.`);
        return;
      }
    }

    setSaving(true);
    const supabase = createClient();
    const fg = supabase as unknown as { from: (t: string) => any };
    try {
      for (const r of thresh) {
        const { error } = await supabase
          .from("tier_thresholds")
          .update({ name: r.name.trim(), min_balance_usd: Number(r.min_balance_usd), min_lots: Number(r.min_lots), updated_at: new Date().toISOString() } as never)
          .eq("tier", r.tier);
        if (error) throw error;
      }
      for (const g of gates) {
        const { error } = await fg.from("feature_gates").upsert(
          {
            feature: g.feature,
            label: g.label,
            min_tier: g.min_tier,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "feature" },
        );
        if (error) {
          if ((error as { code?: string }).code === "PGRST205") {
            toast.error(
              "Feature gates table is missing. Run schema/053_feature_gates.sql in Supabase SQL Editor, then save again.",
            );
            return;
          }
          throw error;
        }
      }
      setGatesPersisted(true);
      toast.success(
        "Saved. New sign-ups get updated ranks and gates immediately - run Apply to existing members below to update current members.",
      );
    } catch (e) {
      toast.error(
        (e as { message?: string })?.message ?? "Couldn't save - you may not have permission.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !thresh || !gates) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Rank thresholds</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The qualifying balance and minimum traded lots for each rank, and which rank unlocks each
            feature. One global ladder applies to every member. Changes enforce platform-wide.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition disabled:opacity-60"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {!gatesPersisted && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Feature gates are showing defaults - the <code className="text-xs">feature_gates</code> table
          is not in the database yet. Edits preview here; run{" "}
          <code className="text-xs">schema/053_feature_gates.sql</code> in Supabase SQL Editor before
          saving.
        </div>
      )}

      <input ref={fileInput} type="file" accept=".png" className="hidden" onChange={onBadgeFile} />
      {!bunnyConfigured && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Rank-badge replacement needs Bunny storage. Set <code className="text-xs">BUNNY_STORAGE_ZONE</code>,{" "}
          <code className="text-xs">BUNNY_STORAGE_API_KEY</code> and{" "}
          <code className="text-xs">BUNNY_PULL_ZONE_URL</code> on the backend to enable uploads.
        </div>
      )}

      {/* Balances + editable unlock tags */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="bg-surface-soft px-4 py-2.5 text-xs uppercase text-muted-foreground font-bold">
          Global ladder
          <span className="normal-case font-normal text-muted-foreground ml-2">· click a badge to replace it</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Rank</th>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-right px-4 py-2">Min balance USD</th>
                <th className="text-right px-4 py-2">Min lots</th>
                <th className="text-left px-4 py-2">Unlocks</th>
              </tr>
            </thead>
            <tbody>
              {thresh.map((r) => {
                const atTier = gatesAtTier(r.tier);
                const addable = gatesNotAtTier(r.tier);
                return (
                  <tr key={r.tier} className="border-t border-border align-top">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <RankBadgeThumb
                          item={badges[TIER_BADGE_KEY[r.tier] ?? ""]}
                          busy={badgeBusy === r.tier}
                          onPick={() => pickBadge(r.tier)}
                          onRevert={() => revertBadge(r.tier)}
                        />
                        <span>{TIER_NAMES[r.tier] ?? r.tier}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={r.name}
                        onChange={(e) => setName(r.tier, e.target.value)}
                        className="w-32 px-2 py-1 rounded-md border border-border bg-surface-soft text-foreground font-display font-semibold"
                        aria-label={`Name for ${TIER_NAMES[r.tier] ?? r.tier}`}
                      />
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <span className="text-muted-foreground mr-1">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={r.min_balance_usd}
                        onChange={(e) => setBalance(r.tier, e.target.value)}
                        className={balanceInputCls}
                      />
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.min_lots}
                        onChange={(e) => setMinLots(r.tier, e.target.value)}
                        className={balanceInputCls}
                        aria-label={`Min lots for ${r.name}`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {atTier.map((g) => (
                          <span
                            key={g.feature}
                            className="inline-flex items-center gap-0.5 rounded-md bg-purple-dim text-purple pl-2 pr-1 py-0.5 text-xs font-medium"
                          >
                            {g.label}
                            {r.tier > 1 && (
                              <button
                                type="button"
                                title={`Move ${g.label} to ${TIER_NAMES[r.tier - 1] ?? `tier ${r.tier - 1}`}`}
                                onClick={() => removeFromTier(g.feature, r.tier)}
                                className="rounded p-0.5 hover:bg-purple/20 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </span>
                        ))}
                        {addable.length > 0 && (
                          <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Plus className="w-3 h-3 shrink-0" />
                            <select
                              value=""
                              onChange={(e) => {
                                const feature = e.target.value;
                                if (feature) setGateTier(feature, r.tier);
                              }}
                              className={addSelectCls}
                              aria-label={`Add feature unlock at ${r.name}`}
                            >
                              <option value="">Add feature…</option>
                              {addable.map((g) => (
                                <option key={g.feature} value={g.feature}>
                                  {g.label}
                                  {g.min_tier !== r.tier
                                    ? ` (from ${TIER_NAMES[g.min_tier] ?? g.min_tier})`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        {atTier.length === 0 && addable.length === 0 && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature access - alternate view, stays in sync with unlock tags */}
      <div>
        <h2 className="text-lg font-display font-bold">Feature access</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-3">
          Set the minimum rank that unlocks each feature. A feature unlocks at the chosen rank and
          every rank above it. Enforced everywhere - nav, page access, scanner/TradingView grant,
          and the Aurex Telegram gate.
        </p>
        <div className="rounded-xl border border-border bg-surface overflow-hidden max-w-2xl">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Feature</th>
                <th className="text-left px-4 py-2 w-40">Unlocks at</th>
              </tr>
            </thead>
            <tbody>
              {gates.map((g) => (
                <tr key={g.feature} className="border-t border-border">
                  <td className="px-4 py-2.5 font-medium">{g.label}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={g.min_tier}
                      onChange={(e) => setGateTier(g.feature, Number(e.target.value))}
                      className={selectCls}
                    >
                      {RANK_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {TIER_NAMES[t] ?? `Tier ${t}`}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CountryFloorsCard ladder={thresh ?? []} />

      <div>
        <h2 className="text-lg font-display font-bold">Apply to existing members</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-3">
          Saved changes apply to new sign-ups right away. Run these jobs to update current members.
          {" "}
          <Link to="/admin/crons" className="text-purple font-medium hover:underline">
            View all cron jobs →
          </Link>
        </p>
        {apiUp === false && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-100">
            Backend API is offline. Start it on port 3001:{" "}
            <code className="text-xs">cd eztrade-platform/backend && npm run dev</code>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl items-stretch">
          {RANK_THRESHOLD_CRON_JOBS.map((job) => (
            <CronJobCard
              key={job.id}
              job={job}
              last={lastCronByJob.get(job.id)}
              inProgress={isCronJobInProgress(lastCronByJob.get(job.id), runningCrons.has(job.id))}
              onRun={() => runCronJob(job.id, job.label)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RankBadgeThumb({
  item, busy, onPick, onRevert,
}: {
  item: AssetItemRow | undefined;
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
        title="Click to replace this rank badge"
        className="w-9 h-9 rounded-md border border-border bg-surface-soft grid place-items-center overflow-hidden hover:border-purple transition disabled:opacity-50"
      >
        {item && !broken ? (
          <img
            src={item.url}
            alt=""
            loading="lazy"
            className="max-w-full max-h-full object-contain"
            onError={() => setBroken(true)}
          />
        ) : (
          <ImageOff className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center">
          <Upload className="w-3 h-3 text-white" />
        </span>
      </button>
      {item?.replaced && (
        <button
          type="button"
          onClick={onRevert}
          disabled={busy}
          title="Revert to the default badge"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-surface border border-border grid place-items-center hover:bg-surface-soft"
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}

// Country rank floors
// Edits public.country_tiers (country_code -> floor_tier): the minimum rank a
// member from that country starts at, regardless of balance. One row per
// country. Direct Supabase writes via the country_tiers admin RLS policy; names
// resolved from ISO codes with Intl.DisplayNames (no list to maintain). Country
// floors feed the lifecycle floor (backend lib/lifecycle/config).

type CountryRow = { code: string; floor: number };

function CountryFloorsCard({ ladder }: { ladder: ThreshRow[] }) {
  // Floor options follow the rank ladder names; a floor is a rank 1..7, so tier 0
  // (unverified) is never offered.
  const floorOptions = ladder.filter((o) => o.tier >= 1);
  const options = floorOptions.length
    ? floorOptions
    : [{ tier: 1, name: "Beginner", min_balance_usd: "", min_lots: "" }];
  const [rows, setRows] = useState<CountryRow[] | null>(null);
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [onlyRaised, setOnlyRaised] = useState(false);
  const [saving, setSaving] = useState(false);
  // Bulk selection: which country codes are ticked, so one floor can be applied
  // to many at once. Selection is by code and survives filtering; select-all only
  // covers the currently visible (filtered) rows.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Floor the bulk bar will apply on "Apply"; defaults to the lowest floor.
  const [bulkFloor, setBulkFloor] = useState<number>(options[0]?.tier ?? 1);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      return null;
    }
  }, []);
  const nameOf = (code: string) => {
    try {
      return regionNames?.of(code) ?? code;
    } catch {
      return code;
    }
  };

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("country_tiers" as never)
      .select("country_code, floor_tier")
      .order("country_code");
    if (error) {
      toast.error("Couldn't load country floors.");
      setRows([]);
      return;
    }
    setRows(
      ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
        code: String(r.country_code),
        floor: Number(r.floor_tier),
      })),
    );
    setEdits({});
    setSelected(new Set());
  }
  useEffect(() => {
    void load();
  }, []);

  const setFloor = (code: string, floor: number) => setEdits((e) => ({ ...e, [code]: floor }));

  const changed = useMemo(
    () => (rows ?? []).filter((r) => edits[r.code] != null && edits[r.code] !== r.floor),
    [rows, edits],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? [])
      .map((r) => ({ ...r, name: nameOf(r.code) }))
      .filter((r) => !onlyRaised || (edits[r.code] ?? r.floor) > 1)
      .filter((r) => !s || r.name.toLowerCase().includes(s) || r.code.toLowerCase().includes(s))
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, onlyRaised, edits]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.code));

  // Header checkbox reads "indeterminate" when some (but not all) visible rows are ticked.
  useEffect(() => {
    if (selectAllRef.current) {
      const some = filtered.some((r) => selected.has(r.code));
      selectAllRef.current.indeterminate = some && !allFilteredSelected;
    }
  }, [filtered, selected, allFilteredSelected]);

  const toggleSelect = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const toggleAllFiltered = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      const codes = filtered.map((r) => r.code);
      if (codes.length > 0 && codes.every((c) => next.has(c))) {
        codes.forEach((c) => next.delete(c));
      } else {
        codes.forEach((c) => next.add(c));
      }
      return next;
    });

  // Apply one floor to every selected country in a single edit; Save persists them
  // just like individual row edits. Rows set back to their stored value drop out of
  // "changed" on their own, so re-applying the same floor is a no-op.
  const bulkSetFloor = (floor: number) => {
    if (!selected.size) return;
    setEdits((e) => {
      const next = { ...e };
      for (const code of selected) next[code] = floor;
      return next;
    });
  };

  async function save() {
    if (!changed.length) return;
    setSaving(true);
    const supabase = createClient();
    try {
      for (const r of changed) {
        const { error } = await supabase
          .from("country_tiers" as never)
          .update({ floor_tier: edits[r.code], updated_at: new Date().toISOString() } as never)
          .eq("country_code" as never, r.code as never);
        if (error) throw error;
      }
      toast.success(
        `Saved ${changed.length} country floor${changed.length === 1 ? "" : "s"}. Run "Apply to existing members" to re-rank current members.`,
      );
      await load();
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Couldn't save - you may not have permission.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-display font-bold">Country rank floors</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-3 max-w-2xl">
            The minimum rank a member from each country starts at, regardless of balance. Raise a
            country to give its members a higher baseline; anything not raised sits at the lowest floor.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || changed.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-sm font-semibold hover:bg-purple/90 transition disabled:opacity-60"
        >
          <Save className="w-4 h-4" />{" "}
          {saving ? "Saving…" : changed.length ? `Save ${changed.length} change${changed.length === 1 ? "" : "s"}` : "Save country floors"}
        </button>
      </div>

      <div className="mb-3 flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search country or code"
            className="w-full rounded-md border border-border bg-background pl-8 pr-2.5 py-1.5 text-sm outline-none focus:border-purple"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" className="accent-purple" checked={onlyRaised} onChange={(e) => setOnlyRaised(e.target.checked)} /> Only raised floors
        </label>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-purple/40 bg-purple/15 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">{selected.size} selected</span>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            Set floor to
            <select
              value={bulkFloor}
              onChange={(e) => setBulkFloor(Number(e.target.value))}
              className={selectCls}
              aria-label="Floor rank to apply to selected countries"
            >
              {options.map((o) => (
                <option key={o.tier} value={o.tier}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => bulkSetFloor(bulkFloor)}
            className="inline-flex items-center rounded-lg bg-purple px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-purple/90 transition"
          >
            Apply to {selected.size}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}

      {rows === null ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden max-w-2xl">
          <div className="max-h-[460px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-soft text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-2">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="accent-purple align-middle"
                      checked={allFilteredSelected}
                      onChange={toggleAllFiltered}
                      disabled={filtered.length === 0}
                      aria-label="Select all countries"
                    />
                  </th>
                  <th className="text-left px-4 py-2">Country</th>
                  <th className="text-left px-4 py-2 w-44">Floor rank</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      No countries match.
                    </td>
                  </tr>
                )}
                {filtered.map((r) => {
                  const isSelected = selected.has(r.code);
                  const dirty = edits[r.code] != null && edits[r.code] !== r.floor;
                  return (
                    <tr
                      key={r.code}
                      className={
                        "border-t border-border " +
                        (isSelected ? "bg-purple/10" : dirty ? "bg-purple-dim/40" : "")
                      }
                    >
                      <td className="w-10 px-4 py-2">
                        <input
                          type="checkbox"
                          className="accent-purple align-middle"
                          checked={isSelected}
                          onChange={() => toggleSelect(r.code)}
                          aria-label={`Select ${r.name}`}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-medium">{r.name}</span>
                        <span className="ml-1.5 text-[11px] text-muted-foreground">{r.code}</span>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={edits[r.code] ?? r.floor}
                          onChange={(e) => setFloor(r.code, Number(e.target.value))}
                          className={selectCls}
                        >
                          {options.map((o) => (
                            <option key={o.tier} value={o.tier}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
