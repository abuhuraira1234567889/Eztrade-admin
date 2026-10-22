import axios from "axios";
import { datetimeLocalToIso } from "@/lib/datetime-local";
import { parseTierMin } from "@/lib/tier";
import { api, getApi, patchApi, postApi } from "@/services/api";
import { deleteLiveEventDirect, upsertLiveEventDirect } from "@/services/live-admin";
import {
  buildCompetitionRules,
  deleteCompetitionDirect,
  uploadCompetitionThumbnailDirect,
  upsertCompetitionDirect,
} from "@/services/competitions-admin";

type ActionResult = { ok: boolean; error?: string };

function apiErrorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as
      | { error?: string; message?: string | string[] }
      | undefined;
    if (data?.error) return data.error;
    if (typeof data?.message === "string") return data.message;
    if (Array.isArray(data?.message)) return data.message.join(", ");
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

/** Server-action stubs - wire to NestJS REST endpoints as backend routes land. */
async function notReady(name: string): Promise<ActionResult> {
  console.warn(`[api stub] ${name} not wired yet`);
  return { ok: false, error: "This action is not available yet." };
}

export const getTelegramStatus = () =>
  getApi<{
    linked: boolean;
    username: string | null;
    groupStatus: "none" | "member" | "removed";
    pendingLink?: boolean;
    linkBlockedHint?: string | null;
  }>("/api/telegram/status");

export const startTelegramLink = () =>
  postApi<ActionResult & { deepLink?: string }>("/api/telegram/link");
export const unlinkTelegram = () => postApi<ActionResult>("/api/telegram/unlink");
export const joinTelegramGroup = () =>
  postApi<ActionResult & { inviteLink?: string }>("/api/telegram/join-group");

// Bot-first per-group join (new /account/telegram tab).
export type TelegramGroup = {
  id: string;
  name: string;
  joined: boolean;
  left: boolean;
  openLink: string | null;
  /** The bot that administers this group (each group has its own). May be null. */
  botUsername: string | null;
  /** Minimum rank/tier required to join this group. Optional - older backends
   * (pre-deploy) only return eligible groups and omit this. */
  minTier?: number;
  /** Whether the member meets the rank (and broker) requirement. Optional for
   * the same reason; treat a missing value as eligible. */
  eligible?: boolean;
};
export type TelegramBot = { id: string; name: string; botUsername: string | null };
export const getTelegramGroups = () =>
  getApi<{
    connected: boolean;
    username: string | null;
    /** The member's current rank/tier. Optional on older backends. */
    tier?: number;
    connectBot: string | null;
    bots: TelegramBot[];
    groups: TelegramGroup[];
  }>("/api/telegram/groups");
export const createTelegramJoinCode = (groupId: string) =>
  postApi<{ code: string; command: string; deepLink: string | null }>("/api/telegram/join-code", {
    groupId,
  });

export type ViewAsResult =
  | {
      ok: true;
      token: string;
      expiresAt: string;
      user: { id: string; email: string | null; name: string | null };
    }
  | { ok: false; error: string };

/**
 * Starts a read-only "View as" session for a user. Returns a short-lived token
 * the caller opens against the user platform. Backend gates this on staff role.
 */
export async function startViewAs(userId: string): Promise<ViewAsResult> {
  try {
    const res = await postApi<{
      ok?: boolean;
      token?: string;
      expiresAt?: string;
      user?: { id: string; email: string | null; name: string | null };
      error?: string;
    }>(`/api/admin/impersonate/${userId}`);
    if (res.ok && res.token && res.user) {
      return {
        ok: true,
        token: res.token,
        expiresAt: res.expiresAt ?? "",
        user: res.user,
      };
    }
    return { ok: false, error: res.error ?? "Could not start View-as session." };
  } catch (e) {
    return {
      ok: false,
      error: apiErrorMessage(e, "Could not start View-as session."),
    };
  }
}

