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
  DEFAULT_LISTING_SETTINGS,
  LISTING_SETTINGS_SYNC_EVENT,
  loadListingSettings,
  newListingFeatureIconId,
  newListingGuestReviewId,
  newListingHighlightId,
  newListingRatingCategoryId,
  saveListingSettings,
} from "@/lib/admin/listing-settings-data";
import type {
  ListingFeatureIcon,
  ListingFeatureIconInput,
  ListingGuestReview,
  ListingGuestReviewInput,
  ListingHighlight,
  ListingHighlightInput,
  ListingRatingCategory,
  ListingRatingCategoryInput,
  ListingSettings,
} from "@/lib/admin/listing-settings-types";

interface ListingSettingsContextValue {
  settings: ListingSettings;
  ready: boolean;
  enabledHighlights: ListingHighlight[];
  enabledFeatureIcons: ListingFeatureIcon[];
  enabledRatingCategories: ListingRatingCategory[];
  enabledGuestReviews: ListingGuestReview[];
  addHighlight: (input: ListingHighlightInput | ListingHighlightInput[]) => void;
  updateHighlight: (id: string, updates: Partial<ListingHighlightInput>) => void;
  removeHighlight: (id: string) => void;
  reorderHighlight: (id: string, direction: "up" | "down") => void;
  resetHighlights: () => void;
  addFeatureIcon: (input: ListingFeatureIconInput | ListingFeatureIconInput[]) => void;
  updateFeatureIcon: (id: string, updates: Partial<ListingFeatureIconInput>) => void;
  removeFeatureIcon: (id: string) => void;
  reorderFeatureIcon: (id: string, direction: "up" | "down") => void;
  resetFeatureIcons: () => void;
  addRatingCategory: (input: ListingRatingCategoryInput) => void;
  updateRatingCategory: (id: string, updates: Partial<ListingRatingCategoryInput>) => void;
  removeRatingCategory: (id: string) => void;
  reorderRatingCategory: (id: string, direction: "up" | "down") => void;
  resetRatingCategories: () => void;
  addGuestReview: (input: ListingGuestReviewInput) => void;
  updateGuestReview: (id: string, updates: Partial<ListingGuestReviewInput>) => void;
  removeGuestReview: (id: string) => void;
  reorderGuestReview: (id: string, direction: "up" | "down") => void;
  resetGuestReviews: () => void;
}

const ListingSettingsContext = createContext<ListingSettingsContextValue | null>(null);

