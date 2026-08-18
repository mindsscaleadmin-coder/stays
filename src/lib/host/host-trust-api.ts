import type { HostTrustData } from "./host-trust-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedHostTrust() {
  return isSharedDbEnabled();
}

export async function fetchHostTrustFromApi(hostId: string): Promise<HostTrustData> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/trust`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load host trust");
  const data = (await res.json()) as { trust: HostTrustData };
  return data.trust;
}

export async function patchHostTrustViaApi(
  hostId: string,
  body: Record<string, unknown>
): Promise<HostTrustData> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/trust`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update host trust");
  const data = (await res.json()) as { trust: HostTrustData };
  return data.trust;
}
