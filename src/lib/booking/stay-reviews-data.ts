import type { ReviewEligibility, StayReview } from "./stay-reviews-types";
import { getHostBookingRecord } from "@/lib/host/host-booking-data";
import { loadGuestBookings } from "@/lib/guest/guest-bookings-data";
import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-stay-reviews";
export const STAY_REVIEWS_SYNC_EVENT = "farm-stays-stay-reviews-updated";

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(STAY_REVIEWS_SYNC_EVENT);
}

function readAll(): StayReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StayReview[];
  } catch {
    return [];
  }
}

function writeAll(rows: StayReview[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  notify();
}

export function loadStayReviews(): StayReview[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getReviewForBooking(bookingId: string): StayReview | undefined {
  return loadStayReviews().find((r) => r.bookingId === bookingId);
}

export function getPublishedReviewsForListing(listingId: string): StayReview[] {
  return loadStayReviews().filter(
    (r) => r.listingId === listingId && r.status === "published"
  );
}

export function listingRatingFromReviews(
  listingId: string,
  fallback: { rating: number; reviews: number }
): { rating: number; reviews: number } {
  const published = getPublishedReviewsForListing(listingId);
  if (published.length === 0) return fallback;
  const sum = published.reduce((s, r) => s + r.rating, 0);
  const rating = Math.round((sum / published.length) * 10) / 10;
  return { rating, reviews: published.length };
}

export function applyGuestReviewRatings<T extends { id: string; rating: number; reviews: number }>(
  stay: T
): T {
  const next = listingRatingFromReviews(stay.id, {
    rating: stay.rating,
    reviews: stay.reviews,
  });
  if (next.rating === stay.rating && next.reviews === stay.reviews) return stay;
  return { ...stay, rating: next.rating, reviews: next.reviews };
}

/** Merge server/local reviews by id (newer createdAt wins). */
export function mergeStayReviews(incoming: StayReview[]): StayReview[] {
  if (typeof window === "undefined" || incoming.length === 0) return loadStayReviews();
  const current = loadStayReviews();
  const byId = new Map(current.map((r) => [r.id, r]));
  let changed = false;
  for (const row of incoming) {
    const existing = byId.get(row.id);
    if (!existing) {
      byId.set(row.id, row);
      changed = true;
      continue;
    }
    if (new Date(row.createdAt).getTime() >= new Date(existing.createdAt).getTime()) {
      const next = { ...existing, ...row };
      if (JSON.stringify(next) !== JSON.stringify(existing)) {
        byId.set(row.id, next);
        changed = true;
      }
    }
  }
  const merged = Array.from(byId.values());
  if (changed) writeAll(merged);
  return merged;
}


/**
 * Reviews unlock only after the guest booked and stayed
 * (status completed, or confirmed with check-out date in the past).
 * One review per booking.
 */
export function getReviewEligibility(
  bookingId: string,
  hint?: {
    status?: string;
    listingId?: string;
    property?: string;
    checkOut?: string;
    guestId?: string;
  }
): ReviewEligibility | null {
  if (typeof window === "undefined") return null;

  const guest = loadGuestBookings().find((b) => b.id === bookingId);
  const host = getHostBookingRecord(bookingId);

  const status = host?.status || guest?.status || hint?.status;
  const listingId = host?.listingId || guest?.listingId || hint?.listingId || "";
  const property = host?.property || guest?.property || hint?.property || "Stay";
  const checkOut = host?.checkOut || guest?.checkOut || hint?.checkOut || "";

  if (!status) {
    return {
      eligible: false,
      reason: "Booking not found",
      bookingId,
      listingId,
      property,
    };
  }

  if (getReviewForBooking(bookingId)) {
    return {
      eligible: false,
      reason: "You already reviewed this stay",
      bookingId,
      listingId,
      property,
    };
  }

  const stayed =
    status === "completed" ||
    (status === "confirmed" && checkOutPassed(checkOut));

  if (!stayed) {
    return {
      eligible: false,
      reason:
        status === "confirmed"
          ? "Available after your check-out date"
          : "Only completed stays can be reviewed",
      bookingId,
      listingId,
      property,
    };
  }

  return {
    eligible: true,
    bookingId,
    listingId: listingId || bookingId,
    property,
  };
}

export function guestHasStayed(booking: {
  status: string;
  checkOut: string;
}): boolean {
  if (booking.status === "completed") return true;
  if (booking.status === "confirmed" && checkOutPassed(booking.checkOut)) return true;
  return false;
}

function checkOutPassed(checkOut: string, now = new Date()): boolean {
  if (!checkOut) return false;
  const end = new Date(`${checkOut}T12:00:00`);
  if (Number.isNaN(end.getTime())) return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return end.getTime() <= today.getTime();
}

export function submitStayReview(input: {
  bookingId: string;
  listingId: string;
  authorId: string;
  authorName: string;
  property: string;
  rating: number;
  comment: string;
  hint?: {
    status?: string;
    listingId?: string;
    property?: string;
    checkOut?: string;
  };
}): StayReview {
  const eligibility = getReviewEligibility(input.bookingId, input.hint);
  if (!eligibility?.eligible) {
    throw new Error(eligibility?.reason || "Not eligible to review");
  }

  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const comment = input.comment.trim();
  if (comment.length < 10) {
    throw new Error("Please write at least 10 characters");
  }

  const review: StayReview = {
    id: `rev-${Date.now().toString(36)}`,
    bookingId: input.bookingId,
    listingId: input.listingId || eligibility.listingId,
    authorId: input.authorId,
    authorName: input.authorName,
    property: input.property || eligibility.property,
    rating,
    comment,
    status: "published",
    createdAt: new Date().toISOString(),
  };

  writeAll([review, ...loadStayReviews()]);
  return review;
}

export function moderateStayReview(
  reviewId: string,
  status: StayReview["status"]
): StayReview | null {
  const all = loadStayReviews();
  const idx = all.findIndex((r) => r.id === reviewId);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], status };
  writeAll(all);
  return all[idx];
}
