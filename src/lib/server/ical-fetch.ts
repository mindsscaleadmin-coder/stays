import { importBlockedDatesFromIcal } from "@/lib/host/ical-utils";

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function isPrivateHostname(hostname: string): boolean {
  if (BLOCKED_HOSTS.has(hostname)) return true;
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return true;
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
  if (a === 10 || a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

export function assertPublicHttpsCalendarUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("Enter a valid calendar URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Calendar URL must start with https://");
  }
  if (isPrivateHostname(parsed.hostname.toLowerCase())) {
    throw new Error("That calendar host is not allowed");
  }
  return parsed;
}

export async function fetchExternalIcalDates(rawUrl: string): Promise<string[]> {
  const url = assertPublicHttpsCalendarUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "text/calendar, text/plain, */*" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Calendar returned ${res.status}`);
    const text = await res.text();
    if (text.length > 1_000_000) throw new Error("Calendar file is too large");
    return importBlockedDatesFromIcal(text);
  } finally {
    clearTimeout(timer);
  }
}
