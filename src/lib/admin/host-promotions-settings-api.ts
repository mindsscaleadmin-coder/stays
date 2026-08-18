import type { HostPromotionsSettings } from "@/lib/host/host-promotions-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedPromotionCatalog() {
  return isSharedDbEnabled();
}

export async function fetchPromotionCatalogFromApi(): Promise<HostPromotionsSettings> {
  const res = await fetch("/api/platform/promotions-settings", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load promotion catalog");
  const data = (await res.json()) as { settings: HostPromotionsSettings };
  return data.settings;
}

export async function savePromotionCatalogToApi(
  settings: HostPromotionsSettings
): Promise<HostPromotionsSettings> {
  const res = await fetch("/api/platform/promotions-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to save promotion catalog");
  }
  const data = (await res.json()) as { settings: HostPromotionsSettings };
  return data.settings;
}
