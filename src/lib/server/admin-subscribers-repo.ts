import { isDiningListing } from "@/lib/booking/is-dining-listing";
import { isEventListing } from "@/lib/booking/is-event-listing";
import {
  billingStatusLabel,
  daysUntilExpiry,
  effectiveDirectoryExpiry,
  EXPIRING_SOON_DAYS,
  isSuggestedForBilling,
  resolveDirectoryBillingStatus,
} from "@/lib/host/directory-billing";
import type { DirectoryBillingStatus } from "@/lib/host/directory-billing-types";
import { getHostProfile } from "@/lib/server/host-profile-repo";
import { prisma } from "@/lib/prisma";
import type { SubmittedListing } from "@/lib/listings/submission-types";

export type AdminSubscriberRow = {
  hostId: string;
  hostName: string;
  email: string;
  joinedAt: string;
  eventsListingCount: number;
  diningListingCount: number;
  bookingCount: number;
  preferredPlanId: string;
  billingStatus: DirectoryBillingStatus;
  billingStatusLabel: string;
  billingEnforced: boolean;
  expiry: string | null;
  daysUntilExpiry: number | null;
  graceEndsAt: string | null;
  notes: string;
  suggestedForBilling: boolean;
  paidAt: string | null;
  billingEnabledAt: string | null;
};

export type AdminSubscriberFilter =
  | "all"
  | "launch_free"
  | "suggested"
  | "pending_payment"
  | "grace"
  | "active"
  | "expiring_soon"
  | "expired";

function listingVertical(listing: {
  parentCategory?: string | null;
  type?: string | null;
  category?: string | null;
}): "events" | "dining" | null {
  if (isDiningListing(listing)) return "dining";
  if (isEventListing(listing)) return "events";
  return null;
}

function matchesFilter(row: AdminSubscriberRow, filter: AdminSubscriberFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "launch_free":
      return row.billingStatus === "launch_free";
    case "suggested":
      return row.suggestedForBilling;
    case "pending_payment":
      return row.billingStatus === "pending_payment";
    case "grace":
      return row.billingStatus === "grace";
    case "active":
      return row.billingStatus === "active";
    case "expiring_soon":
      return (
        row.billingStatus === "active" &&
        row.daysUntilExpiry !== null &&
        row.daysUntilExpiry >= 0 &&
        row.daysUntilExpiry <= EXPIRING_SOON_DAYS
      );
    case "expired":
      return row.billingStatus === "expired";
    default:
      return true;
  }
}

export async function listAdminSubscribers(options?: {
  filter?: AdminSubscriberFilter;
  search?: string;
}): Promise<AdminSubscriberRow[]> {
  const filter = options?.filter ?? "all";
  const search = options?.search?.trim().toLowerCase() ?? "";

  const hosts = await prisma.user.findMany({
    where: { roles: { contains: "host" } },
    select: {
      id: true,
      fullName: true,
      email: true,
      createdAt: true,
      listings: { select: { payload: true } },
      bookingsMade: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: AdminSubscriberRow[] = [];

  for (const host of hosts) {
    let eventsListingCount = 0;
    let diningListingCount = 0;
    for (const listing of host.listings) {
      try {
        const parsed = JSON.parse(listing.payload) as SubmittedListing;
        const vertical = listingVertical(parsed);
        if (vertical === "events") eventsListingCount += 1;
        if (vertical === "dining") diningListingCount += 1;
      } catch {
        // skip
      }
    }

    const profile = await getHostProfile(host.id, host.fullName);
    const billingStatus = resolveDirectoryBillingStatus(profile);
    const expiry = effectiveDirectoryExpiry(profile) ?? null;
    const row: AdminSubscriberRow = {
      hostId: host.id,
      hostName: profile?.displayName || host.fullName,
      email: host.email ?? "",
      joinedAt: host.createdAt.toISOString(),
      eventsListingCount,
      diningListingCount,
      bookingCount: host.bookingsMade.length,
      preferredPlanId: profile?.preferredDirectoryPlanId ?? "",
      billingStatus,
      billingStatusLabel: billingStatusLabel(billingStatus),
      billingEnforced: Boolean(profile?.directoryBillingEnforced),
      expiry,
      daysUntilExpiry: daysUntilExpiry(expiry),
      graceEndsAt: profile?.directoryBillingGraceEndsAt ?? null,
      notes: profile?.directoryBillingNotes ?? "",
      suggestedForBilling: isSuggestedForBilling(
        host.createdAt.toISOString(),
        host.bookingsMade.length,
        profile
      ),
      paidAt: profile?.directoryBillingPaidAt ?? null,
      billingEnabledAt: profile?.directoryBillingEnabledAt ?? null,
    };

    if (!matchesFilter(row, filter)) continue;
    if (search) {
      const haystack = `${row.hostName} ${row.email} ${row.hostId}`.toLowerCase();
      if (!haystack.includes(search)) continue;
    }
    rows.push(row);
  }

  return rows;
}
