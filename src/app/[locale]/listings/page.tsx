import { setRequestLocale } from "next-intl/server";
import { SearchResultsContent } from "@/components/search/search-results-content";
import type { SortOption } from "@/lib/listings/public-listings";

export const revalidate = 60;

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
    parent?: string;
    category?: string;
    subcategory?: string;
    checkIn?: string;
    checkOut?: string;
    advanced?: string;
    sort?: string;
    page?: string;
    perPage?: string;
  }>;
}) {
  const { locale } = await params;
  const { q, filter, country, state, parent, category, subcategory, checkIn, checkOut, advanced, sort, page, perPage } =
    await searchParams;
  setRequestLocale(locale);

  const pageNum = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const perPageNum = Number.parseInt(perPage ?? "25", 10) || 25;

  return (
    <SearchResultsContent
      query={q ?? ""}
      filter={filter ?? ""}
      country={country ?? ""}
      state={state ?? ""}
      parent={parent ?? ""}
      category={category ?? ""}
      subcategory={subcategory ?? ""}
      checkIn={checkIn ?? ""}
      checkOut={checkOut ?? ""}
      advanced={advanced ?? ""}
      sort={parseSortOption(sort)}
      page={pageNum}
      perPage={perPageNum}
      resultsPath="/listings"
    />
  );
}
