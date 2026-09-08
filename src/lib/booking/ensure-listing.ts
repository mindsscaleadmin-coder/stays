import { prisma } from "@/lib/prisma";
import { resolveCatalogListingHost } from "@/lib/listings/catalog-listing-hosts";
import { createPropertyReference } from "@/lib/listings/property-reference";

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

function resolveHost(snapshot: ListingBookingSnapshot) {
  const catalog = resolveCatalogListingHost(snapshot.id);
  if (snapshot.hostId) {
    return {
      hostId: snapshot.hostId,
      hostName: snapshot.hostName || catalog?.hostName || "Host",
    };
  }
  if (catalog) {
    return { hostId: catalog.hostId, hostName: catalog.hostName };
  }
  return {
    hostId: `host-for-${snapshot.id}`,
    hostName: snapshot.hostName || "Host",
  };
}

/**
 * Ensure a Listing row exists so confirmBooking can run for mock + catalog stays.
 * Never upgrades an existing host submission to approved — moderation is admin-only.
 * Synthetic shells created here are for booking infrastructure only (catalog IDs).
 */
export async function ensureListingForBooking(
  snapshot: ListingBookingSnapshot
): Promise<void> {
  const { hostId, hostName } = resolveHost(snapshot);
  const existing = await prisma.listing.findUnique({ where: { id: snapshot.id } });

  if (existing) {
    const wrongSyntheticHost = existing.hostId.startsWith("host-for-");
    const shouldReassign =
      wrongSyntheticHost && hostId !== existing.hostId && !hostId.startsWith("host-for-");

    // Never auto-approve host submissions. Booking requires status=approved elsewhere.
    if (shouldReassign) {
      await prisma.listing.update({
        where: { id: snapshot.id },
        data: { hostId },
      });
    }
    return;
  }

  // Host-created listing IDs (L-…) must be submitted via the host form and approved
  // by admin — do not invent an approved shell for them.
  if (/^L-/i.test(snapshot.id)) {
    throw new Error(
      `Listing ${snapshot.id} is not approved yet. Host properties require admin approval before booking.`
    );
  }

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
        price: snapshot.pricePerNight,
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
      pricePerNight: snapshot.pricePerNight,
    },
  });
}
