import { prisma } from "@/lib/prisma";
import { getHostProfile } from "@/lib/server/host-profile-repo";
import {
  isContactUnlocked,
  newEventAvailabilityRequestId,
  type EventAvailabilityRequest,
  type EventAvailabilityRequestForGuest,
  type EventAvailabilityStatus,
} from "@/lib/events/event-availability-types";

type EventAvailabilityRow = {
  id: string;
  listingId: string;
  listingTitle: string;
  hostId: string;
  guestId: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  spaceId: string | null;
  spaceName: string | null;
  occasion: string | null;
  partyType: string | null;
  eventDate: string | null;
  dateFlexible: boolean;
  guestCount: number;
  message: string | null;
  status: string;
  createdAt: Date;
  respondedAt: Date | null;
  hostNote: string | null;
};

function mapRow(row: EventAvailabilityRow): EventAvailabilityRequest {
  return {
    id: row.id,
    listingId: row.listingId,
    listingTitle: row.listingTitle,
    hostId: row.hostId,
    guestId: row.guestId,
    guestName: row.guestName,
    guestEmail: row.guestEmail ?? undefined,
    guestPhone: row.guestPhone ?? undefined,
    spaceId: row.spaceId ?? undefined,
    spaceName: row.spaceName ?? undefined,
    occasion: row.occasion ?? undefined,
    partyType: row.partyType ?? undefined,
    eventDate: row.eventDate ?? undefined,
    dateFlexible: row.dateFlexible,
    guestCount: row.guestCount,
    message: row.message ?? undefined,
    status: row.status as EventAvailabilityStatus,
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString(),
    hostNote: row.hostNote ?? undefined,
  };
}

export async function listHostEventRequests(
  hostId: string
): Promise<EventAvailabilityRequest[]> {
  const rows = await prisma.eventAvailabilityRequest.findMany({
    where: { hostId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapRow);
}

/**
 * Guest view. Host contact is attached only for requests the host confirmed —
 * pending and declined requests never expose WhatsApp or phone details.
 */
export async function listGuestEventRequests(
  guestId: string,
  listingId?: string
): Promise<EventAvailabilityRequestForGuest[]> {
  const rows = await prisma.eventAvailabilityRequest.findMany({
    where: {
      guestId,
      ...(listingId ? { listingId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  const mine = rows.map(mapRow);

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
  const dateFlexible = Boolean(input.dateFlexible);
  const eventDate = input.eventDate ?? null;

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.eventAvailabilityRequest.findFirst({
      where: {
        guestId: input.guestId,
        listingId: input.listingId,
        eventDate,
        dateFlexible,
        status: "pending",
      },
    });
    if (duplicate) return mapRow(duplicate);

    const row = await tx.eventAvailabilityRequest.create({
      data: {
        id: newEventAvailabilityRequestId(),
        listingId: input.listingId,
        listingTitle: input.listingTitle,
        hostId: input.hostId,
        guestId: input.guestId,
        guestName: input.guestName.trim() || "Guest",
        guestEmail: input.guestEmail?.trim() || null,
        guestPhone: input.guestPhone?.trim() || null,
        spaceId: input.spaceId?.trim() || null,
        spaceName: input.spaceName?.trim() || null,
        occasion: input.occasion?.trim() || null,
        partyType: input.partyType?.trim() || null,
        eventDate,
        dateFlexible,
        guestCount: input.guestCount,
        message: input.message?.trim() || null,
        status: "pending",
      },
    });

    return mapRow(row);
  });
}

export async function getEventAvailabilityRequest(
  id: string
): Promise<EventAvailabilityRequest | null> {
  const row = await prisma.eventAvailabilityRequest.findUnique({ where: { id } });
  return row ? mapRow(row) : null;
}

export async function respondToEventAvailabilityRequest(
  id: string,
  status: Exclude<EventAvailabilityStatus, "pending">,
  hostNote?: string
): Promise<EventAvailabilityRequest | null> {
  const existing = await prisma.eventAvailabilityRequest.findUnique({ where: { id } });
  if (!existing) return null;

  const row = await prisma.eventAvailabilityRequest.update({
    where: { id },
    data: {
      status,
      respondedAt: new Date(),
      hostNote: hostNote?.trim() || null,
    },
  });

  return mapRow(row);
}
