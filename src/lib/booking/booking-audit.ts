import type { BookingAuditEntry } from "@/lib/host/host-booking-types";

export function parseAuditLog(raw: string | null | undefined): BookingAuditEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is BookingAuditEntry => {
      return (
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as BookingAuditEntry).id === "string" &&
        typeof (entry as BookingAuditEntry).at === "string" &&
        typeof (entry as BookingAuditEntry).actor === "string" &&
        typeof (entry as BookingAuditEntry).action === "string"
      );
    });
  } catch {
    return [];
  }
}

export function makeAuditEntry(
  entry: Omit<BookingAuditEntry, "id" | "at"> & { at?: string }
): BookingAuditEntry {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: entry.at ?? new Date().toISOString(),
    actor: entry.actor,
    action: entry.action,
    detail: entry.detail,
  };
}

export function withAudit(
  existingRaw: string | null | undefined,
  entry: Omit<BookingAuditEntry, "id" | "at"> & { at?: string }
): string {
  return JSON.stringify([...parseAuditLog(existingRaw), makeAuditEntry(entry)]);
}
