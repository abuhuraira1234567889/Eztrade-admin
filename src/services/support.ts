import axios from "axios";
import { api, deleteApi, getApi, patchApi, postApi } from "@/services/api";

export type SupportCategory =
  | "account"
  | "billing"
  | "platform"
  | "trading"
  | "verification"
  | "other";

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  "account",
  "billing",
  "platform",
  "trading",
  "verification",
  "other",
];

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  account: "Account & access",
  billing: "Billing & payments",
  platform: "Platform & bugs",
  trading: "Trading & journal",
  verification: "Verification & IB",
  other: "Other",
};

export type CreateTicketPayload = {
  title: string;
  category: SupportCategory;
  description: string;
  imagePath?: string | null;
};

export type SupportAttachment = {
  type?: string;
  path?: string;
  bucket?: string;
};

export type SupportMessage = {
  id: number;
  ticket_id: string;
  sender_id: string | null;
  role: string;
  body: string;
  attachments: SupportAttachment[] | null;
  created_at: string;
  sender?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

export type SupportTicketProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
};

export type SupportTicket = {
  id: string;
  subject: string;
  category: SupportCategory | null;
  status: string;
  priority: string;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  user_id?: string;
  ai_enabled?: boolean;
  escalated_at?: string | null;
  escalation_reason?: string | null;
  last_ai_at?: string | null;
  // Unread dot on the inbox list: the member wrote since anyone on the support
  // team last opened this ticket. Only present on the list endpoint.
  unread?: boolean;
  profile?: SupportTicketProfile | null;
};

type ApiResult<T> = T | { ok: false; error: string };

function parseApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    return data?.message ?? data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : "Request failed.";
}

export async function uploadSupportAttachment(
  file: File,
): Promise<{ ok: true; imagePath: string } | { ok: false; error: string }> {
  const form = new FormData();
  form.append("file", file);
  try {
    const { data } = await api.post<ApiResult<{ ok: true; imagePath: string }>>(
      "/api/support/attachments",
      form,
    );
    return data as { ok: true; imagePath: string } | { ok: false; error: string };
  } catch (err) {
    return { ok: false, error: parseApiError(err) };
  }
}

export async function getSupportAttachmentUrl(
  path: string,
  admin = false,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const endpoint = admin
      ? "/api/admin/support/attachments/url"
      : "/api/support/attachments/url";
    return await getApi(endpoint, { path });
  } catch (err) {
    return { ok: false, error: parseApiError(err) };
  }
}

export async function getSupportTicket(
  ticketId: string,
  since?: number,
  admin = false,
): Promise<
  | {
      ok: true;
      ticket: SupportTicket;
      messages: SupportMessage[];
      member?: SupportTicketProfile | null;
    }
  | { ok: false; error: string }
> {
  try {
    const base = admin ? `/api/admin/support/tickets/${ticketId}` : `/api/support/tickets/${ticketId}`;
    const params = since ? { since: String(since) } : undefined;
    return await getApi(base, params);
  } catch (err) {
    return { ok: false, error: parseApiError(err) };
  }
}

export async function sendSupportMessage(
  ticketId: string,
  payload: { body: string; imagePath?: string | null },
  admin = false,
): Promise<{ ok: true; message: SupportMessage } | { ok: false; error: string }> {
  try {
    const endpoint = admin
      ? `/api/admin/support/tickets/${ticketId}/messages`
      : `/api/support/tickets/${ticketId}/messages`;
    return await postApi(endpoint, payload);
  } catch (err) {
    return { ok: false, error: parseApiError(err) };
  }
}

export async function updateSupportTicket(
  ticketId: string,
  payload: {
    status?: "open" | "awaiting_user" | "resolved" | "closed";
    priority?: "low" | "medium" | "high" | "critical";
    assignedTo?: string | null;
    aiEnabled?: boolean;
  },
  admin = false,
): Promise<{ ok: true; ticket: SupportTicket } | { ok: false; error: string }> {
  try {
    const endpoint = admin
      ? `/api/admin/support/tickets/${ticketId}`
      : `/api/support/tickets/${ticketId}`;
    return await patchApi(endpoint, payload);
  } catch (err) {
    return { ok: false, error: parseApiError(err) };
  }
}

