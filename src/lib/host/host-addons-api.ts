import type { HostAddonsData } from "./host-addons-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedHostAddons() {
  return isSharedDbEnabled();
}

export async function fetchHostAddonsFromApi(hostId: string): Promise<HostAddonsData> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/addons`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load add-ons");
  const json = (await res.json()) as { data: HostAddonsData };
  return json.data;
}

export async function saveHostAddonsViaApi(data: HostAddonsData): Promise<HostAddonsData> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(data.hostId)}/addons`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error("Failed to save add-ons");
  const json = (await res.json()) as { data: HostAddonsData };
  return json.data;
}
