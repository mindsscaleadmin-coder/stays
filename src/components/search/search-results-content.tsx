"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/routing";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  filterPublicListings,
  isFeaturedStay,
  sortPublicListings,
  stayMatchesCategory,
  stayMatchesParentCategory,
  type SortOption,
} from "@/lib/listings/public-listings";
import { usePublicListings } from "@/lib/listings/use-public-listings";
import { SearchFilterBar } from "@/components/search/search-filter-bar";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { getFavoriteIds, setFavoriteIds } from "@/lib/mock/guest-data";
import type { Stay } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { findCountryByListingName } from "@/lib/admin/country-utils";
import { useCountry } from "@/components/providers/country-provider";
import type { Country as TaxonomyCountry } from "@/lib/admin/taxonomy-types";

const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function parsePageSize(value?: string | number): PageSize {
  const n = typeof value === "number" ? value : Number(value);
  if (PAGE_SIZE_OPTIONS.includes(n as PageSize)) return n as PageSize;
  return 25;
}

function formatPostedDate(value?: string): string {
  if (!value) return "Recently";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function SpecBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[4.5rem] flex-1 rounded-md bg-[#f0f1f2] px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 leading-none">
        {label}
      </p>
      <p className="text-sm font-bold text-gray-900 mt-1 truncate">{value}</p>
    </div>
  );
}

function ListingsAdSlot() {
  return (
    <aside className="hidden lg:block w-[220px] xl:w-[240px] shrink-0">
      <div className="sticky top-24 space-y-4">
        <div className="rounded-lg overflow-hidden bg-[var(--brand-green-dark)] text-white min-h-[520px] flex flex-col p-5 relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
            Sponsored
          </p>
          <h3 className="mt-4 text-xl font-bold leading-snug font-display">
            List your farm stay
          </h3>
          <p className="mt-2 text-sm text-white/75 leading-relaxed">
            Reach guests looking for premium stays across the Emirates.
          </p>
          <div className="mt-auto pt-8">
            <Link
              href="/host/signup"
              className="inline-flex w-full items-center justify-center bg-white text-[var(--brand-green-dark)] text-sm font-bold py-2.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              Get started
            </Link>
            <p className="mt-3 text-[10px] text-white/45 text-center">Ad space</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 min-h-[180px] flex items-center justify-center px-4 text-center">
          <p className="text-xs text-gray-400 leading-relaxed">
            Ad placement
            <br />
            220 × 180
          </p>
        </div>
      </div>
    </aside>
  );
}