/** Sticky admin ban - revokes platform / Telegram / TradingView until unbanned. */
export async function banUser(
  userId: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const res = await postApi<ActionResult>(`/api/admin/users/${userId}/ban`, {
      reason: reason?.trim() || undefined,
    });
    if (res.error) return { ok: false, error: res.error };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Could not ban user.") };
  }
}

export async function unbanUser(userId: string): Promise<ActionResult> {
  try {
    const res = await postApi<ActionResult>(`/api/admin/users/${userId}/unban`);
    if (res.error) return { ok: false, error: res.error };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Could not unban user.") };
  }
}

/** Grant / remove permanent access (super admins only - backend SuperAdminGuard). */
export async function setPermanentAccess(userId: string, enabled: boolean): Promise<ActionResult> {
  try {
    const res = await postApi<ActionResult>("/api/admin/data/permanent-access", { userId, enabled });
    if (res.error || res.ok === false) return { ok: false, error: res.error ?? "Could not update permanent access." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Could not update permanent access.") };
  }
}
export async function requestScannerAccess(username: string): Promise<ActionResult> {
  try {
    const res = await postApi<{ ok?: true; error?: string }>(
      "/api/tradingview/request-access",
      { username },
    );
    if (res.error) return { ok: false, error: res.error };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

export async function joinCompetition(formData: FormData): Promise<ActionResult> {
  try {
    const res = await postApi<{ ok?: boolean; error?: string }>(
      "/api/rewards/competitions/join",
      {
        competitionId: String(formData.get("competitionId") ?? ""),
        slug: String(formData.get("slug") ?? ""),
      },
    );
    if (res.ok) return { ok: true };
    return { ok: false, error: res.error ?? "Couldn't join." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't join." };
  }
}
export async function saveJournalEntry(input: {
  tradeId: string;
  entryId: string | null;
  notes: string;
  mood: string;
  tags: string[];
}): Promise<ActionResult> {
  try {
    const res = await postApi<{ ok?: boolean; error?: string }>("/api/journal/entry", input);
    if (res.ok) return { ok: true };
    return { ok: false, error: res.error ?? "Save failed." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed." };
  }
}
export async function recheckMyAccount(): Promise<
  ActionResult & { restored?: boolean }
> {
  try {
    const res = await postApi<{
      ok?: boolean;
      restored?: boolean;
      error?: string;
    }>("/api/account/compliance/recheck");
    if (res.error) return { ok: false, error: res.error };
    if (res.ok === false) return { ok: false, error: "Re-check failed." };
    return { ok: true, restored: res.restored };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Re-check failed.",
    };
  }
}
export async function saveProfile(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const body = Object.fromEntries(formData.entries());
    const { data } = await api.patch<{ ok?: boolean; error?: string }>(
      "/api/account/profile",
      body,
    );
    return data;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed." };
  }
}

export type DetectCountryResult =
  | { ok: true; country: string; countryCode: string | null }
  | { ok: false; error: string; blocked?: boolean };

/** Re-detect the member's country from their IP (blocks VPN/proxy) and save it. */
export async function detectMyCountry(): Promise<DetectCountryResult> {
  try {
    const res = await postApi<{
      ok?: boolean;
      country?: string;
      countryCode?: string | null;
      error?: string;
      blocked?: boolean;
    }>("/api/account/country/detect", {});
    if (res.ok && res.country) {
      return { ok: true, country: res.country, countryCode: res.countryCode ?? null };
    }
    return { ok: false, error: res.error ?? "Detection failed.", blocked: res.blocked };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Detection failed." };
  }
}
export async function savePublicProfile(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    const body = Object.fromEntries(formData.entries());
    const { data } = await api.patch<{ ok?: boolean; error?: string }>(
      "/api/account/public-profile",
      body,
    );
    return data;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed." };
  }
}

export async function saveUploadedAvatar(
  url: string,
  path: string,
): Promise<{ ok?: boolean; error?: string; url?: string }> {
  try {
    const res = await postApi<{ url?: string; error?: string }>(
      "/api/account/avatar/uploaded",
      { url, path },
    );
    if (res.error) return { error: res.error };
    return { ok: true, url: res.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save avatar." };
  }
}

export async function selectReadyAvatar(
  path: string,
): Promise<{ ok?: boolean; error?: string; url?: string }> {
  try {
    const res = await postApi<{ url?: string; error?: string }>(
      "/api/account/avatar/ready",
      { path },
    );
    if (res.error) return { error: res.error };
    return { ok: true, url: res.url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update avatar." };
  }
}
export async function saveNotifPrefs(prefs: {
  notif_email_verification?: boolean;
  notif_email_signals?: boolean;
  notif_email_milestones?: boolean;
  notif_email_weekly_recap?: boolean;
  notif_telegram_verification?: boolean;
  notif_telegram_signals?: boolean;
  notif_telegram_milestones?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data } = await api.patch<{ ok?: boolean; error?: string }>(
      "/api/account/notifications",
      prefs,
    );
    if (data.error) return { ok: false, error: data.error };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save preferences.",
    };
  }
}
export async function deleteBrokerConnection(): Promise<{ ok: true } | { error: string }> {
  try {
    const res = await postApi<{ ok?: true; error?: string }>("/api/broker/disconnect");
    if (res.error) return { error: res.error };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not disconnect the account.";
    return { error: msg };
  }
}
export async function markLessonComplete(input: {
  lessonId: string;
  courseId: string;
}): Promise<
  | { ok: true; courseCompleted?: boolean }
  | { ok: false; error: string }
  | { error: string }
> {
  try {
    return await postApi("/api/academy/lessons/complete", input);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not mark lesson complete.";
    return { ok: false, error: msg };
  }
}

export async function recordQuizAttempt(input: {
  lessonId: string;
  score: number;
  total: number;
  answers: { quizId: string; pickedIndex: number; correct: boolean }[];
}): Promise<
  | { ok: true; passed: boolean; xpAwarded: number }
  | { ok: false; error: string }
  | { error: string }
> {
  try {
    return await postApi("/api/academy/quiz-attempts", input);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not record quiz.";
    return { ok: false, error: msg };
  }
}
export async function toggleReaction(
  announcementId: string,
  emoji: string,
): Promise<{ ok: true; reacted: boolean } | { ok: false; error: string }> {
  try {
    return await postApi("/api/announcements/reactions/toggle", {
      announcementId,
      emoji,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Reaction failed.",
    };
  }
}
// verifyBrokerUid + submitBrokerForm → @/services/onboarding.ts
export const addRole = async (input: { email: string; role: string }): Promise<ActionResult> => {
  try {
    return await postApi<ActionResult>("/api/admin/roles/grant", input);
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Failed to grant role.") };
  }
};

export const removeRole = async (input: { userId: string; role: string }): Promise<ActionResult> => {
  try {
    return await postApi<ActionResult>("/api/admin/roles/revoke", input);
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Failed to revoke role.") };
  }
};

// ── Ambassadors (full platform access) ──────────────────────────────────────
export type Ambassador = {
  userId: string;
  email: string | null;
  name: string | null;
  tier: number;
};

export const listAmbassadors = () =>
  getApi<{ ambassadors: Ambassador[] }>("/api/admin/ambassadors");

export const grantAmbassador = async (input: { email: string }): Promise<ActionResult> => {
  try {
    return await postApi<ActionResult>("/api/admin/ambassadors/grant", input);
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Failed to grant ambassador access.") };
  }
};

export const revokeAmbassador = async (input: { userId: string }): Promise<ActionResult> => {
  try {
    return await postApi<ActionResult>("/api/admin/ambassadors/revoke", input);
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Failed to revoke ambassador access.") };
  }
};

// ── Free access (per-module complimentary unlocks) ──────────────────────────
export type FreeAccessModuleDef = {
  key: string;
  label: string;
  description: string;
};

export type FreeAccessGrant = {
  userId: string;
  email: string | null;
  name: string | null;
  modules: string[];
  status: "active" | "revoked";
  expiresAt: string | null;
  grantedAt: string;
  updatedAt: string;
  grantedBy: string | null;
  grantedByEmail: string | null;
  updatedBy: string | null;
  updatedByEmail: string | null;
  /** Current rank badge (mirrored member_lifecycle.rank). */
  rank: number;
  /**
   * Modules this member's rank already unlocks WITHOUT the grant - a grant is a
   * floor, not a ceiling. Ticking one of these is a no-op. Group-only modules
   * (eztrade, cypher) are never listed: their gate is resolved per-group.
   */
  rankEarnedModules: string[];
};

export const listFreeAccessModules = () =>
  getApi<{ modules: FreeAccessModuleDef[] }>("/api/admin/free-access/modules");

export const listFreeAccessGrants = () =>
  getApi<{ grants: FreeAccessGrant[]; gates: Record<string, number> }>("/api/admin/free-access");

export const grantFreeAccess = async (input: {
  email: string;
  modules: string[];
  durationDays: number | null;
}): Promise<ActionResult> => {
  try {
    return await postApi<ActionResult>("/api/admin/free-access/grant", input);
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Failed to grant free access.") };
  }
};

export const revokeFreeAccess = async (input: { userId: string }): Promise<ActionResult> => {
  try {
    return await postApi<ActionResult>("/api/admin/free-access/revoke", input);
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Failed to revoke free access.") };
  }
};

/* ── IB bypass allowlist ──────────────────────────────────────────────────── */

export type IbBypassEntry = {
  email: string;
  note: string;
  createdAt: string;
  createdBy: string | null;
  createdByEmail: string | null;
  lastUsedAt: string | null;
  /** The registered member on this address, when one exists yet. */
  member: { id: string; name: string | null; ibStatus: string | null } | null;
};

export const listIbBypassEmails = () =>
  getApi<{ rows: IbBypassEntry[]; error?: string }>("/api/admin/ib-bypass");

export const addIbBypassEmail = async (input: {
  email: string;
  note?: string;
}): Promise<ActionResult & { restored?: boolean }> => {
  try {
    return await postApi<ActionResult & { restored?: boolean }>("/api/admin/ib-bypass/add", input);
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Failed to add the email.") };
  }
};

export const removeIbBypassEmail = async (input: { email: string }): Promise<ActionResult> => {
  try {
    return await postApi<ActionResult>("/api/admin/ib-bypass/remove", input);
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Failed to remove the email.") };
  }
};

function parseQuestionForm(formData: FormData) {
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const id = String(formData.get("id") ?? "").trim();
  const question = String(formData.get("question") ?? "").trim();
  const options = [0, 1, 2, 3]
    .map((i) => String(formData.get(`option_${i}`) ?? "").trim())
    .filter((o) => o.length > 0);
  const correctIndex = Number(formData.get("correct_index") ?? -1);
  const explanation = String(formData.get("explanation") ?? "").trim() || null;
  const orderIndex = Number(formData.get("order_index") ?? 0) || 0;
  return { id, lessonId, question, options, correctIndex, explanation, orderIndex };
}

function validateQuestion(p: ReturnType<typeof parseQuestionForm>): string | null {
  if (!p.lessonId) return "Missing lesson.";
  if (!p.question) return "Question text is required.";
  if (p.options.length < 2) return "At least two options are required.";
  if (!Number.isInteger(p.correctIndex) || p.correctIndex < 0 || p.correctIndex >= p.options.length) {
    return "Pick which option is correct.";
  }
  return null;
}

export async function createQuestion(
  formData: FormData,
): Promise<ActionResult & { error?: string; translationNote?: string }> {
  const p = parseQuestionForm(formData);
  const err = validateQuestion(p);
  if (err) return { ok: false, error: err };
  try {
    const res = await postApi<{
      ok?: boolean;
      error?: string;
      translations?: { translated: number; errors: string[] };
    }>("/api/quizzes", {
      lesson_id: p.lessonId,
      question: p.question,
      options: p.options,
      correct_index: p.correctIndex,
      explanation: p.explanation,
      order_index: p.orderIndex,
    });
    if (res.ok === false || res.error) return { ok: false, error: res.error ?? "Create failed." };
    const note = formatTranslationNote(res.translations);
    return { ok: true, translationNote: note };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Create failed.") };
  }
}

export async function updateQuestion(
  formData: FormData,
): Promise<ActionResult & { error?: string; translationNote?: string }> {
  const p = parseQuestionForm(formData);
  const err = validateQuestion(p);
  if (err) return { ok: false, error: err };
  if (!p.id) return { ok: false, error: "Missing question id." };
  try {
    const res = await patchApi<{
      ok?: boolean;
      error?: string;
      translations?: { translated: number; errors: string[] };
    }>(`/api/quizzes/${p.id}`, {
      lesson_id: p.lessonId,
      question: p.question,
      options: p.options,
      correct_index: p.correctIndex,
      explanation: p.explanation,
      order_index: p.orderIndex,
    });
    if (res.ok === false || res.error) return { ok: false, error: res.error ?? "Update failed." };
    const note = formatTranslationNote(res.translations);
    return { ok: true, translationNote: note };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Update failed.") };
  }
}

/** Re-run Google Translate for one quiz (when translations missing or stale). */
export async function retranslateQuestion(
  quizId: string,
): Promise<ActionResult & { translated?: number; error?: string }> {
  if (!quizId.trim()) return { ok: false, error: "Missing question id." };
  try {
    const res = await postApi<{
      ok?: boolean;
      error?: string;
      translated?: number;
      errors?: string[];
    }>(`/api/quizzes/${quizId}/retranslate`, {});
    if (res.ok === false || res.error) {
      return { ok: false, error: res.error ?? "Re-translate failed." };
    }
    const errs = res.errors?.length ?? 0;
    return {
      ok: true,
      translated: res.translated,
      error: errs > 0 ? `${errs} language(s) failed - check backend logs.` : undefined,
    };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Re-translate failed.") };
  }
}

/** Re-translate every question in a lesson (for quizzes saved before translations existed). */
export async function retranslateLessonQuizzes(
  quizIds: string[],
): Promise<ActionResult & { translated?: number; error?: string }> {
  if (quizIds.length === 0) return { ok: false, error: "No questions to translate." };
  let total = 0;
  const failures: string[] = [];
  for (const id of quizIds) {
    const res = await retranslateQuestion(id);
    if (!res.ok) {
      failures.push(res.error ?? id);
      continue;
    }
    total += res.translated ?? 0;
  }
  if (failures.length === quizIds.length) {
    return { ok: false, error: failures[0] ?? "Re-translate failed." };
  }
  return {
    ok: true,
    translated: total,
    error:
      failures.length > 0
        ? `${failures.length} question(s) failed - ensure backend is running with Google Translate configured.`
        : undefined,
  };
}

function formatTranslationNote(
  translations?: { translated: number; errors: string[] },
): string | undefined {
  if (!translations) return undefined;
  const { translated, errors } = translations;
  if (errors.length > 0) {
    return `Saved. Translations: ${translated}/15 languages (${errors.length} failed).`;
  }
  if (translated > 0) return `Saved. Translated to ${translated} languages.`;
  return "Saved. No translations were generated - check backend Google Translate config.";
}

export async function deleteQuestion(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing question id." };
  try {
    const { data } = await api.delete<{ ok?: boolean; error?: string }>(`/api/quizzes/${id}`);
    if (data?.ok === false || data?.error) return { ok: false, error: data.error ?? "Delete failed." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e, "Delete failed.") };
  }
}

export const saveAdminNotifPrefs = (_: unknown) => notReady("saveAdminNotifPrefs");

export async function uploadCompetitionThumbnail(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Choose an image file to upload." };
  }
  const competitionId = String(formData.get("competitionId") ?? "").trim() || null;
  return uploadCompetitionThumbnailDirect(file, competitionId);
}

export async function createCompetition(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  return upsertCompetitionDirect({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    kind: String(formData.get("kind") ?? "custom"),
    starts_at: String(formData.get("starts_at") ?? ""),
    ends_at: String(formData.get("ends_at") ?? ""),
    prize_pool_label: String(formData.get("prize_pool_label") ?? ""),
    thumbnail_url: String(formData.get("thumbnail_url") ?? ""),
    entry_mode: String(formData.get("entry_mode") ?? "auto"),
    is_active: formData.get("is_active") === "on",
    rules: buildCompetitionRules(formData),
  });
}

export async function updateCompetition(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false, error: "Missing competition id." };
  return upsertCompetitionDirect({
    id,
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    kind: String(formData.get("kind") ?? "custom"),
    starts_at: String(formData.get("starts_at") ?? ""),
    ends_at: String(formData.get("ends_at") ?? ""),
    prize_pool_label: String(formData.get("prize_pool_label") ?? ""),
    thumbnail_url: String(formData.get("thumbnail_url") ?? ""),
    entry_mode: String(formData.get("entry_mode") ?? "auto"),
    is_active: formData.get("is_active") === "on",
    rules: buildCompetitionRules(formData),
  });
}

