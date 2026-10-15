"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/api";
import type { AppNotification } from "@/lib/notifications/types";

const DROPDOWN_LIMIT = 8;

export function useNotificationBell(userId: string | null | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadUnread = useCallback(async () => {
    if (!userId) return;
    const res = await fetchUnreadCount();
    if (res.ok) setUnreadCount(res.count);
  }, [userId]);

  const reloadDropdown = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNotifications({ filter: "all", page: 0, limit: DROPDOWN_LIMIT });
      if (res.ok) {
        setItems(res.items);
      } else {
        setError(res.error);
      }
      await reloadUnread();
    } finally {
      setLoading(false);
    }
  }, [userId, reloadUnread]);

  useEffect(() => {
    if (!userId) return;
    void reloadUnread();
  }, [userId, reloadUnread]);

  // Realtime: refresh the unread count whenever this admin's notifications change.
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void reloadUnread();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, reloadUnread]);

  const markRead = useCallback(
    async (id: string) => {
      setItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      const res = await markNotificationRead(id);
      if (!res.ok) {
        void reloadDropdown();
        return false;
      }
      return true;
    },
    [reloadDropdown],
  );

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    setUnreadCount(0);
    const res = await markAllNotificationsRead();
    if (!res.ok) void reloadDropdown();
    return res.ok;
  }, [reloadDropdown]);

  return {
    unreadCount,
    items,
    loading,
    error,
    reloadDropdown,
    reloadUnread,
    markRead,
    markAllRead,
  };
}

export function relativeNotificationTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
