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

export function isDemoApiMode() {
  return !isSupabaseConfigured();
}

export function getUserRoles(user: User): string[] {
  return (user.user_metadata?.roles as string[] | undefined) ?? ["guest"];
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
  userId: string
) {
  if (booking.listing.hostId !== userId) {
    throw new BookingAccessError("Host access denied for this booking");
  }
}

export function assertBookingParticipant(
  booking: { guestId: string; listing: { hostId: string } },
  userId: string,
  roles: string[]
) {
  if (canAccessAdmin(roles)) return;
  if (booking.guestId === userId) return;
  if (booking.listing.hostId === userId) return;
  throw new BookingAccessError("Access denied");
}

export function resolveCancelActor(
  booking: { guestId: string; listing: { hostId: string } },
  userId: string,
  roles: string[]
): "guest" | "host" | "admin" {
  if (canAccessAdmin(roles)) return "admin";
  if (booking.listing.hostId === userId && canManageListings(roles)) return "host";
  if (booking.guestId === userId && canBook(roles)) return "guest";
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