export async function listAdminSupportTickets(
  status?: string,
): Promise<{ ok: true; tickets: SupportTicket[] } | { ok: false; error: string }> {
  try {
    return await getApi("/api/admin/support/tickets", status ? { status } : undefined);
  } catch (err) {
    return { ok: false, error: parseApiError(err) };
  }
}

export async function editAdminSupportMessage(
  ticketId: string,
  messageId: number,
  body: string,
): Promise<{ ok: true; message: SupportMessage } | { ok: false; error: string }> {
  try {
    return await patchApi(
      `/api/admin/support/tickets/${ticketId}/messages/${messageId}`,
      { body },
    );
  } catch (err) {
    return { ok: false, error: parseApiError(err) };
  }
}

export async function deleteAdminSupportMessage(
  ticketId: string,
  messageId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    return await deleteApi(`/api/admin/support/tickets/${ticketId}/messages/${messageId}`);
  } catch (err) {
    return { ok: false, error: parseApiError(err) };
  }
}

// Admin-specific aliases (used by support inbox components).
export const getAdminSupportTicket = (ticketId: string, since?: number) =>
  getSupportTicket(ticketId, since, true);

export const sendAdminSupportMessage = (
  ticketId: string,
  payload: { body: string; imagePath?: string | null },
) => sendSupportMessage(ticketId, payload, true);

export const updateAdminSupportTicket = (
  ticketId: string,
  payload: Parameters<typeof updateSupportTicket>[1],
) => updateSupportTicket(ticketId, payload, true);

export const getAdminSupportAttachmentUrl = (path: string) =>
  getSupportAttachmentUrl(path, true);

/**
 * Translate a support message's text into English (auto-detects source). Admin
 * only - powers the per-message "Translate" button in the support console.
 */
export async function translateSupportMessage(
  text: string,
): Promise<
  | { ok: true; translatedText: string; detectedSourceLang: string | null }
  | { ok: false; error: string }
> {
  try {
    return await postApi("/api/admin/support/translate", { text });
  } catch (err) {
    return { ok: false, error: parseApiError(err) };
  }
}

export function normalizeAttachments(raw: unknown): SupportAttachment[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as SupportAttachment[];
  if (typeof raw === "object") return [raw as SupportAttachment];
  return [];
}

export function senderLabel(
  sender: SupportMessage["sender"],
  role: string,
  staffLabel = "Support team",
): string {
  if (role === "staff" || role === "system" || role === "ai") return staffLabel;
  if (!sender) return "Member";
  const name = [sender.first_name, sender.last_name].filter(Boolean).join(" ");
  return name || sender.display_name || sender.email || "Member";
}

export function supportSenderLabel(role: string, sender: SupportMessage["sender"]): string {
  return senderLabel(sender, role);
}

export function isTicketOpen(status: string): boolean {
  return status === "open" || status === "ai_handling" || status === "awaiting_user";
}

/** The live support knowledge base document (the doc the AI agent answers from). */
export type SupportKnowledgeBase = {
  /** Display name of the support agent the document is written for (e.g. "Maya"). */
  agentName: string;
  /** The full document, already filled at the default member floor (no placeholders). */
  document: string;
  characterCount: number;
  lineCount: number;
  /** False if the raw source lost a {{token}} the code fills per member. */
  placeholdersIntact: boolean;
  missingPlaceholders: string[];
  /** The strictest default floor tier the shown rank/gate sections were built at. */
  defaultFloorTier: number;
};

export function fetchSupportKnowledgeBase(): Promise<SupportKnowledgeBase> {
  return getApi<SupportKnowledgeBase>("/api/admin/support/knowledge-base");
}
