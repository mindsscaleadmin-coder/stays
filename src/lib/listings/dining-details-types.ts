import type { VenueDetails } from "@/lib/listings/venue-details-types";

export type PriceLevel = 1 | 2 | 3 | 4;

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type MealPeriod = "breakfast" | "lunch" | "brunch" | "dinner";

export interface MealPeriodHours {
  meal: MealPeriod;
  open?: string;
  close?: string;
}

export interface DayHours {
  day: WeekdayKey;
  closed?: boolean;
  periods?: MealPeriodHours[];
  /** @deprecated Legacy single-window hours — migrated to `periods` on read */
  open?: string;
  close?: string;
  note?: string;
}

export interface DiningMenuItem {
  name: string;
  price?: number;
  description?: string;
  category?: string;
  imageUrl?: string;
  dietaryTags?: string[];
  isSignature?: boolean;
}

export interface DiningMenuSection {
  name: string;
  items: DiningMenuItem[];
}

export type EnquiryMethod = "platform" | "phone" | "whatsapp" | "email" | "url";
export type MinimumSpendUnit = "per_person" | "per_table";

export interface DiningDetails {
  /** One-line summary shown in the listing header */
  shortDescription?: string;
  primaryCuisine?: string;
  signatureCuisine?: string;
  foodStyles?: string[];
  indoorCapacity?: number;
  outdoorCapacity?: number;
  privateDiningCapacity?: number;
  seatingOptions?: string[];
  wheelchairAccessibleSeating?: boolean;
  familySeatingAvailable?: boolean;
  priceLevel?: PriceLevel;
  averagePriceMin?: number;
  averagePriceMax?: number;
  startingPriceLabel?: string;
  depositRequired?: boolean;
  depositAmount?: number;
  depositConditions?: string;
  minimumSpend?: number;
  minimumSpendUnit?: MinimumSpendUnit;
  openingHours?: DayHours[];
  seasonalHoursNote?: string;
  specialHoursNote?: string;
  menuUrl?: string;
  menuSections?: DiningMenuSection[];
  featuredDishes?: DiningMenuItem[];
  reservationRequired?: boolean;
  advanceBookingRequired?: boolean;
  minimumAdvanceNotice?: string;
  groupBookingAvailable?: boolean;
  maxGroupSize?: number;
  preferredEnquiryMethod?: EnquiryMethod;
  reservationPhone?: string;
  reservationWhatsapp?: string;
  reservationEmail?: string;
  reservationUrl?: string;
  reservationPolicy?: string;
  dressCode?: string;
  dressCodeType?: string;
  cancellationPolicy?: string;
  cancellationPolicyType?: string;
  noShowPolicy?: string;
  lateArrivalPolicy?: string;
  childrenPolicy?: string;
  childrenPolicyType?: string;
  petPolicy?: string;
  smokingPolicy?: string;
  outsideFoodPolicy?: string;
  specialOccasionPolicy?: string;
  tableTimeLimit?: string;
  groupPolicy?: string;
  minimumAge?: number;
  landmark?: string;
  gettingHere?: string;
  locationNotes?: string;
  parkingOption?: string;
  suitableFor?: string[];
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  otherSocialUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  customSlug?: string;
}

export const MEAL_PERIODS: { key: MealPeriod; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "brunch", label: "Brunch" },
  { key: "dinner", label: "Dinner" },
];

export const WEEKDAYS: { key: WeekdayKey; label: string; short: string }[] = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

export const PRICE_LEVEL_OPTIONS: { value: PriceLevel; label: string; symbol: string }[] = [
  { value: 1, label: "Budget", symbol: "$" },
  { value: 2, label: "Moderate", symbol: "$$" },
  { value: 3, label: "Upscale", symbol: "$$$" },
  { value: 4, label: "Fine dining", symbol: "$$$$" },
];

export const DINING_FOOD_STYLE_OPTIONS = [
  "À la carte",
  "Buffet",
  "Set menu",
  "Tasting menu",
  "Sharing menu",
] as const;

