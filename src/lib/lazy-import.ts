import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const RELOAD_KEY = "pt-chunk-reload";
// Allow a few one-shot recoveries (a genuine stale chunk after a deploy needs
// exactly one), but hard-cap them within a rolling window so a misbehaving
// server (e.g. one that returns index.html for a missing /assets/*.js, or a
// stale cached index.html) can never spin the page in an endless reload loop.
const RELOAD_WINDOW_MS = 60_000;
const MAX_RELOADS_PER_WINDOW = 3;

function recentReloads(): number[] {
  try {
    const raw = sessionStorage.getItem(RELOAD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - RELOAD_WINDOW_MS;
    return parsed.filter((t): t is number => typeof t === "number" && t >= cutoff);
  } catch {
    return [];
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

/** True when a lazy-loaded JS chunk is missing (usually after a new deploy). */
export function isChunkLoadError(error: unknown): boolean {
  if (error instanceof Error && error.name === "ChunkLoadError") return true;
  const msg = errorMessage(error).toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("unable to preload css") ||
    msg.includes("loading chunk") ||
    msg.includes("chunkloaderror") ||
    msg.includes("dynamically imported module") ||
    msg.includes("missing default export") ||
    (msg.includes("failed to fetch") && msg.includes(".js"))
  );
}

/**
 * Reload once when a stale chunk is detected. If a reload was already attempted
 * recently, returns false so the UI can show a manual refresh instead of looping.
 */
export function reloadForStaleChunk(): boolean {
  try {
    const recent = recentReloads();
    if (recent.length >= MAX_RELOADS_PER_WINDOW) {
      // Reloading hasn't recovered the chunk - it's genuinely unavailable
      // (broken deploy or a stale, cached index.html pointing at deleted
      // hashes). Stop looping so the UI can show a manual refresh instead.
      return false;
    }
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify([...recent, Date.now()]));
  } catch {
    // Without working sessionStorage we can't bound the attempts, so don't
    // reload - an untracked reload could loop forever.
    return false;
  }
  window.location.reload();
  return true;
}

/** Clear the reload guard after the app has been running successfully. */
export function clearChunkReloadGuard(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // ignore
  }
}

const RETRY_DELAYS_MS = [300, 600, 1200, 2400];

async function importWithRetry<T>(
  loader: () => Promise<T>,
  attempt = 0,
): Promise<T> {
  try {
    return await loader();
  } catch (err) {
    if (!isChunkLoadError(err) || attempt >= RETRY_DELAYS_MS.length) throw err;
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    return importWithRetry(loader, attempt + 1);
  }
}

/** React.lazy wrapper that recovers from stale chunk errors after deploys. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyImport<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    importWithRetry(async () => {
      const mod = await loader();
      if (!mod?.default) {
        // A missing chunk often resolves as HTML (SPA fallback) or an empty
        // module object - treat it like a chunk load failure so we reload once.
        throw new Error("Lazy route module missing default export");
      }
      return mod;
    }).catch((err) => {
      if (
        (isChunkLoadError(err) ||
          errorMessage(err).toLowerCase().includes("missing default export")) &&
        reloadForStaleChunk()
      ) {
        return new Promise<{ default: T }>(() => {
          /* page is reloading */
        });
      }
      throw err;
    }),
  );
}