export async function deleteCompetition(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return deleteCompetitionDirect(String(formData.get("id") ?? ""));
}
export async function createAnnouncement(input: {
  title: string;
  body: string;
  isPublished: boolean;
}): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  try {
    return await postApi("/api/announcements", input);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create announcement.",
    };
  }
}

export async function updateAnnouncement(input: {
  id: string;
  title: string;
  body: string;
  isPublished: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    return await patchApi(`/api/announcements/${input.id}`, {
      title: input.title,
      body: input.body,
      isPublished: input.isPublished,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update announcement.",
    };
  }
}

export async function deleteAnnouncement(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { api } = await import("@/services/api");
    const { data } = await api.delete(`/api/announcements/${id}`);
    return data as { ok: true } | { ok: false; error: string };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not delete announcement.",
    };
  }
}

/** Staff: open / close comments on one announcement. */
export async function setCommentsLocked(
  announcementId: string,
  locked: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    return await patchApi(`/api/announcements/${announcementId}/comments/lock`, {
      locked,
    });
  } catch (e) {
    return {
      ok: false,
      error: apiErrorMessage(e, "Could not change the comment lock."),
    };
  }
}

function formDataToLiveEventBody(formData: FormData): Record<string, unknown> {
  const raw = Object.fromEntries(formData.entries());
  const startsRaw = String(raw.starts_at ?? "");
  const endsRaw = String(raw.ends_at ?? "");
  return {
    ...raw,
    starts_at: startsRaw ? datetimeLocalToIso(startsRaw) : startsRaw,
    ends_at: endsRaw ? datetimeLocalToIso(endsRaw) : endsRaw,
    tier_min: parseTierMin(raw.tier_min, 1),
    occurrences: Number(raw.occurrences ?? 1),
    is_published: raw.is_published === "on",
  };
}

