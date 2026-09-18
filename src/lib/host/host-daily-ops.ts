import type { SubmittedListing } from "@/lib/listings/submission-types";
import { isExperienceMode } from "@/lib/listings/listing-mode";
import { nightlyFromListing } from "@/lib/listings/submission-to-stay";
import {
  buildQualityChecklist,
  qualityInputFromListing,
} from "@/lib/listings/listing-quality-validation";
import {
  loadListingQualityRulesStore,
  resolveRulesForParent,
} from "@/lib/admin/listing-quality-rules-data";
import { loadPricingSettings } from "./host-pricing-data";
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
    .filter((b) => {
      if (b.status !== "confirmed" && b.status !== "pending") return false;
      if (b.checkIn < today || b.checkIn > weekEnd) return false;
      if (b.status !== "confirmed") return true;
      const isTodayArrival =
        b.checkIn === today && b.checkInStatus !== "checked_out";
      const isTodayDeparture =
        b.checkOut === today &&
        (b.checkInStatus === "checked_in" || b.checkInStatus === "pending");
      const isOnProperty = b.checkIn < today && b.checkOut > today;
      return !(isTodayArrival || isTodayDeparture || isOnProperty);
    })
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return { pending, arrivals, departures, onProperty, upcoming };
}

export type ListingGoLiveTask = {
  id: string;
  listingId: string;
  title: string;
  href: string;
  /** Short problem statement */
  detail: string;
  /** Exact change the host should make */
  fix: string;
  /** Button label */
  cta?: "Fix" | "View";
};

function listingHasBookablePrice(listing: SubmittedListing): boolean {
  const experience = isExperienceMode(listing);
  const pricing = loadPricingSettings(listing.id);

  if (experience) {
    const sessions = pricing.sessions ?? [];
    if (sessions.some((s) => s.price > 0)) return true;
    return nightlyFromListing(listing) > 0;
  }

  if (nightlyFromListing(listing) > 0) return true;
  if ((listing.rooms ?? []).some((r) => r.price > 0)) return true;
  if (pricing.basePrice > 0) return true;
  if ((pricing.roomPrices ?? []).some((r) => (r.basePrice ?? 0) > 0)) return true;
  return false;
}

function failedQualityFixes(listing: SubmittedListing): string[] {
  const store = loadListingQualityRulesStore();
  const rules = resolveRulesForParent(store, {
    parentName: listing.parentCategory,
  });
  const checklist = buildQualityChecklist(qualityInputFromListing(listing), rules);
  return checklist
    .filter((item) => item.required && !item.passed)
    .map((item) => {
      if (item.detail) return `${item.label} (${item.detail} — still short)`;
      return item.label;
    });
}

function priceFixInstruction(listing: SubmittedListing): { detail: string; fix: string } {
  const experience = isExperienceMode(listing);
  const pricing = loadPricingSettings(listing.id);

  if (experience) {
    const sessions = pricing.sessions ?? [];
    if (sessions.length === 0) {
      return {
        detail: "No session prices are set for this experience.",
        fix: "Open Pricing → add at least one session and set its Price above 0, then Save.",
      };
    }
    const unpaid = sessions.filter((s) => !(s.price > 0)).map((s) => s.label || s.key);
    return {
      detail:
        unpaid.length === sessions.length
          ? "Session templates exist, but every session price is still 0."
          : `These sessions still have price 0: ${unpaid.slice(0, 3).join(", ")}${unpaid.length > 3 ? "…" : ""}.`,
      fix: "Open Pricing → set Price above 0 on at least one session → Save.",
    };
  }

  const hasRooms = (listing.rooms ?? []).length > 0;
  if (hasRooms) {
    return {
      detail: "Room types exist, but none have a nightly price above 0.",
      fix: "Open Pricing → set a nightly rate above 0 on at least one room (or the property base price) → Save.",
    };
  }
  return {
    detail: "No nightly / base price is set (still 0).",
    fix: "Open Pricing → set Base nightly price above 0 → Save.",
  };
}

