import { TIER_NAMES } from "@/lib/constants";

/** Compact "k: a → b" summary of an audit row's before/after JSON. */
export function auditKeyDiff(before: unknown, after: unknown): string {
  const fmt = (v: unknown) =>
    v == null ? "-" : typeof v === "object" ? JSON.stringify(v) : String(v);
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  if (keys.length === 0) return "";
  return keys
    .map((k) => {
      const from = b[k];
      const to = a[k];
      if (from === undefined) return `${k}: ${fmt(to)}`;
      if (to === undefined) return `${k}: ${fmt(from)} removed`;
      return `${k}: ${fmt(from)} → ${fmt(to)}`;
    })
    .join(" · ");
}

/** Compact human detail for known actions (e.g. "Starter → Bronze"). */
export function auditHumanSummary(
  action: string,
  before: unknown,
  after: unknown,
): string {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (v == null ? "" : String(v));
  const tierName = (v: unknown) =>
    v == null || v === "" ? "" : (TIER_NAMES[Number(v)] ?? String(v));

  switch (action) {
    case "rank_updated":
    case "daily_tier_recheck": {
      const fromRank = tierName(b.rank ?? b.tier);
      const toRank = s(a.rank_name) || tierName(a.rank ?? a.tier);
      const rankPart =
        fromRank && fromRank !== toRank ? `${fromRank} → ${toRank}` : toRank;
      const fromState = s(b.state ?? b.status);
      const toState = s(a.state ?? a.status);
      const statePart =
        fromState && toState && fromState !== toState
          ? `${fromState} → ${toState}`
          : "";
      return [rankPart, statePart].filter(Boolean).join(" · ");
    }
    case "tradingview_set":
    case "tradingview_granted":
    case "tradingview_revoked": {
      const username = s(a.username ?? b.username);
      return username ? `@${username}` : "";
    }
    case "tradingview_changed": {
      const from = s(b.username);
      const to = s(a.username);
      return from && to ? `@${from} → @${to}` : to ? `@${to}` : "";
    }
    case "email_changed":
      return s(a.email);
    case "broker_connected":
    case "journal_account_added":
    case "journal_account_removed":
      return s(a.login ?? a.mt_login ?? b.login);
    case "telegram_linked": {
      const username = s(a.username);
      return username ? `@${username}` : "";
    }
    case "admin_ban":
    case "admin_unban": {
      const reason = s(a.ban_reason ?? a.reason);
      return reason || (action === "admin_ban" ? "Banned" : "Unbanned");
    }
    default:
      return auditKeyDiff(before, after);
  }
}

export function humanizeAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function prettyJson(value: unknown): string {
  if (value == null) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
