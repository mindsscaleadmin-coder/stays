import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-guest-bookings";
export const GUEST_BOOKINGS_SYNC_EVENT = "farm-stays-guest-bookings-updated";

export type GuestBookingSummary = {
  id: string;
  bookingReference?: string;
  listingId: string;
  property: string;
  location: string;
  img: string;
  checkIn: string;
  checkOut: string;
  status: string;
  total: string;
  bookedAt: string;
  policyId?: string;
  paymentStatus?: string;
  totalPrice?: number;
  /** Guest who owns this trip — used to scope account bookings */
  guestId?: string;
};

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(GUEST_BOOKINGS_SYNC_EVENT);
}

export function loadGuestBookings(): GuestBookingSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GuestBookingSummary[];
  } catch {
    return [];
  }
}

export function upsertGuestBooking(booking: GuestBookingSummary): void {
  if (typeof window === "undefined") return;
  const all = loadGuestBookings().filter((b) => b.id !== booking.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([booking, ...all]));
  notify();
}

export function looksLikeServerBookingId(id: string): boolean {
  return !id.startsWith("GF-") && id.length >= 20;
}

export function updateGuestBookingStatus(id: string, status: string): void {
  if (typeof window === "undefined") return;
  const all = loadGuestBookings();
  const idx = all.findIndex((b) => b.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], status };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  notify();
}

/** Merge Prisma guest bookings into local trip list (server rows win). */
export function mergeServerGuestBookings(
  server: GuestBookingSummary[]
): GuestBookingSummary[] {
  if (typeof window === "undefined") return server;
  const local = loadGuestBookings();
  const localById = new Map(local.map((b) => [b.id, b]));
  const merged = server.map((s) => {
    const existing = localById.get(s.id);
    return {
      ...s,
      img: s.img || existing?.img || "",
      status:
        existing?.status === "completed" && s.status === "confirmed"
          ? "completed"
          : s.status,
    };
  });
  for (const row of local) {
    if (row.id.startsWith("GF-") && !merged.some((b) => b.id === row.id)) {
      merged.push(row);
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

const GUEST_BOOKINGS_PULL_TTL_MS = 8_000;
const guestBookingsPull = new Map<
  string,
  {
    rows: GuestBookingSummary[] | null;
    at: number;
    inflight?: Promise<GuestBookingSummary[] | null>;
  }
>();

export function invalidateGuestBookingsCache(guestId?: string) {
  if (guestId) guestBookingsPull.delete(guestId);
  else guestBookingsPull.clear();
}

export async function fetchGuestBookingsFromServer(
  guestId: string,
  force = false
): Promise<GuestBookingSummary[] | null> {
  const cached = guestBookingsPull.get(guestId);
  if (!force && cached?.inflight) {
    return cached.inflight;
  }
  if (!force && cached && Date.now() - cached.at < GUEST_BOOKINGS_PULL_TTL_MS) {
    return cached.rows;
  }

  const inflight = (async () => {
    try {
      const params = new URLSearchParams({ role: "guest", guestId });
      const res = await fetch(`/api/bookings?${params.toString()}`);
      if (!res.ok) return cached?.rows ?? null;
      const data = (await res.json()) as { bookings?: GuestBookingSummary[] };
      const rows = Array.isArray(data.bookings) ? data.bookings : null;
      guestBookingsPull.set(guestId, { rows, at: Date.now() });
      return rows;
    } catch {
      return cached?.rows ?? null;
    }
  })();

  guestBookingsPull.set(guestId, {
    rows: cached?.rows ?? null,
    at: cached?.at ?? 0,
    inflight,
  });
  return inflight;
}
