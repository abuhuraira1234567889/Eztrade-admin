type GtmEvent = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: GtmEvent[];
  }
}

function dataLayer(): GtmEvent[] {
  window.dataLayer = window.dataLayer ?? [];
  return window.dataLayer;
}

/** Push a virtual pageview for SPA route changes (direct loads + client navigations). */
export function pushVirtualPageview(pagePath: string, pageTitle = document.title) {
  const pageLocation = `${window.location.origin}${pagePath}${window.location.hash}`;

  dataLayer().push({
    event: "virtualPageview",
    page_path: pagePath,
    page_title: pageTitle,
    page_location: pageLocation,
  });
}
