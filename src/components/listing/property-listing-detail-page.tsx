"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
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
  Car,
  Leaf,
  Utensils,
  Trees,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Shield,
  Headphones,
  Award,
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
  X,
  Waves,
  Baby,
  Mail,
  Link2,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { CountdownTimer } from "@/components/ui/star-rating";
import {
  GALLERY,
  PROPERTY_HIGHLIGHTS,
  BOOKING_ACTIVITY,
  type Stay,
} from "@/lib/mock/data";
import { usePublicListings } from "@/lib/listings/use-public-listings";
import { ListingReviewsSection } from "@/components/listing/listing-reviews-section";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { RichTextView } from "@/components/listing/rich-text-view";
import { BASE_CURRENCY, formatStoredMoney  } from "@/lib/currency";
import { resolveCountryPricingConfig } from "@/lib/admin/country-utils";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { photoTagLabel } from "@/lib/listings/photo-tags";
import { getListingFeatureIcon } from "@/lib/listings/listing-feature-icons";
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
import { readStayDatesFromSearch, readStayPartyFromSearch } from "@/lib/guest/stay-search-dates";
import { ExperienceBookingCard } from "@/components/listing/experience-booking-card";
import { EventListingDetailContent } from "@/components/listing/event-listing-detail-content";
import { isExperienceListing } from "@/lib/booking/is-experience-listing";
import { isEventListing } from "@/lib/booking/is-event-listing";
import {
  guestPartyFromRoom,
  mergeGuestPartyLimits,
  type GuestPartyLimits,
} from "@/lib/listings/guest-capacity";

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  "Free WiFi": Wifi,
  WiFi: Wifi,
  Wifi: Wifi,
  "Private Pool": Waves,
  "Swimming Pool": Waves,
  Pool: Waves,
  "BBQ Area": Flame,
  BBQ: Flame,
  "Free Parking": Car,
  Parking: Car,
  "Farm Activities": Leaf,
  "Breakfast Incl.": Utensils,
  "Pet Friendly": Leaf,
  "Mountain View": Mountain,
  "Outdoor Seating": Home,
  "Air Conditioning": Wind,
  "Smart TV": Tv,
  Kitchen: Utensils,
  "Family Friendly": Users,
  "Instant Booking": Zap,
  "kids play area": Baby,
  "Kids Play Area": Baby,
  "Kids play area": Baby,
};

function amenityIcon(name: string): typeof Wifi {
  if (AMENITY_ICONS[name]) return AMENITY_ICONS[name];
  const lower = name.trim().toLowerCase();
  const hit = Object.entries(AMENITY_ICONS).find(([key]) => key.toLowerCase() === lower);
  if (hit) return hit[1];
  if (lower.includes("wifi") || lower.includes("wi-fi")) return Wifi;
  if (lower.includes("pool") || lower.includes("swim")) return Waves;
  if (lower.includes("bbq") || lower.includes("barbecue")) return Flame;
  if (lower.includes("park")) return Car;
  if (lower.includes("pet")) return Leaf;
  if (lower.includes("family")) return Users;
  if (lower.includes("instant")) return Zap;
  if (lower.includes("kid") || lower.includes("play") || lower.includes("child")) return Baby;
  if (lower.includes("kitchen") || lower.includes("breakfast") || lower.includes("dining"))
    return Utensils;
  if (lower.includes("mountain") || lower.includes("view")) return Mountain;
  return CheckCircle;
}

