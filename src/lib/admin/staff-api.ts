import type { StaffMember, StaffMemberInput } from "./staff-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedAdminStaff() {
  return isSharedDbEnabled();
}

export async function fetchAdminStaffFromApi(): Promise<StaffMember[]> {
  const res = await fetch("/api/admin/staff", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load admin staff");
  const json = (await res.json()) as { staff: StaffMember[] };
  return json.staff;
}

export async function fetchAdminStaffByEmailFromApi(
  email: string
): Promise<StaffMember | null> {
  const res = await fetch(
    `/api/admin/staff?email=${encodeURIComponent(email)}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to load staff member");
  const json = (await res.json()) as { member: StaffMember | null };
  return json.member;
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
