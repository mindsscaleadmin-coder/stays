export const GUEST_BOOKINGS = [
  {
    id: "GF-A8K2X1",
    property: "Green Valley Farmhouse",
    location: "Al Ain, Abu Dhabi",
    checkIn: "2026-08-16",
    checkOut: "2026-08-19",
    guests: 4,
    total: "AED 3,347",
    status: "confirmed" as const,
    img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    id: "GF-K7M1Q3",
    property: "Green Valley Farmhouse",
    location: "Al Ain, Abu Dhabi",
    checkIn: "2026-06-10",
    checkOut: "2026-06-12",
    guests: 2,
    total: "AED 2,100",
    status: "completed" as const,
    listingId: "1",
    img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    id: "GF-H2K9M1",
    property: "Spice Garden Cottage",
    location: "Hatta, Dubai",
    checkIn: "2026-09-05",
    checkOut: "2026-09-07",
    guests: 2,
    total: "AED 1,950",
    status: "pending" as const,
    img: "https://images.unsplash.com/photo-1760648998657-bf3e8e8a380f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
];

export const FAVORITES_KEY = "farm-stays-favorites";

export function getFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function setFavoriteIds(ids: string[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}
