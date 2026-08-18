import type { GuestUser } from "@/lib/auth/types";
import type { AdminUserRecord } from "./user-types";

const BACKUP_KEY = "farm-stays-impersonation-backup";
const FLAG_KEY = "farm-stays-impersonating";

export function getImpersonationBackup(): GuestUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? (JSON.parse(raw) as GuestUser) : null;
  } catch {
    return null;
  }
}

export function isImpersonating(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FLAG_KEY) === "1";
}

export function startHostImpersonation(
  adminUser: GuestUser,
  host: AdminUserRecord
): GuestUser {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(adminUser));
  localStorage.setItem(FLAG_KEY, "1");
  const hostSession: GuestUser = {
    id: host.id,
    email: host.email,
    fullName: host.name,
    phone: host.phone,
    country: host.country,
    roles: host.roles.includes("host") ? host.roles : [...host.roles, "host"],
    language: adminUser.language ?? "en",
  };
  localStorage.setItem("farm-stays-demo-user", JSON.stringify(hostSession));
  return hostSession;
}

export function endHostImpersonation(): GuestUser | null {
  const backup = getImpersonationBackup();
  localStorage.removeItem(FLAG_KEY);
  localStorage.removeItem(BACKUP_KEY);
  if (backup) {
    localStorage.setItem("farm-stays-demo-user", JSON.stringify(backup));
  }
  return backup;
}
