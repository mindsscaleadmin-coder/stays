import { requireSessionUser } from "@/lib/auth/session";
import {
  BookingAccessError,
  isDemoApiMode,
} from "@/lib/auth/booking-access";
import { canAccessAdmin, canManageListings } from "@/lib/auth/roles";
import {
  DEMO_ACTOR,
  resolveSessionActor,
  type SessionActor,
} from "@/lib/auth/resolve-actor";

export type { SessionActor };

export async function requireActor(): Promise<SessionActor> {
  if (isDemoApiMode()) return DEMO_ACTOR;
  const user = await requireSessionUser();
  return resolveSessionActor(user);
}

export async function requireAdmin(): Promise<SessionActor> {
  const actor = await requireActor();
  if (!canAccessAdmin(actor.roles)) {
    throw new BookingAccessError("Admin access required");
  }
  return actor;
}

export async function requireHost(): Promise<SessionActor> {
  const actor = await requireActor();
  if (!canManageListings(actor.roles) && !canAccessAdmin(actor.roles)) {
    throw new BookingAccessError("Host access required");
  }
  return actor;
}

export function actingHostId(actor: SessionActor): string {
  return actor.staffHostId || actor.id;
}
