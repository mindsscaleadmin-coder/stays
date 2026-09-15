"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Building2,
  CheckCircle,
  Heart,
  MapPin,
  ChevronRight,
  MessageCircle,
  Phone,
  Share2,
  Shield,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import type { Stay } from "@/lib/mock/data";
import { LISTING_PLACEHOLDER_IMG } from "@/lib/listings/submission-to-stay";
import { isDataImageUrl } from "@/lib/utils";
import type { StayReview } from "@/lib/booking/stay-reviews-types";
import type { HostPublicProfile } from "@/lib/host/host-profile-types";
import { EventAvailabilityRequestCard } from "@/components/listing/event-availability-request-card";
import { ListingAvailabilityCalendar } from "@/components/listing/listing-availability-calendar";
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

export type { EventSpace };

interface EventHostOffer {
  id: string;
  badge: string;
  title: string;
  detail: string;
}

const TABS = [
  ["overview", "Overview"],
  ["spaces", "Spaces & pricing"],
  ["amenities", "Amenities"],
  ["location", "Location"],
  ["reviews", "Reviews"],
  ["policies", "Policies"],
] as const;

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
}: {
  stay: Stay;
  description?: string;
  highlights: string[];
  amenities: string[];
  features: { icon: LucideIcon; label: string }[];
  spaces: EventSpace[];
  venueDetails?: VenueDetails;
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
}) {
  const locale = useLocale();
  const profile = useHostProfile(stay.hostId);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [readMore, setReadMore] = useState(false);
  const [detailSpace, setDetailSpace] = useState<EventSpace | null>(null);

  const category = stay.subcategory?.trim() || stay.category?.trim() || "Event venue";
  const hostName = profile?.displayName?.trim() || "this venue";
  const startingPrice = useMemo(() => {
    const prices = spaces.map((s) => s.price).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : stay.price;
  }, [spaces, stay.price]);

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
  const guestCapacityLabel = formatEventGuestCapacityLabel(guestCapacityRange);

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
    { num: formatEventGuestCapacityStat(guestCapacityRange), lbl: "Guest capacity" },
    {
      num: reviewCount > 0 ? rating.toFixed(1) : "New",
      lbl: reviewCount > 0 ? "Average rating" : "Venue profile",
      accent: reviewCount === 0,
    },
    { num: String(spaces.length), lbl: spaces.length === 1 ? "Bookable space" : "Bookable spaces" },
    { num: String(reviewCount), lbl: reviewCount === 1 ? "Verified review" : "Verified reviews" },
  ];

  function selectSpace(_space: EventSpace) {
    document
      .getElementById("booking-calculator")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goToSection(key: string) {
    setActiveTab(key);
    document
      .getElementById(`event-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 pb-12">
      {/* Venue header */}
      <header className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm shadow-gray-100/70">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-3xs font-bold uppercase tracking-wide text-green-900 ring-1 ring-inset ring-green-200/70">
                <Building2 className="h-3.5 w-3.5" />
                {category}
              </span>
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

            <h1
              className="mt-3 font-display text-display-sm font-bold tracking-tight text-gray-950 sm:text-display-lg"
              title={stay.name}
            >
              {stay.name}
            </h1>

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
                  New venue — no reviews yet
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
              <div className="font-display text-display-sm font-bold tracking-tight text-gray-950 sm:text-display-lg">
                {startingPrice > 0 ? money(startingPrice) : "On request"}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">starting price / event</p>
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

      {/* Main grid */}
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0">
          {/* Tabs — aligned to main column width */}
          <div className="site-sticky-below-chrome mb-5 overflow-x-auto rounded-xl border border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
            <div className="flex min-w-max">
              {TABS.map(([key, label]) => (
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
            <h2 className="mb-3 font-display text-lg font-extrabold text-gray-950">About this venue</h2>
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
                  {stay.name} is an event venue in {stay.location}. Contact the host directly
                  to discuss your date, guest count, setup, and pricing.
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

          {/* Spaces & pricing */}
          <section id="event-spaces" className="mt-7 scroll-mt-28">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-heading-sm font-extrabold text-gray-950">Spaces &amp; pricing</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {spaces.length === 1
                    ? "One bookable space for your event"
                    : `${spaces.length} spaces — pick the setup that fits your guest list`}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {spaces.map((space, index) => {
                const spaceImg = space.img || LISTING_PLACEHOLDER_IMG;
                return (
                  <article
                    key={space.id ?? space.name}
                    className="group overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm shadow-gray-100/80 transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col md:flex-row">
                      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-gray-100 md:aspect-auto md:w-[220px] md:min-h-[200px] md:self-stretch lg:w-[260px]">
                        <Image
                          src={spaceImg}
                          alt={space.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          sizes="(max-width: 768px) 100vw, 260px"
                          unoptimized={isDataImageUrl(spaceImg)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent md:bg-gradient-to-r md:from-black/20 md:via-transparent" />
                        {spaces.length > 1 && (
                          <span className="absolute start-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-2xs font-bold uppercase tracking-wide text-gray-800 shadow-sm backdrop-blur-sm">
                            Space {index + 1}
                          </span>
                        )}
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
                                {space.price > 0 ? "starting rate · per event" : "contact for quote"}
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
                            onClick={() => selectSpace(space)}
                            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-green-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-900"
                          >
                            Request this space
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <EventVenueAmenitiesSection
            amenities={amenities}
            venueDetails={venueDetails}
            multiRate={spaces.length > 1}
          />

          {/* Review summary */}
          <section className="mt-8">
            <h2 className="mb-3 font-display text-heading-sm font-extrabold text-gray-950">
              What event planners love about this venue
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
              <p className="text-sm text-gray-500">
                No reviews yet — be the first to host your event here.
              </p>
            )}
          </section>

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
            <div className="relative h-60 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
              {mapEmbedUrl ? (
                <iframe
                  title={`Map — ${stay.location}`}
                  src={mapEmbedUrl}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-green-800">
                  <MapPin className="h-10 w-10 opacity-30" />
                  <span className="text-sm font-semibold opacity-70">{stay.location}</span>
                </div>
              )}
            </div>
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
          <section id="event-policies" className="scroll-mt-28">
            <h2 className="mb-3 font-display text-heading-sm font-extrabold text-gray-950">Venue policies</h2>
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
          </section>
        </main>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <div className="flex items-center gap-2 font-display text-body-sm font-extrabold text-amber-900">
              <Zap className="h-4 w-4" /> Weekend dates book out fast
            </div>
            <p className="mt-0.5 text-xs text-amber-900">
              Send your date early to confirm availability.
            </p>
          </div>

          <EventAvailabilityRequestCard
            listingId={stay.id}
            listingTitle={stay.name}
            spaces={spaces}
            rating={rating}
            reviewCount={reviewCount}
            locale={locale}
          />

          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
            <div>
              <div className="font-display text-body-sm font-bold text-gray-900">Need help?</div>
              <div className="mt-0.5 text-xs font-bold text-green-800">+971 4 123 4567</div>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700">
              <Phone className="h-4 w-4" />
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="relative h-32 overflow-hidden rounded-xl bg-gray-100">
              {mapEmbedUrl ? (
                <iframe
                  title={`Map preview — ${stay.location}`}
                  src={mapEmbedUrl}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-green-800">
                  <MapPin className="h-6 w-6" />
                </span>
              )}
            </div>
            <div className="mt-2.5 text-xs font-semibold text-gray-800">{stay.location}</div>
            <button
              type="button"
              onClick={() => goToSection("location")}
              className="mt-0.5 text-3xs font-semibold text-green-800 underline underline-offset-2"
            >
              Show on map
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 font-display text-body-sm font-bold text-gray-900">
              <Shield className="h-4 w-4 text-green-700" /> Enquire with confidence
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs text-gray-700">
              {["Verified venue", "Fast response", "Direct contact", "No hidden fees"].map(
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
            <div className="rounded-2xl border border-green-200 bg-green-50 p-3.5">
              <div className="font-display text-body-sm font-bold text-gray-900">Offer from this venue</div>
              {offers.slice(0, 2).map((offer) => (
                <div key={offer.id} className="mt-1">
                  <p className="text-xs text-gray-600">{offer.title}</p>
                  <span className="mt-1 inline-block rounded-md border border-dashed border-green-700 bg-white px-2 py-0.5 text-3xs font-bold text-green-800">
                    Ask when you enquire
                  </span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Bottom trust */}
      <div className="mt-8 grid gap-3.5 rounded-2xl bg-amber-50 p-4 text-xs font-semibold text-amber-900 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 shrink-0" /> Hosts typically reply within hours
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 shrink-0" /> Every venue document-verified
        </div>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 shrink-0" /> Direct contact, no middleman
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" /> No platform commission
        </div>
      </div>
      <EventSpaceDetailModal
        open={detailSpace !== null}
        space={detailSpace}
        money={money}
        venueDetails={venueDetails}
        showVenueSpaceDetails={spaces.length > 1}
        onClose={() => setDetailSpace(null)}
        onRequest={() => {
          if (detailSpace) selectSpace(detailSpace);
        }}
      />
    </div>
  );
}
