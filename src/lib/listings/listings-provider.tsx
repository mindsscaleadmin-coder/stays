"use client";

import { createContext, useContext, useLayoutEffect, type ReactNode } from "react";
import {
  filterHostListings,
  useListingSubmissionsStore,
} from "./use-listing-submissions-store";

type ListingsStore = ReturnType<typeof useListingSubmissionsStore>;

const ListingsContext = createContext<ListingsStore | null>(null);

export function ListingsProvider({ children }: { children: ReactNode }) {
  const store = useListingSubmissionsStore();
  return (
    <ListingsContext.Provider value={store}>{children}</ListingsContext.Provider>
  );
}

export function useListingSubmissions(options?: { load?: boolean }) {
  const ctx = useContext(ListingsContext);
  if (!ctx) {
    throw new Error("useListingSubmissions must be used within ListingsProvider");
  }

  const load = options?.load ?? false;
  useLayoutEffect(() => {
    if (load) ctx.ensureLoaded();
  }, [load, ctx]);

  return ctx;
}

export function useHostSubmissions(
  hostId?: string,
  hostName?: string,
  options?: { load?: boolean }
) {
  const load = options?.load ?? false;
  const { all } = useListingSubmissions({ load });
  return filterHostListings(all, hostId ?? "", hostName);
}
