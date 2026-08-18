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
  ThumbsUp,
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
  Copy,
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
import { StarRating, CountdownTimer } from "@/components/ui/star-rating";
import {
  GALLERY,
  ROOMS,
  PROPERTY_HIGHLIGHTS,
  DETAIL_REVIEWS,
  RATING_BREAKDOWN,
  BOOKING_ACTIVITY,
  STAYS,
  type Stay,
} from "@/lib/mock/data";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { formatMoney } from "@/lib/currency";
import { resolveCountryPricingConfig } from "@/lib/admin/country-utils";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { photoTagLabel } from "@/lib/listings/photo-tags";
import { getListingFeatureIcon } from "@/lib/listings/listing-feature-icons";
import { useListingSettings } from "@/components/providers/listing-settings-provider";
import {
  HOST_PRICING_SYNC_EVENT,
  loadPricingSettings,
} from "@/lib/host/host-pricing-data";
import { fetchPricingFromApi, shouldUseSharedPricingStore } from "@/lib/host/host-pricing-api";
import {
  HOST_AVAILABILITY_SYNC_EVENT,
  getAvailabilitySettings,
} from "@/lib/host/host-availability-data";
import {
  fetchAvailabilityFromApi,
  shouldUseSharedAvailabilityStore,
} from "@/lib/host/host-availability-api";
import { isDateUnavailable } from "@/lib/host/host-availability-utils";
import type { ListingAvailabilitySettings } from "@/lib/host/host-availability-types";
import {
  calculateStayQuote,
  defaultCheckInOut,
  resolveCombinedNightlyRate,
  resolveDisplayNightlyRate,
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
import { isFeaturedStay } from "@/lib/listings/public-listings";
import {
  applyGuestReviewRatings,
  getPublishedReviewsForListing,
  mergeStayReviews,
  STAY_REVIEWS_SYNC_EVENT,
} from "@/lib/booking/stay-reviews-data";
import type { StayReview } from "@/lib/booking/stay-reviews-types";
import { addToBookingCart } from "@/lib/guest/booking-cart";

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

/** Demo extras when a listing has none configured yet */
const DEMO_EXTRAS: ExtraCharge[] = [
  {
    id: "demo-extra-bed-breakfast",
    label: "Extra bed with breakfast",
    amount: 150,
    billing: "per_night",
    catalogId: "common:extra-bed-breakfast",
  },
  {
    id: "demo-breakfast",
    label: "Breakfast",
    amount: 45,
    billing: "per_person_per_night",
    catalogId: "common:breakfast",
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
    beds: number;
    baths: number;
    img: string;
  }[];
  /** Host-configured optional fees for this listing */
  extraCharges?: ExtraCharge[];
  extraChargesCurrency?: string;
  /** Explicit amenities (merged with stay.amenities) */
  amenities?: string[];
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
  extraCharges: extraChargesProp,
  extraChargesCurrency: extraChargesCurrencyProp,
  amenities: amenitiesProp,
}: PropertyListingDetailPageProps) {
  const t = useTranslations("listing");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { data: taxonomy } = useAdminTaxonomy();
  const { enabledRatingCategories, enabledGuestReviews, ready: listingSettingsReady } =
    useListingSettings();
  const [showFeatured, setShowFeatured] = useState(() =>
    /featured|premium/i.test(stay.badge ?? "")
  );
  const [reviewTick, setReviewTick] = useState(0);
  const [reviewsReady, setReviewsReady] = useState(false);

  useEffect(() => {
    const ids = new Set(getActivePromotedListingIds("featured"));
    setShowFeatured(isFeaturedStay(stay, ids));
  }, [stay]);

  useEffect(() => {
    setReviewsReady(true);
    function bump() {
      setReviewTick((n) => n + 1);
    }
    window.addEventListener(STAY_REVIEWS_SYNC_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(STAY_REVIEWS_SYNC_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/reviews?listingId=${encodeURIComponent(stay.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { reviews?: StayReview[] } | null) => {
        if (cancelled || !data?.reviews?.length) return;
        mergeStayReviews(data.reviews);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [stay.id]);

  const ratedStay = useMemo(
    () => (reviewsReady ? applyGuestReviewRatings(stay) : stay),
    [stay, reviewTick, reviewsReady]
  );

  const countryPricing = useMemo(
    () => resolveCountryPricingConfig(taxonomy.countries, stay.location),
    [taxonomy.countries, stay.location]
  );

  // Host-added rooms when provided; otherwise demo ROOMS are bookable in the calculator.
  const hostRooms = useMemo(() => {
    if (roomsProp !== undefined) return roomsProp;
    return ROOMS.map((room, i) => ({
      id: `mock-${i}`,
      name: room.name,
      desc: room.desc,
      price: room.price,
      capacity: room.capacity,
      beds: room.beds,
      baths: room.baths,
      img: room.img,
    }));
  }, [roomsProp]);
  const hasRoomTypes = hostRooms.length > 0;
  const displayRooms = hostRooms;

  const [bookingRoomIds, setBookingRoomIds] = useState<string[]>(() =>
    hostRooms.length === 1 && hostRooms[0].id ? [hostRooms[0].id] : []
  );
  const defaultDates = useMemo(() => defaultCheckInOut(2), []);
  const [checkIn, setCheckIn] = useState(defaultDates.checkIn);
  const [checkOut, setCheckOut] = useState(defaultDates.checkOut);
  const [datePickerOpen, setDatePickerOpen] = useState<"checkIn" | "checkOut" | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date(`${defaultDates.checkIn}T12:00:00`);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const [guestsOpen, setGuestsOpen] = useState(false);
  /** Paying guests for capacity + per-pax fees (infants excluded). */
  const guestCount = adults + children;
  const allowPets = false;

  const [activeTab, setActiveTab] = useState("overview");
  const [wishlist, setWishlist] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareFlash, setShareFlash] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [activityIdx, setActivityIdx] = useState(0);
  const [readMore, setReadMore] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedExperienceIds, setSelectedExperienceIds] = useState<string[]>([]);
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [cartAdded, setCartAdded] = useState(false);
  const [pricingSettings, setPricingSettings] = useState<ListingPricingSettings | null>(null);
  const [availability, setAvailability] = useState<ListingAvailabilitySettings | null>(null);
  const [listingExtras, setListingExtras] = useState<ExtraCharge[]>(
    extraChargesProp && extraChargesProp.length > 0 ? extraChargesProp : DEMO_EXTRAS
  );
  const [extrasCurrency, setExtrasCurrency] = useState(extraChargesCurrencyProp ?? "AED");

  useEffect(() => {
    const validIds = new Set(hostRooms.map((r) => r.id).filter(Boolean) as string[]);
    setBookingRoomIds((prev) => {
      const kept = prev.filter((id) => validIds.has(id));
      if (kept.length > 0) return kept;
      if (hostRooms.length === 1 && hostRooms[0].id) return [hostRooms[0].id];
      return [];
    });
  }, [hostRooms]);

  useEffect(() => {
    // Property-level listings only — room listings derive capacity from selected rooms
    if (hasRoomTypes) return;
    const cap = Math.max(1, stay.guests);
    setAdults((a) => Math.min(Math.max(1, a), cap));
    setChildren((c) => Math.min(c, Math.max(0, cap - 1)));
  }, [stay.guests, hasRoomTypes]);

  const bookingRooms = useMemo(
    () => hostRooms.filter((r) => r.id && bookingRoomIds.includes(r.id)),
    [hostRooms, bookingRoomIds]
  );

  function toggleBookingRoom(roomId: string | undefined) {
    if (!roomId) return;
    setBookingRoomIds((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    );
    setActiveTab("rooms");
  }

  function roomNightly(room: { id?: string; price: number }): number {
    if (pricingSettings && room.id) {
      return resolveDisplayNightlyRate(pricingSettings, room.id);
    }
    return room.price;
  }

  useEffect(() => {
    async function refreshPricing() {
      if (typeof window === "undefined") return;
      const pricing = shouldUseSharedPricingStore()
        ? (await fetchPricingFromApi(stay.id).catch(() => null)) ??
          loadPricingSettings(stay.id)
        : loadPricingSettings(stay.id);
      setPricingSettings(pricing);
      const currency = extraChargesCurrencyProp ?? pricing.currency ?? "AED";
      setExtrasCurrency(currency);

      if (!pricing.extraChargesEnabled) {
        setListingExtras([]);
        return;
      }
      if (pricing.extraCharges.length > 0) {
        setListingExtras(pricing.extraCharges);
        return;
      }
      if (extraChargesProp && extraChargesProp.length > 0) {
        setListingExtras(extraChargesProp);
        return;
      }
      if (extraChargesProp === undefined) {
        setListingExtras(DEMO_EXTRAS);
        return;
      }
      setListingExtras([]);
    }
    void refreshPricing();
    window.addEventListener(HOST_PRICING_SYNC_EVENT, refreshPricing);
    window.addEventListener("storage", refreshPricing);
    return () => {
      window.removeEventListener(HOST_PRICING_SYNC_EVENT, refreshPricing);
      window.removeEventListener("storage", refreshPricing);
    };
  }, [stay.id, extraChargesProp, extraChargesCurrencyProp]);

  useEffect(() => {
    async function refreshAvailability() {
      if (typeof window === "undefined") return;
      const settings = shouldUseSharedAvailabilityStore()
        ? (await fetchAvailabilityFromApi(stay.id).catch(() => null)) ??
          getAvailabilitySettings(stay.id)
        : getAvailabilitySettings(stay.id);
      setAvailability(settings);
    }
    void refreshAvailability();
    window.addEventListener(HOST_AVAILABILITY_SYNC_EVENT, refreshAvailability);
    window.addEventListener("storage", refreshAvailability);
    return () => {
      window.removeEventListener(HOST_AVAILABILITY_SYNC_EVENT, refreshAvailability);
      window.removeEventListener("storage", refreshAvailability);
    };
  }, [stay.id]);

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
    if (hasRoomTypes && bookingRoomIds.length === 0) return null;
    if (pricingSettings) {
      if (hasRoomTypes) {
        return resolveCombinedNightlyRate(pricingSettings, bookingRoomIds);
      }
      return resolveDisplayNightlyRate(pricingSettings, null);
    }
    if (hasRoomTypes) {
      return bookingRooms.reduce((sum, room) => sum + room.price, 0);
    }
    return stay.price;
  }, [
    hasRoomTypes,
    bookingRoomIds,
    bookingRooms,
    pricingSettings,
    stay.price,
  ]);

  const stayQuote = useMemo(() => {
    if (!pricingSettings) return null;
    return calculateStayQuote({
      settings: pricingSettings,
      checkIn,
      checkOut,
      guests: guestCount,
      // Empty array = rooms required but none chosen (no accommodation line yet)
      roomIds: hasRoomTypes ? bookingRoomIds : undefined,
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

  function onCheckInChange(value: string) {
    setCheckIn(value);
    if (value && checkOut && checkOut <= value) {
      const next = new Date(`${value}T12:00:00`);
      next.setDate(next.getDate() + 1);
      setCheckOut(toIsoDate(next));
    }
  }

  function openDatePicker(which: "checkIn" | "checkOut") {
    setGuestsOpen(false);
    const iso = which === "checkIn" ? checkIn : checkOut || checkIn;
    const d = new Date(`${(iso || defaultDates.checkIn)}T12:00:00`);
    setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
    setDatePickerOpen((prev) => (prev === which ? null : which));
  }

  function selectCalendarDate(iso: string) {
    if (availability && isDateUnavailable(iso, availability)) return;
    if (datePickerOpen === "checkIn") {
      onCheckInChange(iso);
      setDatePickerOpen("checkOut");
      const d = new Date(`${iso}T12:00:00`);
      d.setDate(d.getDate() + 1);
      setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
      return;
    }
    if (datePickerOpen === "checkOut") {
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

  const calendarMinIso =
    datePickerOpen === "checkOut"
      ? (() => {
          const d = new Date(`${(checkIn || defaultDates.checkIn)}T12:00:00`);
          d.setDate(d.getDate() + 1);
          return toIsoDate(d);
        })()
      : defaultDates.checkIn;

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
      const base = STAYS.filter((s) => s.id !== stay.id).slice(0, 4);
      if (!reviewsReady) return base;
      return base.map((s) => applyGuestReviewRatings(s));
    },
    [stay.id, reviewTick, reviewsReady]
  );
  const priceCurrency =
    pricingSettings?.currency ?? extrasCurrency ?? countryPricing.currency;
  const moneyRate = countryPricing.exchangeRateToAED;
  const money = (amountAed: number) =>
    formatMoney(amountAed, {
      currency: priceCurrency,
      exchangeRateToAED: moneyRate,
      locale,
    });
  const discount = stay.originalPrice
    ? Math.round((1 - (displayPrice ?? stay.price) / stay.originalPrice) * 100)
    : 24;
  const roomCapacity = useMemo(
    () => bookingRooms.reduce((sum, r) => sum + (r.capacity || 0), 0),
    [bookingRooms]
  );

  /** Paying guests (adults + children) cannot exceed selected rooms' combined capacity. */
  const maxGuests = useMemo(() => {
    if (hasRoomTypes) return roomCapacity;
    return Math.max(1, stay.guests);
  }, [hasRoomTypes, roomCapacity, stay.guests]);

  useEffect(() => {
    if (maxGuests <= 0) {
      setChildren(0);
      setAdults(1);
      return;
    }
    if (guestCount <= maxGuests) return;
    // Cap when capacity shrinks (e.g. a room is removed)
    const overflow = guestCount - maxGuests;
    setChildren((c) => {
      const reduceChildren = Math.min(c, overflow);
      const remain = overflow - reduceChildren;
      if (remain > 0) {
        setAdults((a) => Math.max(1, Math.min(a - remain, maxGuests)));
      }
      return c - reduceChildren;
    });
  }, [guestCount, maxGuests]);

  const guestsSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${guestCount} guest${guestCount === 1 ? "" : "s"}`);
    if (infants > 0) parts.push(`${infants} infant${infants === 1 ? "" : "s"}`);
    if (pets > 0) parts.push(`${pets} pet${pets === 1 ? "" : "s"}`);
    return parts.join(", ");
  }, [guestCount, infants, pets]);

  function adjustGuests(
    kind: "adults" | "children" | "infants" | "pets",
    delta: number
  ) {
    if (kind === "adults") {
      setAdults((prev) => {
        const next = prev + delta;
        if (next < 1) return prev;
        if (delta > 0 && (maxGuests <= 0 || prev + children >= maxGuests)) return prev;
        return next;
      });
      return;
    }
    if (kind === "children") {
      setChildren((prev) => {
        const next = prev + delta;
        if (next < 0) return prev;
        if (delta > 0 && (maxGuests <= 0 || adults + prev >= maxGuests)) return prev;
        return next;
      });
      return;
    }
    if (kind === "infants") {
      setInfants((prev) => Math.max(0, Math.min(5, prev + delta)));
      return;
    }
    if (!allowPets) return;
    setPets((prev) => Math.max(0, Math.min(5, prev + delta)));
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
    if (stay.instantBook && !seen.has("instant booking")) {
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

  useEffect(() => {
    const iv = setInterval(
      () => setActivityIdx((i) => (i + 1) % BOOKING_ACTIVITY.length),
      3000
    );
    return () => clearInterval(iv);
  }, []);

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

  const activity = BOOKING_ACTIVITY[activityIdx];
  const activityName = activity.name;
  const activityTime = activity.time;
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

  const ratingBreakdown = useMemo(() => {
    if (listingSettingsReady && enabledRatingCategories.length > 0) {
      return enabledRatingCategories.map((r) => ({
        id: r.id,
        label: r.label,
        score: r.score,
      }));
    }
    return RATING_BREAKDOWN.map((r, i) => ({ id: `default-rc-${i}`, ...r }));
  }, [listingSettingsReady, enabledRatingCategories]);

  const detailReviews = useMemo(() => {
    const fromStay =
      reviewsReady
        ? getPublishedReviewsForListing(stay.id).map((r: StayReview) => ({
            id: r.id,
            name: r.authorName,
            location: "Verified stay",
            rating: r.rating,
            text: r.comment,
            avatar: r.authorName.slice(0, 2).toUpperCase(),
            date: r.createdAt.slice(0, 10),
            helpful: 0,
          }))
        : [];

    if (fromStay.length > 0) return fromStay;

    if (listingSettingsReady && enabledGuestReviews.length > 0) {
      return enabledGuestReviews.map((r) => ({
        id: r.id,
        name: r.name,
        location: r.location,
        rating: r.rating,
        text: r.text,
        avatar: r.avatar,
        date: r.date,
        helpful: r.helpful,
      }));
    }
    return DETAIL_REVIEWS.map((r, i) => ({ id: `default-gr-${i}`, ...r }));
  }, [listingSettingsReady, enabledGuestReviews, stay.id, reviewTick, reviewsReady]);

  function scrollToSection(key: string) {
    setActiveTab(key);
    document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function copyPromo(code: string) {
    navigator.clipboard.writeText(code).catch(() => undefined);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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
    <div className="bg-gray-50 min-h-screen">
      {/* Photo grid — directly under site header */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
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
          <Link href="/listings" className="hover:text-green-700 transition-colors">
            {t("breadcrumbStays")}
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-400">{stayLocation.split(",")[0]}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-800 font-medium">{stayName}</span>
        </div>
      </div>

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
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-display flex items-center gap-2 flex-wrap">
                  {stayName}
                  <VerifiedBadge size="lg" />
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-gray-800">{ratedStay.rating}</span>
                    <span className="text-gray-500">
                      ({ratedStay.reviews} {tc("reviews")})
                      {ratedStay.rating >= 4.5 ? " · Excellent" : ratedStay.rating >= 3.5 ? " · Good" : ""}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-gray-300">·</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {stayLocation}
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
              <span className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-full">
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
              <p
                className={`text-gray-600 text-sm leading-relaxed mb-4 ${
                  !readMore && (!aboutText || aboutText.length > 280) ? "line-clamp-3" : ""
                }`}
              >
                {aboutText || (
                  <>
                    Welcome to <strong>{stayName}</strong>, a sprawling retreat nestled in the lush
                    landscapes of {stayLocation}. Surrounded by nature, this property offers an
                    authentic farm living experience unlike any other. Whether you&apos;re looking for a
                    romantic escape, a family adventure, or a corporate offsite in nature, this farm
                    delivers comfort, privacy, and unforgettable memories.
                  </>
                )}
              </p>
              {!readMore && (!aboutText || aboutText.length > 280) && (
                <button
                  type="button"
                  onClick={() => setReadMore(true)}
                  className="text-green-700 text-sm font-semibold mb-4 hover:underline"
                >
                  {tc("readMore")}
                </button>
              )}
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
            <div className="bg-green-700 rounded-xl px-5 py-3 flex items-center gap-3 mb-5 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                <span className="text-white text-sm font-semibold">Live</span>
              </div>
              <div className="text-green-100 text-sm">
                <strong className="text-white">{activityName}</strong> booked this property{" "}
                <span className="text-green-300">— {activityTime}</span>
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
                  const roomId = room.id ?? "";
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

            {/* Reviews */}
            <section id="section-reviews" className="scroll-mt-28 bg-white rounded-xl border p-6 mb-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900 text-base font-display">{t("reviewsTitle")}</h2>
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <span className="text-2xl font-bold text-gray-900">{ratedStay.rating}</span>
                  <span className="text-gray-400 text-sm">/ 5</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-6">
                {ratingBreakdown.map(({ id, label, score }) => (
                  <div key={id} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${(score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-8 text-end">{score}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
                {detailReviews.map((r) => (
                  <div
                    key={r.id}
                    className="min-w-[280px] max-w-[280px] snap-start border border-gray-200 rounded-xl p-4 shrink-0"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {r.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{r.name}</div>
                        <div className="text-gray-400 text-xs">
                          {r.location} · {r.date}
                        </div>
                      </div>
                    </div>
                    <StarRating rating={r.rating} />
                    <p className="text-gray-600 text-sm leading-relaxed mt-2 mb-2 line-clamp-4">{r.text}</p>
                    <button type="button" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                      <ThumbsUp className="w-3 h-3" /> Helpful ({r.helpful})
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-5 w-full border border-gray-300 hover:border-green-500 text-gray-600 hover:text-green-700 text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                {t("viewAllReviews", { count: ratedStay.reviews })}
              </button>
            </section>

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
              {/* Limited offer */}
              <div id="booking-calculator" className="bg-white rounded-2xl border border-gray-200 shadow-lg p-5 scroll-mt-24">
                <div className="bg-amber-50 border border-amber-200/70 rounded-lg px-3 py-2 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-800 text-xs font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {t("limitedOffer")}
                    </span>
                  </div>
                  <CountdownTimer d={2} h={3} m={24} />
                </div>

                <div className="flex items-baseline gap-2 mb-3 flex-wrap">
                  {displayPrice == null ? (
                    <span className="text-lg font-semibold text-gray-500">
                      Select a room to see the rate
                    </span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-900">
                        {money(displayPrice)}
                      </span>
                      <span className="text-gray-400 text-sm">{tc("perNight")}</span>
                    </>
                  )}
                </div>
                {bookingRooms.length > 0 ? (
                  <p className="text-xs text-gray-500 mb-3">
                    {bookingRooms.length === 1
                      ? `Rate for ${bookingRooms[0].name}`
                      : `${bookingRooms.length} rooms selected · combined nightly rate`}
                  </p>
                ) : (
                  !hasRoomTypes && (
                    <p className="text-xs text-gray-500 mb-3">Property base rate</p>
                  )
                )}
                {!hasRoomTypes && stay.originalPrice && displayPrice != null && (
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
                          datePickerOpen === "checkIn" ? "bg-gray-50" : ""
                        }`}
                      >
                        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">
                          {t("checkIn")}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-sm font-semibold text-gray-800 truncate">
                            {formatDateLabel(checkIn)}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => openDatePicker("checkOut")}
                        className={`p-3 text-start hover:bg-gray-50 transition-colors cursor-pointer ${
                          datePickerOpen === "checkOut" ? "bg-gray-50" : ""
                        }`}
                      >
                        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">
                          {t("checkOut")}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-sm font-semibold text-gray-800 truncate">
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
                            const unavailable =
                              Boolean(availability) &&
                              isDateUnavailable(cell.iso, availability!);
                            const disabled = cell.iso < calendarMinIso || unavailable;
                            const selected =
                              cell.iso ===
                              (datePickerOpen === "checkIn" ? checkIn : checkOut);
                            const inRange =
                              Boolean(checkIn) &&
                              Boolean(checkOut) &&
                              cell.iso > checkIn &&
                              cell.iso < checkOut;
                            return (
                              <button
                                key={cell.iso}
                                type="button"
                                disabled={disabled}
                                onClick={() => selectCalendarDate(cell.iso)}
                                className={`h-9 rounded-lg text-sm tabular-nums transition-colors ${
                                  disabled
                                    ? "text-gray-300 cursor-not-allowed"
                                    : selected
                                      ? "bg-green-600 text-white font-semibold"
                                      : inRange
                                        ? "bg-green-50 text-green-800 font-medium"
                                        : "text-gray-800 hover:bg-gray-100 font-medium"
                                }`}
                              >
                                {cell.day}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-[11px] text-gray-500 text-center">
                          {datePickerOpen === "checkIn"
                            ? "Select check-in date"
                            : "Select check-out date"}
                        </p>
                      </div>
                    )}
                  </div>

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
                              canMinus: adults > 1,
                              canPlus: guestCount < maxGuests,
                            },
                            {
                              key: "children" as const,
                              label: "Children",
                              hint: "Ages 2–12",
                              value: children,
                              canMinus: children > 0,
                              canPlus: guestCount < maxGuests,
                            },
                            {
                              key: "infants" as const,
                              label: "Infants",
                              hint: "Under 2",
                              value: infants,
                              canMinus: infants > 0,
                              canPlus: infants < 5,
                            },
                            {
                              key: "pets" as const,
                              label: "Pets",
                              hint: allowPets ? "Service animals welcome" : undefined,
                              value: pets,
                              canMinus: allowPets && pets > 0,
                              canPlus: allowPets && pets < 5,
                            },
                          ] as const
                        ).map((row) => (
                          <div
                            key={row.key}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{row.label}</p>
                              {row.key === "pets" && !allowPets ? (
                                <p className="text-xs text-gray-500 underline decoration-gray-300">
                                  Bringing a service animal?
                                </p>
                              ) : row.hint ? (
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
                              <>Select at least one room. Guest limit follows room capacity.</>
                            ) : (
                              <>
                                Selected rooms sleep up to {maxGuests} guest
                                {maxGuests === 1 ? "" : "s"} (infants not counted).
                                {guestCount >= maxGuests
                                  ? " Add another room to bring more guests."
                                  : ""}
                              </>
                            )
                          ) : (
                            <>
                              This place has a maximum of {maxGuests} guests, not including
                              infants.
                              {!allowPets ? " Pets aren’t allowed." : ""}
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

                {hasRoomTypes && (
                  <div className="border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
                        Rooms
                      </div>
                      <span className="text-[10px] text-gray-400">
                        Select one or more
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {hostRooms.map((room) => {
                        const id = room.id ?? "";
                        const checked = Boolean(id && bookingRoomIds.includes(id));
                        const label = room.name;
                        const nightly = roomNightly(room);
                        return (
                          <li key={id || room.name}>
                            <label className="flex items-center gap-2.5 cursor-pointer rounded-lg px-1 py-1 hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleBookingRoom(id)}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4"
                              />
                              <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">
                                {label}
                                <span className="block text-[10px] font-normal text-gray-400">
                                  Up to {room.capacity} guests
                                </span>
                              </span>
                              <span className="text-xs font-semibold text-gray-700 tabular-nums shrink-0">
                                {money(nightly)}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    {bookingRooms.length > 0 && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-xs">
                        <span className="text-gray-500">
                          {bookingRooms.length} room{bookingRooms.length === 1 ? "" : "s"} ·
                          sleeps {roomCapacity}
                        </span>
                        <span className="font-bold text-gray-900 tabular-nums">
                          {money(displayPrice ?? 0)} / night
                        </span>
                      </div>
                    )}
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
                        const nights = Math.max(
                          1,
                          Math.round(
                            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
                              (1000 * 60 * 60 * 24)
                          ) || 1
                        );
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
                ) : hasRoomTypes && bookingRooms.length === 0 ? (
                  <span className="w-full block font-bold py-3.5 rounded-xl transition-colors text-center text-sm mb-3 bg-gray-200 text-gray-500 cursor-not-allowed">
                    Choose at least one room
                  </span>
                ) : (
                  <>
                    <CheckAvailabilityLink
                      href={checkoutHref}
                      className="w-full block font-bold py-3.5 rounded-xl transition-colors text-center text-sm mb-2 bg-green-700 hover:bg-green-800 text-white"
                    >
                      {tc("checkAvailability")}
                    </CheckAvailabilityLink>
                    <button
                      type="button"
                      disabled={!checkIn || !checkOut}
                      onClick={() => {
                        if (!checkIn || !checkOut) return;
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

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-orange-500" /> {t("specialOffers")}
                </h3>
                <div className="flex flex-col gap-2">
                  {[
                    { code: "SUMMER25", desc: "Summer Escape — 25% off", exp: "31 Aug 2026" },
                    { code: "LONGSTAY", desc: "Long Stay Offer — 15% off 5+ nights", exp: "30 Sep 2026" },
                  ].map((offer) => (
                    <div key={offer.code} className="bg-white rounded-lg p-3 border border-amber-200">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider">
                          {offer.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyPromo(offer.code)}
                          className="flex items-center gap-1 text-[10px] text-green-700 font-semibold hover:underline"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedCode === offer.code ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{offer.desc}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Expires {offer.exp}</p>
                    </div>
                  ))}
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

      {/* Similar properties — above footer */}
      <section className="border-t border-gray-200 bg-white mt-2">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-display">{t("similarTitle")}</h2>
              <p className="text-gray-500 text-sm mt-0.5">{t("similarSubtitle")}</p>
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
                    <div>
                      <span className="text-green-700 font-bold">{money(s.price)}</span>
                      <span className="text-gray-400 text-xs"> {tc("perNight")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold text-gray-700">{s.rating}</span>
                    </div>
                  </div>
                  <Link
                    href={`/listing/${s.id}`}
                    className="mt-3 block w-full bg-green-700 hover:bg-green-800 text-white text-sm font-semibold py-2 rounded-xl transition-colors text-center"
                  >
                    {tc("bookNow")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
