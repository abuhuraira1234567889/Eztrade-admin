export type NotificationType = "success" | "info" | "warning" | "error";
export type NotificationFilter = "all" | "read" | "unread";

export type AppNotification = {
  id: string;
  category: string;
  type: NotificationType;
  priority: string;
  title: string;
  body: string | null;
  link: string | null;
  data: {
    entity_type?: string;
    entity_id?: string;
    action?: string;
  } | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationsListResponse =
  | {
      ok: true;
      items: AppNotification[];
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    }
  | { ok: false; error: string };

export type UnreadCountResponse =
  | { ok: true; count: number }
  | { ok: false; error: string };
