import {
  normalizeExtraChargeBilling,
  type ExtraCharge,
  type ListingPricingSettings,
} from "./host-pricing-types";

export type StayQuoteInput = {
  settings: ListingPricingSettings;
  checkIn: string;
  checkOut: string;
  guests: number;
  /** @deprecated Prefer roomIds for multi-room stays */
  roomId?: string | null;
  /** Selected room type ids — rates are summed across rooms */
  roomIds?: string[] | null;
  selectedExtras?: ExtraCharge[];
  experiencesTotal?: number;
};

export type StayQuoteLine = {
  label: string;
  amount: number;
};

export type StayQuote = {
  nights: number;
  currency: string;
  /** Average nightly rate after seasonal/weekend (before stay discounts) */
  nightlyAverage: number;
  accommodationSubtotal: number;
  discountPct: number;
  discountLabel: string | null;
  discountAmount: number;
  extraGuestTotal: number;
  extrasTotal: number;
  experiencesTotal: number;
  taxPct: number;
  taxLabel: string;
  taxAmount: number;
  total: number;
  lines: StayQuoteLine[];
};

function parseYmd(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Nights between check-in (inclusive) and check-out (exclusive). */
export function countNights(checkIn: string, checkOut: string): number {
  const start = parseYmd(checkIn);
  const end = parseYmd(checkOut);
  if (!start || !end || end <= start) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** Stay nights as Date objects (check-in night through night before check-out). */
export function stayNightDates(checkIn: string, checkOut: string): Date[] {
  const start = parseYmd(checkIn);
  const end = parseYmd(checkOut);
  if (!start || !end || end <= start) return [];
  const nights: Date[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    nights.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return nights;
}

function isWeekendNight(d: Date): boolean {
  const day = d.getDay(); // 0 Sun … 5 Fri, 6 Sat
  return day === 5 || day === 6;
}

function seasonalRateForDate(
  settings: ListingPricingSettings,
  d: Date
): number | null {
  if (!settings.seasonalEnabled || settings.seasonalPricing.length === 0) return null;
  const ymd = formatYmd(d);
  for (const season of settings.seasonalPricing) {
    if (ymd >= season.startDate && ymd <= season.endDate) {
      return Math.max(0, season.price);
    }
  }
  return null;
}

function resolveBaseNightly(
  settings: ListingPricingSettings,
  roomId?: string | null
): { base: number; weekend: number | null; monthly: number | null } {
  const room = roomId
    ? settings.roomPrices.find((r) => r.roomId === roomId)
    : undefined;
  const base =
    room?.basePrice != null && room.basePrice > 0
      ? room.basePrice
      : settings.basePrice;
  const weekend =
    room?.weekendPrice != null && room.weekendPrice > 0
      ? room.weekendPrice
      : settings.weekendPrice;
  const monthly =
    room?.monthlyPrice != null && room.monthlyPrice > 0
      ? room.monthlyPrice
      : settings.monthlyPrice;
  return { base: Math.max(0, base), weekend, monthly };
}

/** Long-stay threshold for monthly nightly rate (aligned with monthly discount). */
export const MONTHLY_STAY_NIGHTS = 28;

function nightRate(
  settings: ListingPricingSettings,
  d: Date,
  roomId: string | null | undefined,
  nights: number
): { rate: number; usedSeasonal: boolean; usedMonthly: boolean } {
  const seasonal = seasonalRateForDate(settings, d);
  if (seasonal != null) {
    return { rate: seasonal, usedSeasonal: true, usedMonthly: false };
  }

  const { base, weekend, monthly } = resolveBaseNightly(settings, roomId);
  if (nights >= MONTHLY_STAY_NIGHTS && monthly != null && monthly > 0) {
    return { rate: monthly, usedSeasonal: false, usedMonthly: true };
  }
  if (weekend != null && isWeekendNight(d)) {
    return { rate: weekend, usedSeasonal: false, usedMonthly: false };
  }
  return { rate: base, usedSeasonal: false, usedMonthly: false };
}

function pickStayDiscount(
  settings: ListingPricingSettings,
  nights: number,
  checkIn: string,
  anySeasonal: boolean,
  usedMonthlyRate: boolean
): { pct: number; label: string | null } {
  // Seasonal windows and dedicated monthly rates already replace base pricing —
  // don't stack length-of-stay % discounts on top.
  if (!settings.discountsEnabled || anySeasonal || usedMonthlyRate) {
    return { pct: 0, label: null };
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const checkInDate = parseYmd(checkIn);
  const daysAhead = checkInDate
    ? Math.round((checkInDate.getTime() - today.getTime()) / 86_400_000)
    : 0;

  let pct = 0;
  let label: string | null = null;

  if (nights >= MONTHLY_STAY_NIGHTS && settings.monthlyDiscountPct > 0) {
    pct = settings.monthlyDiscountPct;
    label = `Monthly stay (−${pct}%)`;
  } else if (nights >= 7 && settings.weeklyDiscountPct > 0) {
    pct = settings.weeklyDiscountPct;
    label = `Weekly stay (−${pct}%)`;
  }

  if (
    settings.earlyBirdDiscountPct > 0 &&
    daysAhead >= settings.earlyBirdDaysAhead &&
    settings.earlyBirdDiscountPct > pct
  ) {
    pct = settings.earlyBirdDiscountPct;
    label = `Early bird (−${pct}%)`;
  }

  if (
    settings.lastMinuteDiscountPct > 0 &&
    daysAhead >= 0 &&
    daysAhead <= settings.lastMinuteDaysAhead &&
    settings.lastMinuteDiscountPct > pct
  ) {
    pct = settings.lastMinuteDiscountPct;
    label = `Last-minute (−${pct}%)`;
  }

  // Active flash deal wins when it offers a better (or equal) cut while the promo is live
  if (
    settings.flashDealEnabled &&
    settings.flashDealEndsAt &&
    settings.flashDealDiscountPct > 0
  ) {
    const ends = new Date(settings.flashDealEndsAt).getTime();
    if (!Number.isNaN(ends) && ends > Date.now() && settings.flashDealDiscountPct >= pct) {
      pct = settings.flashDealDiscountPct;
      label = `Flash deal (−${pct}%)`;
    }
  }

  return { pct: Math.min(100, Math.max(0, pct)), label };
}

function extrasAmount(
  extras: ExtraCharge[],
  nights: number,
  guests: number
): number {
  const payingGuests = Math.max(1, guests);
  const nightCount = Math.max(1, nights);
  return extras.reduce((sum, extra) => {
    const billing = normalizeExtraChargeBilling(extra);
    const amount = Math.max(0, extra.amount);
    if (billing === "per_stay") return sum + amount;
    if (billing === "per_person") return sum + amount * payingGuests;
    if (billing === "per_person_per_night") {
      return sum + amount * payingGuests * nightCount;
    }
    // per_night and per_day both scale with nights for stay quotes
    return sum + amount * nightCount;
  }, 0);
}

/**
 * Guest-facing stay quote from host pricing settings.
 * Uses property base price when no room is selected / listing has no room types.
 * When multiple roomIds are provided, nightly rates are summed per night.
 */
export function calculateStayQuote(input: StayQuoteInput): StayQuote | null {
  const {
    settings,
    checkIn,
    checkOut,
    guests,
    roomId,
    roomIds,
    selectedExtras = [],
    experiencesTotal = 0,
  } = input;

  const nights = countNights(checkIn, checkOut);
  if (nights <= 0) return null;

  // Explicit roomIds array (even empty) = multi-room mode; empty means no room rate yet.
  // Undefined roomIds + no roomId = property base price.
  const resolvedRoomIds: (string | null)[] =
    roomIds != null
      ? roomIds
      : roomId
        ? [roomId]
        : [null];

  const nightDates = stayNightDates(checkIn, checkOut);
  let accommodationSubtotal = 0;
  let anySeasonal = false;
  let usedMonthlyRate = false;
  for (const d of nightDates) {
    for (const id of resolvedRoomIds) {
      const { rate, usedSeasonal, usedMonthly } = nightRate(settings, d, id, nights);
      accommodationSubtotal += rate;
      if (usedSeasonal) anySeasonal = true;
      if (usedMonthly) usedMonthlyRate = true;
    }
  }

  const nightlyAverage =
    nights > 0 && accommodationSubtotal > 0 ? accommodationSubtotal / nights : 0;
  const { pct: discountPct, label: discountLabel } = pickStayDiscount(
    settings,
    nights,
    checkIn,
    anySeasonal,
    usedMonthlyRate
  );
  const discountAmount = Math.round((accommodationSubtotal * discountPct) / 100);
  const afterDiscount = accommodationSubtotal - discountAmount;

  const extraGuests = Math.max(0, guests - settings.guestsIncludedInBase);
  const extraGuestTotal =
    extraGuests > 0 && settings.extraGuestCharge > 0 && accommodationSubtotal > 0
      ? extraGuests * settings.extraGuestCharge * nights
      : 0;

  const extrasTotal = settings.extraChargesEnabled
    ? extrasAmount(selectedExtras, nights, guests)
    : 0;

  const experiences = Math.max(0, experiencesTotal);
  const pretax = afterDiscount + extraGuestTotal + extrasTotal + experiences;
  const taxPct = Math.max(0, settings.taxPct);
  const taxAmount = Math.round((pretax * taxPct) / 100);
  const total = pretax + taxAmount;

  const roomCount = resolvedRoomIds.filter(Boolean).length;
  const lines: StayQuoteLine[] = [];
  if (accommodationSubtotal > 0) {
    lines.push({
      label:
        roomCount > 1
          ? `${nights} night${nights === 1 ? "" : "s"} × ${roomCount} rooms (avg ${Math.round(nightlyAverage)}/night)`
          : `${nights} night${nights === 1 ? "" : "s"} × avg ${Math.round(nightlyAverage)}`,
      amount: accommodationSubtotal,
    });
  }
  if (discountAmount > 0 && discountLabel) {
    lines.push({ label: discountLabel, amount: -discountAmount });
  }
  if (extraGuestTotal > 0) {
    lines.push({
      label: `Extra guests (${extraGuests} × ${nights} night${nights === 1 ? "" : "s"})`,
      amount: extraGuestTotal,
    });
  }
  if (extrasTotal > 0) {
    lines.push({ label: "Extras", amount: extrasTotal });
  }
  if (experiences > 0) {
    lines.push({ label: "Experiences", amount: experiences });
  }
  if (taxAmount > 0) {
    lines.push({
      label: `${settings.taxLabel} (${taxPct}%)`,
      amount: taxAmount,
    });
  }

  return {
    nights,
    currency: settings.currency,
    nightlyAverage,
    accommodationSubtotal,
    discountPct,
    discountLabel,
    discountAmount,
    extraGuestTotal,
    extrasTotal,
    experiencesTotal: experiences,
    taxPct,
    taxLabel: settings.taxLabel,
    taxAmount,
    total,
    lines,
  };
}

/** Display nightly rate for the booking card (no dates required). */
export function resolveDisplayNightlyRate(
  settings: ListingPricingSettings,
  roomId?: string | null
): number {
  const { base } = resolveBaseNightly(settings, roomId);
  return base;
}

/** Combined nightly rate when multiple rooms are selected. */
export function resolveCombinedNightlyRate(
  settings: ListingPricingSettings,
  roomIds: string[]
): number {
  if (roomIds.length === 0) return resolveDisplayNightlyRate(settings, null);
  return roomIds.reduce(
    (sum, id) => sum + resolveDisplayNightlyRate(settings, id),
    0
  );
}

export function defaultCheckInOut(nights = 2): { checkIn: string; checkOut: string } {
  const checkIn = new Date();
  checkIn.setHours(12, 0, 0, 0);
  checkIn.setDate(checkIn.getDate() + 1);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + nights);
  return { checkIn: formatYmd(checkIn), checkOut: formatYmd(checkOut) };
}
