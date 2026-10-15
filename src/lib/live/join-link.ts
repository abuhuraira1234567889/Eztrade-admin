export function appendAccessTokenToJoinLink(
  baseLink: string,
  accessToken: string,
): string {
  try {
    const url = new URL(baseLink);
    url.searchParams.set("access_token", accessToken);
    return url.toString();
  } catch {
    const sep = baseLink.includes("?") ? "&" : "?";
    return `${baseLink}${sep}access_token=${encodeURIComponent(accessToken)}`;
  }
}

export function extractAccessTokenFromJoinLink(joinLink: string): string | null {
  try {
    return new URL(joinLink).searchParams.get("access_token");
  } catch {
    return null;
  }
}

/** Prefer stored link + fresh token; fall back to API join URL. */
export function mergeJoinLinkWithToken(
  storedLink: string | null | undefined,
  apiJoinLink: string,
): string {
  const token = extractAccessTokenFromJoinLink(apiJoinLink);
  if (storedLink && token) {
    return appendAccessTokenToJoinLink(storedLink, token);
  }
  return apiJoinLink;
}
