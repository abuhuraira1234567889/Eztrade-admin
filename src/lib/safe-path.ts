/**
 * Returns `next` only when it is a safe same-origin UI path, else "/dashboard".
 *
 * A path is safe when it:
 *  - starts with a single `/` (rejects protocol-relative `//host` and the
 *    backslash trick `/\host` that some browsers normalise to `//`)
 *  - is NOT an `/api/` route (a crafted login/callback link must not be able to
 *    trigger a destructive API call immediately after auth)
 *
 * Shared by the login page and the Supabase auth callback so the open-redirect
 * defence lives in exactly one place.
 */
export function safePath(next: string | null | undefined): string {
  if (!next) return "/dashboard";
  if (!/^\/(?![/\\])/.test(next)) return "/dashboard";
  if (next.startsWith("/api/")) return "/dashboard";
  return next;
}
