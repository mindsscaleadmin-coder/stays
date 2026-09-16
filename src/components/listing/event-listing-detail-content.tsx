"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Building2,
  CheckCircle,
  Flag,
  UtensilsCrossed,
  Heart,
  MapPin,
  ChevronRight,
  MessageCircle,
  Share2,
  Shield,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import {
  DiningPlatformReservationSection,
  DiningCuisineSection,
  DiningExperienceSection,
  DiningHostSection,
  DiningLocationNotes,
  DiningMenuSection,
  DiningOpeningHoursSection,
  DiningQuickInfoBar,
  DiningSameHostSection,
  DiningStructuredPolicies,
  getDiningStructuredPolicies,
} from "@/components/listing/dining-listing-sections";
import { groupDiningFilters } from "@/lib/listings/dining-filter-display";
import {
  formatAveragePriceRange,
  formatPriceLevel,
  hasDiningMenu,
  type DiningDetails,
} from "@/lib/listings/dining-details-types";
import type { Stay } from "@/lib/mock/data";
import { LISTING_PLACEHOLDER_IMG } from "@/lib/listings/submission-to-stay";
import { isDataImageUrl } from "@/lib/utils";
import type { StayReview } from "@/lib/booking/stay-reviews-types";
import type { HostPublicProfile } from "@/lib/host/host-profile-types";
import { EventAvailabilityRequestCard } from "@/components/listing/event-availability-request-card";
import { ListingSupportHelpCard } from "@/components/listing/listing-support-help-card";
import { ListingAvailabilityCalendar } from "@/components/listing/listing-availability-calendar";
import { ListingMapEmbed } from "@/components/listing/listing-map-embed";
import { EventVenueAmenitiesSection } from "@/components/listing/event-venue-amenities-section";
import {
  EventSpaceDetailModal,
  shouldShowSpaceReadMore,
} from "@/components/listing/event-space-detail-modal";
import { ListingReviewsSection } from "@/components/listing/listing-reviews-section";
import { RichTextView } from "@/components/listing/rich-text-view";
import type { EventSpace } from "@/lib/listings/event-space-types";
import {
  formatEventGuestCapacityLabel,
  formatEventGuestCapacityStat,
  resolveEventGuestCapacityRange,
} from "@/lib/listings/event-space-display";
import type { VenueDetails } from "@/lib/listings/venue-details-types";
import {
  DIRECTORY_LISTING_COPY,
  resolveDirectoryPriceSuffix,
  type DirectoryListingVariant,
} from "@/lib/listings/directory-listing-copy";
import { cn } from "@/lib/utils";

function spaceKey(space: EventSpace) {
  return space.id ?? space.name;
}

export type { EventSpace };

interface EventHostOffer {
  id: string;
  badge: string;
  title: string;
  detail: string;
}

function directoryTabs(
  variant: DirectoryListingVariant,
  options?: { hasMenu?: boolean; hasPolicies?: boolean }
) {
  const copy = DIRECTORY_LISTING_COPY[variant];
  if (variant === "dining") {
    return [
      ["overview", "Overview"],
      ...(options?.hasMenu ? [["menu", "Menu"] as const] : []),
      ["amenities", "Amenities"],
      ["location", "Location"],
      ["reviews", "Reviews"],
      ...(options?.hasPolicies ? [["policies", "Policies"] as const] : []),
    ] as const;
  }
  return [
    ["overview", "Overview"],
    ["spaces", copy.spacesTab],
    ["amenities", "Amenities"],
    ["location", "Location"],
    ["reviews", "Reviews"],
    ["policies", "Policies"],
  ] as const;
}

