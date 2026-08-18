"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

async function fetchSharedListings(): Promise<SubmittedListing[]> {
  const res = await fetch("/api/listings", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load listings");
  const data = (await res.json()) as { listings: SubmittedListing[] };
  const listings = (data.listings ?? []).map(normalizeSubmittedListing);
  // Silent mirror — caller already updates React state. Emitting sync here
  // re-entered listeners and could cancel the in-flight `ready` flag.
  replaceListingsMirror(listings, { emit: false });
  return listings;
}

async function postListingAction(body: unknown) {
  const res = await fetch("/api/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: string }).error || `Listing request failed (${res.status})`
      );
    }
  return res.json();
}

export function useListingSubmissionsStore() {
  const shared = isSharedListingsEnabled();
  // Always start empty so SSR + first client paint match (avoid hydration errors).
  const [all, setAll] = useState<SubmittedListing[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (shared) {
      try {
        const listings = await fetchSharedListings();
        setAll(listings);
        return;
      } catch (error) {
        console.error(error);
      }
    }
    setAll(loadAllSubmissions());
  }, [shared]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    let cancelled = false;

    if (shared) {
      const mirrored = loadMirroredSubmissions();
      if (mirrored.length > 0) setAll(mirrored);
    } else {
      setAll(loadAllSubmissions());
    }

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
      ? window.setInterval(() => void refreshRef.current(), 15000)
      : null;

    return () => {
      cancelled = true;
      window.removeEventListener(LISTINGS_SYNC_EVENT, onSync);
      window.removeEventListener("storage", onStorage);
      if (poll) window.clearInterval(poll);
    };
    // Intentionally only re-bind when shared mode flips — not on every refresh identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared]);

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
    refresh,
    shared,
    submit: async (input: SubmitListingInput) => {
      if (shared) {
        const { listing } = await postListingAction(input);
        await refresh();
        return listing.id as string;
      }
      const id = submitListing(input);
      await refresh();
      return id;
    },
    update: async (id: string, input: UpdateListingInput) => {
      if (shared) {
        await postListingAction({ action: "update", id, input });
        await refresh();
        return true;
      }
      const ok = updateListing(id, input);
      await refresh();
      return ok;
    },
    approve: async (id: string) => {
      if (shared) {
        await postListingAction({ action: "status", id, status: "approved" });
        await refresh();
        return true;
      }
      const ok = updateListingStatus(id, "approved");
      await refresh();
      return ok;
    },
    reject: async (id: string) => {
      if (shared) {
        await postListingAction({ action: "status", id, status: "rejected" });
        await refresh();
        return true;
      }
      const ok = updateListingStatus(id, "rejected");
      await refresh();
      return ok;
    },
    deleteListing: async (id: string) => {
      if (shared) {
        await postListingAction({ action: "delete", id });
        await refresh();
        return true;
      }
      const ok = removeListingFromStorage(id);
      await refresh();
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
        await refresh();
        return true;
      }
      const ok = unpublishListing(id, "Deactivated by admin");
      await refresh();
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
        await refresh();
        return true;
      }
      const ok = unpublishListing(id, reason);
      await refresh();
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
        await refresh();
        return true;
      }
      const ok = republishListing(id);
      await refresh();
      return ok;
    },
    adminUpdate: async (id: string, patch: AdminListingPatch) => {
      if (shared) {
        await postListingAction({ action: "adminPatch", id, patch });
        if (typeof patch.featured === "boolean") {
          await refreshPromotedIdsFromApi(true);
          emitSyncEvent(HOST_PROMOTIONS_SYNC_EVENT);
        }
        await refresh();
        return true;
      }
      const ok = adminUpdateListing(id, patch);
      if (ok && typeof patch.featured === "boolean") {
        await refreshPromotedIdsFromApi(true);
        emitSyncEvent(HOST_PROMOTIONS_SYNC_EVENT);
      }
      await refresh();
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
        await refresh();
        return count;
      }
      const count = bulkUpdateListings(ids, patch);
      if (typeof patch.featured === "boolean") {
        await refreshPromotedIdsFromApi(true);
        emitSyncEvent(HOST_PROMOTIONS_SYNC_EVENT);
      }
      await refresh();
      return count;
    },
    addRoom: async (listingId: string, input: AddListingRoomInput) => {
      if (shared) {
        const data = await postListingAction({
          action: "addRoom",
          listingId,
          input,
        });
        await refresh();
        return (data.roomId as string | null) ?? null;
      }
      const roomId = addRoomToListing(listingId, input);
      await refresh();
      return roomId;
    },
    deleteRoom: async (listingId: string, roomId: string) => {
      if (shared) {
        await postListingAction({ action: "deleteRoom", listingId, roomId });
        await refresh();
        return true;
      }
      const ok = deleteRoomLocal(listingId, roomId);
      await refresh();
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
        await refresh();
        return true;
      }
      const ok = updateRoomPriceOnListing(listingId, roomId, price);
      await refresh();
      return ok;
    },
  };
}

