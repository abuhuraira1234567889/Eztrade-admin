/**
 * Static reference data shared across the app.
 * Sourced from `eztrade/docs/DECISIONS.md`.
 */

/**
 * Languages the platform supports. Each carries its native name (for the
 * picker), a one-line tagline used on the dashboard hero, and an RTL flag
 * for AR / UR layout flipping. Order matches AJ's 19 May spec.
 */
// `flag` is the ISO-3166 alpha-2 country code used by the circle-flags CDN
// (https://hatscripts.github.io/circle-flags/flags/<code>.svg). Lowercase.
// Order matches Aj's 28 May spec.
export const SUPPORTED_LANGUAGES = [
 { code: "en", name: "English",          tagline: "Trade your edge.",          rtl: false, flag: "gb" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** Resolve a stored locale code back to its full record, falling back to EN. */
export function getLanguage(code: string | null | undefined) {
 return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0];
}

/**
 * LANG-02: ISO-3166 alpha-2 country → default supported language.
 * Only countries that map to a non-EN language are listed; everything else
 * (and anything unknown) falls through to "en" via `countryToLanguage`.
 */
export const COUNTRY_TO_LANGUAGE: Record<string, LanguageCode> = {
 // Arabic
 SA: "en", AE: "en", EG: "en", QA: "en", KW: "en",
 BH: "en", OM: "en", JO: "en", MA: "en", DZ: "en",
 // Spanish
 ES: "en", MX: "en", AR: "en", CO: "en", CL: "en", PE: "en",
 // French
 FR: "en", BE: "en",
 // Urdu
 PK: "en",
 // Portuguese
 BR: "en", PT: "en",
 // Italian
 IT: "en",
 // German
 DE: "en", AT: "en", CH: "en",
 // Hindi
 IN: "en",
 // Indonesian
 ID: "en",
 // Croatian
 HR: "en", BA: "en",
 // Turkish
 TR: "en", CY: "en",
 // Polish
 PL: "en",
 // Dutch
 NL: "en",
 // Lithuanian
 LT: "en",
 // Slovak
 SK: "en",
};

/**
 * LANG-02: Map a country code to a supported language code. Fully defensive -
 * any null / unknown / malformed input resolves to "en". Never throws.
 */
export function countryToLanguage(countryCode: string | null | undefined): LanguageCode {
 if (!countryCode || typeof countryCode !== "string") return "en";
 return COUNTRY_TO_LANGUAGE[countryCode.trim().toUpperCase()] ?? "en";
}

// Top trading countries (sample list - admin can extend)
export const COUNTRIES = [
 "United Kingdom", "Italy", "Poland", "Germany", "France", "Spain", "Portugal",
 "Netherlands", "Ireland", "Sweden", "United States", "Canada", "Australia",
 "United Arab Emirates", "Saudi Arabia", "Qatar", "Bahrain", "Kuwait",
 "Singapore", "Indonesia", "Malaysia", "Philippines", "Thailand", "Vietnam",
 "India", "Pakistan", "Bangladesh", "Sri Lanka",
 "Mexico", "Brazil", "Argentina", "Chile", "Colombia",
 "Nigeria", "South Africa", "Kenya", "Egypt", "Morocco",
 "Turkey", "Other",
] as const;

// Country-based starting tiers (20 Jun): two ranks added below Bronze - Beginner
// (Africa/Balkans floor) and Starter (Developing floor). Developed users still
// start at Bronze. The whole ladder renumbered, so Bronze..VIP shifted to 3..7.
export const TIER_NAMES: Record<number, string> = {
 0: "Unverified", // shouldn't appear in member UI; reserved for pre-verification
 1: "Beginner",
 2: "Starter",
 3: "Bronze",
 4: "Silver",
 5: "Gold",
 6: "Platinum",
 7: "VIP",
};

// Per-rank badge artwork. Beginner/Starter reuse placeholders until art ships.
export const TIER_BADGES: Record<number, string> = {
 1: "/badges/beginner.png",
 2: "/badges/starter.png",
 3: "/badges/bronze.png",
 4: "/badges/silver.png",
 5: "/badges/gold.png",
 6: "/badges/platinum.png",
 7: "/badges/vip.png",
};

export const SIGNAL_STREAM_SLUGS = ["synergy", "pulsex", "nova", "zen"] as const;

export const ACTIVE_BALANCE_MIN_USD = 250;
export const ACTIVE_TRADE_WINDOW_DAYS = 30;
export const REFERRAL_QUALIFY_WINDOW_DAYS = 14;
export const WITHDRAWAL_CLAWBACK_WINDOW_DAYS = 30;
export const XP_BADGE_PURGE_DAYS = 90;
export const GRACE_PERIOD_DAYS = 14;

/** Matches backend COMPLIANCE_GRACE_MINUTES when set (dev/testing). */
export function gracePeriodMs(): number {
  const mins = Number(import.meta.env.VITE_COMPLIANCE_GRACE_MINUTES);
  if (Number.isFinite(mins) && mins > 0) return mins * 60 * 1000;
  return GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
}

// Account-eligibility (membership billing threshold). One flat global minimum
// balance - per-country buckets were removed. Tune this single value.
export const ELIGIBILITY_MIN_USD = 200;
// New members get a balance-free window measured from profiles.created_at.
export const ELIGIBILITY_NEW_MEMBER_DAYS = 30;
// Required traded volume (lots) summed over the last 30 days (rolling).
export const ELIGIBILITY_MIN_LOTS_MONTH = 2.0;
