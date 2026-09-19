import { findActiveHostStaffByEmail } from "@/lib/server/host-staff-repo";
import { BookingAccessError, isDemoApiMode } from "@/lib/auth/booking-access";
import { canAccessAdmin } from "@/lib/auth/roles";
import { hostStaffHasPermission } from "@/lib/host/host-staff-types";
import { assertHostSelfOrAdmin } from "@/lib/auth/listing-access";
import { requireActor, type SessionActor } from "@/lib/auth/guards";

/** Host owner, platform admin, or host staff with manage_staff may mutate staff records. */
export async function requireHostStaffManager(hostId: string): Promise<SessionActor> {
  const actor = await requireActor();
  if (isDemoApiMode()) {
    await assertHostSelfOrAdmin(hostId, actor);
    return actor;
  }
  await assertHostSelfOrAdmin(hostId, actor);

  if (canAccessAdmin(actor.roles)) return actor;
  if (actor.id === hostId && !actor.staffHostId) return actor;

  if (actor.staffHostId === hostId && actor.email) {
    const member = await findActiveHostStaffByEmail(actor.email);
    if (member && hostStaffHasPermission(member, "manage_staff")) {
      return actor;
    }
  }

  throw new BookingAccessError("Staff management permission required", 403);
}
