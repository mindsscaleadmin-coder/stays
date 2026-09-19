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
import { HERO_BG } from "@/lib/mock/data";
import { getFavoriteIds, setFavoriteIds } from "@/lib/mock/guest-data";
import { usePublicListings } from "@/lib/listings/use-public-listings";
import { HeroSearchBar } from "@/components/search/hero-search-bar";
import {
  ALL_PARENT_TAB_ID,
  HomeCategoryTabs,
} from "@/components/home/home-category-tabs";
import { enabledParentTabs } from "@/lib/admin/taxonomy-nav";
import { DISPLAY_DEFAULT_CURRENCY, formatStoredMoney, locationMatchesCountry } from "@/lib/currency";
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
import {
  HOME_PAGE_SETTINGS_SYNC_EVENT,
  loadHeroBannerUrl,
} from "@/lib/admin/home-page-settings-data";
import { useHomePageSettings } from "@/components/providers/home-page-settings-provider";
import { isDataImageUrl } from "@/lib/utils";
import {
  HomeBrowseCard,
  HomeBrowseScrollRow,
  HomeBrowseSectionHeader,
} from "@/components/home/home-browse-card";
import { HomeTrendingCard } from "@/components/home/home-trending-card";
import { HomeLiveActivityBar } from "@/components/home/home-live-activity-bar";
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
  const { country: headerCountry, ready: countryReady } = useCountry();
  const { data: taxonomy } = useAdminTaxonomy();
  const { listings: publicListings } = usePublicListings(undefined, {
    country: headerCountry.name,
    enabled: countryReady,
    // Homepage sections only need a small slice; avoid competing with hero image download.
    pageSize: 24,
  });
  const {
    location: guestLocation,
    loading: locationLoading,
    requestLocation,
  } = useGuestLocation();
  const cms = useCmsSettings();
  useHomePageSettings();
  const [heroImage, setHeroImage] = useState(HERO_BG);
  const heroUnoptimized = isDataImageUrl(heroImage) || heroImage === HERO_BG;

  useEffect(() => {
    const applyHero = () => setHeroImage(loadHeroBannerUrl() || HERO_BG);
    applyHero();
    window.addEventListener(HOME_PAGE_SETTINGS_SYNC_EVENT, applyHero);
    return () => window.removeEventListener(HOME_PAGE_SETTINGS_SYNC_EVENT, applyHero);
  }, []);
  const sectionEnabled = (key: string) =>
    cms.contentSections.find((s) => s.key === key)?.enabled ?? true;
  const sectionCopy = (key: string, fallbackTitle: string, fallbackSubtitle: string) => {
    const section = cms.contentSections.find((s) => s.key === key);
    return {
      title: section?.title?.trim() || fallbackTitle,
      subtitle: section?.subtitle?.trim() || fallbackSubtitle,
    };
  };
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [pricingTick, setPricingTick] = useState(0);
  const [promoTick, setPromoTick] = useState(0);
  const [dealClock, setDealClock] = useState(0);
  const parentTabs = useMemo(() => enabledParentTabs(taxonomy), [taxonomy]);
  const [selectedParentId, setSelectedParentId] = useState(ALL_PARENT_TAB_ID);
  const selectedParent = useMemo(
    () => parentTabs.find((p) => p.id === selectedParentId) ?? null,
    [parentTabs, selectedParentId]
  );

  useEffect(() => {
    if (parentTabs.length === 0) return;
    setSelectedParentId((current) =>
      current === ALL_PARENT_TAB_ID || parentTabs.some((p) => p.id === current)
        ? current
        : ALL_PARENT_TAB_ID
    );
  }, [parentTabs]);

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

    if (paid.length >= 6) return paid.slice(0, 6);

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

    return [...paid, ...fill].slice(0, 6);
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

  return (
    <>
      <section className="home-hero relative z-20 flex w-full min-w-0 items-center justify-center">
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <Image
            src={heroImage}
            alt="Farm stay hero"
            fill
            priority
            className="object-cover"
            sizes="100vw"
            unoptimized={heroUnoptimized}
            suppressHydrationWarning
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        </div>
        <div className="relative home-page-container py-12 md:py-16 lg:py-20 min-w-0">
          <div className="max-w-2xl min-w-0">
            <h1 className="text-white text-[1.75rem] sm:text-3xl md:text-[2rem] lg:text-[2.75rem] font-bold font-display leading-tight mb-3 break-words">
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
          </div>
          <div className="home-hero-search mt-6 sm:mt-8 min-w-0">
            {parentTabs.length > 0 ? (
              <HomeCategoryTabs
                selectedParentId={selectedParentId}
                onSelect={(id) => setSelectedParentId(id)}
              />
            ) : null}
            <HeroSearchBar
              resultsPath="/listings"
              parentId={selectedParent?.id ?? ""}
              parentName={selectedParent?.name ?? ""}
            />
          </div>
        </div>
      </section>

      <div className="home-page-container">
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-4 sm:px-6 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-3">
          {[
            { icon: Home, val: "1,245+", label: t("stats.properties") },
            { icon: Calendar, val: "42,300+", label: t("stats.nightsBooked") },
            { icon: Users, val: "12,500+", label: t("stats.happyGuests") },
            { icon: Star, val: "4.9/5", label: t("stats.averageRating") },
          ].map(({ icon: Icon, val, label }) => (
            <div key={label} className="flex items-center gap-2 sm:gap-3 min-w-0">
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

      <div className="home-page-container mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border rounded-2xl p-5 flex flex-col gap-3">
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

      <HomeLiveActivityBar />

      <LocationPermissionBanner
        visible={guestLocation?.source !== "geolocation" && guestLocation?.source !== "country"}
        loading={locationLoading}
        areaName={areaName}
        usingGps={guestLocation?.source === "geolocation"}
        onEnable={requestLocation}
      />

      {sectionEnabled("trending") && (
      <section className="home-page-container home-section">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 font-display sm:text-xl">
              <TrendingUp className="h-5 w-5 shrink-0 text-amber-500" />{" "}
              {sectionCopy("trending", t("trendingTitle"), trendingSubtitle).title}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {sectionCopy("trending", t("trendingTitle"), trendingSubtitle).subtitle}
            </p>
          </div>
          <Link
            href="/listings?filter=trending&q=nearby"
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-green-700"
          >
            {tc("viewAll")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <HomeBrowseScrollRow>
          {trendingStays.map((stay) => {
            const isDirectory =
              stay.parentCategory === "Dining" || stay.parentCategory === "Events";
            const displayPrice = formatStoredMoney(
              stay.originalPrice != null && stay.originalPrice > stay.price
                ? stay.originalPrice
                : stay.price,
              {
                storedCurrency: stay.currency || stay.flashDealCurrency || DISPLAY_DEFAULT_CURRENCY,
                currency: headerCountry.currency,
                exchangeRateToAED: headerCountry.exchangeRateToAED,
                locale,
              }
            );

            return (
              <HomeTrendingCard
                key={stay.id}
                href={`/listing/${stay.id}`}
                name={stay.name}
                location={stay.location}
                img={stay.img}
                badge={stay.badge}
                badgeColor={stay.badgeColor}
                price={isDirectory && stay.price <= 0 ? "Enquire" : displayPrice}
                priceSuffix={isDirectory || stay.price <= 0 ? undefined : tc("perNight")}
                rating={stay.rating}
                reviewCount={stay.reviews}
                wishlisted={wishlist.includes(stay.id)}
                onToggleWishlist={() => toggleWishlist(stay.id)}
              />
            );
          })}
        </HomeBrowseScrollRow>
      </section>
      )}

      {sectionEnabled("flashDeals") && flashDeals.length > 0 && (
      <section className="home-page-container home-section">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-display flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-500" />{" "}
              {sectionCopy("flashDeals", t("flashDealsTitle"), flashSubtitle).title}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">
              {sectionCopy("flashDeals", t("flashDealsTitle"), flashSubtitle).subtitle}
            </p>
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
                        storedCurrency: deal.flashCurrency || deal.currency || DISPLAY_DEFAULT_CURRENCY,
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
      <section className="home-page-container home-section">
        <HomeBrowseSectionHeader
          title={sectionCopy("destinations", t("destinationsTitle"), t("destinationsSubtitle")).title}
          subtitle={
            sectionCopy("destinations", t("destinationsTitle"), t("destinationsSubtitle")).subtitle
          }
          viewAllHref="/destinations"
          viewAllLabel={tc("viewAll")}
        />
        <HomeBrowseScrollRow>
          {destinationCards.map((dest) => (
            <HomeBrowseCard
              key={dest.id}
              href={dest.href}
              name={dest.name}
              subtitle={dest.subtitle || `${listingCountFor(dest.name)} stays`}
              img={dest.img}
            />
          ))}
        </HomeBrowseScrollRow>
      </section>
      )}

      {sectionEnabled("categories") && categoryCards.length > 0 && (
      <section className="home-page-container home-section">
        <HomeBrowseSectionHeader
          title={sectionCopy("categories", t("categoriesTitle"), t("categoriesSubtitle")).title}
          subtitle={
            sectionCopy("categories", t("categoriesTitle"), t("categoriesSubtitle")).subtitle
          }
          viewAllHref="/listings"
          viewAllLabel={tc("viewAll")}
        />
        <HomeBrowseScrollRow>
          {categoryCards.map((cat) => (
            <HomeBrowseCard
              key={cat.id}
              href={cat.href}
              name={cat.name}
              subtitle={`${listingCountFor(cat.name)} stays`}
              img={cat.img}
            />
          ))}
        </HomeBrowseScrollRow>
      </section>
      )}

      {sectionEnabled("experiences") && experienceCards.length > 0 && (
      <section className="home-page-container home-section">
        <HomeBrowseSectionHeader
          title={sectionCopy("experiences", t("experiencesTitle"), t("experiencesSubtitle")).title}
          subtitle={
            sectionCopy("experiences", t("experiencesTitle"), t("experiencesSubtitle")).subtitle
          }
          viewAllHref={
            experienceParentName
              ? `/listings?parent=${encodeURIComponent(experienceParentName)}`
              : "/listings"
          }
          viewAllLabel={tc("viewAll")}
        />
        <HomeBrowseScrollRow>
          {experienceCards.map((exp) => (
            <HomeBrowseCard
              key={exp.id}
              href={exp.href}
              name={exp.name}
              subtitle={`${listingCountFor(exp.name)} stays`}
              img={exp.img}
            />
          ))}
        </HomeBrowseScrollRow>
      </section>
      )}

      {sectionEnabled("venues") && venueCards.length > 0 && (
      <section className="home-page-container home-section">
        <HomeBrowseSectionHeader
          title={sectionCopy("venues", t("venuesTitle"), t("venuesSubtitle")).title}
          subtitle={sectionCopy("venues", t("venuesTitle"), t("venuesSubtitle")).subtitle}
          viewAllHref={
            venueParentName
              ? `/listings?parent=${encodeURIComponent(venueParentName)}`
              : "/listings"
          }
          viewAllLabel={tc("viewAll")}
        />
        <HomeBrowseScrollRow>
          {venueCards.map((venue) => (
            <HomeBrowseCard
              key={venue.id}
              href={venue.href}
              name={venue.name}
              subtitle={`${listingCountFor(venue.name)} stays`}
              img={venue.img}
            />
          ))}
        </HomeBrowseScrollRow>
      </section>
      )}

      {sectionEnabled("whyBook") && (
      <section className="home-page-container home-section mb-6">
        <h2 className="text-xl font-bold text-gray-900 font-display text-center mb-8">
          {sectionCopy("whyBook", t("whyBookTitle"), "").title}
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
