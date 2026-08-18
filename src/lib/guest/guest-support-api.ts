import type { GuestSupportTicket } from "./guest-support-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedGuestSupport() {
  return isSharedDbEnabled();
}

export async function fetchGuestSupportFromApi(
  guestId: string
): Promise<GuestSupportTicket[]> {
  const res = await fetch(`/api/guests/${encodeURIComponent(guestId)}/support`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load guest support tickets");
  const json = (await res.json()) as { tickets: GuestSupportTicket[] };
  return json.tickets;
}

export async function createGuestSupportTicketViaApi(
  guestId: string,
  input: {
    subject: string;
    message: string;
    guestName?: string;
    guestEmail?: string;
    bookingRef?: string;
    property?: string;
  }
): Promise<GuestSupportTicket[]> {
  const res = await fetch(`/api/guests/${encodeURIComponent(guestId)}/support`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const payload = (await res.json()) as { error?: string };
    throw new Error(payload.error || "Failed to submit support ticket");
  }
  const json = (await res.json()) as { tickets: GuestSupportTicket[] };
  return json.tickets;
}
