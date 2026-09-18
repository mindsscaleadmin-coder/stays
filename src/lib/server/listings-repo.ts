import { Prisma } from "@prisma/client";
import { isDemoApiMode } from "@/lib/auth/booking-access";
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
import { createPropertyReference } from "@/lib/listings/property-reference";
import { assertDirectoryListingCapacity } from "@/lib/server/directory-space-enforcement";
import {
  LISTINGS_QUERY_HARD_CAP,
  PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE,
  PUBLIC_LISTINGS_MAX_PAGE_SIZE,
} from "@/lib/listings/listings-pagination";

function parsePayload(raw: string): SubmittedListing {
  return normalizeSubmittedListing(JSON.parse(raw) as SubmittedListing);
}

type ListingRow = {
  id: string;
  propertyReference: string;
  payload: string;
  status?: string | null;
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
  // DB column is the source of truth for public filters; keep payload fields otherwise.
  const dbStatus = listing.status?.trim() as SubmittedListing["status"] | undefined;
  return normalizeSubmittedListing({
    ...data,
    id: listing.id,
    propertyReference: listing.propertyReference,
    status: dbStatus || data.status,
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

  const parentCategory = filters.parentCategory?.trim();
  if (parentCategory && /^events?$/i.test(parentCategory)) {
    and.push({
      OR: [
        { parentCategory: { equals: parentCategory, mode: "insensitive" } },
        { parentCategory: { equals: "Venues", mode: "insensitive" } },
        { parentCategory: { equals: "Venue", mode: "insensitive" } },
      ],
    });
  } else {
    equalsInsensitive("parentCategory", filters.parentCategory);
  }

  const category = filters.category?.trim();
  if (category && /^venue$/i.test(category)) {
    and.push({
      OR: [
        { category: { equals: "Venue", mode: "insensitive" } },
        { category: { equals: "Wedding Venues", mode: "insensitive" } },
        { category: { equals: "Party Lawns", mode: "insensitive" } },
        { category: { equals: "Corporate Retreats", mode: "insensitive" } },
        { category: { equals: "Private Events", mode: "insensitive" } },
        { category: { equals: "Farmhouse Gatherings", mode: "insensitive" } },
        { category: { equals: "Outdoor Lawns", mode: "insensitive" } },
        { category: { equals: "Desert Venues", mode: "insensitive" } },
      ],
    });
  } else {
    equalsInsensitive("category", filters.category);
  }

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
  const rows = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
    take: LISTINGS_QUERY_HARD_CAP,
  });
  return rows.map(toRow);
}

export async function listListingsByHost(hostId: string): Promise<SubmittedListing[]> {
  const rows = await prisma.listing.findMany({
    where: { hostId },
    orderBy: { createdAt: "desc" },
    take: LISTINGS_QUERY_HARD_CAP,
  });
  return rows.map(toRow);
}

export type ListingSearchPageResult = {
  listings: SubmittedListing[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Paginated listing search. Always bounded — pass `unlimited: true` only for
 * admin tooling (still capped by LISTINGS_QUERY_HARD_CAP).
 */
export async function searchListingsPage(
  filters: ListingSearchFilters,
  opts?: {
    page?: number;
    pageSize?: number;
    /** Load as many as the hard cap allows (admin / internal). */
    unlimited?: boolean;
  }
): Promise<ListingSearchPageResult> {
  const where = listingSearchWhere(filters);
  const orderBy = [{ featured: "desc" as const }, { createdAt: "desc" as const }];
  const city = filters.city?.trim().toLowerCase();
  const statusWanted = filters.status?.trim() || "";

  if (opts?.unlimited) {
    const rows = await prisma.listing.findMany({
      where,
      orderBy,
      take: LISTINGS_QUERY_HARD_CAP,
    });
    let listings = rows.map(toRow);
    if (statusWanted) {
      listings = listings.filter((listing) => listing.status === statusWanted);
    }
    if (city) {
      listings = listings.filter((listing) => listing.city.trim().toLowerCase() === city);
    }
    return {
      listings,
      total: listings.length,
      page: 1,
      pageSize: listings.length || PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE,
    };
  }

  const page = Math.max(1, Math.floor(opts?.page ?? 1) || 1);
  const pageSize = Math.min(
    PUBLIC_LISTINGS_MAX_PAGE_SIZE,
    Math.max(1, Math.floor(opts?.pageSize ?? PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE) || PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE)
  );
  const skip = (page - 1) * pageSize;

  // City is stored in JSON payload (not a filter column) — scan a bounded window,
  // filter, then slice. Other filters paginate in Postgres.
  if (city) {
    const scanTake = Math.min(LISTINGS_QUERY_HARD_CAP, Math.max(pageSize * 20, 200));
    const rows = await prisma.listing.findMany({
      where,
      orderBy,
      take: scanTake,
    });
    let listings = rows.map(toRow);
    if (statusWanted) {
      listings = listings.filter((listing) => listing.status === statusWanted);
    }
    listings = listings.filter((listing) => listing.city.trim().toLowerCase() === city);
    const total = listings.length;
    return {
      listings: listings.slice(skip, skip + pageSize),
      total,
      page,
      pageSize,
    };
  }

  const [total, rows] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
  ]);

  let listings = rows.map(toRow);
  if (statusWanted) {
    listings = listings.filter((listing) => listing.status === statusWanted);
  }

  return { listings, total, page, pageSize };
}

/** @deprecated Prefer searchListingsPage — kept for callers that only need the rows. */
export async function searchListings(
  filters: ListingSearchFilters,
  opts?: {
    page?: number;
    pageSize?: number;
    unlimited?: boolean;
  }
): Promise<SubmittedListing[]> {
  const result = await searchListingsPage(filters, opts);
  return result.listings;
}

export async function getListing(id: string): Promise<SubmittedListing | null> {
  const row = await prisma.listing.findUnique({ where: { id } });
  return row ? toRow(row) : null;
}

export async function createListing(input: SubmitListingInput): Promise<SubmittedListing> {
  await ensureHostUser(input.hostId, input.hostName);
  await assertDirectoryListingCapacity(input);
  const id = `L-${Date.now().toString(36).toUpperCase()}`;
  const listing: SubmittedListing = normalizeSubmittedListing({
    ...input,
    id,
    propertyReference: createPropertyReference(),
    status: "pending",
    submittedAt: new Date().toISOString(),
  });
  await prisma.listing.create({
    data: {
      id,
      propertyReference: listing.propertyReference!,
      hostId: input.hostId,
      title: listing.title,
      status: listing.status,
      payload: JSON.stringify(listing),
      ...filterColumnsFromListing(listing),
      maxGuests:
        listing.groupSizeMin && listing.groupSizeMin > 0
          ? Math.max(listing.groupSizeMin, listing.rooms?.[0]?.capacity ?? 4)
          : listing.rooms?.[0]?.capacity ?? 4,
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
  if (!isDemoApiMode()) return 0;
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
        propertyReference: item.propertyReference || createPropertyReference(),
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