const EXPERIENCES = [
  {
    id: "farm-tour",
    title: "Farm Tour",
    desc: "Guided walk through organic gardens and animal pens",
    amount: 75,
  },
  {
    id: "fruit-picking",
    title: "Fruit Picking",
    desc: "Seasonal harvest experience for all ages",
    amount: 50,
  },
  {
    id: "bbq-evening",
    title: "BBQ Evening",
    desc: "Private BBQ setup with chef assistance",
    amount: 120,
  },
  {
    id: "camel-riding",
    title: "Camel Riding",
    desc: "Desert-edge camel ride at sunset",
    amount: 90,
  },
];

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
  }[];
  /** Host-configured guest limits (property-level). Rooms override when selected. */
  guestParty?: GuestPartyLimits;
  /** Host-configured optional fees for this listing */
  extraCharges?: ExtraCharge[];
  extraChargesCurrency?: string;
  /** Explicit amenities (merged with stay.amenities) */
  amenities?: string[];
  /** Experience listing content */
  itinerary?: { step: number; title: string; description?: string }[];
  meetingPoint?: string;
  requirements?: string;
  licenseNumber?: string;
  groupSizeMin?: number;
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
  rooms: roomsProp,
  guestParty: guestPartyProp,
  extraCharges: extraChargesProp,
  extraChargesCurrency: extraChargesCurrencyProp,
  amenities: amenitiesProp,
  itinerary,
  meetingPoint,
  requirements,
  licenseNumber,
  groupSizeMin,
}: PropertyListingDetailPageProps) {
  const t = useTranslations("listing");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { data: taxonomy } = useAdminTaxonomy();
  const isExperience = isExperienceListing({
    parentCategory: stay.parentCategory,
    type: stay.type,
  });
  const isEvent = isEventListing({
    parentCategory: stay.parentCategory,
    type: stay.type,
    category: stay.category,
  });
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
  const [checkIn, setCheckIn] = useState(() => {
    const fromSearch = readStayDatesFromSearch();
    if (fromSearch) return fromSearch.checkIn;
    const cartLine = loadBookingCart().find((line) => line.listingId === stay.id);
    return cartLine?.checkIn || "";
  });
  const [checkOut, setCheckOut] = useState(() => {
    const fromSearch = readStayDatesFromSearch();
    if (fromSearch) return fromSearch.checkOut;
    const cartLine = loadBookingCart().find((line) => line.listingId === stay.id);
    return cartLine?.checkOut || "";
  });
  const [datePickerOpen, setDatePickerOpen] = useState<"checkIn" | "checkOut" | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const seed = checkIn || defaultDates.checkIn;
    const d = new Date(`${seed}T12:00:00`);
    return { year: d.getFullYear(), month: d.getMonth() };
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
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFlash, setShareFlash] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [readMore, setReadMore] = useState(false);
  const [selectedExperienceIds, setSelectedExperienceIds] = useState<string[]>([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [cartAdded, setCartAdded] = useState(false);
  const [pricingSettings, setPricingSettings] = useState<ListingPricingSettings | null>(null);
  const [availability, setAvailability] = useState<ListingAvailabilitySettings | null>(null);
  const [occupiedDates, setOccupiedDates] = useState<string[]>([]);
  const [listingExtras, setListingExtras] = useState<ExtraCharge[]>(
    extraChargesProp ?? []
  );
  const [extrasCurrency, setExtrasCurrency] = useState(extraChargesCurrencyProp ?? BASE_CURRENCY);

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
        img: stay.img,
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
  }, [
    hasRoomTypes,
    bookingRooms,
    stay.guests,
    guestPartyProp?.total,
    guestPartyProp?.adults,
    guestPartyProp?.children,
    guestPartyProp?.infants,
  ]);

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

  function roomNightly(room: { id?: string; price: number }): number {
    if (pricingSettings && room.id) {
      const stored = pricingSettings.roomPrices.find((r) => r.roomId === room.id);
      if (stored?.basePrice != null && stored.basePrice > 0) {
        return resolveDisplayNightlyRate(pricingSettings, room.id);
      }
    }
    if (room.price > 0) return room.price;
    if (pricingSettings) return resolveDisplayNightlyRate(pricingSettings, null);
    return 0;
  }

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
      const currency = extraChargesCurrencyProp ?? pricing.currency ?? BASE_CURRENCY;
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
    // Intentionally omit extraChargesProp identity — parents often pass a fresh [] each render.
  }, [stay.id, extraChargesCurrencyProp]);

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

  const selectedExperiences = useMemo(
    () => EXPERIENCES.filter((e) => selectedExperienceIds.includes(e.id)),
    [selectedExperienceIds]
  );
  const experiencesTotal = useMemo(
    () =>
      selectedExperiences.reduce((sum, e) => sum + e.amount, 0) *
      Math.max(1, guestCount),
    [selectedExperiences, guestCount]
  );

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
      experiencesTotal,
    });
  }, [
    pricingSettings,
    checkIn,
    checkOut,
    guestCount,
    hasRoomTypes,
    bookingRoomIds,
    selectedExtras,
    experiencesTotal,
  ]);

  function toggleExperience(id: string) {
    setSelectedExperienceIds((prev) => {
      const adding = !prev.includes(id);
      if (adding) scrollToCalculator();
      return adding ? [...prev, id] : prev.filter((x) => x !== id);
    });
  }

  function toggleExtra(id: string) {
    setSelectedExtraIds((prev) => {
      const adding = !prev.includes(id);
      if (adding) scrollToCalculator();
      return adding ? [...prev, id] : prev.filter((x) => x !== id);
    });
  }

  function toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
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

  const bookingRuleHint =
    guestCount < 1
      ? "Add at least one adult or child to continue."
      : checkIn && checkOut && availability
        ? bookingRulesViolation(checkIn, checkOut, availability)
        : null;

  const calendarCells = useMemo(() => {
    const { year, month } = calendarMonth;
    const first = new Date(year, month, 1);
    const startPad = first.getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: ({ iso: string; day: number } | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ iso: toIsoDate(new Date(year, month, day)), day });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);

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
    if (selectedExperienceIds.length > 0) {
      params.set("experiences", selectedExperienceIds.join(","));
    }
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
    selectedExperienceIds,
    selectedExtraIds,
  ]);

  const similar = useMemo(
    () => {
      const base = catalogListings
        .filter((s) => s.id !== stay.id)
        .filter((s) =>
          isEvent
            ? isEventListing({
                parentCategory: s.parentCategory,
                type: s.type,
                category: s.category,
              })
            : !isEventListing({
                parentCategory: s.parentCategory,
                type: s.type,
                category: s.category,
              })
        )
        .slice(0, 4);
      if (!reviewsReady) return base;
      return base.map((s) => applyGuestReviewRatings(s));
    },
    [stay.id, reviewsReady, catalogListings, isEvent]
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

  const galleryHero = [...photos.slice(0, 5)];
  while (galleryHero.length < 5) {
    galleryHero.push(galleryHero[0] ?? { src: stay.img });
  }
  const aboutText = description?.trim();
  const displayAmenities = useMemo(() => {
    const fromProp = amenitiesProp ?? [];
    const fromStay = stay.amenities ?? [];
    const merged = [...fromProp, ...fromStay];
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
  }, [amenitiesProp, stay.amenities, stay.instantBook]);
  const displayPolicies =
    houseRules && houseRules.length > 0
      ? houseRules.map((r) => ({ title: r.title, desc: r.description }))
      : POLICIES;
  const showFarmInfo =
    Boolean(farmType) ||
    (farmActivities && farmActivities.length > 0) ||
    Boolean(livestockCrops?.trim());

  const tabs = [
    { key: "overview", label: t("tabs.overview") },
    { key: "amenities", label: t("tabs.amenities") },
    { key: "rooms", label: t("tabs.rooms") },
    { key: "experiences", label: t("tabs.experiences") },
    ...(listingExtras.length > 0 ? [{ key: "extras", label: "Extras" }] : []),
    { key: "location", label: t("tabs.location") },
    { key: "reviews", label: `${t("tabs.reviews")} (${ratedStay.reviews})` },
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

    if (propertyFeatureIcons && propertyFeatureIcons.length > 0) {
      for (const { iconKey, label } of propertyFeatureIcons.slice(0, 4)) {
        push(getListingFeatureIcon(iconKey), label);
      }
    } else {
      for (const amenity of (stay.amenities ?? []).slice(0, 4)) {
        push(AMENITY_ICONS[amenity] ?? amenityIcon(amenity), amenity);
      }
    }

    return chips;
  }, [
    stay.parentCategory,
    stay.category,
    stay.type,
    stay.beds,
    stay.baths,
    stay.guests,
    stay.amenities,
    displayRooms,
    propertyFeatureIcons,
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
    <div className="bg-gray-50 min-h-screen pb-24 lg:pb-0">
      {/* Photo grid — directly under site header */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-auto md:h-[480px] rounded-2xl overflow-hidden bg-white">
          <Link
            href={`/listing/${stay.id}/gallery`}
            className="relative block min-h-[240px] md:min-h-0 md:h-full cursor-pointer group"
          >
            <Image
              src={galleryHero[0].src}
              alt={stayName}
              fill
              priority
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized={galleryHero[0].src.startsWith("data:")}
            />
            <span className="absolute top-3 start-3 bg-green-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full z-10">
              {t("mostBooked")}
            </span>
            {galleryHero[0].tag ? (
              <span className="absolute top-3 end-3 z-10 inline-flex items-center gap-1 max-w-[70%] truncate bg-black/65 text-white text-[11px] font-medium px-2.5 py-1 rounded-md">
                <Tag className="w-3 h-3 shrink-0" />
                {photoTagLabel(galleryHero[0].tag)}
              </span>
            ) : null}
            <span className="absolute bottom-4 start-4 hidden sm:flex items-center gap-2 bg-black/60 text-white text-sm font-medium px-4 py-2 rounded-lg z-10">
              <Play className="w-4 h-4" /> {t("watchVideo")}
            </span>
          </Link>

          <div className="grid grid-cols-2 grid-rows-2 gap-2 min-h-[240px] md:min-h-0 md:h-full bg-white">
            {galleryHero.slice(1, 5).map((photo, i) => (
              <Link
                key={`${photo.src}-${i}`}
                href={`/listing/${stay.id}/gallery`}
                className="relative block min-h-[120px] md:min-h-0 overflow-hidden group"
              >
                <Image
                  src={photo.src}
                  alt={
                    photo.tag
                      ? `${stayName} — ${photoTagLabel(photo.tag)}`
                      : `${stayName} ${i + 2}`
                  }
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  sizes="25vw"
                  unoptimized={photo.src.startsWith("data:")}
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
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-2 text-xs text-gray-500 flex-wrap">
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
      </div>

      {isEvent ? (
        <EventListingDetailContent
          stay={ratedStay}
          description={aboutText}
          highlights={highlights}
          amenities={displayAmenities}
          features={featureIcons}
          reviews={publishedReviews}
          reviewsReady={reviewsReady}
          rating={ratedStay.rating}
          reviewCount={ratedStay.reviews}
          spaces={displayRooms.map((room) => ({
            id: (room as { id?: string }).id,
            name: room.name,
            desc: room.desc,
            price: roomNightly(room),
            capacity: room.capacity,
            img: room.img,
          }))}
          mapEmbedUrl={mapEmbedUrl}
          policies={displayPolicies}
          offers={hostOffers}
          money={money}
          featured={showFeatured}
          wishlist={wishlist}
          onToggleWishlist={() => setWishlist((saved) => !saved)}
          onShare={() => void copyShareLink()}
        />
      ) : (
      <div className="max-w-7xl mx-auto px-4 pt-5 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main column — 8 cols */}
          <div className="lg:col-span-8 min-w-0">
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
                        <span className="w-8 h-8 rounded-full bg-[#25D366]/15 text-[#128C7E] flex items-center justify-center shrink-0 text-xs font-bold">
                          WA
                        </span>
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareVia("facebook")}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span className="w-8 h-8 rounded-full bg-[#1877F2]/15 text-[#1877F2] flex items-center justify-center shrink-0 text-xs font-bold">
                          f
                        </span>
                        Facebook
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareVia("x")}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span className="w-8 h-8 rounded-full bg-gray-900/10 text-gray-900 flex items-center justify-center shrink-0 text-xs font-bold">
                          𝕏
                        </span>
                        X
                      </button>
                      <button
                        type="button"
                        onClick={() => void shareVia("email")}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4" />
                        </span>
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
                  onClick={() => setWishlist(!wishlist)}
                  className="flex items-center gap-1.5 border border-gray-300 hover:border-gray-400 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <Heart className={`w-4 h-4 ${wishlist ? "fill-red-500 text-red-500" : ""}`} />{" "}
                  {tc("save")}
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
            <div className="bg-white rounded-xl border mb-5 overflow-x-auto sticky top-[72px] z-10">
              <div className="flex">
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-gray-100 mb-5">
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
              <h3 className="font-bold text-gray-800 text-sm mb-3">{t("propertyHighlights")}</h3>
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

            {/* Amenities */}
            <section id="section-amenities" className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5">
              <h2 className="font-bold text-gray-900 text-base mb-4 font-display">{t("tabs.amenities")}</h2>
              {displayAmenities.length === 0 ? (
                <p className="text-sm text-gray-400">No amenities listed for this property yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {displayAmenities.map((amenity) => {
                    const Icon = amenityIcon(amenity);
                    return (
                      <div key={amenity} className="flex items-center gap-2.5 text-sm text-gray-700">
                        <div className="w-9 h-9 bg-green-50 border border-green-100 rounded-lg flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-green-700" />
                        </div>
                        {amenity}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Live activity */}
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
                        src={room.img}
                        alt={room.name}
                        fill
                        className="object-cover"
                        sizes="128px"
                        unoptimized={room.img.startsWith("data:")}
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

            {/* Experiences */}
            <section id="section-experiences" className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="font-bold text-gray-900 text-base font-display">{t("tabs.experiences")}</h2>
                {selectedExperienceIds.length > 0 && (
                  <p className="text-xs text-green-700 font-medium shrink-0">
                    {selectedExperienceIds.length} added to calculator
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {EXPERIENCES.map((exp) => {
                  const added = selectedExperienceIds.includes(exp.id);
                  return (
                    <div
                      key={exp.id}
                      className={`border rounded-xl p-4 transition-colors cursor-pointer ${
                        added
                          ? "border-green-500 bg-green-50/40"
                          : "border-gray-200 hover:border-green-300"
                      }`}
                      onClick={() => toggleExperience(exp.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleExperience(exp.id);
                        }
                      }}
                    >
                      <h3 className="font-semibold text-gray-800 text-sm">{exp.title}</h3>
                      <p className="text-gray-500 text-xs mt-1">{exp.desc}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-green-700 font-bold text-sm">
                          {money(exp.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExperience(exp.id);
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

            {/* Location */}
            <section id="section-location" className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5">
              <h2 className="font-bold text-gray-900 text-base mb-4 font-display">{t("tabs.location")}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <MapPin className="w-4 h-4 text-green-600" />
                {stayLocation}
              </div>
              <div className="relative w-full h-56 rounded-xl overflow-hidden bg-green-50 border border-green-100">
                {mapEmbedUrl ? (
                  <iframe
                    title={`Map — ${stayLocation}`}
                    src={mapEmbedUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-green-700">
                    <MapPin className="w-10 h-10 opacity-30" />
                    <span className="text-sm font-medium opacity-60">
                      Interactive map — {stayLocation}
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-500">
                {[
                  ["Airport", "45 mins"],
                  ["City Centre", "20 mins"],
                  ["Farm Market", "5 mins"],
                  ["Railway Station", "30 mins"],
                ].map(([place, time]) => (
                  <div key={place} className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>
                      <strong className="text-gray-700">{place}</strong> — {time}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <ListingReviewsSection
              reviews={publishedReviews}
              ready={reviewsReady}
              average={ratedStay.rating}
              count={ratedStay.reviews}
            />

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
          <div className="lg:col-span-4">
            <div className="sticky top-20 flex flex-col gap-4">
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
                  {selectedNights > 0 ? (
                    <span className="text-sm font-semibold text-gray-700 ms-auto tabular-nums">
                      {selectedNights} night{selectedNights === 1 ? "" : "s"}
                    </span>
                  ) : null}
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
                  className="border border-gray-200 rounded-xl overflow-visible mb-3 relative"
                >
                  <div className="relative">
                    <div className="grid grid-cols-2 divide-x divide-gray-200 overflow-hidden rounded-t-xl">
                      <button
                        type="button"
                        onClick={() => openDatePicker("checkIn")}
                        className={`p-3 text-start hover:bg-gray-50 transition-colors cursor-pointer ${
                          datePickerOpen === "checkIn" ? "bg-green-50 ring-1 ring-inset ring-green-200" : ""
                        }`}
                      >
                        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">
                          {t("checkIn")}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar
                            className={`w-3.5 h-3.5 shrink-0 ${
                              checkIn ? "text-green-600" : "text-gray-400"
                            }`}
                          />
                          <span
                            className={`text-sm font-semibold truncate ${
                              checkIn ? "text-gray-900" : "text-gray-400"
                            }`}
                          >
                            {formatDateLabel(checkIn)}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => openDatePicker("checkOut")}
                        className={`p-3 text-start hover:bg-gray-50 transition-colors cursor-pointer ${
                          datePickerOpen === "checkOut" ? "bg-green-50 ring-1 ring-inset ring-green-200" : ""
                        }`}
                      >
                        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">
                          {t("checkOut")}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar
                            className={`w-3.5 h-3.5 shrink-0 ${
                              checkOut ? "text-green-600" : "text-gray-400"
                            }`}
                          />
                          <span
                            className={`text-sm font-semibold truncate ${
                              checkOut ? "text-gray-900" : "text-gray-400"
                            }`}
                          >
                            {formatDateLabel(checkOut)}
                          </span>
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
                        {selectedNights > 0 ? (
                          <p className="mt-1 text-center text-xs font-semibold text-green-800">
                            {selectedNights} night{selectedNights === 1 ? "" : "s"} selected
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {selectedNights > 0 ? (
                    <div className="border-t border-gray-200 px-3 py-2.5 flex items-center justify-between gap-2 bg-green-50/60">
                      <span className="text-xs text-gray-600">Length of stay</span>
                      <span className="text-sm font-bold text-green-900 tabular-nums">
                        {selectedNights} night{selectedNights === 1 ? "" : "s"}
                      </span>
                    </div>
                  ) : checkIn ? (
                    <div className="border-t border-gray-200 px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => openDatePicker("checkOut")}
                        className="text-xs font-semibold text-green-800 hover:text-green-950 underline-offset-2 hover:underline"
                      >
                        Choose check-out date →
                      </button>
                    </div>
                  ) : null}

                  {bookingRuleHint && (
                    <p className="px-3 py-2 text-xs text-amber-800 bg-amber-50 border-t border-amber-100">
                      {bookingRuleHint}
                    </p>
                  )}

                  <div className="border-t border-gray-200 p-3 relative">
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">
                      {t("guestsLabel")}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDatePickerOpen(null);
                        setGuestsOpen((v) => !v);
                      }}
                      className="w-full flex items-center justify-between gap-2 text-start"
                      aria-expanded={guestsOpen}
                    >
                      <span className="text-sm font-semibold text-gray-800 truncate">
                        {guestsSummary}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                          guestsOpen ? "rotate-180" : ""
                        }`}
                      />
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
                  </div>
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

                {selectedExperiences.length > 0 && (
                  <div className="border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
                        Experiences
                      </div>
                      <span className="text-[10px] text-gray-400">
                        Per person · ×{Math.max(1, guestCount)}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {selectedExperiences.map((exp) => {
                        const lineTotal = exp.amount * Math.max(1, guestCount);
                        return (
                          <li
                            key={exp.id}
                            className="flex items-center gap-2.5 rounded-lg px-1 py-1"
                          >
                            <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">
                              {exp.title}
                            </span>
                            <span className="text-xs font-semibold text-gray-700 tabular-nums shrink-0 text-end">
                              {money(lineTotal)}
                              {guestCount > 1 && (
                                <span className="block text-[10px] font-normal text-gray-400">
                                  {money(exp.amount)} × {guestCount}
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleExperience(exp.id)}
                              className="text-[10px] font-semibold text-gray-400 hover:text-red-600 shrink-0"
                              aria-label={`Remove ${exp.title}`}
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-xs">
                      <span className="text-gray-500">
                        {selectedExperiences.length} experience
                        {selectedExperiences.length === 1 ? "" : "s"}
                      </span>
                      <span className="font-bold text-green-800 tabular-nums">
                        {money(experiencesTotal)}
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

                {stayQuote && stayQuote.lines.length > 0 && (
                  <div className="border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
                    <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
                      Price breakdown
                    </div>
                    <ul className="space-y-1.5">
                      {stayQuote.lines.map((line) => (
                        <li
                          key={line.label}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-gray-600 truncate">{line.label}</span>
                          <span
                            className={`font-semibold tabular-nums shrink-0 ${
                              line.amount < 0 ? "text-green-700" : "text-gray-800"
                            }`}
                          >
                            {line.amount < 0 ? "−" : ""}
                            {money(Math.abs(line.amount))}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-sm font-semibold text-gray-900">Total</span>
                      <span className="text-base font-bold text-gray-900 tabular-nums">
                        {money(stayQuote.total)}
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
                          experienceIds: selectedExperienceIds,
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
                  Last booking was 12 minutes ago from Dubai, UAE
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
                <p className="text-xs text-gray-500 mb-3">+971 4 123 4567</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 text-gray-600 text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </button>
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
      <section className="border-t border-gray-200 bg-white mt-2">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-display">
                {isEvent ? "Similar event venues" : t("similarTitle")}
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">
                {isEvent ? "Explore more venues for your next event" : t("similarSubtitle")}
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
                    {isEvent ? "View venue" : tc("bookNow")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {!isEvent && (
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
    </div>
  );
}
