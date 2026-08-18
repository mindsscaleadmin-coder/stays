"use client";

import { createContext, useContext, type ReactNode } from "react";
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

export function useListingSubmissions() {
  const ctx = useContext(ListingsContext);
  if (!ctx) {
    throw new Error("useListingSubmissions must be used within ListingsProvider");
  }
  return ctx;
}

export function useHostSubmissions(hostId?: string, hostName?: string) {
  const { all } = useListingSubmissions();
  return filterHostListings(all, hostId ?? "", hostName);
}
