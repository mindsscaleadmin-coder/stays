"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { CheckAvailabilityLink } from "@/components/auth/check-availability-link";
import {
  MapPin,
  Star,
  Heart,
  Users,
  Home,
  Share2,
  Sparkles,
  Wifi,
  Trees,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  CheckCircle2,
  Clock,
  Shield,
  ShieldCheck,
  Headphones,
  Lock,
  ChevronDown,
  Info,
  Zap,
  MessageCircle,
  Phone,
  Tag,
  Flame,
  Play,
  BedDouble,
  Bath,
  Mountain,
  Wind,
  Tv,
  Calendar,
  LayoutGrid,
  Minus,
  Plus,
  Link2,
} from "lucide-react";
import type { ListingSafetyItem } from "@/lib/listings/submission-types";
import { useTranslations, useLocale } from "next-intl";
import { CountdownTimer } from "@/components/ui/star-rating";
import {
  GALLERY,
  PROPERTY_HIGHLIGHTS,
  BOOKING_ACTIVITY,
  type Stay,
} from "@/lib/mock/data";
import { usePublicListings } from "@/lib/listings/use-public-listings";
import { isSharedDbEnabled } from "@/lib/shared-db";
import { ListingReviewsSection } from "@/components/listing/listing-reviews-section";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { RichTextView } from "@/components/listing/rich-text-view";
import { DISPLAY_DEFAULT_CURRENCY, formatStoredMoney } from "@/lib/currency";
import { resolveCountryPricingConfig } from "@/lib/admin/country-utils";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useCountrySupportContact } from "@/lib/admin/use-country-support-contact";
import { photoTagLabel } from "@/lib/listings/photo-tags";
import { ListingGalleryOverlay } from "@/components/listing/listing-gallery-overlay";
import {
  DEFAULT_LISTING_FEATURE_ICON_ROWS,
  getListingFeatureIcon,
} from "@/lib/listings/listing-feature-icons";
import { LISTING_AMENITY_OPTIONS } from "@/lib/listings/listing-field-options";
import {
  HOST_PRICING_SYNC_EVENT,
  loadPricingSettings,
  preferStoredRateIfPublishedEmpty,
} from "@/lib/host/host-pricing-data";
import { fetchPricingFromApi, shouldUseSharedPricingStore } from "@/lib/host/host-pricing-api";
import {
  HOST_AVAILABILITY_SYNC_EVENT,
  getAvailabilitySettings,
} from "@/lib/host/host-availability-data";
import { fetchAvailabilityState } from "@/lib/host/host-availability-api";
import {
  bookingRulesViolation,
  earliestBookableCheckInIso,
  isDateUnavailable,
  isSeasonallyClosed,
} from "@/lib/host/host-availability-utils";
import type { ListingAvailabilitySettings } from "@/lib/host/host-availability-types";
import {
  calculateStayQuote,
  countNights,
  defaultCheckInOut,
  resolveDisplayNightlyRate,
  resolvePublishedRateTiers,
  listPublishedHostOffers,
} from "@/lib/host/calculate-stay-price";
import {
  EXTRA_CHARGE_BILLING_LABELS,
} from "@/lib/admin/extra-charges-catalog-types";
import {
  normalizeExtraChargeBilling,
  type ExtraCharge,
  type ListingPricingSettings,
} from "@/lib/host/host-pricing-types";
import { getActivePromotedListingIds } from "@/lib/host/host-promotions-data";
import { getActiveFlashDeal, remainingCountdown } from "@/lib/host/flash-deal-utils";
import { isFeaturedStay } from "@/lib/listings/public-listings";
import { applyGuestReviewRatings } from "@/lib/booking/stay-reviews-data";
import type { StayReview } from "@/lib/booking/stay-reviews-types";
import { addToBookingCart, loadBookingCart } from "@/lib/guest/booking-cart";
import { getGuestLoginHref } from "@/lib/guest/checkout-access";
import {
  FAVORITES_SYNC_EVENT,
  isFavoriteId,
  toggleFavoriteId,
} from "@/lib/mock/guest-data";
import { useAuth } from "@/components/providers/auth-provider";
import { readStayDatesFromSearch, readStayPartyFromSearch } from "@/lib/guest/stay-search-dates";
import { ExperienceBookingCard } from "@/components/listing/experience-booking-card";
import { EventListingDetailContent } from "@/components/listing/event-listing-detail-content";
import { ListingLocationPreview } from "@/components/listing/listing-location-preview";
import {
  EmailBrandIcon,
  FacebookBrandIcon,
  WhatsAppBrandIcon,
  XBrandIcon,
} from "@/components/listing/share-brand-icons";
import { isExperienceListing } from "@/lib/booking/is-experience-listing";
import { isDirectoryListing } from "@/lib/booking/is-directory-listing";
import { isDiningListing } from "@/lib/booking/is-dining-listing";
import { eventSpaceImages } from "@/lib/listings/event-space-images";
import { buildEventSpaceFilterGroups } from "@/lib/listings/resolve-venue-space-filters";
import { buildListingFilterDisplayGroups } from "@/lib/listings/resolve-listing-filter-groups";
import { VenueFilterGroupBlock } from "@/components/listing/venue-filter-group-display";
import type { DiningDetails } from "@/lib/listings/dining-details-types";
import { DINING_GALLERY_FILTERS, filterDiningGalleryPhotos } from "@/lib/listings/dining-photo-tags";
import type { VenueDetails } from "@/lib/listings/venue-details-types";
import {
  guestPartyFromRoom,
  mergeGuestPartyLimits,
  type GuestPartyLimits,
} from "@/lib/listings/guest-capacity";
import { LISTING_PLACEHOLDER_IMG } from "@/lib/listings/submission-to-stay";
import { isDataImageUrl } from "@/lib/utils";

