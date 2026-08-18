import type {
  ExtraChargeBilling,
  ExtraChargeCatalogItem,
  ExtraChargeCatalogItemInput,
} from "./extra-charges-catalog-types";

import { emitSyncEvent } from "@/lib/emit-sync-event";
const STORAGE_KEY = "farm-stays-extra-charges-catalog";
export const EXTRA_CHARGES_CATALOG_SYNC_EVENT = "farm-stays-extra-charges-catalog-updated";

export const DEFAULT_EXTRA_CHARGES_CATALOG: ExtraChargeCatalogItem[] = [
  {
    id: "ec-cat-breakfast",
    label: "Breakfast (per person)",
    defaultAmount: 45,
    defaultBilling: "per_night",
    enabled: true,
  },
  {
    id: "ec-cat-bbq",
    label: "BBQ setup",
    defaultAmount: 120,
    defaultBilling: "per_stay",
    enabled: true,
  },
  {
    id: "ec-cat-airport",
    label: "Airport transfer",
    defaultAmount: 200,
    defaultBilling: "per_stay",
    enabled: true,
  },
  {
    id: "ec-cat-cleaning",
    label: "Deep cleaning",
    defaultAmount: 150,
    defaultBilling: "per_stay",
    enabled: true,
  },
  {
    id: "ec-cat-day-use",
    label: "Day-use facility fee",
    defaultAmount: 80,
    defaultBilling: "per_day",
    enabled: true,
  },
];

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(EXTRA_CHARGES_CATALOG_SYNC_EVENT);
}

export function newExtraChargeCatalogId(): string {
  return `ec-cat-${Date.now()}`;
}

export function loadExtraChargesCatalog(): ExtraChargeCatalogItem[] {
  if (typeof window === "undefined") return DEFAULT_EXTRA_CHARGES_CATALOG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EXTRA_CHARGES_CATALOG;
    const parsed = JSON.parse(raw) as ExtraChargeCatalogItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_EXTRA_CHARGES_CATALOG;
    return parsed.map(normalizeCatalogItem);
  } catch {
    return DEFAULT_EXTRA_CHARGES_CATALOG;
  }
}

function normalizeCatalogItem(item: ExtraChargeCatalogItem): ExtraChargeCatalogItem {
  const billing: ExtraChargeBilling =
    item.defaultBilling === "per_day" ||
    item.defaultBilling === "per_night" ||
    item.defaultBilling === "per_stay"
      ? item.defaultBilling
      : "per_stay";
  return {
    id: item.id,
    label: item.label,
    defaultAmount: Math.max(0, Number(item.defaultAmount) || 0),
    defaultBilling: billing,
    enabled: item.enabled !== false,
  };
}

export function saveExtraChargesCatalog(items: ExtraChargeCatalogItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(normalizeCatalogItem)));
  notify();
}

export function enabledExtraChargeCatalogItems(
  items: ExtraChargeCatalogItem[] = loadExtraChargesCatalog()
): ExtraChargeCatalogItem[] {
  return items.filter((i) => i.enabled);
}

export function createCatalogItem(input: ExtraChargeCatalogItemInput): ExtraChargeCatalogItem {
  return normalizeCatalogItem({
    ...input,
    id: newExtraChargeCatalogId(),
  });
}
