import type { ExtraChargeCatalogItem } from "./extra-charges-catalog-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedExtraCharges() {
  return isSharedDbEnabled();
}

export async function fetchExtraChargesFromApi(): Promise<ExtraChargeCatalogItem[]> {
  const res = await fetch("/api/platform/extra-charges", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load extra charges");
  const json = (await res.json()) as { items: ExtraChargeCatalogItem[] };
  return json.items;
}

export async function saveExtraChargesToApi(
  items: ExtraChargeCatalogItem[]
): Promise<ExtraChargeCatalogItem[]> {
  const res = await fetch("/api/platform/extra-charges", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("Failed to save extra charges");
  const json = (await res.json()) as { items: ExtraChargeCatalogItem[] };
  return json.items;
}
