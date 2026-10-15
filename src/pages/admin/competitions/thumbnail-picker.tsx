"use client";

import * as React from "react";
import { uploadCompetitionThumbnail } from "@/services/action-stubs";
import { Upload, X, ImageIcon } from "lucide-react";

/**
 * Thumbnail picker for the competition form. Two ways to set the URL:
 *
 *   1. Upload a file → posts to `uploadCompetitionThumbnail` server action,
 *      which writes to the `competition-thumbnails` Supabase Storage bucket
 *      and returns the public URL.
 *   2. Paste a URL into the visible text input.
 *
 * The resolved URL is stored in a hidden `thumbnail_url` field so the
 * create/update server actions stay file-agnostic.
 *
 * Live-events uses a hardcoded set of /public/session-banners/*.png images
 * (see app/admin/live-events/session-banners.ts). We chose Storage for
 * competitions because the founder will likely want bespoke artwork per
 * contest, not from a fixed set.
 */
export function ThumbnailPicker({
 defaultValue,
 competitionId,
}: {
 defaultValue?: string | null;
 competitionId?: string;
}) {
 const [url, setUrl] = React.useState<string>(defaultValue ?? "");
 const [uploading, setUploading] = React.useState(false);
 const [error, setError] = React.useState<string | null>(null);
 const fileInputRef = React.useRef<HTMLInputElement>(null);

 async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
 const file = e.target.files?.[0];
 if (!file) return;
 setError(null);
 setUploading(true);

 const fd = new FormData();
 fd.append("file", file);
 if (competitionId) fd.append("competitionId", competitionId);

 const result = await uploadCompetitionThumbnail(fd) as { ok: boolean; error?: string; url?: string };
 setUploading(false);

 if (result.error) {
 setError(result.error);
 if (fileInputRef.current) fileInputRef.current.value = "";
 return;
 }
 if (result.url) {
 setUrl(result.url);
 }
 if (fileInputRef.current) fileInputRef.current.value = "";
 }

 return (
 <div className="space-y-2">
 <input type="hidden" name="thumbnail_url" value={url} />

 {/* Preview */}
 <div
 className="w-full rounded-xl overflow-hidden border border-border bg-surface-soft flex items-center justify-center"
 style={{ aspectRatio: "720 / 300" }}
 >
 {url ? (
 // eslint-disable-next-line @next/next/no-img-element
 <img
 src={url}
 alt="Thumbnail preview"
 className="w-full h-full"
 style={{ objectFit: "cover" }}
 />
 ) : (
 <div className="flex flex-col items-center gap-1 text-muted-foreground">
 <ImageIcon className="w-7 h-7" />
 <span className="text-[11px] uppercase tracking-wider">No thumbnail</span>
 </div>
 )}
 </div>

 {/* Controls */}
 <div className="flex flex-wrap items-center gap-2">
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 disabled={uploading}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface-soft text-foreground text-xs font-medium hover:border-purple/60 transition disabled:opacity-50"
 >
 <Upload className="w-3.5 h-3.5" />
 {uploading ? "Uploading..." : url ? "Replace" : "Upload"}
 </button>
 <input
 ref={fileInputRef}
 type="file"
 accept="image/png,image/jpeg,image/webp,image/gif"
 onChange={onFileChange}
 className="hidden"
 />
 {url && (
 <button
 type="button"
 onClick={() => setUrl("")}
 className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground transition"
 >
 <X className="w-3 h-3" /> Clear
 </button>
 )}
 </div>

 {/* URL fallback - admin can also paste a hosted image URL */}
 <div>
 <label className="block">
 <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1">
 Or paste image URL
 </div>
 <input
 type="url"
 value={url}
 onChange={(e) => setUrl(e.target.value)}
 placeholder="https://..."
 className="w-full px-3 py-2 rounded-md border border-border bg-surface-soft text-foreground text-sm"
 />
 </label>
 </div>

 {error && (
 <div className="text-[11px] text-red px-2.5 py-1.5 rounded-md bg-red-dim border border-red/20">
 {error}
 </div>
 )}
 </div>
 );
}
