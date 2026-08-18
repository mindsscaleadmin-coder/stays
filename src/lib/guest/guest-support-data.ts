import {
  createSupportTicket as createCentralTicket,
  loadGuestTicketsFlat,
} from "@/lib/admin/support-data";
import { emitSyncEvent } from "@/lib/emit-sync-event";
import type { GuestSupportData, GuestSupportTicket } from "./guest-support-types";

const STORAGE_KEY = "farm-stays-guest-support";
export const GUEST_SUPPORT_SYNC_EVENT = "farm-stays-guest-support-updated";

function notify() {
  if (typeof window !== "undefined") {
    emitSyncEvent(GUEST_SUPPORT_SYNC_EVENT);
  }
}

function rememberTicketId(guestId: string, ticketId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    const ids = map[guestId] ?? [];
    map[guestId] = [ticketId, ...ids.filter((id) => id !== ticketId)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function loadGuestSupport(guestId: string): GuestSupportData {
  return {
    guestId,
    tickets: loadGuestTicketsFlat(guestId) as GuestSupportTicket[],
  };
}

/** Create a guest support ticket — synced to central admin ticketing. */
export function createGuestSupportTicket(input: {
  guestId: string;
  guestName: string;
  guestEmail?: string;
  subject: string;
  message: string;
  bookingRef?: string;
  property?: string;
}): GuestSupportData {
  const ticket = createCentralTicket({
    source: "guest",
    subject: input.subject,
    message: input.message,
    requesterId: input.guestId,
    requesterName: input.guestName,
    requesterEmail: input.guestEmail,
    bookingRef: input.bookingRef,
    property: input.property,
    priority: input.bookingRef ? "high" : "normal",
  });

  rememberTicketId(input.guestId, ticket.id);
  notify();
  return loadGuestSupport(input.guestId);
}
