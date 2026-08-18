import type { AnnouncementBarItem, HomePageSettings } from "./home-page-settings-types";
import { emitSyncCustomEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-home-page-settings";
export const HOME_PAGE_SETTINGS_SYNC_EVENT = "farm-stays-home-page-settings-updated";

export const DEFAULT_HOME_PAGE_SETTINGS: HomePageSettings = {
  announcementEnabled: true,
  announcementItems: [
    {
      id: "announce-1",
      emoji: "🌞",
      text: "Summer Offer: Save up to 25% on selected Farm Stays",
      enabled: true,
    },
    {
      id: "announce-2",
      emoji: "👥",
      text: "126 guests booked today",
      enabled: true,
    },
    {
      id: "announce-3",
      emoji: "✨",
      text: "Now Luxury Farmhouses added in Al Ain",
      enabled: true,
    },
    {
      id: "announce-4",
      emoji: "🔥",
      text: "Free BBQ Setup on bookings above AED 1,000",
      enabled: true,
    },
  ],
  heroBanner: null,
  favicon: null,
};

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(HOME_PAGE_SETTINGS_SYNC_EVENT);
  }
}

export function loadHomePageSettings(): HomePageSettings {
  if (typeof window === "undefined") return DEFAULT_HOME_PAGE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOME_PAGE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<HomePageSettings>;
    return {
      announcementEnabled: parsed.announcementEnabled ?? true,
      announcementItems:
        parsed.announcementItems && parsed.announcementItems.length > 0
          ? parsed.announcementItems
          : DEFAULT_HOME_PAGE_SETTINGS.announcementItems,
      heroBanner: parsed.heroBanner ?? null,
      favicon: parsed.favicon ?? null,
    };
  } catch {
    return DEFAULT_HOME_PAGE_SETTINGS;
  }
}

export function saveHomePageSettings(settings: HomePageSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  dispatchSync();
}

export function newAnnouncementItemId(): string {
  return `announce-${Date.now()}`;
}

export function getActiveAnnouncementItems(items: AnnouncementBarItem[]): AnnouncementBarItem[] {
  return items.filter((item) => item.enabled && item.text.trim());
}
