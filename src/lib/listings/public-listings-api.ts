import type { Stay } from "@/lib/mock/data";
import { normalizeSubmittedListing } from "./submission-data";
import { submissionToStay } from "./submission-to-stay";
import type { SubmittedListing } from "./submission-types";
import { applyHostPublishedRates } from "./public-listings";
import {
  PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE,
  parseListingPagination,
} from "./listings-pagination";

const FRESH_MS = 15_000;
let cached: {
  at: number;
  key: string;
  stays: Stay[];
  total: number;
} | null = null;
let inflight: {
  key: string;
  promise: Promise<{ stays: Stay[]; total: number }>;
} | null = null;

export function bustApprovedPublicStaysCache() {
  cached = null;
}

function mapApprovedStays(listings: SubmittedListing[]): Stay[] {
  return listings
    .map(normalizeSubmittedListing)
    .map(submissionToStay)
    .map(applyHostPublishedRates);
}

/** Load a page of approved listings from the shared store for public search. */
export async function fetchApprovedPublicStays(filters?: {
  country?: string;
  page?: number;
  pageSize?: number;
}): Promise<Stay[]> {
  const page = await fetchApprovedPublicStaysPage(filters);
  return page.stays;
}

export async function fetchApprovedPublicStaysPage(filters?: {
  country?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ stays: Stay[]; total: number; page: number; pageSize: number }> {
  const country = filters?.country?.trim() || "";
  const { page, pageSize } = parseListingPagination({
    page: filters?.page,
    perPage: filters?.pageSize ?? PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE,
  });
  const cacheKey = `${country || "*"}|${page}|${pageSize}`;
  if (cached && cached.key === cacheKey && Date.now() - cached.at < FRESH_MS) {
    return {
      stays: cached.stays,
      total: cached.total,
      page,
      pageSize,
    };
  }
  if (inflight?.key === cacheKey) {
    const result = await inflight.promise;
    return { ...result, page, pageSize };
  }

  const promise = (async () => {
    const params = new URLSearchParams({
      status: "approved",
      page: String(page),
      perPage: String(pageSize),
    });
    if (country) params.set("country", country);
    const res = await fetch(`/api/listings?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load listings");
    const data = (await res.json()) as {
      listings?: SubmittedListing[];
      total?: number;
    };
    const stays = mapApprovedStays(data.listings ?? []);
    const total = typeof data.total === "number" ? data.total : stays.length;
    cached = { at: Date.now(), key: cacheKey, stays, total };
    return { stays, total };
  })().finally(() => {
    if (inflight?.key === cacheKey) inflight = null;
  });
  inflight = { key: cacheKey, promise };
  const result = await promise;
  return { stays: result.stays, total: result.total, page, pageSize };
}
