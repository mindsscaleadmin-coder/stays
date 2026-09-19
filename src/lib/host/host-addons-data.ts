import type { FarmActivity, FarmProduct, HostAddonsData } from "./host-addons-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";
import { LAUNCH_CURRENCY } from "@/lib/tax/launch-market";

const STORAGE_KEY = "farm-stays-host-addons";
export const HOST_ADDONS_SYNC_EVENT = "farm-stays-host-addons-updated";

export function defaultHostAddons(hostId: string): HostAddonsData {
  return {
    hostId,
    activities: [
      {
        id: "act-1",
        name: "Sunrise farm walk",
        description: "Guided tour through groves and livestock pens.",
        price: 75,
        currency: LAUNCH_CURRENCY,
        duration: "90 min",
        enabled: true,
      },
      {
        id: "act-2",
        name: "Farm-to-table dinner",
        description: "Seasonal menu with produce from the property.",
        price: 180,
        currency: LAUNCH_CURRENCY,
        duration: "2 hrs",
        enabled: true,
      },
      {
        id: "act-3",
        name: "Milking & feeding experience",
        description: "Hands-on session with goats and chickens.",
        price: 55,
        currency: LAUNCH_CURRENCY,
        duration: "45 min",
        enabled: false,
      },
    ],
    products: [
      {
        id: "prod-1",
        name: "Farm honey (500g)",
        description: "Raw honey from on-site hives.",
        price: 45,
        currency: LAUNCH_CURRENCY,
        unit: "jar",
        inStock: true,
      },
      {
        id: "prod-2",
        name: "Date pickle",
        description: "House recipe, small batch.",
        price: 28,
        currency: LAUNCH_CURRENCY,
        unit: "jar",
        inStock: true,
      },
    ],
    weatherAdvisories: [
      {
        id: "wx-1",
        date: "2026-07-21",
        severity: "warning",
        title: "High heat advisory",
        message: "Afternoon temperatures may exceed 44°C. Outdoor activities before 10 AM recommended.",
        affectsActivities: ["Sunrise farm walk", "Milking & feeding experience"],
      },
      {
        id: "wx-2",
        date: "2026-07-22",
        severity: "info",
        title: "Clear skies",
        message: "Ideal conditions for evening farm walks and stargazing.",
        affectsActivities: ["Sunrise farm walk"],
      },
    ],
  };
}

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(HOST_ADDONS_SYNC_EVENT);
}

function sanitizeAddonsRecord(data: HostAddonsData): { data: HostAddonsData; changed: boolean } {
  let changed = false;
  const activities = (data.activities ?? []).map((a) => {
    if (a.currency === "AED") {
      changed = true;
      return { ...a, currency: LAUNCH_CURRENCY };
    }
    return a;
  });
  const products = (data.products ?? []).map((p) => {
    if (p.currency === "AED") {
      changed = true;
      return { ...p, currency: LAUNCH_CURRENCY };
    }
    return p;
  });
  return {
    data: changed ? { ...data, activities, products } : data,
    changed,
  };
}

function readAll(): Record<string, HostAddonsData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, HostAddonsData>;
    let anyChanged = false;
    const sanitized: Record<string, HostAddonsData> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const { data, changed } = sanitizeAddonsRecord(v);
      sanitized[k] = data;
      if (changed) anyChanged = true;
    }
    if (anyChanged) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, HostAddonsData>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  notify();
}

export function loadHostAddons(hostId: string): HostAddonsData {
  const stored = readAll()[hostId];
  if (!stored) return defaultHostAddons(hostId);
  return { ...defaultHostAddons(hostId), ...stored, hostId };
}

export function saveHostAddons(data: HostAddonsData): void {
  const map = readAll();
  map[data.hostId] = data;
  writeAll(map);
}

export function toggleActivity(hostId: string, id: string): HostAddonsData {
  const data = loadHostAddons(hostId);
  const activities = data.activities.map((a) =>
    a.id === id ? { ...a, enabled: !a.enabled } : a
  );
  const next = { ...data, activities };
  saveHostAddons(next);
  return next;
}

export function toggleProductStock(hostId: string, id: string): HostAddonsData {
  const data = loadHostAddons(hostId);
  const products = data.products.map((p) =>
    p.id === id ? { ...p, inStock: !p.inStock } : p
  );
  const next = { ...data, products };
  saveHostAddons(next);
  return next;
}

export function newActivityId(): string {
  return `act-${Date.now()}`;
}

export function newProductId(): string {
  return `prod-${Date.now()}`;
}

export function addActivity(hostId: string, input: Omit<FarmActivity, "id">): HostAddonsData {
  const data = loadHostAddons(hostId);
  const next = {
    ...data,
    activities: [...data.activities, { ...input, id: newActivityId() }],
  };
  saveHostAddons(next);
  return next;
}

export function addProduct(hostId: string, input: Omit<FarmProduct, "id">): HostAddonsData {
  const data = loadHostAddons(hostId);
  const next = {
    ...data,
    products: [...data.products, { ...input, id: newProductId() }],
  };
  saveHostAddons(next);
  return next;
}
