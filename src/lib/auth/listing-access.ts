import { prisma } from "@/lib/prisma";
import { AuthError, getSessionUser, requireSessionUser } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { canAccessAdmin } from "@/lib/auth/roles";
import { getUserRoles } from "@/lib/auth/booking-access";

export async function assertListingHostOrAdmin(listingId: string, userId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { hostId: true },
  });
  if (!listing) throw new BookingAccessError("Listing not found", 404);

  if (listing.hostId === userId) return listing;

  const user = await getSessionUser();
  const roles = user ? getUserRoles(user) : [];
  if (canAccessAdmin(roles)) return listing;

  throw new BookingAccessError("Host access denied");
}

export async function requireListingHostOrAdmin(listingId: string) {
  const user = await requireSessionUser();
  await assertListingHostOrAdmin(listingId, user.id);
  return user;
}

export async function assertHostSelfOrAdmin(hostId: string, userId: string) {
  if (hostId === userId) return;

  const user = await getSessionUser();
  const roles = user ? getUserRoles(user) : [];
  if (canAccessAdmin(roles)) return;

  throw new BookingAccessError("Host access denied");
}

export async function requireHostSelfOrAdmin(hostId: string) {
  const user = await requireSessionUser();
  await assertHostSelfOrAdmin(hostId, user.id);
  return user;
}

export async function assertGuestSelfOrAdmin(guestId: string, userId: string) {
  if (guestId === userId) return;

  const user = await getSessionUser();
  const roles = user ? getUserRoles(user) : [];
  if (canAccessAdmin(roles)) return;

  throw new BookingAccessError("Guest access denied");
}

export async function requireGuestSelfOrAdmin(guestId: string) {
  const user = await requireSessionUser();
  await assertGuestSelfOrAdmin(guestId, user.id);
  return user;
}

export function hostDataErrorResponse(error: AuthError | BookingAccessError, requestId?: string) {
  return Response.json(
    { error: error.message },
    {
      status: error.status,
      headers: requestId ? { "x-request-id": requestId } : undefined,
    }
  );
}
