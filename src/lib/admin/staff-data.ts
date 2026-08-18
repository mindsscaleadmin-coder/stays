import type { StaffMember, StaffMemberInput, StaffRole } from "./staff-types";
import { DEFAULT_PERMISSIONS, normalizeStaffPermissions } from "./staff-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-admin-staff";
export const STAFF_SYNC_EVENT = "farm-stays-admin-staff-updated";

export const SEED_STAFF: StaffMember[] = [
  {
    id: "STF-001",
    name: "Sara Admin",
    email: "admin@greenfield.ae",
    role: "admin",
    permissions: [...DEFAULT_PERMISSIONS.admin],
    active: true,
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "STF-002",
    name: "Omar Sub-Admin",
    email: "omar.ops@greenfield.ae",
    role: "sub_admin",
    permissions: [...DEFAULT_PERMISSIONS.sub_admin],
    active: true,
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "STF-003",
    name: "Layla Support",
    email: "layla.support@greenfield.ae",
    role: "support",
    permissions: [...DEFAULT_PERMISSIONS.support],
    active: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(STAFF_SYNC_EVENT);
}

function readAll(): StaffMember[] {
  if (typeof window === "undefined") return [...SEED_STAFF];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...SEED_STAFF];
    const stored = JSON.parse(raw) as StaffMember[];
    const ids = new Set(stored.map((s) => s.id));
    const seeds = SEED_STAFF.filter((s) => !ids.has(s.id));
    return [...stored, ...seeds].map((s) => ({
      ...s,
      permissions: normalizeStaffPermissions(s.role, s.permissions ?? []),
    }));
  } catch {
    return [...SEED_STAFF];
  }
}

function writeAll(staff: StaffMember[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
  notify();
}

export function loadStaffMembers(): StaffMember[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getStaffByEmail(email: string): StaffMember | undefined {
  const normalized = email.trim().toLowerCase();
  return loadStaffMembers().find((s) => s.email === normalized);
}

export function ensureSuperAdminStaff(email: string, name: string): StaffMember {
  const existing = getStaffByEmail(email);
  if (existing) return existing;
  return saveStaffMember({
    name: name.trim() || email.split("@")[0] || "Super Admin",
    email: email.trim().toLowerCase(),
    role: "admin",
    permissions: [...DEFAULT_PERMISSIONS.admin],
    active: true,
  });
}

export function saveStaffMember(input: StaffMemberInput): StaffMember {
  const all = readAll();
  const id = input.id ?? `STF-${Date.now()}`;
  const existing = all.find((s) => s.id === id);
  const next: StaffMember = {
    id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    permissions: normalizeStaffPermissions(
      input.role,
      input.permissions.length > 0
        ? input.permissions
        : [...DEFAULT_PERMISSIONS[input.role]]
    ),
    active: input.active,
    password:
      input.password !== undefined
        ? input.password.trim() || undefined
        : existing?.password,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  writeAll(existing ? all.map((s) => (s.id === id ? next : s)) : [next, ...all]);
  return next;
}

export function deleteStaffMember(id: string): boolean {
  const all = readAll();
  if (!all.some((s) => s.id === id)) return false;
  writeAll(all.filter((s) => s.id !== id));
  return true;
}

export function permissionsForRole(role: StaffRole) {
  return [...DEFAULT_PERMISSIONS[role]];
}

/** Verify demo admin staff email + password when the email is a known staff record. */
export function verifyAdminStaffPassword(
  email: string,
  password: string
): { ok: true; member: StaffMember | null } | { ok: false; error: string } {
  const member = getStaffByEmail(email);
  if (!member) return { ok: true, member: null };
  if (!member.active) {
    return { ok: false, error: "This staff account is deactivated. Contact a Super Admin." };
  }
  const pass = password.trim();
  if (member.password) {
    if (member.password === pass) return { ok: true, member };
    return { ok: false, error: "Invalid email or password." };
  }
  // Super Admin without a set password: demo allows any password
  if (member.role === "admin") return { ok: true, member };
  return {
    ok: false,
    error:
      "No password set for this staff account. Ask a Super Admin to set one under Users → Staff access.",
  };
}
