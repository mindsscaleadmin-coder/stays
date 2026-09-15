"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createPhotoTagItem,
  DEFAULT_PHOTO_TAGS_CATALOG,
  PHOTO_TAGS_CATALOG_SYNC_EVENT,
  loadPhotoTagsCatalog,
  savePhotoTagsCatalog,
} from "@/lib/admin/photo-tags-catalog-data";
import {
  fetchPhotoTagsFromApi,
  savePhotoTagsToApi,
  shouldUseSharedPhotoTags,
} from "@/lib/admin/photo-tags-api";
import type {
  PhotoTagCatalogItem,
  PhotoTagCatalogItemInput,
} from "@/lib/admin/photo-tags-catalog-types";

export function usePhotoTagsCatalog() {
  const [items, setItems] = useState<PhotoTagCatalogItem[]>(DEFAULT_PHOTO_TAGS_CATALOG);
  const [ready, setReady] = useState(true);
  const shared = shouldUseSharedPhotoTags();

  const refresh = useCallback(async () => {
    if (shared) {
      try {
        setItems(await fetchPhotoTagsFromApi());
        setReady(true);
        return;
      } catch {
        // fall through
      }
    }
    setItems(loadPhotoTagsCatalog());
    setReady(true);
  }, [shared]);

  useEffect(() => {
    void refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === "farm-stays-photo-tags-catalog") void refresh();
    }
    window.addEventListener(PHOTO_TAGS_CATALOG_SYNC_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PHOTO_TAGS_CATALOG_SYNC_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  async function persist(next: PhotoTagCatalogItem[]) {
    if (shared) {
      try {
        const saved = await savePhotoTagsToApi(next);
        setItems(saved);
        window.dispatchEvent(new Event(PHOTO_TAGS_CATALOG_SYNC_EVENT));
        return;
      } catch {
        // fall through
      }
    }
    savePhotoTagsCatalog(next);
    setItems(next);
  }

  return {
    ready,
    items,
    enabledItems: items.filter((i) => i.enabled),
    addItem: (input: Omit<PhotoTagCatalogItemInput, "value"> & { value?: string }) => {
      void persist([...items, createPhotoTagItem(input)]);
    },
    updateItem: (
      id: string,
      patch: Partial<Omit<PhotoTagCatalogItemInput, "value"> & { value?: string }>
    ) => {
      void persist(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    removeItem: (id: string) => {
      void persist(items.filter((item) => item.id !== id));
    },
    resetDefaults: () => {
      void persist(DEFAULT_PHOTO_TAGS_CATALOG);
    },
  };
}
