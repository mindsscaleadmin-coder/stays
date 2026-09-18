import { BookingError } from "@/lib/booking/confirm-booking";
import { resolveCatalogListingHost } from "@/lib/listings/catalog-listing-hosts";
import { createPropertyReference } from "@/lib/listings/property-reference";
import { prisma } from "@/lib/prisma";

export type ListingBookingSnapshot = {
  id: string;
  title: string;
  hostId?: string;
  hostName?: string;
  location?: string;
  maxGuests?: number;
  pricePerNight: number;
  instantBook?: boolean;
  currency?: string;
};

/**
 * Ensure a Listing row exists so confirmBooking can run for mock + catalog stays.
 * Never upgrades an existing host submission to approved — moderation is admin-only.
 * Synthetic shells created here are for booking infrastructure only (catalog IDs).
 * Client-supplied hostId and pricePerNight are never trusted.
 */
export async function ensureListingForBooking(
  snapshot: ListingBookingSnapshot
): Promise<void> {
  const catalog = resolveCatalogListingHost(snapshot.id);
  const existing = await prisma.listing.findUnique({ where: { id: snapshot.id } });

  if (existing) {
    const catalogHostId = catalog?.hostId;
    const wrongSyntheticHost = existing.hostId.startsWith("host-for-");
    const shouldReassign =
      wrongSyntheticHost &&
      catalogHostId &&
      catalogHostId !== existing.hostId;

    if (shouldReassign) {
      await prisma.listing.update({
        where: { id: snapshot.id },
        data: { hostId: catalogHostId },
      });
    }
    return;
  }

  // Host-created listing IDs (L-…) must be submitted via the host form and approved
  // by admin — do not invent an approved shell for them.
  if (/^L-/i.test(snapshot.id)) {
    throw new BookingError(
      `Listing ${snapshot.id} is not approved yet. Host properties require admin approval before booking.`,
      "NOT_FOUND"
    );
  }

  if (!catalog) {
    throw new BookingError("Listing not found or not available", "NOT_FOUND");
  }

  const { hostId, hostName } = catalog;
  const pricePerNight = 0;

  const host = await prisma.user.findUnique({ where: { id: hostId } });
  if (!host) {
    await prisma.user.create({
      data: {
        id: hostId,
        fullName: hostName,
        email: `${hostId.replace(/[^a-zA-Z0-9]/g, "")}@hosts.local`,
        roles: JSON.stringify(["host"]),
        isVerified: true,
      },
    });
  }

  const payload = {
    id: snapshot.id,
    title: snapshot.title,
    hostId,
    hostName,
    country: "",
    state: "",
    district: snapshot.location || "",
    status: "approved",
    instantBook: Boolean(snapshot.instantBook),
    rooms: [
      {
        id: "default",
        name: "Entire place",
        capacity: snapshot.maxGuests ?? 4,
        price: pricePerNight,
      },
    ],
  };

  await prisma.listing.create({
    data: {
      id: snapshot.id,
      propertyReference: createPropertyReference(),
      hostId,
      title: snapshot.title,
      status: "approved",
      payload: JSON.stringify(payload),
      maxGuests: snapshot.maxGuests ?? 4,
      pricePerNight,
    },
  });
}
