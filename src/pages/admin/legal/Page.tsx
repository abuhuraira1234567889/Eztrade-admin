"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, Trash2 } from "lucide-react";
import { PageSkeleton } from "@/components/cypher/Skeleton";
import { listLegal, updateLegal, removeLegal, type LegalDocRow } from "@/services/legal-admin";

const inputCls =
  "w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm outline-none focus:border-purple";

type Draft = { title: string; body: string; isPublished: boolean };

/**
 * Editor starting point. When the operator hasn't saved an override yet (or the
 * saved body is empty), pre-fill with the current built-in page so they edit
 * from what members see today instead of a blank box.
 */
function toDraft(d: LegalDocRow): Draft {
  const hasOwnBody = d.hasOverride && d.body.trim().length > 0;
  return {
    title: d.title || d.builtinTitle || d.defaultTitle,
    body: hasOwnBody ? d.body : d.builtinBody,
    isPublished: d.isPublished,
  };
}

export default function AdminLegalPage() {
  const [docs, setDocs] = useState<LegalDocRow[] | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [active, setActive] = useState<string>("terms");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await listLegal();
    setDocs(res.docs);
    setNeedsMigration(!!res.needsMigration);
    setDrafts(Object.fromEntries(res.docs.map((d) => [d.slug, toDraft(d)])));
    if (res.docs[0] && !res.docs.some((d) => d.slug === active)) setActive(res.docs[0].slug);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e?.message ?? "Failed to load legal documents"));
  }, []);

  const current = useMemo(() => docs?.find((d) => d.slug === active) ?? null, [docs, active]);

  if (!docs) return <PageSkeleton />;

  function patch(up: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [active]: { ...d[active], ...up } }));
  }

  async function save() {
    if (!current) return;
    const d = drafts[active];
    if (d.isPublished && !d.body.trim()) return toast.error("Add document text before publishing.");
    setBusy(true);
    try {
      await updateLegal(active, { title: d.title.trim(), body: d.body, isPublished: d.isPublished });
      toast.success(`${d.title.trim() || current.defaultTitle} saved.`);
      setDocs((prev) =>
        (prev ?? []).map((x) =>
          x.slug === active
            ? { ...x, title: d.title.trim() || x.defaultTitle, body: d.body, isPublished: d.isPublished, hasOverride: true }
            : x,
        ),
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function revert() {
    if (!current) return;
    setBusy(true);
    try {
      await removeLegal(active);
      toast.success(`${current.defaultTitle} reverted to the built-in page.`);
      setDocs((prev) =>
        (prev ?? []).map((x) =>
          x.slug === active
            ? { ...x, title: x.defaultTitle, body: "", isPublished: false, hasOverride: false }
            : x,
        ),
      );
      // Back to the built-in content so the editor shows what members now see.
      setDrafts((d) => ({
        ...d,
        [active]: { title: current.builtinTitle || current.defaultTitle, body: current.builtinBody, isPublished: false },
      }));
    } catch (e: any) {
      toast.error(e?.message ?? "Revert failed");
    } finally {
      setBusy(false);
    }
  }

  const d = drafts[active];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Legal documents</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          The editor starts with the current built-in page content. Edit it and tick
          <span className="font-medium"> Published</span> to show your version on the public page.
          Until you publish, members keep seeing the built-in, fully-translated page. Publishing an
          override replaces the translated pages with this single version.
        </p>
      </div>

      {needsMigration && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Showing defaults - the <code className="text-xs">legal_documents</code> table isn’t in the
          database yet. Run <code className="text-xs">schema/185_legal_documents.sql</code> in Supabase.
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {docs.map((doc) => (
          <button
            key={doc.slug}
            type="button"
            onClick={() => setActive(doc.slug)}
            className={
              "px-3 py-1.5 rounded-lg text-sm font-semibold border transition " +
              (doc.slug === active
                ? "bg-purple text-white border-purple"
                : "border-border text-muted-foreground hover:bg-surface-soft")
            }
          >
            {doc.defaultTitle}
            {doc.isPublished ? " · live" : doc.hasOverride ? " · draft" : ""}
          </button>
        ))}
      </div>

      {current && d && (
        <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
          <div className="text-xs">
            {current.isPublished ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                ● Live - your published version is shown to members.
              </span>
            ) : current.hasOverride ? (
              <span className="text-amber-600 dark:text-amber-400">
                ● Draft saved - members still see the built-in page until you publish.
              </span>
            ) : (
              <span className="text-muted-foreground">
                ● Showing the current built-in content. Edit and Save to create your own version.
              </span>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-semibold" htmlFor="legal-title">
              Title
            </label>
            <input
              id="legal-title"
              className={inputCls + " mt-1"}
              placeholder={current.defaultTitle}
              value={d.title}
              disabled={busy}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-semibold" htmlFor="legal-body">
              Body (markdown - headings #, **bold**, lists, [links](url))
            </label>
            <textarea
              id="legal-body"
              className={inputCls + " mt-1 min-h-[360px] font-mono text-[13px] resize-y"}
              placeholder="# Terms of Service&#10;&#10;Your custom legal text here…"
              value={d.body}
              disabled={busy}
              onChange={(e) => patch({ body: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                id="legal-published"
                type="checkbox"
                checked={d.isPublished}
                disabled={busy}
                onChange={(e) => patch({ isPublished: e.target.checked })}
              />
              Published (show my version on the public page)
            </label>
            <div className="flex items-center gap-2">
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
                onClick={revert}
                disabled={busy || !current.hasOverride}
                title="Delete this override and restore the built-in page"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-surface-soft transition disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" /> Revert to built-in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
