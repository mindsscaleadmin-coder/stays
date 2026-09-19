import { prisma } from "@/lib/prisma";
import { asMoneyNumber } from "@/lib/money/prisma-decimal";
import { resolveCatalogListingHost } from "@/lib/listings/catalog-listing-hosts";
import type { ListingBookingSnapshot } from "@/lib/booking/ensure-listing";

export type ResolvedListingHost = {
  hostId: string;
  hostName: string;
  title: string;
  instantBook?: boolean;
  maxGuests?: number;
  pricePerNight?: number;
};

/** Resolve the owning host for checkout — Prisma row first, then catalog map. */
export async function resolveListingHostForBooking(
  listingId: string,
  snapshot?: Partial<ListingBookingSnapshot>
): Promise<ResolvedListingHost | null> {
  const row = await prisma.listing.findUnique({ where: { id: listingId } });
  if (row) {
    let hostName = snapshot?.hostName || "Host";
    let instantBook = snapshot?.instantBook;
    try {
      const payload = JSON.parse(row.payload) as {
        hostName?: string;
        instantBook?: boolean;
      };
      hostName = payload.hostName || hostName;
      if (instantBook === undefined) instantBook = Boolean(payload.instantBook);
    } catch {
      // ignore
    }
    const user = await prisma.user.findUnique({ where: { id: row.hostId } });
    return {
      hostId: row.hostId,
      hostName: user?.fullName || hostName,
      title: row.title,
      instantBook,
      maxGuests: row.maxGuests,
      pricePerNight:
        row.pricePerNight != null
          ? asMoneyNumber(row.pricePerNight)
          : snapshot?.pricePerNight,
    };
  }

  const catalog = resolveCatalogListingHost(listingId);
  if (catalog) {
    return {
      hostId: catalog.hostId,
      hostName: catalog.hostName,
      title: catalog.title,
      instantBook: snapshot?.instantBook,
      maxGuests: snapshot?.maxGuests,
      pricePerNight: snapshot?.pricePerNight,
    };
  }

  return null;
}
