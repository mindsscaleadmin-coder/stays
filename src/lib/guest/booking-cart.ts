import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-booking-cart";
export const BOOKING_CART_SYNC_EVENT = "farm-stays-booking-cart-updated";

export type BookingCartLine = {
  id: string;
  listingId: string;
  title: string;
  location: string;
  img: string;
  pricePerNight: number;
  maxGuests: number;
  instantBook?: boolean;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: string[];
  experienceIds: string[];
  extraIds: string[];
  currency: string;
  addedAt: string;
};

export type AddToCartInput = Omit<BookingCartLine, "id" | "addedAt">;

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(BOOKING_CART_SYNC_EVENT);
}

function newLineId(): string {
  return `cart-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadBookingCart(): BookingCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BookingCartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBookingCart(lines: BookingCartLine[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  notify();
}

export function getCartCount(): number {
  return loadBookingCart().length;
}

/**
 * Add a stay to the cart. Same listing + same dates replaces the line;
 * different dates for the same listing are separate lines.
 */
export function addToBookingCart(input: AddToCartInput): BookingCartLine {
  const all = loadBookingCart();
  const existingIdx = all.findIndex(
    (l) =>
      l.listingId === input.listingId &&
      l.checkIn === input.checkIn &&
      l.checkOut === input.checkOut
  );

  const line: BookingCartLine = {
    ...input,
    id: existingIdx >= 0 ? all[existingIdx].id : newLineId(),
    addedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    all[existingIdx] = line;
  } else {
    all.push(line);
  }
  saveBookingCart(all);
  return line;
}

export function removeFromBookingCart(lineId: string): void {
  saveBookingCart(loadBookingCart().filter((l) => l.id !== lineId));
}

export function updateBookingCartLine(
  lineId: string,
  updates: Partial<
    Pick<BookingCartLine, "checkIn" | "checkOut" | "guests" | "rooms" | "experienceIds" | "extraIds">
  >
): BookingCartLine | null {
  const all = loadBookingCart();
  const idx = all.findIndex((l) => l.id === lineId);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], ...updates };
  saveBookingCart(all);
  return all[idx];
}

export function clearBookingCart(): void {
  saveBookingCart([]);
}
