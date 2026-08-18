/** Maps public catalog listing ids (STAYS mock) to demo host accounts. */
export const CATALOG_LISTING_HOSTS: Record<
  string,
  { hostId: string; hostName: string; title: string }
> = {
  "1": {
    hostId: "seed-host-4",
    hostName: "Ahmed Al Farsi",
    title: "Green Valley Farmhouse",
  },
  "7": {
    hostId: "seed-host-5",
    hostName: "Sara Khan",
    title: "Spice Garden Cottage",
  },
};

export function resolveCatalogListingHost(listingId: string) {
  return CATALOG_LISTING_HOSTS[listingId];
}

export function catalogListingsForHost(hostId: string) {
  return Object.entries(CATALOG_LISTING_HOSTS)
    .filter(([, meta]) => meta.hostId === hostId)
    .map(([listingId, meta]) => ({
      listingId,
      id: listingId,
      title: meta.title,
      hostId: meta.hostId,
      hostName: meta.hostName,
    }));
}
