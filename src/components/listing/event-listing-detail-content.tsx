"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  Building2,
  CheckCircle,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Shield,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { BOOKING_ACTIVITY, type Stay } from "@/lib/mock/data";
import type { StayReview } from "@/lib/booking/stay-reviews-types";
import type { HostPublicProfile } from "@/lib/host/host-profile-types";
import { EventAvailabilityRequestCard } from "@/components/listing/event-availability-request-card";
import { ListingReviewsSection } from "@/components/listing/listing-reviews-section";
import { RichTextView } from "@/components/listing/rich-text-view";

export interface EventSpace {
  id?: string;
  name: string;
  desc: string;
  price: number;
  capacity: number;
  img: string;
}

interface EventHostOffer {
  id: string;
  badge: string;
  title: string;
  detail: string;
}

const TABS = [
  ["overview", "Overview"],
  ["amenities", "Amenities"],
  ["spaces", "Spaces & pricing"],
  ["location", "Location"],
  ["reviews", "Reviews"],
  ["policies", "Policies"],
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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

  /** Category is already the header chip, so the strip carries capacity + features. */
  const facts = [
    ...(stay.guests > 0 ? [{ icon: Users, label: `Up to ${stay.guests} guests` }] : []),
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

  const stats = [
    { num: stay.guests > 0 ? String(stay.guests) : "—", lbl: "guest capacity" },
    { num: reviewCount > 0 ? rating.toFixed(1) : "New", lbl: reviewCount > 0 ? "average rating" : "venue profile" },
    { num: String(spaces.length), lbl: spaces.length === 1 ? "bookable space" : "bookable spaces" },
    { num: String(reviewCount), lbl: reviewCount === 1 ? "verified review" : "verified reviews" },
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-green-900 ring-1 ring-inset ring-green-200/70">
                <Building2 className="h-3.5 w-3.5" />
                {category}
              </span>
              {featured && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-inset ring-amber-200/80">
                  <Sparkles className="h-3.5 w-3.5" />
                  Featured
                </span>
              )}
              {topRated && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-inset ring-amber-200/80">
                  <Award className="h-3.5 w-3.5" />
                  Top rated
                </span>
              )}
            </div>

            <h1
              className="mt-3 font-display text-[26px] font-bold leading-[1.15] tracking-tight text-gray-950 sm:text-[32px]"
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

          <div className="flex shrink-0 items-center gap-2 lg:pt-1">
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
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200/80 bg-gray-100 shadow-sm shadow-gray-100/70 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.lbl} className="bg-white px-4 py-4 text-center">
            <div className="text-xl font-extrabold tracking-tight text-gray-950">{s.num}</div>
            <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">
              {s.lbl}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-5 overflow-x-auto border-b border-gray-200">
        <div className="flex min-w-max gap-7 text-sm font-semibold text-gray-500">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => goToSection(key)}
              className={`border-b-2 pb-3 transition-colors hover:text-green-900 ${
                activeTab === key ? "border-green-800 text-green-900" : "border-transparent"
              }`}
            >
              {key === "reviews" ? `${label} (${reviewCount})` : label}
            </button>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-w-0">
          {/* About + highlights */}
          <section id="event-overview" className="scroll-mt-28">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1.5fr)_minmax(230px,1fr)]">
              <div>
                <h2 className="mb-2.5 text-[17px] font-extrabold text-gray-950">About this venue</h2>
                <div
                  className={`text-sm leading-7 text-gray-600 ${
                    !readMore && (description?.trim().length ?? 0) > 280
                      ? "max-h-28 overflow-hidden"
                      : ""
                  }`}
                >
                  {description?.trim() ? (
                    <RichTextView value={description} />
                  ) : (
                    <p>
                      {stay.name} is an event venue in {stay.location}. Contact the host directly
                      to discuss your date, guest count, setup, and pricing.
                    </p>
                  )}
                </div>
                {!readMore && (description?.trim().length ?? 0) > 280 && (
                  <button
                    type="button"
                    onClick={() => setReadMore(true)}
                    className="mt-1 text-[13px] font-semibold text-green-800 underline underline-offset-2"
                  >
                    Read more
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="mb-2.5 text-sm font-extrabold text-gray-950">Venue highlights</h3>
                {highlights.length > 0 ? (
                  <ul className="space-y-1.5">
                    {highlights.slice(0, 6).map((h) => (
                      <li key={h} className="flex gap-2 text-[13px] text-gray-700">
                        <span className="font-bold text-green-700">✓</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-gray-500">
                    The host has not added highlights yet.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => goToSection("amenities")}
                  className="mt-2.5 text-xs font-semibold text-green-800 underline underline-offset-2"
                >
                  View all amenities
                </button>
              </div>
            </div>
          </section>

          {/* Live enquiry activity */}
          <section className="mt-7">
            <h2 className="mb-2.5 flex items-center gap-2 text-[17px] font-extrabold text-gray-950">
              Live enquiry activity
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" /> live
              </span>
            </h2>
            <div className="grid gap-3.5 sm:grid-cols-3">
              {BOOKING_ACTIVITY.slice(0, 3).map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-xs text-gray-700"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-700 text-[11px] font-bold text-white">
                    {initials(item.name)}
                  </span>
                  <span>
                    <strong className="text-gray-900">{item.name}</strong> enquired about this
                    venue · {item.time}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Spaces & pricing */}
          <section id="event-spaces" className="mt-7 scroll-mt-28">
            <h2 className="mb-2.5 text-[17px] font-extrabold text-gray-950">Spaces &amp; pricing</h2>
            <div className="space-y-3">
              {spaces.map((space) => (
                <div
                  key={space.id ?? space.name}
                  className="grid grid-cols-1 items-center gap-4 rounded-2xl border border-gray-200 p-4 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
                >
                  <div className="relative h-[84px] overflow-hidden rounded-xl bg-gray-100">
                    <Image
                      src={space.img}
                      alt={space.name}
                      fill
                      className="object-cover"
                      sizes="120px"
                      unoptimized={space.img.startsWith("data:")}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-gray-900">{space.name}</div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {space.capacity > 0 ? `Up to ${space.capacity} guests` : "Capacity on request"}
                      {space.desc ? ` · ${space.desc}` : ""}
                    </div>
                  </div>
                  <div className="text-start sm:text-end">
                    <div className="text-[17px] font-extrabold text-gray-950">
                      {space.price > 0 ? money(space.price) : "On request"}
                    </div>
                    <div className="text-[11px] text-gray-500">from, per event</div>
                    <button
                      type="button"
                      onClick={() => selectSpace(space)}
                      className="mt-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-900 hover:border-green-400 hover:text-green-800"
                    >
                      Select space
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Amenities */}
          <section id="event-amenities" className="mt-7 scroll-mt-28">
            <h2 className="mb-3 text-[17px] font-extrabold text-gray-950">Venue amenities</h2>
            {amenities.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700"
                  >
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-700" />
                    {amenity}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No amenities listed yet.</p>
            )}
          </section>

          {/* Review summary */}
          <section className="mt-8">
            <h2 className="mb-3 text-[17px] font-extrabold text-gray-950">
              What event planners love about this venue
            </h2>
            {reviewCount > 0 ? (
              <div className="grid items-center gap-6 sm:grid-cols-[140px_minmax(0,1fr)]">
                <div className="text-center">
                  <div className="text-[34px] font-extrabold leading-none text-gray-950">
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
                  <div className="mt-1 text-[11px] text-gray-500">
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

          {/* Location */}
          <section id="event-location" className="mt-8 scroll-mt-28">
            <h2 className="mb-2.5 text-[17px] font-extrabold text-gray-950">Location</h2>
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
            <h2 className="mb-3 text-[17px] font-extrabold text-gray-950">Venue policies</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {policies.map((policy) => (
                <div
                  key={policy.title}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                  <h3 className="text-sm font-bold text-gray-900">{policy.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{policy.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-amber-900">
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
            startingPrice={startingPrice}
            rating={rating}
            reviewCount={reviewCount}
            money={money}
            locale={locale}
          />

          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
            <div>
              <div className="text-[13px] font-bold text-gray-900">Need help?</div>
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
              className="mt-0.5 text-[11px] font-semibold text-green-800 underline underline-offset-2"
            >
              Show on map
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-gray-900">
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
              <div className="text-[13px] font-bold text-gray-900">Offer from this venue</div>
              {offers.slice(0, 2).map((offer) => (
                <div key={offer.id} className="mt-1">
                  <p className="text-xs text-gray-600">{offer.title}</p>
                  <span className="mt-1 inline-block rounded-md border border-dashed border-green-700 bg-white px-2 py-0.5 text-[11px] font-bold text-green-800">
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

      <div className="mt-4 text-center">
        <Link
          href={`/listing/${stay.id}/gallery`}
          className="text-xs font-semibold text-green-800 underline underline-offset-2"
        >
          View all venue photos
        </Link>
      </div>
    </div>
  );
}
