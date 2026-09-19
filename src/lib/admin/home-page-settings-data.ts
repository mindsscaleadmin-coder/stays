import type { AnnouncementBarItem, HomePageSettings } from "./home-page-settings-types";
import { emitSyncCustomEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-home-page-settings";
const HERO_BANNER_URL_KEY = "farm-stays-home-hero-banner-url";
const FAVICON_URL_KEY = "farm-stays-home-favicon-url";
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
      text: "New heritage stays now live in Kerala",
      enabled: true,
    },
    {
      id: "announce-4",
      emoji: "🔥",
      text: "Free BBQ setup on bookings above ₹ 5,000",
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

function isDataAssetUrl(url?: string | null): boolean {
  return typeof url === "string" && url.startsWith("data:");
}

function normalizeSettings(parsed: Partial<HomePageSettings>): HomePageSettings {
  return {
    announcementEnabled: parsed.announcementEnabled ?? true,
    announcementItems:
      parsed.announcementItems && parsed.announcementItems.length > 0
        ? parsed.announcementItems
        : DEFAULT_HOME_PAGE_SETTINGS.announcementItems,
    heroBanner: parsed.heroBanner ?? null,
    favicon: parsed.favicon ?? null,
  };
}

function stripHeavyAssetUrls(settings: HomePageSettings): HomePageSettings {
  return {
    ...settings,
    heroBanner: settings.heroBanner
      ? {
          ...settings.heroBanner,
          url: isDataAssetUrl(settings.heroBanner.url) ? "" : settings.heroBanner.url,
        }
      : null,
    favicon: settings.favicon
      ? {
          ...settings.favicon,
          url: isDataAssetUrl(settings.favicon.url) ? "" : settings.favicon.url,
        }
      : null,
  };
}

function persistAssetUrls(settings: HomePageSettings) {
  const heroUrl = settings.heroBanner?.url?.trim() ?? "";
  if (isDataAssetUrl(heroUrl)) {
    localStorage.setItem(HERO_BANNER_URL_KEY, heroUrl);
  } else {
    localStorage.removeItem(HERO_BANNER_URL_KEY);
  }

  const faviconUrl = settings.favicon?.url?.trim() ?? "";
  if (isDataAssetUrl(faviconUrl)) {
    localStorage.setItem(FAVICON_URL_KEY, faviconUrl);
  } else {
    localStorage.removeItem(FAVICON_URL_KEY);
  }
}

/** One-time migration: move embedded data URLs out of the main settings JSON blob. */
function migrateEmbeddedAssets(parsed: Partial<HomePageSettings>): HomePageSettings {
  let heroBanner = parsed.heroBanner ?? null;
  let favicon = parsed.favicon ?? null;
  let migrated = false;

  if (heroBanner?.url && isDataAssetUrl(heroBanner.url)) {
    localStorage.setItem(HERO_BANNER_URL_KEY, heroBanner.url);
    heroBanner = { ...heroBanner, url: "" };
    migrated = true;
  }
  if (favicon?.url && isDataAssetUrl(favicon.url)) {
    localStorage.setItem(FAVICON_URL_KEY, favicon.url);
    favicon = { ...favicon, url: "" };
    migrated = true;
  }

  const settings = normalizeSettings({
    ...parsed,
    heroBanner,
    favicon,
  });

  if (migrated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stripHeavyAssetUrls(settings)));
  }

  return settings;
}

/**
 * Fast settings load for global providers — avoids reading multi-MB data URLs on
 * every page (admin/host sidebars were stalling on JSON.parse).
 */
export function loadHomePageSettingsShell(): HomePageSettings {
  if (typeof window === "undefined") return DEFAULT_HOME_PAGE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOME_PAGE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<HomePageSettings>;
    const needsMigration =
      isDataAssetUrl(parsed.heroBanner?.url) || isDataAssetUrl(parsed.favicon?.url);
    if (needsMigration) {
      return stripHeavyAssetUrls(migrateEmbeddedAssets(parsed));
    }
    return stripHeavyAssetUrls(normalizeSettings(parsed));
  } catch {
    return DEFAULT_HOME_PAGE_SETTINGS;
  }
}

export function loadHeroBannerUrl(): string | null {
  if (typeof window === "undefined") return null;
  const shell = loadHomePageSettingsShell();
  if (!shell.heroBanner) return null;
  if (shell.heroBanner.url) return shell.heroBanner.url;
  return localStorage.getItem(HERO_BANNER_URL_KEY);
}

export function loadFaviconUrl(): string | null {
  if (typeof window === "undefined") return null;
  const shell = loadHomePageSettingsShell();
  if (!shell.favicon) return null;
  if (shell.favicon.url) return shell.favicon.url;
  return localStorage.getItem(FAVICON_URL_KEY);
}

/** Full settings including large asset URLs — use only on home/admin settings screens. */
export function loadHomePageSettings(): HomePageSettings {
  const shell = loadHomePageSettingsShell();
  const heroUrl = loadHeroBannerUrl();
  const faviconUrl = loadFaviconUrl();
  return {
    ...shell,
    heroBanner: shell.heroBanner
      ? { ...shell.heroBanner, url: heroUrl ?? shell.heroBanner.url }
      : heroUrl
        ? { url: heroUrl, updatedAt: new Date().toISOString() }
        : null,
    favicon: shell.favicon
      ? { ...shell.favicon, url: faviconUrl ?? shell.favicon.url }
      : faviconUrl
        ? { url: faviconUrl, updatedAt: new Date().toISOString() }
        : null,
  };
}

export function saveHomePageSettings(settings: HomePageSettings): void {
  if (typeof window === "undefined") return;
  persistAssetUrls(settings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stripHeavyAssetUrls(settings)));
  dispatchSync();
}

export function newAnnouncementItemId(): string {
  return `announce-${Date.now()}`;
}

export function getActiveAnnouncementItems(items: AnnouncementBarItem[]): AnnouncementBarItem[] {
  return items.filter((item) => item.enabled && item.text.trim());
}
