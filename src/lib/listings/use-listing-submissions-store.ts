"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  LISTINGS_SYNC_EVENT,
  addRoomToListing,
  adminUpdateListing,
  bulkUpdateListings,
  deleteListing as removeListingFromStorage,
  isSharedListingsEnabled,
  loadAllSubmissions,
  loadMirroredSubmissions,
  loadPendingSubmissions,
  normalizeSubmittedListing,
  replaceListingsMirror,
  republishListing,
  submitListing,
  deleteRoomFromListing as deleteRoomLocal,
  unpublishListing,
  updateListing,
  updateListingStatus,
  updateRoomPriceOnListing,
} from "./submission-data";
import type {
  AddListingRoomInput,
  ListingReviewStatus,
  SubmitListingInput,
  SubmittedListing,
  UpdateListingInput,
} from "./submission-types";
import type { AdminListingPatch } from "./submission-data";
import {
  filterHostListings,
  listingStatusLabel,
  resolveHostId,
  resolveHostName,
  toHostListingRow,
} from "./host-listings-utils";
import { refreshPromotedIdsFromApi } from "./promotions-cache";
import { HOST_PROMOTIONS_SYNC_EVENT } from "@/lib/host/host-promotions-data";
import { emitSyncEvent } from "@/lib/emit-sync-event";

export {
  loadPendingSubmissions,
  listingStatusLabel,
  resolveHostId,
  resolveHostName,
  toHostListingRow,
  filterHostListings,
};

let sharedListingsInflight: Promise<SubmittedListing[]> | null = null;
let sharedListingsCache: SubmittedListing[] | null = null;
let sharedListingsFetchedAt = 0;
const SHARED_LISTINGS_TTL_MS = 8_000;

function sharedListingsFetchUrl(): string {
  if (typeof window !== "undefined" && window.location.pathname.includes("/admin")) {
    return "/api/listings?all=1";
  }
  return "/api/listings";
}