function useHostProfile(hostId?: string) {
  const [profile, setProfile] = useState<HostPublicProfile | null>(null);

  useEffect(() => {
    if (!hostId) return;
    let cancelled = false;
    void fetch(`/api/hosts/${encodeURIComponent(hostId)}/profile`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { profile?: HostPublicProfile } | null) => {
        if (!cancelled && data?.profile) setProfile(data.profile);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hostId]);

  return profile;
}

export function EventListingDetailContent({
  stay,
  description,
  highlights,
  amenities,
  features,
  spaces,
  venueDetails,
  diningDetails,
  advancedFilterIds = [],
  sameHostListings = [],
  reviews,
  reviewsReady,
  rating,
  reviewCount,
  mapEmbedUrl,
  policies,
  offers,
  featured,
  wishlist,
  money,
  onToggleWishlist,
  onShare,
  variant = "event",
}: {
  stay: Stay;
  description?: string;
  highlights: string[];
  amenities: string[];
  features: { icon: LucideIcon; label: string }[];
  spaces: EventSpace[];
  venueDetails?: VenueDetails;
  diningDetails?: DiningDetails;
  advancedFilterIds?: string[];
  sameHostListings?: Pick<Stay, "id" | "name" | "category" | "subcategory" | "img">[];
  reviews: StayReview[];
  reviewsReady: boolean;
  rating: number;
  reviewCount: number;
  mapEmbedUrl?: string;
  policies: { title: string; desc: string }[];
  offers: EventHostOffer[];
  featured: boolean;
  wishlist: boolean;
  money: (amount: number) => string;
  onToggleWishlist: () => void;
  onShare: () => void;
  variant?: DirectoryListingVariant;
}) {
  const locale = useLocale();
  const { data: taxonomy } = useAdminTaxonomy();
  const profile = useHostProfile(stay.hostId);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [readMore, setReadMore] = useState(false);
  const [detailSpace, setDetailSpace] = useState<EventSpace | null>(null);
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);
  const [bookingFocusTick, setBookingFocusTick] = useState(0);
  const copy = DIRECTORY_LISTING_COPY[variant];
  const diningFilterGroups = useMemo(
    () => (variant === "dining" ? groupDiningFilters(taxonomy, advancedFilterIds) : {}),
    [variant, taxonomy, advancedFilterIds]
  );
  const diningPolicies = useMemo(
    () => (variant === "dining" ? getDiningStructuredPolicies(diningDetails) : []),
    [variant, diningDetails]
  );
  const tabs = directoryTabs(variant, {
    hasMenu: hasDiningMenu(diningDetails),
    hasPolicies: variant !== "dining" || diningPolicies.length > 0,
  });

  const category =
    stay.category?.trim() || (variant === "dining" ? "Restaurant" : "Event venue");
  const subcategory =
    stay.subcategory?.trim() && stay.subcategory.trim() !== stay.category?.trim()
      ? stay.subcategory.trim()
      : "";
  const priceLevelLabel =
    variant === "dining" ? formatPriceLevel(diningDetails?.priceLevel) : "";
  const averagePriceLabel =
    variant === "dining" ? formatAveragePriceRange(diningDetails, money) : "";
  const hostName = profile?.displayName?.trim() || copy.hostLabel;
  const startingPrice = useMemo(() => {
    const prices = spaces.map((s) => s.price).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : stay.price;
  }, [spaces, stay.price]);
  const headerPriceLabel =
    variant === "dining"
      ? averagePriceLabel || priceLevelLabel
      : startingPrice > 0
        ? money(startingPrice)
        : "";

  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const review of reviews) {
      const star = Math.min(5, Math.max(1, Math.round(review.rating)));
      counts[star - 1] += 1;
    }
    return counts;
  }, [reviews]);

  const guestCapacityRange = useMemo(
    () =>
      resolveEventGuestCapacityRange(spaces, {
        stayGuests: stay.guests,
        venueMaxGuests: venueDetails?.maxGuests,
      }),
    [spaces, stay.guests, venueDetails?.maxGuests]
  );
  const guestCapacityLabel = formatEventGuestCapacityLabel(guestCapacityRange, variant);

  /** Category is already the header chip, so the strip carries capacity + features. */
  const facts = [
    ...(guestCapacityLabel ? [{ icon: Users, label: guestCapacityLabel }] : []),
    ...features.slice(0, 5),
  ];

  const topRated = reviewCount >= 5 && rating >= 4.5;
  const ratingLabel =
    reviewCount === 0 ? "" : rating >= 4.5 ? "Excellent" : rating >= 3.5 ? "Very good" : "";

  /** Stable per venue so the count doesn't jitter between renders or hydration. */
  const liveViewers = useMemo(() => {
    let hash = 7;
    for (let i = 0; i < stay.id.length; i += 1) {
      hash = (hash * 31 + stay.id.charCodeAt(i)) % 9973;
    }
    return 6 + (hash % 15);
  }, [stay.id]);

  const additionalRules = venueDetails?.additionalRules?.trim() ?? "";

  const stats = [
    { num: formatEventGuestCapacityStat(guestCapacityRange), lbl: copy.guestCapacityStat },
    {
      num: reviewCount > 0 ? rating.toFixed(1) : "New",
      lbl: reviewCount > 0 ? "Average rating" : copy.entityLabel,
      accent: reviewCount === 0,
    },
    variant === "dining"
      ? {
          num: priceLevelLabel || "—",
          lbl: priceLevelLabel ? "Price level" : "Indicative pricing",
        }
      : {
          num: String(spaces.length),
          lbl: spaces.length === 1 ? copy.bookableSpaceLabel : copy.bookableSpacesLabel,
        },
    { num: String(reviewCount), lbl: reviewCount === 1 ? "Verified review" : "Verified reviews" },
  ];

  function toggleSpace(space: EventSpace) {
    const key = spaceKey(space);
    const isAdding = !selectedSpaceIds.includes(key);
    setSelectedSpaceIds((current) =>
      current.includes(key) ? current.filter((id) => id !== key) : [...current, key]
    );
    if (isAdding) {
      setBookingFocusTick((tick) => tick + 1);
      document
        .getElementById("booking-calculator")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function goToSection(key: string) {
    setActiveTab(key);
    document
      .getElementById(`event-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="w-full min-w-0 pt-4 pb-10 sm:pt-5 sm:pb-12">
      <div className="listing-detail-grid">
        <div className="listing-detail-main">
      {/* Venue header */}
      <header className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm shadow-gray-100/70">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0 flex-1">
            <h1
              className="font-display text-display-sm font-bold tracking-tight text-gray-950 sm:text-display-lg"
              title={stay.name}
            >
              {stay.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-3xs font-bold uppercase tracking-wide text-green-900 ring-1 ring-inset ring-green-200/70">
                {variant === "dining" ? (
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                ) : (
                  <Building2 className="h-3.5 w-3.5" />
                )}
                {category}
              </span>
              {subcategory ? (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-3xs font-bold uppercase tracking-wide text-gray-700 ring-1 ring-inset ring-gray-200/80">
                  {subcategory}
                </span>
              ) : null}
              {variant === "dining" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-3xs font-bold uppercase tracking-wide text-blue-900 ring-1 ring-inset ring-blue-200/80">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Verified
                </span>
              ) : null}
              {priceLevelLabel ? (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-3xs font-bold uppercase tracking-wide text-amber-900 ring-1 ring-inset ring-amber-200/80 tabular-nums">
                  {priceLevelLabel}
                </span>
              ) : null}
              {featured && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-3xs font-bold uppercase tracking-wide text-amber-900 ring-1 ring-inset ring-amber-200/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Featured
                </span>
              )}
              {topRated && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-3xs font-bold uppercase tracking-wide text-amber-900 ring-1 ring-inset ring-amber-200/80">
                  <Award className="h-3.5 w-3.5" />
                  Top rated
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-gray-600">
                <MapPin className="h-4 w-4 shrink-0 text-green-700" />
                <span className="truncate">{stay.location}</span>
              </span>
              <span aria-hidden className="hidden h-3.5 w-px bg-gray-200 sm:block" />
              <button
                type="button"
                onClick={() => goToSection("location")}
                className="font-semibold text-green-800 underline decoration-green-200 decoration-2 underline-offset-4 transition-colors hover:text-green-900 hover:decoration-green-400"
              >
                Show on map
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {reviewCount > 0 ? (
                <span className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-1.5 text-sm ring-1 ring-inset ring-gray-200/80">
                  <span className="flex items-center gap-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < Math.round(rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </span>
                  <strong className="font-bold text-gray-950">{rating.toFixed(1)}</strong>
                  <span className="text-gray-500">
                    {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                  </span>
                  {ratingLabel && (
                    <>
                      <span aria-hidden className="h-3.5 w-px bg-gray-200" />
                      <span className="font-semibold text-green-800">{ratingLabel}</span>
                    </>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-1.5 text-sm text-gray-600 ring-1 ring-inset ring-gray-200/80">
                  <Sparkles className="h-3.5 w-3.5 text-green-700" />
                  {copy.newProfileLabel}
                </span>
              )}

              <span className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-3 py-1.5 text-sm ring-1 ring-inset ring-green-200/70">
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-700" />
                <span className="text-gray-600">
                  Managed by <strong className="font-semibold text-green-900">{hostName}</strong>
                </span>
              </span>

              <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 ring-1 ring-inset ring-amber-200/80">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                </span>
                {liveViewers} viewing now
              </span>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col items-stretch gap-3 sm:items-end lg:w-auto lg:pt-1">
            <div className="flex items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={onShare}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
              >
                <Share2 className="h-4 w-4" /> Share
              </button>
              {variant === "dining" ? (
                <a
                  href={`mailto:support@greenfieldstays.com?subject=${encodeURIComponent(`Report listing: ${stay.name}`)}`}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  <Flag className="h-4 w-4" /> Report
                </a>
              ) : null}
              <button
                type="button"
                onClick={onToggleWishlist}
                aria-pressed={wishlist}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors ${
                  wishlist
                    ? "border-red-200 bg-red-50 text-red-700 hover:border-red-300"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Heart className={`h-4 w-4 ${wishlist ? "fill-red-500 text-red-500" : ""}`} />
                {wishlist ? "Saved" : "Save"}
              </button>
            </div>
            <div className="sm:text-end">
              {headerPriceLabel ? (
                <>
                  <div className="font-display text-display-sm font-bold tracking-tight text-gray-950 sm:text-display-lg">
                    {headerPriceLabel}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {variant === "dining"
                      ? averagePriceLabel
                        ? "indicative average spend"
                        : copy.startingPriceSuffix
                      : copy.startingPriceSuffix}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-gray-600">Contact for pricing</p>
              )}
              {variant === "dining" ? (
                <p className="mt-1 text-3xs text-gray-500">Listing only — no booking fees</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Facts strip */}
        {facts.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-gray-100 bg-gray-50/70 px-5 py-3.5 text-sm text-gray-700 sm:px-6">
            {facts.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-green-800" />
                {label}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Stats bar */}
      <div className="mt-4 rounded-2xl border border-gray-200/80 bg-white px-4 py-5 shadow-sm shadow-gray-100/70 sm:px-6">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 sm:gap-y-0">
          {stats.map((s) => (
            <div
              key={s.lbl}
              className="border-gray-100 text-center sm:border-s sm:px-4 sm:first:border-s-0"
            >
              <p
                className={`tabular-nums tracking-tight ${
                  s.accent
                    ? "text-base font-semibold text-gray-700"
                    : "font-display text-2xl font-bold text-green-800"
                }`}
              >
                {s.num}
              </p>
              <p className="mt-1 text-sm leading-snug text-gray-600">{s.lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {variant === "dining" ? (
        <DiningQuickInfoBar
          filterGroups={diningFilterGroups}
          diningDetails={diningDetails}
          venueDetails={venueDetails}
          money={money}
        />
      ) : null}

      {/* Section nav — full width, directly above detail sections */}
      <div className="site-sticky-below-chrome mt-5 mb-4 sm:mt-6 sm:mb-5 w-full max-w-full overflow-x-auto rounded-xl border border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm [-webkit-overflow-scrolling:touch]">
        <div className="flex w-max max-w-none">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => goToSection(key)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors md:px-5 ${
                activeTab === key
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {key === "reviews" ? `${label} (${reviewCount})` : label}
            </button>
          ))}
        </div>
      </div>

          <section id="event-overview" className="scroll-mt-28">
            <h2 className="mb-3 font-display text-lg font-extrabold text-gray-950">{copy.aboutHeading}</h2>
            <div
              className={`text-base leading-8 text-gray-600 ${
                !readMore && (description?.trim().length ?? 0) > 400
                  ? "max-h-44 overflow-hidden"
                  : ""
              }`}
            >
              {description?.trim() ? (
                <RichTextView value={description} className="text-base leading-8" />
              ) : (
                <p>
                  {stay.name} is a {copy.entityLabelLower} in {stay.location}. Contact the host
                  directly to discuss your date, party size, and indicative pricing.
                </p>
              )}
            </div>
            {!readMore && (description?.trim().length ?? 0) > 400 && (
              <button
                type="button"
                onClick={() => setReadMore(true)}
                className="mt-2 text-sm font-semibold text-green-800 underline underline-offset-2"
              >
                Read more
              </button>
            )}

          </section>

          {variant === "dining" ? (
            <>
              <DiningCuisineSection
                filterGroups={diningFilterGroups}
                diningDetails={diningDetails}
              />
              <DiningOpeningHoursSection diningDetails={diningDetails} />
              <DiningMenuSection diningDetails={diningDetails} money={money} />
              <DiningExperienceSection
                filterGroups={diningFilterGroups}
                subcategory={subcategory}
                suitableFor={diningDetails?.suitableFor}
              />
            </>
          ) : null}

          {variant !== "dining" ? (
          <section id="event-spaces" className="mt-7 scroll-mt-28">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-heading-sm font-extrabold text-gray-950">
                  {copy.spacesHeading}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {spaces.length === 1
                    ? copy.spacesSubheadingSingle
                    : `${spaces.length} ${copy.bookableSpacesLabel.toLowerCase()} — ${copy.spacesSubheadingMulti}`}
                  {spaces.length > 1 ? " Select one or more, then pick a date." : ""}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {spaces.map((space, index) => {
                const spaceImg = space.img || LISTING_PLACEHOLDER_IMG;
                const isSelected = selectedSpaceIds.includes(spaceKey(space));
                return (
                  <article
                    key={spaceKey(space)}
                    aria-pressed={isSelected}
                    className={cn(
                      "group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300",
                      isSelected
                        ? "border-green-600 ring-2 ring-green-600/20 shadow-md shadow-green-100/70"
                        : "border-gray-200/80 shadow-gray-100/80 hover:shadow-md"
                    )}
                  >
                    <div className="flex flex-col md:flex-row">
                      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-gray-100 md:w-[320px] md:aspect-[3/2] lg:w-[400px]">
                        <Image
                          src={spaceImg}
                          alt={space.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width: 768px) 100vw, 400px"
                          unoptimized={isDataImageUrl(spaceImg)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent md:bg-gradient-to-r md:from-black/20 md:via-transparent" />
                        {isSelected ? (
                          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-green-800 px-2.5 py-1 text-2xs font-bold uppercase tracking-wide text-white shadow-sm">
                            <CheckCircle className="h-3 w-3" />
                            {copy.spaceSelectedBadge}
                          </span>
                        ) : spaces.length > 1 ? (
                          <span className="absolute start-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-2xs font-bold uppercase tracking-wide text-gray-800 shadow-sm backdrop-blur-sm">
                            Space {index + 1}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5 sm:p-6">
                        <div className="min-w-0">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="font-display text-lg font-bold tracking-tight text-gray-950">
                                {space.name}
                              </h3>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {space.capacity > 0 ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200/80">
                                    <Users className="h-3.5 w-3.5 text-green-800" />
                                    Up to {space.capacity} guests
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 ring-1 ring-inset ring-gray-200/80">
                                    Capacity on request
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 sm:text-end">
                              <div className="font-display text-2xl font-extrabold tracking-tight text-gray-950">
                                {space.price > 0 ? money(space.price) : "On request"}
                              </div>
                              <p className="mt-0.5 text-xs font-medium text-gray-500">
                                {space.price > 0
                                  ? resolveDirectoryPriceSuffix(
                                      space.venueDetails?.priceUnit ?? venueDetails?.priceUnit,
                                      variant
                                    )
                                  : "contact for quote"}
                              </p>
                            </div>
                          </div>

                          {space.desc ? (
                            <div className="mt-4">
                              <p className="text-sm leading-relaxed text-gray-600 line-clamp-3">
                                {space.desc}
                              </p>
                              {shouldShowSpaceReadMore(space.desc) ? (
                                <button
                                  type="button"
                                  onClick={() => setDetailSpace(space)}
                                  className="mt-1.5 text-sm font-semibold text-green-800 underline decoration-green-200 decoration-2 underline-offset-4 transition-colors hover:text-green-900 hover:decoration-green-400"
                                >
                                  Read more
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-gray-500">
                            Availability and final pricing confirmed directly with the host.
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleSpace(space)}
                            aria-pressed={isSelected}
                            className={cn(
                              "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors",
                              isSelected
                                ? "border-2 border-green-700 bg-green-50 text-green-900 hover:bg-green-100"
                                : "bg-green-800 text-white hover:bg-green-900"
                            )}
                          >
                            {isSelected ? (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                {copy.spaceSelectedCta}
                              </>
                            ) : (
                              <>
                                {copy.requestSpaceCta}
                                <ChevronRight className="h-4 w-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
          ) : null}

          <EventVenueAmenitiesSection
            amenities={amenities}
            venueDetails={venueDetails}
            multiRate={variant !== "dining" && spaces.length > 1}
            variant={variant}
          />

          {variant !== "dining" ? (
            <section className="mt-8">
              <h2 className="mb-3 font-display text-heading-sm font-extrabold text-gray-950">
                {copy.reviewsHeading}
              </h2>
              {reviewCount > 0 ? (
                <div className="grid items-center gap-6 sm:grid-cols-[140px_minmax(0,1fr)]">
                  <div className="text-center">
                    <div className="font-display text-display-md font-extrabold leading-none text-gray-950">
                      {rating.toFixed(1)}
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-0.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < Math.round(rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="mt-1 text-3xs text-gray-500">
                      Based on {reviewCount} review{reviewCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = distribution[star - 1];
                      const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
                      return (
                        <div key={star} className="mb-1.5 flex items-center gap-2.5 text-xs">
                          <span className="w-16 text-gray-700">{star} star{star === 1 ? "" : "s"}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded bg-gray-100">
                            <span
                              className="block h-full rounded bg-green-700"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="w-6 text-end tabular-nums text-gray-600">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">{copy.reviewsEmpty}</p>
              )}
            </section>
          ) : null}

          {variant === "dining" ? (
            <DiningSameHostSection listings={sameHostListings} currentId={stay.id} />
          ) : null}

          <ListingAvailabilityCalendar
            listingId={stay.id}
            title="Availability"
            className="mt-8 scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6"
          />

          {/* Location */}
          <section id="event-location" className="mt-8 scroll-mt-28">
            <h2 className="mb-2.5 font-display text-heading-sm font-extrabold text-gray-950">Location</h2>
            <p className="mb-3 flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-green-700" /> {stay.location}
            </p>
            {mapEmbedUrl ? (
              <ListingMapEmbed
                src={mapEmbedUrl}
                title={`Map preview — ${stay.location}`}
                className="h-60 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100"
              />
            ) : null}
            {variant === "dining" ? (
              <DiningLocationNotes diningDetails={diningDetails} />
            ) : null}
          </section>

          <div id="event-reviews" className="mt-8 scroll-mt-28">
            <ListingReviewsSection
              reviews={reviews}
              ready={reviewsReady}
              average={rating}
              count={reviewCount}
            />
          </div>

          {/* Policies */}
          {(variant !== "dining" || diningPolicies.length > 0) && (
            <section id="event-policies" className="scroll-mt-28">
              <h2 className="mb-3 font-display text-heading-sm font-extrabold text-gray-950">
                {copy.policiesHeading}
              </h2>
              {variant === "dining" ? (
                <DiningStructuredPolicies diningDetails={diningDetails} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {policies.map((policy) => (
                    <div
                      key={policy.title}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <h3 className="font-display text-sm font-bold text-gray-900">{policy.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{policy.desc}</p>
                    </div>
                  ))}
                  {additionalRules ? (
                    <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-4 sm:col-span-2">
                      <h3 className="flex items-center gap-2 font-display text-sm font-bold text-gray-900">
                        <Shield className="h-4 w-4 text-rose-600" />
                        Additional rules
                      </h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                        {additionalRules}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          )}

          {variant === "dining" ? (
            <DiningHostSection profile={profile} hostLabel={copy.hostLabel} />
          ) : null}

          {variant === "dining" ? (
            <DiningPlatformReservationSection
              onRequestReservation={() => {
                const first = spaces[0];
                if (first) toggleSpace(first);
              }}
            />
          ) : null}

      {/* Bottom trust */}
      <div className="mt-8 grid gap-3.5 rounded-2xl bg-amber-50 p-4 text-xs font-semibold text-amber-900 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 shrink-0" /> {copy.trustReply}
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 shrink-0" /> {copy.trustVerified}
        </div>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 shrink-0" />
          {variant === "dining"
            ? "Availability checks go through our platform"
            : "Direct contact, no middleman"}
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {variant === "dining" ? "Contact shared after confirmation" : "No platform commission"}
        </div>
      </div>
        </div>

        <div className="listing-detail-sidebar">
          <div className="listing-detail-sidebar-inner">
          <EventAvailabilityRequestCard
            listingId={stay.id}
            listingTitle={stay.name}
            spaces={spaces}
            selectedSpaceIds={selectedSpaceIds}
            calendarFocusTick={bookingFocusTick}
            rating={rating}
            reviewCount={reviewCount}
            locale={locale}
            variant={variant}
            diningDetails={diningDetails}
          />

          {variant !== "dining" ? <ListingSupportHelpCard /> : null}

          {mapEmbedUrl ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <ListingMapEmbed
                src={mapEmbedUrl}
                title={`Map preview — ${stay.location}`}
                className="h-32 overflow-hidden rounded-xl bg-gray-100"
              />
              <div className="mt-2.5 text-xs font-semibold text-gray-800">{stay.location}</div>
              <button
                type="button"
                onClick={() => goToSection("location")}
                className="mt-0.5 text-3xs font-semibold text-green-800 underline underline-offset-2"
              >
                Show on map
              </button>
            </div>
          ) : null}

          <div className="bg-white rounded-2xl border p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-800 text-sm">
              <Shield className="h-4 w-4 text-green-700" /> Enquire with confidence
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs text-gray-700">
              {copy.confidenceItems.map(
                (item) => (
                  <div key={item} className="flex items-start gap-1.5">
                    <span className="font-bold text-green-700">✓</span>
                    {item}
                  </div>
                )
              )}
            </div>
          </div>

          {offers.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" /> Offer from this venue
              </h3>
              <div className="flex flex-col gap-2">
                {offers.slice(0, 2).map((offer) => (
                  <div key={offer.id} className="bg-white rounded-lg p-3 border border-amber-200">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900">{offer.title}</p>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded shrink-0">
                        {offer.badge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{offer.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
            {copy.sidebarUrgencyBody}
          </p>
          </div>
        </div>
      </div>
      <EventSpaceDetailModal
        open={detailSpace !== null}
        space={detailSpace}
        money={money}
        venueDetails={venueDetails}
        showVenueSpaceDetails={spaces.length > 1}
        variant={variant}
        onClose={() => setDetailSpace(null)}
        onRequest={() => {
          if (detailSpace) toggleSpace(detailSpace);
        }}
      />
    </div>
  );
}
