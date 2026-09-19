import { getPlatformStaffByEmail, getPlatformStaffById } from "@/lib/server/platform-staff-repo";
import { BookingAccessError, isDemoApiMode } from "@/lib/auth/booking-access";
import {
  ALL_STAFF_PERMISSIONS,
  staffHasPermission,
  type StaffMember,
  type StaffMemberInput,
  type StaffPermission,
  type StaffRole,
} from "@/lib/admin/staff-types";
import { requireSessionUser } from "@/lib/auth/session";
import { DEMO_ACTOR, resolveSessionActor, type SessionActor } from "@/lib/auth/resolve-actor";

async function requireActor(): Promise<SessionActor> {
  if (isDemoApiMode()) return DEMO_ACTOR;
  const user = await requireSessionUser();
  return resolveSessionActor(user);
}

const DEMO_STAFF: StaffMember = {
  id: "demo-staff",
  name: "Demo Admin",
  email: "demo@local",
  role: "admin",
  permissions: [...ALL_STAFF_PERMISSIONS],
  active: true,
  createdAt: "2020-01-01T00:00:00.000Z",
};

export type PlatformStaffContext = {
  actor: SessionActor;
  staff: StaffMember;
};

export async function requirePlatformStaff(
  permission?: StaffPermission
): Promise<PlatformStaffContext> {
  const actor = await requireActor();

  if (isDemoApiMode()) {
    if (!actor.roles.includes("admin")) {
      throw new BookingAccessError("Admin access required");
    }
    if (permission && !staffHasPermission(DEMO_STAFF, permission)) {
      throw new BookingAccessError("Insufficient permissions", 403);
    }
    return { actor, staff: DEMO_STAFF };
  }

  if (!actor.email) {
    throw new BookingAccessError("Admin access required");
  }

  const staff = await getPlatformStaffByEmail(actor.email);
  if (!staff?.active) {
    throw new BookingAccessError("Admin access required");
  }

  if (permission && !staffHasPermission(staff, permission)) {
    throw new BookingAccessError("Insufficient permissions", 403);
  }

  return { actor, staff };
}

export async function assertStaffRoleAssignment(
  actorStaff: StaffMember,
  input: Pick<StaffMemberInput, "id" | "role">
): Promise<void> {
  const nextRole = input.role as StaffRole;

  if (nextRole === "admin" && actorStaff.role !== "admin") {
    throw new BookingAccessError("Only Super Admin can assign the Super Admin role", 403);
  }

  if (!input.id) return;

  const target = await getPlatformStaffById(input.id);
  if (!target) return;

  if (target.role === "admin" && actorStaff.role !== "admin") {
    throw new BookingAccessError("Only Super Admin can modify Super Admin accounts", 403);
  }

  if (
    target.id === actorStaff.id &&
    nextRole === "admin" &&
    actorStaff.role !== "admin"
  ) {
    throw new BookingAccessError("You cannot promote your own staff account to Super Admin", 403);
  }
}
