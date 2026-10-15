/** Shared input limits - keep in sync with backend/src/lib/field-limits.ts */
export const FIELD_LIMITS = {
  firstName: 30,
  lastName: 30,
  displayName: 40,
  usernameMin: 3,
  username: 20,
  bio: 280,
  telegramUsername: 32,
  tradingviewUsername: 32,
  puReferralLink: 300,
  referralCode: 12,
  passwordMin: 8,
  password: 128,
  mtServer: 60,
  mtLogin: 20,
  mt5Password: 64,
  /** Max characters shown in dashboard greetings and compact UI. */
  greetingName: 24,
  bugTitle: 120,
  bugDescription: 4000,
  ticketTitle: 120,
  ticketMessage: 4000,
} as const;

export function truncateForDisplay(
  value: string | null | undefined,
  max: number,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(1, max - 1))}…`;
}
