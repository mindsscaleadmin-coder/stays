import { setRequestLocale } from "next-intl/server";
import { SearchResultsContent } from "@/components/search/search-results-content";
import type { SortOption } from "@/lib/listings/public-listings";
import { getPublicStaysFromStore } from "@/lib/listings/public-listings-server";
import {
  parseListingPagination,
  parsePublicPageSize,
  PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE,
} from "@/lib/listings/listings-pagination";

export const dynamic = "force-dynamic";

function parseSortOption(sort?: string): SortOption {
  if (
    sort === "price_asc" ||
    sort === "price_desc" ||
    sort === "rating_desc" ||
    sort === "newest"
  ) {
    return sort;
  }
  return "recommended";
}

export default async function ListingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    filter?: string;
    country?: string;
    state?: string;
    district?: string;
    city?: string;
    parent?: string;
    category?: string;
    subcategory?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: string;
    adults?: string;
    children?: string;
    infants?: string;
    advanced?: string;
    sort?: string;
    page?: string;
    perPage?: string;
  }>;
}) {
  const { locale } = await params;
  const {
    q,
    filter,
    country,
    state,
    district,
    city,
    parent,
    category,
    subcategory,
    checkIn,
    checkOut,
    guests,
    adults,
    children,
    infants,
    advanced,
    sort,
    page,
    perPage,
  } = await searchParams;
  setRequestLocale(locale);

  const perPageNum = parsePublicPageSize(perPage ?? PUBLIC_LISTINGS_DEFAULT_PAGE_SIZE);
  const { page: pageNum } = parseListingPagination({ page, perPage: perPageNum });
  const { stays, total } = await getPublicStaysFromStore(
    {
      country: country || undefined,
      state: state || undefined,
      district: district || undefined,
      city: city || undefined,
      parentCategory: parent || undefined,
      category: category || undefined,
      subcategory: subcategory || undefined,
      q: q || undefined,
    },
    { page: pageNum, pageSize: perPageNum }
  );

  return (
    <SearchResultsContent
      initialListings={stays}
      totalCount={total}
      serverPaginated
      query={q ?? ""}
      filter={filter ?? ""}
      country={country ?? ""}
      state={state ?? ""}
      district={district ?? ""}
      city={city ?? ""}
      parent={parent ?? ""}
      category={category ?? ""}
      subcategory={subcategory ?? ""}
      checkIn={checkIn ?? ""}
      checkOut={checkOut ?? ""}
      guests={guests ?? ""}
      adults={adults ?? ""}
      childGuests={children ?? ""}
      infants={infants ?? ""}
      advanced={advanced ?? ""}
      sort={parseSortOption(sort)}
      page={pageNum}
      perPage={perPageNum}
      resultsPath="/listings"
    />
  );
}