export async function rsvp(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const eventId = String(formData.get("eventId") ?? "");
    return await postApi("/api/live/rsvp", { eventId });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "RSVP failed.",
    };
  }
}

export async function cancelRsvp(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const eventId = String(formData.get("eventId") ?? "");
    return await postApi("/api/live/rsvp/cancel", { eventId });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not cancel RSVP.",
    };
  }
}

export async function upsertLiveEvent(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = formDataToLiveEventBody(formData);
  const saved = await upsertLiveEventDirect(body);
  if (!saved.ok) return saved;

  // Sessions are Zoom-only: members join via the admin-supplied zoom_join_url,
  // so there is no in-platform meeting room to provision on create.
  return { ok: true };
}

export async function deleteLiveEvent(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = String(formData.get("id") ?? "");
  return deleteLiveEventDirect(id);
}

export async function getLiveHostJoin(
  eventId: string,
): Promise<{ ok: true; joinLink: string } | { ok: false; error: string }> {
  try {
    return await postApi(`/api/live/events/${eventId}/host-join`);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not open host room.",
    };
  }
}

export async function provisionLiveMeeting(
  eventId: string,
): Promise<
  | { ok: true; joinLink: string; hostJoinLink: string | null }
  | { ok: false; error: string }
> {
  try {
    return await postApi(`/api/live/events/${eventId}/provision-meeting`);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create video room.",
    };
  }
}

