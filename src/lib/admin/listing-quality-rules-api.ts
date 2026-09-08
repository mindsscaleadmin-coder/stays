import { isSharedDbEnabled } from "@/lib/shared-db";
import type {
  ListingQualityRules,
  ListingQualityRulesStore,
} from "./listing-quality-rules-types";
import { normalizeListingQualityRulesStore } from "./listing-quality-rules-data";

export function shouldUseSharedQualityRules() {
  return isSharedDbEnabled();
}

export async function fetchListingQualityRulesStoreFromApi(): Promise<ListingQualityRulesStore> {
  const res = await fetch("/api/platform/listing-quality-rules", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load listing quality rules");
  const data = (await res.json()) as {
    store?: ListingQualityRulesStore;
    rules?: ListingQualityRules;
  };
  if (data.store) return normalizeListingQualityRulesStore(data.store);
  return normalizeListingQualityRulesStore(data.rules);
}

/** @deprecated Prefer fetchListingQualityRulesStoreFromApi */
export async function fetchListingQualityRulesFromApi(): Promise<ListingQualityRules> {
  const store = await fetchListingQualityRulesStoreFromApi();
  return store.fallback;
}

export async function saveListingQualityRulesStoreToApi(
  store: ListingQualityRulesStore
): Promise<ListingQualityRulesStore> {
  const res = await fetch("/api/platform/listing-quality-rules", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(store),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Failed to save listing quality rules");
  }
  const data = (await res.json()) as { store: ListingQualityRulesStore };
  return normalizeListingQualityRulesStore(data.store);
}

/** @deprecated Prefer saveListingQualityRulesStoreToApi */
export async function saveListingQualityRulesToApi(
  rules: ListingQualityRules
): Promise<ListingQualityRules> {
  const store = await saveListingQualityRulesStoreToApi({
    fallback: rules,
    byParentId: {},
  });
  return store.fallback;
}
