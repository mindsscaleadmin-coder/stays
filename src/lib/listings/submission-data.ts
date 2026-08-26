import type {
  AddListingRoomInput,
  ListingReviewStatus,
  SubmitListingInput,
  SubmittedListing,
  UpdateListingInput,
} from "./submission-types";
import { ALL_SEEDS, SEED_IDS } from "./listing-seeds";
import { emitSyncCustomEvent } from "@/lib/emit-sync-event";
import {
  relabelListing,
  type ListingRelabelChanges,
} from "./relabel-listings";

const STORAGE_KEY = "farm-stays-listing-submissions";
const DELETED_IDS_KEY = "farm-stays-deleted-listing-ids";
export const LISTINGS_SYNC_EVENT = "farm-stays-listings-updated";

/** Fill missing array fields from older / partial shared-DB payloads. */
export function normalizeSubmittedListing(
  listing: SubmittedListing | (Partial<SubmittedListing> & { id: string })
): SubmittedListing {
  return {
    title: "",
    description: "",
    hostId: "",
    hostName: "",
    status: "pending",
    submittedAt: new Date(0).toISOString(),
    country: "",
    state: "",
    district: "",
    parentCategory: "",
    category: "",
    subcategory: "",
    type: "",
    city: "",
    photoCount: 0,
    ...listing,
    id: listing.id,
    customFilters: listing.customFilters ?? [],
    advancedFilters: listing.advancedFilters ?? [],
    photoUrls: listing.photoUrls ?? [],
    photoTags: listing.photoTags ?? [],
    highlightIds: listing.highlightIds ?? [],
    featureIconIds: listing.featureIconIds ?? [],
    amenities: listing.amenities ?? [],
    farmActivities: listing.farmActivities ?? [],
    houseRules: listing.houseRules ?? [],
    rooms: listing.rooms ?? [],
  };
}

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(LISTINGS_SYNC_EVENT);
  }
}

function loadStored(): SubmittedListing[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SubmittedListing[];
    return Array.isArray(parsed) ? parsed.map(normalizeSubmittedListing) : [];
  } catch {
    return [];
  }
}

/** Shared-DB mirror only (no seed merge). Safe after `replaceListingsMirror`. */
export function loadMirroredSubmissions(): SubmittedListing[] {
  return loadStored().sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

function saveStored(listings: SubmittedListing[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  dispatchSync();
}

/** Keep listing labels in sync when Filter taxonomy names change. */
export function relabelSubmittedListings(changes: ListingRelabelChanges): void {
  const listings = loadStored();
  if (listings.length === 0) return;
  let changed = false;
  const next = listings.map((listing) => {
    const row = relabelListing(listing, changes);
    if (row !== listing) changed = true;
    return row;
  });
  if (changed) saveStored(next);
}

/** Replace local mirror after a shared-DB fetch so sync readers stay correct. */
export function replaceListingsMirror(
  listings: SubmittedListing[],
  options?: { emit?: boolean }
) {
  if (typeof window === "undefined") return;
  const next = JSON.stringify(listings);
  const prev = localStorage.getItem(STORAGE_KEY);
  localStorage.setItem(STORAGE_KEY, next);
  localStorage.setItem(DELETED_IDS_KEY, JSON.stringify([]));
  if (options?.emit === false) return;
  if (prev !== next) dispatchSync();
}

import { isSharedDbEnabled } from "@/lib/shared-db";

export function isSharedListingsEnabled() {
  return isSharedDbEnabled();
}

function loadDeletedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveDeletedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(ids)));
  dispatchSync();
}

