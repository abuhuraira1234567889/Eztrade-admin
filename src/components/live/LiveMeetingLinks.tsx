"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  joinLink?: string | null;
  hostJoinLink?: string | null;
  showHostLink?: boolean;
  compact?: boolean;
};

export function LiveMeetingLinks({
  joinLink,
  hostJoinLink,
  showHostLink = false,
  compact = false,
}: Props) {
  const { t } = useTranslation("live");
  const [copied, setCopied] = useState<"viewer" | "host" | null>(null);

  if (!joinLink && !hostJoinLink) return null;

  async function copyLink(kind: "viewer" | "host", url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }

  const rowClass = compact
    ? "flex flex-col gap-1.5"
    : "rounded-lg border border-border bg-surface-soft/50 p-3 space-y-2";

  return (
    <div className={rowClass}>
      {joinLink && (
        <LinkRow
          label={t("meeting.viewerLink")}
          url={joinLink}
          copied={copied === "viewer"}
          onCopy={() => void copyLink("viewer", joinLink)}
          openLabel={t("meeting.openViewerLink")}
          compact={compact}
        />
      )}
      {showHostLink && hostJoinLink && (
        <LinkRow
          label={t("meeting.hostLink")}
          url={hostJoinLink}
          copied={copied === "host"}
          onCopy={() => void copyLink("host", hostJoinLink)}
          openLabel={t("meeting.openHostLink")}
          compact={compact}
        />
      )}
    </div>
  );
}

function LinkRow({
  label,
  url,
  copied,
  onCopy,
  openLabel,
  compact,
}: {
  label: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
  openLabel: string;
  compact: boolean;
}) {
  return (
    <div className={compact ? "min-w-0" : undefined}>
      <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">{label}</div>
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-purple hover:underline break-all"
        >
          {compact ? openLabel : url}
        </a>
        <button
          type="button"
          onClick={onCopy}
          className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
