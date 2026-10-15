"use client";

import { useState, useTransition } from "react";
import { useTranslation } from "react-i18next";
import { Megaphone, Send, PenLine, Trash2, Pencil, Check, X, Lock } from "lucide-react";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  setCommentsLocked,
} from "@/services/action-stubs";
import { CommentReview } from "./comment-review";

export type AdminAnnouncement = {
  id: string;
  title: string | null;
  body: string;
  source: "telegram" | "manual";
  is_published: boolean;
  published_at: string;
  comments_locked?: boolean;
};

export function AnnouncementsManager({ initial }: { initial: AdminAnnouncement[] }) {
  const { t } = useTranslation("announcements");
  const [items, setItems] = useState<AdminAnnouncement[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);

  function upsertLocal(row: AdminAnnouncement) {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === row.id);
      if (idx === -1) return [row, ...prev];
      const next = [...prev];
      next[idx] = row;
      return next;
    });
  }

  function removeLocal(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-8">
      <Composer
        onCreated={(row) => upsertLocal(row)}
      />

      <div>
        <h2 className="field-label mb-3">{t("admin.listHeading")}</h2>
        {items.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
            {t("admin.empty")}
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((row) =>
              editingId === row.id ? (
                <li key={row.id}>
                  <EditRow
                    row={row}
                    onCancel={() => setEditingId(null)}
                    onSaved={(updated) => {
                      upsertLocal(updated);
                      setEditingId(null);
                    }}
                  />
                </li>
              ) : (
                <li key={row.id}>
                  <DisplayRow
                    row={row}
                    onEdit={() => setEditingId(row.id)}
                    onDeleted={() => removeLocal(row.id)}
                  />
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function Composer({ onCreated }: { onCreated: (row: AdminAnnouncement) => void }) {
  const { t } = useTranslation("announcements");
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!body.trim()) {
      setError(t("admin.bodyRequired"));
      return;
    }
    startTransition(() => { void createAnnouncement({ title, body, isPublished }).then((res) => {
      if (!res.ok) {
        setError(res.error ?? null);
        return;
      }
      onCreated({
        id: (res as { ok: boolean; error?: string; id?: string }).id!,
        title: title.trim() || null,
        body: body.trim(),
        source: "manual",
        is_published: isPublished,
        published_at: new Date().toISOString(),
      });
      setTitle("");
      setBody("");
      setIsPublished(true);
    }); });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-purple" />
        <h2 className="text-sm font-bold uppercase tracking-wider">{t("admin.newHeading")}</h2>
      </div>
      <Fields
        title={title}
        body={body}
        isPublished={isPublished}
        onTitle={setTitle}
        onBody={setBody}
        onPublished={setIsPublished}
      />
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
      <button
        onClick={submit}
        disabled={pending}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
      >
        <Check className="h-4 w-4" /> {pending ? t("admin.saving") : t("admin.create")}
      </button>
    </div>
  );
}

function EditRow({
  row,
  onCancel,
  onSaved,
}: {
  row: AdminAnnouncement;
  onCancel: () => void;
  onSaved: (row: AdminAnnouncement) => void;
}) {
  const { t } = useTranslation("announcements");
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(row.title ?? "");
  const [body, setBody] = useState(row.body);
  const [isPublished, setIsPublished] = useState(row.is_published);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    if (!body.trim()) {
      setError(t("admin.bodyRequired"));
      return;
    }
    startTransition(() => { void updateAnnouncement({ id: row.id, title, body, isPublished }).then((res) => {
      if (!res.ok) {
        setError(res.error ?? null);
        return;
      }
      onSaved({ ...row, title: title.trim() || null, body: body.trim(), is_published: isPublished });
    }); });
  }

  return (
    <div className="rounded-xl border border-purple/40 bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <Pencil className="h-4 w-4 text-purple" />
        <h3 className="text-sm font-bold uppercase tracking-wider">{t("admin.editHeading")}</h3>
      </div>
      <Fields
        title={title}
        body={body}
        isPublished={isPublished}
        onTitle={setTitle}
        onBody={setBody}
        onPublished={setIsPublished}
      />
      {error && <p className="mt-2 text-xs text-red">{error}</p>}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
        >
          <Check className="h-4 w-4" /> {pending ? t("admin.saving") : t("admin.save")}
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:bg-surface-soft"
        >
          <X className="h-4 w-4" /> {t("admin.cancel")}
        </button>
      </div>
    </div>
  );
}

function DisplayRow({
  row,
  onEdit,
  onDeleted,
}: {
  row: AdminAnnouncement;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation("announcements");
  const [pending, startTransition] = useTransition();
  const [locked, setLocked] = useState(!!row.comments_locked);
  const [lockBusy, setLockBusy] = useState(false);
  const SourceIcon = row.source === "telegram" ? Send : PenLine;

  function remove() {
    if (!confirm(t("admin.deleteConfirm"))) return;
    startTransition(() => { void deleteAnnouncement(row.id).then((res) => {
      if (res.ok) onDeleted();
    }); });
  }

  async function toggleLock() {
    setLockBusy(true);
    const next = !locked;
    const res = await setCommentsLocked(row.id, next);
    if (res.ok) setLocked(next);
    setLockBusy(false);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">
          {row.title || t("card.defaultTitle")}
        </h3>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-soft px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <SourceIcon className="h-3 w-3" aria-hidden />
            {row.source === "telegram" ? t("admin.sourceTelegram") : t("admin.sourceManual")}
          </span>
          {!row.is_published && (
            <span className="rounded-full border border-amber/40 bg-amber-dim/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber">
              {t("admin.unpublished")}
            </span>
          )}
          {locked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-soft px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden />
              {t("admin.commentsLocked")}
            </span>
          )}
        </div>
      </div>
      <p className="line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-secondary-foreground">
        {row.body}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-secondary-foreground transition hover:bg-surface-soft"
        >
          <Pencil className="h-3 w-3" /> {t("admin.edit")}
        </button>
        <button
          onClick={remove}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border border-red/30 px-2.5 py-1 text-xs font-semibold text-red transition hover:bg-red-dim/40 disabled:opacity-60"
        >
          <Trash2 className="h-3 w-3" /> {t("admin.delete")}
        </button>
        <button
          onClick={() => void toggleLock()}
          disabled={lockBusy}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-secondary-foreground transition hover:bg-surface-soft disabled:opacity-60"
        >
          <Lock className="h-3 w-3" />
          {locked ? t("admin.commentsUnlock") : t("admin.commentsLock")}
        </button>
      </div>

      <CommentReview announcementId={row.id} />
    </div>
  );
}

function Fields({
  title,
  body,
  isPublished,
  onTitle,
  onBody,
  onPublished,
}: {
  title: string;
  body: string;
  isPublished: boolean;
  onTitle: (v: string) => void;
  onBody: (v: string) => void;
  onPublished: (v: boolean) => void;
}) {
  const { t } = useTranslation("announcements");
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="field-label">{t("admin.titleLabel")}</span>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder={t("admin.titlePlaceholder")}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-purple"
        />
      </label>
      <label className="block">
        <span className="field-label">{t("admin.bodyLabel")}</span>
        <textarea
          value={body}
          onChange={(e) => onBody(e.target.value)}
          placeholder={t("admin.bodyPlaceholder")}
          rows={5}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-purple"
        />
      </label>
      <label className="flex cursor-pointer items-start gap-3 rounded-md p-1">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => onPublished(e.target.checked)}
          className="mt-1 accent-purple"
        />
        <div>
          <div className="text-sm font-semibold">{t("admin.publishedLabel")}</div>
          <div className="text-xs text-muted-foreground">{t("admin.publishedHint")}</div>
        </div>
      </label>
    </div>
  );
}
