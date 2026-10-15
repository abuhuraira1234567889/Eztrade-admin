"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { VolumeX, X } from "lucide-react";

export type MuteTarget = { userId: string; name: string };

const DURATIONS = [
  { key: "24h", hours: 24 },
  { key: "7d", hours: 24 * 7 },
  { key: "30d", hours: 24 * 30 },
  { key: "forever", hours: null },
] as const;

type DurationKey = (typeof DURATIONS)[number]["key"];

/**
 * Mute dialog for the admin comment tools. Replaces window.prompt, which could
 * only collect a reason as free text and gave no way to set an expiry - the
 * `expires_at` column existed but nothing in the UI could ever populate it.
 */
export function MuteModal({
  target,
  onCancel,
  onConfirm,
}: {
  target: MuteTarget | null;
  onCancel: () => void;
  onConfirm: (input: { reason: string; expiresAt: string | null }) => void;
}) {
  const { t } = useTranslation("announcements");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<DurationKey>("forever");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset per target so a previous reason never leaks into the next mute.
  useEffect(() => {
    if (target) {
      setReason("");
      setDuration("forever");
      setBusy(false);
      // Focus after paint so the dialog is on screen first.
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onCancel]);

  if (!target) return null;

  function submit() {
    if (busy || !target) return;
    setBusy(true);
    const hours = DURATIONS.find((d) => d.key === duration)?.hours ?? null;
    onConfirm({
      reason: reason.trim(),
      expiresAt:
        hours === null
          ? null
          : new Date(Date.now() + hours * 3_600_000).toISOString(),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={t("admin.muteModalTitle", { name: target.name })}
    >
      <div
        className="flex w-full max-w-md flex-col rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <VolumeX className="h-5 w-5 text-amber" aria-hidden />
            {t("admin.muteModalTitle", { name: target.name })}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t("admin.cancel")}
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-surface-soft hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            {t("admin.muteModalBody")}
          </p>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              {t("admin.muteReason")}
            </span>
            <input
              ref={inputRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder={t("admin.muteReasonPlaceholder")}
              className="rounded-lg border border-border bg-surface-soft px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-purple/50"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("admin.muteDuration")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDuration(d.key)}
                  aria-pressed={duration === d.key}
                  className={[
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                    duration === d.key
                      ? "border-purple/50 bg-purple-dim/50 text-foreground"
                      : "border-border bg-surface-soft text-secondary-foreground hover:border-purple/30",
                  ].join(" ")}
                >
                  {t(`admin.muteDurations.${d.key}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("admin.cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-amber px-3.5 py-2 text-sm font-semibold text-background transition-opacity disabled:opacity-50"
          >
            {busy ? t("admin.muteConfirming") : t("admin.muteConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small confirm dialog, so destructive admin actions stop using window.confirm. */
export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation("announcements");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="flex w-full max-w-sm flex-col rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          <h3 className="font-display text-base font-bold">{title}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("admin.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
