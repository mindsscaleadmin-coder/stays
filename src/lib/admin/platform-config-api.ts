import type { PlatformConfig } from "@/lib/admin/platform-config-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export async function fetchPlatformConfigFromApi(admin = false): Promise<PlatformConfig> {
  const url = admin ? "/api/platform/config?admin=1" : "/api/platform/config";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load platform config");
  const data = (await res.json()) as { config: PlatformConfig };
  return data.config;
}

export async function savePlatformConfigToApi(
  config: PlatformConfig
): Promise<PlatformConfig> {
  const res = await fetch("/api/platform/config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to save platform config");
  }
  const data = (await res.json()) as { config: PlatformConfig };
  return data.config;
}

export function shouldUseSharedPlatformConfig() {
  return isSharedDbEnabled();
}
