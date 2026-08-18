import type {
  HostStaffMember,
  HostStaffMemberInput,
  HostStaffRole,
} from "./host-staff-types";
import {
  DEFAULT_HOST_STAFF_PERMISSIONS,
  normalizeHostStaffPermissions,
} from "./host-staff-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-host-staff";
export const HOST_STAFF_SYNC_EVENT = "farm-stays-host-staff-updated";

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(HOST_STAFF_SYNC_EVENT);
}

function readAll(): HostStaffMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw) as HostStaffMember[];
    if (!Array.isArray(stored)) return [];
    return stored.map((s) => ({
      ...s,
      email: s.email.trim().toLowerCase(),
      permissions: normalizeHostStaffPermissions(s.role, s.permissions ?? []),
    }));
  } catch {
    return [];
  }
}

function writeAll(staff: HostStaffMember[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
  notify();
}

export function loadHostStaffMembers(hostId: string): HostStaffMember[] {
  if (!hostId) return [];
  return readAll()
    .filter((s) => s.hostId === hostId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getHostStaffByEmail(
  hostId: string,
  email: string
): HostStaffMember | undefined {
  const normalized = email.trim().toLowerCase();
  return loadHostStaffMembers(hostId).find((s) => s.email === normalized);
}

/** Ensure the account holder appears as Owner with full access. */
export function ensureHostOwnerStaff(input: {
  hostId: string;
  name: string;
  email: string;
}): HostStaffMember {
  const email = input.email.trim().toLowerCase();
  const existing = getHostStaffByEmail(input.hostId, email);
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

export function saveHostStaffMember(input: HostStaffMemberInput): HostStaffMember {
  const all = readAll();
  const id = input.id ?? `HSTF-${Date.now()}`;
  const existing = all.find((s) => s.id === id);
  const next: HostStaffMember = {
    id,
    hostId: input.hostId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    permissions: normalizeHostStaffPermissions(
      input.role,
      input.permissions.length > 0
        ? input.permissions
        : [...DEFAULT_HOST_STAFF_PERMISSIONS[input.role]]
    ),
    active: input.active,
    password:
      input.password !== undefined
        ? input.password.trim() || undefined
        : existing?.password,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  // One owner email per host — demote other owners if this save is owner
  let nextAll = existing
    ? all.map((s) => (s.id === id ? next : s))
    : [next, ...all];

  if (next.role === "owner") {
    nextAll = nextAll.map((s) => {
      if (s.hostId !== next.hostId || s.id === next.id) return s;
      if (s.role !== "owner") return s;
      return {
        ...s,
        role: "manager" as HostStaffRole,
        permissions: normalizeHostStaffPermissions(
          "manager",
          s.permissions.length ? s.permissions : DEFAULT_HOST_STAFF_PERMISSIONS.manager
        ),
      };
    });
  }

  writeAll(nextAll);
  return next;
}

export function deleteHostStaffMember(hostId: string, id: string): boolean {
  const all = readAll();
  const target = all.find((s) => s.id === id && s.hostId === hostId);
  if (!target) return false;
  if (target.role === "owner") return false;
  writeAll(all.filter((s) => s.id !== id));
  return true;
}

export function permissionsForHostStaffRole(role: HostStaffRole) {
  return [...DEFAULT_HOST_STAFF_PERMISSIONS[role]];
}

/** Find an active staff/manager record matching email + password (any host). */
export function findHostStaffLogin(
  email: string,
  password: string
): HostStaffMember | undefined {
  const normalized = email.trim().toLowerCase();
  const pass = password.trim();
  if (!normalized || !pass) return undefined;
  return readAll().find(
    (s) =>
      s.email === normalized &&
      s.active &&
      s.role !== "owner" &&
      Boolean(s.password) &&
      s.password === pass
  );
}

/** Active non-owner staff row for an email (password not checked). */
export function findActiveHostStaffByEmail(email: string): HostStaffMember | undefined {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return undefined;
  return readAll().find((s) => s.email === normalized && s.active && s.role !== "owner");
}

export function setHostStaffPassword(
  hostId: string,
  staffId: string,
  password: string
): HostStaffMember | null {
  const member = loadHostStaffMembers(hostId).find((s) => s.id === staffId);
  if (!member || member.role === "owner") return null;
  return saveHostStaffMember({
    ...member,
    password: password.trim(),
  });
}