export const DINING_SEATING_OPTIONS = [
  "Indoor",
  "Outdoor",
  "Terrace",
  "Rooftop",
  "Private room",
  "Booth",
  "Counter",
  "Garden",
] as const;

export const DINING_PARKING_OPTIONS = [
  "Available",
  "Valet parking",
  "Paid parking nearby",
  "Street parking",
  "No parking",
] as const;

export const DINING_DRESS_CODE_OPTIONS = [
  "No dress code",
  "Casual",
  "Smart casual",
  "Formal",
  "Custom",
] as const;

export const DINING_CHILDREN_POLICY_OPTIONS = [
  "Children welcome",
  "Adults only",
  "Children's menu",
  "High chairs available",
] as const;

export const DINING_CANCELLATION_POLICY_OPTIONS = [
  "Flexible",
  "Cancellation required before X hours",
  "Non-refundable deposit",
  "Custom policy",
] as const;

export const DINING_ENQUIRY_METHOD_OPTIONS: { value: EnquiryMethod; label: string }[] = [
  { value: "platform", label: "Through our platform" },
  { value: "phone", label: "Phone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "url", label: "Reservation URL" },
];

export const DINING_SUITABLE_FOR_OPTIONS = [
  "Couples",
  "Families",
  "Friends",
  "Business meetings",
  "Corporate dining",
  "Birthdays",
  "Anniversaries",
  "Private events",
  "Group dining",
  "Date night",
  "Tourists",
  "Solo dining",
] as const;

export const DINING_DISH_CATEGORY_OPTIONS = [
  "Starters",
  "Mains",
  "Pizza",
  "Pasta",
  "Seafood",
  "Desserts",
  "Drinks",
  "Other",
] as const;

export const DINING_DISH_DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Gluten-free",
  "Dairy-free",
] as const;

export function formatPriceLevel(level?: PriceLevel): string {
  if (!level) return "";
  const option = PRICE_LEVEL_OPTIONS.find((item) => item.value === level);
  return option?.symbol ?? "";
}

export function createEmptyMealPeriods(): MealPeriodHours[] {
  return MEAL_PERIODS.map((period) => ({ meal: period.key, open: "", close: "" }));
}

export function isMealPeriodActive(period: MealPeriodHours): boolean {
  return Boolean(period.open?.trim() || period.close?.trim());
}

export function migrateLegacyDayHours(row: DayHours): MealPeriodHours[] {
  const periods = createEmptyMealPeriods();
  const existing = row.periods ?? [];
  if (existing.some((period) => isMealPeriodActive(period))) {
    const byMeal = new Map(existing.map((period) => [period.meal, period]));
    return periods.map((period) => {
      const match = byMeal.get(period.meal);
      return {
        meal: period.meal,
        open: match?.open ?? "",
        close: match?.close ?? "",
      };
    });
  }

  const open = row.open?.trim();
  const close = row.close?.trim();
  if (!open && !close) return periods;

  const note = row.note?.trim().toLowerCase() ?? "";
  const mealMatch =
    MEAL_PERIODS.find((period) => note.includes(period.key)) ??
    MEAL_PERIODS.find((period) => note.includes(period.label.toLowerCase()));
  const targetMeal = mealMatch?.key ?? "dinner";

  return periods.map((period) =>
    period.meal === targetMeal ? { ...period, open: open ?? "", close: close ?? "" } : period
  );
}

export function getDayPeriods(row: DayHours): MealPeriodHours[] {
  return migrateLegacyDayHours(row);
}

export function formatDayHoursSummary(row: DayHours): string {
  if (row.closed) return "Closed";

  const active = getDayPeriods(row).filter(isMealPeriodActive);
  if (active.length > 0) {
    return active
      .map((period) => {
        const label = MEAL_PERIODS.find((item) => item.key === period.meal)?.label ?? period.meal;
        const times = [period.open, period.close].filter(Boolean).join(" – ");
        return `${label} ${times}`.trim();
      })
      .join(" · ");
  }

  const legacy = [row.open, row.close].filter(Boolean).join(" – ");
  return legacy || "Hours on request";
}

export function createEmptyOpeningHours(): DayHours[] {
  return WEEKDAYS.map((day) => ({
    day: day.key,
    closed: false,
    periods: createEmptyMealPeriods(),
  }));
}

