/** Public search / browse pagination — keep queries bounded as inventory grows. */

export const PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE = 24;
export const PUBLIC_LISTINGS_MAX_PAGE_SIZE = 96;
/** Hard ceiling for admin/host “load all” style queries — never unbounded. */
export const LISTINGS_QUERY_HARD_CAP = 2000;

export const PUBLIC_LISTINGS_PAGE_SIZE_OPTIONS = [24, 48, 72, 96] as const;

export type PublicListingsPageSize =
  (typeof PUBLIC_LISTINGS_PAGE_SIZE_OPTIONS)[number];

export type ListingPagination = {
  page: number;
  pageSize: number;
};

export function parseListingPagination(input?: {
  page?: string | number | null;
  perPage?: string | number | null;
  limit?: string | number | null;
}): ListingPagination {
  const page = Math.max(1, Math.floor(Number(input?.page)) || 1);
  const rawSize =
    Number(input?.perPage ?? input?.limit) || PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(
    PUBLIC_LISTINGS_MAX_PAGE_SIZE,
    Math.max(1, Math.floor(rawSize) || PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE)
  );
  return { page, pageSize };
}

export function parsePublicPageSize(value?: string | number): PublicListingsPageSize {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  if (PUBLIC_LISTINGS_PAGE_SIZE_OPTIONS.includes(n as PublicListingsPageSize)) {
    return n as PublicListingsPageSize;
  }
  return PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE;
}

export function listingPaginationSkip(pagination: ListingPagination): number {
  return (pagination.page - 1) * pagination.pageSize;
}
