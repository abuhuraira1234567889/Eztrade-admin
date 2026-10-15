import { z } from "zod";
import { FIELD_LIMITS } from "@/lib/field-limits";
import { getApi, postApi } from "@/services/api";

// Country is detected server-side from the IP at sign-up. `country` is only sent
// (and only honoured) as a FALLBACK when IP detection can't resolve a country.
const SignUpSchema = z.object({
  first_name: z.string().min(1).max(FIELD_LIMITS.firstName),
  last_name: z.string().min(1).max(FIELD_LIMITS.lastName),
  email: z.string().email(),
  password: z.string().min(FIELD_LIMITS.passwordMin).max(FIELD_LIMITS.password),
  language: z.string().min(2).max(5),
  country: z.string().max(60).optional(),
  // referral_code: z.string().max(FIELD_LIMITS.referralCode).optional().nullable(),
  agree: z.string().optional(),
});

export type DetectedCountry = {
  countryCode: string | null;
  country: string | null;
  blocked: boolean;
  reason: "vpn" | "proxy" | "tor" | null;
  configured: boolean;
};

const GEO_CACHE_KEY = "pt_signup_geo";
const GEO_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min, matches the server-side cache
let geoInflight: Promise<DetectedCountry | null> | null = null;

function readGeoCache(): DetectedCountry | null {
  try {
    const raw = sessionStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; value: DetectedCountry };
    if (Date.now() - parsed.at > GEO_CACHE_TTL_MS) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

/**
 * Public IP-based country + VPN check for the sign-up screen. Best-effort.
 *
 * Detected ONCE per sign-up: a successful result is cached in sessionStorage
 * and reused across re-renders / refreshes, and concurrent callers share a
 * single in-flight request. Blocked (VPN) results are deliberately NOT cached
 * so a user who disables their VPN is re-checked on the next load.
 */
export async function detectSignupCountry(): Promise<DetectedCountry | null> {
  const cached = readGeoCache();
  if (cached) return cached;
  if (geoInflight) return geoInflight;

  geoInflight = (async () => {
    try {
      const res = await getApi<DetectedCountry>("/api/geo/detect");
      if (res && !res.blocked) {
        try {
          sessionStorage.setItem(
            GEO_CACHE_KEY,
            JSON.stringify({ at: Date.now(), value: res }),
          );
        } catch {
          /* storage unavailable - fine, just don't cache */
        }
      }
      return res;
    } catch {
      return null;
    } finally {
      geoInflight = null;
    }
  })();
  return geoInflight;
}

export type SignUpResult =
  | { error: string }
  | { needsConfirmation: true }
  | { needsConfirmation: false };

export async function signUp(formData: FormData): Promise<SignUpResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = SignUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Please fill all required fields correctly." };
  }
  if (parsed.data.agree !== "on") {
    return { error: "You must agree to the Terms + Risk Disclosure." };
  }

  try {
    const res = await postApi<{ needsConfirmation?: boolean; error?: string }>(
      "/api/auth/sign-up",
      raw,
    );
    if (res.error) return { error: res.error };
    return { needsConfirmation: !!res.needsConfirmation };
  } catch (e) {
    const message =
      e && typeof e === "object" && "response" in e
        ? (e as { response?: { data?: { error?: string } } }).response?.data
            ?.error
        : undefined;
    return {
      error: message ?? (e instanceof Error ? e.message : "Sign-up failed."),
    };
  }
}
