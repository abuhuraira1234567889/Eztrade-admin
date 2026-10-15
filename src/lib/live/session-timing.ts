export const JOIN_EARLY_MS = 15 * 60_000;

export type LiveSessionPhase = "past" | "upcoming" | "join-soon" | "join-open" | "live";

export type LiveSessionTiming = {
  phase: LiveSessionPhase;
  isLive: boolean;
  joinOpens: boolean;
  msUntilJoinOpens: number;
  msUntilStart: number;
  msUntilEnd: number;
};

export function getLiveSessionTiming(
  startsAt: string,
  endsAt: string,
  nowMs = Date.now(),
): LiveSessionTiming {
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  const joinOpensAt = startMs - JOIN_EARLY_MS;

  if (nowMs > endMs) {
    return {
      phase: "past",
      isLive: false,
      joinOpens: false,
      msUntilJoinOpens: 0,
      msUntilStart: 0,
      msUntilEnd: 0,
    };
  }

  const isLive = nowMs >= startMs;
  const joinOpens = nowMs >= joinOpensAt;
  const msUntilJoinOpens = Math.max(0, joinOpensAt - nowMs);
  const msUntilStart = Math.max(0, startMs - nowMs);
  const msUntilEnd = Math.max(0, endMs - nowMs);

  let phase: LiveSessionPhase = "upcoming";
  if (isLive) phase = "live";
  else if (joinOpens) phase = "join-open";
  else if (msUntilJoinOpens <= 60 * 60_000) phase = "join-soon";

  return { phase, isLive, joinOpens, msUntilJoinOpens, msUntilStart, msUntilEnd };
}

export function formatDurationMs(
  ms: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
  prefix: "opens" | "starts",
): string {
  if (ms <= 0) return "";

  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes < 60) {
    return t(`row.${prefix}InMinutes`, { count: totalMinutes });
  }

  const hours = Math.ceil(totalMinutes / 60);
  if (hours < 48) {
    return t(`row.${prefix}InHours`, { count: hours });
  }

  const days = Math.ceil(hours / 24);
  return t(`row.${prefix}InDays`, { count: days });
}