function normalizeStringArray(values?: string[]): string[] {
  return (values ?? []).map((item) => item.trim()).filter(Boolean);
}

function normalizeMenuItems(items?: DiningMenuItem[]): DiningMenuItem[] {
  return (items ?? [])
    .map((item) => {
      const name = item.name?.trim();
      if (!name) return null;
      const entry: DiningMenuItem = { name };
      if (item.price != null && item.price > 0) entry.price = item.price;
      const description = item.description?.trim();
      if (description) entry.description = description;
      const category = item.category?.trim();
      if (category) entry.category = category;
      const imageUrl = item.imageUrl?.trim();
      if (imageUrl) entry.imageUrl = imageUrl;
      const dietaryTags = normalizeStringArray(item.dietaryTags);
      if (dietaryTags.length > 0) entry.dietaryTags = dietaryTags;
      if (item.isSignature) entry.isSignature = true;
      return entry;
    })
    .filter((item): item is DiningMenuItem => item !== null);
}

export function createEmptyDiningDetails(): DiningDetails {
  return {
    shortDescription: "",
    primaryCuisine: "",
    signatureCuisine: "",
    foodStyles: [],
    indoorCapacity: undefined,
    outdoorCapacity: undefined,
    privateDiningCapacity: undefined,
    seatingOptions: [],
    wheelchairAccessibleSeating: false,
    familySeatingAvailable: false,
    priceLevel: undefined,
    averagePriceMin: undefined,
    averagePriceMax: undefined,
    startingPriceLabel: "",
    depositRequired: false,
    depositAmount: undefined,
    depositConditions: "",
    minimumSpend: undefined,
    minimumSpendUnit: undefined,
    openingHours: createEmptyOpeningHours(),
    seasonalHoursNote: "",
    specialHoursNote: "",
    menuUrl: "",
    menuSections: [],
    featuredDishes: [],
    reservationRequired: undefined,
    advanceBookingRequired: undefined,
    minimumAdvanceNotice: "",
    groupBookingAvailable: undefined,
    maxGroupSize: undefined,
    preferredEnquiryMethod: undefined,
    reservationPhone: "",
    reservationWhatsapp: "",
    reservationEmail: "",
    reservationUrl: "",
    reservationPolicy: "",
    dressCode: "",
    dressCodeType: "",
    cancellationPolicy: "",
    cancellationPolicyType: "",
    noShowPolicy: "",
    lateArrivalPolicy: "",
    childrenPolicy: "",
    childrenPolicyType: "",
    petPolicy: "",
    smokingPolicy: "",
    outsideFoodPolicy: "",
    specialOccasionPolicy: "",
    tableTimeLimit: "",
    groupPolicy: "",
    minimumAge: undefined,
    landmark: "",
    gettingHere: "",
    locationNotes: "",
    parkingOption: "",
    suitableFor: [],
    contactPhone: "",
    contactWhatsapp: "",
    contactEmail: "",
    website: "",
    instagram: "",
    facebook: "",
    otherSocialUrl: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    customSlug: "",
  };
}

