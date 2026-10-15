import { supabase } from "@/lib/supabase/client";
import { clearSessionStart } from "@/lib/session-expiry";

const REASON_STORAGE_KEY = "pt-auth-redirect-reason";

let signOutInFlight = false;

export type AuthRedirectReason = "session_expired";

export function markAuthRedirectReason(reason: AuthRedirectReason): void {
  try {
    sessionStorage.setItem(REASON_STORAGE_KEY, reason);
  } catch {
    // ignore
  }
}

export function consumeAuthRedirectReason(): AuthRedirectReason | null {
  try {
    const value = sessionStorage.getItem(REASON_STORAGE_KEY);
    sessionStorage.removeItem(REASON_STORAGE_KEY);
    return value === "session_expired" ? value : null;
  } catch {
    return null;
  }
}

export function buildLoginUrl(opts?: { redirect?: string; reason?: AuthRedirectReason }): string {
  const params = new URLSearchParams();
  if (opts?.redirect) params.set("redirect", opts.redirect);
  if (opts?.reason) params.set("reason", opts.reason);
  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}

/** Sign out and hard-redirect to login (deduped - safe from axios interceptors). */
export async function forceAuthSignOut(opts?: {
  reason?: AuthRedirectReason;
  redirect?: string;
}): Promise<void> {
  if (signOutInFlight) return;
  signOutInFlight = true;

  const reason = opts?.reason ?? "session_expired";
  markAuthRedirectReason(reason);
  clearSessionStart();

  try {
    await supabase.auth.signOut();
  } catch {
    // still redirect
  }

  const redirect =
    opts?.redirect ??
    `${window.location.pathname}${window.location.search}${window.location.hash}`;

  window.location.assign(
    buildLoginUrl({
      redirect: redirect.startsWith("/") ? redirect : undefined,
      reason,
    }),
  );
}
