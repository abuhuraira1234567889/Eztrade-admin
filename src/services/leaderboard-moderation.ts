import { getApi, postApi } from "@/services/api";

/** Admin "remove from leaderboard" (platform schema/187). All reversible. */

export type XpBoardRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  country: string | null;
  tier: number | null;
  xp_total: number;
  excluded: boolean;
  excluded_at: string | null;
  excluded_reason: string | null;
};

export type CompetitionLite = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

export type StandingRow = {
  user_id: string;
  rank: number | null;
  metric_value: number | null;
  points: number | null;
  admin_removed?: boolean;
  admin_removed_reason?: string | null;
  excluded_reason?: string | null;
  profile?: {
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    email?: string | null;
    country?: string | null;
    tier?: number | null;
  } | null;
};

export async function fetchXpBoard(): Promise<{ board: XpBoardRow[]; excluded: XpBoardRow[] }> {
  return getApi("/api/admin/leaderboard/xp");
}

export async function removeFromXpBoard(userId: string, reason: string) {
  return postApi<{ ok: boolean; error?: string }>(`/api/admin/leaderboard/xp/${userId}/remove`, {
    reason,
  });
}

export async function restoreToXpBoard(userId: string) {
  return postApi<{ ok: boolean; error?: string }>(`/api/admin/leaderboard/xp/${userId}/restore`);
}

export async function fetchCompetitions(): Promise<CompetitionLite[]> {
  return getApi("/api/admin/leaderboard/competitions");
}

export async function fetchCompetitionStandings(
  id: string,
): Promise<{ competition: Record<string, unknown> | null; rows: StandingRow[]; scoredAt: string | null }> {
  return getApi(`/api/admin/leaderboard/competitions/${id}/standings`);
}

export async function removeFromCompetition(competitionId: string, userId: string, reason: string) {
  return postApi<{ ok: boolean; error?: string }>(
    `/api/admin/leaderboard/competitions/${competitionId}/entries/${userId}/remove`,
    { reason },
  );
}

export async function restoreToCompetition(competitionId: string, userId: string) {
  return postApi<{ ok: boolean; error?: string }>(
    `/api/admin/leaderboard/competitions/${competitionId}/entries/${userId}/restore`,
  );
}

/** Best available display name for an entrant / member. */
export function memberName(p: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
} | null | undefined): string {
  if (!p) return "Unknown";
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return p.display_name?.trim() || full || p.username?.trim() || "Unknown";
}
