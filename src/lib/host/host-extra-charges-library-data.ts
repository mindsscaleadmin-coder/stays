import { emitSyncEvent } from "@/lib/emit-sync-event";
import type { ExtraChargeBilling } from "@/lib/admin/extra-charges-catalog-types";
import type { HostExtraChargeTemplate } from "./host-extra-charges-library-types";

const STORAGE_KEY = "farm-stays-host-extra-library";
export const HOST_EXTRA_LIBRARY_SYNC_EVENT = "farm-stays-host-extra-library-updated";

type Store = Record<string, HostExtraChargeTemplate[]>;

function notify() {
  emitSyncEvent(HOST_EXTRA_LIBRARY_SYNC_EVENT);
}

function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStore(store: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  notify();
}

function newLibraryId() {
  return `hx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function loadHostExtraLibrary(hostId: string): HostExtraChargeTemplate[] {
  if (!hostId) return [];
  const store = loadStore();
  if (!store[hostId]) {
    store[hostId] = [];
    saveStore(store);
  }
  return store[hostId];
}

export function saveHostExtraLibrary(hostId: string, items: HostExtraChargeTemplate[]) {
  if (!hostId) return;
  const store = loadStore();
  store[hostId] = items;
  saveStore(store);
}

export function addHostExtraTemplate(
  hostId: string,
  input: { label: string; amount: number; billing: ExtraChargeBilling }
): HostExtraChargeTemplate | null {
  const label = input.label.trim();
  if (!hostId || !label) return null;
  const items = loadHostExtraLibrary(hostId);
  if (items.some((i) => i.label.toLowerCase() === label.toLowerCase())) {
    return null;
  }
  const item: HostExtraChargeTemplate = {
    id: newLibraryId(),
    label,
    amount: Math.max(0, input.amount),
    billing: input.billing,
  };
  saveHostExtraLibrary(hostId, [...items, item]);
  return item;
}

export function updateHostExtraTemplate(
  hostId: string,
  id: string,
  patch: Partial<Pick<HostExtraChargeTemplate, "label" | "amount" | "billing">>
): boolean {
  const items = loadHostExtraLibrary(hostId);
  const next = items.map((item) => {
    if (item.id !== id) return item;
    return {
      ...item,
      label: patch.label?.trim() || item.label,
      amount: patch.amount !== undefined ? Math.max(0, patch.amount) : item.amount,
      billing: patch.billing ?? item.billing,
    };
  });
  if (next.every((item, i) => item === items[i])) return false;
  saveHostExtraLibrary(hostId, next);
  return true;
}

export function deleteHostExtraTemplate(hostId: string, id: string): boolean {
  const items = loadHostExtraLibrary(hostId);
  const next = items.filter((i) => i.id !== id);
  if (next.length === items.length) return false;
  saveHostExtraLibrary(hostId, next);
  return true;
}
