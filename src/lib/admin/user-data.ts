import type { AdminUserProfileInput, AdminUserRecord, UserAccountStatus } from "./user-types";
import { emitSyncCustomEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-admin-users";
export const USERS_SYNC_EVENT = "farm-stays-users-updated";

const SEED_USERS: AdminUserRecord[] = [
  {
    id: "U-001",
    name: "Ahmed Al Farsi",
    email: "ahmed@example.com",
    phone: "+971 50 123 4567",
    roles: ["host"],
    status: "verified",
    joinedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "U-002",
    name: "Fatima Al Zaabi",
    email: "fatima@example.com",
    roles: ["guest"],
    status: "verified",
    joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "U-003",
    name: "Khalid Al Mazrouei",
    email: "khalid@example.com",
    phone: "+971 55 987 6543",
    roles: ["host"],
    status: "pending",
    joinedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "U-004",
    name: "Priya Sharma",
    email: "priya@example.com",
    roles: ["guest"],
    status: "verified",
    joinedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "U-005",
    name: "Sara Admin",
    email: "admin@greenfield.ae",
    roles: ["admin"],
    status: "verified",
    joinedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(USERS_SYNC_EVENT);
  }
}

function loadStored(): AdminUserRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AdminUserRecord[];
  } catch {
    return [];
  }
}

function saveStored(users: AdminUserRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  usersCache = null;
  dispatchSync();
}

let usersCache: AdminUserRecord[] | null = null;

function buildAllUsers(): AdminUserRecord[] {
  const stored = loadStored();
  if (stored.length === 0) return [...SEED_USERS];
  const storedIds = new Set(stored.map((u) => u.id));
  const seeds = SEED_USERS.filter((u) => !storedIds.has(u.id));
  return [...stored, ...seeds].sort(
    (a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
  );
}

export function loadAllUsers(): AdminUserRecord[] {
  if (usersCache) return usersCache;
  usersCache = buildAllUsers();
  return usersCache;
}

if (typeof window !== "undefined") {
  window.addEventListener(USERS_SYNC_EVENT, () => {
    usersCache = null;
  });
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) usersCache = null;
  });
}

/** Look up an admin user by id or email (case-insensitive). */
export function findAdminUser(input: {
  id?: string;
  email?: string;
}): AdminUserRecord | undefined {
  const all = loadAllUsers();
  if (input.id) {
    const byId = all.find((u) => u.id === input.id);
    if (byId) return byId;
  }
  const email = input.email?.trim().toLowerCase();
  if (!email) return undefined;
  return all.find((u) => u.email.toLowerCase() === email);
}

export function updateUserStatus(id: string, status: UserAccountStatus): boolean {
  const all = loadAllUsers();
  const target = all.find((u) => u.id === id);
  if (!target) return false;

  const stored = loadStored();
  const storedIds = new Set(stored.map((u) => u.id));
  const updated = { ...target, status };

  if (storedIds.has(id)) {
    saveStored(stored.map((u) => (u.id === id ? updated : u)));
  } else {
    saveStored([updated, ...stored.filter((u) => u.id !== id)]);
  }
  return true;
}

export function updateUserProfile(id: string, input: AdminUserProfileInput): boolean {
  const all = loadAllUsers();
  const target = all.find((u) => u.id === id);
  if (!target) return false;

  const updated: AdminUserRecord = {
    ...target,
    name: input.name?.trim() || target.name,
    email: input.email?.trim() || target.email,
    phone: input.phone !== undefined ? input.phone.trim() || undefined : target.phone,
    country: input.country !== undefined ? input.country.trim() || undefined : target.country,
    roles: input.roles ?? target.roles,
    adminNote:
      input.adminNote !== undefined
        ? input.adminNote.trim() || undefined
        : target.adminNote,
  };

  const stored = loadStored();
  const storedIds = new Set(stored.map((u) => u.id));
  if (storedIds.has(id)) {
    saveStored(stored.map((u) => (u.id === id ? updated : u)));
  } else {
    saveStored([updated, ...stored.filter((u) => u.id !== id)]);
  }
  return true;
}

/** Hosts with suspended or banned status should not access the host dashboard. */
export function isHostAccountLocked(status: UserAccountStatus): boolean {
  return status === "suspended" || status === "banned";
}

export function getUserAccountStatus(userId: string, email?: string): UserAccountStatus | null {
  const all = loadAllUsers();
  const match =
    all.find((u) => u.id === userId) ||
    (email
      ? all.find((u) => u.email.toLowerCase() === email.toLowerCase())
      : undefined);
  return match?.status ?? null;
}

/** Ensure a signed-in host appears in the admin Host Control Panel. */
export function ensureAdminHostUser(input: {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
}): AdminUserRecord {
  const all = loadAllUsers();
  const existing =
    all.find((u) => u.id === input.id) ||
    all.find((u) => u.email.toLowerCase() === input.email.toLowerCase());

  if (existing) {
    const roles = existing.roles.includes("host")
      ? existing.roles
      : [...existing.roles, "host"];
    const updated: AdminUserRecord = {
      ...existing,
      name: input.name || existing.name,
      email: input.email || existing.email,
      phone: input.phone ?? existing.phone,
      country: input.country ?? existing.country,
      roles,
    };
    const stored = loadStored();
    const without = stored.filter((u) => u.id !== updated.id && u.id !== existing.id);
    saveStored([updated, ...without]);
    return updated;
  }

  const created: AdminUserRecord = {
    id: input.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    country: input.country,
    roles: ["host"],
    status: "pending",
    joinedAt: new Date().toISOString(),
  };
  saveStored([created, ...loadStored()]);
  return created;
}

export function formatJoinedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
