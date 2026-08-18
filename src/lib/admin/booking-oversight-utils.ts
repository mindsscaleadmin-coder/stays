import type { HostBookingRecord } from "@/lib/host/host-booking-types";

export interface HostBookingMetrics {
  hostId: string;
  hostName: string;
  totalBookings: number;
  cancellations: number;
  cancellationRate: number;
  noShows: number;
  noShowRate: number;
  openDisputes: number;
}

const PROPERTY_HOST: Record<string, { hostId: string; hostName: string; listingId: string }> = {
  "Green Valley Farmhouse": {
    hostId: "seed-host-4",
    hostName: "Ahmed Al Farsi",
    listingId: "L-A01",
  },
  "Spice Garden Cottage": {
    hostId: "seed-host-5",
    hostName: "Sara Khan",
    listingId: "L-A02",
  },
  "Al Rawda Luxury Farm": {
    hostId: "seed-host-6",
    hostName: "Rashid Al Nuaimi",
    listingId: "L-B01",
  },
  "Desert Oasis Farm": {
    hostId: "seed-host-7",
    hostName: "Layla Ibrahim",
    listingId: "L-B02",
  },
  "Mountain View Villa": {
    hostId: "seed-host-8",
    hostName: "Vikram Patel",
    listingId: "L-B03",
  },
};

export function resolveBookingHost(booking: HostBookingRecord): HostBookingRecord {
  const mapped = PROPERTY_HOST[booking.property];
  if (!mapped) return booking;
  return {
    ...booking,
    hostId: booking.hostId ?? mapped.hostId,
    hostName: booking.hostName ?? mapped.hostName,
    listingId: booking.listingId ?? mapped.listingId,
  };
}

export function computeHostBookingMetrics(bookings: HostBookingRecord[]): HostBookingMetrics[] {
  const enriched = bookings.map(resolveBookingHost);
  const byHost = new Map<string, HostBookingMetrics>();

  for (const booking of enriched) {
    const hostId = booking.hostId ?? "unknown";
    const hostName = booking.hostName ?? "Unknown host";
    const row =
      byHost.get(hostId) ??
      ({
        hostId,
        hostName,
        totalBookings: 0,
        cancellations: 0,
        cancellationRate: 0,
        noShows: 0,
        noShowRate: 0,
        openDisputes: 0,
      } satisfies HostBookingMetrics);

    row.totalBookings += 1;
    if (booking.status === "cancelled") row.cancellations += 1;
    if (booking.noShow) row.noShows += 1;
    if (booking.disputeStatus === "open") row.openDisputes += 1;
    byHost.set(hostId, row);
  }

  return Array.from(byHost.values())
    .map((row) => {
      const eligibleForNoShow = row.totalBookings - row.cancellations;
      return {
        ...row,
        cancellationRate:
          row.totalBookings > 0
            ? Math.round((row.cancellations / row.totalBookings) * 1000) / 10
            : 0,
        noShowRate:
          eligibleForNoShow > 0
            ? Math.round((row.noShows / eligibleForNoShow) * 1000) / 10
            : 0,
      };
    })
    .sort((a, b) => b.openDisputes - a.openDisputes || b.cancellationRate - a.cancellationRate);
}

export function formatRate(value: number): string {
  return `${value.toFixed(1)}%`;
}
