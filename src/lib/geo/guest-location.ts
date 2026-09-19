import type { Stay } from "@/lib/mock/data";
import { LAUNCH_COUNTRY_CODE } from "@/lib/tax/launch-market";

export interface GeoArea {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Lowercase tokens matched against stay.location */
  aliases: string[];
}

export interface GuestLocation {
  lat: number;
  lng: number;
  area: GeoArea;
  /** How the location was resolved */
  source: "geolocation" | "country" | "default";
}

const STORAGE_KEY = "farm-stays-guest-location";

/** City / region centroids used to map GPS → listing areas (no API required). */
export const GEO_AREAS: GeoArea[] = [
  {
    id: "kochi",
    name: "Kochi",
    lat: 9.9312,
    lng: 76.2673,
    aliases: ["kochi", "cochin", "ernakulam", "kerala"],
  },
  {
    id: "munnar",
    name: "Munnar",
    lat: 10.0889,
    lng: 77.0595,
    aliases: ["munnar", "idukki"],
  },
  {
    id: "goa",
    name: "Goa",
    lat: 15.2993,
    lng: 74.124,
    aliases: ["goa", "north goa", "south goa", "panaji"],
  },
  {
    id: "jaipur",
    name: "Jaipur",
    lat: 26.9124,
    lng: 75.7873,
    aliases: ["jaipur", "rajasthan"],
  },
  {
    id: "bengaluru",
    name: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    aliases: ["bengaluru", "bangalore", "karnataka", "coorg", "chikmagalur"],
  },
  {
    id: "delhi",
    name: "Delhi",
    lat: 28.6139,
    lng: 77.209,
    aliases: ["delhi", "new delhi", "ncr"],
  },
  {
    id: "shimla",
    name: "Shimla",
    lat: 31.1048,
    lng: 77.1734,
    aliases: ["shimla", "manali", "himachal", "dharamshala"],
  },
  {
    id: "dubai",
    name: "Dubai",
    lat: 25.2048,
    lng: 55.2708,
    aliases: ["dubai", "دبي"],
  },
  {
    id: "hatta",
    name: "Hatta",
    lat: 24.7969,
    lng: 56.1294,
    aliases: ["hatta", "حتا"],
  },
  {
    id: "abu-dhabi",
    name: "Abu Dhabi",
    lat: 24.4539,
    lng: 54.3773,
    aliases: ["abu dhabi", "أبوظبي", "ابوظبي"],
  },
  {
    id: "al-ain",
    name: "Al Ain",
    lat: 24.2075,
    lng: 55.7447,
    aliases: ["al ain", "العين"],
  },
  {
    id: "al-dhafra",
    name: "Al Dhafra",
    lat: 23.65,
    lng: 53.7,
    aliases: ["al dhafra", "liwa", "الظفرة", "ليوا"],
  },
  {
    id: "sharjah",
    name: "Sharjah",
    lat: 25.3463,
    lng: 55.4209,
    aliases: ["sharjah", "الشارقة"],
  },
  {
    id: "kalba",
    name: "Kalba",
    lat: 25.0519,
    lng: 56.3558,
    aliases: ["kalba", "كلباء"],
  },
  {
    id: "ras-al-khaimah",
    name: "Ras Al Khaimah",
    lat: 25.7895,
    lng: 55.9432,
    aliases: ["ras al khaimah", "رأس الخيمة", "راس الخيمة"],
  },
  {
    id: "fujairah",
    name: "Fujairah",
    lat: 25.1288,
    lng: 56.3264,
    aliases: ["fujairah", "الفجيرة"],
  },
  {
    id: "ajman",
    name: "Ajman",
    lat: 25.4052,
    lng: 55.5136,
    aliases: ["ajman", "عجمان"],
  },
];

const DEFAULT_AREA = GEO_AREAS.find((a) => a.id === "kochi")!;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestArea(lat: number, lng: number): GeoArea {
  let best = GEO_AREAS[0];
  let bestDist = Infinity;
  for (const area of GEO_AREAS) {
    const d = haversineKm(lat, lng, area.lat, area.lng);
    if (d < bestDist) {
      bestDist = d;
      best = area;
    }
  }
  return best;
}

/** Areas within radiusKm of the guest, nearest first. */
export function nearbyAreas(lat: number, lng: number, radiusKm = 120): GeoArea[] {
  return GEO_AREAS.map((area) => ({
    area,
    dist: haversineKm(lat, lng, area.lat, area.lng),
  }))
    .filter((x) => x.dist <= radiusKm)
    .sort((a, b) => a.dist - b.dist)
    .map((x) => x.area);
}

function stayMatchesArea(stay: Stay, area: GeoArea): boolean {
  const haystack = `${stay.location}`.toLowerCase();
  return area.aliases.some((alias) => haystack.includes(alias.toLowerCase()));
}