function pushTask(tasks: ListingGoLiveTask[], task: ListingGoLiveTask) {
  if (tasks.length >= 6) return;
  tasks.push(task);
}

export function listingGoLiveTasks(listings: SubmittedListing[]): ListingGoLiveTask[] {
  const tasks: ListingGoLiveTask[] = [];
  for (const listing of listings) {
    const experience = isExperienceMode(listing);
    const editHref = `/host/listings/${listing.id}/edit`;
    const pricingHref = `/host/pricing?listing=${encodeURIComponent(listing.id)}`;
    const qualityGaps = failedQualityFixes(listing);

    if (listing.status === "unpublished") {
      const reason = listing.unpublishReason?.trim();
      pushTask(tasks, {
        id: `${listing.id}-unpub`,
        listingId: listing.id,
        title: listing.title,
        href: editHref,
        detail: reason
          ? `Unpublished by admin: ${reason}`
          : `This ${experience ? "experience" : "stay"} is unpublished, so guests cannot find or book it.`,
        fix: qualityGaps.length
          ? `In Edit listing, fix: ${qualityGaps.slice(0, 4).join("; ")}${qualityGaps.length > 4 ? "…" : ""} — then publish again.`
          : "Open Edit listing → publish it again (or resubmit if asked).",
      });
    }

    if (listing.status === "pending") {
      pushTask(tasks, {
        id: `${listing.id}-pending`,
        listingId: listing.id,
        title: listing.title,
        href: editHref,
        detail: "Waiting on admin approval — not live for guests yet.",
        fix: "Nothing required right now. Open the listing only if you need to edit details while you wait.",
        cta: "View",
      });
    }

    if (listing.status === "rejected") {
      const gaps = [...qualityGaps];
      if (!listingHasBookablePrice(listing)) {
        gaps.push(experience ? "Session price (> 0)" : "Nightly / base price (> 0)");
      }
      pushTask(tasks, {
        id: `${listing.id}-rejected`,
        listingId: listing.id,
        title: listing.title,
        href: editHref,
        detail: "Admin declined this listing — it will not go live until you fix and resubmit.",
        fix: gaps.length
          ? `Change these, then open Edit → resubmit: ${gaps.slice(0, 5).join("; ")}${gaps.length > 5 ? "…" : ""}.`
          : "Open Edit listing → review all fields and photos → resubmit for approval.",
      });
      continue;
    }

    const photos = listing.photoUrls?.filter(Boolean).length ?? 0;
    if (photos === 0) {
      pushTask(tasks, {
        id: `${listing.id}-photos`,
        listingId: listing.id,
        title: listing.title,
        href: editHref,
        detail: "No photos uploaded (0 photos).",
        fix: "Open Edit listing → Photos → upload at least 1 clear photo → Save.",
      });
    }

    if (!listingHasBookablePrice(listing)) {
      const price = priceFixInstruction(listing);
      pushTask(tasks, {
        id: `${listing.id}-price`,
        listingId: listing.id,
        title: listing.title,
        href: pricingHref,
        detail: price.detail,
        fix: price.fix,
      });
    }

    // Surface other quality gaps for live/approved drafts that still fail rules
    if (
      listing.status === "approved" &&
      qualityGaps.length > 0 &&
      !tasks.some((t) => t.listingId === listing.id)
    ) {
      pushTask(tasks, {
        id: `${listing.id}-quality`,
        listingId: listing.id,
        title: listing.title,
        href: editHref,
        detail: "Listing is live but still missing required quality fields.",
        fix: `Change these in Edit listing: ${qualityGaps.slice(0, 5).join("; ")}${qualityGaps.length > 5 ? "…" : ""}.`,
      });
    }
  }
  return tasks;
}

export function stayHint(booking: HostBookingRecord): string {
  const notes = displaySpecialRequests(booking);
  const party = `${booking.guests} guest${booking.guests === 1 ? "" : "s"}`;
  return notes ? `${party} · ${notes}` : party;
}