export function normalizeDiningDetails(input?: DiningDetails | null): DiningDetails | undefined {
  if (!input) return undefined;

  const next: DiningDetails = {};

  const shortDescription = input.shortDescription?.trim();
  if (shortDescription) next.shortDescription = shortDescription;

  const primaryCuisine = input.primaryCuisine?.trim();
  if (primaryCuisine) next.primaryCuisine = primaryCuisine;

  const signatureCuisine = input.signatureCuisine?.trim();
  if (signatureCuisine) next.signatureCuisine = signatureCuisine;

  const foodStyles = normalizeStringArray(input.foodStyles);
  if (foodStyles.length > 0) next.foodStyles = foodStyles;

  if (input.indoorCapacity != null && input.indoorCapacity > 0) {
    next.indoorCapacity = input.indoorCapacity;
  }
  if (input.outdoorCapacity != null && input.outdoorCapacity > 0) {
    next.outdoorCapacity = input.outdoorCapacity;
  }
  if (input.privateDiningCapacity != null && input.privateDiningCapacity > 0) {
    next.privateDiningCapacity = input.privateDiningCapacity;
  }

  const seatingOptions = normalizeStringArray(input.seatingOptions);
  if (seatingOptions.length > 0) next.seatingOptions = seatingOptions;
  if (input.wheelchairAccessibleSeating) next.wheelchairAccessibleSeating = true;
  if (input.familySeatingAvailable) next.familySeatingAvailable = true;

  const priceLevel = input.priceLevel;
  if (priceLevel && priceLevel >= 1 && priceLevel <= 4) next.priceLevel = priceLevel;

  if (input.averagePriceMin != null && input.averagePriceMin > 0) {
    next.averagePriceMin = input.averagePriceMin;
  }
  if (input.averagePriceMax != null && input.averagePriceMax > 0) {
    next.averagePriceMax = input.averagePriceMax;
  }

  const startingPriceLabel = input.startingPriceLabel?.trim();
  if (startingPriceLabel) next.startingPriceLabel = startingPriceLabel;

  if (input.depositRequired) next.depositRequired = true;
  if (input.depositAmount != null && input.depositAmount > 0) {
    next.depositAmount = input.depositAmount;
  }
  const depositConditions = input.depositConditions?.trim();
  if (depositConditions) next.depositConditions = depositConditions;

  if (input.minimumSpend != null && input.minimumSpend > 0) {
    next.minimumSpend = input.minimumSpend;
    if (input.minimumSpendUnit === "per_person" || input.minimumSpendUnit === "per_table") {
      next.minimumSpendUnit = input.minimumSpendUnit;
    }
  }

  const hours = (input.openingHours ?? [])
    .filter((row) => row.day)
    .map((row) => {
      const entry: DayHours = { day: row.day };
      if (row.closed) {
        entry.closed = true;
        return entry;
      }
      const periods = getDayPeriods(row)
        .filter(isMealPeriodActive)
        .map((period) => {
          const nextPeriod: MealPeriodHours = { meal: period.meal };
          const open = period.open?.trim();
          const close = period.close?.trim();
          if (open) nextPeriod.open = open;
          if (close) nextPeriod.close = close;
          return nextPeriod;
        });
      if (periods.length > 0) entry.periods = periods;
      return entry;
    })
    .filter((row) => row.closed || (row.periods?.length ?? 0) > 0);
  if (hours.length > 0) next.openingHours = hours;

  const seasonalHoursNote = input.seasonalHoursNote?.trim();
  if (seasonalHoursNote) next.seasonalHoursNote = seasonalHoursNote;

  const specialHoursNote = input.specialHoursNote?.trim();
  if (specialHoursNote) next.specialHoursNote = specialHoursNote;

  const menuUrl = input.menuUrl?.trim();
  if (menuUrl) next.menuUrl = menuUrl;

  const menuSections = (input.menuSections ?? [])
    .map((section) => {
      const name = section.name?.trim();
      if (!name) return null;
      const items = normalizeMenuItems(section.items);
      return items.length > 0 ? { name, items } : null;
    })
    .filter((section): section is DiningMenuSection => section !== null);
  if (menuSections.length > 0) next.menuSections = menuSections;

  const featuredDishes = normalizeMenuItems(input.featuredDishes);
  if (featuredDishes.length > 0) next.featuredDishes = featuredDishes;

  if (input.reservationRequired != null) next.reservationRequired = input.reservationRequired;
  if (input.advanceBookingRequired != null) {
    next.advanceBookingRequired = input.advanceBookingRequired;
  }
  const minimumAdvanceNotice = input.minimumAdvanceNotice?.trim();
  if (minimumAdvanceNotice) next.minimumAdvanceNotice = minimumAdvanceNotice;
  if (input.groupBookingAvailable != null) {
    next.groupBookingAvailable = input.groupBookingAvailable;
  }
  if (input.maxGroupSize != null && input.maxGroupSize > 0) {
    next.maxGroupSize = input.maxGroupSize;
  }
  if (input.preferredEnquiryMethod) next.preferredEnquiryMethod = input.preferredEnquiryMethod;

  const reservationPhone = input.reservationPhone?.trim();
  if (reservationPhone) next.reservationPhone = reservationPhone;
  const reservationWhatsapp = input.reservationWhatsapp?.trim();
  if (reservationWhatsapp) next.reservationWhatsapp = reservationWhatsapp;
  const reservationEmail = input.reservationEmail?.trim();
  if (reservationEmail) next.reservationEmail = reservationEmail;
  const reservationUrl = input.reservationUrl?.trim();
  if (reservationUrl) next.reservationUrl = reservationUrl;

  const reservationPolicy = input.reservationPolicy?.trim();
  if (reservationPolicy) next.reservationPolicy = reservationPolicy;

  const dressCode = input.dressCode?.trim();
  if (dressCode) next.dressCode = dressCode;
  const dressCodeType = input.dressCodeType?.trim();
  if (dressCodeType) next.dressCodeType = dressCodeType;

  const cancellationPolicy = input.cancellationPolicy?.trim();
  if (cancellationPolicy) next.cancellationPolicy = cancellationPolicy;
  const cancellationPolicyType = input.cancellationPolicyType?.trim();
  if (cancellationPolicyType) next.cancellationPolicyType = cancellationPolicyType;

  const noShowPolicy = input.noShowPolicy?.trim();
  if (noShowPolicy) next.noShowPolicy = noShowPolicy;

  const lateArrivalPolicy = input.lateArrivalPolicy?.trim();
  if (lateArrivalPolicy) next.lateArrivalPolicy = lateArrivalPolicy;

  const childrenPolicy = input.childrenPolicy?.trim();
  if (childrenPolicy) next.childrenPolicy = childrenPolicy;
  const childrenPolicyType = input.childrenPolicyType?.trim();
  if (childrenPolicyType) next.childrenPolicyType = childrenPolicyType;

  const petPolicy = input.petPolicy?.trim();
  if (petPolicy) next.petPolicy = petPolicy;

  const smokingPolicy = input.smokingPolicy?.trim();
  if (smokingPolicy) next.smokingPolicy = smokingPolicy;

  const outsideFoodPolicy = input.outsideFoodPolicy?.trim();
  if (outsideFoodPolicy) next.outsideFoodPolicy = outsideFoodPolicy;

  const specialOccasionPolicy = input.specialOccasionPolicy?.trim();
  if (specialOccasionPolicy) next.specialOccasionPolicy = specialOccasionPolicy;

  const tableTimeLimit = input.tableTimeLimit?.trim();
  if (tableTimeLimit) next.tableTimeLimit = tableTimeLimit;

  const groupPolicy = input.groupPolicy?.trim();
  if (groupPolicy) next.groupPolicy = groupPolicy;

  if (input.minimumAge != null && input.minimumAge > 0) next.minimumAge = input.minimumAge;

  const landmark = input.landmark?.trim();
  if (landmark) next.landmark = landmark;

  const gettingHere = input.gettingHere?.trim();
  if (gettingHere) next.gettingHere = gettingHere;

  const locationNotes = input.locationNotes?.trim();
  if (locationNotes) next.locationNotes = locationNotes;

  const parkingOption = input.parkingOption?.trim();
  if (parkingOption) next.parkingOption = parkingOption;

  const suitableFor = normalizeStringArray(input.suitableFor);
  if (suitableFor.length > 0) next.suitableFor = suitableFor;

  const contactPhone = input.contactPhone?.trim();
  if (contactPhone) next.contactPhone = contactPhone;
  const contactWhatsapp = input.contactWhatsapp?.trim();
  if (contactWhatsapp) next.contactWhatsapp = contactWhatsapp;
  const contactEmail = input.contactEmail?.trim();
  if (contactEmail) next.contactEmail = contactEmail;
  const website = input.website?.trim();
  if (website) next.website = website;
  const instagram = input.instagram?.trim();
  if (instagram) next.instagram = instagram;
  const facebook = input.facebook?.trim();
  if (facebook) next.facebook = facebook;
  const otherSocialUrl = input.otherSocialUrl?.trim();
  if (otherSocialUrl) next.otherSocialUrl = otherSocialUrl;

  const seoTitle = input.seoTitle?.trim();
  if (seoTitle) next.seoTitle = seoTitle;
  const seoDescription = input.seoDescription?.trim();
  if (seoDescription) next.seoDescription = seoDescription;
  const seoKeywords = input.seoKeywords?.trim();
  if (seoKeywords) next.seoKeywords = seoKeywords;
  const customSlug = input.customSlug?.trim();
  if (customSlug) next.customSlug = customSlug;

  return Object.keys(next).length > 0 ? next : undefined;
}

