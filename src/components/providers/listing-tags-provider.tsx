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
  DEFAULT_LISTING_TAGS,
  LISTING_TAGS_SYNC_EVENT,
  addListingTag,
  getEnabledTagLabels,
  loadListingTags,
  removeListingTag,
  resetListingTagGroup,
  saveListingTags,
  updateListingTag,
} from "@/lib/admin/listing-tags-data";
import type {
  ListingTagGroup,
  ListingTagInput,
  ListingTagsCatalog,
} from "@/lib/admin/listing-tags-types";

interface ListingTagsContextValue {
  catalog: ListingTagsCatalog;
  ready: boolean;
  farmTypeOptions: string[];
  activityOptions: string[];
  amenityOptions: string[];
  addTag: (group: ListingTagGroup, input: ListingTagInput) => void;
  updateTag: (group: ListingTagGroup, id: string, updates: Partial<ListingTagInput>) => void;
  removeTag: (group: ListingTagGroup, id: string) => void;
  resetGroup: (group: ListingTagGroup) => void;
}

const ListingTagsContext = createContext<ListingTagsContextValue | null>(null);

export function ListingTagsProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<ListingTagsCatalog>(DEFAULT_LISTING_TAGS);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setCatalog(loadListingTags());
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);

    function onSync() {
      refresh();
    }

    window.addEventListener(LISTING_TAGS_SYNC_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(LISTING_TAGS_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [refresh]);

  const apply = useCallback((next: ListingTagsCatalog) => {
    saveListingTags(next);
    setCatalog(next);
  }, []);

  const value: ListingTagsContextValue = {
    catalog,
    ready,
    farmTypeOptions: getEnabledTagLabels("farmTypes", catalog),
    activityOptions: getEnabledTagLabels("activities", catalog),
    amenityOptions: getEnabledTagLabels("amenities", catalog),
    addTag: (group, input) => apply(addListingTag(catalog, group, input)),
    updateTag: (group, id, updates) => apply(updateListingTag(catalog, group, id, updates)),
    removeTag: (group, id) => apply(removeListingTag(catalog, group, id)),
    resetGroup: (group) => apply(resetListingTagGroup(catalog, group)),
  };

  return <ListingTagsContext.Provider value={value}>{children}</ListingTagsContext.Provider>;
}

export function useListingTags() {
  const ctx = useContext(ListingTagsContext);
  if (!ctx) throw new Error("useListingTags must be used within ListingTagsProvider");
  return ctx;
}
