import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { countryMatchTokens } from "@/lib/currency";
import type {
  AddListingRoomInput,
  SubmittedListing,
  SubmitListingInput,
  UpdateListingInput,
} from "@/lib/listings/submission-types";
import { normalizeSubmittedListing } from "@/lib/listings/submission-data";
import {
  relabelListing,
  type ListingRelabelChanges,
} from "@/lib/listings/relabel-listings";
import type { ListingSearchFilters } from "@/lib/listings/match-listing";

function parsePayload(raw: string): SubmittedListing {
  return normalizeSubmittedListing(JSON.parse(raw) as SubmittedListing);
}

type ListingRow = {
  id: string;
  payload: string;
  featured?: boolean | null;
  pricePerNight?: number | null;
  country?: string | null;
  state?: string | null;
  district?: string | null;
  parentCategory?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

function filterColumnsFromListing(listing: SubmittedListing) {
  return {
    country: listing.country?.trim() ?? "",
    state: listing.state?.trim() ?? "",
    district: listing.district?.trim() ?? "",
    parentCategory: listing.parentCategory?.trim() ?? "",
    category: listing.category?.trim() ?? "",
    subcategory: listing.subcategory?.trim() ?? "",
  };
}

function toRow(listing: ListingRow): SubmittedListing {
  const data = parsePayload(listing.payload);
  return normalizeSubmittedListing({
    ...data,
    id: listing.id,
    featured: listing.featured ?? data.featured,
    pricePerNight: listing.pricePerNight ?? data.pricePerNight ?? null,
    country: listing.country || data.country,
    state: listing.state || data.state,
    district: listing.district || data.district,
    parentCategory: listing.parentCategory || data.parentCategory,
    category: listing.category || data.category,
    subcategory: listing.subcategory || data.subcategory,
  });
}

function listingSearchWhere(filters: ListingSearchFilters): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [];
  if (filters.status?.trim()) {
    and.push({ status: filters.status.trim() });
  }

  const country = filters.country?.trim();
  if (country) {
    and.push({
      OR: countryMatchTokens(country).map((token) => ({
        country: { contains: token, mode: "insensitive" as const },
      })),
    });
  }

  const equalsInsensitive = (
    field: "state" | "district" | "parentCategory" | "category" | "subcategory",
    value?: string
  ) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    and.push({
      [field]: { equals: trimmed, mode: "insensitive" as const },
    });
  };

  equalsInsensitive("state", filters.state);
  equalsInsensitive("district", filters.district);
  equalsInsensitive("parentCategory", filters.parentCategory);
  equalsInsensitive("category", filters.category);
  equalsInsensitive("subcategory", filters.subcategory);

  const q = filters.q?.trim();
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { country: { contains: q, mode: "insensitive" } },
        { state: { contains: q, mode: "insensitive" } },
        { district: { contains: q, mode: "insensitive" } },
        { parentCategory: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { subcategory: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

let filterColumnsBackfilled = false;

/** Copy Filter names from listing JSON onto columns (once per process). */
export async function ensureListingFilterColumns(): Promise<number> {
  if (filterColumnsBackfilled) return 0;
  const updated = await backfillListingFilterColumns();
  filterColumnsBackfilled = true;
  return updated;
}

async function backfillListingFilterColumns(): Promise<number> {
  const rows = await prisma.listing.findMany();
  const updates = rows.flatMap((row) => {
    const listing = toRow(row);
    const cols = filterColumnsFromListing(listing);
    const needs =
      (row.country ?? "") !== cols.country ||
      (row.state ?? "") !== cols.state ||
      (row.district ?? "") !== cols.district ||
      (row.parentCategory ?? "") !== cols.parentCategory ||
      (row.category ?? "") !== cols.category ||
      (row.subcategory ?? "") !== cols.subcategory;
    return needs ? [{ id: row.id, ...cols }] : [];
  });
  if (updates.length === 0) return 0;
  await prisma.$transaction(
    updates.map((item) =>
      prisma.listing.update({
        where: { id: item.id },
        data: {
          country: item.country,
          state: item.state,
          district: item.district,
          parentCategory: item.parentCategory,
          category: item.category,
          subcategory: item.subcategory,
        },
      })
    )
  );
  return updates.length;
}

async function ensureHostUser(hostId: string, hostName: string) {
  const existing = await prisma.user.findUnique({ where: { id: hostId } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id: hostId,
      fullName: hostName || "Host",
      email: `${hostId}@hosts.local`,
      roles: JSON.stringify(["host"]),
      isVerified: true,
    },
  });
}

export async function listListings(): Promise<SubmittedListing[]> {
  await ensureListingFilterColumns();
  const rows = await prisma.listing.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toRow);
}

