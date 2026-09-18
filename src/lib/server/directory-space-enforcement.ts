import { isDiningListing } from "@/lib/booking/is-dining-listing";
import { isEventListing } from "@/lib/booking/is-event-listing";
import { eventsDirectoryIsFree } from "@/lib/admin/events-subscription";
import { getFinancialSettingsFromDb } from "@/lib/server/platform-catalog-repo";
import { getHostProfile } from "@/lib/server/host-profile-repo";
import { prisma } from "@/lib/prisma";
import type { SubmitListingInput } from "@/lib/listings/submission-types";
import type { SubmittedListing } from "@/lib/listings/submission-types";
import {
  canAddDirectoryListing,
} from "@/lib/host/directory-space";
import type { DirectoryVertical } from "@/lib/admin/events-subscription";

function listingVertical(listing: {
  parentCategory?: string | null;
  type?: string | null;
  category?: string | null;
}): DirectoryVertical | null {
  if (isDiningListing(listing)) return "dining";
  if (isEventListing(listing)) return "events";
  return null;
}

export function directoryVerticalFromInput(
  input: Pick<SubmitListingInput, "parentCategory" | "type" | "category">
): DirectoryVertical | null {
  return listingVertical(input);
}

export async function countHostDirectoryListings(
  hostId: string,
  vertical: DirectoryVertical
): Promise<number> {
  const rows = await prisma.listing.findMany({
    where: { hostId },
    select: { payload: true },
  });
  let count = 0;
  for (const row of rows) {
    try {
      const listing = JSON.parse(row.payload) as SubmittedListing;
      if (listingVertical(listing) === vertical) count += 1;
    } catch {
      // skip invalid payloads
    }
  }
  return count;
}

export async function assertDirectoryListingCapacity(
  input: SubmitListingInput
): Promise<void> {
  const vertical = directoryVerticalFromInput(input);
  if (!vertical) return;

  const settings = await getFinancialSettingsFromDb();
  const subscriptionSettings = settings.eventsSubscription;
  const freeDuringLaunch = eventsDirectoryIsFree(subscriptionSettings);
  const profile = await getHostProfile(input.hostId, input.hostName);
  const currentCount = await countHostDirectoryListings(input.hostId, vertical);
  const result = canAddDirectoryListing({
    vertical,
    currentCount,
    profile,
    settings: subscriptionSettings,
    freeDuringLaunch,
  });

  if (!result.allowed) {
    throw new Error(result.message ?? "Directory listing limit reached.");
  }
}
