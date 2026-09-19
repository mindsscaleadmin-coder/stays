import { prisma } from "@/lib/prisma";
import { SEED_STAFF } from "@/lib/admin/staff-data";
import { hashPassword, isHashedPassword, verifyPassword } from "@/lib/auth/password";
import { isDemoApiMode } from "@/lib/auth/booking-access";
import {
  DEFAULT_PERMISSIONS,
  normalizeStaffPermissions,
  type StaffMember,
  type StaffMemberInput,
  type StaffPermission,
  type StaffRole,
} from "@/lib/admin/staff-types";

function parsePermissions(raw: string): StaffPermission[] {
  try {
    const parsed = JSON.parse(raw) as StaffPermission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toMember(
  row: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string;
    active: boolean;
    password: string | null;
    createdAt: Date;
  },
  maskPassword = true
): StaffMember {
  const role = row.role as StaffRole;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role,
    permissions: normalizeStaffPermissions(role, parsePermissions(row.permissions)),
    active: row.active,
    password: maskPassword ? (row.password ? "••••••" : undefined) : row.password ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function seedPlatformStaffIfEmpty(): Promise<void> {
  const count = await prisma.platformStaff.count();
  if (count > 0) return;

  for (const seed of SEED_STAFF) {
    await prisma.platformStaff.create({
      data: {
        id: seed.id,
        name: seed.name,
        email: seed.email,
        role: seed.role,
        permissions: JSON.stringify(seed.permissions),
        active: seed.active,
        password: seed.password ?? null,
        createdAt: new Date(seed.createdAt),
      },
    });
  }
}

export async function listPlatformStaff(): Promise<StaffMember[]> {
  await seedPlatformStaffIfEmpty();
  const rows = await prisma.platformStaff.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((row) => toMember(row));
}

export async function getPlatformStaffByEmail(
  email: string,
  opts?: { maskPassword?: boolean }
): Promise<StaffMember | undefined> {
  await seedPlatformStaffIfEmpty();
  const normalized = email.trim().toLowerCase();
  const row = await prisma.platformStaff.findUnique({ where: { email: normalized } });
  return row ? toMember(row, opts?.maskPassword !== false) : undefined;
}

export async function getPlatformStaffById(id: string): Promise<StaffMember | undefined> {
  await seedPlatformStaffIfEmpty();
  const row = await prisma.platformStaff.findUnique({ where: { id } });
  return row ? toMember(row) : undefined;
}

export async function savePlatformStaff(input: StaffMemberInput): Promise<StaffMember> {
  await seedPlatformStaffIfEmpty();
  const email = input.email.trim().toLowerCase();
  const role = input.role;
  const permissions = normalizeStaffPermissions(
    role,
    input.permissions.length > 0 ? input.permissions : [...DEFAULT_PERMISSIONS[role]]
  );

  const existingById = input.id
    ? await prisma.platformStaff.findUnique({ where: { id: input.id } })
    : null;
  const existingByEmail = existingById
    ? null
    : await prisma.platformStaff.findUnique({ where: { email } });
  const existing = existingById ?? existingByEmail;

  let password = existing?.password ?? null;
  if (input.password !== undefined) {
    const next = input.password.trim();
    password = next ? await hashPassword(next) : null;
  }

  const data = {
    name: input.name.trim(),
    email,
    role,
    permissions: JSON.stringify(permissions),
    active: input.active,
    password,
  };

  const row = existing
    ? await prisma.platformStaff.update({ where: { id: existing.id }, data })
    : await prisma.platformStaff.create({
        data: input.id ? { ...data, id: input.id } : data,
      });

  return toMember(row);
}

export async function deletePlatformStaff(id: string): Promise<boolean> {
  const target = await prisma.platformStaff.findUnique({ where: { id } });
  if (!target) return false;
  await prisma.platformStaff.delete({ where: { id } });
  return true;
}

export async function verifyPlatformStaffPassword(
  email: string,
  password: string
): Promise<{ ok: true; member: StaffMember | null } | { ok: false; error: string }> {
  await seedPlatformStaffIfEmpty();
  const member = await getPlatformStaffByEmail(email, { maskPassword: false });
  if (!member) return { ok: true, member: null };
  if (!member.active) {
    return { ok: false, error: "This staff account is deactivated. Contact a Super Admin." };
  }
  const pass = password.trim();
  if (member.password) {
    const matches = await verifyPassword(pass, member.password);
    if (!matches) return { ok: false, error: "Invalid email or password." };
    if (!isHashedPassword(member.password)) {
      await prisma.platformStaff.update({
        where: { id: member.id },
        data: { password: await hashPassword(pass) },
      });
    }
    return { ok: true, member: toMemberSafe(member) };
  }
  if (isDemoApiMode() && member.role === "admin") {
    return { ok: true, member: toMemberSafe(member) };
  }
  return {
    ok: false,
    error:
      "No password set for this staff account. Ask a Super Admin to set one under Users → Staff access.",
  };
}

function toMemberSafe(member: StaffMember): StaffMember {
  return {
    ...member,
    password: member.password ? "••••••" : undefined,
  };
}
