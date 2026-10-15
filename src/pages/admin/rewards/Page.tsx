"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Gift, Plus, Pencil, Trash2, Upload, X, ImageIcon, Package } from "lucide-react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import {
  listPrizes,
  createPrize,
  updatePrize,
  deletePrize,
  uploadRewardImageDirect,
  SHOP_CATEGORIES,
  type Prize,
  type PrizeInput,
} from "@/services/rewards-admin";
import { listAssets } from "@/services/assets-admin";

const money = (n: number | null) =>
  n == null ? "—" : Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const xp = (n: number) => `${Number(n).toLocaleString("en-US")} XP`;

type Draft = {
  id: string | null;
  name: string;
  slug: string;
  category: string;
  xp_cost: string;
  retail_value_usd: string;
  stock: string;
  description: string;
  is_active: boolean;
  image_url: string;
};

function emptyDraft(): Draft {
  return {
    id: null,
    name: "",
    slug: "",
    category: "Tech",
    xp_cost: "",
    retail_value_usd: "",
    stock: "",
    description: "",
    is_active: true,
    image_url: "",
  };
}

function draftFrom(p: Prize): Draft {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category || "Other",
    xp_cost: String(p.xp_cost ?? ""),
    retail_value_usd: p.retail_value_usd == null ? "" : String(p.retail_value_usd),
    stock: p.stock == null ? "" : String(p.stock),
    description: p.description ?? "",
    is_active: p.is_active,
    image_url: p.image_url ?? "",
  };
}

