import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { pushVirtualPageview } from "@/lib/gtm";

/**
 * Fires GTM virtual pageviews on every SPA route, including the first render
 * after hydration. A deferred second push catches async document.title updates.
 */
export function GtmRouteTracker() {
  const location = useLocation();
  const lastSent = useRef<{ path: string; title: string } | undefined>(undefined);
  const pagePath = `${location.pathname}${location.search}`;

  useEffect(() => {
    let cancelled = false;

    function send(force = false) {
      const title = document.title;
      if (
        !force &&
        lastSent.current?.path === pagePath &&
        lastSent.current?.title === title
      ) {
        return;
      }

      lastSent.current = { path: pagePath, title };
      pushVirtualPageview(pagePath, title);
    }

    send();

    const retry = window.setTimeout(() => {
      if (!cancelled) send();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
    };
  }, [pagePath]);

  return null;
}