export function hydrateDiningDetails(source?: DiningDetails | null): DiningDetails {
  const empty = createEmptyDiningDetails();
  if (!source) return empty;

  const hoursByDay = new Map((source.openingHours ?? []).map((row) => [row.day, row]));
  const openingHours = WEEKDAYS.map((day) => {
    const existing = hoursByDay.get(day.key);
    return {
      day: day.key,
      closed: existing?.closed ?? false,
      periods: existing ? migrateLegacyDayHours(existing) : createEmptyMealPeriods(),
    };
  });

  return {
    ...empty,
    ...source,
    openingHours,
    shortDescription: source.shortDescription ?? "",
    primaryCuisine: source.primaryCuisine ?? "",
    signatureCuisine: source.signatureCuisine ?? "",
    foodStyles: source.foodStyles ?? [],
    seatingOptions: source.seatingOptions ?? [],
    wheelchairAccessibleSeating: source.wheelchairAccessibleSeating ?? false,
    familySeatingAvailable: source.familySeatingAvailable ?? false,
    startingPriceLabel: source.startingPriceLabel ?? "",
    depositRequired: source.depositRequired ?? false,
    depositConditions: source.depositConditions ?? "",
    minimumSpendUnit: source.minimumSpendUnit ?? "per_person",
    seasonalHoursNote: source.seasonalHoursNote ?? "",
    specialHoursNote: source.specialHoursNote ?? "",
    menuUrl: source.menuUrl ?? "",
    menuSections: source.menuSections ?? [],
    featuredDishes: source.featuredDishes ?? [],
    minimumAdvanceNotice: source.minimumAdvanceNotice ?? "",
    preferredEnquiryMethod: source.preferredEnquiryMethod ?? "platform",
    reservationPhone: source.reservationPhone ?? "",
    reservationWhatsapp: source.reservationWhatsapp ?? "",
    reservationEmail: source.reservationEmail ?? "",
    reservationUrl: source.reservationUrl ?? "",
    reservationPolicy: source.reservationPolicy ?? "",
    dressCode: source.dressCode ?? "",
    dressCodeType: source.dressCodeType ?? "",
    cancellationPolicy: source.cancellationPolicy ?? "",
    cancellationPolicyType: source.cancellationPolicyType ?? "",
    noShowPolicy: source.noShowPolicy ?? "",
    lateArrivalPolicy: source.lateArrivalPolicy ?? "",
    childrenPolicy: source.childrenPolicy ?? "",
    childrenPolicyType: source.childrenPolicyType ?? "",
    petPolicy: source.petPolicy ?? "",
    smokingPolicy: source.smokingPolicy ?? "",
    outsideFoodPolicy: source.outsideFoodPolicy ?? "",
    specialOccasionPolicy: source.specialOccasionPolicy ?? "",
    tableTimeLimit: source.tableTimeLimit ?? "",
    groupPolicy: source.groupPolicy ?? "",
    landmark: source.landmark ?? "",
    gettingHere: source.gettingHere ?? "",
    locationNotes: source.locationNotes ?? "",
    parkingOption: source.parkingOption ?? "",
    suitableFor: source.suitableFor ?? [],
    contactPhone: source.contactPhone ?? "",
    contactWhatsapp: source.contactWhatsapp ?? "",
    contactEmail: source.contactEmail ?? "",
    website: source.website ?? "",
    instagram: source.instagram ?? "",
    facebook: source.facebook ?? "",
    otherSocialUrl: source.otherSocialUrl ?? "",
    seoTitle: source.seoTitle ?? "",
    seoDescription: source.seoDescription ?? "",
    seoKeywords: source.seoKeywords ?? "",
    customSlug: source.customSlug ?? "",
  };
}

