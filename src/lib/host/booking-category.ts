import { isDiningListing } from "@/lib/booking/is-dining-listing";
import { isEventListing } from "@/lib/booking/is-event-listing";
import { isExperienceListing } from "@/lib/booking/is-experience-listing";

export type HostBookingCategory = "stay" | "experience" | "dining" | "event";

export function typeFromListingPayload(payload: string): string {
  try {
    const parsed = JSON.parse(payload) as { type?: string };
    return parsed.type ?? "";
  } catch {
    return "";
  }
}

export function resolveHostBookingCategory(input: {
  parentCategory?: string | null;
  category?: string | null;
  payload?: string | null;
  experienceSlotId?: string | null;
}): HostBookingCategory {
  const type = input.payload ? typeFromListingPayload(input.payload) : "";
  const listingInput = {
    parentCategory: input.parentCategory,
    category: input.category,
    type,
  };

  if (input.experienceSlotId || isExperienceListing(listingInput)) {
    return "experience";
  }
  if (isDiningListing(listingInput)) {
    return "dining";
  }
  if (isEventListing(listingInput)) {
    return "event";
  }
  return "stay";
}

export function hostBookingCategoryLabel(category: HostBookingCategory): string {
  switch (category) {
    case "experience":
      return "Experience";
    case "dining":
      return "Dining";
    case "event":
      return "Event";
    default:
      return "Stay";
  }
}

export function bookingCategoryForRecord(booking: {
  category?: HostBookingCategory;
  experienceSlotId?: string | null;
}): HostBookingCategory {
  if (booking.category) return booking.category;
  return resolveHostBookingCategory({
    experienceSlotId: booking.experienceSlotId,
  });
}

export function formatExperienceSessionLabel(sessionKey: string): string {
  const trimmed = sessionKey.trim();
  if (!trimmed) return "Session";
  return trimmed
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
