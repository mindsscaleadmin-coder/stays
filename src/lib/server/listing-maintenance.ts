/**
 * One-time / deploy-time listing table maintenance.
 *
 * Do NOT call this from request handlers. Run via:
 *   npm run listings:backfill
 *   npm run listings:backfill -- --dry-run
 */
import { prisma } from "@/lib/prisma";
import { normalizeSubmittedListing } from "@/lib/listings/submission-data";
import type { SubmittedListing } from "@/lib/listings/submission-types";

function parsePayload(raw: string): SubmittedListing {
  return normalizeSubmittedListing(JSON.parse(raw) as SubmittedListing);
}

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

const STATUS_RESTRICTIVENESS: Record<string, number> = {
  rejected: 0,
  unpublished: 1,
  pending: 2,
  approved: 3,
};

function moreRestrictiveStatus(a: string, b: string): string {
  const ra = STATUS_RESTRICTIVENESS[a] ?? 2;
  const rb = STATUS_RESTRICTIVENESS[b] ?? 2;
  return ra <= rb ? a : b;
}

export type ListingMaintenanceReport = {
  scanned: number;
  filterColumnsUpdated: number;
  statusDriftRepaired: number;
  dryRun: boolean;
};

/**
 * Scan listings once and:
 * 1) Copy filter fields from JSON payload onto indexed columns
 * 2) Reconcile DB status vs payload status (prefer more restrictive)
 *
 * Safe to re-run — only writes rows that still need fixing.
 */
export async function runListingTableMaintenance(opts?: {
  dryRun?: boolean;
}): Promise<ListingMaintenanceReport> {
  const dryRun = Boolean(opts?.dryRun);
  const rows = await prisma.listing.findMany({
    select: {
      id: true,
      status: true,
      payload: true,
      country: true,
      state: true,
      district: true,
      parentCategory: true,
      category: true,
      subcategory: true,
    },
  });

  const filterUpdates: {
    id: string;
    country: string;
    state: string;
    district: string;
    parentCategory: string;
    category: string;
    subcategory: string;
  }[] = [];
  const statusUpdates: { id: string; status: string; payload: string }[] = [];

  for (const row of rows) {
    let listing: SubmittedListing;
    try {
      listing = parsePayload(row.payload);
    } catch {
      continue;
    }

    const cols = filterColumnsFromListing(listing);
    const needsFilter =
      (row.country ?? "") !== cols.country ||
      (row.state ?? "") !== cols.state ||
      (row.district ?? "") !== cols.district ||
      (row.parentCategory ?? "") !== cols.parentCategory ||
      (row.category ?? "") !== cols.category ||
      (row.subcategory ?? "") !== cols.subcategory;
    if (needsFilter) {
      filterUpdates.push({ id: row.id, ...cols });
    }

    const payloadStatus = listing.status?.trim();
    if (payloadStatus && payloadStatus !== row.status) {
      const next = moreRestrictiveStatus(row.status, payloadStatus);
      if (next !== row.status || next !== payloadStatus) {
        const data = JSON.parse(row.payload) as Record<string, unknown>;
        data.status = next;
        statusUpdates.push({
          id: row.id,
          status: next,
          payload: JSON.stringify(data),
        });
      }
    }
  }

  if (!dryRun) {
    if (filterUpdates.length > 0) {
      await prisma.$transaction(
        filterUpdates.map((item) =>
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
    }
    if (statusUpdates.length > 0) {
      await prisma.$transaction(
        statusUpdates.map((item) =>
          prisma.listing.update({
            where: { id: item.id },
            data: { status: item.status, payload: item.payload },
          })
        )
      );
    }
  }

  return {
    scanned: rows.length,
    filterColumnsUpdated: filterUpdates.length,
    statusDriftRepaired: statusUpdates.length,
    dryRun,
  };
}
