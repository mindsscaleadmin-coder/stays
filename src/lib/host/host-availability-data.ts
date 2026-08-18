import { HOST_LISTINGS } from "@/lib/mock/dashboard-data";
import type {
  ListingAvailabilitySettings,
  SeasonalPeriod,
} from "./host-availability-types";

import { emitSyncEvent } from "@/lib/emit-sync-event";
const STORAGE_KEY = "farm-stays-host-availability";
export const HOST_AVAILABILITY_SYNC_EVENT = "farm-stays-host-availability-updated";

const DEFAULT_SEASONAL: SeasonalPeriod[] = [
  {
    id: "season-harvest",
    name: "Harvest season — high demand",
    startDate: "2026-09-01",
    endDate: "2026-11-30",
    closed: false,
    note: "Minimum stay may apply. Book early for farm tours.",
  },
];

function defaultForListing(listingId: string): ListingAvailabilitySettings {
  return {
    listingId,
    blockedDates: [],
    // Demo seed only for mock listings — open by default so the calendar is interactive
    seasonalPeriods:
      listingId === "1" || listingId === "7"
        ? DEFAULT_SEASONAL.map((s) => ({ ...s }))
        : [],
    minStayNights: listingId === "9" ? 1 : 2,
    advanceNoticeDays: 1,
  };
}

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(HOST_AVAILABILITY_SYNC_EVENT);
}

function readAll(): Record<string, ListingAvailabilitySettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ListingAvailabilitySettings>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, ListingAvailabilitySettings>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  notify();
}

export function loadAllAvailabilitySettings(): ListingAvailabilitySettings[] {
  const map = readAll();
  const ids = new Set<string>(HOST_LISTINGS.map((l) => l.id));
  for (const key of Object.keys(map)) ids.add(key);

  return Array.from(ids).map((id) => {
    const stored = map[id];
    const defaults = defaultForListing(id);
    if (!stored) return defaults;
    return {
      ...defaults,
      ...stored,
      seasonalPeriods: (
        stored.seasonalPeriods?.length > 0 ? stored.seasonalPeriods : defaults.seasonalPeriods
      ).filter((p) => p.id !== "season-monsoon"),
    };
  });
}

export function getAvailabilitySettings(listingId: string): ListingAvailabilitySettings {
  const stored = readAll()[listingId];
  const defaults = defaultForListing(listingId);
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    seasonalPeriods: (
      stored.seasonalPeriods?.length > 0 ? stored.seasonalPeriods : defaults.seasonalPeriods
    ).filter((p) => p.id !== "season-monsoon"),
  };
}

export function saveAvailabilitySettings(settings: ListingAvailabilitySettings): void {
  const map = readAll();
  map[settings.listingId] = settings;
  writeAll(map);
}

export function newSeasonalPeriodId(): string {
  return `season-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function toggleBlockedDate(listingId: string, date: string): ListingAvailabilitySettings {
  const current = getAvailabilitySettings(listingId);
  const set = new Set(current.blockedDates);
  if (set.has(date)) set.delete(date);
  else set.add(date);
  const next = { ...current, blockedDates: Array.from(set).sort() };
  saveAvailabilitySettings(next);
  return next;
}

export function mergeImportedBlockedDates(
  listingId: string,
  imported: string[]
): ListingAvailabilitySettings {
  const current = getAvailabilitySettings(listingId);
  const merged = Array.from(new Set([...current.blockedDates, ...imported])).sort();
  const next = {
    ...current,
    blockedDates: merged,
    lastIcalImportAt: new Date().toISOString(),
  };
  saveAvailabilitySettings(next);
  return next;
}
