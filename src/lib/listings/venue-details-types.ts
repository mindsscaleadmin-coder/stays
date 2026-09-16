export type VenuePriceUnit =
  | "hour"
  | "half_day"
  | "full_day"
  | "event"
  | "per_person"
  | "per_table"
  | "minimum_spend";

export type VenueDetailsVariant = "event" | "dining";

export interface VenueDetails {
  maxGuests?: number;
  seatedCapacity?: number;
  standingCapacity?: number;
  theatreCapacity?: number;
  cabaretCapacity?: number;
  classroomCapacity?: number;
  hallSizeSqFt?: number;
  spaceCount?: number;
  ceilingHeightFt?: number;
  parkingCapacity?: string;
  startingPrice?: number;
  priceUnit?: VenuePriceUnit;
  minimumBookingDuration?: string;
  securityDeposit?: number;
  additionalRules?: string;
  videoTourUrl?: string;
}

export const VENUE_PRICE_UNIT_OPTIONS: { value: VenuePriceUnit; label: string }[] = [
  { value: "hour", label: "Per hour" },
  { value: "half_day", label: "Per half day" },
  { value: "full_day", label: "Per full day" },
  { value: "event", label: "Per event" },
];

export const DINING_PRICE_UNIT_OPTIONS: { value: VenuePriceUnit; label: string }[] = [
  { value: "per_person", label: "Per person" },
  { value: "per_table", label: "Per table" },
  { value: "minimum_spend", label: "Minimum spend" },
  { value: "full_day", label: "Private hire (full day)" },
  { value: "half_day", label: "Private hire (half day)" },
];

export function venuePriceUnitOptions(
  variant: VenueDetailsVariant = "event"
): { value: VenuePriceUnit; label: string }[] {
  return variant === "dining" ? DINING_PRICE_UNIT_OPTIONS : VENUE_PRICE_UNIT_OPTIONS;
}

export function defaultVenuePriceUnit(variant: VenueDetailsVariant = "event"): VenuePriceUnit {
  return variant === "dining" ? "per_person" : "event";
}

export function createEmptyVenueDetails(
  variant: VenueDetailsVariant = "event"
): VenueDetails {
  return {
    maxGuests: undefined,
    seatedCapacity: undefined,
    standingCapacity: undefined,
    theatreCapacity: undefined,
    cabaretCapacity: undefined,
    classroomCapacity: undefined,
    hallSizeSqFt: undefined,
    spaceCount: undefined,
    ceilingHeightFt: undefined,
    parkingCapacity: "",
    startingPrice: undefined,
    priceUnit: defaultVenuePriceUnit(variant),
    minimumBookingDuration: "",
    securityDeposit: undefined,
    additionalRules: "",
    videoTourUrl: "",
  };
}

/** Strip empty values before persisting to listing payload. */
export function normalizeVenueDetails(input: VenueDetails): VenueDetails | undefined {
  const next: VenueDetails = {};

  if (input.maxGuests != null && input.maxGuests > 0) next.maxGuests = input.maxGuests;
  if (input.seatedCapacity != null && input.seatedCapacity > 0) {
    next.seatedCapacity = input.seatedCapacity;
  }
  if (input.standingCapacity != null && input.standingCapacity > 0) {
    next.standingCapacity = input.standingCapacity;
  }
  if (input.theatreCapacity != null && input.theatreCapacity > 0) {
    next.theatreCapacity = input.theatreCapacity;
  }
  if (input.cabaretCapacity != null && input.cabaretCapacity > 0) {
    next.cabaretCapacity = input.cabaretCapacity;
  }
  if (input.classroomCapacity != null && input.classroomCapacity > 0) {
    next.classroomCapacity = input.classroomCapacity;
  }
  if (input.hallSizeSqFt != null && input.hallSizeSqFt > 0) next.hallSizeSqFt = input.hallSizeSqFt;
  if (input.spaceCount != null && input.spaceCount > 0) next.spaceCount = input.spaceCount;
  if (input.ceilingHeightFt != null && input.ceilingHeightFt > 0) {
    next.ceilingHeightFt = input.ceilingHeightFt;
  }

  const parkingCapacity = input.parkingCapacity?.trim();
  if (parkingCapacity) next.parkingCapacity = parkingCapacity;

  if (input.startingPrice != null && input.startingPrice > 0) next.startingPrice = input.startingPrice;
  if (input.priceUnit) next.priceUnit = input.priceUnit;

  const minimumBookingDuration = input.minimumBookingDuration?.trim();
  if (minimumBookingDuration) next.minimumBookingDuration = minimumBookingDuration;

  if (input.securityDeposit != null && input.securityDeposit > 0) {
    next.securityDeposit = input.securityDeposit;
  }

  const additionalRules = input.additionalRules?.trim();
  if (additionalRules) next.additionalRules = additionalRules;

  const videoTourUrl = input.videoTourUrl?.trim();
  if (videoTourUrl) next.videoTourUrl = videoTourUrl;

  return Object.keys(next).length > 0 ? next : undefined;
}

export function hydrateVenueDetails(
  source?: VenueDetails | null,
  variant: VenueDetailsVariant = "event"
): VenueDetails {
  const empty = createEmptyVenueDetails(variant);
  if (!source) return empty;
  const rawUnit =
    source.priceUnit ??
    (source as VenueDetails & { priceUnits?: VenuePriceUnit[] }).priceUnits?.[0];
  const allowed = venuePriceUnitOptions(variant).map((option) => option.value);
  const priceUnit =
    rawUnit && allowed.includes(rawUnit) ? rawUnit : defaultVenuePriceUnit(variant);
  return {
    ...empty,
    ...source,
    parkingCapacity: source.parkingCapacity ?? "",
    minimumBookingDuration: source.minimumBookingDuration ?? "",
    additionalRules: source.additionalRules ?? "",
    videoTourUrl: source.videoTourUrl ?? "",
    priceUnit,
  };
}
