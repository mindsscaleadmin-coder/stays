import { isDiningListing } from "@/lib/booking/is-dining-listing";
import { isExperienceListing } from "@/lib/booking/is-experience-listing";
import { isEventListing } from "@/lib/booking/is-event-listing";
import type { ListingQualityMode } from "@/lib/admin/listing-quality-rules-types";

/**
 * Stay = overnight booking + commission.
 * Experience = session booking + commission.
 * Event / Dining = yearly directory listing, no guest checkout.
 */
export type ListingMode = "experience" | "stay" | "event" | "dining";

export interface ListingModeInput {
  parentCategory?: string | null;
  type?: string | null;
  category?: string | null;
}

/**
 * Pure, defensive, memo-safe. Never throws — a listing with missing/malformed
 * taxonomy fields always resolves to "stay" (pre-existing default).
 */
export function getListingMode(input: ListingModeInput | null | undefined): ListingMode {
  try {
    if (!input) return "stay";
    if (isExperienceListing(input)) return "experience";
    if (isEventListing(input)) return "event";
    if (isDiningListing(input)) return "dining";
    return "stay";
  } catch {
    return "stay";
  }
}

export function isExperienceMode(input: ListingModeInput | null | undefined): boolean {
  return getListingMode(input) === "experience";
}

export function isEventMode(input: ListingModeInput | null | undefined): boolean {
  return getListingMode(input) === "event";
}

export function isDiningMode(input: ListingModeInput | null | undefined): boolean {
  return getListingMode(input) === "dining";
}

/** Events and dining share the venue / space listing form. */
export function isVenueDirectoryMode(
  input: ListingModeInput | ListingMode | null | undefined
): boolean {
  const mode =
    typeof input === "string" ? input : getListingMode(input);
  return mode === "event" || mode === "dining";
}

/**
 * Quality rules use the same three modes. Events skip stay-only fields
 * (rooms, farm type, livestock, farm activities) they can never fill.
 */
export function toListingQualityMode(
  input: ListingModeInput | ListingMode | null | undefined
): ListingQualityMode {
  return typeof input === "string" ? input : getListingMode(input);
}
