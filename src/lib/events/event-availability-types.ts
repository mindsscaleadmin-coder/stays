/**
 * Event availability requests.
 *
 * Events are enquire-only: the guest asks the host to confirm a date, and the
 * host's contact details stay hidden until the host marks the date available.
 */
export type EventAvailabilityStatus = "pending" | "available" | "unavailable";

export interface EventAvailabilityRequest {
  id: string;
  listingId: string;
  listingTitle: string;
  hostId: string;
  guestId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  /** Space / hall the guest picked, when the venue lists more than one. */
  spaceId?: string;
  spaceName?: string;
  occasion?: string;
  partyType?: string;
  /** YYYY-MM-DD. Optional when the guest's date is flexible. */
  eventDate?: string;
  dateFlexible?: boolean;
  guestCount: number;
  message?: string;
  status: EventAvailabilityStatus;
  createdAt: string;
  respondedAt?: string;
  /** Host's reply shown to the guest with the decision. */
  hostNote?: string;
}

/** Host contact — only ever attached once the host confirms availability. */
export interface EventHostContact {
  displayName: string;
  whatsapp?: string;
}

/** Guest-facing shape: contact is present only when status is "available". */
export interface EventAvailabilityRequestForGuest extends EventAvailabilityRequest {
  hostContact?: EventHostContact;
}

export function isContactUnlocked(status: EventAvailabilityStatus): boolean {
  return status === "available";
}

export function newEventAvailabilityRequestId(): string {
  return `EVR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
