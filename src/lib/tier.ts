/**
 * Tier engine - single source of truth for "what tier is this user?"
 *
 * Active rule (DECISIONS §3 / §16):
 * active = verified
 * AND active_balance >= tier_threshold
 * AND ≥1 closed round-trip in last 30 days
 *
 * `active_balance` = min(balance, equity) - defends against open drawdown.
 *
 * Tiers from the seeded `tier_thresholds` table - admins can tune live.
 */

export type TierLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type TierThreshold = {
 tier: TierLevel;
 name: string;
 min_balance_usd: number;
 min_referrals: number;
 alt_balance_usd: number | null;
};

export type TierInput = {
 active_balance_usd: number;
 qualified_referrals: number;
 has_recent_trade: boolean;
 /**
  * Lowest tier this member's country lets them hold (1 Beginner / 2 Starter /
  * 3 Bronze). Tiers below the floor are unreachable; below the floor's balance
  * the member is Unverified. Defaults to 0 (no floor) for back-compat.
  */
 floor_tier?: number;
 /** From `tier_thresholds` table, ordered tier ASC. Pass admin overrides too. */
 thresholds: TierThreshold[];
};

/**
 * Activity bar by tier: Beginner (1) and Starter (2) need 1 eligible lot in
 * 30 days; Bronze (3) and up need 2. Callers pass the matching `minLots` to
 * hasRecentTrade() before computing the tier.
 */
export function lotsRequiredForTier(tier: number): number {
 return tier >= 3 ? 2 : 1;
}

/**
 * Highest tier the balance earns, never below `floorTier`. Returns 0 when the
 * balance doesn't reach the floor tier's threshold (Unverified).
 */
export function earnedTierLevel(
 balanceUsd: number,
 floorTier: number,
 thresholds: TierThreshold[],
): TierLevel {
 const desc = [...thresholds].sort((a, b) => b.tier - a.tier);
 for (const t of desc) {
 if (t.tier < floorTier) continue;
 const meets =
 balanceUsd >= t.min_balance_usd ||
 (t.alt_balance_usd != null && balanceUsd >= t.alt_balance_usd);
 if (meets) return t.tier;
 }
 return 0;
}

export type TierResult = {
 tier: TierLevel;
 tier_name: string;
 is_active: boolean;
 reason?: "below_starter_balance" | "no_recent_trade" | null;
 next: { tier: TierLevel; name: string; balance_needed: number; referrals_needed: number } | null;
};

/**
 * Compute a user's current tier + Active flag.
 * Called by:
 * - Verification engine (initial activation)
 * - Daily cron (re-eval)
 * - TradeSync trade webhook (instant flip on first qualifying trade)
 */
export function computeTier(input: TierInput): TierResult {
 const ascending = [...input.thresholds].sort((a, b) => a.tier - b.tier);
 const floor = input.floor_tier ?? 0;

 // Highest tier the balance earns, never below the member's country floor.
 const earnedLevel = earnedTierLevel(input.active_balance_usd, floor, ascending);
 const earned = ascending.find((t) => t.tier === earnedLevel) ?? null;

 // Active rule: reached a real tier AND traded enough lots for it (the caller
 // sized has_recent_trade against lotsRequiredForTier(earned)).
 const meetsStarter = earned !== null;
 const isActive = meetsStarter && input.has_recent_trade;

 // What's next?
 const earnedTier = earned?.tier ?? 0;
 const nextThreshold = ascending.find((t) => t.tier > earnedTier) ?? null;
 const next = nextThreshold
 ? {
 tier: nextThreshold.tier,
 name: nextThreshold.name,
 balance_needed: Math.max(0, nextThreshold.min_balance_usd - input.active_balance_usd),
 // referrals_needed: Math.max(0, nextThreshold.min_referrals - input.qualified_referrals),
 referrals_needed: 0,
 }
 : null;

 let reason: TierResult["reason"] = null;
 if (!isActive) {
 if (!meetsStarter) reason = "below_starter_balance";
 else if (!input.has_recent_trade) reason = "no_recent_trade";
 }

 return {
 tier: (earned?.tier ?? 0) as TierLevel,
 tier_name: earned?.name ?? "Preview",
 is_active: isActive,
 reason,
 next,
 };
}

/**
 * Fetch the global tier thresholds from the `tier_thresholds` table. One rank
 * ladder applies to every member - per-country overrides were removed.
 */
export async function loadTierThresholds(
 supabase: any,
): Promise<TierThreshold[]> {
 const { data, error } = await supabase
 .from("tier_thresholds")
 .select("tier, name, min_balance_usd, min_referrals, alt_balance_usd")
 .order("tier", { ascending: true });
 if (error) throw error;
 return (data ?? []).map((r: any) => ({
 tier: r.tier as TierLevel,
 name: r.name,
 min_balance_usd: Number(r.min_balance_usd),
 min_referrals: Number(r.min_referrals),
 alt_balance_usd: r.alt_balance_usd != null ? Number(r.alt_balance_usd) : null,
 }));
}

/** Parse tier_min / profile tier from form or API (preserves 0). */
export function parseTierMin(value: unknown, fallback = 1): number {
 if (value === null || value === undefined || value === "") return fallback;
 const n = Number(value);
 if (!Number.isFinite(n)) return fallback;
 return Math.min(Math.max(Math.trunc(n), 0), 7);
}

export function isLiveEventLocked(userTier: unknown, eventTierMin: unknown): boolean {
 return parseTierMin(userTier, 0) < parseTierMin(eventTierMin, 0);
}
