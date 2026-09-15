import type { StaffMember, StaffMemberInput } from "./staff-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedAdminStaff() {
  return isSharedDbEnabled();
}

const STAFF_LIST_TTL_MS = 8_000;
let staffListCache: StaffMember[] | null = null;
let staffListFetchedAt = 0;
let staffListInflight: Promise<StaffMember[]> | null = null;

export async function fetchAdminStaffFromApi(force = false): Promise<StaffMember[]> {
  if (!force && staffListInflight) return staffListInflight;
  if (!force && staffListCache && Date.now() - staffListFetchedAt < STAFF_LIST_TTL_MS) {
    return staffListCache;
  }

  staffListInflight = (async () => {
    try {
      const res = await fetch("/api/admin/staff", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load admin staff");
      const json = (await res.json()) as { staff: StaffMember[] };
      staffListCache = json.staff;
      staffListFetchedAt = Date.now();
      return json.staff;
    } catch {
      return staffListCache ?? [];
    } finally {
      staffListInflight = null;
    }
  })();

  return staffListInflight;
}

const STAFF_BY_EMAIL_TTL_MS = 15_000;
const staffByEmailCache = new Map<
  string,
  { member: StaffMember | null; at: number; inflight?: Promise<StaffMember | null> }
>();

export async function fetchAdminStaffByEmailFromApi(
  email: string
): Promise<StaffMember | null> {
  const key = email.trim().toLowerCase();
  const cached = staffByEmailCache.get(key);
  if (cached?.inflight) return cached.inflight;
  if (cached && Date.now() - cached.at < STAFF_BY_EMAIL_TTL_MS) {
    return cached.member;
  }

  const inflight = (async () => {
    const res = await fetch(
      `/api/admin/staff?email=${encodeURIComponent(key)}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("Failed to load staff member");
    const json = (await res.json()) as { member: StaffMember | null };
    staffByEmailCache.set(key, { member: json.member ?? null, at: Date.now() });
    return json.member ?? null;
  })().finally(() => {
    const next = staffByEmailCache.get(key);
    if (next) delete next.inflight;
  });

  staffByEmailCache.set(key, {
    member: cached?.member ?? null,
    at: cached?.at ?? 0,
    inflight,
  });
  return inflight;
}

export async function claimAdminViaApi(inviteCode: string): Promise<boolean> {
  const res = await fetch("/api/auth/claim-admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode }),
  });
  return res.ok;
}

export async function saveAdminStaffViaApi(input: StaffMemberInput): Promise<StaffMember> {
  const res = await fetch("/api/admin/staff", {
    method: input.id ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const payload = (await res.json()) as { error?: string };
    throw new Error(payload.error || "Failed to save staff member");
  }
  const json = (await res.json()) as { member: StaffMember };
  return json.member;
}

export async function deleteAdminStaffViaApi(id: string): Promise<boolean> {
  const res = await fetch(`/api/admin/staff?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const payload = (await res.json()) as { error?: string };
    throw new Error(payload.error || "Failed to remove staff member");
  }
  return true;
}

export type AdminStaffLoginResult =
  | { ok: true; member: StaffMember | null }
  | { ok: false; error: string };

export async function adminStaffLoginViaApi(
  email: string,
  password: string
): Promise<AdminStaffLoginResult> {
  const res = await fetch("/api/auth/admin-staff-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = (await res.json()) as AdminStaffLoginResult;
  if (!res.ok && "error" in json && json.ok === false) return json;
  if (!res.ok) return { ok: false, error: "Invalid email or password." };
  return json;
}
