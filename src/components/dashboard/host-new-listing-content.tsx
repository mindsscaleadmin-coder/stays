"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ImagePlus, MapPin, Pencil, Upload } from "lucide-react";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { ListingFilterFields, ListingPropertyFilterFields } from "@/components/dashboard/listing-filter-fields";
import {
  ListingPhotosManager,
  type ManagedListingPhoto,
} from "@/components/dashboard/listing-photos-manager";
import { useAuth } from "@/components/providers/auth-provider";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useListingQualityRules } from "@/components/providers/listing-quality-rules-provider";
import { filesToDataUrls, getSubmissionById } from "@/lib/listings/submission-data";
import {
  filterHostListings,
  useListingSubmissions,
} from "@/lib/listings/use-listing-submissions";
import { EMPTY_LISTING_FILTERS } from "@/lib/listings/submission-types";
import { resolveHostId, resolveHostName } from "@/lib/listings/host-listings-utils";
import {
  countAmenitySelections,
  listingToFilterValues,
  resolveListingLabels,
  validatePropertyFilterSelections,
} from "@/lib/listings/validate-listing-filters";
import { resolveCountryPricingConfig } from "@/lib/admin/country-utils";
import { DEFAULT_CANCELLATION_POLICY_ID } from "@/lib/booking/policies";
import {
  loadPricingSettings,
  savePricingSettings,
  seedPricingFromListingForm,
  syncRoomPricesFromListing,
} from "@/lib/host/host-pricing-data";
import {
  createEmptyDraftRoom,
  draftRoomPhotosFromListing,
  ListingDraftRoomsEditor,
  ListingPricingModePicker,
  MAX_ROOM_PHOTOS,
  syncDraftRoomGuests,
  type DraftListingRoom,
  type ListingPricingMode,
} from "@/components/dashboard/listing-draft-rooms-panel";
import {
  createEmptyDraftVenueSpace,
  ListingDraftVenueSpacesEditor,
  type DraftVenueSpace,
} from "@/components/dashboard/listing-draft-venue-spaces-panel";
import type { ListingRoom } from "@/lib/listings/submission-types";
import { loadAllSubmissions } from "@/lib/listings/submission-data";
import { parseMapEmbedUrl } from "@/lib/listings/map-embed";
import {
  buildQualityChecklist,
  validateListingQuality,
} from "@/lib/listings/listing-quality-validation";
import {
  getListingMode,
  isVenueDirectoryMode,
  toListingQualityMode,
} from "@/lib/listings/listing-mode";
import { HOST_PROFILES_SYNC_EVENT } from "@/lib/host/host-profile-data";
import {
  defaultExperienceSessions,
  type ExperienceSessionTemplate,
} from "@/lib/booking/experience-session-types";
import {
  ExperienceSessionsDraftEditor,
  validateExperienceSessionsDraft,
} from "@/components/dashboard/experience-sessions-draft-editor";
import { ListingQualityChecklist } from "@/components/dashboard/listing-quality-checklist";
import {
  LISTING_TITLE_MAX_CHARS,
  LISTING_TITLE_MAX_WORDS,
  clampListingTitle,
  listingTitleWordCount,
} from "@/lib/listings/listing-title";
import {
  bedTypeFilterIdSet,
  ListingAdvancedFiltersField,
  splitAdvancedIdsByVenueSection,
  useListingAdvancedFilterRows,
} from "@/components/dashboard/listing-advanced-filters-field";
import { DiningDetailsFields } from "@/components/dashboard/dining-details-fields";
import { DiningFormSection } from "@/components/dashboard/dining-form-section";
import { VenueRulesFields } from "@/components/dashboard/host-venue-listing-sections";
import {
  createEmptyDiningDetails,
  deriveVenueDetailsFromDining,
  hasDiningIndicativePricing,
  hydrateDiningDetails,
  normalizeDiningDetails,
  type DiningDetails,
} from "@/lib/listings/dining-details-types";
import {
  createEmptyVenueDetails,
  hydrateVenueDetails,
  normalizeVenueDetails,
  type VenueDetails,
} from "@/lib/listings/venue-details-types";
import { RichTextEditor } from "@/components/dashboard/rich-text-editor";
import { ListPropertySubscriptionModal } from "@/components/auth/list-property-subscription-modal";
import { HostListingPricingSection } from "@/components/dashboard/host-listing-pricing-section";
import {
  ListingSafetySection,
  hydrateListingSafetyChecklist,
  DEFAULT_SAFETY_CHECKLIST,
} from "@/components/dashboard/listing-safety-section";
import type { ListingSafetyItem } from "@/lib/listings/submission-types";
import {
  buildNewListingPath,
  categoryKeyFromParentName,
  requiresListPropertySubscription,
  resolveListPropertyCategories,
} from "@/lib/host/list-property";

const MAX_PHOTOS = 12;

type ItineraryStep = { step: number; title: string; description?: string };

type HostNewListingQuery = {
  initialParentName?: string;
  showSubscriptionParam?: boolean;
  subscriptionPlan?: string;
  showSavedMessage?: boolean;
  onNavigate?: (href: string) => void;
};

