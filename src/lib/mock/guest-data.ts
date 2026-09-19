export const GUEST_BOOKINGS = [
  {
    id: "GF-A8K2X1",
    property: "Green Valley Farmhouse",
    location: "Al Ain, Abu Dhabi",
    checkIn: "2026-08-16",
    checkOut: "2026-08-19",
    guests: 4,
    total: "INR 3,347",
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
    total: "INR 2,100",
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
    total: "INR 1,950",
    status: "pending" as const,
    img: "https://images.unsplash.com/photo-1760648998657-bf3e8e8a380f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
];

import { pushFavoritesProfileNotice } from "@/lib/guest/guest-profile-notice-events";

export const FAVORITES_KEY = "farm-stays-favorites";
export const FAVORITES_SYNC_EVENT = "farm-stays-favorites-updated";

export function getFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function setFavoriteIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(FAVORITES_SYNC_EVENT));
}

export function toggleFavoriteId(listingId: string): boolean {
  const ids = getFavoriteIds();
  const saved = ids.includes(listingId);
  const next = saved ? ids.filter((id) => id !== listingId) : [...ids, listingId];
  setFavoriteIds(next);
  if (!saved) pushFavoritesProfileNotice();
  return !saved;
}

export function isFavoriteId(listingId: string): boolean {
  return getFavoriteIds().includes(listingId);
}

export function getFavoriteCount(): number {
  return getFavoriteIds().length;
}
