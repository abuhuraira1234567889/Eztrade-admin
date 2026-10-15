import axios from "axios";

import { getApi, postApi } from "@/services/api";

/**
 * Deadline extension requests - the admin review queue.
 *
 * A member in grace (48h) or close to their 30-day review asks for more time
 * with a reason. Approving adds days to the live deadline on member_lifecycle;
 * rejecting leaves it exactly where it was. Either way the member is told, and
 * the note written here is what they read.
 */
export type ExtensionDeadlineKind = "grace" | "review";
export type ExtensionStatus = "pending" | "approved" | "rejected" | "cancelled";

/** Volume this review cycle, from the same evaluator that gates the member. */
export type ExtensionMemberLots = { current: number; required: number; missing: number };

export type ExtensionMember = {
  id: string;
  name: string | null;
  email: string | null;
  rank: number;
  state: string | null;
  graceEndsAt: string | null;
  nextReviewAt: string | null;
  /** Null on decided rows - only pending requests carry the figure. */
  lots: ExtensionMemberLots | null;
};

export type AdminExtensionRequest = {
  id: string;
  userId: string;
  deadlineKind: ExtensionDeadlineKind;
  /** The deadline as it stood when the member asked. */
  deadlineAt: string | null;
  lifecycleState: string | null;
  reason: string;
  status: ExtensionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  decisionNote: string | null;
  grantedDays: number | null;
  newDeadlineAt: string | null;
  createdAt: string;
  member: ExtensionMember;
  /** Extensions already granted in this member's current cycle. */
  extensionsUsed: number;
  /** The back-to-back cap; at the limit an approval is refused. */
  extensionsLimit: number;
};

export type ExtensionQueueFilter = ExtensionStatus | "all";

type ApproveResult = { ok: true; newDeadlineAt: string } | { ok: false; error: string };
type RejectResult = { ok: true } | { ok: false; error: string };

export function listExtensionRequests(
  status: ExtensionQueueFilter,
): Promise<{ requests: AdminExtensionRequest[] }> {
  return getApi<{ requests: AdminExtensionRequest[] }>("/api/admin/extension-requests", { status });
}

export function approveExtensionRequest(
  requestId: string,
  days: number,
  note: string,
): Promise<ApproveResult> {
  return postApi<ApproveResult>("/api/admin/extension-requests/approve", { requestId, days, note });
}

export function rejectExtensionRequest(requestId: string, note: string): Promise<RejectResult> {
  return postApi<RejectResult>("/api/admin/extension-requests/reject", { requestId, note });
}

/**
 * English translation of a member's reason, on demand.
 *
 * Reasons arrive in whatever language the member writes the platform in -
 * Dutch, Arabic, Vietnamese - and the reviewer has to weigh them against a
 * deadline. Reuses the support thread's translate endpoint rather than adding a
 * second one: it is generic text-in/text-out, and its roles (admin, support,
 * compliance) already cover everyone who can open this queue (admin,
 * compliance), so no reviewer sees the button and then a 403.
 */
export async function translateExtensionReason(
  text: string,
): Promise<
  | { ok: true; translatedText: string; detectedSourceLang: string | null }
  | { ok: false; error: string }
> {
  try {
    return await postApi("/api/admin/support/translate", { text });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as { message?: string; error?: string } | undefined;
      return { ok: false, error: data?.message ?? data?.error ?? err.message };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Request failed." };
  }
}
