"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ListPropertyLink } from "@/components/auth/list-property-link";
import {
  MapPin,
  Calendar,
  Users,
  Star,
  Heart,
  ChevronRight,
  Shield,
  Tag,
  Headphones,
  CheckCircle,
  Home,
  ArrowRight,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { StarRating, CountdownTimer } from "@/components/ui/star-rating";
import { BOOKING_ACTIVITY, HERO_BG } from "@/lib/mock/data";
import { getFavoriteIds, setFavoriteIds } from "@/lib/mock/guest-data";
import { usePublicListings } from "@/lib/listings/use-public-listings";
import { PUBLIC_LISTINGS_MAX_PAGE_SIZE } from "@/lib/listings/listings-pagination";
import { HeroSearchBar } from "@/components/search/hero-search-bar";
import { BASE_CURRENCY, formatStoredMoney, locationMatchesCountry  } from "@/lib/currency";
import { useCountry } from "@/components/providers/country-provider";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import {
  taxonomyDestinationCards,
  taxonomyExperienceCards,
  taxonomyExperienceParentName,
  taxonomyParentCards,
  taxonomyVenueCards,
  taxonomyVenueParentName,
} from "@/lib/admin/taxonomy-nav";
import { useGuestLocation } from "@/lib/geo/use-guest-location";
import { filterListingsNearGuest } from "@/lib/geo/guest-location";
import { useCmsSettings } from "@/lib/admin/use-admin-content-policy";
import { useHomePageSettings } from "@/components/providers/home-page-settings-provider";
import { LocationPermissionBanner } from "@/components/home/location-permission-banner";
import { HOST_PRICING_SYNC_EVENT } from "@/lib/host/host-pricing-data";
import {
  buildFlashDealCards,
  remainingCountdown,
} from "@/lib/host/flash-deal-utils";
import {
  getActivePromotedListingIds,
  HOST_PROMOTIONS_SYNC_EVENT,
} from "@/lib/host/host-promotions-data";

export function HomePageContent() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { country: headerCountry } = useCountry();
  const { data: taxonomy } = useAdminTaxonomy();
  const { listings: publicListings } = usePublicListings(undefined, {
    country: headerCountry.name,
    pageSize: PUBLIC_LISTINGS_MAX_PAGE_SIZE,
  });
  const {
    location: guestLocation,
    loading: locationLoading,
    usingFallback,
    requestLocation,
  } = useGuestLocation();
  const cms = useCmsSettings();
  const { settings: homeSettings } = useHomePageSettings();
  const heroImage = homeSettings.heroBanner?.url || HERO_BG;
  const blogPosts = useMemo(
    () =>
      cms.blogPosts
        .filter((p) => p.published && p.title.trim())
        .sort(
          (a, b) =>
            new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
        ),
    [cms.blogPosts]
  );
  const sectionEnabled = (key: string) =>
    cms.contentSections.find((s) => s.key === key)?.enabled ?? true;
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [activityIdx, setActivityIdx] = useState(0);
  const [pricingTick, setPricingTick] = useState(0);
  const [promoTick, setPromoTick] = useState(0);
  const [dealClock, setDealClock] = useState(0);

  useEffect(() => {
    setWishlist(getFavoriteIds());
  }, []);

  useEffect(() => {
    function bump() {
      setPricingTick((n) => n + 1);
    }
    window.addEventListener(HOST_PRICING_SYNC_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(HOST_PRICING_SYNC_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    function bump() {
      setPromoTick((n) => n + 1);
    }
    window.addEventListener(HOST_PROMOTIONS_SYNC_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(HOST_PROMOTIONS_SYNC_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    const iv = setInterval(
      () => setActivityIdx((i) => (i + 1) % BOOKING_ACTIVITY.length),
      3000
    );
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setDealClock((n) => n + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  const featuredIds = useMemo(() => {
    void promoTick;
    return new Set(getActivePromotedListingIds("featured"));
  }, [promoTick]);
  const trendingIds = useMemo(() => {
    void promoTick;
    return getActivePromotedListingIds("trending");
  }, [promoTick]);

  const trendingStays = useMemo(() => {
    const inCountry = headerCountry.name
      ? publicListings.filter((s) =>
          locationMatchesCountry(s.location, headerCountry.name)
        )
      : publicListings;

    const localPool = filterListingsNearGuest(inCountry, guestLocation, {
      maxKm: 100,
      fallbackAll: true,
    });

    const byId = new Map(localPool.map((s) => [s.id, s]));
    const paid = trendingIds
      .map((id) => byId.get(id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => ({
        ...s,
        badge: s.badge === "Featured" ? s.badge : "Trending",
        badgeColor: s.badge === "Featured" ? s.badgeColor : "bg-amber-500",
      }));

    if (paid.length >= 4) return paid.slice(0, 4);

    const fill = localPool
      .filter((s) => !trendingIds.includes(s.id))
      .sort((a, b) => {
        const aFeatured =
          featuredIds.has(a.id) ||
          cms.featuredListingIds.includes(a.id) ||
          a.badge === "Featured"
            ? 1
            : 0;
        const bFeatured =
          featuredIds.has(b.id) ||
          cms.featuredListingIds.includes(b.id) ||
          b.badge === "Featured"
            ? 1
            : 0;
        return bFeatured - aFeatured || b.rating - a.rating;
      });

    return [...paid, ...fill].slice(0, 4);
  }, [
    trendingIds,
    publicListings,
    guestLocation,
    headerCountry.name,
    featuredIds,
    cms.featuredListingIds,
  ]);
  const flashDeals = useMemo(() => {
    void pricingTick;
    void dealClock;

    const inCountry = headerCountry.name
      ? publicListings.filter((s) =>
          locationMatchesCountry(s.location, headerCountry.name)
        )
      : publicListings;

    const localPool = filterListingsNearGuest(inCountry, guestLocation, {
      maxKm: 100,
      fallbackAll: true,
    });

    return buildFlashDealCards(localPool).slice(0, 2);
  }, [publicListings, guestLocation, pricingTick, dealClock, headerCountry.name]);

  const areaName =
    guestLocation?.area.name;
  const trendingSubtitle = areaName
    ? t("trendingNearby", { area: areaName })
    : t("trendingSubtitle");
  const flashSubtitle = areaName
    ? t("flashDealsNearby", { area: areaName })
    : t("flashDealsSubtitle");

  const destinationCards = useMemo(
    () => taxonomyDestinationCards(taxonomy, 6),
    [taxonomy]
  );
  const categoryCards = useMemo(() => taxonomyParentCards(taxonomy, 6), [taxonomy]);
  const experienceCards = useMemo(
    () => taxonomyExperienceCards(taxonomy, 6),
    [taxonomy]
  );
  const venueCards = useMemo(() => taxonomyVenueCards(taxonomy, 6), [taxonomy]);
  const experienceParentName = taxonomyExperienceParentName(taxonomy);
  const venueParentName = taxonomyVenueParentName(taxonomy);

  const listingCountFor = (name: string) => {
    const needle = name.trim().toLowerCase();
    if (!needle) return 0;
    return publicListings.filter((s) => {
      const hay = `${s.category ?? ""} ${s.location ?? ""} ${s.type ?? ""}`.toLowerCase();
      return hay.includes(needle);
    }).length;
  };

  const toggleWishlist = (id: string) =>
    setWishlist((w) => {
      const next = w.includes(id) ? w.filter((x) => x !== id) : [...w, id];
      setFavoriteIds(next);
      return next;
    });

  const activity = BOOKING_ACTIVITY[activityIdx];
  const activityName = activity.name;
  const activityTime = activity.time;

  return (
    <>
      <section className="relative min-h-[28rem] sm:min-h-[34rem] md:min-h-[560px] flex items-center">
        <Image
          src={heroImage}
          alt="Farm stay hero"
          fill
          priority
          className="object-cover"
          sizes="100vw"
          unoptimized={heroImage.startsWith("data:")}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 py-10 sm:py-16 w-full min-w-0">
          <div className="max-w-xl min-w-0">
            <h1 className="text-white text-[1.75rem] sm:text-4xl md:text-5xl font-bold font-display leading-tight mb-3 break-words">
              {cms.heroEnabled ? (
                <>
                  {cms.heroTitle}
                  <br />
                  <span className="text-amber-400">{cms.heroHighlight}</span> {cms.heroTitleEnd}
                </>
              ) : (
                <>
                  {t("heroTitle")}
                  <br />
                  <span className="text-amber-400">{t("heroHighlight")}</span> {t("heroTitleEnd")}
                </>
              )}
            </h1>
            <p className="text-gray-200 text-base mb-6">
              {cms.heroEnabled ? cms.heroSubtitle : t("heroSubtitle")}
            </p>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex -space-x-2">
                {["#7CB9A8", "#4E9E6A", "#F4A261"].map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <StarRating rating={5} />
                  <span className="text-white text-sm font-semibold ms-1">4.9/5</span>
                </div>
                <div className="text-gray-300 text-xs">4,813 from 12,000+ guests</div>
              </div>
            </div>
          </div>
          <div className="mt-6 sm:mt-8 w-full min-w-0 max-w-xl lg:max-w-2xl">
            <HeroSearchBar resultsPath="/listings" />
          </div>
        </div>
      </section>

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          {[
            { icon: Home, val: "1,245+", label: t("stats.properties") },
            { icon: Calendar, val: "42,300+", label: t("stats.nightsBooked") },
            { icon: Users, val: "12,500+", label: t("stats.happyGuests") },
            { icon: Star, val: "4.9/5", label: t("stats.averageRating") },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                <Icon className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <div className="text-gray-900 font-bold text-lg leading-tight">{val}</div>
                <div className="text-gray-500 text-xs">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex flex-col gap-3">
          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full self-start">
            {t("limitedOffer")}
          </span>
          <div className="font-bold text-gray-800 text-sm">{t("offerText")}</div>
          <CountdownTimer d={2} h={3} m={24} />
          <Link
            href="/listings?filter=deals"
            className="text-sm text-orange-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
          >
            {t("viewOffers")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-gray-800 text-sm">{t("happyGuests")}</span>
          </div>
          <p className="text-gray-500 text-xs mb-3">{t("happyGuestsDesc")}</p>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {["#7CB9A8", "#4E9E6A", "#F4A261", "#E76F51"].map((c, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-white"
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <StarRating rating={5} />
              <span className="text-sm font-bold text-gray-700">4.9</span>
            </div>
          </div>
        </div>
        <div className="bg-white border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-gray-800 text-sm">{t("secureBooking")}</span>
          </div>
          <div className="flex flex-col gap-2 text-xs text-gray-600">
            {["Best Price Guarantee", "Free Cancellation", "24/7 Customer Support", "No Hidden Charges"].map(
              (f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  {f}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="bg-green-700 rounded-xl px-5 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
            <span className="text-white text-sm font-semibold">{t("liveActivity")}</span>
          </div>
          <div className="text-green-100 text-sm">
            <strong className="text-white">{activityName}</strong> {t("justBooked")}{" "}
            <span className="text-amber-300">{activity.property}</span>{" "}
            <span className="text-green-300">— {activityTime}</span>
          </div>
        </div>
      </div>

      <LocationPermissionBanner
        visible={usingFallback || guestLocation?.source !== "geolocation"}
        loading={locationLoading}
        areaName={areaName}
        usingGps={guestLocation?.source === "geolocation"}
        onEnable={requestLocation}
      />

      {sectionEnabled("trending") && (
      <section className="max-w-7xl mx-auto px-4 mt-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" /> {t("trendingTitle")}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">{trendingSubtitle}</p>
          </div>
          <Link href="/listings?filter=trending&q=nearby" className="text-green-700 text-sm font-semibold flex items-center gap-1 shrink-0">
            {tc("viewAll")} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {trendingStays.map((stay) => (
            <div
              key={stay.id}
              className="relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group h-full flex flex-col"
            >
              <Link
                href={`/listing/${stay.id}`}
                className="absolute inset-0 z-10"
                aria-label={`View ${stay.name}`}
              />
              <div className="relative h-48 shrink-0 overflow-hidden">
                <Image
                  src={stay.img}
                  alt={stay.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, 25vw"
                  unoptimized={stay.img.startsWith("data:")}
                />
                <span
                  className={`absolute top-3 start-3 ${stay.badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}
                >
                  {stay.badge}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist(stay.id);
                  }}
                  className="absolute top-3 end-3 z-20 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center"
                  aria-label="Add to wishlist"
                >
                  <Heart
                    className={`w-4 h-4 ${wishlist.includes(stay.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`}
                  />
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1 truncate">
                  {stay.name}
                </h3>
                <div className="flex items-center gap-1 text-gray-500 text-xs mb-2 min-w-0">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{stay.location}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 whitespace-nowrap overflow-hidden">
                  <span className="flex items-center gap-0.5 shrink-0">
                    <Users className="w-3 h-3" />
                    {stay.guests}
                  </span>
                  <span>·</span>
                  <span className="truncate">
                    {stay.beds} {tc("bedrooms")}
                  </span>
                  <span>·</span>
                  <span className="truncate">
                    {stay.baths} {tc("bathrooms")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-green-700 font-bold text-base">
                      {formatStoredMoney(
                        stay.originalPrice != null && stay.originalPrice > stay.price
                          ? stay.originalPrice
                          : stay.price,
                        {
                          storedCurrency: stay.currency || stay.flashDealCurrency || BASE_CURRENCY,
                          currency: headerCountry.currency,
                          exchangeRateToAED: headerCountry.exchangeRateToAED,
                          locale,
                        }
                      )}
                    </span>
                    <span className="text-gray-400 text-xs"> {tc("perNight")}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold text-gray-700">{stay.rating}</span>
                    <span className="text-xs text-gray-400">({stay.reviews})</span>
                  </div>
                </div>
                <span className="mt-3 block w-full bg-green-700 group-hover:bg-green-800 text-white text-sm font-semibold py-2 rounded-xl transition-colors text-center">
                  {tc("bookNow")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {sectionEnabled("flashDeals") && flashDeals.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 mt-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-500" /> {t("flashDealsTitle")}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">{flashSubtitle}</p>
          </div>
          <Link href="/listings?filter=deals&q=nearby" className="text-green-700 text-sm font-semibold flex items-center gap-1 shrink-0">
            {tc("viewAll")} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {flashDeals.map((deal) => {
            const countdown = remainingCountdown(deal.flashEndsAt);
            return (
              <div key={deal.id} className="relative bg-white rounded-2xl overflow-hidden shadow-sm flex group">
                <Link
                  href={`/listing/${deal.id}`}
                  className="absolute inset-0 z-10"
                  aria-label={`View deal ${deal.name}`}
                />
                <div className="w-40 shrink-0 relative overflow-hidden min-h-[160px]">
                  <Image src={deal.img} alt={deal.name} fill className="object-cover" sizes="160px" />
                  <span className="absolute top-2 start-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    DEAL
                  </span>
                </div>
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm">{deal.name}</h3>
                    <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                      <MapPin className="w-3 h-3" />
                      {deal.location}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-green-700 font-bold">
                      {formatStoredMoney(deal.flashDealPrice, {
                        storedCurrency: deal.flashCurrency || deal.currency || BASE_CURRENCY,
                        currency: headerCountry.currency,
                        exchangeRateToAED: headerCountry.exchangeRateToAED,
                        locale,
                      })}
                    </span>
                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      −{deal.flashDiscountPct}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-[10px] text-gray-500 mb-1">Ends in:</div>
                    <CountdownTimer d={countdown.d} h={countdown.h} m={countdown.m} />
                  </div>
                  <span className="mt-3 inline-block bg-red-500 group-hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                    Grab Deal
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {sectionEnabled("destinations") && destinationCards.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 mt-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">{t("destinationsTitle")}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{t("destinationsSubtitle")}</p>
          </div>
          <Link href="/destinations" className="text-green-700 text-sm font-semibold flex items-center gap-1 shrink-0">
            {tc("viewAll")} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {destinationCards.map((dest) => (
            <Link key={dest.id} href={dest.href} className="group">
              <div className="relative h-32 rounded-2xl overflow-hidden mb-2">
                <Image
                  src={dest.img}
                  alt={dest.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, 16vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 inset-x-0 text-center">
                  <div className="text-white text-sm font-bold">
                    {dest.name}
                  </div>
                  <div className="text-gray-300 text-[10px]">
                    {dest.subtitle || `${listingCountFor(dest.name)} stays`}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      )}

      {sectionEnabled("categories") && categoryCards.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 mt-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">{t("categoriesTitle")}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{t("categoriesSubtitle")}</p>
          </div>
          <Link href="/listings" className="text-green-700 text-sm font-semibold flex items-center gap-1 shrink-0">
            {tc("viewAll")} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categoryCards.map((cat) => (
            <Link key={cat.id} href={cat.href} className="group">
              <div className="relative h-32 rounded-2xl overflow-hidden mb-2">
                <Image
                  src={cat.img}
                  alt={cat.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, 16vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 inset-x-0 text-center">
                  <div className="text-white text-sm font-bold">{cat.name}</div>
                  <div className="text-gray-300 text-[10px]">{listingCountFor(cat.name)} stays</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      )}

      {sectionEnabled("experiences") && experienceCards.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 mt-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">{t("experiencesTitle")}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{t("experiencesSubtitle")}</p>
          </div>
          <Link
            href={
              experienceParentName
                ? `/listings?parent=${encodeURIComponent(experienceParentName)}`
                : "/listings"
            }
            className="text-green-700 text-sm font-semibold flex items-center gap-1 shrink-0"
          >
            {tc("viewAll")} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {experienceCards.map((exp) => (
            <Link key={exp.id} href={exp.href} className="group">
              <div className="relative h-32 rounded-2xl overflow-hidden mb-2">
                <Image
                  src={exp.img}
                  alt={exp.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, 16vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 inset-x-0 text-center">
                  <div className="text-white text-sm font-bold">{exp.name}</div>
                  <div className="text-gray-300 text-[10px]">{listingCountFor(exp.name)} stays</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      )}

      {sectionEnabled("venues") && venueCards.length > 0 && (
      <section className="max-w-7xl mx-auto px-4 mt-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display">{t("venuesTitle")}</h2>
            <p className="text-gray-500 text-sm mt-0.5">{t("venuesSubtitle")}</p>
          </div>
          <Link
            href={
              venueParentName
                ? `/listings?parent=${encodeURIComponent(venueParentName)}`
                : "/listings"
            }
            className="text-green-700 text-sm font-semibold flex items-center gap-1 shrink-0"
          >
            {tc("viewAll")} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {venueCards.map((venue) => (
            <Link key={venue.id} href={venue.href} className="group">
              <div className="relative h-32 rounded-2xl overflow-hidden mb-2">
                <Image
                  src={venue.img}
                  alt={venue.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, 16vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 inset-x-0 text-center">
                  <div className="text-white text-sm font-bold">{venue.name}</div>
                  <div className="text-gray-300 text-[10px]">{listingCountFor(venue.name)} stays</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      )}

      {sectionEnabled("blog") && blogPosts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900 font-display">
              {cms.contentSections.find((s) => s.key === "blog")?.title ?? "From the blog"}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {cms.contentSections.find((s) => s.key === "blog")?.subtitle ??
                "Tips, guides, and farm stories"}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {blogPosts.slice(0, 3).map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-green-100 transition-colors"
              >
                <h3 className="font-semibold text-gray-900 text-sm leading-snug">{post.title}</h3>
                <p className="text-xs text-gray-500 mt-2 line-clamp-3">{post.excerpt}</p>
                {post.publishedAt && (
                  <p className="text-[10px] text-gray-400 mt-3">
                    {new Date(post.publishedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {sectionEnabled("whyBook") && (
      <section className="max-w-7xl mx-auto px-4 mt-10 mb-6">
        <h2 className="text-xl font-bold text-gray-900 font-display text-center mb-8">
          {t("whyBookTitle")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {(
            [
              { icon: CheckCircle, key: "verified" as const },
              { icon: Tag, key: "price" as const },
              { icon: Shield, key: "secure" as const },
              { icon: Headphones, key: "support" as const },
            ] as const
          ).map(({ icon: Icon, key }) => (
            <div key={key} className="bg-white rounded-2xl p-5 text-center shadow-sm">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon className="w-6 h-6 text-green-700" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">
                {t(`whyBook.${key}.title`)}
              </h3>
              <p className="text-gray-500 text-xs leading-relaxed">{t(`whyBook.${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>
      )}

      <div className="bg-green-700 py-12 px-4 text-center">
        <h2 className="text-white text-2xl font-bold font-display mb-2">{t("ctaTitle")}</h2>
        <p className="text-green-200 mb-6 text-sm">{t("ctaSubtitle")}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/listings"
            className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold px-8 py-3 rounded-xl text-sm transition-colors"
          >
            {t("exploreAll")}
          </Link>
          <ListPropertyLink className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-semibold px-8 py-3 rounded-xl text-sm transition-colors">
            {t("listYourProperty")}
          </ListPropertyLink>
        </div>
      </div>
    </>
  );
}
