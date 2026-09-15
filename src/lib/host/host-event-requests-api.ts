import type { EventAvailabilityRequest } from "@/lib/events/event-availability-types";
import { saveHostEventRequests } from "./host-event-requests-data";

const HOST_EVENT_REQUESTS_PULL_TTL_MS = 8_000;

const eventRequestsPull = new Map<
  string,
  {
    rows: EventAvailabilityRequest[] | null;
    at: number;
    inflight?: Promise<EventAvailabilityRequest[]>;
  }
>();

export async function fetchHostEventRequestsFromApi(
  hostId: string,
  force = false
): Promise<EventAvailabilityRequest[]> {
  const cached = eventRequestsPull.get(hostId);
  if (!force && cached?.inflight) return cached.inflight;
  if (!force && cached && Date.now() - cached.at < HOST_EVENT_REQUESTS_PULL_TTL_MS) {
    return cached.rows ?? [];
  }

  const inflight = (async () => {
    try {
      const res = await fetch(
        `/api/event-requests?role=host&hostId=${encodeURIComponent(hostId)}`
      );
      if (!res.ok) return cached?.rows ?? loadCachedFromStorage(hostId);
      const data = (await res.json()) as { requests?: EventAvailabilityRequest[] };
      const rows = Array.isArray(data.requests) ? data.requests : [];
      saveHostEventRequests(hostId, rows);
      eventRequestsPull.set(hostId, { rows, at: Date.now() });
      return rows;
    } catch {
      return cached?.rows ?? loadCachedFromStorage(hostId);
    }
  })();

  eventRequestsPull.set(hostId, {
    rows: cached?.rows ?? null,
    at: cached?.at ?? 0,
    inflight,
  });
  return inflight;
}

function loadCachedFromStorage(hostId: string): EventAvailabilityRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("farm-stays-host-event-requests");
    if (!raw) return [];
    const store = JSON.parse(raw) as Record<string, EventAvailabilityRequest[]>;
    return Array.isArray(store[hostId]) ? store[hostId] : [];
  } catch {
    return [];
  }
}
