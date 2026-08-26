/** iCal helpers for host channel sync (Airbnb / Booking.com calendars). */

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

export type IcalBusyEvent = {
  date: string;
  summary: string;
  uid?: string;
};

export function exportAvailabilityIcal(listingTitle: string, events: IcalBusyEvent[]): string {
  const unique = new Map<string, IcalBusyEvent>();
  for (const event of events) unique.set(event.date, event);
  const body = Array.from(unique.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((event) => {
      const next = new Date(`${event.date}T12:00:00`);
      next.setDate(next.getDate() + 1);
      const end = next.toISOString().slice(0, 10);
      return [
        "BEGIN:VEVENT",
        `UID:${event.uid || `busy-${event.date}`}@farm-stays.local`,
        `DTSTART;VALUE=DATE:${formatIcalDate(event.date)}`,
        `DTEND;VALUE=DATE:${formatIcalDate(end)}`,
        `SUMMARY:${event.summary} — ${listingTitle}`,
        "TRANSP:OPAQUE",
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Farm Stays//Channel Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    body,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function exportBlockedDatesIcal(listingTitle: string, blockedDates: string[]): string {
  return exportAvailabilityIcal(
    listingTitle,
    blockedDates.map((date) => ({ date, summary: "Blocked" }))
  );
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