/** Mirror dining capacity fields into venueDetails for guest-page stats. */
export function deriveVenueDetailsFromDining(
  dining: DiningDetails,
  existing: VenueDetails = {}
): VenueDetails {
  const indoor = dining.indoorCapacity ?? 0;
  const outdoor = dining.outdoorCapacity ?? 0;
  const privateCap = dining.privateDiningCapacity ?? 0;
  const seated = indoor + outdoor > 0 ? indoor + outdoor : Math.max(indoor, outdoor);
  const maxGuests = Math.max(seated, privateCap, existing.maxGuests ?? 0);

  return {
    ...existing,
    seatedCapacity: seated > 0 ? seated : existing.seatedCapacity,
    maxGuests: maxGuests > 0 ? maxGuests : existing.maxGuests,
    minimumBookingDuration: existing.minimumBookingDuration?.trim()
      ? existing.minimumBookingDuration
      : undefined,
    parkingCapacity: existing.parkingCapacity?.trim() ? existing.parkingCapacity : undefined,
  };
}

export function hasDiningIndicativePricing(details?: DiningDetails | null): boolean {
  if (!details) return false;
  if (details.priceLevel != null && details.priceLevel > 0) return true;
  if (details.averagePriceMin != null && details.averagePriceMin > 0) return true;
  if (details.averagePriceMax != null && details.averagePriceMax > 0) return true;
  return false;
}

