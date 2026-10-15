import { getApi, patchApi } from "@/services/api";
import type {
  NotificationFilter,
  NotificationsListResponse,
  UnreadCountResponse,
} from "./types";

export async function fetchNotifications(opts: {
  filter?: NotificationFilter;
  page?: number;
  limit?: number;
}): Promise<NotificationsListResponse> {
  const params: Record<string, string> = {};
  if (opts.filter && opts.filter !== "all") params.filter = opts.filter;
  if (opts.page != null) params.page = String(opts.page);
  if (opts.limit != null) params.limit = String(opts.limit);
  return getApi<NotificationsListResponse>("/api/notifications", params);
}

export async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  return getApi<UnreadCountResponse>("/api/notifications/unread-count");
}

export async function markNotificationRead(id: string) {
  return patchApi<{ ok: true } | { ok: false; error: string }>(
    `/api/notifications/${id}/read`,
    {},
  );
}

export async function markAllNotificationsRead() {
  return patchApi<{ ok: true } | { ok: false; error: string }>(
    "/api/notifications/read-all",
    {},
  );
}
