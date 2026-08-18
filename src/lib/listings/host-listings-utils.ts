import { getDemoUser } from "@/lib/auth/demo-auth";
import type { GuestUser } from "@/lib/auth/types";
import type { ListingReviewStatus, SubmittedListing } from "./submission-types";

export function resolveHostId(user: GuestUser | null | undefined): string | undefined {
  if (user?.staffHostId) return user.staffHostId;
  return user?.id ?? getDemoUser()?.id ?? undefined;
}

export function resolveHostName(user: GuestUser | null | undefined): string {
  return user?.fullName ?? getDemoUser()?.fullName ?? "Demo Host";
}

export function listingStatusLabel(status: ListingReviewStatus): string {
  switch (status) {
    case "approved":
      return "Active";
    case "pending":
      return "Pending";
    case "rejected":
      return "Rejected";
    case "unpublished":
      return "Unpublished";
  }
}

export function filterHostListings(
  all: SubmittedListing[],
  hostId: string | undefined,
  hostName?: string
): SubmittedListing[] {
  const normalizedHostName = hostName?.trim().toLowerCase();

  return all
    .filter((l) => {
      const byId = hostId ? l.hostId === hostId || l.hostId === "demo-host" : l.hostId === "demo-host";
      const byName =
        !!normalizedHostName && l.hostName.trim().toLowerCase() === normalizedHostName;
      return byId || byName;
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export function toHostListingRow(l: SubmittedListing) {
  return {
    id: l.id,
    title: l.title,
    status: l.status,
    statusLabel: listingStatusLabel(l.status),
    coverUrl: l.photoUrls[0] ?? null,
    bookings: 0,
    revenue: "AED 0",
    rating: 0,
  };
}
