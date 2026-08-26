export function isStayIsoDate(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function listingHref(
  listingId: string,
  dates?: {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    adults?: number;
    children?: number;
    infants?: number;
  }
): string {
  const params = new URLSearchParams();
  if (isStayIsoDate(dates?.checkIn)) params.set("checkIn", dates.checkIn);
  if (isStayIsoDate(dates?.checkOut)) params.set("checkOut", dates.checkOut);
  if (dates?.guests && dates.guests > 0) params.set("guests", String(dates.guests));
  if (dates?.adults && dates.adults > 0) params.set("adults", String(dates.adults));
  if (dates?.children && dates.children > 0) params.set("children", String(dates.children));
  if (dates?.infants && dates.infants > 0) params.set("infants", String(dates.infants));
  const qs = params.toString();
  return `/listing/${listingId}${qs ? `?${qs}` : ""}`;
}

export function addOneStayDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseCountParam(value: string | null | undefined, max = 16): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(n) || n < 0) return 0;
  return Math.min(max, n);
}

export function readStayPartyFromSearch(): {
  adults: number;
  children: number;
  infants: number;
} | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const adults = parseCountParam(params.get("adults"));
  const children = parseCountParam(params.get("children"));
  const infants = parseCountParam(params.get("infants"), 5);
  const guests = parseCountParam(params.get("guests"));
  if (adults + children + infants + guests === 0) return null;
  if (adults > 0 || children > 0 || infants > 0) {
    return {
      adults: Math.max(adults, children > 0 || infants > 0 ? 1 : 0),
      children,
      infants,
    };
  }
  return { adults: guests, children: 0, infants: 0 };
}

export function readStayGuestsFromSearch(): number | null {
  const party = readStayPartyFromSearch();
  if (!party) return null;
  const paying = party.adults + party.children;
  return paying > 0 ? paying : null;
}

export function readStayDatesFromSearch(): { checkIn: string; checkOut: string } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  if (isStayIsoDate(checkIn) && isStayIsoDate(checkOut) && checkOut > checkIn) {
    return { checkIn, checkOut };
  }
  return null;
}
