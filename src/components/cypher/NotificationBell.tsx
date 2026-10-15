"use client";

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useNotificationBell, relativeNotificationTime } from "@/hooks/useNotifications";
import type { AppNotification, NotificationType } from "@/lib/notifications/types";

const TYPE_STYLES: Record<NotificationType, string> = {
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  info: "bg-purple/15 text-purple",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  error: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const TYPE_LABELS: Record<NotificationType, string> = {
  success: "Success",
  info: "Info",
  warning: "Alert",
  error: "Error",
};

// Resolve an in-app admin route for a notification, or null when it targets a
// member-only page (bell items store absolute links to the member frontend).
function adminPathFor(item: AppNotification): string | null {
  if (item.link) {
    try {
      const u = new URL(item.link, window.location.origin);
      const path = u.pathname + u.search;
      if (path.startsWith("/admin")) return path;
    } catch {
      if (item.link.startsWith("/admin")) return item.link;
    }
  }
  const d = item.data;
  if (d?.entity_type === "support_ticket" && d.entity_id) {
    return `/admin/support/${d.entity_id}`;
  }
  return null;
}

function NotificationRow({
  item,
  onOpen,
}: {
  item: AppNotification;
  onOpen: (item: AppNotification) => void;
}) {
  const unread = !item.read_at;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        "w-full text-left px-3 py-2.5 rounded-lg transition hover:bg-surface-soft",
        unread && "bg-purple/5",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full",
            unread ? "bg-purple" : "bg-transparent",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                TYPE_STYLES[item.type] ?? TYPE_STYLES.info,
              )}
            >
              {TYPE_LABELS[item.type] ?? TYPE_LABELS.info}
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {relativeNotificationTime(item.created_at)}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground line-clamp-1">{item.title}</p>
          {item.body && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.body}</p>
          )}
        </div>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const {
    unreadCount,
    items,
    loading,
    error,
    reloadDropdown,
    markRead,
    markAllRead,
  } = useNotificationBell(user?.id);

  useEffect(() => {
    if (!open) return;
    void reloadDropdown();
  }, [open, reloadDropdown]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleOpenItem = async (item: AppNotification) => {
    if (!item.read_at) void markRead(item.id);
    const path = adminPathFor(item);
    setOpen(false);
    if (path) navigate(path);
  };

  const handleMarkAll = async () => {
    const ok = await markAllRead();
    if (ok) toast.success("All notifications marked read");
    else toast.error("Couldn't mark all read");
  };

  if (!user) return null;

  const badge =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-soft text-muted-foreground hover:border-purple/40 hover:text-foreground transition active:scale-95"
      >
        <Bell className="w-4 h-4" aria-hidden />
        {badge && (
          <span className="absolute -top-1 -end-1 min-w-[16px] h-4 px-1 rounded-full bg-purple text-white text-[10px] font-bold leading-4 text-center tabular-nums">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full end-0 mt-2 w-[min(380px,calc(100vw-2rem))] rounded-xl border border-border-strong shadow-2xl z-30 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-sm:fixed max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:end-auto max-sm:top-14"
          style={{ background: "var(--bg-elevated)" }}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border">
            <h2 className="font-display text-sm font-semibold text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple hover:opacity-80 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
            {loading && (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            {!loading && error && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                Couldn't load notifications.
              </p>
            )}
            {!loading && !error && items.length === 0 && (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                You're all caught up.
              </p>
            )}
            {!loading &&
              !error &&
              items.map((item) => (
                <NotificationRow key={item.id} item={item} onOpen={handleOpenItem} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
