"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/** Fallback refetch cadence, for when Realtime is down or the socket dropped. */
const POLL_MS = 20_000;
/** One message write touches the ticket more than once - coalesce the burst. */
const DEBOUNCE_MS = 400;

/**
 * Keeps a support ticket list live: unread dots, statuses and ordering update
 * as messages land instead of only on reload.
 *
 * Watches `support_tickets` rather than `support_messages` because every message
 * write also touches its ticket row (see schema/102_support_tickets_realtime.sql),
 * so a single UPDATE event covers new messages, status changes and read-state
 * changes alike.
 *
 * @param onChange  refetch the list. Must be stable (useCallback) - it keys the
 *                  subscription, so a new identity each render resubscribes.
 * @param userId    member view: only that member's tickets. Omit for the staff
 *                  inbox, which watches every ticket (RLS `tickets_self_rw`
 *                  already scopes both cases correctly).
 */
export function useSupportTicketsLive(onChange: () => void, userId?: string | null) {
  // Read the latest callback from the timer/listener without making them
  // dependencies, so an unstable onChange can't tear the subscription down.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const supabase = createClient();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const ping = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(userId ? `support_tickets:${userId}` : "support_tickets:staff")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
          ...(userId ? { filter: `user_id=eq.${userId}` } : {}),
        },
        ping,
      )
      .subscribe();

    // Realtime can lag or the socket can die on a sleeping tab; a slow poll and
    // a refetch on tab focus mean the list is never stale for long either way.
    const poll = window.setInterval(() => onChangeRef.current(), POLL_MS);
    const onVisible = () => {
      if (!document.hidden) onChangeRef.current();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
