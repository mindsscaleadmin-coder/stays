import { prisma } from "@/lib/prisma";
import { AuthError, requireSessionUser } from "@/lib/auth/session";
import { BookingAccessError, isDemoApiMode } from "@/lib/auth/booking-access";
import { canAccessAdmin } from "@/lib/auth/roles";
import { requireActor } from "@/lib/auth/guards";
import { resolveSessionActor, type SessionActor } from "@/lib/auth/resolve-actor";

function actorManagesHost(actor: SessionActor, hostId: string) {
  return actor.id === hostId || actor.staffHostId === hostId || canAccessAdmin(actor.roles);
}

export async function assertListingHostOrAdmin(listingId: string, actor: SessionActor) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { hostId: true },
  });
  if (!listing) throw new BookingAccessError("Listing not found", 404);
  if (!actorManagesHost(actor, listing.hostId)) {
    throw new BookingAccessError("Host access denied");
  }
  return listing;
}

export async function requireListingHostOrAdmin(listingId: string) {
  if (isDemoApiMode()) return null;
  const actor = await requireActor();
  await assertListingHostOrAdmin(listingId, actor);
  return actor;
}

export async function assertHostSelfOrAdmin(hostId: string, actor: SessionActor) {
  if (!actorManagesHost(actor, hostId)) {
    throw new BookingAccessError("Host access denied");
  }
}

export async function requireHostSelfOrAdmin(hostId: string) {
  if (isDemoApiMode()) return null;
  const actor = await requireActor();
  await assertHostSelfOrAdmin(hostId, actor);
  return actor;
}

export async function assertGuestSelfOrAdmin(guestId: string, actor: SessionActor) {
  if (guestId === actor.id || canAccessAdmin(actor.roles)) return;
  throw new BookingAccessError("Guest access denied");
}

export async function requireGuestSelfOrAdmin(guestId: string) {
  const user = await requireSessionUser();
  const actor = await resolveSessionActor(user);
  await assertGuestSelfOrAdmin(guestId, actor);
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
