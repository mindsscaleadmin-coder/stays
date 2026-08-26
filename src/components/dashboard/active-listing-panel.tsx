"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import {
  CheckSquare,
  ExternalLink,
  Flag,
  MapPin,
  Pencil,
  Search,
  SlidersHorizontal,
  Sparkles,
  Square,
  Tag,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { filterActiveCountries } from "@/lib/admin/country-utils";
import type { SubmittedListing } from "@/lib/listings/submission-types";

type StatusFilter = "" | "approved" | "pending" | "unpublished" | "rejected" | "flagged";

const selectClass =
  "w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400";

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "", label: "All" },
  { id: "approved", label: "Live" },
  { id: "pending", label: "Pending" },
  { id: "unpublished", label: "Unpublished" },
  { id: "rejected", label: "Rejected" },
  { id: "flagged", label: "Flagged" },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function statusStyle(status: SubmittedListing["status"]) {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "unpublished") return "bg-gray-100 text-gray-600";
  return "bg-red-100 text-red-700";
}

function ListingRow({
  listing,
  selected,
  onToggle,
  onEdit,
  onFeature,
  onFlag,
  onUnpublish,
  onRepublish,
  onDeactivate,
}: {
  listing: SubmittedListing;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onFeature: () => void;
  onFlag: () => void;
  onUnpublish: () => void;
  onRepublish: () => void;
  onDeactivate: () => void;
}) {
  const cover = listing.photoUrls[0];

  return (
    <article className="bg-white rounded-2xl border p-3 sm:p-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 pt-1 text-gray-400 hover:text-green-700"
          aria-label={selected ? "Deselect listing" : "Select listing"}
        >
          {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>

        <div className="relative w-16 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border">
          {cover ? (
            <Image src={cover} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">
              No photo
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 truncate">{listing.title}</h3>
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                statusStyle(listing.status)
              )}
            >
              {listing.status === "approved" ? "Live" : listing.status}
            </span>
            {listing.featured && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase">
                Featured
              </span>
            )}
            {listing.flaggedForReview && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 uppercase inline-flex items-center gap-0.5">
                <Flag className="w-3 h-3" /> Flagged
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {listing.hostName}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {[listing.district, listing.state, listing.country].filter(Boolean).join(", ")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />             {listing.parentCategory}
              {listing.category ? ` · ${listing.category}` : ""}
              {listing.subcategory && listing.subcategory !== listing.category
                ? ` · ${listing.subcategory}`
                : ""}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0 content-start">
          <Link
            href={`/listing/${listing.id}`}
            className="text-[11px] border border-gray-200 px-2 py-1 rounded-lg text-gray-600 hover:border-green-400 inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> View
          </Link>
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] border border-gray-200 px-2 py-1 rounded-lg text-gray-600 hover:border-green-400 inline-flex items-center gap-1"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button
            type="button"
            onClick={onFeature}
            className="text-[11px] border border-gray-200 px-2 py-1 rounded-lg text-gray-600 hover:border-purple-300 inline-flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" /> {listing.featured ? "Unfeature" : "Feature"}
          </button>
          <button
            type="button"
            onClick={onFlag}
            className="text-[11px] border border-gray-200 px-2 py-1 rounded-lg text-gray-600 hover:border-orange-300 inline-flex items-center gap-1"
          >
            <Flag className="w-3 h-3" /> {listing.flaggedForReview ? "Clear flag" : "Flag"}
          </button>
          {listing.status === "approved" && (
            <button
              type="button"
              onClick={onDeactivate}
              className="text-[11px] border border-red-200 px-2 py-1 rounded-lg text-red-600 hover:bg-red-50"
            >
              Deactivate
            </button>
          )}
          {listing.status === "approved" && (
            <button
              type="button"
              onClick={onUnpublish}
              className="text-[11px] border border-gray-200 px-2 py-1 rounded-lg text-gray-600 hover:border-red-300"
            >
              Unpublish
            </button>
          )}
          {listing.status === "unpublished" && (
            <button
              type="button"
              onClick={onRepublish}
              className="text-[11px] border border-green-200 px-2 py-1 rounded-lg text-green-700 hover:bg-green-50"
            >
              Republish
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ActiveListingPanel({
  listings,
  selectedIds,
  onToggleOne,
  onToggleAll,
  onEdit,
  onFeature,
  onFlag,
  onUnpublish,
  onRepublish,
  onDeactivate,
  onBulk,
}: {
  listings: SubmittedListing[];
  selectedIds: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onEdit: (listing: SubmittedListing) => void;
  onFeature: (listing: SubmittedListing) => void;
  onFlag: (listing: SubmittedListing) => void;
  onUnpublish: (listing: SubmittedListing) => void;
  onRepublish: (listing: SubmittedListing) => void;
  onDeactivate: (id: string) => void;
  onBulk: (action: "feature" | "unfeature" | "flag" | "unflag") => void;
}) {
  const { data: taxonomy } = useAdminTaxonomy();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [host, setHost] = useState("");
  const [parentCategory, setParentCategory] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hosts = useMemo(
    () => Array.from(new Set(listings.map((l) => l.hostName).filter(Boolean))).sort(),
    [listings]
  );
  const countries = useMemo(() => {
    const fromTaxonomy = filterActiveCountries(taxonomy.countries).map((c) => c.name);
    const fromListings = listings.map((l) => l.country).filter(Boolean);
    return Array.from(new Set([...fromTaxonomy, ...fromListings])).sort();
  }, [taxonomy.countries, listings]);
  const states = useMemo(() => {
    const fromTaxonomy = taxonomy.states
      .filter((s) => {
        if (!country) return true;
        const match = taxonomy.countries.find((c) => c.name === country);
        return match ? s.countryId === match.id : true;
      })
      .map((s) => s.name);
    const fromListings = listings
      .filter((l) => !country || l.country === country)
      .map((l) => l.state);
    return Array.from(new Set([...fromTaxonomy, ...fromListings].filter(Boolean))).sort();
  }, [taxonomy.states, taxonomy.countries, listings, country]);
  const parents = useMemo(() => {
    const fromTaxonomy = taxonomy.parents.map((p) => p.name);
    const fromListings = listings.map((l) => l.parentCategory).filter(Boolean);
    return Array.from(new Set([...fromTaxonomy, ...fromListings])).sort();
  }, [taxonomy.parents, listings]);
  const categories = useMemo(() => {
    const fromTaxonomy = taxonomy.categories
      .filter((c) => {
        if (!parentCategory) return true;
        const match = taxonomy.parents.find((p) => p.name === parentCategory);
        return match ? c.parentId === match.id : true;
      })
      .map((c) => c.name);
    const fromListings = listings
      .filter((l) => !parentCategory || l.parentCategory === parentCategory)
      .map((l) => l.category)
      .filter(Boolean);
    return Array.from(new Set([...fromTaxonomy, ...fromListings])).sort();
  }, [taxonomy.categories, taxonomy.parents, listings, parentCategory]);
  const subcategories = useMemo(() => {
    const fromTaxonomy = taxonomy.subcategories
      .filter((sc) => {
        if (category) {
          const match = taxonomy.categories.find((c) => c.name === category);
          return match ? sc.categoryId === match.id : true;
        }
        if (parentCategory) {
          const match = taxonomy.parents.find((p) => p.name === parentCategory);
          return match ? sc.parentId === match.id : true;
        }
        return true;
      })
      .map((sc) => sc.name);
    const fromListings = listings
      .filter(
        (l) =>
          (!parentCategory || l.parentCategory === parentCategory) &&
          (!category || l.category === category)
      )
      .map((l) => l.subcategory);
    return Array.from(new Set([...fromTaxonomy, ...fromListings].filter(Boolean))).sort();
  }, [
    taxonomy.subcategories,
    taxonomy.categories,
    taxonomy.parents,
    listings,
    parentCategory,
    category,
  ]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return listings.filter((listing) => {
      if (statusFilter === "flagged") {
        if (!listing.flaggedForReview) return false;
      } else if (statusFilter && listing.status !== statusFilter) {
        return false;
      }
      if (country && listing.country !== country) return false;
      if (state && listing.state !== state) return false;
      if (host && listing.hostName !== host) return false;
      if (parentCategory && listing.parentCategory !== parentCategory) return false;
      if (category && listing.category !== category) return false;
      if (subcategory && listing.subcategory !== subcategory) return false;
      if (!q) return true;
      const haystack = [
        listing.title,
        listing.hostName,
        listing.country,
        listing.state,
        listing.district,
        listing.parentCategory,
        listing.category,
        listing.subcategory,
        listing.type,
        listing.status,
        ...(listing.advancedFilters ?? []),
        ...(listing.customFilters ?? []).map((f) => `${f.label} ${f.value}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [listings, query, statusFilter, country, state, host, parentCategory, category, subcategory]);

  const filteredIds = useMemo(() => filtered.map((l) => l.id), [filtered]);
  const allSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  const activeFilterCount =
    [statusFilter, country, state, host, parentCategory, category, subcategory].filter(Boolean).length +
    (query ? 1 : 0);

  function clearFilters() {
    setQuery("");
    setStatusFilter("");
    setCountry("");
    setState("");
    setHost("");
    setParentCategory("");
    setCategory("");
    setSubcategory("");
  }

  const filterChips = [
    statusFilter && {
      key: "status",
      label: STATUS_OPTIONS.find((o) => o.id === statusFilter)?.label ?? statusFilter,
      clear: () => setStatusFilter(""),
    },
    country && { key: "country", label: country, clear: () => { setCountry(""); setState(""); } },
    state && { key: "state", label: state, clear: () => setState("") },
    host && { key: "host", label: host, clear: () => setHost("") },
    parentCategory && {
      key: "parent",
      label: parentCategory,
      clear: () => {
        setParentCategory("");
        setCategory("");
        setSubcategory("");
      },
    },
    category && {
      key: "category",
      label: category,
      clear: () => {
        setCategory("");
        setSubcategory("");
      },
    },
    subcategory && { key: "sub", label: subcategory, clear: () => setSubcategory("") },
    query && { key: "q", label: `“${query}”`, clear: () => setQuery("") },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  function handleDeactivate(id: string) {
    if (!confirm("Deactivate this listing? It will be removed from the live platform.")) return;
    onDeactivate(id);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="px-4 py-3 border-b space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, host, location…"
                className={cn(selectClass, "ps-9")}
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id || "all"}
                  type="button"
                  onClick={() => setStatusFilter(opt.id)}
                  className={cn(
                    "text-xs font-semibold px-2.5 py-1.5 rounded-full border whitespace-nowrap transition-colors",
                    statusFilter === opt.id
                      ? "bg-green-700 border-green-700 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:border-green-400"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border shrink-0",
                filtersOpen || country || state || host || parentCategory || category || subcategory
                  ? "border-green-700 text-green-800 bg-green-50"
                  : "border-gray-200 text-gray-600 hover:border-green-400"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              More
              {activeFilterCount > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-green-700 text-white text-[10px] leading-4 text-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {filtersOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              <label className="block">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Country
                </span>
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setState("");
                  }}
                  className={selectClass}
                >
                  <option value="">All countries</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  State
                </span>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={!country}
                  className={selectClass}
                >
                  <option value="">{country ? "All states" : "Select country first"}</option>
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Host
                </span>
                <select
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className={selectClass}
                >
                  <option value="">All hosts</option>
                  {hosts.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Parent
                </span>
                <select
                  value={parentCategory}
                  onChange={(e) => {
                    setParentCategory(e.target.value);
                    setCategory("");
                    setSubcategory("");
                  }}
                  className={selectClass}
                >
                  <option value="">All parents</option>
                  {parents.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Category
                </span>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSubcategory("");
                  }}
                  disabled={!parentCategory}
                  className={selectClass}
                >
                  <option value="">
                    {parentCategory ? "All categories" : "Select parent first"}
                  </option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Sub category
                </span>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  disabled={!category}
                  className={selectClass}
                >
                  <option value="">{category ? "All sub categories" : "Select category first"}</option>
                  {subcategories.map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {filterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {filterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full"
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-semibold text-green-700 hover:text-green-800 px-1"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-800">{filtered.length}</span> of{" "}
            {listings.length} listing{listings.length === 1 ? "" : "s"}
            {selectedIds.size > 0 && (
              <span className="text-green-700 font-medium"> · {selectedIds.size} selected</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleAll(filteredIds)}
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:border-green-400"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => onBulk("feature")}
              className="text-xs border border-purple-200 px-3 py-1.5 rounded-lg text-purple-700 disabled:opacity-40"
            >
              Feature
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => onBulk("unfeature")}
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 disabled:opacity-40"
            >
              Unfeature
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => onBulk("flag")}
              className="text-xs border border-orange-200 px-3 py-1.5 rounded-lg text-orange-700 disabled:opacity-40"
            >
              Flag
            </button>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => onBulk("unflag")}
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 disabled:opacity-40"
            >
              Clear flags
            </button>
          </div>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">
          No listings yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">
          No listings match these filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((listing) => (
            <ListingRow
              key={listing.id}
              listing={listing}
              selected={selectedIds.has(listing.id)}
              onToggle={() => onToggleOne(listing.id)}
              onEdit={() => onEdit(listing)}
              onFeature={() => onFeature(listing)}
              onFlag={() => onFlag(listing)}
              onUnpublish={() => onUnpublish(listing)}
              onRepublish={() => onRepublish(listing)}
              onDeactivate={() => handleDeactivate(listing.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
