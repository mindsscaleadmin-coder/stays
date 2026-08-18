import type { HostPublicProfile, HostPublicProfileInput } from "@/lib/host/host-profile-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export async function fetchHostProfileFromApi(
  hostId: string
): Promise<HostPublicProfile | null> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/profile`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load host profile");
  const data = (await res.json()) as { profile: HostPublicProfile };
  return data.profile;
}

export async function saveHostProfileToApi(
  hostId: string,
  input: HostPublicProfileInput
): Promise<HostPublicProfile> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to save host profile");
  }
  const data = (await res.json()) as { profile: HostPublicProfile };
  return data.profile;
}

export function shouldUseSharedHostProfile() {
  return isSharedDbEnabled();
}
