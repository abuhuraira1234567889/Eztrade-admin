"use client";

// Predefined session banner artwork. Admins pick one of these in the event
// form instead of free-typing a URL. The chosen value stored in
// `live_events.banner_image_url` is always the resolved path below.

export type SessionBanner = {
  key: string;
  label: string;
  path: string;
};

const KEYS = [
  { key: "aurex", label: "Aurex" },
  { key: "meridian", label: "Meridian" },
  { key: "founder-ama", label: "Founder AMA" },
  { key: "weekly-recap", label: "Weekly Recap" },
  { key: "market-breakdown", label: "Market Breakdown" },
  { key: "trading-psychology", label: "Trading Psychology" },
  { key: "community", label: "Community" },
  { key: "vektor", label: "Vektor Live Session" },
  { key: "cypher", label: "Cypher Live Trading" },
  { key: "new-member-onboarding", label: "New Member Onboarding" },
  { key: "aurex-live", label: "Aurex Live Trading" },
] as const;

export const SESSION_BANNERS: SessionBanner[] = KEYS.map((k) => ({
  key: k.key,
  label: k.label,
  path: `/session-banners/${k.key}.png`,
}));

const VALID_PATHS = new Set(SESSION_BANNERS.map((b) => b.path));

/** Returns the given path only if it is one of the predefined banners. */
export function normalizeBannerPath(value: string | null | undefined): string | null {
  if (!value) return null;
  return VALID_PATHS.has(value) ? value : null;
}