export async function getLiveStreamStatus(
  eventId: string,
): Promise<
  | { ok: true; streamStarted: boolean; joinOpens: boolean; isLive: boolean }
  | { ok: false; error: string }
> {
  try {
    return await getApi(`/api/live/events/${eventId}/stream-status`);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not load stream status.",
    };
  }
}

export async function getLiveViewerJoin(
  eventId: string,
): Promise<{ ok: true; joinLink: string } | { ok: false; error: string }> {
  try {
    return await postApi(`/api/live/events/${eventId}/viewer-join`);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not join live stream.",
    };
  }
}

export async function syncLiveRecording(
  eventId: string,
): Promise<{ ok: true; recordingId: string | null } | { ok: false; error: string }> {
  try {
    return await postApi(`/api/live/events/${eventId}/sync-recording`);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not sync recording.",
    };
  }
}
function formDataToRecord(formData: FormData): Record<string, unknown> {
  const raw = Object.fromEntries(formData.entries());
  return {
    ...raw,
    order_index: Number(raw.order_index ?? 0),
    is_published: raw.is_published === "on",
  };
}

export async function updateTradeIdeaProvider(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    return await patchApi("/api/trade-ideas/providers", formDataToRecord(formData));
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save provider.",
    };
  }
}

/** Upload a custom logo image for a Trade Ideas provider. */
export async function uploadTradeIdeaIcon(
  id: string,
  slug: string,
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const fd = new FormData();
    fd.append("id", id);
    fd.append("slug", slug);
    fd.append("file", file);
    const { data } = await api.post<{ ok: boolean; url?: string; error?: string }>(
      "/api/trade-ideas/providers/icon",
      fd,
    );
    if (!data.ok || !data.url) return { ok: false, error: data.error ?? "Upload failed." };
    return { ok: true, url: data.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function upsertTradeIdeaVideo(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    return await postApi("/api/trade-ideas/videos", formDataToRecord(formData));
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save video.",
    };
  }
}

