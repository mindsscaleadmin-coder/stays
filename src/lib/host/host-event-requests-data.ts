import type { EventAvailabilityRequest } from "@/lib/events/event-availability-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-host-event-requests";
export const HOST_EVENT_REQUESTS_SYNC_EVENT = "farm-stays-host-event-requests-updated";

type HostEventRequestsStore = Record<string, EventAvailabilityRequest[]>;

function readStore(): HostEventRequestsStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as HostEventRequestsStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function loadHostEventRequests(hostId: string): EventAvailabilityRequest[] {
  return readStore()[hostId] ?? [];
}

export function saveHostEventRequests(
  hostId: string,
  requests: EventAvailabilityRequest[]
): EventAvailabilityRequest[] {
  if (typeof window === "undefined") return requests;
  const store = readStore();
  store[hostId] = requests;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  emitSyncEvent(HOST_EVENT_REQUESTS_SYNC_EVENT);
  return requests;
}