async function fetchSharedListings(force = false): Promise<SubmittedListing[]> {
  if (!force && sharedListingsInflight) return sharedListingsInflight;
  if (
    !force &&
    sharedListingsCache &&
    Date.now() - sharedListingsFetchedAt < SHARED_LISTINGS_TTL_MS
  ) {
    return sharedListingsCache;
  }
  sharedListingsInflight = (async () => {
    try {
      const res = await fetch(sharedListingsFetchUrl(), { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load listings");
      const data = (await res.json()) as { listings: SubmittedListing[] };
      const listings = (data.listings ?? []).map(normalizeSubmittedListing);
      replaceListingsMirror(listings, { emit: false });
      sharedListingsCache = listings;
      sharedListingsFetchedAt = Date.now();
      return listings;
    } catch (error) {
      if (sharedListingsCache) {
        return sharedListingsCache;
      }
      const mirrored = loadMirroredSubmissions();
      if (mirrored.length > 0) {
        return mirrored;
      }
      throw error instanceof Error ? error : new Error("Failed to load listings");
    }
  })();
  try {
    return await sharedListingsInflight;
  } finally {
    sharedListingsInflight = null;
  }
}

class ListingApiNetworkError extends Error {
  constructor() {
    super("Could not reach the server. Run npm run dev — shared DB saves need the local API.");
    this.name = "ListingApiNetworkError";
  }
}

function isNetworkFetchError(error: unknown): boolean {
  return (
    error instanceof ListingApiNetworkError ||
    (error instanceof TypeError &&
      (error.message === "Failed to fetch" ||
        error.message.toLowerCase().includes("networkerror")))
  );
}

async function postListingAction(body: unknown) {
  let res: Response;
  try {
    res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (isNetworkFetchError(error)) {
      throw new ListingApiNetworkError();
    }
    throw error;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Listing request failed (${res.status})`
    );
  }
  sharedListingsFetchedAt = 0;
  return res.json();
}

export function useListingSubmissionsStore() {
  const shared = isSharedListingsEnabled();
  // Always start empty so SSR + first client paint match (avoid hydration errors).
  const [all, setAll] = useState<SubmittedListing[]>([]);
  const [ready, setReady] = useState(true);
  const [loadActive, setLoadActive] = useState(false);

  const refresh = useCallback(async (force = false) => {
    if (shared) {
      try {
        const listings = await fetchSharedListings(force);
        setAll(listings);
        return;
      } catch (error) {
        console.error(error);
        const fallback = sharedListingsCache ?? loadMirroredSubmissions();
        setAll(fallback);
        return;
      }
    }
    setAll(loadAllSubmissions());
  }, [shared]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const ensureLoaded = useCallback(() => {
    setLoadActive(true);
  }, []);

  // Hydrate local mirror before paint only when listings are needed.
  // Skipping on /admin avoids parsing a large localStorage blob on every admin page.
  useLayoutEffect(() => {
    if (!shared || !loadActive) return;
    const mirrored = loadMirroredSubmissions();
    if (mirrored.length > 0) {
      setAll(mirrored);
      sharedListingsCache = mirrored;
      sharedListingsFetchedAt = Date.now();
    }
  }, [shared, loadActive]);

  useLayoutEffect(() => {
    if (!loadActive) return;

    let cancelled = false;

    if (!shared) {
      setAll(loadAllSubmissions());
      return () => {
        cancelled = true;
      };
    }

    const mirrored = loadMirroredSubmissions();
    if (mirrored.length > 0) {
      setAll(mirrored);
    }
    setReady(true);

    (async () => {
      try {
        await refreshRef.current();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    function onSync() {
      if (shared) {
        setAll(loadMirroredSubmissions());
        return;
      }
      setAll(loadAllSubmissions());
    }

    function onStorage(e: StorageEvent) {
      if (e.key !== "farm-stays-listing-submissions") return;
      void refreshRef.current();
    }

    window.addEventListener(LISTINGS_SYNC_EVENT, onSync);
    window.addEventListener("storage", onStorage);
    const poll = shared
      ? window.setInterval(() => {
          if (document.visibilityState === "visible") void refreshRef.current();
        }, 60_000)
      : null;

    return () => {
      cancelled = true;
      window.removeEventListener(LISTINGS_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onStorage);
      if (poll) window.clearInterval(poll);
    };
  }, [loadActive, shared]);

  const pending = all.filter((l) => l.status === "pending");
  const active = all.filter((l) => l.status === "approved");
  const unpublished = all.filter((l) => l.status === "unpublished");
  const flaggedCount = all.filter((l) => l.flaggedForReview).length;

  return {
    all,
    pending,
    active,
    unpublished,
    pendingCount: pending.length,
    activeCount: active.length,
    flaggedCount,
    ready,
    ensureLoaded,
    refresh,
    shared,
    submit: async (input: SubmitListingInput) => {
      if (shared) {
        const { listing } = await postListingAction(input);
        await refresh(true);
        return listing.id as string;
      }
      const id = submitListing(input);
      await refresh(true);
      return id;
    },
    setStatus: async (id: string, status: ListingReviewStatus) => {
      if (shared) {
        await postListingAction({ action: "status", id, status });
        await refresh(true);
        return true;
      }
      const ok = updateListingStatus(id, status);
      await refresh(true);
      return ok;
    },
    update: async (id: string, input: UpdateListingInput) => {
      if (shared) {
        await postListingAction({ action: "update", id, input });
        await refresh(true);
        return true;
      }
      const ok = updateListing(id, input);
      await refresh(true);
      return ok;
    },
    approve: async (id: string) => {
      if (shared) {
        await postListingAction({ action: "status", id, status: "approved" });
        await refresh(true);
        return true;
      }
      const ok = updateListingStatus(id, "approved");
      await refresh(true);
      return ok;
    },
    reject: async (id: string) => {
      if (shared) {
        await postListingAction({ action: "status", id, status: "rejected" });
        await refresh(true);
        return true;
      }
      const ok = updateListingStatus(id, "rejected");
      await refresh(true);
      return ok;
    },
    deleteListing: async (id: string) => {
      if (shared) {
        await postListingAction({ action: "delete", id });
        await refresh(true);
        return true;
      }
      const ok = removeListingFromStorage(id);
      await refresh(true);
      return ok;
    },
    deactivate: async (id: string) => {
      if (shared) {
        await postListingAction({
          action: "status",
          id,
          status: "unpublished",
          extra: { unpublishReason: "Deactivated by admin" },
        });
        await refresh(true);
        return true;
      }
      const ok = unpublishListing(id, "Deactivated by admin");
      await refresh(true);
      return ok;
    },
    unpublish: async (id: string, reason?: string) => {
      if (shared) {
        await postListingAction({
          action: "status",
          id,
          status: "unpublished",
          extra: { unpublishReason: reason?.trim() || undefined },
        });
        await refresh(true);
        return true;
      }
      const ok = unpublishListing(id, reason);
      await refresh(true);
      return ok;
    },
    republish: async (id: string) => {
      if (shared) {
        await postListingAction({
          action: "status",
          id,
          status: "approved",
          extra: { unpublishReason: undefined },
        });
        await refresh(true);
        return true;
      }
      const ok = republishListing(id);
      await refresh(true);
      return ok;
    },
    adminUpdate: async (id: string, patch: AdminListingPatch) => {
      if (shared) {
        await postListingAction({ action: "adminPatch", id, patch });
        if (typeof patch.featured === "boolean") {
          await refreshPromotedIdsFromApi(true);
          emitSyncEvent(HOST_PROMOTIONS_SYNC_EVENT);
        }
        await refresh(true);
        return true;
      }
      const ok = adminUpdateListing(id, patch);
      if (ok && typeof patch.featured === "boolean") {
        await refreshPromotedIdsFromApi(true);
        emitSyncEvent(HOST_PROMOTIONS_SYNC_EVENT);
      }
      await refresh(true);
      return ok;
    },
    bulkUpdate: async (ids: string[], patch: AdminListingPatch) => {
      if (shared) {
        let count = 0;
        for (const id of ids) {
          await postListingAction({ action: "adminPatch", id, patch });
          count += 1;
        }
        if (typeof patch.featured === "boolean") {
          await refreshPromotedIdsFromApi(true);
          emitSyncEvent(HOST_PROMOTIONS_SYNC_EVENT);
        }
        await refresh(true);
        return count;
      }
      const count = bulkUpdateListings(ids, patch);
      if (typeof patch.featured === "boolean") {
        await refreshPromotedIdsFromApi(true);
        emitSyncEvent(HOST_PROMOTIONS_SYNC_EVENT);
      }
      await refresh(true);
      return count;
    },
    addRoom: async (listingId: string, input: AddListingRoomInput) => {
      if (shared) {
        const data = await postListingAction({
          action: "addRoom",
          listingId,
          input,
        });
        await refresh(true);
        return (data.roomId as string | null) ?? null;
      }
      const roomId = addRoomToListing(listingId, input);
      await refresh(true);
      return roomId;
    },
    deleteRoom: async (listingId: string, roomId: string) => {
      if (shared) {
        await postListingAction({ action: "deleteRoom", listingId, roomId });
        await refresh(true);
        return true;
      }
      const ok = deleteRoomLocal(listingId, roomId);
      await refresh(true);
      return ok;
    },
    updateRoomPrice: async (listingId: string, roomId: string, price: number) => {
      if (shared) {
        await postListingAction({
          action: "updateRoomPrice",
          listingId,
          roomId,
          price,
        });
        await refresh(true);
        return true;
      }
      const ok = updateRoomPriceOnListing(listingId, roomId, price);
      await refresh(true);
      return ok;
    },
  };
}
