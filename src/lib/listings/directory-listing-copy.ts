export type DirectoryListingVariant = "event" | "dining";

export interface DirectoryListingCopy {
  entityLabel: string;
  entityLabelLower: string;
  hostLabel: string;
  startingPriceSuffix: string;
  spaceRateSuffix: string;
  aboutHeading: string;
  spacesTab: string;
  spacesHeading: string;
  spacesSubheadingSingle: string;
  spacesSubheadingMulti: string;
  requestSpaceCta: string;
  spaceSelectedBadge: string;
  spaceSelectedCta: string;
  reviewsHeading: string;
  reviewsEmpty: string;
  policiesHeading: string;
  newProfileLabel: string;
  bookableSpaceLabel: string;
  bookableSpacesLabel: string;
  guestCapacityStat: string;
  confidenceItems: string[];
  verifiedBadge: string;
  sidebarUrgencyTitle: string;
  sidebarUrgencyBody: string;
  trustReply: string;
  trustVerified: string;
}

export const DIRECTORY_LISTING_COPY: Record<DirectoryListingVariant, DirectoryListingCopy> = {
  event: {
    entityLabel: "Venue",
    entityLabelLower: "venue",
    hostLabel: "this venue",
    startingPriceSuffix: "starting price / event",
    spaceRateSuffix: "starting rate · per event",
    aboutHeading: "About this venue",
    spacesTab: "Spaces & pricing",
    spacesHeading: "Spaces & pricing",
    spacesSubheadingSingle: "One bookable space for your event",
    spacesSubheadingMulti: "Choose a hall, lawn, or area that fits your event",
    requestSpaceCta: "Select a date",
    spaceSelectedBadge: "Selected",
    spaceSelectedCta: "Selected",
    reviewsHeading: "What event planners love about this venue",
    reviewsEmpty: "No reviews yet — be the first to host your event here.",
    policiesHeading: "Venue policies",
    newProfileLabel: "New venue — no reviews yet",
    bookableSpaceLabel: "Bookable space",
    bookableSpacesLabel: "Bookable spaces",
    guestCapacityStat: "Guest capacity",
    confidenceItems: ["Verified venue", "Fast response", "Direct contact", "No hidden fees"],
    verifiedBadge: "Every venue document-verified",
    sidebarUrgencyTitle: "Weekend dates book out fast",
    sidebarUrgencyBody: "Send your date early to confirm availability.",
    trustReply: "Hosts typically reply within hours",
    trustVerified: "Every venue document-verified",
  },
  dining: {
    entityLabel: "Restaurant",
    entityLabelLower: "restaurant",
    hostLabel: "this restaurant",
    startingPriceSuffix: "indicative spend · per person",
    spaceRateSuffix: "indicative only · per person",
    aboutHeading: "About this restaurant",
    spacesTab: "Menu & hours",
    spacesHeading: "Menu & hours",
    spacesSubheadingSingle: "One restaurant listing",
    spacesSubheadingMulti: "One restaurant listing",
    requestSpaceCta: "Request reservation",
    spaceSelectedBadge: "Selected",
    spaceSelectedCta: "Selected",
    reviewsHeading: "What diners love about this restaurant",
    reviewsEmpty: "No reviews yet — be the first to dine here.",
    policiesHeading: "Dining policies",
    newProfileLabel: "New listing — no reviews yet",
    bookableSpaceLabel: "Dining space",
    bookableSpacesLabel: "Dining spaces",
    guestCapacityStat: "Seating capacity",
    confidenceItems: [
      "Verified listing",
      "Platform availability check",
      "Contact after confirmation",
      "No booking fees",
    ],
    verifiedBadge: "Every restaurant document-verified",
    sidebarUrgencyTitle: "Weekend tables fill quickly",
    sidebarUrgencyBody: "Send your preferred date early to secure a table.",
    trustReply: "Availability checks through our platform",
    trustVerified: "Every restaurant document-verified",
  },
};

export function resolveDirectoryPriceSuffix(
  priceUnit: string | undefined,
  variant: DirectoryListingVariant
): string {
  if (variant === "dining") {
    switch (priceUnit) {
      case "per_table":
        return "indicative rate · per table";
      case "minimum_spend":
        return "minimum spend";
      case "per_person":
        return "indicative rate · per person";
      case "full_day":
        return "indicative rate · full day";
      case "half_day":
        return "indicative rate · half day";
      case "hour":
        return "indicative rate · per hour";
      default:
        return DIRECTORY_LISTING_COPY.dining.spaceRateSuffix;
    }
  }
  switch (priceUnit) {
    case "hour":
      return "starting rate · per hour";
    case "half_day":
      return "starting rate · half day";
    case "full_day":
      return "starting rate · full day";
    default:
      return DIRECTORY_LISTING_COPY.event.spaceRateSuffix;
  }
}
