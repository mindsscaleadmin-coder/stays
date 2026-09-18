/** Host-configured party limits stored on rooms / listing customFilters. */

export type GuestPartyLimits = {
  /** Max adults guests may select. */
  adults: number;
  /** Max children guests may select. */
  children: number;
  /** Max infants guests may select (not counted in paying total). */
  infants: number;
  /** Paying guest ceiling (adults + children). */
  total: number;
};

const ADULTS_LABEL = /^adults?$/i;
const CHILDREN_LABEL = /^children$/i;
const INFANTS_LABEL = /^infants?$/i;
const GUESTS_LABEL = /^guests?$/i;

export function payingGuestsCapacity(limits: GuestPartyLimits): number {
  return Math.max(1, limits.total);
}

export function readGuestPartyFromFilters(
  filters: { label: string; value: string }[] | undefined,
  fallbackCapacity = 2
): GuestPartyLimits {
  const list = filters ?? [];
  const num = (re: RegExp, fallback: number) => {
    const row = list.find((f) => re.test(f.label.trim()));
    const n = Number(row?.value?.match(/\d+/)?.[0]);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  const adultsRaw = num(ADULTS_LABEL, -1);
  const childrenRaw = num(CHILDREN_LABEL, -1);
  const infantsRaw = num(INFANTS_LABEL, -1);
  const guestsRaw = num(GUESTS_LABEL, -1);

  const hasBreakdown = adultsRaw >= 0 || childrenRaw >= 0 || infantsRaw >= 0;
  const hasTotal = guestsRaw >= 0;

  if (!hasBreakdown && !hasTotal) {
    const total = Math.max(1, fallbackCapacity);
    return { adults: total, children: total, infants: 5, total };
  }

  // Only a total guests value — guests may freely split adults/children within it.
  if (!hasBreakdown && hasTotal) {
    const total = Math.max(1, guestsRaw);
    return { adults: total, children: total, infants: 5, total };
  }

  const adults = Math.max(0, adultsRaw >= 0 ? adultsRaw : 0);
  const children = Math.max(0, childrenRaw >= 0 ? childrenRaw : 0);
  const infants = Math.max(0, infantsRaw >= 0 ? infantsRaw : 0);
  const summed = adults + children;
  const total = Math.max(1, hasTotal ? guestsRaw : summed || fallbackCapacity);

  return {
    adults: Math.min(adults || total, total),
    children: Math.min(children, total),
    infants,
    total,
  };
}

export function writeGuestPartyFilters(
  filters: { label: string; value: string }[],
  party: GuestPartyLimits,
  guestsTabLabel = "Guests"
): { label: string; value: string }[] {
  const without = filters.filter(
    (f) =>
      !ADULTS_LABEL.test(f.label.trim()) &&
      !CHILDREN_LABEL.test(f.label.trim()) &&
      !INFANTS_LABEL.test(f.label.trim()) &&
      !GUESTS_LABEL.test(f.label.trim()) &&
      f.label !== guestsTabLabel
  );
  const total = payingGuestsCapacity(party);
  return [
    ...without,
    { label: "Adults", value: String(Math.max(0, Math.min(party.adults, total))) },
    { label: "Children", value: String(Math.max(0, Math.min(party.children, total))) },
    { label: "Infants", value: String(Math.max(0, party.infants)) },
    { label: guestsTabLabel, value: String(total) },
  ];
}

export function guestPartyFromRoom(room: {
  capacity: number;
  maxAdults?: number;
  maxChildren?: number;
  maxInfants?: number;
}): GuestPartyLimits {
  const total = Math.max(1, room.capacity || 1);
  if (room.maxAdults == null && room.maxChildren == null) {
    return {
      adults: total,
      children: total,
      infants: Math.max(0, room.maxInfants ?? 5),
      total,
    };
  }
  return {
    adults: Math.min(Math.max(0, room.maxAdults ?? total), total),
    children: Math.min(Math.max(0, room.maxChildren ?? 0), total),
    infants: Math.max(0, room.maxInfants ?? 0),
    total,
  };
}

export function mergeGuestPartyLimits(parts: GuestPartyLimits[]): GuestPartyLimits {
  if (parts.length === 0) {
    return { adults: 2, children: 2, infants: 5, total: 2 };
  }
  return parts.reduce(
    (acc, part) => ({
      adults: acc.adults + part.adults,
      children: acc.children + part.children,
      infants: acc.infants + part.infants,
      total: acc.total + part.total,
    }),
    { adults: 0, children: 0, infants: 0, total: 0 }
  );
}

const BEDS_LABEL = /^beds?$/i;
const BEDROOMS_LABEL = /bedroom/i;
const BATHS_LABEL = /bath/i;

export type PropertyCapacity = {
  beds: number;
  baths: number;
  maxGuests: number;
  maxAdults: number;
  maxChildren: number;
  maxInfants: number;
};

export function defaultPropertyCapacity(): PropertyCapacity {
  return {
    beds: 1,
    baths: 1,
    maxGuests: 2,
    maxAdults: 2,
    maxChildren: 0,
    maxInfants: 0,
  };
}

function parseFilterCount(
  filters: { label: string; value: string }[],
  re: RegExp,
  fallback: number
): number {
  const row = filters.find((f) => re.test(f.label.trim()) || re.test(f.label));
  const n = Number(row?.value?.match(/\d+/)?.[0]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function readPropertyCapacityFromFilters(
  filters: { label: string; value: string }[] | undefined,
  fallback: Partial<PropertyCapacity> = {}
): PropertyCapacity {
  const list = filters ?? [];
  const base = { ...defaultPropertyCapacity(), ...fallback };
  const beds = list.some((f) => BEDROOMS_LABEL.test(f.label))
    ? parseFilterCount(list, BEDROOMS_LABEL, base.beds)
    : parseFilterCount(list, BEDS_LABEL, base.beds);
  const baths = parseFilterCount(list, BATHS_LABEL, base.baths);
  const party = readGuestPartyFromFilters(list, base.maxGuests);
  return {
    beds: Math.max(1, beds),
    baths: Math.max(1, baths),
    maxGuests: party.total,
    maxAdults: party.adults,
    maxChildren: party.children,
    maxInfants: party.infants,
  };
}

export function writePropertyCapacityFilters(
  filters: { label: string; value: string }[],
  capacity: PropertyCapacity
): { label: string; value: string }[] {
  const withoutCapacity = filters.filter(
    (f) =>
      !BEDS_LABEL.test(f.label.trim()) &&
      !BEDROOMS_LABEL.test(f.label) &&
      !BATHS_LABEL.test(f.label)
  );
  const withParty = writeGuestPartyFilters(withoutCapacity, {
    adults: capacity.maxAdults,
    children: capacity.maxChildren,
    infants: capacity.maxInfants,
    total: capacity.maxGuests,
  });
  return [
    ...withParty,
    { label: "Beds", value: String(Math.max(1, capacity.beds)) },
    { label: "Baths", value: String(Math.max(1, capacity.baths)) },
  ];
}
