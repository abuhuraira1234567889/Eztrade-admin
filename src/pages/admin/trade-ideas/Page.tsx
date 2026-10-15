"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { createClient } from "@/lib/supabase/client";
import {
  deleteTradeIdeaVideo,
  updateTradeIdeaProvider,
  uploadTradeIdeaIcon,
  upsertTradeIdeaVideo,
} from "@/services/action-stubs";

type Provider = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  icon_url: string | null;
  tagline: string | null;
  description: string | null;
  accent_color: string | null;
  rules: string | null;
  order_index: number;
  is_published: boolean;
};

type Video = {
  id: string;
  provider_id: string;
  label: string;
  kind: "beginner" | "advanced" | "other";
  bunny_video_id: string | null;
  video_url: string | null;
  order_index: number;
};

const inputCls =
  "w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm";

export default function AdminTradeIdeasPage() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [videosByProvider, setVideosByProvider] = useState<Record<string, Video[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const [{ data: providerData }, { data: videoData }] = await Promise.all([
          supabase
            .from("trade_idea_providers" as never)
            .select(
              "id, slug, name, icon, icon_url, tagline, description, accent_color, rules, order_index, is_published",
            )
            .order("order_index", { ascending: true }),
          supabase
            .from("trade_idea_videos" as never)
            .select("id, provider_id, label, kind, bunny_video_id, video_url, order_index")
            .order("order_index", { ascending: true }),
        ]);

        const provs = (providerData ?? []) as unknown as Provider[];
        const vids = (videoData ?? []) as unknown as Video[];
        const grouped = vids.reduce<Record<string, Video[]>>((acc, v) => {
          (acc[v.provider_id] ??= []).push(v);
          return acc;
        }, {});

        if (!cancelled) {
          setProviders(provs);
          setVideosByProvider(grouped);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Trade Ideas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit each provider&apos;s description and manage its training videos. Members see published
          providers on /trade-ideas.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      )}

      {providers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-soft px-4 py-10 text-center text-sm text-muted-foreground">
          No providers yet.
        </div>
      ) : (
        <div className="space-y-8">
          {providers.map((p) => (
            <ProviderBlock
              key={p.id}
              provider={p}
              videos={videosByProvider[p.id] ?? []}
              onError={setError}
              onSaved={reload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderBlock({
  provider,
  videos,
  onError,
  onSaved,
}: {
  provider: Provider;
  videos: Video[];
  onError: (msg: string | null) => void;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [iconUrl, setIconUrl] = useState(provider.icon_url ?? "");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleProviderSave(formData: FormData) {
    onError(null);
    setPending(true);
    const res = await updateTradeIdeaProvider(formData);
    setPending(false);
    if (!res.ok) {
      onError(res.error ?? "Could not save provider.");
      return;
    }
    onSaved();
  }

  async function handleIconUpload(file: File) {
    onError(null);
    setUploadingIcon(true);
    const res = await uploadTradeIdeaIcon(provider.id, provider.slug, file);
    setUploadingIcon(false);
    if (!res.ok) {
      onError(res.error ?? "Could not upload logo.");
      return;
    }
    setIconUrl(res.url);
  }

  return (
    <section className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3 flex-wrap">
        <h2 className="font-display font-bold text-lg">{provider.name}</h2>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          /{provider.slug}
        </span>
        <span
          className={
            "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded " +
            (provider.is_published ? "bg-green-dim text-green" : "bg-amber-dim text-amber")
          }
        >
          {provider.is_published ? "Published" : "Hidden"}
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleProviderSave(new FormData(e.currentTarget));
        }}
        className="p-5 space-y-4 border-b border-border"
      >
        <input type="hidden" name="id" value={provider.id} />
        {/* Persist the current logo URL on save (upload sets it; empty = remove). */}
        <input type="hidden" name="icon_url" value={iconUrl} />

        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Name" required>
            <input
              type="text"
              name="name"
              defaultValue={provider.name}
              required
              className={inputCls}
            />
          </Field>
          <Field
            label="Slug"
            required
            hint="URL identity: /trade-ideas/<slug>. Changing it changes the member URL."
          >
            <input type="text" name="slug" defaultValue={provider.slug} required className={inputCls} />
          </Field>
          <Field label="Order">
            <input
              type="number"
              name="order_index"
              defaultValue={provider.order_index}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Icon (fallback glyph)" hint="synergy · pulsex · nova · zen">
            <input type="text" name="icon" defaultValue={provider.icon ?? ""} className={inputCls} />
          </Field>
          <Field label="Logo" hint="Custom image shown on the provider page. Overrides the icon.">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-surface-soft border border-border grid place-items-center overflow-hidden flex-shrink-0">
                {iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[10px] text-muted-foreground">None</span>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".png,.svg,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleIconUpload(f);
                  e.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingIcon}
                className="px-3 py-2 rounded-md border border-border text-sm hover:bg-surface-soft transition disabled:opacity-60"
              >
                {uploadingIcon ? "Uploading…" : iconUrl ? "Replace logo" : "Upload logo"}
              </button>
              {iconUrl && (
                <button
                  type="button"
                  onClick={() => setIconUrl("")}
                  disabled={uploadingIcon}
                  className="text-[11px] text-red hover:underline uppercase tracking-wider disabled:opacity-60"
                >
                  Remove
                </button>
              )}
            </div>
          </Field>
        </div>

        <Field label="Tagline" hint="One line, shown on the overview card.">
          <input type="text" name="tagline" defaultValue={provider.tagline ?? ""} className={inputCls} />
        </Field>

        <Field label="Description" hint="One paragraph, shown at the top of the provider page.">
          <textarea
            name="description"
            defaultValue={provider.description ?? ""}
            rows={4}
            className={inputCls}
          />
        </Field>

        <Field
          label="Rules"
          hint="How we trade this strategy. Use numbered headings and '- ' bullet lines."
        >
          <textarea
            name="rules"
            defaultValue={provider.rules ?? ""}
            rows={14}
            className={inputCls + " font-mono text-xs"}
          />
        </Field>

        <div className="grid md:grid-cols-2 gap-4 items-end">
          <Field label="Accent color" hint="Optional. Hex or token. Leave blank for default.">
            <input
              type="text"
              name="accent_color"
              defaultValue={provider.accent_color ?? ""}
              className={inputCls}
            />
          </Field>
          <label className="inline-flex items-center gap-2 cursor-pointer pb-2">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={provider.is_published}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Published (visible to members)</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple text-white text-sm font-medium hover:bg-purple/90 transition disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save provider"}
        </button>
      </form>

      <div className="p-5">
        <div className="eyebrow mb-3">Videos</div>
        <div className="space-y-4">
          {videos.map((v) => (
            <VideoForm
              key={v.id}
              video={v}
              providerId={provider.id}
              providerSlug={provider.slug}
              onError={onError}
              onSaved={onSaved}
            />
          ))}
          <VideoForm
            providerId={provider.id}
            providerSlug={provider.slug}
            onError={onError}
            onSaved={onSaved}
          />
        </div>
      </div>
    </section>
  );
}

function VideoForm({
  video,
  providerId,
  providerSlug,
  onError,
  onSaved,
}: {
  video?: Video;
  providerId: string;
  providerSlug: string;
  onError: (msg: string | null) => void;
  onSaved: () => void;
}) {
  const isNew = !video;
  const [pending, setPending] = useState(false);

  async function handleSave(formData: FormData) {
    onError(null);
    setPending(true);
    const res = await upsertTradeIdeaVideo(formData);
    setPending(false);
    if (!res.ok) {
      onError(res.error ?? "Could not save video.");
      return;
    }
    onSaved();
  }

  async function handleDelete(formData: FormData) {
    onError(null);
    setPending(true);
    const res = await deleteTradeIdeaVideo(formData);
    setPending(false);
    if (!res.ok) {
      onError(res.error ?? "Could not delete video.");
      return;
    }
    onSaved();
  }

  return (
    <div className="rounded-lg border border-border bg-surface-soft/50 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave(new FormData(e.currentTarget));
        }}
        className="space-y-3"
      >
        {video && <input type="hidden" name="id" value={video.id} />}
        <input type="hidden" name="provider_id" value={providerId} />
        <input type="hidden" name="provider_slug" value={providerSlug} />

        <div className="grid md:grid-cols-[1fr_140px_90px] gap-3">
          <Field label="Label" required>
            <input
              type="text"
              name="label"
              defaultValue={video?.label ?? ""}
              required
              placeholder={isNew ? "e.g. Beginner (Must Watch)" : undefined}
              className={inputCls}
            />
          </Field>
          <Field label="Kind">
            <select name="kind" defaultValue={video?.kind ?? "other"} className={inputCls}>
              <option value="beginner">Beginner</option>
              <option value="advanced">Advanced</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Order">
            <input
              type="number"
              name="order_index"
              defaultValue={video?.order_index ?? 0}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Bunny video ID" hint="Preferred. Embeds the Bunny player.">
            <input
              type="text"
              name="bunny_video_id"
              defaultValue={video?.bunny_video_id ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label="Video URL" hint="Fallback iframe src when no Bunny ID.">
            <input
              type="url"
              name="video_url"
              defaultValue={video?.video_url ?? ""}
              placeholder="https://..."
              className={inputCls}
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple text-white text-xs font-medium hover:bg-purple/90 transition disabled:opacity-60"
        >
          {pending ? "Saving…" : isNew ? "Add video" : "Save video"}
        </button>
      </form>

      {video && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleDelete(new FormData(e.currentTarget));
          }}
          className="mt-2"
        >
          <input type="hidden" name="id" value={video.id} />
          <input type="hidden" name="provider_slug" value={providerSlug} />
          <button
            type="submit"
            disabled={pending}
            className="text-[11px] text-red hover:underline uppercase tracking-wider disabled:opacity-60"
          >
            Delete video
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="eyebrow mb-1.5">
        {label}
        {required && <span className="text-red ml-1">*</span>}
      </div>
      {children}
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </label>
  );
}