function reorderList<T extends { id: string }>(
  list: T[],
  id: string,
  direction: "up" | "down"
): T[] {
  const index = list.findIndex((item) => item.id === id);
  if (index < 0) return list;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function ListingSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ListingSettings>(DEFAULT_LISTING_SETTINGS);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setSettings(loadListingSettings());
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);

    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-listing-settings") refresh();
    }

    window.addEventListener(LISTING_SETTINGS_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(LISTING_SETTINGS_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const persist = useCallback((updater: (prev: ListingSettings) => ListingSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      saveListingSettings(next);
      return next;
    });
  }, []);

  const addHighlight = useCallback(
    (input: ListingHighlightInput | ListingHighlightInput[]) => {
      const inputs = Array.isArray(input) ? input : [input];
      if (!inputs.length) return;
      persist((prev) => ({
        ...prev,
        highlights: [
          ...prev.highlights,
          ...inputs.map((entry) => ({ ...entry, id: newListingHighlightId() })),
        ],
      }));
    },
    [persist]
  );

  const updateHighlight = useCallback(
    (id: string, updates: Partial<ListingHighlightInput>) => {
      persist((prev) => ({
        ...prev,
        highlights: prev.highlights.map((h) => (h.id === id ? { ...h, ...updates } : h)),
      }));
    },
    [persist]
  );

  const removeHighlight = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        highlights: prev.highlights.filter((h) => h.id !== id),
      }));
    },
    [persist]
  );

  const reorderHighlight = useCallback(
    (id: string, direction: "up" | "down") => {
      persist((prev) => ({
        ...prev,
        highlights: reorderList(prev.highlights, id, direction),
      }));
    },
    [persist]
  );

  const resetHighlights = useCallback(() => {
    persist((prev) => ({
      ...prev,
      highlights: DEFAULT_LISTING_SETTINGS.highlights.map((h) => ({ ...h })),
    }));
  }, [persist]);

  const addFeatureIcon = useCallback(
    (input: ListingFeatureIconInput | ListingFeatureIconInput[]) => {
      const inputs = Array.isArray(input) ? input : [input];
      if (!inputs.length) return;
      persist((prev) => ({
        ...prev,
        featureIcons: [
          ...prev.featureIcons,
          ...inputs.map((entry) => ({ ...entry, id: newListingFeatureIconId() })),
        ],
      }));
    },
    [persist]
  );

  const updateFeatureIcon = useCallback(
    (id: string, updates: Partial<ListingFeatureIconInput>) => {
      persist((prev) => ({
        ...prev,
        featureIcons: prev.featureIcons.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      }));
    },
    [persist]
  );

  const removeFeatureIcon = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        featureIcons: prev.featureIcons.filter((f) => f.id !== id),
      }));
    },
    [persist]
  );

  const reorderFeatureIcon = useCallback(
    (id: string, direction: "up" | "down") => {
      persist((prev) => ({
        ...prev,
        featureIcons: reorderList(prev.featureIcons, id, direction),
      }));
    },
    [persist]
  );

  const resetFeatureIcons = useCallback(() => {
    persist((prev) => ({
      ...prev,
      featureIcons: DEFAULT_LISTING_SETTINGS.featureIcons.map((f) => ({ ...f })),
    }));
  }, [persist]);

  const addRatingCategory = useCallback(
    (input: ListingRatingCategoryInput) => {
      const item: ListingRatingCategory = { ...input, id: newListingRatingCategoryId() };
      persist((prev) => ({ ...prev, ratingCategories: [...prev.ratingCategories, item] }));
    },
    [persist]
  );

  const updateRatingCategory = useCallback(
    (id: string, updates: Partial<ListingRatingCategoryInput>) => {
      persist((prev) => ({
        ...prev,
        ratingCategories: prev.ratingCategories.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        ),
      }));
    },
    [persist]
  );

  const removeRatingCategory = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        ratingCategories: prev.ratingCategories.filter((r) => r.id !== id),
      }));
    },
    [persist]
  );

  const reorderRatingCategory = useCallback(
    (id: string, direction: "up" | "down") => {
      persist((prev) => ({
        ...prev,
        ratingCategories: reorderList(prev.ratingCategories, id, direction),
      }));
    },
    [persist]
  );

  const resetRatingCategories = useCallback(() => {
    persist((prev) => ({
      ...prev,
      ratingCategories: DEFAULT_LISTING_SETTINGS.ratingCategories.map((r) => ({ ...r })),
    }));
  }, [persist]);

  const addGuestReview = useCallback(
    (input: ListingGuestReviewInput) => {
      const item: ListingGuestReview = { ...input, id: newListingGuestReviewId() };
      persist((prev) => ({ ...prev, guestReviews: [...prev.guestReviews, item] }));
    },
    [persist]
  );

  const updateGuestReview = useCallback(
    (id: string, updates: Partial<ListingGuestReviewInput>) => {
      persist((prev) => ({
        ...prev,
        guestReviews: prev.guestReviews.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      }));
    },
    [persist]
  );

  const removeGuestReview = useCallback(
    (id: string) => {
      persist((prev) => ({
        ...prev,
        guestReviews: prev.guestReviews.filter((r) => r.id !== id),
      }));
    },
    [persist]
  );

  const reorderGuestReview = useCallback(
    (id: string, direction: "up" | "down") => {
      persist((prev) => ({
        ...prev,
        guestReviews: reorderList(prev.guestReviews, id, direction),
      }));
    },
    [persist]
  );

  const resetGuestReviews = useCallback(() => {
    persist((prev) => ({
      ...prev,
      guestReviews: DEFAULT_LISTING_SETTINGS.guestReviews.map((r) => ({ ...r })),
    }));
  }, [persist]);

  return (
    <ListingSettingsContext.Provider
      value={{
        settings,
        ready,
        enabledHighlights: settings.highlights.filter((h) => h.enabled),
        enabledFeatureIcons: settings.featureIcons.filter((f) => f.enabled),
        enabledRatingCategories: settings.ratingCategories.filter((r) => r.enabled),
        enabledGuestReviews: settings.guestReviews.filter((r) => r.enabled),
        addHighlight,
        updateHighlight,
        removeHighlight,
        reorderHighlight,
        resetHighlights,
        addFeatureIcon,
        updateFeatureIcon,
        removeFeatureIcon,
        reorderFeatureIcon,
        resetFeatureIcons,
        addRatingCategory,
        updateRatingCategory,
        removeRatingCategory,
        reorderRatingCategory,
        resetRatingCategories,
        addGuestReview,
        updateGuestReview,
        removeGuestReview,
        reorderGuestReview,
        resetGuestReviews,
      }}
    >
      {children}
    </ListingSettingsContext.Provider>
  );
}

export function useListingSettings() {
  const ctx = useContext(ListingSettingsContext);
  if (!ctx) {
    throw new Error("useListingSettings must be used within ListingSettingsProvider");
  }
  return ctx;
}