export function hasDiningMenu(details?: DiningDetails | null): boolean {
  if (!details) return false;
  if (details.menuUrl?.trim()) return true;
  if ((details.featuredDishes ?? []).some((item) => item.name.trim())) return true;
  return (details.menuSections ?? []).some(
    (section) => section.name.trim() && section.items.some((item) => item.name.trim())
  );
}

export function resolveEnquiryCta(details?: DiningDetails | null): string {
  if (!details) return "Request reservation";
  if (details.reservationRequired) return "Request reservation";
  if (details.preferredEnquiryMethod === "url") return "Enquire now";
  return "Request reservation";
}

export function formatAveragePriceRange(
  details?: DiningDetails | null,
  money?: (amount: number) => string
): string {
  if (!details) return "";
  const min = details.averagePriceMin;
  const max = details.averagePriceMax;
  if (min != null && max != null && min > 0 && max > 0) {
    if (money) return `${money(min)} – ${money(max)} per person`;
    return `${min} – ${max} per person`;
  }
  if (min != null && min > 0) {
    if (money) return `From ${money(min)} per person`;
    return `From ${min} per person`;
  }
  if (max != null && max > 0) {
    if (money) return `Up to ${money(max)} per person`;
    return `Up to ${max} per person`;
  }
  return "";
}

const WEEKDAY_KEYS_BY_INDEX: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function weekdayKeyFromIsoDate(isoDate: string): WeekdayKey | undefined {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return WEEKDAY_KEYS_BY_INDEX[date.getDay()];
}

export function resolveHoursForDate(
  details?: DiningDetails | null,
  isoDate?: string
): DayHours | undefined {
  if (!details?.openingHours?.length) return undefined;
  const key = isoDate ? weekdayKeyFromIsoDate(isoDate) : WEEKDAY_KEYS_BY_INDEX[new Date().getDay()];
  if (!key) return undefined;
  return details.openingHours.find((row) => row.day === key);
}

export function resolveTodayHours(details?: DiningDetails | null): DayHours | undefined {
  return resolveHoursForDate(details);
}

export interface DiningReservationTimeGroup {
  meal: MealPeriod;
  label: string;
  times: string[];
  /** Open–close window for the selected date(s), e.g. "6:00 PM – 10:30 PM". */
  hoursLabel?: string;
}

/** Map a dining occasion label to a meal period when it matches a service name. */
export function occasionToMealPeriod(occasion: string): MealPeriod | undefined {
  const normalized = occasion.trim().toLowerCase();
  return MEAL_PERIODS.find(
    (period) =>
      normalized === period.key ||
      normalized === period.label.toLowerCase() ||
      normalized.includes(period.label.toLowerCase())
  )?.key;
}

