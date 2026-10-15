"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, ShieldAlert, Trash2, VolumeX } from "lucide-react";
import { deleteApi, getApi, postApi } from "@/services/api";
import { ConfirmModal, MuteModal, type MuteTarget } from "./mute-modal";

type AdminComment = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  muted: boolean;
  author: { id: string; name: string; isStaff: boolean };
};

type BlockedAttempt = {
  id: string;
  user_id: string;
  name: string;
  body: string;
  reason: "keyword" | "domain" | "regex" | "profanity";
  matched: string;
  created_at: string;
};

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * Staff review of one announcement's comments, with the attempts the
 * moderation filter rejected shown alongside. Expanded on demand so the
 * announcements list stays cheap to load.
 */
export function CommentReview({ announcementId }: { announcementId: string }) {
  const { t } = useTranslation("announcements");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [blocked, setBlocked] = useState<BlockedAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muteTarget, setMuteTarget] = useState<MuteTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, b] = await Promise.all([
        getApi<{ ok: boolean; items?: AdminComment[] }>(
          `/api/announcements/${announcementId}/comments/admin`,
        ),
        getApi<{ ok: boolean; items?: BlockedAttempt[] }>(
          `/api/announcements/comment-blocked?announcementId=${announcementId}`,
        ),
      ]);
      setComments(c.items ?? []);
      setBlocked(b.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load comments.");
    }
    setLoading(false);
  }, [announcementId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function removeComment(id: string) {
    setPendingDelete(null);
    await deleteApi(`/api/announcements/comments/${id}`);
    await load();
  }

  async function muteAuthor(input: { reason: string; expiresAt: string | null }) {
    const target = muteTarget;
    setMuteTarget(null);
    if (!target) return;
    await postApi("/api/announcements/comment-mutes", {
      userId: target.userId,
      reason: input.reason || undefined,
      expiresAt: input.expiresAt,
    });
    await load();
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary-foreground transition-colors hover:text-purple"
      >
        <MessageCircle className="h-3.5 w-3.5" aria-hidden />
        {open ? t("admin.commentsHide") : t("admin.commentsShow")}
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {error && (
            <p className="rounded-lg border border-red/30 bg-red-dim/30 px-3 py-2 text-xs text-red">
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-xs text-muted-foreground">…</p>
          ) : (
            <>
              {/* Posted comments */}
              <div>
                <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("admin.commentsPosted", { count: comments.length })}
                </h4>
                {comments.length === 0 ? (
                  <p className="rounded-lg border border-border bg-surface-soft p-4 text-center text-xs text-muted-foreground">
                    {t("admin.commentsEmpty")}
                  </p>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {comments.map((c) => (
                      <li key={c.id} className="flex items-start gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-xs font-semibold text-foreground">
                              {c.author.name}
                            </span>
                            {c.author.isStaff && (
                              <span className="rounded-full bg-purple-dim px-1.5 py-0.5 text-[10px] font-semibold uppercase text-purple">
                                {t("comments.staffBadge")}
                              </span>
                            )}
                            {c.parentId && (
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {t("admin.commentIsReply")}
                              </span>
                            )}
                            {c.muted && (
                              <span className="rounded-full bg-amber-dim/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber">
                                {t("admin.commentAuthorMuted")}
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {when(c.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-line break-words text-sm text-secondary-foreground">
                            {c.body}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          {!c.muted && !c.author.isStaff && (
                            <button
                              type="button"
                              onClick={() =>
                                setMuteTarget({
                                  userId: c.author.id,
                                  name: c.author.name,
                                })
                              }
                              title={t("admin.commentMuteAuthor")}
                              aria-label={t("admin.commentMuteAuthor")}
                              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-amber-dim/40 hover:text-amber"
                            >
                              <VolumeX className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPendingDelete(c.id)}
                            title={t("admin.delete")}
                            aria-label={t("admin.delete")}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-dim/40 hover:text-red"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* What the filter stopped */}
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                  {t("admin.blockedHeading", { count: blocked.length })}
                </h4>
                {blocked.length === 0 ? (
                  <p className="rounded-lg border border-border bg-surface-soft p-4 text-center text-xs text-muted-foreground">
                    {t("admin.blockedEmpty")}
                  </p>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                    {blocked.map((b) => (
                      <li key={b.id} className="flex items-start gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-xs font-semibold text-foreground">
                              {b.name}
                            </span>
                            <span className="rounded-full bg-red-dim/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red">
                              {t(`admin.blockedReason.${b.reason}`)}
                            </span>
                            <code className="rounded bg-surface-soft px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                              {b.matched}
                            </code>
                            <span className="text-[11px] text-muted-foreground">
                              {when(b.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-line break-words text-sm text-muted-foreground line-through decoration-red/40">
                            {b.body}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setMuteTarget({ userId: b.user_id, name: b.name })
                          }
                          title={t("admin.commentMuteAuthor")}
                          aria-label={t("admin.commentMuteAuthor")}
                          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-amber-dim/40 hover:text-amber"
                        >
                          <VolumeX className="h-4 w-4" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <MuteModal
        target={muteTarget}
        onCancel={() => setMuteTarget(null)}
        onConfirm={(input) => void muteAuthor(input)}
      />

      <ConfirmModal
        open={pendingDelete !== null}
        title={t("admin.commentDeleteTitle")}
        body={t("admin.commentDeleteConfirm")}
        confirmLabel={t("admin.delete")}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void removeComment(pendingDelete);
        }}
      />
    </div>
  );
}
