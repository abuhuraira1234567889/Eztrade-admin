import i18n from "@/i18n";
import { createClient } from "@/lib/supabase/client";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/constants";

const VALID_CODES = SUPPORTED_LANGUAGES.map((l) => l.code as string);
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export function getLanguageCookie(): LanguageCode {
  const match = document.cookie.match(/(?:^|;\s*)pt-lang=([^;]+)/);
  const cookie = match?.[1];
  return SUPPORTED_LANGUAGES.some((l) => l.code === cookie)
    ? (cookie as LanguageCode)
    : "en";
}

/** Apply locale to cookie, <html>, and the active i18n instance. */
export async function applyLanguagePreference(code: string): Promise<void> {
  if (!VALID_CODES.includes(code)) return;

  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0];
  document.cookie = `pt-lang=${code}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.rtl ? "rtl" : "ltr";

  if (i18n.language !== code) {
    await i18n.changeLanguage(code as LanguageCode);
  }
}

/**
 * Align the pt-lang cookie and i18n with profiles.language. The picker reads
 * the profile; translations read the cookie - keep them in sync on load.
 */
export async function syncLanguageFromProfile(code: string): Promise<void> {
  if (!VALID_CODES.includes(code)) return;
  if (getLanguageCookie() === code && i18n.language === code) return;
  await applyLanguagePreference(code);
}

export async function setLanguage(code: string): Promise<{ ok: boolean; error?: string }> {
  if (!VALID_CODES.includes(code)) return { ok: false, error: "Unsupported language" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("profiles").update({ language: code }).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  await applyLanguagePreference(code);
  return { ok: true };
}
