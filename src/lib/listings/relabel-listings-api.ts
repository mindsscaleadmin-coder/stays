import { isSharedDbEnabled } from "@/lib/shared-db";
import { normalizeSubmittedListing, replaceListingsMirror } from "./submission-data";
import type { ListingRelabelChanges } from "./relabel-listings";
import type { SubmittedListing } from "./submission-types";

/** Ask the kitchen (Postgres) to rewrite Filter names on every listing. */
export async function relabelListingsOnServer(
  changes: ListingRelabelChanges
): Promise<void> {
  if (!isSharedDbEnabled() || typeof window === "undefined") return;
  const res = await fetch("/api/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "relabel", changes }),
  });
  if (!res.ok) return;
  const json = (await res.json()) as { listings?: SubmittedListing[] };
  if (!json.listings) return;
  replaceListingsMirror(json.listings.map(normalizeSubmittedListing));
}
