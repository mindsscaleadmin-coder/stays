import type { SubmittedListing } from "@/lib/listings/submission-types";
import type { HostBookingRecord } from "./host-booking-types";
import { displaySpecialRequests, todayIso } from "./host-booking-utils";

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function expiryLabel(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  if (ms <= 0) return "Expired";
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours < 24) return `${hours}h left to reply`;
  return `${Math.ceil(hours / 24)}d left to reply`;
}

export function groupDailyOps(bookings: HostBookingRecord[], today = todayIso()) {
  const weekEnd = addDaysIso(today, 7);
  const pending = bookings
    .filter((b) => b.status === "pending")
    .sort((a, b) => (a.expiresAt || a.bookedAt).localeCompare(b.expiresAt || b.bookedAt));
  const arrivals = bookings.filter(
    (b) => b.status === "confirmed" && b.checkIn === today && b.checkInStatus !== "checked_out"
  );
  const departures = bookings.filter(
    (b) =>
      b.status === "confirmed" &&
      b.checkOut === today &&
      (b.checkInStatus === "checked_in" || b.checkInStatus === "pending")
  );
  const onProperty = bookings.filter(
    (b) =>
      b.status === "confirmed" &&
      b.checkIn < today &&
      b.checkOut > today
  );
  const upcoming = bookings
    .filter((b) => b.status === "confirmed" && b.checkIn > today && b.checkIn <= weekEnd)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return { pending, arrivals, departures, onProperty, upcoming };
}

export type ListingGoLiveTask = {
  id: string;
  listingId: string;
  title: string;
  href: string;
  detail: string;
};

export function listingGoLiveTasks(listings: SubmittedListing[]): ListingGoLiveTask[] {
  const tasks: ListingGoLiveTask[] = [];
  for (const listing of listings) {
    const href = `/host/listings/${listing.id}/edit`;
    if (listing.status === "unpublished") {
      tasks.push({
        id: `${listing.id}-unpub`,
        listingId: listing.id,
        title: listing.title,
        href,
        detail: "Unpublished — guests cannot book this stay",
      });
    }
    if (listing.status === "pending") {
      tasks.push({
        id: `${listing.id}-pending`,
        listingId: listing.id,
        title: listing.title,
        href,
        detail: "Waiting on admin approval",
      });
    }
    if (listing.status === "rejected") {
      tasks.push({
        id: `${listing.id}-rejected`,
        listingId: listing.id,
        title: listing.title,
        href,
        detail: "Declined — update details and resubmit",
      });
    }
    const photos = listing.photoUrls?.filter(Boolean).length ?? 0;
    if (photos === 0 && listing.status !== "rejected") {
      tasks.push({
        id: `${listing.id}-photos`,
        listingId: listing.id,
        title: listing.title,
        href,
        detail: "Add photos so guests can picture the farm",
      });
    }
    const priced = (listing.rooms ?? []).some((r) => r.price > 0);
    if (!priced && listing.status !== "rejected") {
      tasks.push({
        id: `${listing.id}-price`,
        listingId: listing.id,
        title: listing.title,
        href: "/host/pricing",
        detail: "Set a nightly price to start taking bookings",
      });
    }
  }
  return tasks.slice(0, 5);
}

export function stayHint(booking: HostBookingRecord): string {
  const notes = displaySpecialRequests(booking);
  const party = `${booking.guests} guest${booking.guests === 1 ? "" : "s"}`;
  return notes ? `${party} · ${notes}` : party;
}