function parseClockTime(value: string): number | null {
  const trimmed = value.trim().toUpperCase().replace(/(\d)\.(\d)/g, "$1:$2");
  const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = match12[2] ? Number(match12[2]) : 0;
    const meridiem = match12[3];
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return Number(match24[1]) * 60 + Number(match24[2]);
  }
  return null;
}

function formatClockTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const meridiem = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(mins).padStart(2, "0")} ${meridiem}`;
}

function buildSlotsForPeriod(open: string, close: string, intervalMinutes: number): string[] {
  const start = parseClockTime(open);
  const end = parseClockTime(close);
  if (start == null || end == null || end <= start) return [];

  const slots: string[] = [];
  for (let minute = start; minute < end; minute += intervalMinutes) {
    slots.push(formatClockTime(minute));
  }
  const closeLabel = formatClockTime(end);
  if (!slots.includes(closeLabel)) {
    slots.push(closeLabel);
  }
  return slots;
}

function collectReservationTimesByMeal(
  days: DayHours[],
  intervalMinutes: number
): Map<MealPeriod, Set<string>> {
  const timesByMeal = new Map<MealPeriod, Set<string>>();

  for (const day of days) {
    for (const period of getDayPeriods(day)) {
      const open = period.open?.trim();
      const close = period.close?.trim();
      if (!open || !close) continue;
      const slots = buildSlotsForPeriod(open, close, intervalMinutes);
      if (slots.length === 0) continue;
      const set = timesByMeal.get(period.meal) ?? new Set<string>();
      for (const slot of slots) set.add(slot);
      timesByMeal.set(period.meal, set);
    }
  }

  return timesByMeal;
}

function mealHoursLabelFromDays(days: DayHours[], meal: MealPeriod): string | undefined {
  const labels = new Set<string>();

  for (const day of days) {
    for (const period of getDayPeriods(day)) {
      if (period.meal !== meal) continue;
      const open = period.open?.trim();
      const close = period.close?.trim();
      if (!open || !close) continue;
      labels.add(`${open} – ${close}`);
    }
  }

  if (labels.size === 1) return labels.values().next().value;
  if (labels.size > 1) return "Varies by day";
  return undefined;
}

function mealGroupsFromMap(
  timesByMeal: Map<MealPeriod, Set<string>>,
  days: DayHours[]
): DiningReservationTimeGroup[] {
  return MEAL_PERIODS.flatMap(({ key, label }) => {
    const times = timesByMeal.get(key);
    if (!times || times.size === 0) return [];
    return [
      {
        meal: key,
        label,
        hoursLabel: mealHoursLabelFromDays(days, key),
        times: Array.from(times).sort((a, b) => (parseClockTime(a) ?? 0) - (parseClockTime(b) ?? 0)),
      },
    ];
  });
}

/** Reservation time pills grouped by meal period, derived from opening hours. */
export function buildDiningReservationTimeGroups(
  details?: DiningDetails | null,
  options?: { isoDate?: string; flexibleDate?: boolean; intervalMinutes?: number }
): DiningReservationTimeGroup[] {
  const hydrated = details ? hydrateDiningDetails(details) : null;
  if (!hydrated?.openingHours?.length) return [];

  const interval = options?.intervalMinutes ?? 30;
  const useFlexible = options?.flexibleDate || !options?.isoDate;
  const openDays = hydrated.openingHours.filter((row) => !row.closed);
  const daysToUse = useFlexible
    ? openDays
    : (() => {
        const row = resolveHoursForDate(hydrated, options?.isoDate);
        return row && !row.closed ? [row] : [];
      })();

  let groups = mealGroupsFromMap(collectReservationTimesByMeal(daysToUse, interval), daysToUse);

  if (groups.length === 0 && !useFlexible && openDays.length > 0) {
    groups = mealGroupsFromMap(collectReservationTimesByMeal(openDays, interval), openDays);
  }

  return groups;
}
