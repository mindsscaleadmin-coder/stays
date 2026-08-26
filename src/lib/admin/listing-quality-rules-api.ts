import { isSharedDbEnabled } from "@/lib/shared-db";
import type { ListingQualityRules } from "./listing-quality-rules-types";

export function shouldUseSharedQualityRules() {
  return isSharedDbEnabled();
}

export async function fetchListingQualityRulesFromApi(): Promise<ListingQualityRules> {
  const res = await fetch("/api/platform/listing-quality-rules", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load listing quality rules");
  const data = (await res.json()) as { rules: ListingQualityRules };
  return data.rules;
}

export async function saveListingQualityRulesToApi(
  rules: ListingQualityRules
): Promise<ListingQualityRules> {
  const res = await fetch("/api/platform/listing-quality-rules", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rules),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to save listing quality rules");
  }
  const data = (await res.json()) as { rules: ListingQualityRules };
  return data.rules;
}
