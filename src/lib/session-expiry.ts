/** Minimum session lifetime before automatic sign-out (default: 1 day). */
// Vite injects an unset env as undefined, but an empty `VITE_SESSION_MAX_AGE_HOURS=`
// as "" - and `Number("")` is 0, which would expire every session instantly (a
// login→redirect loop). So treat anything non-positive / non-finite as the default.
const SESSION_MAX_AGE_HOURS = (() => {
  const raw = Number(import.meta.env.VITE_SESSION_MAX_AGE_HOURS);
  return Number.isFinite(raw) && raw > 0 ? raw : 24;
})();
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_HOURS * 60 * 60 * 1000;

const STORAGE_KEY = "pt-session-started-at";

export function recordSessionStart(): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function clearSessionStart(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasSessionStart(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) != null;
  } catch {
    return false;
  }
}

export function isSessionExpired(): boolean {
  try {
    const started = localStorage.getItem(STORAGE_KEY);
    if (!started) return false;
    return Date.now() - Number(started) >= SESSION_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function sessionMaxAgeMs(): number {
  return SESSION_MAX_AGE_MS;
}
