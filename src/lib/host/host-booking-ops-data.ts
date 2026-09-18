import type { HostBookingOpsRecord } from "@/lib/host/host-ops-types";

const STORAGE_KEY = "host-booking-ops-v1";

type Store = Record<string, HostBookingOpsRecord>;

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
}

function localKey(hostId: string, bookingId: string) {
  return `${hostId}:booking:${bookingId}`;
}

export function loadLocalBookingOps(
  hostId: string,
  bookingId: string
): HostBookingOpsRecord | null {
  const row = loadStore()[localKey(hostId, bookingId)];
  return row ?? null;
}

export function saveLocalBookingOps(
  hostId: string,
  bookingId: string,
  patch: Partial<Pick<HostBookingOpsRecord, "assignedStaffId" | "privateNotes">>
): HostBookingOpsRecord {
  const store = loadStore();
  const key = localKey(hostId, bookingId);
  const existing = store[key];
  const now = new Date().toISOString();
  const next: HostBookingOpsRecord = {
    id: existing?.id ?? `local-ops-${bookingId}`,
    hostId,
    sourceType: "booking",
    sourceId: bookingId,
    assignedStaffId:
      patch.assignedStaffId !== undefined
        ? patch.assignedStaffId
        : (existing?.assignedStaffId ?? null),
    privateNotes:
      patch.privateNotes !== undefined ? patch.privateNotes : (existing?.privateNotes ?? null),
    completedAt: existing?.completedAt ?? null,
    updatedAt: now,
  };
  store[key] = next;
  saveStore(store);
  return next;
}
