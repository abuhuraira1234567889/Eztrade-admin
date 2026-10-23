"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, RotateCcw, ImageOff } from "lucide-react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { listAssets, uploadAsset, revertAsset, type AssetSlotRow, type AssetItemRow } from "@/services/assets-admin";

export default function AdminImagesPage() {
  const [slots, setSlots] = useState<AssetSlotRow[] | null>(null);
  const [bunnyConfigured, setBunnyConfigured] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const pending = useRef<{ slot: string; item: string; label: string; accept: string[] } | null>(null);

  async function load() {
    const res = await listAssets();
    setSlots(res.slots);
    setBunnyConfigured(res.bunnyConfigured);
    setNeedsMigration(!!res.needsMigration);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e?.message ?? "Failed to load images"));
  }, []);

  // Slots grouped by their `group`, preserving registry order.
  const groups = useMemo(() => {
    const out: { group: string; slots: AssetSlotRow[] }[] = [];
    for (const s of slots ?? []) {
      let g = out.find((x) => x.group === s.group);
      if (!g) { g = { group: s.group, slots: [] }; out.push(g); }
      g.slots.push(s);
    }
    return out;
  }, [slots]);

  if (!slots) return <PageSkeleton />;

  function pickFile(slot: string, item: string, label: string, accept: string[]) {
    if (!bunnyConfigured) return toast.error("Configure Bunny storage first.");
    pending.current = { slot, item, label, accept };
    if (fileInput.current) {
      fileInput.current.accept = accept.join(",");
      fileInput.current.value = "";
      fileInput.current.click();
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const p = pending.current;
    pending.current = null;
    if (!file || !p) return;
    const key = `${p.slot}/${p.item}`;
    setUploading(key);
    try {
      await uploadAsset(p.slot, p.item, file);
      toast.success(`${p.label} replaced.`);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function revert(slot: string, item: string, label: string) {
    const key = `${slot}/${item}`;
    setUploading(key);
    try {
      await revertAsset(slot, item);
      toast.success(`${label} reverted to default.`);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Revert failed");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="space-y-6">
      <input ref={fileInput} type="file" className="hidden" onChange={onFile} />

      <div>
        <h1 className="text-2xl font-display font-bold">Images</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Replace the platform's bundled artwork - broker logos, marketing visuals, avatars, badges,
          banners and more. Uploads go to your CDN and apply to members live. Reset restores the
          built-in image.
        </p>
      </div>

      {needsMigration && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Showing defaults - the <code className="text-xs">asset_overrides</code> table isn’t in the
          database yet. Run <code className="text-xs">schema/191_asset_overrides.sql</code> in Supabase.
        </div>
      )}
      {!bunnyConfigured && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Image replacement needs Bunny storage. Set <code className="text-xs">BUNNY_STORAGE_ZONE</code>,{" "}
          <code className="text-xs">BUNNY_STORAGE_API_KEY</code> and{" "}
          <code className="text-xs">BUNNY_PULL_ZONE_URL</code> on the backend to enable uploads.
        </div>
      )}

      {groups.map((g) => (
        <details key={g.group} open className="rounded-xl border border-border bg-surface">
          <summary className="cursor-pointer select-none px-4 py-3 font-display font-bold text-sm">
            {g.group}
          </summary>
          <div className="px-4 pb-4 space-y-5">
            {g.slots.map((s) => (
              <div key={s.slot}>
                <div className="text-xs font-semibold text-muted-foreground mb-2">{s.label}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {s.items.map((it) => (
                    <Tile
                      key={it.key}
                      item={it}
                      busy={uploading === `${s.slot}/${it.key}`}
                      disabled={!!uploading}
                      onUpload={() => pickFile(s.slot, it.key, it.label, it.accept)}
                      onRevert={() => revert(s.slot, it.key, it.label)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function Tile({
  item, busy, disabled, onUpload, onRevert,
}: {
  item: AssetItemRow;
  busy: boolean;
  disabled: boolean;
  onUpload: () => void;
  onRevert: () => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-background p-2 flex flex-col gap-1.5">
      <div className="aspect-square rounded-md bg-surface-soft grid place-items-center overflow-hidden">
        {broken ? (
          <ImageOff className="w-5 h-5 text-muted-foreground" />
        ) : (
          <img
            src={item.url}
            alt={item.label}
            loading="lazy"
            className="max-w-full max-h-full object-contain"
            onError={() => setBroken(true)}
          />
        )}
      </div>
      <div className="text-[11px] font-mono truncate" title={item.label}>{item.label}</div>
      <div className={"text-[10px] " + (item.replaced ? "text-purple" : "text-muted-foreground")}>
        {item.replaced ? "Replaced" : "Default"}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onUpload}
          disabled={disabled}
          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-purple text-white text-[11px] font-semibold hover:bg-purple/90 transition disabled:opacity-50"
        >
          <Upload className="w-3 h-3" /> {busy ? "…" : "Upload"}
        </button>
        {item.replaced && (
          <button
            type="button"
            onClick={onRevert}
            disabled={disabled}
            title="Revert to the built-in image"
            className="inline-flex items-center justify-center p-1 rounded-md border border-border hover:bg-surface-soft transition disabled:opacity-40"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
