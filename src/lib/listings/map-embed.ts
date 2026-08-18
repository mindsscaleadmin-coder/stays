/**
 * Extract a safe map embed URL from a pasted iframe snippet or direct URL.
 * Supports Google Maps embed and OpenStreetMap embed links.
 */
export function parseMapEmbedUrl(input: string): string {
  const raw = input.trim();
  if (!raw) return "";

  const iframeSrc = raw.match(/src=["']([^"']+)["']/i)?.[1];
  const candidate = (iframeSrc ?? raw).trim();

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";

    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();

    const isGoogleEmbed =
      (host === "www.google.com" || host === "google.com" || host.endsWith(".google.com")) &&
      path.includes("/maps/embed");
    const isGoogleMapsApp = host === "maps.google.com" && path.includes("/embed");
    const isOsm =
      (host === "www.openstreetmap.org" || host === "openstreetmap.org") &&
      url.searchParams.has("bbox");

    if (isGoogleEmbed || isGoogleMapsApp || isOsm) {
      return url.toString();
    }

    // Allow generic https embed iframes from known map hosts (Maps share → embed conversion not attempted).
    if (
      host.includes("google.") &&
      (path.includes("/maps") || url.searchParams.has("q"))
    ) {
      // Prefer instructing hosts to use Share → Embed; still store if it looks like maps.
      if (path.includes("/maps/embed")) return url.toString();
    }

    return "";
  } catch {
    return "";
  }
}

export function isValidMapEmbedUrl(url: string): boolean {
  return Boolean(parseMapEmbedUrl(url));
}
