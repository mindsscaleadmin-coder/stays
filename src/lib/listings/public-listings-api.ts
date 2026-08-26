import type { Stay } from "@/lib/mock/data";
import { normalizeSubmittedListing } from "./submission-data";
import { submissionToStay } from "./submission-to-stay";
import type { SubmittedListing } from "./submission-types";
import { applyHostPublishedRates } from "./public-listings";

const FRESH_MS = 15_000;
let cached: { at: number; key: string; stays: Stay[] } | null = null;
let inflight: { key: string; promise: Promise<Stay[]> } | null = null;

export function bustApprovedPublicStaysCache() {
  cached = null;
}

function mapApprovedStays(listings: SubmittedListing[], country?: string): Stay[] {
  return listings
    .map(normalizeSubmittedListing)
    .map(submissionToStay)
    .map(applyHostPublishedRates);
}

/** Load approved listings from the shared store for public search. */
export async function fetchApprovedPublicStays(filters?: {
  country?: string;
}): Promise<Stay[]> {
  const country = filters?.country?.trim() || "";
  const cacheKey = country || "*";
  if (cached && cached.key === cacheKey && Date.now() - cached.at < FRESH_MS) {
    return cached.stays;
  }
  if (inflight?.key === cacheKey) return inflight.promise;

  const promise = (async () => {
    const params = new URLSearchParams({ status: "approved" });
    if (country) params.set("country", country);
    const res = await fetch(`/api/listings?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load listings");
    const data = (await res.json()) as { listings?: SubmittedListing[] };
    const stays = mapApprovedStays(data.listings ?? [], country || undefined);
    cached = { at: Date.now(), key: cacheKey, stays };
    return stays;
  })().finally(() => {
    if (inflight?.key === cacheKey) inflight = null;
  });
  inflight = { key: cacheKey, promise };
  return promise;
}
