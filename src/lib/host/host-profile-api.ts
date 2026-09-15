import type { HostPublicProfile, HostPublicProfileInput } from "@/lib/host/host-profile-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

const HOST_PROFILE_PULL_TTL_MS = 30_000;
const hostProfilePull = new Map<
  string,
  {
    profile: HostPublicProfile | null;
    at: number;
    inflight?: Promise<HostPublicProfile | null>;
  }
>();

export function invalidateHostProfileCache(hostId?: string) {
  if (hostId) hostProfilePull.delete(hostId);
  else hostProfilePull.clear();
}

export async function fetchHostProfileFromApi(
  hostId: string,
  force = false
): Promise<HostPublicProfile | null> {
  const cached = hostProfilePull.get(hostId);
  if (!force && cached?.inflight) {
    return cached.inflight;
  }
  if (!force && cached && Date.now() - cached.at < HOST_PROFILE_PULL_TTL_MS) {
    return cached.profile;
  }

  const inflight = (async () => {
    const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/profile`, {
      cache: "no-store",
    });
    if (res.status === 404) {
      hostProfilePull.set(hostId, { profile: null, at: Date.now() });
      return null;
    }
    if (!res.ok) throw new Error("Failed to load host profile");
    const data = (await res.json()) as { profile: HostPublicProfile };
    hostProfilePull.set(hostId, { profile: data.profile, at: Date.now() });
    return data.profile;
  })().catch((error) => {
    hostProfilePull.delete(hostId);
    throw error;
  });

  hostProfilePull.set(hostId, {
    profile: cached?.profile ?? null,
    at: cached?.at ?? 0,
    inflight,
  });
  return inflight;
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
  invalidateHostProfileCache(hostId);
  return data.profile;
}

export function shouldUseSharedHostProfile() {
  return isSharedDbEnabled();
}
