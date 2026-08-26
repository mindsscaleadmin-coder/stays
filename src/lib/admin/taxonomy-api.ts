import type { TaxonomyData } from "./taxonomy-types";
import { normalizeTaxonomy } from "./taxonomy-data";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedTaxonomy() {
  return isSharedDbEnabled();
}

export async function fetchTaxonomyFromApi(): Promise<TaxonomyData> {
  const res = await fetch("/api/platform/taxonomy", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load taxonomy");
  const json = (await res.json()) as { data: TaxonomyData };
  return normalizeTaxonomy(json.data);
}

export async function saveTaxonomyToApi(data: TaxonomyData): Promise<TaxonomyData> {
  const res = await fetch("/api/platform/taxonomy", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(json?.error || `Could not save country (${res.status})`);
  }
  const json = (await res.json()) as { data: TaxonomyData };
  return json.data;
}
