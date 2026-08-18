import { prisma } from "@/lib/prisma";
import type {
  AddListingRoomInput,
  SubmittedListing,
  SubmitListingInput,
  UpdateListingInput,
} from "@/lib/listings/submission-types";
import { normalizeSubmittedListing } from "@/lib/listings/submission-data";

function parsePayload(raw: string): SubmittedListing {
  return normalizeSubmittedListing(JSON.parse(raw) as SubmittedListing);
}

function toRow(listing: {
  id: string;
  payload: string;
  featured?: boolean;
}): SubmittedListing {
  const data = parsePayload(listing.payload);
  return normalizeSubmittedListing({
    ...data,
    id: listing.id,
    featured: listing.featured ?? data.featured,
  });
}

async function ensureHostUser(hostId: string, hostName: string) {
  const existing = await prisma.user.findUnique({ where: { id: hostId } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id: hostId,
      fullName: hostName || "Host",
      email: `${hostId}@hosts.local`,
      roles: JSON.stringify(["host"]),
      isVerified: true,
    },
  });
}

export async function listListings(): Promise<SubmittedListing[]> {
  const rows = await prisma.listing.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toRow);
}

export async function getListing(id: string): Promise<SubmittedListing | null> {
  const row = await prisma.listing.findUnique({ where: { id } });
  return row ? toRow(row) : null;
}

export async function createListing(input: SubmitListingInput): Promise<SubmittedListing> {
  await ensureHostUser(input.hostId, input.hostName);
  const id = `L-${Date.now().toString(36).toUpperCase()}`;
  const listing: SubmittedListing = {
    ...input,
    id,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  await prisma.listing.create({
    data: {
      id,
      hostId: input.hostId,
      title: listing.title,
      status: listing.status,
      payload: JSON.stringify(listing),
      maxGuests: listing.rooms?.[0]?.capacity ?? 4,
      pricePerNight: listing.rooms?.[0]?.price ?? null,
    },
  });
  return listing;
}

export async function updateListingPayload(
  id: string,
  updater: (prev: SubmittedListing) => SubmittedListing
): Promise<SubmittedListing | null> {
  const row = await prisma.listing.findUnique({ where: { id } });
  if (!row) return null;
  const next = updater(toRow(row));
  await prisma.listing.update({
    where: { id },
    data: {
      title: next.title,
      status: next.status,
      payload: JSON.stringify(next),
      maxGuests: next.rooms?.[0]?.capacity ?? row.maxGuests,
      pricePerNight: next.rooms?.[0]?.price ?? row.pricePerNight,
      hostId: next.hostId,
      featured: Boolean(next.featured),
    },
  });
  return next;
}

export async function updateListingFields(
  id: string,
  input: UpdateListingInput
): Promise<SubmittedListing | null> {
  return updateListingPayload(id, (prev) => ({
    ...prev,
    ...input,
    status: prev.status === "approved" ? "pending" : prev.status,
    statusUpdatedAt: new Date().toISOString(),
  }));
}

export async function setListingStatus(
  id: string,
  status: SubmittedListing["status"],
  extra?: Partial<SubmittedListing>
): Promise<SubmittedListing | null> {
  return updateListingPayload(id, (prev) => ({
    ...prev,
    ...extra,
    status,
    statusUpdatedAt: new Date().toISOString(),
  }));
}

export async function deleteListing(id: string): Promise<boolean> {
  try {
    await prisma.listing.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function seedListingsIfEmpty(seed: SubmittedListing[]): Promise<number> {
  const count = await prisma.listing.count();
  if (count > 0) return 0;

  let inserted = 0;
  for (const item of seed) {
    await ensureHostUser(item.hostId, item.hostName);
    await prisma.listing.create({
      data: {
        id: item.id,
        hostId: item.hostId,
        title: item.title,
        status: item.status,
        payload: JSON.stringify(item),
        maxGuests: item.rooms?.[0]?.capacity ?? 4,
        pricePerNight: item.rooms?.[0]?.price ?? null,
        createdAt: new Date(item.submittedAt),
      },
    });
    inserted += 1;
  }
  return inserted;
}

export async function addRoomToListingPayload(
  listingId: string,
  input: AddListingRoomInput
): Promise<{ listing: SubmittedListing; roomId: string } | null> {
  let roomId = "";
  const listing = await updateListingPayload(listingId, (prev) => {
    roomId = `R-${Date.now()}`;
    return {
      ...prev,
      rooms: [...(prev.rooms ?? []), { ...input, id: roomId }],
    };
  });
  if (!listing || !roomId) return null;
  return { listing, roomId };
}

export async function deleteRoomFromListingPayload(
  listingId: string,
  roomId: string
): Promise<SubmittedListing | null> {
  return updateListingPayload(listingId, (prev) => {
    if (!prev.rooms?.length) return prev;
    return { ...prev, rooms: prev.rooms.filter((r) => r.id !== roomId) };
  });
}

export async function updateRoomPriceOnListingPayload(
  listingId: string,
  roomId: string,
  price: number
): Promise<SubmittedListing | null> {
  return updateListingPayload(listingId, (prev) => {
    if (!prev.rooms?.length) return prev;
    return {
      ...prev,
      rooms: prev.rooms.map((r) =>
        r.id === roomId ? { ...r, price: Math.max(0, price) } : r
      ),
    };
  });
}