export function loadAllSubmissions(): SubmittedListing[] {
  const stored = loadStored();
  const deletedIds = loadDeletedIds();
  const storedIds = new Set(stored.map((l) => l.id));
  const seeds = ALL_SEEDS.filter((s) => !storedIds.has(s.id) && !deletedIds.has(s.id));
  return [...stored.filter((l) => !deletedIds.has(l.id)), ...seeds].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export function loadPendingSubmissions(): SubmittedListing[] {
  return loadAllSubmissions().filter((l) => l.status === "pending");
}

export function loadActiveSubmissions(): SubmittedListing[] {
  return loadAllSubmissions().filter((l) => l.status === "approved");
}

export function getPendingCount(): number {
  return loadPendingSubmissions().length;
}

export function newListingId(): string {
  return `L-${Date.now()}`;
}

export function submitListing(input: SubmitListingInput): string {
  const id = newListingId();
  const listing: SubmittedListing = {
    ...input,
    id,
    status: "pending",
    submittedAt: new Date().toISOString(),
    rooms: input.rooms ?? [],
  };

  const stored = loadStored();
  saveStored([listing, ...stored]);
  return id;
}

/**
 * Host edits to a listing always re-enter the admin queue.
 * Approved listings leave the public marketplace until re-approved.
 */
export function updateListing(id: string, input: UpdateListingInput): boolean {
  const existing = getSubmissionById(id);
  if (!existing) return false;

  const now = new Date().toISOString();
  const updated: SubmittedListing = {
    ...existing,
    ...input,
    id: existing.id,
    hostId: existing.hostId,
    hostName: existing.hostName,
    rooms: existing.rooms ?? [],
    status: "pending",
    submittedAt: now,
    statusUpdatedAt: now,
  };

  upsertListing(updated);
  return true;
}

export function getSubmissionById(id: string): SubmittedListing | undefined {
  return loadAllSubmissions().find((l) => l.id === id);
}

function upsertListing(listing: SubmittedListing): void {
  const stored = loadStored();
  saveStored([listing, ...stored.filter((l) => l.id !== listing.id)]);
}

export function addRoomToListing(listingId: string, input: AddListingRoomInput): string | null {
  const existing = getSubmissionById(listingId);
  if (!existing) return null;

  const roomId = `R-${Date.now()}`;
  const room = { ...input, id: roomId };
  const updated: SubmittedListing = {
    ...existing,
    rooms: [...(existing.rooms ?? []), room],
  };
  upsertListing(updated);
  return roomId;
}

export function deleteRoomFromListing(listingId: string, roomId: string): boolean {
  const existing = getSubmissionById(listingId);
  if (!existing?.rooms?.length) return false;
  const rooms = existing.rooms.filter((r) => r.id !== roomId);
  if (rooms.length === existing.rooms.length) return false;
  upsertListing({ ...existing, rooms });
  return true;
}

/** Update a room's nightly price without re-queueing the listing for approval. */
export function updateRoomPriceOnListing(
  listingId: string,
  roomId: string,
  price: number
): boolean {
  const existing = getSubmissionById(listingId);
  if (!existing?.rooms?.length) return false;
  const rooms = existing.rooms.map((r) =>
    r.id === roomId ? { ...r, price: Math.max(0, price) } : r
  );
  if (rooms.every((r, i) => r.price === existing.rooms![i].price)) return false;
  upsertListing({ ...existing, rooms });
  return true;
}

export function deleteListing(id: string): boolean {
  const stored = loadStored();
  const next = stored.filter((l) => l.id !== id);
  const deletedIds = loadDeletedIds();
  let changed = false;

  if (next.length !== stored.length) {
    saveStored(next);
    changed = true;
  }

  if (!deletedIds.has(id)) {
    deletedIds.add(id);
    saveDeletedIds(deletedIds);
    changed = true;
  }

  return changed;
}

export function updateListingStatus(id: string, status: ListingReviewStatus): boolean {
  const seed = ALL_SEEDS.find((s) => s.id === id);
  const now = new Date().toISOString();

  if (SEED_IDS.has(id) && seed) {
    const stored = loadStored();
    const updated = { ...seed, status, statusUpdatedAt: now };
    saveStored([updated, ...stored.filter((l) => l.id !== id)]);
    return true;
  }

  const stored = loadStored();
  const idx = stored.findIndex((l) => l.id === id);
  if (idx === -1) return false;
  stored[idx] = { ...stored[idx], status, statusUpdatedAt: now };
  saveStored(stored);
  return true;
}

export type AdminListingPatch = Partial<
  Pick<
    SubmittedListing,
    | "title"
    | "description"
    | "featured"
    | "flaggedForReview"
    | "unpublishReason"
    | "status"
    | "photoUrls"
    | "photoCount"
    | "photoTags"
    | "amenities"
    | "farmType"
    | "farmActivities"
  >
>;

/** Admin edits without re-queueing host submissions. */
export function adminUpdateListing(id: string, patch: AdminListingPatch): boolean {
  const existing = getSubmissionById(id);
  if (!existing) return false;

  const updated: SubmittedListing = {
    ...existing,
    ...patch,
    id: existing.id,
    hostId: existing.hostId,
    hostName: existing.hostName,
    statusUpdatedAt: new Date().toISOString(),
  };

  upsertListing(updated);

  if (typeof window !== "undefined" && typeof patch.featured === "boolean") {
    void fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "setFeatured",
        listingId: id,
        hostId: existing.hostId,
        featured: patch.featured,
        title: existing.title,
      }),
    }).catch(() => null);
  }

  return true;
}

export function unpublishListing(id: string, reason?: string): boolean {
  return adminUpdateListing(id, {
    status: "unpublished",
    unpublishReason: reason?.trim() || undefined,
  });
}

export function republishListing(id: string): boolean {
  return adminUpdateListing(id, {
    status: "approved",
    unpublishReason: undefined,
  });
}

export function bulkUpdateListings(
  ids: string[],
  patch: AdminListingPatch
): number {
  let count = 0;
  for (const id of ids) {
    if (adminUpdateListing(id, patch)) count += 1;
  }
  return count;
}

export function formatSubmittedAt(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export async function filesToDataUrls(files: File[], maxStored = 4): Promise<string[]> {
  const slice = files.slice(0, maxStored);
  return Promise.all(
    slice.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        })
    )
  );
}
