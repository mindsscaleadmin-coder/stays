/** Only allow in-app paths so login `next` cannot bounce off-site. */
export function safeInternalPath(raw: string | null | undefined, fallback: string): string {
  const next = (raw || fallback).trim();
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return fallback;
  }
  return next;
}

/** Full navigation — recovers when the App Router is stuck. */
export function goInternal(path: string) {
  if (typeof window === "undefined") return;
  window.location.assign(path);
}
