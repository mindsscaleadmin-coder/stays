"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_HOME_PAGE_SETTINGS,
  HOME_PAGE_SETTINGS_SYNC_EVENT,
  loadHomePageSettings,
  loadHomePageSettingsShell,
  newAnnouncementItemId,
  saveHomePageSettings,
} from "@/lib/admin/home-page-settings-data";
import type {
  AnnouncementBarItem,
  AnnouncementBarItemInput,
  HomePageBanner,
  HomePageSettings,
} from "@/lib/admin/home-page-settings-types";

interface HomePageSettingsContextValue {
  settings: HomePageSettings;
  ready: boolean;
  setAnnouncementEnabled: (enabled: boolean) => void;
  addAnnouncementItem: (input: AnnouncementBarItemInput) => void;
  updateAnnouncementItem: (id: string, updates: Partial<AnnouncementBarItemInput>) => void;
  removeAnnouncementItem: (id: string) => void;
  reorderAnnouncementItem: (id: string, direction: "up" | "down") => void;
  resetAnnouncementItems: () => void;
  setHeroBanner: (banner: HomePageBanner | null) => void;
  removeHeroBanner: () => void;
  setFavicon: (favicon: HomePageBanner | null) => void;
  removeFavicon: () => void;
}

const HomePageSettingsContext = createContext<HomePageSettingsContextValue | null>(null);

export function HomePageSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_HOME_PAGE_SETTINGS);
  const [ready, setReady] = useState(false);

  const refresh = useCallback((full = false) => {
    setSettings(full ? loadHomePageSettings() : loadHomePageSettingsShell());
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);

    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-home-page-settings") refresh();
    }

    function onHomePageSettingsSync() {
      refresh();
    }

    window.addEventListener(HOME_PAGE_SETTINGS_SYNC_EVENT, onHomePageSettingsSync);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(HOME_PAGE_SETTINGS_SYNC_EVENT, onHomePageSettingsSync);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const persist = useCallback((updater: (prev: HomePageSettings) => HomePageSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      saveHomePageSettings(next);
      return next;
    });
  }, []);

  const setAnnouncementEnabled = useCallback(
    (enabled: boolean) => {
      persist((prev) => ({ ...prev, announcementEnabled: enabled }));
    },
    [persist]
  );

  const addAnnouncementItem = useCallback(
    (input: AnnouncementBarItemInput) => {
      const item: AnnouncementBarItem = { ...input, id: newAnnouncementItemId() };
      persist((prev) => ({
        ...prev,
        announcementItems: [...prev.announcementItems, item],
      }));
    },
    [persist]
  );

  const updateAnnouncementItem = useCallback(
    (id: string, updates: Partial<AnnouncementBarItemInput>) => {
      persist((prev) => ({
        ...prev,
        announcementItems: prev.announcementItems.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));
    },
    [persist]
  );

  const removeAnnouncementItem = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        announcementItems: prev.announcementItems.filter((item) => item.id !== id),
      }));
    },
    [persist]
  );

  const reorderAnnouncementItem = useCallback(
    (id: string, direction: "up" | "down") => {
      persist((prev) => {
        const items = [...prev.announcementItems];
        const index = items.findIndex((item) => item.id === id);
        if (index === -1) return prev;
        const swapWith = direction === "up" ? index - 1 : index + 1;
        if (swapWith < 0 || swapWith >= items.length) return prev;
        [items[index], items[swapWith]] = [items[swapWith], items[index]];
        return { ...prev, announcementItems: items };
      });
    },
    [persist]
  );

  const resetAnnouncementItems = useCallback(() => {
    persist((prev) => ({
      ...prev,
      announcementItems: DEFAULT_HOME_PAGE_SETTINGS.announcementItems,
    }));
  }, [persist]);

  const setHeroBanner = useCallback(
    (banner: HomePageBanner | null) => {
      persist((prev) => ({ ...prev, heroBanner: banner }));
    },
    [persist]
  );

  const removeHeroBanner = useCallback(() => {
    persist((prev) => ({ ...prev, heroBanner: null }));
  }, [persist]);

  const setFavicon = useCallback(
    (favicon: HomePageBanner | null) => {
      persist((prev) => ({ ...prev, favicon }));
    },
    [persist]
  );

  const removeFavicon = useCallback(() => {
    persist((prev) => ({ ...prev, favicon: null }));
  }, [persist]);

  return (
    <HomePageSettingsContext.Provider
      value={{
        settings,
        ready,
        setAnnouncementEnabled,
        addAnnouncementItem,
        updateAnnouncementItem,
        removeAnnouncementItem,
        reorderAnnouncementItem,
        resetAnnouncementItems,
        setHeroBanner,
        removeHeroBanner,
        setFavicon,
        removeFavicon,
      }}
    >
      {children}
    </HomePageSettingsContext.Provider>
  );
}

export function useHomePageSettings() {
  const ctx = useContext(HomePageSettingsContext);
  if (!ctx) {
    throw new Error("useHomePageSettings must be used within HomePageSettingsProvider");
  }
  return ctx;
}