function StayListRow({
  stay,
  locale,
  wishlist,
  onToggleWishlist,
  perNightLabel,
  displayCurrency,
  exchangeRateToAED,
}: {
  stay: Stay;
  locale: string;
  wishlist: string[];
  onToggleWishlist: (id: string) => void;
  perNightLabel: string;
  displayCurrency: string;
  exchangeRateToAED: number;
}) {
  const name = stay.name;
  const location = stay.location;
  const isDataUrl = stay.img.startsWith("data:");
  const photoCount = stay.photoCount ?? 1;
  const isFeatured = isFeaturedStay(stay);
  const categoryPath = [stay.parentCategory, stay.category, stay.subcategory]
    .map((part) => part?.trim())
    .filter((part, index, parts): part is string => {
      if (!part) return false;
      const prev = parts[index - 1]?.trim().toLowerCase();
      return part.toLowerCase() !== prev;
    })
    .join(" • ");
  const priceLabel = formatMoney(stay.price, {
    currency: displayCurrency,
    exchangeRateToAED,
    locale,
  });

  function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/listing/${stay.id}`;
    if (navigator.share) {
      void navigator.share({ title: name, url }).catch(() => undefined);
      return;
    }
    void navigator.clipboard.writeText(url).catch(() => undefined);
  }

  return (
    <article className="flex flex-col sm:flex-row gap-4 py-5 border-b border-gray-200 last:border-b-0">
      <Link
        href={`/listing/${stay.id}`}
        className="relative block w-full sm:w-[240px] lg:w-[260px] shrink-0 aspect-[4/3] rounded-lg overflow-hidden bg-gray-100"
      >
        <Image
          src={stay.img}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 260px"
          unoptimized={isDataUrl}
        />

        <span className="absolute top-2 start-2 inline-flex items-center gap-1 bg-white text-[#1a73e8] text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded shadow-sm">
          <ShieldCheck className="w-3 h-3" />
          Verified
        </span>

        <div className="absolute top-2 end-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShare}
            className="w-8 h-8 rounded-full bg-white/95 shadow-sm flex items-center justify-center text-gray-600 hover:text-gray-900"
            aria-label="Share"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWishlist(stay.id);
            }}
            className="w-8 h-8 rounded-full bg-white/95 shadow-sm flex items-center justify-center"
            aria-label="Save"
          >
            <Heart
              className={cn(
                "w-3.5 h-3.5",
                wishlist.includes(stay.id) ? "fill-red-500 text-red-500" : "text-gray-500"
              )}
            />
          </button>
        </div>

        <span className="absolute bottom-2 start-2 inline-flex items-center gap-1 bg-black/70 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded">
          <Camera className="w-3 h-3" />
          {photoCount}
        </span>

        {photoCount > 1 && (
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1 pointer-events-none">
            {Array.from({ length: Math.min(photoCount, 5) }).map((_, i) => (
              <span
                key={i}
                className={cn("w-1.5 h-1.5 rounded-full", i === 0 ? "bg-white" : "bg-white/45")}
              />
            ))}
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/listing/${stay.id}`} className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 leading-snug hover:underline line-clamp-2">
              {name}
            </h2>
          </Link>
          {isFeatured && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-white bg-purple-600 px-2 py-0.5 rounded">
              <Sparkles className="w-3 h-3" />
              Featured
            </span>
          )}
        </div>

        <p className="mt-1 text-sm text-gray-500 truncate">{categoryPath || stay.type}</p>

        <p className="mt-2 text-xl font-bold text-gray-900">
          {priceLabel}
          <span className="ms-1 text-sm font-medium text-gray-500">{perNightLabel}</span>
        </p>

        <div className="mt-3 flex gap-2">
          <SpecBox label="Guests" value={String(stay.guests)} />
          <SpecBox
            label={stay.type === "venue" ? "Event type" : "Bedrooms"}
            value={stay.type === "venue" ? stay.category || "Venue" : String(stay.beds || "—")}
          />
          <SpecBox label="Bathrooms" value={String(stay.baths)} />
          <SpecBox label="Rating" value={stay.rating > 0 ? String(stay.rating) : "New"} />
        </div>

        <p className="mt-auto pt-3 flex items-center gap-1.5 text-sm text-gray-500">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {location}
            <span className="mx-1.5 text-gray-300">•</span>
            {formatPostedDate(stay.postedAt)}
          </span>
        </p>
      </div>
    </article>
  );
}

