import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";

const NAMESPACES = [
  "common",
  "nav",
  "dashboard",
  "journal",
  "signals",
  "scanner",
  "scannerTest",
  "live",
  "rewards",
  "academy",
  "account",
  "auth",
  "onboarding",
  "gamification",
  "quiz",
  "announcements",
  "tradeIdeas",
  "compliance",
  "marketing",
  "legal",
] as const;

function getLocale(): string {
  const match = document.cookie.match(/(?:^|;\s*)pt-lang=([^;]+)/);
  const cookie = match?.[1];
  return SUPPORTED_LANGUAGES.some((l) => l.code === cookie) ? (cookie as string) : "en";
}

const locale = getLocale();

void i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: locale,
    fallbackLng: "en",
    // Load English alongside the active locale so missing keys resolve via fallback.
    preload: locale === "en" ? ["en"] : [locale, "en"],
    ns: [...NAMESPACES],
    defaultNS: "common",
    backend: {
      loadPath: "/messages/{{lng}}/{{ns}}.json",
    },
    // Message files use next-intl-style `{var}` placeholders (not i18next `{{var}}`).
    interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
    react: { useSuspense: true },
  });

export default i18n;
