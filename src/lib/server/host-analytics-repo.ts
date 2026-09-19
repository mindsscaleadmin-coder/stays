import { prisma } from "@/lib/prisma";
import { asMoneyNumber } from "@/lib/money/prisma-decimal";
import { resolveHostName } from "@/lib/admin/trust-data";
import { computeHostAnalytics } from "@/lib/host/compute-host-analytics";
import type { HostAnalyticsData } from "@/lib/host/host-analytics-types";

async function ensureHostUser(hostId: string) {
  const existing = await prisma.user.findUnique({ where: { id: hostId } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id: hostId,
      fullName: resolveHostName(hostId),
      email: `${hostId.replace(/[^a-zA-Z0-9]/g, "")}@hosts.local`,
      roles: JSON.stringify(["host"]),
      isVerified: true,
    },
  });
}

const listingSelect = {
  id: true,
  hostId: true,
  status: true,
  pricePerNight: true,
  district: true,
  payload: true,
} as const;

function listingBelongsToHost(
  listing: { hostId: string; payload: string },
  hostId: string,
  hostName?: string
): boolean {
  if (listing.hostId === hostId || listing.hostId === "demo-host") return true;
  if (!hostName) return false;
  try {
    const parsed = JSON.parse(listing.payload) as { hostName?: string };
    return parsed.hostName?.trim().toLowerCase() === hostName;
  } catch {
    return false;
  }
}

export async function getHostAnalytics(hostId: string): Promise<HostAnalyticsData> {
  const host = await prisma.user.findUnique({
    where: { id: hostId },
    select: { fullName: true },
  });
  const hostName = host?.fullName?.trim().toLowerCase();
  const rows = await prisma.listing.findMany({ select: listingSelect });
  const listings = rows
    .filter((row) => listingBelongsToHost(row, hostId, hostName))
    .map((row) => ({
      ...row,
      pricePerNight:
        row.pricePerNight != null ? asMoneyNumber(row.pricePerNight) : null,
    }));
  const listingIds = listings.map((l) => l.id);

  const bookings = listingIds.length
    ? await prisma.booking.findMany({
        where: { listingId: { in: listingIds } },
        select: {
          listingId: true,
          guestId: true,
          checkIn: true,
          checkOut: true,
          status: true,
          totalPrice: true,
          paymentStatus: true,
          createdAt: true,
        },
      })
    : [];

  const reviews = listingIds.length
    ? await prisma.review.findMany({
        where: { listingId: { in: listingIds }, status: "published" },
        select: { listingId: true, rating: true },
      })
    : [];

  const districts = Array.from(new Set(listings.map((l) => l.district).filter(Boolean)));
  const nearbyListings =
    districts.length > 0
      ? (
          await prisma.listing.findMany({
            where: {
              hostId: { not: hostId },
              status: "approved",
              district: { in: districts },
            },
            select: listingSelect,
          })
        ).map((row) => ({
          ...row,
          pricePerNight:
            row.pricePerNight != null ? asMoneyNumber(row.pricePerNight) : null,
        }))
      : [];
  const nearbyIds = nearbyListings.map((l) => l.id);
  const nearbyBookings = nearbyIds.length
    ? await prisma.booking.findMany({
        where: { listingId: { in: nearbyIds } },
        select: {
          listingId: true,
          guestId: true,
          checkIn: true,
          checkOut: true,
          status: true,
          totalPrice: true,
          paymentStatus: true,
          createdAt: true,
        },
      })
    : [];
  const nearbyReviews = nearbyIds.length
    ? await prisma.review.findMany({
        where: { listingId: { in: nearbyIds }, status: "published" },
        select: { listingId: true, rating: true },
      })
    : [];

  const normalizeBookings = <
    T extends { totalPrice: Parameters<typeof asMoneyNumber>[0] },
  >(
    rows: T[]
  ) =>
    rows.map((row) => ({
      ...row,
      totalPrice: asMoneyNumber(row.totalPrice),
    }));

  return computeHostAnalytics({
    hostId,
    listings,
    bookings: normalizeBookings(bookings),
    reviews,
    nearbyListings,
    nearbyBookings: normalizeBookings(nearbyBookings),
    nearbyReviews,
  });
}

export async function saveHostAnalytics(data: HostAnalyticsData): Promise<HostAnalyticsData> {
  await ensureHostUser(data.hostId);
  const { hostId, ...payload } = data;
  await prisma.hostAnalytics.upsert({
    where: { hostId },
    create: { hostId, payload: JSON.stringify(payload) },
    update: { payload: JSON.stringify(payload) },
  });
  return data;
}
