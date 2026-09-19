import type { UpdateListingInput } from "./submission-types";

/** Host-editable listing fields — excludes ownership, moderation, and admin flags. */
const HOST_LISTING_UPDATE_KEYS: (keyof UpdateListingInput)[] = [
  "title",
  "description",
  "country",
  "state",
  "district",
  "parentCategory",
  "category",
  "subcategory",
  "type",
  "city",
  "customFilters",
  "advancedFilters",
  "photoUrls",
  "photoTags",
  "photoCount",
  "highlightIds",
  "featureIconIds",
  "amenities",
  "farmType",
  "farmActivities",
  "livestockCrops",
  "houseRules",
  "cancellationPolicyId",
  "rooms",
  "mapEmbedUrl",
  "nearbyPlaces",
  "itinerary",
  "meetingPoint",
  "requirements",
  "licenseNumber",
  "groupSizeMin",
  "venueDetails",
  "diningDetails",
  "safetyChecklist",
];

/** Strip privileged keys a host must not change (e.g. hostId, featured). */
export function pickHostListingUpdate(
  input: Partial<UpdateListingInput> & Record<string, unknown>
): Partial<UpdateListingInput> {
  const safe = {} as Partial<UpdateListingInput>;
  for (const key of HOST_LISTING_UPDATE_KEYS) {
    if (key in input && input[key] !== undefined) {
      (safe as Record<string, unknown>)[key] = input[key];
    }
  }
  return safe;
}
