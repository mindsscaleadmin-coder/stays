import { prisma } from "@/lib/prisma";
import { resolveHostName } from "@/lib/admin/trust-data";
import {
  DEFAULT_HOST_STAFF_PERMISSIONS,
  normalizeHostStaffPermissions,
  type HostStaffMember,
  type HostStaffMemberInput,
  type HostStaffPermission,
  type HostStaffRole,
} from "@/lib/host/host-staff-types";

async function ensureHostUser(hostId: string) {
  const existing = await prisma.user.findUnique({ where: { id: hostId } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id: hostId,
      fullName: resolveHostName(hostId),
      email: `${hostId.replace(/[^a-zA-Z0-9]/g, "")}@hosts.local`,
      roles: JSON.stringify(["host"]),
      isVerified: true,
    },
  });
}

function parsePermissions(raw: string): HostStaffPermission[] {
  try {
    const parsed = JSON.parse(raw) as HostStaffPermission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toMember(
  row: {
    id: string;
    hostId: string;
    name: string;
    email: string;
    role: string;
    permissions: string;
    active: boolean;
    password: string | null;
    createdAt: Date;
  },
  maskPassword = true
): HostStaffMember {
  const role = row.role as HostStaffRole;
  return {
    id: row.id,
    hostId: row.hostId,
    name: row.name,
    email: row.email,
    role,
    permissions: normalizeHostStaffPermissions(role, parsePermissions(row.permissions)),
    active: row.active,
    password: maskPassword ? (row.password ? "••••••" : undefined) : row.password ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listHostStaffMembers(hostId: string): Promise<HostStaffMember[]> {
  const rows = await prisma.hostStaff.findMany({
    where: { hostId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => toMember(row));
}

export async function getHostStaffByEmail(
  hostId: string,
  email: string
): Promise<HostStaffMember | undefined> {
  const normalized = email.trim().toLowerCase();
  const row = await prisma.hostStaff.findUnique({
    where: { hostId_email: { hostId, email: normalized } },
  });
  return row ? toMember(row) : undefined;
}

export async function ensureHostOwnerStaff(input: {
  hostId: string;
  name: string;
  email: string;
}): Promise<HostStaffMember> {
  await ensureHostUser(input.hostId);
  const email = input.email.trim().toLowerCase();
  const existing = await getHostStaffByEmail(input.hostId, email);
  if (existing) {
    if (existing.role === "owner" && existing.active) return existing;
    return saveHostStaffMember({
      ...existing,
      role: "owner",
      permissions: [...DEFAULT_HOST_STAFF_PERMISSIONS.owner],
      active: true,
    });
  }
  return saveHostStaffMember({
    hostId: input.hostId,
    name: input.name.trim() || email.split("@")[0] || "Owner",
    email,
    role: "owner",
    permissions: [...DEFAULT_HOST_STAFF_PERMISSIONS.owner],
    active: true,
  });
}

export async function saveHostStaffMember(
  input: HostStaffMemberInput
): Promise<HostStaffMember> {
  await ensureHostUser(input.hostId);
  const email = input.email.trim().toLowerCase();
  const role = input.role;
  const permissions = normalizeHostStaffPermissions(
    role,
    input.permissions.length > 0
      ? input.permissions
      : [...DEFAULT_HOST_STAFF_PERMISSIONS[role]]
  );

  const existingById = input.id
    ? await prisma.hostStaff.findFirst({
        where: { id: input.id, hostId: input.hostId },
      })
    : null;

  let password = existingById?.password ?? null;
  if (input.password !== undefined) {
    password = input.password.trim() || null;
  }

  const data = {
    hostId: input.hostId,
    name: input.name.trim(),
    email,
    role,
    permissions: JSON.stringify(permissions),
    active: input.active,
    password,
  };

  let row;
  if (existingById) {
    row = await prisma.hostStaff.update({
      where: { id: existingById.id },
      data,
    });
  } else {
    row = await prisma.hostStaff.create({
      data: {
        ...data,
        id: input.id,
      },
    });
  }

  if (role === "owner") {
    const others = await prisma.hostStaff.findMany({
      where: {
        hostId: input.hostId,
        role: "owner",
        NOT: { id: row.id },
      },
    });
    for (const other of others) {
      const nextPerms = normalizeHostStaffPermissions(
        "manager",
        parsePermissions(other.permissions).length
          ? parsePermissions(other.permissions)
          : DEFAULT_HOST_STAFF_PERMISSIONS.manager
      );
      await prisma.hostStaff.update({
        where: { id: other.id },
        data: {
          role: "manager",
          permissions: JSON.stringify(nextPerms),
        },
      });
    }
  }

  return toMember(row);
}

export async function deleteHostStaffMember(hostId: string, id: string): Promise<boolean> {
  const target = await prisma.hostStaff.findFirst({ where: { id, hostId } });
  if (!target) return false;
  if (target.role === "owner") return false;
  await prisma.hostStaff.delete({ where: { id } });
  return true;
}

export async function findHostStaffLogin(
  email: string,
  password: string
): Promise<HostStaffMember | undefined> {
  const normalized = email.trim().toLowerCase();
  const pass = password.trim();
  if (!normalized || !pass) return undefined;

  const row = await prisma.hostStaff.findFirst({
    where: {
      email: normalized,
      active: true,
      role: { not: "owner" },
      password: pass,
    },
  });
  return row ? toMember(row, false) : undefined;
}

export async function findActiveHostStaffByEmail(
  email: string
): Promise<HostStaffMember | undefined> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return undefined;

  const row = await prisma.hostStaff.findFirst({
    where: {
      email: normalized,
      active: true,
      role: { not: "owner" },
    },
  });
  return row ? toMember(row, false) : undefined;
}