export async function deleteTradeIdeaVideo(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const body = formDataToRecord(formData);
    const { data } = await api.delete("/api/trade-ideas/videos", { data: body });
    return data as { ok: true } | { ok: false; error: string };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not delete video.",
    };
  }
}

export type TelegramGroupRow = { id: string; name: string; min_tier: number | null };

/** Admin: list the signal groups (id + display name + tier). */
export async function fetchTelegramGroups(): Promise<{
  ok: boolean;
  groups: TelegramGroupRow[];
}> {
  try {
    return await getApi<{ ok: boolean; groups: TelegramGroupRow[] }>(
      "/api/admin/telegram/groups",
    );
  } catch {
    return { ok: false, groups: [] };
  }
}

/** Admin: rename a signal group's display name. */
export async function renameTelegramGroup(
  id: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    return await patchApi("/api/admin/telegram/groups", { id, name });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not rename group." };
  }
}

/** Admin: remove a signal group. */
export async function deleteTelegramGroup(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data } = await api.delete("/api/admin/telegram/groups", { data: { id } });
    return data as { ok: true } | { ok: false; error: string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not remove group." };
  }
}

export const updateStep = (_: unknown) => notReady("updateStep");
export const uploadScreenshot = (_: unknown) => notReady("uploadScreenshot");