export async function listListingsByHost(hostId: string): Promise<SubmittedListing[]> {
  await ensureListingFilterColumns();
  const rows = await prisma.listing.findMany({
    where: { hostId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRow);
}

export async function searchListings(
  filters: ListingSearchFilters
): Promise<SubmittedListing[]> {
  await ensureListingFilterColumns();
  const rows = await prisma.listing.findMany({
    where: listingSearchWhere(filters),
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
  const listings = rows.map(toRow);
  const city = filters.city?.trim().toLowerCase();
  if (!city) return listings;
  return listings.filter((listing) => listing.city.trim().toLowerCase() === city);
}

export async function getListing(id: string): Promise<SubmittedListing | null> {
  const row = await prisma.listing.findUnique({ where: { id } });
  return row ? toRow(row) : null;
}

export async function createListing(input: SubmitListingInput): Promise<SubmittedListing> {
  await ensureHostUser(input.hostId, input.hostName);
  const id = `L-${Date.now().toString(36).toUpperCase()}`;
  const listing: SubmittedListing = {
    ...input,
    id,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  await prisma.listing.create({
    data: {
      id,
      hostId: input.hostId,
      title: listing.title,
      status: listing.status,
      payload: JSON.stringify(listing),
      ...filterColumnsFromListing(listing),
      maxGuests: listing.rooms?.[0]?.capacity ?? 4,
      pricePerNight: listing.rooms?.[0]?.price ?? null,
    },
  });
  return listing;
}

export async function updateListingPayload(
  id: string,
  updater: (prev: SubmittedListing) => SubmittedListing
): Promise<SubmittedListing | null> {
  const row = await prisma.listing.findUnique({ where: { id } });
  if (!row) return null;
  const next = updater(toRow(row));
  await prisma.listing.update({
    where: { id },
    data: {
      title: next.title,
      status: next.status,
      payload: JSON.stringify(next),
      ...filterColumnsFromListing(next),
      maxGuests: next.rooms?.[0]?.capacity ?? row.maxGuests,
      pricePerNight: next.rooms?.[0]?.price ?? row.pricePerNight,
      hostId: next.hostId,
      featured: Boolean(next.featured),
    },
  });
  return next;
}

export async function updateListingFields(
  id: string,
  input: UpdateListingInput
): Promise<SubmittedListing | null> {
  return updateListingPayload(id, (prev) => ({
    ...prev,
    ...input,
    status: prev.status === "approved" ? "pending" : prev.status,
    statusUpdatedAt: new Date().toISOString(),
  }));
}

export async function setListingStatus(
  id: string,
  status: SubmittedListing["status"],
  extra?: Partial<SubmittedListing>
): Promise<SubmittedListing | null> {
  return updateListingPayload(id, (prev) => ({
    ...prev,
    ...extra,
    status,
    statusUpdatedAt: new Date().toISOString(),
  }));
}

/** Rewrite Filter names inside every listing JSON payload in Postgres. */
export async function relabelListingsInDb(
  changes: ListingRelabelChanges
): Promise<{ updated: number; listings: SubmittedListing[] }> {
  const rows = await prisma.listing.findMany();
  const updates: { id: string; payload: SubmittedListing }[] = [];
  for (const row of rows) {
    const prev = toRow(row);
    const next = relabelListing(prev, changes);
    if (next !== prev) updates.push({ id: row.id, payload: next });
  }
  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map((item) =>
        prisma.listing.update({
          where: { id: item.id },
          data: {
            payload: JSON.stringify(item.payload),
            ...filterColumnsFromListing(item.payload),
          },
        })
      )
    );
  }
  const listings = await listListings();
  return { updated: updates.length, listings };
}

export async function deleteListing(id: string): Promise<boolean> {
  try {
    await prisma.listing.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

let listingsSeeded = false;

export async function seedListingsIfEmpty(seed: SubmittedListing[]): Promise<number> {
  if (listingsSeeded) return 0;
  const count = await prisma.listing.count();
  if (count > 0) {
    listingsSeeded = true;
    return 0;
  }

  let inserted = 0;
  for (const item of seed) {
    await ensureHostUser(item.hostId, item.hostName);
    await prisma.listing.create({
      data: {
        id: item.id,
        hostId: item.hostId,
        title: item.title,
        status: item.status,
        payload: JSON.stringify(item),
        ...filterColumnsFromListing(item),
        maxGuests: item.rooms?.[0]?.capacity ?? 4,
        pricePerNight: item.rooms?.[0]?.price ?? null,
        createdAt: new Date(item.submittedAt),
      },
    });
    inserted += 1;
  }
  listingsSeeded = true;
  return inserted;
}

export async function addRoomToListingPayload(
  listingId: string,
  input: AddListingRoomInput
): Promise<{ listing: SubmittedListing; roomId: string } | null> {
  let roomId = "";
  const listing = await updateListingPayload(listingId, (prev) => {
    roomId = `R-${Date.now()}`;
    return {
      ...prev,
      rooms: [...(prev.rooms ?? []), { ...input, id: roomId }],
    };
  });
  if (!listing || !roomId) return null;
  return { listing, roomId };
}

export async function deleteRoomFromListingPayload(
  listingId: string,
  roomId: string
): Promise<SubmittedListing | null> {
  return updateListingPayload(listingId, (prev) => {
    if (!prev.rooms?.length) return prev;
    return { ...prev, rooms: prev.rooms.filter((r) => r.id !== roomId) };
  });
}

export async function updateRoomPriceOnListingPayload(
  listingId: string,
  roomId: string,
  price: number
): Promise<SubmittedListing | null> {
  return updateListingPayload(listingId, (prev) => {
    if (!prev.rooms?.length) return prev;
    return {
      ...prev,
      rooms: prev.rooms.map((r) =>
        r.id === roomId ? { ...r, price: Math.max(0, price) } : r
      ),
    };
  });
}
