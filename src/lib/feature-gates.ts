/** Admin-editable feature gates - mirrors `public.feature_gates` seed in schema/053. */

export type FeatureGateRow = { feature: string; label: string; min_tier: number };

/** Used when the table is missing or empty so the admin UI still renders. */
export const FEATURE_GATE_DEFAULTS: FeatureGateRow[] = [
  { feature: "academy", label: "Academy", min_tier: 1 },
  { feature: "cypher_scanner", label: "Cypher Scanner", min_tier: 2 },
  { feature: "trade_journal", label: "Trade Journal & Analytics", min_tier: 2 },
  { feature: "synergy", label: "Synergy (Telegram)", min_tier: 3 },
  { feature: "ai_coach", label: "AI Coach", min_tier: 5 },
];

export function sortFeatureGates(rows: FeatureGateRow[]): FeatureGateRow[] {
  return [...rows].sort((a, b) => a.min_tier - b.min_tier || a.label.localeCompare(b.label));
}
