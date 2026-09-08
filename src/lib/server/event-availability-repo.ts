import {
  getEventAvailabilityRequestsFromDb,
  saveEventAvailabilityRequestsToDb,
} from "@/lib/server/platform-catalog-repo";
import { getHostProfile } from "@/lib/server/host-profile-repo";
import {
  isContactUnlocked,
  newEventAvailabilityRequestId,
  type EventAvailabilityRequest,
  type EventAvailabilityRequestForGuest,
  type EventAvailabilityStatus,
} from "@/lib/events/event-availability-types";

function byNewest(a: EventAvailabilityRequest, b: EventAvailabilityRequest) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export async function listHostEventRequests(
  hostId: string
): Promise<EventAvailabilityRequest[]> {
  const all = await getEventAvailabilityRequestsFromDb();
  return all.filter((r) => r.hostId === hostId).sort(byNewest);
}

/**
 * Guest view. Host contact is attached only for requests the host confirmed —
 * pending and declined requests never expose WhatsApp or phone details.
 */
export async function listGuestEventRequests(
  guestId: string,
  listingId?: string
): Promise<EventAvailabilityRequestForGuest[]> {
  const all = await getEventAvailabilityRequestsFromDb();
  const mine = all
    .filter((r) => r.guestId === guestId)
    .filter((r) => !listingId || r.listingId === listingId)
    .sort(byNewest);

  const hostIds = Array.from(
    new Set(mine.filter((r) => isContactUnlocked(r.status)).map((r) => r.hostId))
  );
  const contacts = new Map<string, { displayName: string; whatsapp?: string }>();
  for (const hostId of hostIds) {
    const profile = await getHostProfile(hostId);
    contacts.set(hostId, {
      displayName: profile?.displayName?.trim() || "Host",
      whatsapp: profile?.whatsapp?.trim() || undefined,
    });
  }

  return mine.map((request) =>
    isContactUnlocked(request.status)
      ? { ...request, hostContact: contacts.get(request.hostId) }
      : request
  );
}

export async function createEventAvailabilityRequest(input: {
  listingId: string;
  listingTitle: string;
  hostId: string;
  guestId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  spaceId?: string;
  spaceName?: string;
  occasion?: string;
  partyType?: string;
  eventDate?: string;
  dateFlexible?: boolean;
  guestCount: number;
  message?: string;
}): Promise<EventAvailabilityRequest> {
  const all = await getEventAvailabilityRequestsFromDb();

  const duplicate = all.find(
    (r) =>
      r.guestId === input.guestId &&
      r.listingId === input.listingId &&
      r.eventDate === input.eventDate &&
      Boolean(r.dateFlexible) === Boolean(input.dateFlexible) &&
      r.status === "pending"
  );
  if (duplicate) return duplicate;

  const request: EventAvailabilityRequest = {
    id: newEventAvailabilityRequestId(),
    listingId: input.listingId,
    listingTitle: input.listingTitle,
    hostId: input.hostId,
    guestId: input.guestId,
    guestName: input.guestName.trim() || "Guest",
    guestEmail: input.guestEmail?.trim() || undefined,
    guestPhone: input.guestPhone?.trim() || undefined,
    spaceId: input.spaceId?.trim() || undefined,
    spaceName: input.spaceName?.trim() || undefined,
    occasion: input.occasion?.trim() || undefined,
    partyType: input.partyType?.trim() || undefined,
    eventDate: input.eventDate,
    dateFlexible: Boolean(input.dateFlexible),
    guestCount: input.guestCount,
    message: input.message?.trim() || undefined,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await saveEventAvailabilityRequestsToDb([request, ...all]);
  return request;
}

export async function getEventAvailabilityRequest(
  id: string
): Promise<EventAvailabilityRequest | null> {
  const all = await getEventAvailabilityRequestsFromDb();
  return all.find((r) => r.id === id) ?? null;
}

export async function respondToEventAvailabilityRequest(
  id: string,
  status: Exclude<EventAvailabilityStatus, "pending">,
  hostNote?: string
): Promise<EventAvailabilityRequest | null> {
  const all = await getEventAvailabilityRequestsFromDb();
  let updated: EventAvailabilityRequest | null = null;

  const next = all.map((request) => {
    if (request.id !== id) return request;
    updated = {
      ...request,
      status,
      respondedAt: new Date().toISOString(),
      hostNote: hostNote?.trim() || undefined,
    };
    return updated;
  });

  if (!updated) return null;
  await saveEventAvailabilityRequestsToDb(next);
  return updated;
}