export function HostNewListingContent({
  listingId,
  initialParentName = "",
  showSubscriptionParam = false,
  subscriptionPlan = "",
  showSavedMessage = false,
  onNavigate,
}: {
  listingId?: string;
} & HostNewListingQuery) {
  const { user } = useAuth();
  const { data: taxonomy } = useAdminTaxonomy();
  const { rulesForParent, ready: qualityReady } = useListingQualityRules();
  const { all, submit, update } = useListingSubmissions({ load: true });
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const hostListings = filterHostListings(all, hostId ?? "", hostName);

  const existing = useMemo(() => {
    if (!listingId) return null;
    return (
      hostListings.find((l) => l.id === listingId) ?? getSubmissionById(listingId) ?? null
    );
  }, [hostListings, listingId]);

  const isEdit = Boolean(listingId);
  const wasLive = existing?.status === "approved";

  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef<ManagedListingPhoto[]>([]);
  /** Prevent re-hydration from wiping in-progress edits when listing/taxonomy refs change. */
  const hydratedListingIdRef = useRef<string | null>(null);
  const [photos, setPhotos] = useState<ManagedListingPhoto[]>([]);
  const [managerOpen, setManagerOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [filterValues, setFilterValues] = useState(EMPTY_LISTING_FILTERS);
  const [title, setTitle] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [pricingMode, setPricingMode] = useState<ListingPricingMode>("whole_property");
  const [draftRooms, setDraftRooms] = useState<DraftListingRoom[]>([]);
  const [draftVenueSpaces, setDraftVenueSpaces] = useState<DraftVenueSpace[]>([]);
  const [venueDetails, setVenueDetails] = useState<VenueDetails>(() =>
    createEmptyVenueDetails("event")
  );
  const [diningDetails, setDiningDetails] = useState<DiningDetails>(() =>
    createEmptyDiningDetails()
  );
  const [description, setDescription] = useState("");
  const [mapEmbedInput, setMapEmbedInput] = useState("");
  const [nearbyPlaces, setNearbyPlaces] = useState<{ label: string; duration: string }[]>([
    { label: "", duration: "" },
  ]);
  const [meetingPoint, setMeetingPoint] = useState("");
  const [requirements, setRequirements] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [groupSizeMin, setGroupSizeMin] = useState(1);
  const [itinerary, setItinerary] = useState<ItineraryStep[]>([
    { step: 1, title: "", description: "" },
  ]);
  const [draftSessions, setDraftSessions] = useState<ExperienceSessionTemplate[]>(
    () => defaultExperienceSessions()
  );
  const [safetyChecklist, setSafetyChecklist] = useState<ListingSafetyItem[]>(() =>
    DEFAULT_SAFETY_CHECKLIST.map((item) => ({ ...item }))
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(!listingId);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [parentPrefilled, setParentPrefilled] = useState(false);

  const listPropertyCategories = useMemo(
    () => resolveListPropertyCategories(taxonomy.parents),
    [taxonomy.parents]
  );
  const selectedListCategory = useMemo(() => {
    const key = categoryKeyFromParentName(initialParentName);
    if (!key) return null;
    return listPropertyCategories.find((c) => c.key === key) ?? null;
  }, [initialParentName, listPropertyCategories]);

  const mapEmbedPreview = useMemo(
    () => parseMapEmbedUrl(mapEmbedInput),
    [mapEmbedInput]
  );

  const draftLabels = useMemo(
    () => resolveListingLabels(taxonomy, filterValues),
    [taxonomy, filterValues]
  );

  const draftMode = getListingMode({
    parentCategory: draftLabels.parentCategory,
    type: draftLabels.type,
    category: draftLabels.category,
  });
  const isExperience = draftMode === "experience";
  const isEvent = draftMode === "event";
  const isDining = draftMode === "dining";
  const venueDetailsVariant = isDining ? "dining" : "event";
  const isVenueDirectory = isVenueDirectoryMode(draftMode);
  const showBasePrice = !isExperience && !isVenueDirectory;
  const isStayListing = showBasePrice;

  const countryConfig = useMemo(
    () => resolveCountryPricingConfig(taxonomy.countries, draftLabels.country),
    [taxonomy.countries, draftLabels.country]
  );

  const isMultiRate = pricingMode === "multi_rate_rooms";
  const isVenueMultiRate = isVenueDirectory && isMultiRate && !isDining;
  const isVenueSingleRate = isVenueDirectory && (!isMultiRate || isDining);
  const isVenueForm = isVenueMultiRate || isVenueSingleRate;
  const pricingPickerVariant = isDining ? "dining" : isEvent ? "venue" : "stay";
  const venueOptionsFilterRows = useListingAdvancedFilterRows(
    filterValues,
    "venueOptionsRemainder"
  );
  const venueDetailFilterRows = useListingAdvancedFilterRows(
    filterValues,
    "venueSpaceColumn"
  );
  const diningFilterRows = useListingAdvancedFilterRows(filterValues, "all");

  const venueSubmitFilterValues = useMemo(() => {
    if (!isVenueMultiRate) return filterValues;
    return {
      ...filterValues,
      advancedIds: Array.from(
        new Set([
          ...filterValues.advancedIds,
          ...draftVenueSpaces.flatMap((space) => space.advancedIds ?? []),
        ])
      ),
    };
  }, [isVenueMultiRate, filterValues, draftVenueSpaces]);

  function handlePricingModeChange(mode: ListingPricingMode) {
    setPricingMode(mode);
    if (mode === "multi_rate_rooms") {
      if (isVenueDirectory && draftVenueSpaces.length === 0) {
        setDraftVenueSpaces([createEmptyDraftVenueSpace(venueDetailsVariant)]);
      } else if (!isVenueDirectory && draftRooms.length === 0) {
        setDraftRooms([createEmptyDraftRoom()]);
      }
    }
    if (mode === "whole_property" && isVenueDirectory) {
      if (draftVenueSpaces.length === 0) {
        const space = createEmptyDraftVenueSpace(venueDetailsVariant);
        if (title.trim()) space.name = title.trim();
        setDraftVenueSpaces([space]);
      } else if (draftVenueSpaces.length > 1) {
        const first = draftVenueSpaces[0];
        setDraftVenueSpaces([
          { ...first, name: title.trim() || first.name },
        ]);
      } else if (title.trim() && !draftVenueSpaces[0].name.trim()) {
        setDraftVenueSpaces([{ ...draftVenueSpaces[0], name: title.trim() }]);
      }
    }
  }

  useEffect(() => {
    if (showBasePrice && isMultiRate && draftRooms.length === 0) {
      setDraftRooms([createEmptyDraftRoom()]);
    }
  }, [showBasePrice, isMultiRate, draftRooms.length]);

  useEffect(() => {
    if (isVenueDirectory && draftVenueSpaces.length === 0) {
      setDraftVenueSpaces([createEmptyDraftVenueSpace(venueDetailsVariant)]);
    }
  }, [isVenueDirectory, draftVenueSpaces.length, venueDetailsVariant]);

  useEffect(() => {
    if (!isDining) return;
    if (pricingMode !== "whole_property") {
      setPricingMode("whole_property");
    }
    if (draftVenueSpaces.length > 1) {
      const first = draftVenueSpaces[0];
      setDraftVenueSpaces([{ ...first, name: title.trim() || first.name }]);
    }
  }, [isDining, pricingMode, draftVenueSpaces, title]);

  const wasExperienceRef = useRef(isExperience);
  const wasVenueDirectoryRef = useRef(isVenueDirectory);
  // Clear experience-only fields only when host switches away from Experiences.
  useEffect(() => {
    if (wasExperienceRef.current && !isExperience) {
      setMeetingPoint("");
      setRequirements("");
      setLicenseNumber("");
      setGroupSizeMin(1);
      setItinerary([{ step: 1, title: "", description: "" }]);
    }
    wasExperienceRef.current = isExperience;
  }, [isExperience]);

  useEffect(() => {
    if (wasVenueDirectoryRef.current && !isVenueDirectory) {
      setDraftVenueSpaces([]);
      setVenueDetails(createEmptyVenueDetails("event"));
      setPricingMode("whole_property");
    }
    wasVenueDirectoryRef.current = isVenueDirectory;
  }, [isVenueDirectory]);

  const multiRateRoomPhotoCount = useMemo(
    () => draftRooms.reduce((count, room) => count + room.photos.length, 0),
    [draftRooms]
  );

  const venueSpacePhotoCount = useMemo(
    () => draftVenueSpaces.reduce((count, space) => count + space.photos.length, 0),
    [draftVenueSpaces]
  );

  const amenityCount = useMemo(
    () =>
      countAmenitySelections(
        taxonomy,
        venueSubmitFilterValues.advancedIds,
        existing?.amenities ?? []
      ),
    [taxonomy, venueSubmitFilterValues.advancedIds, existing?.amenities]
  );

  const qualityInput = useMemo(
    () => ({
      title,
      description,
      photoCount:
        photos.length +
        (isMultiRate ? multiRateRoomPhotoCount : 0) +
        (isVenueDirectory ? venueSpacePhotoCount : 0),
      country: draftLabels.country,
      state: draftLabels.state,
      district: draftLabels.district,
      parentCategory: draftLabels.parentCategory,
      category: draftLabels.category,
      subcategory: draftLabels.subcategory,
      type: draftLabels.type,
      listingMode: draftMode,
      highlightCount: filterValues.highlightIds.length,
      featureIconCount: filterValues.featureIconIds.length,
      advancedCount: venueSubmitFilterValues.advancedIds.length,
      amenityCount,
      mapEmbedUrl: mapEmbedPreview ?? "",
      customSelections: filterValues.customSelections,
      customFilters: draftLabels.customFilters,
      meetingPoint,
      requirements,
      itineraryCount: itinerary.filter((s) => s.title.trim()).length,
    }),
    [
      title,
      description,
      photos.length,
      isMultiRate,
      multiRateRoomPhotoCount,
      isVenueDirectory,
      venueSpacePhotoCount,
      draftLabels,
      filterValues,
      venueSubmitFilterValues,
      amenityCount,
      mapEmbedPreview,
      draftMode,
      meetingPoint,
      requirements,
      itinerary,
    ]
  );

  const qualityRules = useMemo(
    () =>
      rulesForParent(
        filterValues.parentId,
        draftLabels.parentCategory,
        taxonomy.parents
      ),
    [
      rulesForParent,
      filterValues.parentId,
      draftLabels.parentCategory,
      taxonomy.parents,
    ]
  );

  const qualityChecklist = useMemo(
    () =>
      buildQualityChecklist(qualityInput, qualityRules, {
        form: "details",
        listingMode: draftMode,
      }),
    [qualityInput, qualityRules, draftMode]
  );

  photosRef.current = photos;

  useEffect(() => {
    if (listingId || parentPrefilled || !initialParentName) return;
    const parent = taxonomy.parents.find(
      (p) => p.name.toLowerCase() === initialParentName.toLowerCase()
    );
    if (!parent) {
      setParentPrefilled(true);
      return;
    }
    setFilterValues((prev) =>
      prev.parentId === parent.id ? prev : { ...prev, parentId: parent.id, categoryId: "", subcategoryId: "" }
    );
    setParentPrefilled(true);
  }, [initialParentName, listingId, parentPrefilled, taxonomy.parents]);

  useEffect(() => {
    if (listingId || !showSubscriptionParam || !selectedListCategory || subscriptionPlan) return;
    if (!requiresListPropertySubscription(selectedListCategory.key)) return;
    setSubscriptionOpen(true);
  }, [listingId, selectedListCategory, showSubscriptionParam, subscriptionPlan]);

  useEffect(() => {
    if (!hostId || !subscriptionPlan) return;
    void fetch(`/api/hosts/${encodeURIComponent(hostId)}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredDirectoryPlanId: subscriptionPlan }),
    }).then(() => {
      window.dispatchEvent(new Event(HOST_PROFILES_SYNC_EVENT));
    });
  }, [hostId, subscriptionPlan]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        if (!photo.persisted && photo.src.startsWith("blob:")) {
          URL.revokeObjectURL(photo.src);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!listingId) {
      hydratedListingIdRef.current = null;
      return;
    }
    if (!existing) {
      setHydrated(true);
      return;
    }
    if (hydratedListingIdRef.current === listingId) return;
    hydratedListingIdRef.current = listingId;

    setTitle(clampListingTitle(existing.title));
    setDescription(existing.description);
    setSafetyChecklist(hydrateListingSafetyChecklist(existing.safetyChecklist));
    setMapEmbedInput(existing.mapEmbedUrl ?? "");
    setNearbyPlaces(
      existing.nearbyPlaces?.length
        ? existing.nearbyPlaces.map((place) => ({
            label: place.label ?? "",
            duration: place.duration ?? "",
          }))
        : [{ label: "", duration: "" }]
    );
    setMeetingPoint(existing.meetingPoint ?? "");
    setRequirements(existing.requirements ?? "");
    setLicenseNumber(existing.licenseNumber ?? "");
    setGroupSizeMin(Math.max(1, existing.groupSizeMin ?? 1));
    setItinerary(
      existing.itinerary?.length
        ? existing.itinerary.map((s, i) => ({
            step: s.step || i + 1,
            title: s.title ?? "",
            description: s.description ?? "",
          }))
        : [{ step: 1, title: "", description: "" }]
    );
    const tags = existing.photoTags ?? [];
    const photoUrls = existing.photoUrls ?? [];
    const listingFilters = listingToFilterValues(taxonomy, existing);
    const pricingCountry = resolveCountryPricingConfig(taxonomy.countries, existing.country);
    const pricing = loadPricingSettings(listingId, pricingCountry);
    const nightly =
      pricing.basePrice > 0
        ? pricing.basePrice
        : Math.max(0, existing.pricePerNight ?? 0);
    setBasePrice(nightly > 0 ? String(nightly) : "");
    const existingMode = getListingMode({
      parentCategory: existing.parentCategory,
      type: existing.type,
      category: existing.category,
    });

    if (existingMode === "event" || existingMode === "dining") {
      const hydratedVenueDetails = hydrateVenueDetails(
        existing.venueDetails,
        existingMode === "dining" ? "dining" : "event"
      );
      setVenueDetails(hydratedVenueDetails);
      if (existingMode === "dining") {
        setDiningDetails(hydrateDiningDetails(existing.diningDetails));
      }
      const eventRooms = existing.rooms ?? [];
      const eventHasMultiRate =
        eventRooms.length > 1 || eventRooms.some((room) => room.price > 0);

      if (eventHasMultiRate && eventRooms.length > 0 && existingMode !== "dining") {
        setPricingMode("multi_rate_rooms");
        const { venueDetails, venueOptions } = splitAdvancedIdsByVenueSection(
          taxonomy,
          listingFilters.advancedIds
        );
        setFilterValues({ ...listingFilters, advancedIds: venueOptions });
        const hydratedVenues = eventRooms.map((room, index) => ({
          key: room.id || `venue-${index}`,
          name: room.name,
          description: room.description ?? "",
          price: room.price > 0 ? String(room.price) : "",
          capacity: Math.max(1, room.capacity),
          photos: draftRoomPhotosFromListing(room, photoUrls, tags),
          advancedIds:
            room.advancedFilterIds ??
            (index === 0 && venueDetails.length > 0 ? venueDetails : []),
          venueDetails: hydrateVenueDetails(
            room.venueDetails ?? (index === 0 ? existing.venueDetails : undefined),
            "event"
          ),
        }));
        setDraftVenueSpaces(hydratedVenues);
        const venuePhotoUrls = new Set(
          hydratedVenues.flatMap((space) => space.photos.map((photo) => photo.preview))
        );
        setPhotos(
          photoUrls
            .map((url, index) => ({ url, tag: tags[index] ?? "" }))
            .filter(({ url }) => !venuePhotoUrls.has(url))
            .map(({ url, tag }, index) => ({
              id: `existing-${index}-${url.slice(0, 24)}`,
              src: url,
              tag,
              persisted: true,
            }))
        );
        setBasePrice("");
        setDraftRooms([]);
      } else {
        setPricingMode("whole_property");
        setFilterValues(listingFilters);
        const startingPrice = Math.max(
          0,
          hydratedVenueDetails.startingPrice ?? existing.pricePerNight ?? nightly
        );
        const singleSpace =
          eventRooms.length === 1
            ? {
                key: eventRooms[0].id || "venue-0",
                name: eventRooms[0].name,
                description: eventRooms[0].description ?? "",
                price: eventRooms[0].price > 0 ? String(eventRooms[0].price) : "",
                capacity: Math.max(1, eventRooms[0].capacity),
                photos: draftRoomPhotosFromListing(eventRooms[0], photoUrls, tags),
                advancedIds: [],
              }
            : {
                key: `venue-${Date.now()}`,
                name: existing.title,
                description: "",
                price: startingPrice > 0 ? String(startingPrice) : "",
                capacity: Math.max(1, hydratedVenueDetails.maxGuests ?? 50),
                photos: [],
                advancedIds: [],
              };
        setDraftVenueSpaces([singleSpace]);
        const spacePhotoUrls = new Set(singleSpace.photos.map((photo) => photo.preview));
        setBasePrice("");
        setPhotos(
          photoUrls
            .map((url, index) => ({ url, tag: tags[index] ?? "" }))
            .filter(({ url }) => !spacePhotoUrls.has(url))
            .map(({ url, tag }, index) => ({
              id: `existing-${index}-${url.slice(0, 24)}`,
              src: url,
              tag,
              persisted: true,
            }))
        );
        setDraftRooms([]);
      }
    } else {
      setFilterValues(listingFilters);
      if ((existing.rooms?.length ?? 0) > 0 && existing.rooms!.some((room) => room.price > 0)) {
      setPricingMode("multi_rate_rooms");
      const bedTypeIds = bedTypeFilterIdSet(taxonomy, listingFilters);
      const hydratedRooms = existing.rooms!.map((room, index) => {
        const maxGuests = Math.max(1, room.capacity);
        return {
          key: room.id || `room-${index}`,
          name: room.name,
          description: room.description ?? "",
          price: room.price > 0 ? String(room.price) : "",
          ...syncDraftRoomGuests(maxGuests),
          beds: room.beds,
          baths: room.baths,
          bedTypeId: room.advancedFilterIds?.find((id) => bedTypeIds.has(id)) ?? "",
          photos: draftRoomPhotosFromListing(room, photoUrls, tags),
        };
      });
      setDraftRooms(hydratedRooms);
      const roomPhotoUrls = new Set(
        hydratedRooms.flatMap((room) => room.photos.map((photo) => photo.preview))
      );
      setPhotos(
        photoUrls
          .map((url, index) => ({ url, tag: tags[index] ?? "" }))
          .filter(({ url }) => !roomPhotoUrls.has(url))
          .map(({ url, tag }, index) => ({
            id: `existing-${index}-${url.slice(0, 24)}`,
            src: url,
            tag,
            persisted: true,
          }))
      );
      } else {
        setPricingMode("whole_property");
        setDraftRooms([]);
        setPhotos(
          photoUrls.map((url, index) => ({
            id: `existing-${index}-${url.slice(0, 24)}`,
            src: url,
            tag: tags[index] ?? "",
            persisted: true,
          }))
        );
      }
    }
    setHydrated(true);
  }, [listingId, existing, taxonomy]);

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;

    setPhotos((prev) => {
      const remaining = MAX_PHOTOS - prev.length;
      const next = incoming.slice(0, Math.max(0, remaining)).map((file) => ({
        id: `new-${file.name}-${file.lastModified}-${Math.random()}`,
        src: URL.createObjectURL(file),
        file,
        tag: "",
        persisted: false,
      }));
      return [...prev, ...next];
    });
    setManagerOpen(true);
  }

  function handlePhotosChange(next: ManagedListingPhoto[]) {
    setPhotos(next);
  }

  async function handleNext(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const listingFilterValues =
      isVenueDirectory
        ? venueSubmitFilterValues
        : showBasePrice && isMultiRate && !isExperience
          ? (() => {
              const bedTypeIds = bedTypeFilterIdSet(taxonomy, filterValues);
              return {
                ...filterValues,
                advancedIds: filterValues.advancedIds.filter((id) => !bedTypeIds.has(id)),
              };
            })()
          : filterValues;

    const labels = resolveListingLabels(taxonomy, listingFilterValues);
    if (showBasePrice && !isMultiRate && !isExperience) {
      const propertyFilterError = validatePropertyFilterSelections(taxonomy, filterValues);
      if (propertyFilterError) {
        setError(propertyFilterError);
        return;
      }
    }
    const mapEmbedUrl = parseMapEmbedUrl(mapEmbedInput);
    if (mapEmbedInput.trim() && !mapEmbedUrl) {
      setError(
        "Map embed looks invalid. Paste a Google Maps embed URL or iframe (Share → Embed a map)."
      );
      return;
    }

    const listingMode = toListingQualityMode({
      parentCategory: labels.parentCategory,
      type: labels.type,
      category: labels.category,
    });
    const qualityError = validateListingQuality(
      {
        title: title.trim(),
        description: description.trim(),
        photoCount:
          photos.length +
          (isMultiRate ? multiRateRoomPhotoCount : 0) +
          (isVenueDirectory ? venueSpacePhotoCount : 0),
        country: labels.country,
        state: labels.state,
        district: labels.district,
        parentCategory: labels.parentCategory,
        category: labels.category,
        subcategory: labels.subcategory,
        type: labels.type,
        listingMode,
        highlightCount: filterValues.highlightIds.length,
        featureIconCount: filterValues.featureIconIds.length,
        advancedCount: venueSubmitFilterValues.advancedIds.length,
        amenityCount,
        mapEmbedUrl: mapEmbedUrl ?? "",
        customSelections: filterValues.customSelections,
        customFilters: labels.customFilters,
        meetingPoint,
        requirements,
        itineraryCount: itinerary.filter((s) => s.title.trim()).length,
      },
      qualityRules,
      {
        form: "details",
        listingMode,
      }
    );
    if (qualityError) {
      setError(qualityError);
      return;
    }

    if (isExperience && !listingId) {
      const sessionError = validateExperienceSessionsDraft(draftSessions);
      if (sessionError) {
        setError(sessionError);
        return;
      }
    }

    if (isVenueForm) {
      if (draftVenueSpaces.length === 0) {
        setError(
          isVenueSingleRate
            ? isDining
              ? "Add restaurant details with at least one photo and dining information below."
              : "Add venue details with a starting rate and at least one photo."
            : `Add at least one ${isDining ? "dining space" : "venue space"} with a name, rate, and photo.`
        );
        return;
      }
      for (let i = 0; i < draftVenueSpaces.length; i++) {
        const space = draftVenueSpaces[i];
        const label = isVenueSingleRate ? (isDining ? "Venue" : "Venue") : `Space ${i + 1}`;
        if (isVenueSingleRate && i === 0 && !title.trim()) {
          setError(`${isDining ? "Venue" : "Venue"}: enter a title.`);
          return;
        }
        if (!isVenueSingleRate && !space.name.trim()) {
          setError(`${label}: enter a name.`);
          return;
        }
        if (isDining) {
          if (!hasDiningIndicativePricing(normalizeDiningDetails(diningDetails))) {
            setError(
              `${label}: add indicative pricing in Dining details (price level or average spend).`
            );
            return;
          }
        } else if (!Number(space.price) || Number(space.price) <= 0) {
          setError(`${label}: enter a ${isVenueSingleRate ? "starting" : "indicative"} rate.`);
          return;
        }
        const spacePhotos = isVenueSingleRate ? photos : space.photos;
        const spacePhotoLimit = isVenueSingleRate ? MAX_PHOTOS : MAX_ROOM_PHOTOS;
        if (spacePhotos.length === 0) {
          setError(`${label}: upload at least one photo.`);
          return;
        }
        if (spacePhotos.length > spacePhotoLimit) {
          setError(`${label}: up to ${spacePhotoLimit} photos.`);
          return;
        }
      }
    }

    if (showBasePrice && isMultiRate) {
      if (draftRooms.length === 0) {
        setError("Add at least one room with its own rate and photo.");
        return;
      }
      for (let i = 0; i < draftRooms.length; i++) {
        const room = draftRooms[i];
        if (!room.name.trim()) {
          setError(`Room ${i + 1}: enter a name.`);
          return;
        }
        if (!Number(room.price) || Number(room.price) <= 0) {
          setError(`Room ${i + 1}: enter a nightly rate.`);
          return;
        }
        if (room.photos.length === 0) {
          setError(`Room ${i + 1}: upload at least one photo.`);
          return;
        }
        if (room.photos.length > MAX_ROOM_PHOTOS) {
          setError(`Room ${i + 1}: up to ${MAX_ROOM_PHOTOS} photos per room.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const photoUrls: string[] = [];
      const photoTags: string[] = [];

      for (const photo of photos) {
        photoTags.push(photo.tag || "");
        if (photo.persisted) {
          photoUrls.push(photo.src);
        } else if (photo.file) {
          const [dataUrl] = await filesToDataUrls([photo.file]);
          photoUrls.push(dataUrl);
        }
      }

      let listingRooms: ListingRoom[] | undefined;
      if (isVenueForm && draftVenueSpaces.length > 0) {
        if (isVenueMultiRate) listingRooms = [];
        for (let i = 0; i < draftVenueSpaces.length; i++) {
          const draft = draftVenueSpaces[i];
          const processedSpacePhotos: { url: string; tag: string }[] = [];
          for (const photo of draft.photos) {
            let url = photo.preview;
            if (photo.file) {
              const [dataUrl] = await filesToDataUrls([photo.file]);
              url = dataUrl ?? url;
            }
            if (!url) continue;
            processedSpacePhotos.push({
              url,
              tag: photo.tag || draft.name.trim(),
            });
          }
          const spaceVenueDetails =
            draft.venueDetails ?? createEmptyVenueDetails(venueDetailsVariant);
          const capacity = Math.max(
            1,
            spaceVenueDetails.maxGuests ?? draft.capacity ?? 50
          );
          if (isVenueMultiRate) {
            listingRooms!.push({
              id: draft.key.startsWith("R-") || draft.key.startsWith("V-")
                ? draft.key
                : `V-${Date.now()}-${i}`,
              name: draft.name.trim(),
              description: draft.description.trim(),
              price: Math.max(0, Number(draft.price) || 0),
              capacity,
              maxAdults: capacity,
              maxChildren: 0,
              maxInfants: 0,
              beds: 1,
              baths: 1,
              img: processedSpacePhotos[0]?.url ?? "",
              typeName: draft.name.trim(),
              advancedFilterIds: draft.advancedIds ?? [],
              venueDetails: normalizeVenueDetails(spaceVenueDetails),
            });
          }
          for (const photo of processedSpacePhotos) {
            photoUrls.push(photo.url);
            photoTags.push(photo.tag);
          }
        }
      } else if (showBasePrice && isMultiRate && draftRooms.length > 0) {
        listingRooms = [];
        for (let i = 0; i < draftRooms.length; i++) {
          const draft = draftRooms[i];
          const processedRoomPhotos: { url: string; tag: string }[] = [];
          for (const photo of draft.photos) {
            let url = photo.preview;
            if (photo.file) {
              const [dataUrl] = await filesToDataUrls([photo.file]);
              url = dataUrl ?? url;
            }
            if (!url) continue;
            processedRoomPhotos.push({
              url,
              tag: photo.tag || draft.name.trim(),
            });
          }
          const maxGuests = Math.max(1, draft.maxGuests);
          listingRooms.push({
            id: `R-${Date.now()}-${i}`,
            name: draft.name.trim(),
            description: draft.description.trim(),
            price: Math.max(0, Number(draft.price) || 0),
            capacity: maxGuests,
            beds: Math.max(1, draft.beds),
            baths: Math.max(1, draft.baths),
            img: processedRoomPhotos[0]?.url ?? "",
            typeName: draft.name.trim(),
            ...(draft.bedTypeId ? { advancedFilterIds: [draft.bedTypeId] } : {}),
          });
          for (const photo of processedRoomPhotos) {
            photoUrls.push(photo.url);
            photoTags.push(photo.tag);
          }
        }
      }

      const parsedBasePrice = Math.max(0, Number(basePrice) || 0);
      const venueStartingPrice = isVenueSingleRate
        ? Math.max(0, Number(draftVenueSpaces[0]?.price) || 0)
        : parsedBasePrice;

      const payload = {
        title:
          clampListingTitle(title).trim() ||
          draftVenueSpaces[0]?.name.trim() ||
          listingRooms?.[0]?.name.trim() ||
          "Untitled listing",
        description: description.trim() || "",
        ...labels,
        photoUrls,
        photoTags,
        photoCount: photoUrls.length,
        highlightIds: filterValues.highlightIds,
        featureIconIds: filterValues.featureIconIds.slice(0, 4),
        mapEmbedUrl: mapEmbedUrl || "",
        nearbyPlaces: nearbyPlaces
          .map((place) => ({
            label: place.label.trim(),
            duration: place.duration.trim(),
          }))
          .filter((place) => place.label && place.duration)
          .slice(0, 4),
        ...(isVenueDirectory
          ? { rooms: isVenueMultiRate ? listingRooms ?? [] : [] }
          : listingRooms?.length
            ? { rooms: listingRooms }
            : {}),
        ...(isExperience
          ? {
              meetingPoint: meetingPoint.trim(),
              requirements: requirements.trim(),
              licenseNumber: licenseNumber.trim() || undefined,
              groupSizeMin: Math.max(1, groupSizeMin),
              itinerary: itinerary
                .filter((s) => s.title.trim())
                .map((s, i) => ({
                  step: i + 1,
                  title: s.title.trim(),
                  description: s.description?.trim() || undefined,
                })),
            }
          : {}),
        ...(isVenueDirectory
          ? {
              venueDetails: normalizeVenueDetails(
                isVenueMultiRate
                  ? {
                      additionalRules: venueDetails.additionalRules,
                      videoTourUrl: venueDetails.videoTourUrl,
                    }
                  : isDining
                    ? deriveVenueDetailsFromDining(
                        normalizeDiningDetails(diningDetails) ?? diningDetails,
                        {
                          ...venueDetails,
                          videoTourUrl: venueDetails.videoTourUrl,
                        }
                      )
                    : {
                        ...venueDetails,
                        ...(isVenueSingleRate && venueStartingPrice > 0
                          ? { startingPrice: venueStartingPrice }
                          : {}),
                      }
              ),
            }
          : {}),
        ...(isDining ? { diningDetails: normalizeDiningDetails(diningDetails) } : {}),
        safetyChecklist,
      };

      let savedId = listingId ?? "";

      if (isEdit && listingId) {
        const ok = await update(listingId, payload);
        if (!ok) {
          setError("Could not update listing. Please try again.");
          setSubmitting(false);
          return;
        }
        savedId = listingId;
      } else {
        savedId = await submit({
          ...payload,
          cancellationPolicyId: DEFAULT_CANCELLATION_POLICY_ID,
          hostId: resolveHostId(user) ?? "demo-host",
          hostName: resolveHostName(user),
        });
      }

      const submitCountryConfig = resolveCountryPricingConfig(
        taxonomy.countries,
        labels.country
      );

      const similarListingIds = loadAllSubmissions()
        .filter(
          (l) =>
            l.id !== savedId &&
            ((labels.country && l.country === labels.country) ||
              (labels.parentCategory && l.parentCategory === labels.parentCategory))
        )
        .map((l) => l.id);

      if (!isEdit) {
        await seedPricingFromListingForm({
          listingId: savedId,
          country: submitCountryConfig,
          similarListingIds,
          seedSessions: isExperience ? draftSessions : undefined,
          initialBasePrice:
            showBasePrice && !isMultiRate && parsedBasePrice > 0
              ? parsedBasePrice
              : isVenueSingleRate && venueStartingPrice > 0
                ? venueStartingPrice
                : undefined,
        });
      } else if (showBasePrice && !isMultiRate) {
        const current = loadPricingSettings(savedId, submitCountryConfig);
        savePricingSettings({
          ...current,
          basePrice: parsedBasePrice,
        });
      } else if (isVenueSingleRate && venueStartingPrice > 0) {
        const current = loadPricingSettings(savedId, submitCountryConfig);
        savePricingSettings({
          ...current,
          basePrice: venueStartingPrice,
        });
      }

      if (listingRooms?.length) {
        syncRoomPricesFromListing(
          savedId,
          listingRooms.map((room) => ({ id: room.id, price: room.price })),
          submitCountryConfig
        );
      }

      setSubmitting(false);

      if (!isEdit) {
        onNavigate?.(`/host/listings/${encodeURIComponent(savedId)}/edit?saved=1`);
        return;
      }

      requestAnimationFrame(() => {
        document
          .getElementById("listing-pricing")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      const fallback = isEdit
        ? "Could not update listing. Please try again."
        : "Could not save listing. Please try again.";
      setError(
        detail && detail !== "Listing request failed" && detail !== "Failed to save listing"
          ? `${fallback} ${detail}`
          : fallback
      );
      setSubmitting(false);
    }
  }

  if (isEdit && hydrated && !existing) {
    return (
      <HostDashboardShell>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Listing not found</h2>
          <p className="text-sm text-gray-500 mb-4">
            This listing may have been removed or the link is invalid.
          </p>
          <Link href="/host/listings" className="text-green-700 font-semibold text-sm hover:underline">
            Back to My Listings
          </Link>
        </div>
      </HostDashboardShell>
    );
  }

  const photosSection = (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <label className="block text-sm font-medium text-gray-700">Photos</label>
        <span className="text-xs text-gray-400">
          {photos.length}/{MAX_PHOTOS} uploaded
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {photos.length === 0 ? (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            dragOver ? "border-green-500 bg-green-50" : "border-amber-300 bg-amber-50/40"
          }`}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — up to {MAX_PHOTOS} photos</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setManagerOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg"
            >
              <Pencil className="w-3.5 h-3.5" />
              Manage photos
            </button>
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-medium border border-gray-200 hover:border-green-400 text-gray-600 px-3 py-1.5 rounded-lg"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                Upload more
              </button>
            )}
            <p className="text-xs text-gray-400">
              {isExperience
                ? "First photo is the cover. Add activity and location photos in Manage photos."
                : "First photo is the cover. Tag rooms and rearrange in Manage photos."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setManagerOpen(true)}
                className="relative group aspect-[4/3] rounded-xl overflow-hidden border bg-gray-100 text-start"
              >
                <Image
                  src={photo.src}
                  alt={`Listing photo ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {index === 0 && (
                  <span className="absolute top-2 start-2 bg-green-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Cover
                  </span>
                )}
                {photo.tag ? (
                  <span className="absolute bottom-2 start-2 end-2 truncate bg-black/65 text-white text-[10px] font-medium px-2 py-0.5 rounded-full text-center">
                    {photo.tag}
                  </span>
                ) : null}
              </button>
            ))}

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-xs font-medium">Add more</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );

  const experienceSection =
    isExperience ? (
      <DiningFormSection
        title="Experience details"
        tier="required"
        description="Guests see these on the listing before they pick a session."
      >
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Meeting point / pickup</span>
          <textarea
            value={meetingPoint}
            onChange={(e) => setMeetingPoint(e.target.value)}
            rows={2}
            className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Hotel lobby pickup within 30 minutes of agreed time"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Requirements / safety</span>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={3}
            className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Age limits, clothing advice, health notes…"
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">License / certification</span>
            <input
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="DCT license number"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Min group size</span>
            <input
              type="number"
              min={1}
              max={50}
              value={groupSizeMin}
              onChange={(e) => setGroupSizeMin(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-700">Itinerary</span>
            <button
              type="button"
              onClick={() =>
                setItinerary((prev) => [
                  ...prev,
                  { step: prev.length + 1, title: "", description: "" },
                ])
              }
              className="text-xs font-semibold text-green-700 hover:text-green-800"
            >
              Add step
            </button>
          </div>
          {itinerary.map((step, index) => (
            <div
              key={`step-${index}`}
              className="grid grid-cols-1 sm:grid-cols-[2rem_1fr] gap-2 items-start border-b border-gray-100 pb-3 last:border-b-0"
            >
              <span className="text-xs font-bold text-green-700 pt-2.5">{index + 1}</span>
              <div className="space-y-2">
                <input
                  value={step.title}
                  onChange={(e) =>
                    setItinerary((prev) =>
                      prev.map((s, i) => (i === index ? { ...s, title: e.target.value } : s))
                    )
                  }
                  placeholder="Pickup from hotel"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <input
                  value={step.description ?? ""}
                  onChange={(e) =>
                    setItinerary((prev) =>
                      prev.map((s, i) =>
                        i === index ? { ...s, description: e.target.value } : s
                      )
                    )
                  }
                  placeholder="Optional detail"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          ))}
        </div>
      </DiningFormSection>
    ) : null;

  const listingBasicsSection = (
    <>
      <div>
        <div
          className={
            showBasePrice && !isMultiRate && !isExperience
              ? "grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_11rem] gap-4"
              : undefined
          }
        >
          <div>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                {isMultiRate ? "Venue Title" : "Title"}
              </label>
              <span className="text-xs text-gray-400">
                {listingTitleWordCount(title)}/{LISTING_TITLE_MAX_WORDS} words
              </span>
            </div>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(clampListingTitle(e.target.value))}
              maxLength={LISTING_TITLE_MAX_CHARS}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder={
                isExperience
                  ? "Sunrise desert safari"
                  : isDining
                    ? "Sunset Farm Table & Kitchen"
                    : isEvent
                      ? "Grand Palace Banquet Hall"
                      : "Green Valley Farmhouse"
              }
            />
          </div>
          {showBasePrice && !isMultiRate && !isExperience && (
            <div>
              <label
                htmlFor="listing-base-price"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Price / night
              </label>
              <div className="flex items-stretch">
                <div className="inline-flex items-center gap-1 rounded-s-lg border border-gray-200 border-e-0 bg-gray-50 px-2.5 text-xs text-gray-700 shrink-0">
                  <span className="font-semibold text-gray-900">{countryConfig.currency}</span>
                  {countryConfig.currencySymbol ? (
                    <span className="text-gray-400">{countryConfig.currencySymbol}</span>
                  ) : null}
                </div>
                <input
                  id="listing-base-price"
                  name="basePrice"
                  type="number"
                  min={0}
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="0"
                  className="w-full min-w-0 border border-gray-200 rounded-e-lg rounded-s-none px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          )}
        </div>
        {showBasePrice && !isMultiRate && !isExperience ? (
          <ListingPropertyFilterFields values={filterValues} onChange={setFilterValues} />
        ) : null}
        <p className="text-xs text-gray-400 mt-1">
          {isMultiRate
            ? isVenueDirectory
              ? isDining
                ? "Overall dining venue name shown on the listing page."
                : "Overall venue name shown on the listing page."
              : "Overall property name shown on the listing page."
            : isExperience
              ? "Clear titles help guests find your experience."
              : "Short titles stay on one line on the listing page."}
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
          {isMultiRate ? "Venue description" : "Description"}
        </label>
        <RichTextEditor
          id="description"
          name="description"
          rows={8}
          value={description}
          onChange={setDescription}
          placeholder={
            isExperience
              ? "Describe what guests will do, see, and take away…"
              : isDining
                ? "Describe your dining experience, menu style, and setting…"
                : "Describe your property..."
          }
        />
      </div>

      <div>
        {isVenueDirectory && !isVenueSingleRate ? (
          <p className="text-xs text-gray-500 mb-1.5">
            {isDining
              ? "Venue overview photos (exterior, dining room, terrace). Space photos go in each space card below."
              : "Venue overview photos (exterior, entrance, common areas). Space photos go in the venue card below."}
          </p>
        ) : null}
        {photosSection}
      </div>
    </>
  );

  return (
    <HostDashboardShell>
      <div className="space-y-6 w-full max-w-none">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-display">
            {isEdit
              ? isExperience
                ? "Edit experience"
                : isDining
                  ? "Edit dining venue"
                  : isEvent
                    ? "Edit event venue"
                    : "Edit listing"
              : isExperience
                ? "New experience"
                : isDining
                  ? "New dining venue"
                  : isEvent
                    ? "New event venue"
                    : "New listing"}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {isEdit
              ? wasLive
                ? isExperience
                  ? "Update details and session pricing on this page. Live listings stay pending until admin re-approves."
                  : isVenueDirectory
                    ? "Update venue details on this page. Live listings stay pending until admin re-approves."
                    : "Update details and pricing on this page. Live listings stay pending until admin re-approves."
                : isExperience
                  ? "Update experience details and session pricing below."
                  : isVenueDirectory
                    ? "Update venue details, spaces, and indicative rates below."
                    : "Update listing details and pricing below."
              : isExperience
                ? "Add experience details, then set session pricing on the same page."
                : isVenueDirectory
                  ? "Add venue details, then choose one venue or multiple dining spaces with indicative rates."
                  : "Add listing details, then set pricing on the same page."}
          </p>
          {!filterValues.parentId && !initialParentName ? (
            <p className="text-xs text-amber-700 mt-2">
              Choose a category below — the form adapts for Stays, Experiences, Events, and Dining.
            </p>
          ) : null}
        </div>
        {isExperience && (
          <div className="bg-green-50 border border-green-200 text-green-950 text-sm rounded-xl px-4 py-3">
            Experiences are booked by session on this platform. Add activity details and session
            times/rates below — guests pay at checkout after picking a date and session.
          </div>
        )}
        {isEvent && (
          <div className="bg-amber-50 border border-amber-200 text-amber-950 text-sm rounded-xl px-4 py-3">
            Events listings appear in the Events section after a yearly subscription. Guests
            contact you directly — we do not take a booking fee.
          </div>
        )}
        {isDining && (
          <div className="bg-amber-50 border border-amber-200 text-amber-950 text-sm rounded-xl px-4 py-3">
            Dining is a subscription listing — guests are not charged for meals or bookings on our
            platform. They must check availability and send a reservation request through us first.
            After you confirm, contact details are shared with the guest. Add indicative pricing,
            menus, hours, and policies below.
          </div>
        )}

        {isEdit && wasLive && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl px-4 py-3">
            This listing is currently live. Saving edits moves it back to{" "}
            <strong>Pending</strong> and hides it from guests until an admin approves the
            changes.
          </div>
        )}

        <form
          ref={formRef}
          className="bg-white rounded-2xl border p-6 space-y-5"
          onSubmit={handleNext}
          noValidate
        >
          <ListingFilterFields
            values={filterValues}
            onChange={setFilterValues}
            hideParent={Boolean(initialParentName)}
            hideSectionHeadings
            hideAdvancedFilters
            renderLayout={({ categoryLocation, extras }) => (
              <>
                {categoryLocation}

                {(showBasePrice || (isVenueDirectory && !isDining)) &&
                  (isStayListing ? (
                    <DiningFormSection
                      className="border-t border-gray-200"
                      title="Pricing mode"
                      tier="required"
                      description="One nightly rate for the whole property, or separate rates per room type."
                    >
                      <ListingPricingModePicker
                        mode={pricingMode}
                        onModeChange={handlePricingModeChange}
                        variant={pricingPickerVariant}
                      />
                    </DiningFormSection>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">How do you charge?</p>
                      <ListingPricingModePicker
                        mode={pricingMode}
                        onModeChange={handlePricingModeChange}
                        variant={pricingPickerVariant}
                      />
                    </div>
                  ))}

                {!isVenueSingleRate ? (
                  isExperience || isStayListing ? (
                    <DiningFormSection
                      className={isStayListing ? undefined : "border-t border-gray-200"}
                      title="Listing basics"
                      tier="required"
                      description={
                        isExperience
                          ? "Title, description, and photos guests see on your experience page."
                          : "Title, description, photos, and property details guests see on your listing."
                      }
                    >
                      {listingBasicsSection}
                    </DiningFormSection>
                  ) : (
                    listingBasicsSection
                  )
                ) : null}

                {showBasePrice && isMultiRate && !isExperience && (
                  <ListingDraftRoomsEditor
                    rooms={draftRooms}
                    onRoomsChange={setDraftRooms}
                    currency={countryConfig.currency}
                    currencySymbol={countryConfig.currencySymbol}
                    filterValues={filterValues}
                  />
                )}

                {experienceSection}

                {isExperience && !listingId ? (
                  <ExperienceSessionsDraftEditor
                    sessions={draftSessions}
                    onChange={setDraftSessions}
                    currency={countryConfig.currency}
                  />
                ) : null}

                <DiningFormSection
                  title="Features & filters"
                  tier="recommended"
                  description="Icons, highlights, and search filters used on your listing and in guest search."
                >
                  <div className="space-y-5">{extras}</div>
                </DiningFormSection>
              </>
            )}
          />

          {showBasePrice ? (
            <DiningFormSection
              title="Property filters"
              tier="recommended"
              description="Amenities and options shown on search and your listing page."
            >
              <ListingAdvancedFiltersField
                values={filterValues}
                onChange={setFilterValues}
                embedded
                excludeBedType={isMultiRate && !isExperience}
              />
            </DiningFormSection>
          ) : null}

          {isVenueForm ? (
            <ListingDraftVenueSpacesEditor
              spaces={draftVenueSpaces}
              onSpacesChange={setDraftVenueSpaces}
              venueDetails={venueDetails}
              onVenueDetailsChange={setVenueDetails}
              currency={countryConfig.currency}
              currencySymbol={countryConfig.currencySymbol}
              variant={venueDetailsVariant}
              singleVenueMode={isVenueSingleRate}
              title={isVenueSingleRate ? title : undefined}
              onTitleChange={isVenueSingleRate ? setTitle : undefined}
              description={isVenueSingleRate ? description : undefined}
              onDescriptionChange={isVenueSingleRate ? setDescription : undefined}
              overviewPhotos={isVenueSingleRate ? photosSection : undefined}
              filterValues={isVenueMultiRate ? filterValues : undefined}
              onFilterValuesChange={isVenueMultiRate ? setFilterValues : undefined}
            />
          ) : null}

          {isVenueDirectory && filterValues.categoryId ? (
            isDining && isVenueSingleRate && diningFilterRows.length > 0 ? (
              <DiningFormSection
                className="border-t border-gray-200"
                title="Search filters"
                tier="required"
                description="Cuisine, setting, meal service, amenities, parking, and rules — each asked once here and used for search and your guest listing page."
              >
                <ListingAdvancedFiltersField
                  values={filterValues}
                  onChange={setFilterValues}
                  placement="all"
                  embedded
                />
              </DiningFormSection>
            ) : !isDining ? (
              <div className="space-y-8 border-t border-gray-100 pt-8">
                {isVenueSingleRate && venueDetailFilterRows.length > 0 ? (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Venue details</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Suitable events, amenities, and facilities for this venue.
                      </p>
                    </div>
                    <ListingAdvancedFiltersField
                      values={filterValues}
                      onChange={setFilterValues}
                      placement="venueSpaceColumn"
                    />
                  </div>
                ) : null}
                {venueOptionsFilterRows.length > 0 ? (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Venue options</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Parking, catering, and rules — configured in Admin → Filter.
                      </p>
                    </div>
                    <ListingAdvancedFiltersField
                      values={filterValues}
                      onChange={setFilterValues}
                      placement="venueOptionsRemainder"
                    />
                  </div>
                ) : null}
              </div>
            ) : null
          ) : null}

          {isDining ? (
            <DiningDetailsFields
              value={diningDetails}
              onChange={setDiningDetails}
              currency={countryConfig.currency}
              currencySymbol={countryConfig.currencySymbol}
            />
          ) : null}

          {isVenueForm ? (
            <VenueRulesFields
              value={venueDetails}
              onChange={setVenueDetails}
              variant={venueDetailsVariant}
            />
          ) : null}

          {isDining || isStayListing ? (
            <DiningFormSection
              title="Map location"
              tier={isDining ? "required" : "recommended"}
              description={
                isDining
                  ? "Required for dining listings. Shown to guests as a location preview only — not interactive. Paste your Google Maps embed code."
                  : "Optional location preview on your listing. Paste your Google Maps embed code."
              }
            >
              <textarea
                value={mapEmbedInput}
                onChange={(e) => setMapEmbedInput(e.target.value)}
                rows={3}
                placeholder='Paste iframe HTML or https://www.google.com/maps/embed?…'
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-y min-h-[72px]"
              />
              {mapEmbedInput.trim() && !mapEmbedPreview ? (
                <p className="text-xs text-amber-700">
                  Could not read an embed URL yet. Use Share → Embed a map (not the normal share
                  link).
                </p>
              ) : null}
              {mapEmbedPreview ? (
                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 bg-white">
                  <iframe
                    title="Map preview"
                    src={mapEmbedPreview}
                    className="absolute inset-0 w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              ) : null}
            </DiningFormSection>
          ) : (
            <div className="space-y-3 border border-gray-100 rounded-xl p-4 bg-gray-50/60">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-700 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Embed map</p>
                </div>
              </div>
              <textarea
                value={mapEmbedInput}
                onChange={(e) => setMapEmbedInput(e.target.value)}
                rows={3}
                placeholder='Paste iframe HTML or https://www.google.com/maps/embed?…'
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-y min-h-[72px]"
              />
              {mapEmbedInput.trim() && !mapEmbedPreview ? (
                <p className="text-xs text-amber-700">
                  Could not read an embed URL yet. Use Share → Embed a map (not the normal share
                  link).
                </p>
              ) : null}
              {mapEmbedPreview ? (
                <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 bg-white">
                  <iframe
                    title="Map preview"
                    src={mapEmbedPreview}
                    className="absolute inset-0 w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              ) : null}
            </div>
          )}

          {isStayListing ? (
            <DiningFormSection
              title="Nearby travel times"
              tier="optional"
              description="Optional. Shown on the listing location section (e.g. Airport — 45 mins). Up to 4 entries."
            >
              <ul className="space-y-2">
                {nearbyPlaces.map((place, index) => (
                  <li key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_auto] gap-2">
                    <input
                      value={place.label}
                      onChange={(e) =>
                        setNearbyPlaces((prev) =>
                          prev.map((row, i) =>
                            i === index ? { ...row, label: e.target.value } : row
                          )
                        )
                      }
                      placeholder="e.g. Airport"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      value={place.duration}
                      onChange={(e) =>
                        setNearbyPlaces((prev) =>
                          prev.map((row, i) =>
                            i === index ? { ...row, duration: e.target.value } : row
                          )
                        )
                      }
                      placeholder="e.g. 45 mins"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setNearbyPlaces((prev) =>
                          prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
                        )
                      }
                      disabled={nearbyPlaces.length <= 1}
                      className="text-xs font-medium text-gray-400 hover:text-red-600 disabled:opacity-40 px-2"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              {nearbyPlaces.length < 4 ? (
                <button
                  type="button"
                  onClick={() =>
                    setNearbyPlaces((prev) =>
                      prev.length < 4 ? [...prev, { label: "", duration: "" }] : prev
                    )
                  }
                  className="text-xs font-semibold text-green-700 hover:text-green-800"
                >
                  + Add travel time
                </button>
              ) : null}
            </DiningFormSection>
          ) : null}

          <ListingSafetySection
            items={safetyChecklist}
            onChange={setSafetyChecklist}
          />

          {qualityChecklist.length > 0 ? (
            <ListingQualityChecklist items={qualityChecklist} />
          ) : null}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={
                submitting ||
                !qualityReady ||
                (isEdit && !hydrated) ||
                qualityChecklist.some((i) => i.required && !i.passed)
              }
              className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              {submitting
                ? "Saving…"
                : isEdit
                  ? "Save details"
                  : isExperience
                    ? "Save & continue to pricing"
                    : "Save & continue to pricing"}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {isEdit
              ? isExperience
                ? "Saves experience details. Session pricing is below — use Save & submit when ready for review."
                : "Saves listing details. Pricing is below — use Save & submit when ready for review."
              : isExperience
                ? "Saves the experience with your session rates. You can refine pricing below after save."
                : "Saves this listing and reveals pricing below. Currency and tax come from the selected country."}
          </p>
        </form>

        {listingId && !isVenueDirectory && (
          <HostListingPricingSection
            listingId={listingId}
            embedded
            initialMessage={
              showSavedMessage
                ? "Listing saved. Set rates below — currency and tax follow the listing country."
                : ""
            }
          />
        )}
      </div>

      <ListingPhotosManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        photos={photos}
        maxPhotos={MAX_PHOTOS}
        onChange={handlePhotosChange}
      />

      <ListPropertySubscriptionModal
        open={subscriptionOpen}
        category={selectedListCategory}
        onClose={() => setSubscriptionOpen(false)}
        onContinue={(planId) => {
          setSubscriptionOpen(false);
          if (selectedListCategory) {
            onNavigate?.(
              buildNewListingPath(selectedListCategory.parentName, { subscriptionPlan: planId })
            );
          }
        }}
      />
    </HostDashboardShell>
  );
}