/** Score: higher = closer to guest. */
export function proximityScore(stay: Stay, guest: GuestLocation): number {
  const areas = nearbyAreas(guest.lat, guest.lng, 200);
  for (let i = 0; i < areas.length; i++) {
    if (stayMatchesArea(stay, areas[i])) {
      const dist = haversineKm(guest.lat, guest.lng, areas[i].lat, areas[i].lng);
      return 1000 - dist + stay.rating * 10;
    }
  }
  const haystack = stay.location.toLowerCase();
  if (
    haystack.includes("india") ||
    haystack.includes("kerala") ||
    haystack.includes("goa") ||
    haystack.includes("rajasthan")
  ) {
    return 50 + stay.rating;
  }
  if (
    haystack.includes("uae") ||
    haystack.includes("emirates") ||
    haystack.includes("united arab")
  ) {
    return 40 + stay.rating;
  }
  return stay.rating;
}

export function rankListingsByProximity(listings: Stay[], guest: GuestLocation | null): Stay[] {
  if (!guest) return [...listings];
  return [...listings].sort((a, b) => proximityScore(b, guest) - proximityScore(a, guest));
}

export function filterListingsNearGuest(
  listings: Stay[],
  guest: GuestLocation | null,
  options?: { maxKm?: number; fallbackAll?: boolean }
): Stay[] {
  if (!guest) return [...listings];
  const maxKm = options?.maxKm ?? 100;
  const areas = nearbyAreas(guest.lat, guest.lng, maxKm);
  const nearby = listings.filter((stay) => areas.some((area) => stayMatchesArea(stay, area)));
  if (nearby.length > 0) return rankListingsByProximity(nearby, guest);
  if (options?.fallbackAll === false) return [];
  return rankListingsByProximity(listings, guest);
}

export function loadStoredGuestLocation(): GuestLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuestLocation;
  } catch {
    return null;
  }
}

export function saveGuestLocation(location: GuestLocation): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location));
}

export function guestLocationFromCoords(
  lat: number,
  lng: number,
  source: GuestLocation["source"] = "geolocation"
): GuestLocation {
  return { lat, lng, area: nearestArea(lat, lng), source };
}

/** Map a known GEO_AREA id → ISO country code. */
const AREA_COUNTRY: Record<string, string> = {
  kochi: "IN",
  munnar: "IN",
  goa: "IN",
  jaipur: "IN",
  bengaluru: "IN",
  delhi: "IN",
  shimla: "IN",
  dubai: "AE",
  hatta: "AE",
  "abu-dhabi": "AE",
  "al-ain": "AE",
  "al-dhafra": "AE",
  sharjah: "AE",
  kalba: "AE",
  "ras-al-khaimah": "AE",
  fujairah: "AE",
  ajman: "AE",
};

/**
 * Infer marketplace country from GPS coordinates.
 * Uses GCC / India bounding boxes, then nearest known area as a tie-break.
 */
export function countryCodeFromCoords(lat: number, lng: number): string {
  const boxes: { code: string; latMin: number; latMax: number; lngMin: number; lngMax: number }[] =
    [
      { code: "QA", latMin: 24.4, latMax: 26.3, lngMin: 50.7, lngMax: 51.7 },
      { code: "AE", latMin: 22.5, latMax: 26.6, lngMin: 51.0, lngMax: 56.6 },
      { code: "OM", latMin: 16.5, latMax: 26.6, lngMin: 52.0, lngMax: 60.0 },
      { code: "SA", latMin: 16.0, latMax: 32.5, lngMin: 34.5, lngMax: 55.7 },
      { code: "IN", latMin: 6.5, latMax: 35.5, lngMin: 68.0, lngMax: 97.5 },
    ];

  const hits = boxes.filter(
    (b) => lat >= b.latMin && lat <= b.latMax && lng >= b.lngMin && lng <= b.lngMax
  );
  if (hits.length === 1) return hits[0].code;
  if (hits.length > 1) {
    // Prefer the smaller / more specific box (QA before AE/SA overlap edge cases)
    const order = ["QA", "AE", "OM", "SA", "IN"];
    hits.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
    return hits[0].code;
  }

  const area = nearestArea(lat, lng);
  return AREA_COUNTRY[area.id] ?? LAUNCH_COUNTRY_CODE;
}

export function countryCodeForArea(areaId: string): string {
  return AREA_COUNTRY[areaId] ?? LAUNCH_COUNTRY_CODE;
}

export function guestLocationFromCountryCode(code: string): GuestLocation {
  // Map platform country → a default city centroid in that market
  const byCountry: Record<string, string> = {
    IN: "kochi",
    AE: "dubai",
    SA: "dubai", // soft default until SA areas are added
    OM: "fujairah",
    QA: "dubai",
  };
  const areaId = byCountry[code] ?? "kochi";
  const area = GEO_AREAS.find((a) => a.id === areaId) ?? DEFAULT_AREA;
  return {
    lat: area.lat,
    lng: area.lng,
    area,
    source: "country",
  };
}

export function clearStoredGuestLocation(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export { DEFAULT_AREA, STORAGE_KEY };
