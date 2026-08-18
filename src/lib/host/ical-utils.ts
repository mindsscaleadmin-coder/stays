/** Minimal iCal helpers for host availability sync (demo). */

function formatIcalDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function parseIcalDate(raw: string): string | null {
  const cleaned = raw.replace(/[^0-9]/g, "").slice(0, 8);
  if (cleaned.length !== 8) return null;
  const y = cleaned.slice(0, 4);
  const m = cleaned.slice(4, 6);
  const d = cleaned.slice(6, 8);
  return `${y}-${m}-${d}`;
}

export function exportBlockedDatesIcal(listingTitle: string, blockedDates: string[]): string {
  const sorted = [...blockedDates].sort();
  const events = sorted
    .map((date) => {
      const next = new Date(`${date}T12:00:00`);
      next.setDate(next.getDate() + 1);
      const end = next.toISOString().slice(0, 10);
      return [
        "BEGIN:VEVENT",
        `UID:blocked-${date}@farm-stays.local`,
        `DTSTART;VALUE=DATE:${formatIcalDate(date)}`,
        `DTEND;VALUE=DATE:${formatIcalDate(end)}`,
        `SUMMARY:Blocked — ${listingTitle}`,
        "TRANSP:OPAQUE",
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Farm Stays//Host Availability//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function importBlockedDatesFromIcal(content: string): string[] {
  const dates = new Set<string>();
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("DTSTART")) {
      const value = line.split(":").pop() ?? "";
      const parsed = parseIcalDate(value);
      if (parsed) dates.add(parsed);
    }
    if (line.startsWith("DTEND")) {
      const value = line.split(":").pop() ?? "";
      const parsed = parseIcalDate(value);
      if (parsed) {
        // iCal DTEND is exclusive — treat day before as blocked for single-day events
        const d = new Date(`${parsed}T12:00:00`);
        d.setDate(d.getDate() - 1);
        dates.add(d.toISOString().slice(0, 10));
      }
    }
  }

  return Array.from(dates).sort();
}

export function downloadIcalFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
