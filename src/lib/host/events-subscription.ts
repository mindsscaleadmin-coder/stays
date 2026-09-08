/** Host-level Events yearly access. One subscription covers all Event listings. */

export function isEventsSubscriptionActive(
  expiresAt?: string | null,
  now = new Date()
): boolean {
  if (!expiresAt?.trim()) return false;
  const ends = Date.parse(expiresAt);
  if (!Number.isFinite(ends)) return false;
  return ends > now.getTime();
}

export function addOneYearIso(from = new Date()): string {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

export function formatSubscriptionExpiry(expiresAt?: string | null, locale = "en"): string {
  if (!expiresAt?.trim()) return "";
  const ends = Date.parse(expiresAt);
  if (!Number.isFinite(ends)) return "";
  return new Date(ends).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
