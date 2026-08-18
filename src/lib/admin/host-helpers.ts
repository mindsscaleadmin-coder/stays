import type { AdminUserRecord } from "./user-types";
import type { SubmittedListing } from "@/lib/listings/submission-types";

export interface HostListingStats {
  active: number;
  pending: number;
  rejected: number;
  total: number;
}

export function resolveAdminHosts(
  users: AdminUserRecord[],
  listings: SubmittedListing[]
): AdminUserRecord[] {
  const fromUsers = users.filter((u) => u.roles.includes("host"));
  const byId = new Map(fromUsers.map((u) => [u.id, u]));

  for (const listing of listings) {
    const existing = Array.from(byId.values()).find(
      (u) =>
        u.name.toLowerCase() === listing.hostName.toLowerCase() ||
        u.id === listing.hostId
    );
    if (existing || byId.has(listing.hostId)) continue;
    byId.set(listing.hostId, {
      id: listing.hostId,
      name: listing.hostName,
      email: `${listing.hostId}@host.local`,
      roles: ["host"],
      status: "verified",
      joinedAt: listing.submittedAt,
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function buildHostListingStats(
  listings: SubmittedListing[]
): Map<string, HostListingStats> {
  const map = new Map<string, HostListingStats>();
  for (const listing of listings) {
    const keys = [listing.hostId, listing.hostName.toLowerCase()];
    for (const key of keys) {
      const prev = map.get(key) ?? { active: 0, pending: 0, rejected: 0, total: 0 };
      prev.total += 1;
      if (listing.status === "approved") prev.active += 1;
      if (listing.status === "pending") prev.pending += 1;
      if (listing.status === "rejected") prev.rejected += 1;
      map.set(key, prev);
    }
  }
  return map;
}

export function statsForHost(
  map: Map<string, HostListingStats>,
  host: AdminUserRecord
): HostListingStats {
  return (
    map.get(host.id) ??
    map.get(host.name.toLowerCase()) ?? { active: 0, pending: 0, rejected: 0, total: 0 }
  );
}

export function listingsForHost(
  listings: SubmittedListing[],
  host: AdminUserRecord
): SubmittedListing[] {
  return listings
    .filter(
      (l) =>
        l.hostId === host.id || l.hostName.toLowerCase() === host.name.toLowerCase()
    )
    .sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
}

export function findAdminHost(
  hosts: AdminUserRecord[],
  id: string
): AdminUserRecord | undefined {
  const decoded = decodeURIComponent(id);
  return hosts.find(
    (h) => h.id === decoded || h.id === id || h.name.toLowerCase() === decoded.toLowerCase()
  );
}
