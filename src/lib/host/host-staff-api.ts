import type { HostStaffMember, HostStaffMemberInput } from "./host-staff-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedHostStaff() {
  return isSharedDbEnabled();
}

export async function fetchHostStaffFromApi(
  hostId: string,
  owner?: { name: string; email: string } | null
): Promise<HostStaffMember[]> {
  const params = new URLSearchParams();
  if (owner?.name) params.set("ownerName", owner.name);
  if (owner?.email) params.set("ownerEmail", owner.email);
  const qs = params.toString();
  const res = await fetch(
    `/api/hosts/${encodeURIComponent(hostId)}/staff${qs ? `?${qs}` : ""}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to load host staff");
  const json = (await res.json()) as { staff: HostStaffMember[] };
  return json.staff;
}

export async function saveHostStaffViaApi(
  hostId: string,
  input: Omit<HostStaffMemberInput, "hostId">
): Promise<HostStaffMember> {
  const hasId = Boolean(input.id);
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/staff`, {
    method: hasId ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, hostId }),
  });
  if (!res.ok) {
    const payload = (await res.json()) as { error?: string };
    throw new Error(payload.error || "Failed to save staff member");
  }
  const json = (await res.json()) as { member: HostStaffMember };
  return json.member;
}

export async function deleteHostStaffViaApi(hostId: string, id: string): Promise<boolean> {
  const res = await fetch(
    `/api/hosts/${encodeURIComponent(hostId)}/staff?id=${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const payload = (await res.json()) as { error?: string };
    throw new Error(payload.error || "Failed to remove staff member");
  }
  return true;
}

export type HostStaffLoginResult =
  | {
      ok: true;
      staff: {
        id: string;
        hostId: string;
        name: string;
        email: string;
        role: string;
      };
    }
  | { ok: false; error: string };

export async function hostStaffLoginViaApi(
  email: string,
  password: string
): Promise<HostStaffLoginResult> {
  const res = await fetch("/api/auth/host-staff-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = (await res.json()) as HostStaffLoginResult;
  if (!res.ok && "error" in json && json.ok === false) return json;
  if (!res.ok) return { ok: false, error: "Invalid email or password." };
  return json;
}