export default function AdminRewardsPage() {
  const [rows, setRows] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Reward artwork from the Images page, keyed by slug - what members see when a
  // reward has no image of its own.
  const [fallbacks, setFallbacks] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listPrizes();
      setRows(res.prizes ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load rewards.");
    }
    try {
      const assets = await listAssets();
      const slot = assets.slots.find((s) => s.slot === "reward_images");
      setFallbacks(Object.fromEntries((slot?.items ?? []).map((it) => [it.key, it.url])));
    } catch {
      /* thumbnails just show the placeholder */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(p: Prize) {
    setDeletingId(p.id);
    try {
      const res = await deletePrize(p.id);
      if (res.ok) {
        toast.success(`Deleted "${p.name}".`);
        await load();
      } else {
        toast.error(res.error ?? "Couldn't delete that reward.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete that reward.");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleActive(p: Prize) {
    try {
      const res = await updatePrize(p.id, { is_active: !p.is_active });
      if (res.ok) {
        setRows((rs) => rs.map((r) => (r.id === p.id ? { ...r, is_active: !p.is_active } : r)));
      } else {
        toast.error(res.error ?? "Couldn't update that reward.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update that reward.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-purple/25 bg-purple-dim/40 text-purple">
            <Gift className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">XP Rewards</h1>
            <p className="text-sm text-muted-foreground">
              The XP Shop catalogue. Add rewards, set their XP cost and image — members see active rewards instantly.
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditing(emptyDraft())}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple px-3.5 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add reward
        </button>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          No rewards yet. Click “Add reward” to create the first one.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <li key={p.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex gap-3">
                <RewardThumb src={p.image_url || fallbacks[p.slug] || null} alt={p.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-display font-bold text-foreground">{p.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {p.category} · {money(p.retail_value_usd)} value
                      </div>
                    </div>
                    <span
                      className={
                        "flex-none rounded-full px-2 py-0.5 text-[10px] font-medium " +
                        (p.is_active ? "bg-green/15 text-green" : "bg-surface-soft text-muted-foreground")
                      }
                    >
                      {p.is_active ? "Active" : "Hidden"}
                    </span>
                  </div>
                  <div className="mt-1 font-display text-base font-bold text-purple">{xp(p.xp_cost)}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Package className="h-3 w-3" aria-hidden />
                    {p.stock == null ? "Unlimited stock" : `${p.stock} in stock`}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-border pt-2">
                <button
                  onClick={() => toggleActive(p)}
                  className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-secondary-foreground hover:border-purple/50"
                >
                  {p.is_active ? "Hide" : "Show"}
                </button>
                <button
                  onClick={() => setEditing(draftFrom(p))}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-secondary-foreground hover:border-purple/50"
                >
                  <Pencil className="h-3 w-3" aria-hidden /> Edit
                </button>
                <button
                  onClick={() => remove(p)}
                  disabled={deletingId === p.id}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-red/50 hover:text-red disabled:opacity-60"
                >
                  <Trash2 className="h-3 w-3" aria-hidden /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <RewardEditor
          draft={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function RewardEditor({
  draft,
  onClose,
  onSaved,
}: {
  draft: Draft;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<Draft>(draft);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = form.id === null;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await uploadRewardImageDirect(file);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (res.ok) {
      set("image_url", res.url);
    } else {
      toast.error(res.error);
    }
  }

  async function save() {
    const name = form.name.trim();
    if (!name) {
      toast.error("Name is required.");
      return;
    }
    const xpCost = Number(form.xp_cost);
    if (!Number.isFinite(xpCost) || xpCost <= 0) {
      toast.error("XP cost must be a positive number.");
      return;
    }

    const body: PrizeInput = {
      name,
      slug: form.slug.trim() || undefined,
      category: form.category,
      xp_cost: Math.round(xpCost),
      retail_value_usd: form.retail_value_usd.trim() === "" ? null : Number(form.retail_value_usd),
      stock: form.stock.trim() === "" ? null : Math.round(Number(form.stock)),
      description: form.description.trim() || null,
      is_active: form.is_active,
      image_url: form.image_url.trim() || null,
    };

    setSaving(true);
    try {
      const res = form.id ? await updatePrize(form.id, body) : await createPrize(body);
      if (res.ok) {
        toast.success(isNew ? "Reward created." : "Reward saved.");
        await onSaved();
      } else {
        toast.error(res.error ?? "Couldn't save the reward.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the reward.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div
        className="my-6 w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">{isNew ? "Add reward" : "Edit reward"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-4">
          {/* Image */}
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="flex items-center gap-3">
              <div className="grid h-24 w-24 flex-none place-items-center overflow-hidden rounded-xl border border-border bg-surface-soft">
                {form.image_url ? (
                  <img src={form.image_url} alt="Preview" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-7 w-7 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-soft px-3 py-1.5 text-xs font-medium text-foreground hover:border-purple/60 disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                    {uploading ? "Uploading…" : form.image_url ? "Replace" : "Upload"}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={onFile}
                    className="hidden"
                  />
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => set("image_url", "")}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" aria-hidden /> Clear
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => set("image_url", e.target.value)}
                  placeholder="…or paste an image URL"
                  className="w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground"
                />
              </div>
            </div>
          </div>

          <div>
            <Label>Name</Label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Apple Watch"
              className="w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground focus:border-purple focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground focus:border-purple focus:outline-none"
              >
                {SHOP_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>XP cost</Label>
              <input
                type="number"
                min={1}
                value={form.xp_cost}
                onChange={(e) => set("xp_cost", e.target.value)}
                placeholder="e.g. 40000"
                className="w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground focus:border-purple focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Retail value (USD)</Label>
              <input
                type="number"
                min={0}
                value={form.retail_value_usd}
                onChange={(e) => set("retail_value_usd", e.target.value)}
                placeholder="optional"
                className="w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground focus:border-purple focus:outline-none"
              />
            </div>
            <div>
              <Label>Stock</Label>
              <input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => set("stock", e.target.value)}
                placeholder="blank = unlimited"
                className="w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground focus:border-purple focus:outline-none"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="optional"
              className="w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground focus:border-purple focus:outline-none"
            />
          </div>

          {!isNew && (
            <div>
              <Label>Slug</Label>
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                className="w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-sm text-foreground focus:border-purple focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Used to match the fallback image <code>/rewards/&lt;slug&gt;.png</code> when no image is set.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-border text-purple focus:ring-purple"
            />
            Active (visible in the member shop)
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-secondary-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || uploading}
            className="rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : isNew ? "Create reward" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">{children}</div>;
}

/** Reward thumbnail that degrades to a placeholder icon when the image is
 *  missing or fails to load (e.g. a stale legacy URL), instead of a broken
 *  image glyph. Mirrors the member shop card. */
function RewardThumb({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="grid h-20 w-20 flex-none place-items-center overflow-hidden rounded-lg border border-border bg-gradient-to-br from-purple-dim to-surface-soft">
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <ImageIcon className="h-7 w-7 text-muted-foreground" aria-hidden />
      )}
    </div>
  );
}