export function SearchResultsContent({
  query = "",
  filter = "",
  country = "",
  state = "",
  parent = "",
  category = "",
  subcategory = "",
  checkIn = "",
  checkOut = "",
  advanced = "",
  sort = "recommended",
  page: pageProp = 1,
  perPage: perPageProp = 25,
  resultsPath = "/listings",
}: {
  query?: string;
  filter?: string;
  country?: string;
  state?: string;
  parent?: string;
  category?: string;
  subcategory?: string;
  checkIn?: string;
  checkOut?: string;
  advanced?: string;
  sort?: SortOption;
  page?: number;
  perPage?: number;
  resultsPath?: string;
}) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { listings } = usePublicListings();
  const { data: taxonomy } = useAdminTaxonomy();
  const { country: headerCountry, setCountry: setHeaderCountry } = useCountry();
  const [wishlist, setWishlist] = useState<string[]>([]);

  const perPage = parsePageSize(perPageProp);
  const page = Math.max(1, Math.floor(Number(pageProp)) || 1);
  const effectiveCountry = country.trim() || headerCountry.name || "";

  const appliedAdvancedIds = useMemo(
    () => (advanced ? advanced.split(",").filter(Boolean) : []),
    [advanced]
  );

  useEffect(() => {
    setWishlist(getFavoriteIds());
  }, []);

  const filterNameById = useMemo(() => {
    const map = new Map(taxonomy.extraFilters.map((f) => [f.id, f.name]));
    taxonomy.featureFilters.forEach((f) => map.set(f.id, f.name));
    return map;
  }, [taxonomy.extraFilters, taxonomy.featureFilters]);

  const criteria = useMemo(
    () => ({
      country: effectiveCountry || undefined,
      state: state || undefined,
      parentCategory: parent || undefined,
      category: category || undefined,
      subcategory: subcategory || undefined,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      advancedIds: appliedAdvancedIds.length > 0 ? appliedAdvancedIds : undefined,
    }),
    [effectiveCountry, state, parent, category, subcategory, checkIn, checkOut, appliedAdvancedIds]
  );

  const results = useMemo(() => {
    if (!effectiveCountry) return [];
    const filtered = filterPublicListings(
      listings,
      query,
      filter,
      criteria,
      filterNameById
    );
    return sortPublicListings(filtered, sort);
  }, [listings, query, filter, criteria, filterNameById, sort, effectiveCountry]);

  const totalPages = Math.max(1, Math.ceil(results.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageStart = results.length === 0 ? 0 : (currentPage - 1) * perPage;
  const pageEnd = Math.min(pageStart + perPage, results.length);
  const pageResults = results.slice(pageStart, pageEnd);
  const featuredOnPage =
    sort === "recommended" ? pageResults.filter((stay) => isFeaturedStay(stay)) : [];
  const restOnPage =
    sort === "recommended"
      ? pageResults.filter((stay) => !isFeaturedStay(stay))
      : pageResults;

  function buildParams(overrides: Record<string, string | number | undefined> = {}) {
    const values: Record<string, string | number | undefined> = {
      q: query || undefined,
      filter: filter || undefined,
      country: country || effectiveCountry || undefined,
      state: state || undefined,
      parent: parent || undefined,
      category: category || undefined,
      subcategory: subcategory || undefined,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      advanced: advanced || undefined,
      sort: sort !== "recommended" ? sort : undefined,
      page: currentPage > 1 ? currentPage : undefined,
      perPage: perPage !== 25 ? perPage : undefined,
      ...overrides,
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === "" || value === null) continue;
      if (key === "page" && Number(value) <= 1) continue;
      if (key === "perPage" && Number(value) === 25) continue;
      if (key === "sort" && value === "recommended") continue;
      params.set(key, String(value));
    }
    return params;
  }

  function navigateWithParams(params: URLSearchParams) {
    const qs = params.toString();
    router.push(qs ? `${resultsPath}?${qs}` : resultsPath);
  }

  function goToPage(nextPage: number) {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    navigateWithParams(buildParams({ page: clamped }));
  }

  function changePerPage(next: PageSize) {
    navigateWithParams(buildParams({ perPage: next, page: 1 }));
  }

  const placeLabel = useMemo(() => {
    if (state && effectiveCountry) return `${state}, ${effectiveCountry}`;
    if (effectiveCountry) return effectiveCountry;
    if (state) return state;
    return "your destination";
  }, [effectiveCountry, state]);

  const needsCountry = !effectiveCountry;

  const money = useMemo(() => {
    const match = effectiveCountry
      ? findCountryByListingName(taxonomy.countries as TaxonomyCountry[], effectiveCountry)
      : null;
    if (match) {
      return {
        currency: match.currency || "AED",
        exchangeRateToAED: match.exchangeRateToAED ?? 1,
        name: match.name,
      };
    }
    return {
      currency: headerCountry.currency || "AED",
      exchangeRateToAED: headerCountry.exchangeRateToAED ?? 1,
      name: headerCountry.name,
    };
  }, [effectiveCountry, taxonomy.countries, headerCountry]);

  // Keep header country switcher aligned with the search country
  useEffect(() => {
    if (!country.trim()) return;
    const match = findCountryByListingName(
      taxonomy.countries as TaxonomyCountry[],
      country
    );
    if (match?.code && match.code.toUpperCase() !== headerCountry.code) {
      setHeaderCountry(match.code.toUpperCase());
    }
  }, [country, taxonomy.countries, headerCountry.code, setHeaderCountry]);

  const categoryPills = useMemo(() => {
    const MAJOR_PARENT_IDS = new Set(["p1", "p3", "p4"]);
    const MAJOR_PARENT_NAMES = new Set([
      "stays",
      "farm stays",
      "experiences",
      "venues",
    ]);
    const parents = (taxonomy.parents ?? []).filter((p) => {
      const name = p.name?.trim();
      if (!name) return false;
      return (
        MAJOR_PARENT_IDS.has(p.id) || MAJOR_PARENT_NAMES.has(name.toLowerCase())
      );
    });
    const order = ["p1", "p3", "p4"];
    parents.sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    const inCountry = effectiveCountry
      ? filterPublicListings(
          listings,
          "",
          undefined,
          { country: effectiveCountry },
          filterNameById
        )
      : listings;
    return parents.map((p) => {
      const count = inCountry.filter((s) => stayMatchesParentCategory(s, p.name)).length;
      return { id: p.id, name: p.name, count };
    });
  }, [taxonomy.parents, listings, effectiveCountry, filterNameById]);

  const taxonomyCategoryPills = useMemo(() => {
    if (!parent) return [];
    const parentRow = (taxonomy.parents ?? []).find(
      (p) => p.name.trim().toLowerCase() === parent.trim().toLowerCase()
    );
    const cats = (taxonomy.categories ?? []).filter(
      (c) => c.enabled !== false && (!parentRow || c.parentId === parentRow.id)
    );
    const inCountry = effectiveCountry
      ? filterPublicListings(
          listings,
          "",
          undefined,
          { country: effectiveCountry, parentCategory: parent },
          filterNameById
        )
      : listings;
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      count: inCountry.filter((s) => stayMatchesCategory(s, c.name)).length,
    }));
  }, [
    parent,
    taxonomy.parents,
    taxonomy.categories,
    listings,
    effectiveCountry,
    filterNameById,
  ]);

  function selectParent(name: string) {
    const params = buildParams({
      parent: name || undefined,
      category: undefined,
      subcategory: undefined,
      page: 1,
    });
    if (!name) params.delete("parent");
    else params.set("parent", name);
    params.delete("category");
    params.delete("subcategory");
    params.delete("page");
    navigateWithParams(params);
  }

  function selectCategory(name: string) {
    const params = buildParams({
      category: name || undefined,
      subcategory: undefined,
      page: 1,
    });
    if (!name) params.delete("category");
    else params.set("category", name);
    params.delete("subcategory");
    params.delete("page");
    navigateWithParams(params);
  }

  const toggleWishlist = (id: string) =>
    setWishlist((w) => {
      const next = w.includes(id) ? w.filter((x) => x !== id) : [...w, id];
      setFavoriteIds(next);
      return next;
    });

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPage - 2);
    let end = start + maxButtons - 1;
    if (end > totalPages) {
      end = totalPages;
      start = end - maxButtons + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  return (
    <>
      <SearchFilterBar
        variant="top"
        initialCountry={country || effectiveCountry}
        initialState={state}
        initialParent={parent}
        initialCategory={category}
        initialSubcategory={subcategory}
        initialCheckIn={checkIn}
        initialCheckOut={checkOut}
        initialAdvanced={advanced}
        initialSort={sort}
        activeAdvancedCount={appliedAdvancedIds.length}
        resultsPath={resultsPath}
      />

      <div className="bg-white min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:py-6">
          <header className="mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {filter === "deals"
                ? "Flash deals"
                : filter === "trending"
                  ? "Trending stays"
                  : `Stays in ${placeLabel}`}{" "}
              <span className="text-sm sm:text-base text-gray-500 font-medium">
                • {results.length.toLocaleString()}{" "}
                {results.length === 1 ? "listing" : "listings"}
                {(filter === "deals" || filter === "trending") && placeLabel
                  ? ` in ${placeLabel}`
                  : ""}
              </span>
            </h1>
          </header>

          {categoryPills.length > 0 && (
            <div className="flex flex-nowrap items-center gap-2 mb-3 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => selectParent("")}
                className={cn(
                  "shrink-0 text-sm px-3.5 py-1.5 rounded-full border bg-white transition-colors",
                  !parent
                    ? "border-[#1a73e8] text-[#1a73e8]"
                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                )}
              >
                All
              </button>
              {categoryPills.map((pill) => {
                const active = parent === pill.name;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => selectParent(pill.name)}
                    className={cn(
                      "shrink-0 text-sm px-3.5 py-1.5 rounded-full border bg-white transition-colors",
                      active
                        ? "border-[#1a73e8] text-[#1a73e8]"
                        : "border-gray-300 text-gray-700 hover:border-gray-400"
                    )}
                  >
                    {pill.name} ({pill.count})
                  </button>
                );
              })}
            </div>
          )}

          {taxonomyCategoryPills.length > 0 && (
            <div className="flex flex-nowrap items-center gap-2 mb-5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => selectCategory("")}
                className={cn(
                  "shrink-0 text-sm px-3.5 py-1.5 rounded-full border bg-white transition-colors",
                  !category
                    ? "border-green-700 text-green-700"
                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                )}
              >
                All categories
              </button>
              {taxonomyCategoryPills.map((pill) => {
                const active = category === pill.name;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => selectCategory(pill.name)}
                    className={cn(
                      "shrink-0 text-sm px-3.5 py-1.5 rounded-full border bg-white transition-colors",
                      active
                        ? "border-green-700 text-green-700"
                        : "border-gray-300 text-gray-700 hover:border-gray-400"
                    )}
                  >
                    {pill.name} ({pill.count})
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-6 items-start">
            <div className="flex-1 min-w-0">
              {results.length === 0 ? (
                <div className="py-16 text-center border-t border-gray-200">
                  <Search className="w-9 h-9 text-gray-300 mx-auto mb-3" />
                  {needsCountry ? (
                    <>
                      <p className="text-gray-800 font-medium">
                        Select a country to see listings
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Choose a country in the search bar above, then search again.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-800 font-medium">
                        No listings match your search
                      </p>
                      <Link
                        href="/"
                        className="inline-block mt-3 text-sm font-semibold text-[#1a73e8] hover:underline"
                      >
                        Back to home
                      </Link>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="border-t border-gray-200">
                    {featuredOnPage.length > 0 && (
                      <div className="pt-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-purple-700 px-0 pb-2">
                          Featured
                        </p>
                        {featuredOnPage.map((stay) => (
                          <StayListRow
                            key={stay.id}
                            stay={stay}
                            locale={locale}
                            wishlist={wishlist}
                            onToggleWishlist={toggleWishlist}
                            perNightLabel={t("perNight")}
                            displayCurrency={money.currency}
                            exchangeRateToAED={money.exchangeRateToAED}
                          />
                        ))}
                      </div>
                    )}
                    {restOnPage.length > 0 && (
                      <div className={featuredOnPage.length > 0 ? "pt-2" : undefined}>
                        {featuredOnPage.length > 0 && (
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 px-0 pb-2 pt-2 border-t border-gray-100">
                            All listings
                          </p>
                        )}
                        {restOnPage.map((stay) => (
                          <StayListRow
                            key={stay.id}
                            stay={stay}
                            locale={locale}
                            wishlist={wishlist}
                            onToggleWishlist={toggleWishlist}
                            perNightLabel={t("perNight")}
                            displayCurrency={money.currency}
                            exchangeRateToAED={money.exchangeRateToAED}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 pb-2 border-t border-gray-100 mt-1">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span>
                        Showing{" "}
                        <span className="font-semibold text-gray-900">
                          {pageStart + 1}–{pageEnd}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-gray-900">
                          {results.length.toLocaleString()}
                        </span>
                      </span>
                      <label className="inline-flex items-center gap-2">
                        <span className="text-gray-500">Show</span>
                        <select
                          value={perPage}
                          onChange={(e) => changePerPage(parsePageSize(e.target.value))}
                          className="border border-gray-300 rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                        >
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </select>
                        <span className="text-gray-500">per page</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => goToPage(currentPage - 1)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                      </button>
                      {pageNumbers.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => goToPage(n)}
                          className={cn(
                            "min-w-[36px] h-9 px-2 text-sm font-medium rounded-md border transition-colors",
                            n === currentPage
                              ? "border-[#1a73e8] bg-[#1a73e8] text-white"
                              : "border-gray-300 text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => goToPage(currentPage + 1)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <ListingsAdSlot />
          </div>
        </div>
      </div>
    </>
  );
}