const CALENDAR_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function buildCalendarMonthCells(year: number, month: number): ({ iso: string; day: number } | null)[] {
  const startPad = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: ({ iso: string; day: number } | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push({ iso, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatCalendarMonthTitle(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function displayDayAppearance(
  iso: string,
  opts: {
    calendarMinIso: string;
    occupiedDateSet: Set<string>;
    availability: ListingAvailabilitySettings | null;
    checkIn: string;
    checkOut: string;
  }
): { className: string; title: string } {
  const { calendarMinIso, occupiedDateSet, availability, checkIn, checkOut } = opts;
  const past = iso < calendarMinIso;
  const booked = occupiedDateSet.has(iso);
  const blocked = Boolean(availability) && availability!.blockedDates.includes(iso);
  const seasonClosed =
    Boolean(availability) && isSeasonallyClosed(iso, availability!.seasonalPeriods);
  const channel =
    Boolean(availability) &&
    (availability!.icalImportedDates ?? []).includes(iso) &&
    !booked;
  const unavailable = Boolean(availability) && isDateUnavailable(iso, availability!);
  const disabled = past || unavailable;
  const selected =
    (Boolean(checkIn) && iso === checkIn) || (Boolean(checkOut) && iso === checkOut);
  const inRange =
    Boolean(checkIn) && Boolean(checkOut) && iso > checkIn && iso < checkOut;

  const title = past
    ? "Past date"
    : blocked
      ? "Blocked"
      : seasonClosed
        ? "Seasonal closure"
        : booked
          ? "Booked"
          : channel
            ? "Unavailable (channel calendar)"
            : selected
              ? "Selected"
              : "Available";

  const className = disabled
    ? past && !unavailable
      ? "border-transparent text-gray-300"
      : blocked
        ? "bg-red-100 border-red-300 text-red-900"
        : seasonClosed
          ? "bg-amber-100 border-amber-300 text-amber-900"
          : booked
            ? "bg-blue-100 border-blue-300 text-blue-900"
            : channel
              ? "bg-slate-100 border-slate-300 text-slate-800"
              : "bg-gray-100 border-gray-200 text-gray-400"
    : selected
      ? "bg-green-600 border-green-600 text-white font-semibold"
      : inRange
        ? "bg-green-50 border-green-200 text-green-800 font-medium"
        : "bg-green-50 border-green-200 text-gray-800 font-medium";

  return { className, title };
}

const POLICIES = [
  { title: "Check-in", desc: "From 3:00 PM. Early check-in subject to availability." },
  { title: "Check-out", desc: "Before 11:00 AM. Late check-out may incur extra charges." },
  { title: "Cancellation", desc: "Free cancellation up to 7 days before arrival. 50% refund within 7 days." },
  { title: "House Rules", desc: "No smoking indoors. Pets allowed on request. Quiet hours after 10 PM." },
];

interface PropertyListingDetailPageProps {
  stay: Stay;
  galleryImages?: string[];
  /** Preferred: images with optional host-assigned tags */
  galleryPhotos?: { src: string; tag?: string }[];
  description?: string;
  previewMode?: boolean;
  propertyHighlights?: string[];
  propertyFeatureIcons?: { iconKey: string; label: string }[];
  farmType?: string;
  farmActivities?: string[];
  livestockCrops?: string;
  houseRules?: { title: string; description: string }[];
  /** Google Maps / OSM embed URL for Location section */
  mapEmbedUrl?: string;
  /** Travel-time hints for the location section */
  nearbyPlaces?: { label: string; duration: string }[];
  rooms?: {
    id?: string;
    name: string;
    desc: string;
    price: number;
    capacity: number;
    maxAdults?: number;
    maxChildren?: number;
    maxInfants?: number;
    beds: number;
    baths: number;
    img: string;
    advancedFilterIds?: string[];
    venueDetails?: VenueDetails;
  }[];
  /** Host-configured guest limits (property-level). Rooms override when selected. */
  guestParty?: GuestPartyLimits;
  /** Host-configured optional fees for this listing */
  extraCharges?: ExtraCharge[];
  extraChargesCurrency?: string;
  /** Explicit amenities (merged with stay.amenities) */
  amenities?: string[];
  advancedFilters?: string[];
  venueDetails?: VenueDetails;
  diningDetails?: DiningDetails;
  /** Experience listing content */
  itinerary?: { step: number; title: string; description?: string }[];
  meetingPoint?: string;
  requirements?: string;
  licenseNumber?: string;
  groupSizeMin?: number;
  safetyChecklist?: ListingSafetyItem[];
}

export function PropertyListingDetailPage({
  stay,
  galleryImages,
  galleryPhotos,
  description,
  previewMode = false,
  propertyHighlights,
  propertyFeatureIcons,
  farmType,
  farmActivities,
  livestockCrops,
  houseRules,
  mapEmbedUrl,
  nearbyPlaces = [],
  rooms: roomsProp,
  guestParty: guestPartyProp,
  extraCharges: extraChargesProp,
  extraChargesCurrency: extraChargesCurrencyProp,
  amenities: amenitiesProp,
  advancedFilters: advancedFiltersProp,
  venueDetails: venueDetailsProp,
  diningDetails: diningDetailsProp,
  itinerary,
  meetingPoint,
  requirements,
  licenseNumber,
  groupSizeMin,
  safetyChecklist,
}: PropertyListingDetailPageProps) {
  const t = useTranslations("listing");
  const tc = useTranslations("common");
  const ta = useTranslations("account");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const { data: taxonomy } = useAdminTaxonomy();
  const {
    phone: supportPhone,
    telHref: supportTelHref,
    whatsappHref: supportWhatsAppHref,
  } = useCountrySupportContact();
  const isExperience = isExperienceListing({
    parentCategory: stay.parentCategory,
    type: stay.type,
  });
  const isDirectory = isDirectoryListing({
    parentCategory: stay.parentCategory,
    type: stay.type,
    category: stay.category,
  });
  const isDining = isDiningListing({
    parentCategory: stay.parentCategory,
    type: stay.type,
    category: stay.category,
  });
  const isEvent = isDirectory && !isDining;
  const showLiveActivityMarquee = !isSharedDbEnabled();
  const directoryVariant = isDining ? "dining" : "event";
  const breadcrumbParent = stay.parentCategory?.trim() ?? "";
  const breadcrumbCategory = breadcrumbParent ? (stay.category?.trim() ?? "") : "";
  const { listings: catalogListings } = usePublicListings();
  const [showFeatured, setShowFeatured] = useState(() =>
    /featured|premium/i.test(stay.badge ?? "")
  );
  const [reviewsReady, setReviewsReady] = useState(false);
  const [publishedReviews, setPublishedReviews] = useState<StayReview[]>([]);

  useEffect(() => {
    const ids = new Set(getActivePromotedListingIds("featured"));
    setShowFeatured(isFeaturedStay(stay, ids));
  }, [stay]);

  useEffect(() => {
    let cancelled = false;
    setReviewsReady(false);
    void fetch(`/api/reviews?listingId=${encodeURIComponent(stay.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { reviews?: StayReview[] } | null) => {
        if (cancelled) return;
        const rows = Array.isArray(data?.reviews) ? data.reviews : [];
        setPublishedReviews(rows);
        setReviewsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setPublishedReviews([]);
          setReviewsReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [stay.id]);

  const ratedStay = useMemo(() => {
    if (!reviewsReady) return { ...stay, rating: 0, reviews: 0 };
    if (publishedReviews.length === 0) return { ...stay, rating: 0, reviews: 0 };
    const sum = publishedReviews.reduce((total, review) => total + review.rating, 0);
    return {
      ...stay,
      rating: Math.round((sum / publishedReviews.length) * 10) / 10,
      reviews: publishedReviews.length,
    };
  }, [stay, reviewsReady, publishedReviews]);

  const countryPricing = useMemo(
    () => resolveCountryPricingConfig(taxonomy.countries, stay.location),
    [taxonomy.countries, stay.location]
  );

  // Host-added rooms only — empty means guests book at the property base rate.
  const hostRooms = useMemo(() => roomsProp ?? [], [roomsProp]);
  const hasRoomTypes = hostRooms.length > 0;

  const [bookingRoomIds, setBookingRoomIds] = useState<string[]>([]);
  const defaultDates = useMemo(() => defaultCheckInOut(2), []);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState<"checkIn" | "checkOut" | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const seed = checkIn || defaultDates.checkIn;
    const d = new Date(`${seed}T12:00:00`);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [displayCalendarStart, setDisplayCalendarStart] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [adults, setAdults] = useState(() => readStayPartyFromSearch()?.adults ?? 0);
  const [children, setChildren] = useState(() => readStayPartyFromSearch()?.children ?? 0);
  const [infants, setInfants] = useState(() => readStayPartyFromSearch()?.infants ?? 0);
  const [guestsOpen, setGuestsOpen] = useState(false);
  /** Paying guests for capacity + per-pax fees (infants excluded). */
  const guestCount = adults + children;

  const [activeTab, setActiveTab] = useState("overview");
  const [wishlist, setWishlist] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [diningGalleryFilter, setDiningGalleryFilter] = useState("all");
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [galleryStartVideo, setGalleryStartVideo] = useState(false);
  const [shareFlash, setShareFlash] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [readMore, setReadMore] = useState(false);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [cartAdded, setCartAdded] = useState(false);
  const [pricingSettings, setPricingSettings] = useState<ListingPricingSettings | null>(null);
  const [availability, setAvailability] = useState<ListingAvailabilitySettings | null>(null);
  const [occupiedDates, setOccupiedDates] = useState<string[]>([]);
  const [listingExtras, setListingExtras] = useState<ExtraCharge[]>(
    extraChargesProp ?? []
  );
  const [extrasCurrency, setExtrasCurrency] = useState(extraChargesCurrencyProp ?? DISPLAY_DEFAULT_CURRENCY);

  useEffect(() => {
    function syncSaved() {
      setWishlist(isFavoriteId(stay.id));
    }
    syncSaved();
    window.addEventListener(FAVORITES_SYNC_EVENT, syncSaved);
    window.addEventListener("storage", syncSaved);
    return () => {
      window.removeEventListener(FAVORITES_SYNC_EVENT, syncSaved);
      window.removeEventListener("storage", syncSaved);
    };
  }, [stay.id]);

  const toggleWishlist = useCallback(() => {
    if (authLoading) return;
    if (!user) {
      const returnPath = pathname || `/listing/${stay.id}`;
      router.push(getGuestLoginHref(returnPath));
      return;
    }
    const saved = toggleFavoriteId(stay.id);
    setWishlist(saved);
    if (saved) {
      setSaveFlash(true);
      window.setTimeout(() => setSaveFlash(false), 2000);
    }
  }, [authLoading, user, pathname, stay.id, router]);

  const displayRooms = useMemo(() => {
    if (hasRoomTypes) return hostRooms;
    const nightly =
      (pricingSettings
        ? resolveDisplayNightlyRate(pricingSettings, null)
        : 0) || stay.price;
    return [
      {
        name: "Entire property",
        desc: "No extra room types — guests book at the base nightly rate",
        price: nightly,
        capacity: stay.guests,
        beds: stay.beds,
        baths: stay.baths,
        img: stay.img || LISTING_PLACEHOLDER_IMG,
      },
    ];
  }, [hasRoomTypes, hostRooms, pricingSettings, stay]);

  useEffect(() => {
    const fromSearch = readStayDatesFromSearch();
    if (fromSearch) {
      setCheckIn(fromSearch.checkIn);
      setCheckOut(fromSearch.checkOut);
      return;
    }
    const cartLine = loadBookingCart().find((line) => line.listingId === stay.id);
    if (cartLine?.checkIn && cartLine.checkOut) {
      setCheckIn(cartLine.checkIn);
      setCheckOut(cartLine.checkOut);
    }
  }, [stay.id]);

  useEffect(() => {
    const validIds = new Set(hostRooms.map((r) => r.id).filter(Boolean) as string[]);
    setBookingRoomIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [hostRooms]);

  useEffect(() => {
    // Property-level listings only — room listings derive capacity from selected rooms
    if (hasRoomTypes) return;
    const total = Math.max(1, guestPartyProp?.total ?? stay.guests);
    const maxAdults = Math.max(0, guestPartyProp?.adults ?? total);
    const maxChildren = Math.max(0, guestPartyProp?.children ?? total);
    const maxInfants = Math.max(0, guestPartyProp?.infants ?? 5);
    setAdults((a) => Math.min(Math.max(0, a), maxAdults, total));
    setChildren((c) => Math.min(Math.max(0, c), maxChildren, total));
    setInfants((i) => Math.min(Math.max(0, i), maxInfants));
  }, [
    stay.guests,
    hasRoomTypes,
    guestPartyProp?.total,
    guestPartyProp?.adults,
    guestPartyProp?.children,
    guestPartyProp?.infants,
  ]);

  const bookingRooms = useMemo(
    () => hostRooms.filter((r) => r.id && bookingRoomIds.includes(r.id)),
    [hostRooms, bookingRoomIds]
  );

  const partyLimits = useMemo((): GuestPartyLimits => {
    if (hasRoomTypes && bookingRooms.length > 0) {
      return mergeGuestPartyLimits(bookingRooms.map(guestPartyFromRoom));
    }
    if (guestPartyProp) {
      return {
        total: Math.max(1, guestPartyProp.total),
        adults: Math.max(0, guestPartyProp.adults),
        children: Math.max(0, guestPartyProp.children),
        infants: Math.max(0, guestPartyProp.infants),
      };
    }
    const total = Math.max(1, stay.guests);
    return { adults: total, children: total, infants: 5, total };
  }, [hasRoomTypes, bookingRooms, stay.guests, guestPartyProp]);

  const maxGuests = partyLimits.total;
  const maxInfantsAllowed = Math.max(0, partyLimits.infants);

  function scrollToCalculator() {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    requestAnimationFrame(() => {
      document.getElementById("booking-calculator")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function toggleBookingRoom(roomId: string | undefined) {
    if (!roomId) return;
    const adding = !bookingRoomIds.includes(roomId);
    setBookingRoomIds((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
    if (adding) scrollToCalculator();
    setActiveTab("rooms");
  }

  const roomNightly = useCallback(
    (room: { id?: string; price: number }): number => {
      if (pricingSettings && room.id) {
        const stored = pricingSettings.roomPrices.find((r) => r.roomId === room.id);
        if (stored?.basePrice != null && stored.basePrice > 0) {
          return resolveDisplayNightlyRate(pricingSettings, room.id);
        }
      }
      if (room.price > 0) return room.price;
      if (pricingSettings) return resolveDisplayNightlyRate(pricingSettings, null);
      return 0;
    },
    [pricingSettings]
  );

  const galleryPhotoList = useMemo(
    () =>
      galleryPhotos && galleryPhotos.length > 0
        ? galleryPhotos
        : galleryImages?.length
          ? galleryImages.map((src) => ({ src }))
          : [],
    [galleryPhotos, galleryImages]
  );

  const eventSpaces = useMemo(() => {
    const multiRate = displayRooms.length > 1;
    const listingAdvancedNames = advancedFiltersProp ?? [];
    const allRoomFilters = displayRooms.map((item) => ({
      advancedFilterIds: (item as { advancedFilterIds?: string[] }).advancedFilterIds,
    }));

    return displayRooms.map((room) => {
      const advancedFilterIds = (room as { advancedFilterIds?: string[] }).advancedFilterIds;
      const filterGroups = buildEventSpaceFilterGroups(
        taxonomy,
        { advancedFilterIds },
        allRoomFilters,
        listingAdvancedNames,
        multiRate
      );

      const cover = room.img || stay.img || LISTING_PLACEHOLDER_IMG;
      const images = eventSpaceImages({ name: room.name, img: cover }, galleryPhotoList);

      return {
        id: (room as { id?: string }).id,
        name: room.name,
        desc: room.desc,
        price: roomNightly(room),
        capacity: room.capacity,
        img: images[0] ?? cover,
        images,
        advancedFilterIds,
        filterGroups,
        venueDetails: (room as { venueDetails?: VenueDetails }).venueDetails,
      };
    });
  }, [advancedFiltersProp, displayRooms, galleryPhotoList, roomNightly, stay.img, taxonomy]);

  useEffect(() => {
    async function refreshPricing() {
      if (typeof window === "undefined") return;
      const local = loadPricingSettings(stay.id);
      const pricing = shouldUseSharedPricingStore()
        ? preferStoredRateIfPublishedEmpty(
            await fetchPricingFromApi(stay.id).catch(() => null),
            local
          ).settings
        : local;
      setPricingSettings(pricing);
      const currency = extraChargesCurrencyProp ?? pricing.currency ?? DISPLAY_DEFAULT_CURRENCY;
      setExtrasCurrency(currency);

      if (!pricing.extraChargesEnabled) {
        setListingExtras([]);
        return;
      }
      setListingExtras(
        pricing.extraCharges.length > 0
          ? pricing.extraCharges
          : extraChargesProp ?? []
      );
    }
    void refreshPricing();
    window.addEventListener(HOST_PRICING_SYNC_EVENT, refreshPricing);
    window.addEventListener("storage", refreshPricing);
    return () => {
      window.removeEventListener(HOST_PRICING_SYNC_EVENT, refreshPricing);
      window.removeEventListener("storage", refreshPricing);
    };
  }, [stay.id, extraChargesCurrencyProp, extraChargesProp]);

  useEffect(() => {
    async function refreshAvailability() {
      if (typeof window === "undefined") return;
      const state = await fetchAvailabilityState(stay.id).catch(() => null);
      if (state) {
        setAvailability(state.settings);
        setOccupiedDates(state.occupiedDates);
        return;
      }
      setAvailability(getAvailabilitySettings(stay.id));
      setOccupiedDates([]);
    }
    void refreshAvailability();
    window.addEventListener(HOST_AVAILABILITY_SYNC_EVENT, refreshAvailability);
    window.addEventListener("storage", refreshAvailability);
    return () => {
      window.removeEventListener(HOST_AVAILABILITY_SYNC_EVENT, refreshAvailability);
      window.removeEventListener("storage", refreshAvailability);
    };
  }, [stay.id]);

  const occupiedDateSet = useMemo(() => new Set(occupiedDates), [occupiedDates]);

  useEffect(() => {
    setSelectedExtraIds((prev) =>
      prev.filter((id) => listingExtras.some((e) => e.id === id))
    );
  }, [listingExtras]);

  const selectedExtras = useMemo(
    () => listingExtras.filter((e) => selectedExtraIds.includes(e.id)),
    [listingExtras, selectedExtraIds]
  );
  const extrasTotal = useMemo(
    () => selectedExtras.reduce((sum, e) => sum + e.amount, 0),
    [selectedExtras]
  );

  /** Nightly rate from host pricing (sum of selected rooms, or property base). */
  const displayPrice = useMemo(() => {
    if (hasRoomTypes && bookingRooms.length > 0) {
      return bookingRooms.reduce((sum, room) => {
        if (pricingSettings && room.id) {
          const stored = pricingSettings.roomPrices.find((r) => r.roomId === room.id);
          if (stored?.basePrice != null && stored.basePrice > 0) {
            return sum + resolveDisplayNightlyRate(pricingSettings, room.id);
          }
        }
        return sum + (room.price > 0 ? room.price : 0);
      }, 0);
    }
    if (pricingSettings) {
      return resolveDisplayNightlyRate(pricingSettings, null);
    }
    return stay.price;
  }, [
    hasRoomTypes,
    bookingRooms,
    pricingSettings,
    stay.price,
  ]);

  const hostOffers = useMemo(
    () => (pricingSettings ? listPublishedHostOffers(pricingSettings) : []),
    [pricingSettings]
  );

  const flashDeal = useMemo(
    () => (pricingSettings ? getActiveFlashDeal(pricingSettings) : null),
    [pricingSettings]
  );
  const flashCountdown = flashDeal ? remainingCountdown(flashDeal.endsAt) : null;

  const publishedRates = useMemo(() => {
    if (!pricingSettings) {
      return { nightly: displayPrice ?? stay.price, weekend: null, monthly: null };
    }
    return resolvePublishedRateTiers(
      pricingSettings,
      bookingRooms.map((r) => r.id).filter((id): id is string => Boolean(id))
    );
  }, [pricingSettings, bookingRooms, displayPrice, stay.price]);

  const stayQuote = useMemo(() => {
    if (!pricingSettings || !checkIn || !checkOut) return null;
    return calculateStayQuote({
      settings: pricingSettings,
      checkIn,
      checkOut,
      guests: guestCount,
      roomIds: hasRoomTypes && bookingRoomIds.length > 0 ? bookingRoomIds : undefined,
      selectedExtras,
    });
  }, [
    pricingSettings,
    checkIn,
    checkOut,
    guestCount,
    hasRoomTypes,
    bookingRoomIds,
    selectedExtras,
  ]);

  function toggleExtra(id: string) {
    setSelectedExtraIds((prev) => {
      const adding = !prev.includes(id);
      if (adding) scrollToCalculator();
      return adding ? [...prev, id] : prev.filter((x) => x !== id);
    });
  }

  function openDatePicker(which: "checkIn" | "checkOut") {
    setGuestsOpen(false);
    // Checkout requires a check-in first — open check-in, then guest picks checkout.
    const mode = which === "checkOut" && !checkIn ? "checkIn" : which;
    const iso =
      mode === "checkIn"
        ? checkIn || defaultDates.checkIn
        : checkOut || checkIn || defaultDates.checkIn;
    const d = new Date(`${iso}T12:00:00`);
    setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
    setDatePickerOpen((prev) => (prev === mode ? null : mode));
  }

  function selectCalendarDate(iso: string) {
    if (availability && isDateUnavailable(iso, availability)) return;
    const earliest = earliestBookableCheckInIso(availability?.advanceNoticeDays ?? 0);

    if (datePickerOpen === "checkIn") {
      if (iso < earliest) return;
      setCheckIn(iso);
      // Keep an existing checkout only if it still makes a valid stay after the new check-in.
      setCheckOut((prev) => (prev && prev > iso ? prev : ""));
      setDatePickerOpen("checkOut");
      const d = new Date(`${iso}T12:00:00`);
      setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
      return;
    }

    if (datePickerOpen === "checkOut") {
      if (!checkIn) {
        if (iso < earliest) return;
        setCheckIn(iso);
        setCheckOut("");
        setDatePickerOpen("checkOut");
        return;
      }
      // Clicking on/before check-in starts a new range (guest can re-pick both dates).
      if (iso <= checkIn) {
        if (iso < earliest) return;
        setCheckIn(iso);
        setCheckOut("");
        setDatePickerOpen("checkOut");
        const d = new Date(`${iso}T12:00:00`);
        setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
        return;
      }
      setCheckOut(iso);
      setDatePickerOpen(null);
    }
  }

  function formatDateLabel(iso: string): string {
    if (!iso) return "Add date";
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const selectedNights =
    checkIn && checkOut ? countNights(checkIn, checkOut) : 0;

  // Guests can always pick any bookable day; in checkout mode, a day on/before
  // check-in restarts the range instead of setting checkout.
  const calendarMinIso = earliestBookableCheckInIso(
    availability?.advanceNoticeDays ?? 0
  );

  const minStayNights = Math.max(1, availability?.minStayNights ?? 1);

  const guestBookingHint =
    guestCount < 1 ? "Add at least one adult or child to continue." : null;
  const dateBookingHint =
    guestCount >= 1 && checkIn && checkOut && availability
      ? bookingRulesViolation(checkIn, checkOut, availability)
      : null;
  const bookingRuleHint = guestBookingHint || dateBookingHint;

  const calendarCells = useMemo(
    () => buildCalendarMonthCells(calendarMonth.year, calendarMonth.month),
    [calendarMonth]
  );

  const displayCalendarMonths = useMemo(() => {
    return Array.from({ length: 3 }, (_, index) => {
      const d = new Date(displayCalendarStart.year, displayCalendarStart.month + index, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      return {
        year,
        month,
        title: formatCalendarMonthTitle(year, month),
        cells: buildCalendarMonthCells(year, month),
      };
    });
  }, [displayCalendarStart]);

  const calendarTitle = useMemo(() => {
    const d = new Date(calendarMonth.year, calendarMonth.month, 1);
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [calendarMonth]);

  useEffect(() => {
    if (!datePickerOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!datePickerRef.current?.contains(e.target as Node)) {
        setDatePickerOpen(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDatePickerOpen(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [datePickerOpen]);

  const checkoutHref = useMemo(() => {
    const params = new URLSearchParams();
    if (bookingRoomIds.length > 0) params.set("rooms", bookingRoomIds.join(","));
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("guests", String(guestCount));
    if (selectedExtraIds.length > 0) {
      params.set("extras", selectedExtraIds.join(","));
    }
    const qs = params.toString();
    return `/booking/${stay.id}/checkout${qs ? `?${qs}` : ""}`;
  }, [
    stay.id,
    bookingRoomIds,
    checkIn,
    checkOut,
    guestCount,
    selectedExtraIds,
  ]);

  const sameHostDiningListings = useMemo(() => {
    if (!isDining || !stay.hostId) return [];
    return catalogListings
      .filter((item) => item.id !== stay.id && item.hostId === stay.hostId)
      .filter((item) =>
        isDiningListing({
          parentCategory: item.parentCategory,
          type: item.type,
          category: item.category,
        })
      )
      .slice(0, 6);
  }, [catalogListings, isDining, stay.hostId, stay.id]);

  const similar = useMemo(
    () => {
      const base = catalogListings
        .filter((s) => s.id !== stay.id)
        .filter((s) =>
          isDirectory
            ? isDirectoryListing({
                parentCategory: s.parentCategory,
                type: s.type,
                category: s.category,
              })
            : !isDirectoryListing({
                parentCategory: s.parentCategory,
                type: s.type,
                category: s.category,
              })
        )
        .slice(0, 4);
      if (!reviewsReady) return base;
      return base.map((s) => applyGuestReviewRatings(s));
    },
    [stay.id, reviewsReady, catalogListings, isDirectory]
  );
  const priceCurrency =
    pricingSettings?.currency ?? extrasCurrency ?? countryPricing.currency;
  const money = (amount: number) =>
    formatStoredMoney(amount, {
      storedCurrency: priceCurrency,
      currency: priceCurrency,
      locale,
    });
  const discount = stay.originalPrice
    ? Math.round((1 - (displayPrice ?? stay.price) / stay.originalPrice) * 100)
    : 24;
  const roomCapacity = useMemo(
    () => bookingRooms.reduce((sum, r) => sum + (r.capacity || 0), 0),
    [bookingRooms]
  );

  /** Keep guest pickers inside host total + per-type maxes. */
  useEffect(() => {
    setInfants((i) => Math.min(Math.max(0, i), maxInfantsAllowed));
    setAdults((a) => Math.min(Math.max(0, a), partyLimits.adults, maxGuests));
    setChildren((c) => Math.min(Math.max(0, c), partyLimits.children, maxGuests));
  }, [maxGuests, maxInfantsAllowed, partyLimits.adults, partyLimits.children]);

  useEffect(() => {
    if (guestCount <= maxGuests) return;
    const overflow = guestCount - maxGuests;
    setChildren((c) => {
      const reduceChildren = Math.min(c, overflow);
      const remain = overflow - reduceChildren;
      if (remain > 0) {
        setAdults((a) => Math.max(0, a - remain));
      }
      return Math.max(0, c - reduceChildren);
    });
  }, [guestCount, maxGuests]);

  const guestsSummary = useMemo(() => {
    if (guestCount === 0 && infants === 0) return "Add guests";
    const parts: string[] = [];
    parts.push(`${guestCount} guest${guestCount === 1 ? "" : "s"}`);
    if (infants > 0) parts.push(`${infants} infant${infants === 1 ? "" : "s"}`);
    return parts.join(", ");
  }, [guestCount, infants]);

  function adjustGuests(kind: "adults" | "children" | "infants", delta: number) {
    if (kind === "adults") {
      setAdults((prev) => {
        const next = prev + delta;
        if (next < 0) return prev;
        if (next > partyLimits.adults) return prev;
        if (delta > 0 && (maxGuests <= 0 || prev + children >= maxGuests)) return prev;
        return next;
      });
      return;
    }
    if (kind === "children") {
      setChildren((prev) => {
        const next = prev + delta;
        if (next < 0) return prev;
        if (next > partyLimits.children) return prev;
        if (delta > 0 && (maxGuests <= 0 || adults + prev >= maxGuests)) return prev;
        return next;
      });
      return;
    }
    setInfants((prev) => Math.max(0, Math.min(maxInfantsAllowed, prev + delta)));
  }

  const photos: { src: string; tag?: string }[] =
    galleryPhotos && galleryPhotos.length > 0
      ? galleryPhotos
      : galleryImages?.length
        ? galleryImages.map((src) => ({ src }))
        : GALLERY.map((src) => ({ src }));

  const filteredDiningPhotos = useMemo(() => {
    if (!isDining) return photos;
    const filtered = filterDiningGalleryPhotos(photos, diningGalleryFilter);
    return filtered.length > 0 ? filtered : photos;
  }, [isDining, photos, diningGalleryFilter]);

  const galleryHero = [...(isDining ? filteredDiningPhotos : photos).slice(0, 5)];
  while (galleryHero.length < 5) {
    galleryHero.push(galleryHero[0] ?? { src: stay.img });
  }
  const videoTourUrl = venueDetailsProp?.videoTourUrl?.trim() ?? "";

  function openGallery(index = 0, startOnVideo = false) {
    setGalleryStartIndex(index);
    setGalleryStartVideo(startOnVideo);
    setGalleryOpen(true);
  }
  const aboutText = description?.trim();
  const displayAmenities = useMemo(() => {
    const fromProp = amenitiesProp ?? [];
    const fromStay = stay.amenities ?? [];
    const fromAdvanced = advancedFiltersProp ?? [];
    const merged = [...fromProp, ...fromStay, ...fromAdvanced];
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const item of merged) {
      const label = item.trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(label);
    }
    if (stay.instantBook !== false && !seen.has("instant booking")) {
      unique.push("Instant Booking");
    }
    return unique;
  }, [advancedFiltersProp, amenitiesProp, stay.amenities, stay.instantBook]);
  const amenityFilterGroups = useMemo(
    () =>
      buildListingFilterDisplayGroups(taxonomy, displayAmenities, {
        includeInstantBooking: false,
      }),
    [displayAmenities, taxonomy]
  );
  const displayPolicies =
    houseRules && houseRules.length > 0
      ? houseRules.map((r) => ({ title: r.title, desc: r.description }))
      : POLICIES;
  const verifiedSafetyItems = useMemo(
    () => (safetyChecklist ?? []).filter((item) => item.checked),
    [safetyChecklist]
  );
  const showFarmInfo =
    Boolean(farmType) ||
    (farmActivities && farmActivities.length > 0) ||
    Boolean(livestockCrops?.trim());

  const tabs = [
    { key: "overview", label: t("tabs.overview") },
    { key: "rooms", label: t("tabs.rooms") },
    { key: "amenities", label: t("tabs.amenities") },
    ...(listingExtras.length > 0 ? [{ key: "extras", label: "Extras" }] : []),
    { key: "location", label: t("tabs.location") },
    { key: "reviews", label: `${t("tabs.reviews")} (${ratedStay.reviews})` },
    ...(verifiedSafetyItems.length > 0 ? [{ key: "safety", label: "Safety" }] : []),
    { key: "policies", label: t("tabs.policies") },
  ];

  const stayName = stay.name;
  const stayLocation = stay.location;
  const highlights = propertyHighlights !== undefined ? propertyHighlights : PROPERTY_HIGHLIGHTS;

  const featureIcons =
    propertyFeatureIcons !== undefined
      ? propertyFeatureIcons.map(({ iconKey, label }) => ({
          icon: getListingFeatureIcon(iconKey),
          label,
        }))
      : [
          { icon: Mountain, label: "Mountain View" },
          { icon: Trees, label: "Private Pool" },
          { icon: Flame, label: "BBQ Area" },
          { icon: Home, label: "Outdoor Seating" },
        ];

  const titleChips = useMemo(() => {
    const chips: { icon: typeof Home; label: string }[] = [];
    const seen = new Set<string>();

    function push(icon: typeof Home, label: string) {
      const key = label.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      chips.push({ icon, label });
    }

    const typeLabel =
      stay.parentCategory?.trim() ||
      stay.category?.trim() ||
      (stay.type === "venue"
        ? "Venue"
        : stay.type === "homestay"
          ? "Homestay"
          : stay.type === "experience"
            ? "Experience"
            : "Farmstay");
    push(Home, typeLabel);

    const roomBeds = displayRooms.reduce((sum, r) => sum + (r.beds || 0), 0);
    const roomBaths = displayRooms.reduce((sum, r) => sum + (r.baths || 0), 0);
    const roomGuests = displayRooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const beds = roomBeds > 0 ? roomBeds : stay.beds;
    const baths = roomBaths > 0 ? roomBaths : stay.baths;
    const guests = roomGuests > 0 ? roomGuests : stay.guests;

    if (beds > 0) push(BedDouble, `${beds} Bedroom${beds === 1 ? "" : "s"}`);
    if (baths > 0) push(Bath, `${baths} Bathroom${baths === 1 ? "" : "s"}`);
    if (guests > 0) push(Users, `Up to ${guests} Guests`);

    const amenityChipLabels = new Set(
      [...LISTING_AMENITY_OPTIONS, ...DEFAULT_LISTING_FEATURE_ICON_ROWS.map((r) => r.label)].map(
        (label) => label.trim().toLowerCase()
      )
    );
    return chips.filter((chip) => !amenityChipLabels.has(chip.label.trim().toLowerCase()));
  }, [
    stay.parentCategory,
    stay.category,
    stay.type,
    stay.beds,
    stay.baths,
    stay.guests,
    displayRooms,
  ]);

  function scrollToSection(key: string) {
    setActiveTab(key);
    document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getSharePayload() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = stayName;
    const text = stayLocation ? `${stayName} · ${stayLocation}` : stayName;
    return { url, title, text };
  }

  async function copyShareLink() {
    const { url } = getSharePayload();
    try {
      await navigator.clipboard.writeText(url);
      setShareFlash(true);
      setTimeout(() => setShareFlash(false), 2000);
    } catch {
      // ignore
    }
  }

  function openShareWindow(href: string) {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=560");
  }

  async function shareVia(channel: "copy" | "whatsapp" | "facebook" | "x" | "email" | "native") {
    const { url, title, text } = getSharePayload();
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(`${text}\n${url}`);

    if (channel === "copy") {
      await copyShareLink();
      return;
    }
    if (channel === "whatsapp") {
      openShareWindow(`https://wa.me/?text=${encodedText}`);
      setShareOpen(false);
      return;
    }
    if (channel === "facebook") {
      openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
      setShareOpen(false);
      return;
    }
    if (channel === "x") {
      openShareWindow(
        `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(title)}`
      );
      setShareOpen(false);
      return;
    }
    if (channel === "email") {
      window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}`;
      setShareOpen(false);
      return;
    }
    if (channel === "native" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
      setShareOpen(false);
    }
  }

  useEffect(() => {
    if (!shareOpen) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const el = shareMenuRef.current;
      if (el && !el.contains(e.target as Node)) setShareOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShareOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [shareOpen]);

  return (
    <div className="listing-detail-page bg-gray-50 min-h-screen pb-24 lg:pb-0">
      {/* Photo grid — full viewport width under site header */}
      <div className="listing-detail-hero">
        {isDining ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {DINING_GALLERY_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setDiningGalleryFilter(filter.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  diningGalleryFilter === filter.id
                    ? "bg-green-800 text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="listing-detail-gallery">
          <div className="listing-detail-gallery-main">
            <button
              type="button"
              onClick={() => openGallery(0)}
              className="absolute inset-0 overflow-hidden group cursor-pointer border-0 bg-gray-100 p-0 text-left"
              aria-label={`View photos of ${stayName}`}
            >
              <Image
                src={galleryHero[0].src}
                alt={stayName}
                fill
                priority
                className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, 55vw"
                unoptimized={isDataImageUrl(galleryHero[0].src)}
              />
              {!isDining ? (
                <span className="pointer-events-none absolute top-3 start-3 bg-green-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full z-10">
                  {t("mostBooked")}
                </span>
              ) : null}
              {galleryHero[0].tag ? (
                <span className="pointer-events-none absolute top-3 end-3 z-10 inline-flex items-center gap-1 max-w-[70%] truncate bg-black/65 text-white text-[11px] font-medium px-2.5 py-1 rounded-md">
                  <Tag className="w-3 h-3 shrink-0" />
                  {photoTagLabel(galleryHero[0].tag)}
                </span>
              ) : null}
            </button>
            {videoTourUrl ? (
              <button
                type="button"
                onClick={() => openGallery(0, true)}
                className="absolute bottom-4 start-4 z-20 hidden sm:inline-flex items-center gap-2 bg-black/60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:bg-black/75"
              >
                <Play className="w-4 h-4" /> {t("watchVideo")}
              </button>
            ) : null}
          </div>

          <div className="listing-detail-gallery-side">
            {galleryHero.slice(1, 5).map((photo, i) => (
              <div key={`${photo.src}-${i}`} className="listing-detail-gallery-thumb">
                <button
                  type="button"
                  onClick={() => openGallery(i + 1)}
                  className="absolute inset-0 overflow-hidden group cursor-pointer border-0 bg-gray-100 p-0 text-left"
                  aria-label={`View photo ${i + 2} of ${stayName}`}
                >
                  <Image
                    src={photo.src}
                    alt={
                      photo.tag
                        ? `${stayName} — ${photoTagLabel(photo.tag)}`
                        : `${stayName} ${i + 2}`
                    }
                    fill
                    className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    unoptimized={isDataImageUrl(photo.src)}
                  />
                {photo.tag ? (
                  <span className="absolute top-2 start-2 z-10 inline-flex items-center gap-1 max-w-[85%] truncate bg-black/65 text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
                    <Tag className="w-2.5 h-2.5 shrink-0" />
                    {photoTagLabel(photo.tag)}
                  </span>
                ) : null}
                {i === 3 && (
                  <div className="absolute bottom-3 end-3 z-10">
                    <span className="inline-flex items-center gap-2 bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg shadow-md border border-gray-200">
                      <LayoutGrid className="w-4 h-4" />
                      Show all photos
                    </span>
                  </div>
                )}
                {i === 3 && photos.length > 5 && (
                  <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs text-gray-500">
          <Link href="/" className="hover:text-green-700 transition-colors">
            {t("breadcrumbHome")}
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link
            href={
              breadcrumbParent
                ? `/listings?parent=${encodeURIComponent(breadcrumbParent)}`
                : "/listings"
            }
            className="hover:text-green-700 transition-colors"
          >
            {breadcrumbParent || t("breadcrumbStays")}
          </Link>
          {breadcrumbCategory && (
            <>
              <ChevronRight className="w-3 h-3" />
              <Link
                href={`/listings?parent=${encodeURIComponent(breadcrumbParent)}&category=${encodeURIComponent(breadcrumbCategory)}`}
                className="hover:text-green-700 transition-colors"
              >
                {breadcrumbCategory}
              </Link>
            </>
          )}
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-400">{stayLocation.split(",")[0]}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-800 font-medium">{stayName}</span>
      </div>

      {isDirectory ? (
        <EventListingDetailContent
          variant={directoryVariant}
          stay={ratedStay}
          description={aboutText}
          highlights={highlights}
          amenities={displayAmenities}
          features={featureIcons}
          reviews={publishedReviews}
          reviewsReady={reviewsReady}
          rating={ratedStay.rating}
          reviewCount={ratedStay.reviews}
          spaces={eventSpaces}
          venueDetails={venueDetailsProp}
          diningDetails={diningDetailsProp}
          advancedFilterIds={advancedFiltersProp ?? []}
          sameHostListings={sameHostDiningListings}
          mapEmbedUrl={mapEmbedUrl}
          policies={displayPolicies}
          offers={hostOffers}
          money={money}
          featured={showFeatured}
          wishlist={wishlist}
          safetyChecklist={safetyChecklist}
          onToggleWishlist={toggleWishlist}
          onShare={() => void copyShareLink()}
        />
      ) : (
      <div className="pt-4 pb-10 sm:pt-5 sm:pb-12">
        <div className="listing-detail-grid">
          {/* Main column — 8 cols */}
          <div className="listing-detail-main">
            {/* Title badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {showFeatured && (
                <span className="flex items-center gap-1 bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
              )}
              <span className="bg-green-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                {t("topRated")}
              </span>
              <span className="flex items-center gap-1 text-gray-600 bg-gray-100 border border-gray-200 text-xs font-medium px-2.5 py-1 rounded-full">
                Managed by Greenfield Stays
              </span>
              <span className="flex items-center gap-1 text-white bg-blue-500 border border-blue-500 text-xs font-medium px-2.5 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> {tc("verified")}
              </span>
            </div>

            {/* Title row */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0 flex-1 overflow-hidden">
                <h1 className="flex items-center gap-2 min-w-0">
                  <span
                    className="block min-w-0 flex-1 truncate text-2xl md:text-3xl font-bold text-gray-900 font-display"
                    title={stayName}
                  >
                    {stayName}
                  </span>
                  <VerifiedBadge size="lg" />
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {ratedStay.reviews > 0 ? (
                      <>
                        <span className="font-semibold text-gray-800">{ratedStay.rating}</span>
                        <span className="text-gray-500">
                          ({ratedStay.reviews} {tc("reviews")})
                          {ratedStay.rating >= 4.5
                            ? " · Excellent"
                            : ratedStay.rating >= 3.5
                              ? " · Good"
                              : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">
                        {reviewsReady ? t("reviewsEmptyTitle") : tc("reviews")}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-gray-300">·</span>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <MapPin className="w-4 h-4 shrink-0 text-gray-400" />
                    <span className="truncate">{stayLocation}</span>
                    {stay.propertyReference && (
                      <>
                        <span className="shrink-0 text-gray-300">·</span>
                        <span
                          className="shrink-0 font-mono text-xs font-semibold tracking-wide text-gray-700"
                          title="Property reference"
                          aria-label={`Property reference ${stay.propertyReference}`}
                        >
                          {stay.propertyReference}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {titleChips.map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full"
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative" ref={shareMenuRef}>
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={shareOpen}
                    onClick={() => setShareOpen((open) => !open)}
                    className="flex items-center gap-1.5 border border-gray-300 hover:border-gray-400 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Share2 className="w-4 h-4" /> {shareFlash ? "Link copied" : tc("share")}
                  </button>
                  {shareOpen && (
                    <div
                      role="dialog"
                      aria-label="Share listing"
                      className="absolute end-0 top-full mt-2 z-30 w-64 rounded-xl border border-gray-200 bg-white shadow-lg p-2"
                    >
                      <p className="px-2 pt-1.5 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Share this stay
                      </p>
                      <button
                        type="button"
                        onClick={() => void shareVia("copy")}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <Link2 className="w-4 h-4" />
                        </span>
                        {shareFlash ? "Link copied" : "Copy link"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareVia("whatsapp")}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <WhatsAppBrandIcon className="w-8 h-8 shrink-0" />
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareVia("facebook")}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <FacebookBrandIcon className="w-8 h-8 shrink-0" />
                        Facebook
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareVia("x")}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <XBrandIcon className="w-8 h-8 shrink-0" />
                        X
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareVia("email")}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <EmailBrandIcon className="w-8 h-8 shrink-0" />
                        Email
                      </button>
                      {typeof navigator !== "undefined" &&
                        typeof navigator.share === "function" && (
                          <button
                            type="button"
                            onClick={() => void shareVia("native")}
                            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100 mt-1 pt-3"
                          >
                            <span className="w-8 h-8 rounded-full bg-green-50 text-green-700 flex items-center justify-center shrink-0">
                              <Share2 className="w-4 h-4" />
                            </span>
                            More…
                          </button>
                        )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={toggleWishlist}
                  disabled={authLoading}
                  className={`flex items-center gap-1.5 border text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60 ${
                    wishlist
                      ? "border-red-200 bg-red-50 text-red-700 hover:border-red-300"
                      : "border-gray-300 hover:border-gray-400 text-gray-600"
                  }`}
                  aria-pressed={wishlist}
                >
                  <Heart className={`w-4 h-4 ${wishlist ? "fill-red-500 text-red-500" : ""}`} />
                  {saveFlash ? ta("saved") : wishlist ? "Saved" : tc("save")}
                </button>
              </div>
            </div>

            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 bg-[#fbbf24] border border-[#fbbf24] text-gray-900 text-xs font-medium px-3 py-1.5 rounded-full">
                <Flame className="w-3.5 h-3.5" />
                {t("viewingNow", { count: 18 })}
              </span>
            </div>

            {/* Platform stats */}
            <div className="bg-white rounded-xl border mb-5 px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { val: "1,245+", label: t("platformStats.happyGuests") },
                { val: "4.9/5", label: t("platformStats.averageRating") },
                { val: "12,500+", label: t("platformStats.totalBookings") },
                { val: "10,000+", label: t("platformStats.verifiedReviews") },
              ].map(({ val, label }) => (
                <div key={label} className="text-center py-1">
                  <div className="text-green-700 font-bold text-base md:text-lg">{val}</div>
                  <div className="text-gray-500 text-[10px] md:text-xs">{label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="sticky top-[var(--site-chrome-height)] z-[90] bg-white rounded-xl border mb-5 shadow-sm">
              <div className="flex overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => scrollToSection(tab.key)}
                    className={`px-4 md:px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? "border-green-600 text-green-700"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Overview */}
            <section id="section-overview" className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5">
              <h2 className="font-bold text-gray-900 text-base mb-3 font-display">{t("aboutTitle")}</h2>
              <div
                className={`mb-4 ${
                  !readMore && (!aboutText || aboutText.length > 280)
                    ? "max-h-24 overflow-hidden"
                    : ""
                }`}
              >
                {aboutText ? (
                  <RichTextView value={aboutText} />
                ) : (
                  <p className="text-gray-600 text-sm leading-relaxed text-start">
                    Welcome to <strong>{stayName}</strong>, a sprawling retreat nestled in the lush
                    landscapes of {stayLocation}. Surrounded by nature, this property offers an
                    authentic farm living experience unlike any other. Whether you&apos;re looking for a
                    romantic escape, a family adventure, or a corporate offsite in nature, this farm
                    delivers comfort, privacy, and unforgettable memories.
                  </p>
                )}
              </div>
              {!readMore && (!aboutText || aboutText.length > 280) && (
                <button
                  type="button"
                  onClick={() => setReadMore(true)}
                  className="text-green-700 text-sm font-semibold mb-4 hover:underline"
                >
                  {tc("readMore")}
                </button>
              )}
              {isExperience && (meetingPoint || requirements || (itinerary && itinerary.length > 0) || licenseNumber) ? (
                <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
                  {meetingPoint ? (
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">Meeting point</h3>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{meetingPoint}</p>
                    </div>
                  ) : null}
                  {itinerary && itinerary.length > 0 ? (
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-2">Itinerary</h3>
                      <ol className="space-y-2">
                        {itinerary.map((step) => (
                          <li key={`${step.step}-${step.title}`} className="flex gap-3 text-sm">
                            <span className="font-bold text-green-700 shrink-0">{step.step}.</span>
                            <div>
                              <p className="font-medium text-gray-900">{step.title}</p>
                              {step.description ? (
                                <p className="text-gray-500 text-xs mt-0.5">{step.description}</p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  {requirements ? (
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1">Requirements</h3>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{requirements}</p>
                    </div>
                  ) : null}
                  {licenseNumber ? (
                    <p className="text-xs text-gray-500">
                      License / certification:{" "}
                      <span className="font-semibold text-gray-700">{licenseNumber}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
              {featureIcons.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-gray-100">
                  {featureIcons.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex flex-col items-center text-center gap-2">
                      <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center border border-green-100">
                        <Icon className="w-6 h-6 text-green-700" />
                      </div>
                      <span className="text-xs text-gray-600 font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {showFarmInfo && (
              <section
                id="section-farm"
                className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5"
              >
                <h2 className="font-bold text-gray-900 text-base mb-4 font-display">
                  About the farm
                </h2>
                <div className="space-y-4">
                  {farmType && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Farm type
                      </h3>
                      <p className="text-sm text-gray-800">{farmType}</p>
                    </div>
                  )}
                  {farmActivities && farmActivities.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        Activities offered
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {farmActivities.map((activity) => (
                          <span
                            key={activity}
                            className="text-xs font-medium bg-green-50 text-green-800 border border-green-100 px-2.5 py-1 rounded-full"
                          >
                            {activity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {livestockCrops?.trim() && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                        Livestock & crops
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{livestockCrops}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Rooms */}
            <section id="section-rooms" className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-gray-900 text-base font-display">{t("roomsTitle")}</h2>
                  {hasRoomTypes && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Add one or more rooms to the booking calculator
                    </p>
                  )}
                </div>
                {hasRoomTypes && bookingRoomIds.length > 0 && (
                  <p className="text-xs text-green-700 font-medium shrink-0 text-end">
                    {bookingRoomIds.length} selected · sleeps {roomCapacity}
                  </p>
                )}
              </div>
              {displayRooms.length === 0 ? (
                <p className="text-sm text-gray-500">No rooms listed for this property yet.</p>
              ) : (
              <div className="flex flex-col gap-4">
                {displayRooms.map((room, i) => {
                  const roomId = String((room as { id?: string }).id ?? "");
                  const isBookable = hasRoomTypes && Boolean(roomId);
                  const isSelected = isBookable && bookingRoomIds.includes(roomId);
                  const nightly = roomNightly(room);
                  const roomImg = room.img || stay.img || LISTING_PLACEHOLDER_IMG;
                  return (
                  <div
                    key={roomId || i}
                    className={`flex gap-4 border rounded-xl p-4 transition-all ${
                      isBookable ? "cursor-pointer" : ""
                    } ${
                      isSelected
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-green-300"
                    }`}
                    onClick={() => {
                      if (isBookable) toggleBookingRoom(roomId);
                    }}
                    role={isBookable ? "button" : undefined}
                    tabIndex={isBookable ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (!isBookable) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleBookingRoom(roomId);
                      }
                    }}
                  >
                    <div className="w-32 h-24 rounded-lg overflow-hidden shrink-0 relative">
                      <Image
                        src={roomImg}
                        alt={room.name}
                        fill
                        className="object-cover"
                        sizes="128px"
                        unoptimized={isDataImageUrl(roomImg)}
                      />
                      {isSelected && (
                        <span className="absolute top-2 start-2 bg-green-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-800 text-sm">
                            {room.name}
                          </h3>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {room.desc}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <BedDouble className="w-3 h-3" /> {room.beds} beds
                            </span>
                            <span className="flex items-center gap-1">
                              <Bath className="w-3 h-3" /> {room.baths} baths
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> Up to {room.capacity} guests
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {[Wifi, Wind, Tv].map((Icon, idx) => (
                              <Icon key={idx} className="w-3.5 h-3.5 text-gray-400" />
                            ))}
                          </div>
                        </div>
                        <div className="text-end shrink-0">
                          <div className="text-green-700 font-bold text-lg">
                            {money(nightly)}
                          </div>
                          <div className="text-gray-400 text-xs">{tc("perNight")}</div>
                          {previewMode ? (
                            <span className="mt-2 inline-block text-xs bg-gray-200 text-gray-500 px-4 py-1.5 rounded-lg font-medium cursor-not-allowed">
                              {t("select")}
                            </span>
                          ) : isBookable ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookingRoom(roomId);
                              }}
                              className={`mt-2 inline-block text-xs px-4 py-1.5 rounded-lg font-medium transition-colors ${
                                isSelected
                                  ? "bg-white border border-green-600 text-green-800 hover:bg-green-50"
                                  : "bg-green-700 hover:bg-green-800 text-white"
                              }`}
                            >
                              {isSelected ? "Added" : "Add"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              )}
              {displayRooms.length > 0 && (
              <button
                type="button"
                className="mt-4 w-full border border-gray-300 hover:border-green-500 text-gray-600 hover:text-green-700 text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                {t("viewAllRooms")}
              </button>
              )}
            </section>

            {showLiveActivityMarquee && (
              <div className="bg-[#fbbf24] rounded-xl px-5 py-3 flex items-center gap-3 mb-5" dir="ltr">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-2 h-2 bg-gray-900 rounded-full animate-pulse" />
                  <span className="text-gray-900 text-sm font-semibold">Live</span>
                </div>
                <div className="listing-live-marquee-wrapper" aria-label="Recent bookings">
                  <div className="listing-live-marquee-track">
                    {[...BOOKING_ACTIVITY, ...BOOKING_ACTIVITY].map((item, index) => (
                      <span key={`${item.name}-${index}`} className="listing-live-marquee-item text-gray-800 text-sm">
                        <strong className="text-gray-900">{item.name}</strong> booked this property{" "}
                        <span className="text-gray-800">— {item.time}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Amenities */}
            <section id="section-amenities" className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5">
              <h2 className="font-bold text-gray-900 text-base mb-4 font-display">{t("tabs.amenities")}</h2>
              {amenityFilterGroups.length === 0 ? (
                <p className="text-sm text-gray-400">No amenities listed for this property yet.</p>
              ) : (
                <div className="space-y-6">
                  {amenityFilterGroups.map((group) => (
                    <VenueFilterGroupBlock key={group.id} group={group} />
                  ))}
                </div>
              )}
            </section>

            {/* Property Highlights */}
            <section id="section-highlights" className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5">
              <h2 className="font-bold text-gray-900 text-base mb-4 font-display">
                {t("propertyHighlights")}
              </h2>
              {highlights.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {h}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No highlights added for this listing yet.</p>
              )}
            </section>

            {/* Extras */}
            {listingExtras.length > 0 && (
              <section id="section-extras" className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h2 className="font-bold text-gray-900 text-base font-display">Extras</h2>
                  {selectedExtraIds.length > 0 && (
                    <p className="text-xs text-green-700 font-medium shrink-0">
                      {selectedExtraIds.length} added to calculator
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Optional fees set by the host — add them to your booking
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {listingExtras.map((extra) => {
                    const added = selectedExtraIds.includes(extra.id);
                    const billing = EXTRA_CHARGE_BILLING_LABELS[normalizeExtraChargeBilling(extra)];
                    return (
                      <div
                        key={extra.id}
                        className={`border rounded-xl p-4 transition-colors cursor-pointer ${
                          added
                            ? "border-green-500 bg-green-50/40"
                            : "border-gray-200 hover:border-green-300"
                        }`}
                        onClick={() => toggleExtra(extra.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleExtra(extra.id);
                          }
                        }}
                      >
                        <h3 className="font-semibold text-gray-800 text-sm">{extra.label}</h3>
                        <p className="text-gray-500 text-xs mt-1">{billing}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-green-700 font-bold text-sm">
                            {money(extra.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExtra(extra.id);
                            }}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                              added
                                ? "bg-white border border-green-600 text-green-800"
                                : "bg-green-700 hover:bg-green-800 text-white"
                            }`}
                          >
                            {added ? "Remove" : "Add to booking"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {!isExperience && (
              <section
                id="section-availability"
                className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="font-bold text-gray-900 text-base font-display">
                    {t("availabilityCalendar")}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Previous months"
                      onClick={() =>
                        setDisplayCalendarStart((m) => {
                          const d = new Date(m.year, m.month - 1, 1);
                          return { year: d.getFullYear(), month: d.getMonth() };
                        })
                      }
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next months"
                      onClick={() =>
                        setDisplayCalendarStart((m) => {
                          const d = new Date(m.year, m.month + 1, 1);
                          return { year: d.getFullYear(), month: d.getMonth() };
                        })
                      }
                      className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {displayCalendarMonths.map((month) => (
                    <div key={`${month.year}-${month.month}`}>
                      <h3 className="text-sm font-semibold text-gray-900 text-center mb-2">
                        {month.title}
                      </h3>
                      <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {CALENDAR_WEEKDAYS.map((label) => (
                          <div
                            key={`${month.year}-${month.month}-${label}`}
                            className="text-[10px] font-semibold text-gray-400 text-center py-1"
                          >
                            {label}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">
                        {month.cells.map((cell, idx) => {
                          if (!cell) {
                            return <div key={`empty-${month.year}-${month.month}-${idx}`} className="h-8" />;
                          }
                          const { className, title } = displayDayAppearance(cell.iso, {
                            calendarMinIso,
                            occupiedDateSet,
                            availability,
                            checkIn,
                            checkOut,
                          });
                          return (
                            <div
                              key={cell.iso}
                              title={title}
                              className={`h-8 rounded-md text-xs tabular-nums flex items-center justify-center border ${className}`}
                            >
                              {cell.day}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-red-100 border border-red-300" />
                    Blocked
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-100 border border-amber-300" />
                    Seasonal
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-blue-100 border border-blue-300" />
                    Booked
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-slate-100 border border-slate-300" />
                    Channel
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-green-50 border border-green-200" />
                    Open
                  </span>
                </div>
              </section>
            )}

            {/* Location — approximate area only; exact address sent after booking */}
            <section id="section-location" className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5">
              <h2 className="font-bold text-gray-900 text-base mb-4 font-display">{t("tabs.location")}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <MapPin className="w-4 h-4 text-green-600" />
                {stayLocation.split(",")[0]?.trim() || stayLocation}
              </div>
              <ListingLocationPreview
                areaLabel={stayLocation.split(",")[0]?.trim() || stayLocation}
                mapSearchQuery={stayLocation}
                mapEmbedUrl={mapEmbedUrl}
                className="h-56 w-full"
              />
              {nearbyPlaces.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500">
                  {nearbyPlaces.map((place) => (
                    <div key={`${place.label}-${place.duration}`} className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                      <span>
                        <strong className="text-gray-700">{place.label}</strong> — {place.duration}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <ListingReviewsSection
              reviews={publishedReviews}
              ready={reviewsReady}
              average={ratedStay.rating}
              count={ratedStay.reviews}
            />

            {/* Safety & Compliance */}
            {verifiedSafetyItems.length > 0 && (
              <section id="section-safety" className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-700" />
                    <h2 className="font-bold text-gray-900 text-base font-display">
                      Property Safety & Compliance
                    </h2>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                    Host verified
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  The host has confirmed that the following safety equipment and compliance measures are verified and active on-site:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {verifiedSafetyItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">
                          {item.label || item.question}
                        </h3>
                        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                          {item.description || item.reminder}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Policies */}
            <section id="section-policies" className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5">
              <h2 className="font-bold text-gray-900 text-base mb-4 font-display">{t("tabs.policies")}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayPolicies.map((policy) => (
                  <div key={policy.title} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">{policy.title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{policy.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar — 4 cols */}
          <div className="listing-detail-sidebar">
            <div className="listing-detail-sidebar-inner">
              {isExperience ? (
                <ExperienceBookingCard
                  listingId={stay.id}
                  maxGuests={stay.guests}
                  currency={priceCurrency}
                  groupSizeMin={groupSizeMin}
                />
              ) : (
              <div id="booking-calculator" className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5 scroll-mt-24">
                {flashDeal && flashCountdown && (
                <div className="bg-amber-50 border border-amber-200/70 rounded-lg px-3 py-2 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-800 text-xs font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {t("limitedOffer")} −{flashDeal.discountPct}%
                    </span>
                  </div>
                  <CountdownTimer
                    key={flashDeal.endsAt}
                    d={flashCountdown.d}
                    h={flashCountdown.h}
                    m={flashCountdown.m}
                  />
                </div>
                )}

                <div className="flex items-baseline gap-2 mb-3 flex-wrap">
                  <span className="text-3xl font-bold text-gray-900">
                    {money(publishedRates.nightly || displayPrice)}
                  </span>
                  <span className="text-gray-400 text-sm">{tc("perNight")}</span>
                </div>
                {bookingRooms.length > 0 ? (
                  <p className="text-xs text-gray-500 mb-3">
                    {bookingRooms.length === 1
                      ? `Rate for ${bookingRooms[0].name}`
                      : `${bookingRooms.length} rooms selected · combined nightly rate`}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mb-3">Property base rate</p>
                )}
                {stay.originalPrice && bookingRooms.length === 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gray-400 text-sm line-through">
                      {money(stay.originalPrice)}
                    </span>
                    <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {discount}% OFF
                    </span>
                  </div>
                )}

                <div
                  ref={datePickerRef}
                  className="border border-gray-200 rounded-2xl overflow-visible mb-3 relative bg-white shadow-sm"
                >
                  <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">Your stay</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pick dates and guests to see your total
                    </p>
                  </div>

                  <div className="relative p-4 pb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openDatePicker("checkIn")}
                        className={`rounded-xl border p-3 text-start transition-colors ${
                          datePickerOpen === "checkIn"
                            ? "border-green-500 bg-green-50 ring-1 ring-green-500/30"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1">
                          {t("checkIn")}
                        </div>
                        <div
                          className={`text-sm font-semibold truncate ${
                            checkIn ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {formatDateLabel(checkIn)}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => openDatePicker("checkOut")}
                        className={`rounded-xl border p-3 text-start transition-colors ${
                          datePickerOpen === "checkOut"
                            ? "border-green-500 bg-green-50 ring-1 ring-green-500/30"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1">
                          {t("checkOut")}
                        </div>
                        <div
                          className={`text-sm font-semibold truncate ${
                            checkOut ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {formatDateLabel(checkOut)}
                        </div>
                      </button>
                    </div>

                    {datePickerOpen && (
                      <div className="absolute start-0 end-0 top-full z-40 mt-2 bg-white rounded-2xl border border-gray-200 shadow-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            type="button"
                            aria-label="Previous month"
                            onClick={() =>
                              setCalendarMonth((m) => {
                                const d = new Date(m.year, m.month - 1, 1);
                                return { year: d.getFullYear(), month: d.getMonth() };
                              })
                            }
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <div className="text-sm font-semibold text-gray-900">{calendarTitle}</div>
                          <button
                            type="button"
                            aria-label="Next month"
                            onClick={() =>
                              setCalendarMonth((m) => {
                                const d = new Date(m.year, m.month + 1, 1);
                                return { year: d.getFullYear(), month: d.getMonth() };
                              })
                            }
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5 mb-1">
                          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                            <div
                              key={d}
                              className="text-[10px] font-semibold text-gray-400 text-center py-1"
                            >
                              {d}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                          {calendarCells.map((cell, idx) => {
                            if (!cell) {
                              return <div key={`empty-${idx}`} className="h-9" />;
                            }
                            const past = cell.iso < calendarMinIso;
                            const booked = occupiedDateSet.has(cell.iso);
                            const blocked =
                              Boolean(availability) &&
                              availability!.blockedDates.includes(cell.iso);
                            const seasonClosed =
                              Boolean(availability) &&
                              isSeasonallyClosed(cell.iso, availability!.seasonalPeriods);
                            const channel =
                              Boolean(availability) &&
                              (availability!.icalImportedDates ?? []).includes(cell.iso) &&
                              !booked;
                            const unavailable =
                              Boolean(availability) &&
                              isDateUnavailable(cell.iso, availability!);
                            const disabled = past || unavailable;
                            const isCheckInDay = Boolean(checkIn) && cell.iso === checkIn;
                            const isCheckOutDay = Boolean(checkOut) && cell.iso === checkOut;
                            const selected = isCheckInDay || isCheckOutDay;
                            const inRange =
                              Boolean(checkIn) &&
                              Boolean(checkOut) &&
                              cell.iso > checkIn &&
                              cell.iso < checkOut;
                            const statusTitle = past
                              ? "Past date"
                              : blocked
                                ? "Blocked"
                                : seasonClosed
                                  ? "Seasonal closure"
                                  : booked
                                    ? "Booked"
                                    : channel
                                      ? "Unavailable (channel calendar)"
                                      : selected
                                        ? "Selected"
                                        : "Available";
                            return (
                              <button
                                key={cell.iso}
                                type="button"
                                disabled={disabled}
                                title={statusTitle}
                                onClick={() => selectCalendarDate(cell.iso)}
                                className={`h-9 rounded-lg text-sm tabular-nums transition-colors border ${
                                  disabled
                                    ? past && !unavailable
                                      ? "border-transparent text-gray-300 cursor-not-allowed"
                                      : blocked
                                        ? "bg-red-100 border-red-300 text-red-900 cursor-not-allowed"
                                        : seasonClosed
                                          ? "bg-amber-100 border-amber-300 text-amber-900 cursor-not-allowed"
                                          : booked
                                            ? "bg-blue-100 border-blue-300 text-blue-900 cursor-not-allowed"
                                            : channel
                                              ? "bg-slate-100 border-slate-300 text-slate-800 cursor-not-allowed"
                                              : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                    : selected
                                      ? "bg-green-600 border-green-600 text-white font-semibold"
                                      : inRange
                                        ? "bg-green-50 border-green-200 text-green-800 font-medium"
                                        : "bg-green-50 border-green-200 text-gray-800 hover:bg-green-100 hover:border-green-400 font-medium"
                                }`}
                              >
                                {cell.day}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-sm bg-red-100 border border-red-300" />
                            Blocked
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-sm bg-amber-100 border border-amber-300" />
                            Seasonal
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-sm bg-blue-100 border border-blue-300" />
                            Booked
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-sm bg-slate-100 border border-slate-300" />
                            Channel
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-sm bg-green-50 border border-green-200" />
                            Open
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-gray-500 text-center">
                          {datePickerOpen === "checkIn"
                            ? "1. Select check-in date"
                            : minStayNights > 1
                              ? `2. Select check-out (minimum ${minStayNights} nights)`
                              : "2. Select check-out date"}
                        </p>
                      </div>
                    )}

                  </div>

                  <div className="px-4 pb-3 relative">
                    <button
                      type="button"
                      onClick={() => {
                        setDatePickerOpen(null);
                        setGuestsOpen((v) => !v);
                      }}
                      className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-start transition-colors ${
                        guestsOpen
                          ? "border-green-500 bg-green-50 ring-1 ring-green-500/30"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                      aria-expanded={guestsOpen}
                    >
                      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        {t("guestsLabel")}
                      </span>
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {guestsSummary}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                            guestsOpen ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    </button>

                    {guestsOpen && (
                      <div className="absolute start-0 end-0 top-full z-30 mt-2 bg-white rounded-2xl border border-gray-200 shadow-xl p-4 space-y-4">
                        {(
                          [
                            {
                              key: "adults" as const,
                              label: "Adults",
                              hint: "Age 13+",
                              value: adults,
                              canMinus: adults > 0,
                              canPlus:
                                adults < partyLimits.adults && guestCount < maxGuests,
                            },
                            {
                              key: "children" as const,
                              label: "Children",
                              hint: "Ages 2–12",
                              value: children,
                              canMinus: children > 0,
                              canPlus:
                                children < partyLimits.children && guestCount < maxGuests,
                            },
                            {
                              key: "infants" as const,
                              label: "Infants",
                              hint: "Under 2",
                              value: infants,
                              canMinus: infants > 0,
                              canPlus: infants < maxInfantsAllowed,
                            },
                          ] as const
                        ).map((row) => (
                          <div
                            key={row.key}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{row.label}</p>
                              {row.hint ? (
                                <p className="text-xs text-gray-500">{row.hint}</p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                type="button"
                                disabled={!row.canMinus}
                                onClick={() => adjustGuests(row.key, -1)}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-500"
                                aria-label={`Fewer ${row.label}`}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-4 text-center text-sm font-semibold text-gray-900 tabular-nums">
                                {row.value}
                              </span>
                              <button
                                type="button"
                                disabled={!row.canPlus}
                                onClick={() => adjustGuests(row.key, 1)}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:border-gray-500"
                                aria-label={`More ${row.label}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-gray-500 leading-relaxed pt-1 border-t border-gray-100">
                          {hasRoomTypes ? (
                            bookingRooms.length === 0 ? (
                              <>
                                Up to {maxGuests} paying guests (adults + children). Add a room
                                to update capacity and rate. Infants don&apos;t count toward the
                                total.
                              </>
                            ) : (
                              <>
                                Up to {maxGuests} paying guest{maxGuests === 1 ? "" : "s"} across
                                selected rooms (adults + children). Mix freely within that total
                                — max {partyLimits.adults} adults, {partyLimits.children}{" "}
                                children, {maxInfantsAllowed} infants.
                                {guestCount >= maxGuests
                                  ? " Add another room to bring more guests."
                                  : ""}
                              </>
                            )
                          ) : (
                            <>
                              Up to {maxGuests} paying guests (adults + children). Mix freely —
                              max {partyLimits.adults} adults, {partyLimits.children} children,{" "}
                              {maxInfantsAllowed} infants.
                            </>
                          )}
                        </p>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setGuestsOpen(false)}
                            className="text-sm font-bold text-gray-900 underline underline-offset-2"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                    {guestBookingHint && (
                      <p className="mt-2 rounded-lg px-3 py-2 text-xs text-amber-800 bg-amber-50">
                        {guestBookingHint}
                      </p>
                    )}
                  </div>

                  {checkIn && (
                    <div className="mx-4 mb-3 rounded-lg bg-gray-50 px-3 py-2 text-center text-xs font-medium text-gray-600">
                      {selectedNights > 0
                        ? `${selectedNights} night${selectedNights === 1 ? "" : "s"}`
                        : "Pick a check-out date"}
                    </div>
                  )}

                  {dateBookingHint && (
                    <p className="mx-4 mb-3 rounded-lg px-3 py-2 text-xs text-amber-800 bg-amber-50">
                      {dateBookingHint}
                    </p>
                  )}

                  {stayQuote && stayQuote.lines.length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 rounded-b-2xl space-y-3">
                      <ul className="space-y-2">
                        {stayQuote.lines.map((line, index) => {
                          const isAccommodation =
                            index === 0 && line.amount > 0 && selectedNights > 0;
                          const label = isAccommodation
                            ? `${selectedNights} night${selectedNights === 1 ? "" : "s"} × ${money(Math.round(stayQuote.nightlyAverage))}/night`
                            : line.label;
                          return (
                            <li
                              key={line.label}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <span className="text-gray-600 leading-snug">{label}</span>
                              <span
                                className={`font-semibold tabular-nums shrink-0 ${
                                  line.amount < 0 ? "text-green-700" : "text-gray-800"
                                }`}
                              >
                                {line.amount < 0 ? "−" : ""}
                                {money(Math.abs(line.amount))}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="pt-3 border-t border-gray-200 space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-gray-900">Total</span>
                          <span className="text-xl font-bold text-gray-900 tabular-nums">
                            {money(stayQuote.total)}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">All prices inclusive</p>
                      </div>
                    </div>
                  )}
                </div>

                {ratedStay.reviews > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-green-50 border border-green-100 rounded-lg p-2.5 text-center">
                      <div className="text-lg font-bold text-gray-900">{ratedStay.rating}</div>
                      <div className="text-[10px] text-gray-500 font-medium">
                        {ratedStay.rating >= 4.5 ? "Excellent" : ratedStay.rating >= 3.5 ? "Good" : "Rating"}
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5 text-center">
                      <div className="text-lg font-bold text-gray-900">{ratedStay.reviews}</div>
                      <div className="text-[10px] text-gray-500 font-medium">Reviews</div>
                    </div>
                  </div>
                )}

                {bookingRooms.length > 0 && (
                  <div className="border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
                        Rooms
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {bookingRooms.length} selected
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {bookingRooms.map((room) => {
                        const nightly = roomNightly(room);
                        return (
                          <li
                            key={room.id || room.name}
                            className="flex items-center gap-2.5 rounded-lg px-1 py-1"
                          >
                            <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">
                              {room.name}
                              <span className="block text-[10px] font-normal text-gray-400">
                                Up to {room.capacity} guests
                              </span>
                            </span>
                            <span className="text-xs font-semibold text-gray-700 tabular-nums shrink-0">
                              {money(nightly)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleBookingRoom(room.id)}
                              className="text-[10px] font-semibold text-gray-400 hover:text-red-600 shrink-0"
                              aria-label={`Remove ${room.name}`}
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-xs">
                      <span className="text-gray-500">
                        {bookingRooms.length} room{bookingRooms.length === 1 ? "" : "s"} ·
                        sleeps {roomCapacity}
                      </span>
                      <span className="font-bold text-gray-900 tabular-nums">
                        {money(displayPrice ?? 0)} / night
                      </span>
                    </div>
                  </div>
                )}

                {selectedExtras.length > 0 && (
                  <div className="border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
                        Extras
                      </div>
                      <span className="text-[10px] text-gray-400">Optional fees</span>
                    </div>
                    <ul className="space-y-1.5">
                      {selectedExtras.map((extra) => {
                        const billing = normalizeExtraChargeBilling(extra);
                        const billingLabel = EXTRA_CHARGE_BILLING_LABELS[billing];
                        const nights =
                          checkIn && checkOut
                            ? Math.max(
                                1,
                                Math.round(
                                  (new Date(checkOut).getTime() -
                                    new Date(checkIn).getTime()) /
                                    (1000 * 60 * 60 * 24)
                                ) || 1
                              )
                            : 1;
                        const paying = Math.max(1, guestCount);
                        let preview = extra.amount;
                        if (billing === "per_person") preview = extra.amount * paying;
                        else if (billing === "per_person_per_night") {
                          preview = extra.amount * paying * nights;
                        } else if (billing === "per_night" || billing === "per_day") {
                          preview = extra.amount * nights;
                        }
                        return (
                          <li
                            key={extra.id}
                            className="flex items-start gap-2.5 rounded-lg px-1 py-1"
                          >
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium text-gray-800 truncate">
                                {extra.label}
                              </span>
                              <span className="block text-[10px] text-gray-500">
                                {billingLabel}
                                {billing === "per_person_per_night" || billing === "per_person"
                                  ? ` · ${paying} guest${paying === 1 ? "" : "s"}`
                                  : ""}
                              </span>
                            </span>
                            <span className="text-xs font-semibold text-gray-700 tabular-nums shrink-0 text-end">
                              {money(preview)}
                              {preview !== extra.amount && (
                                <span className="block text-[10px] font-normal text-gray-400">
                                  base {money(extra.amount)}
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleExtra(extra.id)}
                              className="text-[10px] font-semibold text-gray-400 hover:text-red-600 shrink-0 mt-0.5"
                              aria-label={`Remove ${extra.label}`}
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-xs">
                      <span className="text-gray-500">
                        {selectedExtras.length} extra
                        {selectedExtras.length === 1 ? "" : "s"}
                      </span>
                      <span className="font-bold text-emerald-900 tabular-nums">
                        {money(stayQuote?.extrasTotal ?? extrasTotal)}
                      </span>
                    </div>
                  </div>
                )}

                {previewMode ? (
                  <span className="w-full block font-bold py-3.5 rounded-xl transition-colors text-center text-sm mb-3 bg-gray-200 text-gray-500 cursor-not-allowed">
                    Preview only
                  </span>
                ) : (
                  <>
                    <CheckAvailabilityLink
                      href={checkoutHref}
                      className={`w-full block font-bold py-3.5 rounded-xl transition-colors text-center text-sm mb-2 ${
                        bookingRuleHint
                          ? "bg-gray-200 text-gray-500 pointer-events-none"
                          : "bg-green-700 hover:bg-green-800 text-white"
                      }`}
                    >
                      {tc("checkAvailability")}
                    </CheckAvailabilityLink>
                    <button
                      type="button"
                      disabled={!checkIn || !checkOut || Boolean(bookingRuleHint)}
                      onClick={() => {
                        if (!checkIn || !checkOut || bookingRuleHint) return;
                        addToBookingCart({
                          listingId: stay.id,
                          title: stay.name,
                          location: stay.location,
                          img: stay.img,
                          pricePerNight: displayPrice ?? stay.price,
                          maxGuests: stay.guests,
                          instantBook: stay.instantBook,
                          checkIn,
                          checkOut,
                          guests: guestCount,
                          rooms: bookingRoomIds,
                          experienceIds: [],
                          extraIds: selectedExtraIds,
                          currency: priceCurrency,
                        });
                        setCartAdded(true);
                        window.setTimeout(() => setCartAdded(false), 2500);
                      }}
                      className="w-full font-semibold py-3 rounded-xl transition-colors text-center text-sm mb-3 border border-green-700 text-green-800 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cartAdded ? "Added to cart ✓" : "Add to cart"}
                    </button>
                    {cartAdded && (
                      <p className="text-center text-xs text-green-700 mb-3">
                        <Link href="/cart" className="font-semibold underline">
                          View cart
                        </Link>
                        {" · keep searching to add more"}
                      </p>
                    )}
                  </>
                )}

                <div className="flex flex-col gap-1.5 text-xs text-gray-600 mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    {t("freeCancellation", { date: "7 Aug 2026" })}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    {t("instantConfirmation")}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    {t("noFees")}
                  </div>
                </div>

                <p className="text-[11px] text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                  Last booking was 12 minutes ago from Bengaluru, India
                </p>
              </div>
              )}

              {!isExperience && !isEvent && hostOffers.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-orange-500" /> {t("specialOffers")}
                </h3>
                <div className="flex flex-col gap-2">
                  {hostOffers.map((offer) => (
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
                <p className="text-[10px] text-amber-800/70 mt-3 leading-relaxed">
                  Applied automatically at checkout when your dates qualify. No promo code needed.
                </p>
              </div>
              )}

              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-orange-700 font-semibold text-sm mb-1">
                  <Flame className="w-4 h-4" /> {t("highDemand")}
                </div>
                <p className="text-orange-600 text-xs">{t("bookedThisWeek", { count: 24 })}</p>
              </div>

              <div className="bg-white rounded-2xl border p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-green-600" /> {t("needHelp")}
                </h3>
                <a
                  href={supportTelHref}
                  className="text-xs text-gray-500 mb-3 block hover:text-green-700 hover:underline"
                >
                  {supportPhone}
                </a>
                <div className="flex gap-2">
                  {supportWhatsAppHref ? (
                    <a
                      href={supportWhatsAppHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  ) : null}
                  <a
                    href={supportTelHref}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 text-gray-600 text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-2xl border p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-8 h-8 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm mb-3">{t("bookWithConfidence")}</h3>
                    <div className="flex flex-col gap-2">
                      {[
                        "Verified properties",
                        "Best price guarantee",
                        "Free cancellation",
                        "24/7 guest support",
                      ].map((text) => (
                        <div key={text} className="flex items-center gap-2 text-xs text-gray-600">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          {text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-green-600" /> Why book with Greenfield Farm Stays?
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Users, label: "Happy Guests", val: "12,500+" },
                    { icon: Tag, label: "Best Price Guarantee", val: "Always" },
                    { icon: Calendar, label: "Free Cancellation", val: "Flexible" },
                    { icon: Lock, label: "Secure Booking", val: "100%" },
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                      <Icon className="w-5 h-5 text-green-600 mx-auto mb-1.5" />
                      <div className="text-[10px] font-bold text-gray-800">{val}</div>
                      <div className="text-[9px] text-gray-500 leading-tight mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Similar properties — above footer */}
      <section className="mt-8 border-t border-gray-200 py-10">
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-display">
                {isDining
                  ? "Similar dining venues"
                  : isEvent
                    ? "Similar event venues"
                    : t("similarTitle")}
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">
                {isDining
                  ? "Explore more restaurants and dining experiences nearby"
                  : isEvent
                    ? "Explore more venues for your next event"
                    : t("similarSubtitle")}
              </p>
            </div>
            <Link href="/listings" className="text-green-700 text-sm font-semibold flex items-center gap-1">
              {tc("viewAll")} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {similar.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group border"
              >
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={s.img}
                    alt={s.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="25vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1">
                    {s.name}
                  </h3>
                  <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
                    <MapPin className="w-3 h-3" />
                    {s.location}
                  </div>
                  <div className="flex items-center justify-between">
                    {!isEvent && (
                    <div>
                      <span className="text-green-700 font-bold">{money(s.price)}</span>
                      <span className="text-gray-400 text-xs"> {tc("perNight")}</span>
                    </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold text-gray-700">{s.rating}</span>
                    </div>
                  </div>
                  <Link
                    href={`/listing/${s.id}`}
                    className="mt-3 block w-full bg-green-700 hover:bg-green-800 text-white text-sm font-semibold py-2 rounded-xl transition-colors text-center"
                  >
                    {isEvent ? "View venue" : isDining ? "View restaurant" : tc("bookNow")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {!isEvent && !isDining && (
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 tabular-nums leading-tight">
            {money(publishedRates.nightly || displayPrice)}
          </p>
          <p className="text-[11px] text-gray-500">{tc("perNight")}</p>
        </div>
        <a
          href="#booking-calculator"
          className="ms-auto shrink-0 inline-flex items-center justify-center bg-green-700 hover:bg-green-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl min-h-[44px]"
        >
          {tc("checkAvailability")}
        </a>
      </div>
      )}
      {isDining && (
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 tabular-nums leading-tight">
            {ratedStay.reviews > 0 ? `${ratedStay.rating.toFixed(1)} ★` : "Reserve"}
          </p>
          <p className="text-[11px] text-gray-500">Free reservation request</p>
        </div>
        <a
          href="#booking-calculator"
          className="ms-auto shrink-0 inline-flex items-center justify-center bg-green-700 hover:bg-green-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl min-h-[44px]"
        >
          Reserve
        </a>
      </div>
      )}

      <ListingGalleryOverlay
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        photos={photos}
        alt={stayName}
        videoTourUrl={videoTourUrl || undefined}
        startIndex={galleryStartIndex}
        startOnVideo={galleryStartVideo}
      />
    </div>
  );
}
