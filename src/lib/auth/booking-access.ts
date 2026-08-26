import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { AuthError } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  canAccessAdmin,
  canBook,
  canManageListings,
} from "@/lib/auth/roles";

export class BookingAccessError extends Error {
  constructor(
    message: string,
    public status = 403
  ) {
    super(message);
    this.name = "BookingAccessError";
  }
}

/** Local-only: APIs skip sessions when Supabase is unset. Never true in production. */
export function isDemoApiMode() {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.ALLOW_DEMO_AUTH === "0") return false;
  return !isSupabaseConfigured();
}

/**
 * JWT / metadata roles only. Do not use for admin checks — use resolveSessionActor.
 * `admin` in user_metadata is ignored because sign-up can set it.
 */
export function getUserRoles(user: User): string[] {
  const raw = user.user_metadata?.roles;
  if (!Array.isArray(raw)) return ["guest"];
  const roles = raw.filter((role): role is string => typeof role === "string" && role !== "admin");
  return roles.length > 0 ? roles : ["guest"];
}

export async function loadBookingWithListing(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: { listing: { select: { hostId: true, title: true } } },
  });
}

export function assertGuestOwnsBooking(
  booking: { guestId: string },
  userId: string
) {
  if (booking.guestId !== userId) {
    throw new BookingAccessError("You can only access your own bookings");
  }
}

export function assertHostOwnsListing(
  booking: { listing: { hostId: string } },
  actor: { id: string; staffHostId?: string }
) {
  if (booking.listing.hostId === actor.id) return;
  if (actor.staffHostId && booking.listing.hostId === actor.staffHostId) return;
  throw new BookingAccessError("Host access denied for this booking");
}

export function assertBookingParticipant(
  booking: { guestId: string; listing: { hostId: string } },
  actor: { id: string; roles: string[]; staffHostId?: string }
) {
  if (canAccessAdmin(actor.roles)) return;
  if (booking.guestId === actor.id) return;
  if (booking.listing.hostId === actor.id) return;
  if (actor.staffHostId && booking.listing.hostId === actor.staffHostId) return;
  throw new BookingAccessError("Access denied");
}

export function resolveCancelActor(
  booking: { guestId: string; listing: { hostId: string } },
  actor: { id: string; roles: string[]; staffHostId?: string }
): "guest" | "host" | "admin" {
  if (canAccessAdmin(actor.roles)) return "admin";
  const hostsListing =
    booking.listing.hostId === actor.id ||
    (Boolean(actor.staffHostId) && booking.listing.hostId === actor.staffHostId);
  if (hostsListing && canManageListings(actor.roles)) return "host";
  if (booking.guestId === actor.id && canBook(actor.roles)) return "guest";
  throw new BookingAccessError("You cannot cancel this booking");
}

export function bookingAccessResponse(
  error: BookingAccessError | AuthError,
  requestId?: string
) {
  return Response.json(
    { error: error.message },
    {
      status: error.status,
      headers: requestId ? { "x-request-id": requestId } : undefined,
    }
  );
}

export function assertCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (isDemoApiMode() || process.env.NODE_ENV !== "production") return;
    throw new AuthError("Cron secret required", 503);
  }
  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    throw new AuthError("Unauthorized", 401);
  }
}
