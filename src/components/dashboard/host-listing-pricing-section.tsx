"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  BadgeDollarSign,
  BedDouble,
  Loader2,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveCountryPricingConfig } from "@/lib/admin/country-utils";
import {
  resolvePropertyTabId,
  type FilterTab,
} from "@/lib/admin/taxonomy-types";
import {
  filterHostListings,
  resolveHostId,
  resolveHostName,
  useListingSubmissions,
} from "@/lib/listings/use-listing-submissions";
import type { ListingRoom, SubmittedListing } from "@/lib/listings/submission-types";
import {
  readGuestPartyFromFilters,
  writeGuestPartyFilters,
} from "@/lib/listings/guest-capacity";
import { useHostPricing } from "@/lib/host/use-host-pricing";
import { usePlatformConfig } from "@/lib/admin/use-admin-platform-config";
import { clampNightlyPrice } from "@/lib/admin/platform-config-data";
import { openNativeDatePicker } from "@/lib/utils";
import { HostListingPricingExtras } from "@/components/dashboard/host-listing-pricing-extras";
import { getListingMode, toListingQualityMode } from "@/lib/listings/listing-mode";
import {
  defaultExperienceSessions,
  type ExperienceSessionTemplate,
} from "@/lib/booking/experience-session-types";
import { useListingQualityRules } from "@/components/providers/listing-quality-rules-provider";
import {
  buildQualityChecklist,
  qualityInputFromListing,
  validateListingQuality,
} from "@/lib/listings/listing-quality-validation";
import { ListingQualityChecklist } from "@/components/dashboard/listing-quality-checklist";

const fieldClass =
  "w-full border border-gray-200/90 rounded-xl px-3 py-2.5 text-sm bg-white shadow-sm shadow-gray-100/80 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:shadow-none";
const labelClass = "text-xs font-medium text-gray-600 mb-1.5 block";
const sectionClass =
  "bg-white rounded-2xl border border-gray-200/80 shadow-sm shadow-gray-100/60 p-5 sm:p-6 space-y-4";
const sectionIconClass =
  "inline-flex items-center justify-center w-8 h-8 rounded-xl bg-green-50 text-green-700 border border-green-100 shrink-0";

function RateInput({
  value,
  onCommit,
  disabled,
  placeholder,
  min = 0,
  max,
  currency,
  currencySymbol,
  className,
  commitOnType = true,
}: {
  value: number | null | "";
  onCommit: (raw: string) => void;
  disabled?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  currency?: string;
  currencySymbol?: string;
  className?: string;
  commitOnType?: boolean;
}) {
  const [draft, setDraft] = useState(value === null || value === "" ? "" : String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    setDraft(value === null || value === "" ? "" : String(value));
  }, [value]);

  const inputClass = className ?? fieldClass;
  const input = (
    <input
      type="number"
      min={min}
      max={max}
      disabled={disabled}
      placeholder={placeholder}
      value={draft}
      className={currency ? `${inputClass} rounded-s-none border-s-0` : inputClass}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        onCommit(draft);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (commitOnType && raw !== "") onCommit(raw);
      }}
    />
  );

  if (!currency) return input;

  return (
    <div className="flex items-stretch">
      <div className="inline-flex items-center gap-1.5 rounded-s-xl border border-gray-200/90 border-e-0 bg-gray-50/80 px-3 text-sm text-gray-700 shrink-0">
        <span className="font-semibold text-gray-900">{currency}</span>
        {currencySymbol ? <span className="text-gray-400">{currencySymbol}</span> : null}
      </div>
      {input}
    </div>
  );
}

export type HostListingPricingSectionProps = {
  listingId: string;
  /** Inline on the listing form — no hero, property picker, or shell chrome */
  embedded?: boolean;
  listingOptions?: Array<{ id: string; title: string; country?: string; rooms?: ListingRoom[] }>;
  onListingIdChange?: (id: string) => void;
  fromListing?: boolean;
  initialMessage?: string;
  onCancel?: () => void;
  initialRoomId?: string;
};

export function HostListingPricingSection({
  listingId,
  embedded = false,
  listingOptions: listingOptionsProp,
  onListingIdChange,
  fromListing = false,
  initialMessage = "",
  onCancel,
  initialRoomId = "",
}: HostListingPricingSectionProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: taxonomy } = useAdminTaxonomy();
  const { rulesForParent } = useListingQualityRules();
  const platformConfig = usePlatformConfig();
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const { all, update, updateRoomPrice, deleteRoom, ready: listingsReady, setStatus } =
    useListingSubmissions({ load: true });
  const submissions = useMemo(
    () => filterHostListings(all, hostId ?? "", hostName),
    [all, hostId, hostName]
  );

  const bounds = platformConfig.features.hostBounds;

  const listingOptions = useMemo(() => {
    if (listingOptionsProp) return listingOptionsProp;
    return submissions.map((l) => ({
      id: l.id,
      title: l.title,
      country: l.country,
      rooms: l.rooms ?? [],
    }));
  }, [listingOptionsProp, submissions]);

  const [selectedRoomId, setSelectedRoomId] = useState<string>(initialRoomId);
  const [message, setMessage] = useState(initialMessage);

  useEffect(() => {
    if (!initialMessage) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [initialMessage]);

  const selectedListing = useMemo(
    () => listingOptions.find((l) => l.id === listingId),
    [listingOptions, listingId]
  );

  const selectedSubmission = useMemo(
    () => submissions.find((l) => l.id === listingId) ?? null,
    [submissions, listingId]
  );

  const isExperience =
    getListingMode({
      parentCategory: selectedSubmission?.parentCategory,
      type: selectedSubmission?.type,
    }) === "experience";
  const listingMode = getListingMode({
    parentCategory: selectedSubmission?.parentCategory,
    type: selectedSubmission?.type,
    category: selectedSubmission?.category,
  });
  const isDirectory = listingMode === "event" || listingMode === "dining";

  const rooms = useMemo(
    () => selectedListing?.rooms ?? [],
    [selectedListing]
  );

  const findCapacityTab = useCallback((canonicalId: string): FilterTab | null => {
    return (
      taxonomy.mainTabs.find((t) => {
        if (t.enabled === false) return false;
        return t.id === canonicalId || resolvePropertyTabId(t) === canonicalId;
      }) ?? null
    );
  }, [taxonomy.mainTabs]);

  const guestsTab = useMemo(
    () => findCapacityTab("guests") ?? ({ id: "guests", label: "Guests" } satisfies FilterTab),
    [findCapacityTab]
  );

  async function saveListingCustomFilters(
    listing: SubmittedListing,
    customFilters: { label: string; value: string }[],
    successMessage: string
  ) {
    try {
      await saveListingCustomFiltersInner(listing, customFilters);
      flash(successMessage);
    } catch (error) {
      flash(
        error instanceof Error
          ? `Could not save guest capacity: ${error.message}`
          : "Could not save guest capacity."
      );
    }
  }

  async function saveListingCustomFiltersInner(
    listing: SubmittedListing,
    customFilters: { label: string; value: string }[]
  ) {
    await update(listing.id, {
      title: listing.title,
      description: listing.description,
      country: listing.country,
      state: listing.state,
      district: listing.district,
      parentCategory: listing.parentCategory,
      category: listing.category,
      subcategory: listing.subcategory,
      type: listing.type,
      city: listing.city,
      customFilters,
      advancedFilters: listing.advancedFilters ?? [],
      photoUrls: listing.photoUrls ?? [],
      photoTags: listing.photoTags,
      photoCount: listing.photoCount,
      highlightIds: listing.highlightIds,
      featureIconIds: listing.featureIconIds,
      amenities: listing.amenities,
      farmType: listing.farmType,
      farmActivities: listing.farmActivities,
      livestockCrops: listing.livestockCrops,
      houseRules: listing.houseRules,
      cancellationPolicyId: listing.cancellationPolicyId,
    });
  }

  const appliedInitialRoomRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      initialRoomId &&
      appliedInitialRoomRef.current !== initialRoomId &&
      rooms.some((r) => r.id === initialRoomId)
    ) {
      appliedInitialRoomRef.current = initialRoomId;
      setSelectedRoomId(initialRoomId);
      return;
    }
    if (selectedRoomId && !rooms.some((r) => r.id === selectedRoomId)) {
      setSelectedRoomId(rooms[0]?.id ?? "");
    } else if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, initialRoomId, selectedRoomId]);

  const countryConfig = useMemo(
    () => resolveCountryPricingConfig(taxonomy.countries, selectedListing?.country),
    [taxonomy.countries, selectedListing?.country]
  );

  const {
    settings,
    ready,
    saveError,
    save,
    flushSave,
    setRoomPrice,
  } = useHostPricing(listingId, countryConfig);

  const sessions: ExperienceSessionTemplate[] = useMemo(() => {
    const raw = settings?.sessions;
    if (raw?.length) return raw;
    return isExperience ? defaultExperienceSessions() : [];
  }, [settings?.sessions, isExperience]);

  // Persist Morning/Evening defaults so guests see sessions (UI overlay alone is not enough).
  const sessionSeedRef = useRef("");
  useEffect(() => {
    sessionSeedRef.current = "";
  }, [listingId]);
  useEffect(() => {
    if (!ready || !settings || !isExperience || !listingId) return;
    if ((settings.sessions?.length ?? 0) > 0) return;
    if (sessionSeedRef.current === listingId) return;
    sessionSeedRef.current = listingId;
    save({ sessions: defaultExperienceSessions() }, { immediate: true });
  }, [ready, settings, isExperience, listingId, save]);

  function updateSession(
    key: string,
    patch: Partial<ExperienceSessionTemplate>
  ) {
    const next = sessions.map((s) => (s.key === key ? { ...s, ...patch } : s));
    save({ sessions: next }, { immediate: true });
  }

  function addSession() {
    const key = `session-${Date.now().toString(36)}`;
    save(
      {
        sessions: [
          ...sessions,
          {
            key,
            label: "New session",
            startTime: "09:00",
            endTime: "13:00",
            capacity: 6,
            priceMode: "per_person",
            price: 0,
          },
        ],
      },
      { immediate: true }
    );
  }

  function removeSession(key: string) {
    save(
      { sessions: sessions.filter((s) => s.key !== key) },
      { immediate: true }
    );
  }

  // Keep shared pricing.roomPrices aligned with listing rooms (once per room set).
  const roomSyncKey = rooms.map((r) => r.id).join("|");
  const roomSyncDoneRef = useRef("");
  useEffect(() => {
    roomSyncDoneRef.current = "";
  }, [listingId]);
  useEffect(() => {
    if (!settings || !listingId || rooms.length === 0) return;
    const stamp = `${listingId}:${roomSyncKey}`;
    if (roomSyncDoneRef.current === stamp) return;
    const missing = rooms.filter((room) => !settings.roomPrices.some((r) => r.roomId === room.id));
    const pruned = settings.roomPrices.filter((r) => rooms.some((room) => room.id === r.roomId));
    roomSyncDoneRef.current = stamp;
    if (missing.length === 0 && pruned.length === settings.roomPrices.length) return;
    save({
      roomPrices: [
        ...pruned,
        ...missing.map((room) => ({
          roomId: room.id,
          basePrice: Math.max(0, room.price || settings.basePrice),
          weekendPrice: null,
          monthlyPrice: null,
        })),
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, roomSyncKey, ready]);

  function roomRate(room: ListingRoom) {
    const stored = settings?.roomPrices.find((r) => r.roomId === room.id);
    return {
      basePrice: stored?.basePrice ?? room.price ?? settings?.basePrice ?? 0,
      weekendPrice: stored?.weekendPrice ?? null,
      monthlyPrice: stored?.monthlyPrice ?? null,
    };
  }

  const roomPriceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleRoomBasePrice(room: ListingRoom, value: string) {
    const price = clampNightlyPrice(Math.max(0, Number(value) || 0));
    setRoomPrice(room.id, { basePrice: price, weekendPrice: null, monthlyPrice: null });
    if (roomPriceTimer.current) clearTimeout(roomPriceTimer.current);
    roomPriceTimer.current = setTimeout(() => {
      void updateRoomPrice(listingId, room.id, price);
    }, 400);
  }

  const [submittingReview, setSubmittingReview] = useState(false);

  function flash(text: string, ms = 2500) {
    setMessage(text);
    setTimeout(() => setMessage(""), ms);
  }

  async function handleSubmitForReview() {
    if (!listingId) {
      flash("Select a listing before submitting.");
      return;
    }

    if (selectedSubmission) {
      const listingMode = toListingQualityMode({
        parentCategory: selectedSubmission.parentCategory,
        type: selectedSubmission.type,
        category: selectedSubmission.category,
      });
      const qualityRules = rulesForParent(
        undefined,
        selectedSubmission.parentCategory,
        taxonomy.parents
      );
      // Pricing is step 2 of the create flow, so only the details-form rules can
      // be met yet. Manage-form rules (rooms, amenities, farm info) are enforced
      // on the manage screen and shown to admin in the review queue.
      const qualityError = validateListingQuality(
        qualityInputFromListing(
          {
            ...selectedSubmission,
            listingMode,
          },
          taxonomy
        ),
        qualityRules,
        { listingMode, form: "details" }
      );
      if (qualityError) {
        flash(`Finish listing quality requirements first: ${qualityError}`, 8000);
        return;
      }
      if (listingMode === "experience") {
        const liveSessions = settings?.sessions?.length
          ? settings.sessions
          : sessions;
        if (!liveSessions.length) {
          flash("Add at least one experience session before submitting.", 8000);
          return;
        }
      }
    }

    setSubmittingReview(true);
    try {
      if (typeof document !== "undefined") {
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
      await Promise.resolve();
      await flushSave();
      const ok = await setStatus(listingId, "pending");
      if (!ok) throw new Error("status");
      router.push("/host/listings?submitted=1");
    } catch (error) {
      flash(
        error instanceof Error && error.message !== "status"
          ? `Could not save and submit: ${error.message}`
          : "Could not save and submit. Please try again.",
        8000
      );
      setSubmittingReview(false);
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    if (fromListing && !embedded) {
      router.push(`/host/listings/${listingId}/edit`);
      return;
    }
    router.push("/host/listings");
  }

  async function handleDeleteRoom(room: ListingRoom) {
    if (!confirm(`Remove “${room.name}” from this property?`)) return;
    const ok = await deleteRoom(listingId, room.id);
    if (!ok) {
      flash("Could not remove room.");
      return;
    }
    if (selectedRoomId === room.id) {
      const remaining = rooms.filter((r) => r.id !== room.id);
      setSelectedRoomId(remaining[0]?.id ?? "");
    }
    flash(`“${room.name}” removed.`);
  }

  const qualityChecklist = useMemo(() => {
    if (!selectedSubmission) return [];
    const listingMode = toListingQualityMode({
      parentCategory: selectedSubmission.parentCategory,
      type: selectedSubmission.type,
      category: selectedSubmission.category,
    });
    const qualityRules = rulesForParent(
      undefined,
      selectedSubmission.parentCategory,
      taxonomy.parents
    );
    return buildQualityChecklist(
      qualityInputFromListing(
        {
          ...selectedSubmission,
          listingMode,
        },
        taxonomy
      ),
      qualityRules,
      { listingMode, form: "details" }
    );
  }, [selectedSubmission, taxonomy, rulesForParent]);

  if (!listingsReady || !ready || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  const showPropertyPicker =
    Boolean(onListingIdChange) &&
    listingOptions.length > 1 &&
    (isExperience || rooms.length > 0);

  const showPricingExtras = embedded || !fromListing;

  return (
      <div id="listing-pricing" className="space-y-5 sm:space-y-6">
        {!isDirectory && embedded && (
          <div className="pt-2 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 font-display">
              {isExperience ? "Session pricing" : "Pricing"}
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              {isExperience
                ? "Set session times, capacity, and rates. Currency and tax follow the listing country."
                : "Set rates, discounts, and extra charges below."}
            </p>
          </div>
        )}
        {!isDirectory && !embedded && (
          <div className="relative overflow-hidden rounded-2xl border border-green-100/80 bg-gradient-to-br from-green-50 via-white to-emerald-50/40 px-5 py-5 sm:px-6 sm:py-6">
            <div
              className="pointer-events-none absolute -end-8 -top-10 h-36 w-36 rounded-full bg-green-200/30 blur-2xl"
              aria-hidden
            />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-green-700/80 mb-1.5">
                {fromListing
                  ? isExperience
                    ? "Step 2 of 2 — Session pricing"
                    : "Step 2 of 2 — Pricing"
                  : "Host tools"}
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-display tracking-tight">
                {isExperience ? "Session pricing" : "Pricing"}
              </h2>
              <p className="text-gray-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
                {isExperience
                  ? "Set session times, capacity, and per-person or per-group rates. Currency and tax follow the listing's country from Admin → Countries."
                  : "Set rates, discounts, and extra charges. Currency and tax follow the listing's country from Admin → Countries."}
              </p>
            </div>
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl px-4 py-3 shadow-sm shadow-red-100/50">
            Pricing did not save: {saveError}. Your changes are kept in this
            browser — fix the issue and edit any field to retry.
          </div>
        )}

        {isDirectory && (
          <div className="bg-amber-50 border border-amber-200 text-amber-950 text-sm rounded-xl px-4 py-3">
            {listingMode === "dining"
              ? "Dining listings are a yearly-subscription directory. Guests enquire directly — indicative rates are not charged on this platform."
              : "Events listings are a yearly-subscription directory. Guests contact you directly — these rates are not charged on this platform."}
          </div>
        )}

        {/* Property + base pricing (whole-property rate or experience sessions) */}
        {!isDirectory && (isExperience || rooms.length === 0) && (
        <section className={sectionClass}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={sectionIconClass}>
                <BadgeDollarSign className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {isExperience ? "Session pricing" : "Base pricing"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isExperience
                    ? "Named sessions guests book (Morning, Evening, …) with capacity and per-person or per-group price."
                    : "No rooms yet — this nightly rate is what guests see on the listing and calculator."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            {showPropertyPicker && (
              <label className="block flex-1 min-w-0">
                <span className={labelClass}>{isExperience ? "Listing" : "Property"}</span>
                <select
                  value={listingId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    onListingIdChange?.(nextId);
                    const nextRooms =
                      listingOptions.find((l) => l.id === nextId)?.rooms ?? [];
                    setSelectedRoomId(nextRooms[0]?.id ?? "");
                  }}
                  className={fieldClass}
                >
                  {listingOptions.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                      {(l.rooms?.length ?? 0) > 0
                        ? ` · ${l.rooms!.length} room${l.rooms!.length === 1 ? "" : "s"}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!isExperience && rooms.length === 0 && (
            <label className="block w-full sm:w-64 shrink-0">
              <span className={labelClass}>
                Base nightly rate
              </span>
              <RateInput
                min={bounds.minNightlyPrice || 0}
                currency={settings.currency}
                currencySymbol={countryConfig.currencySymbol}
                value={settings.basePrice}
                onCommit={(raw) => {
                  save({
                    basePrice: clampNightlyPrice(Math.max(0, Number(raw) || 0)),
                    weekendPrice: null,
                    monthlyPrice: null,
                  });
                }}
              />
            </label>
            )}
          </div>

          {isExperience && (
            <div className="space-y-3 pt-2">
              {sessions.map((session) => {
                const party =
                  session.priceMode === "per_person"
                    ? readGuestPartyFromFilters(
                        selectedSubmission?.customFilters,
                        session.capacity || 2
                      )
                    : null;
                const saveParty = (next: NonNullable<typeof party>) => {
                  if (!selectedSubmission || !guestsTab) return;
                  void saveListingCustomFilters(
                    selectedSubmission,
                    writeGuestPartyFilters(
                      selectedSubmission.customFilters ?? [],
                      next,
                      guestsTab.label
                    ),
                    "Guest capacity updated."
                  );
                  updateSession(session.key, {
                    capacity: Math.max(1, next.total),
                  });
                };

                return (
                  <div
                    key={session.key}
                    className="rounded-2xl border border-gray-200/90 bg-white p-4 sm:p-5 space-y-4 shadow-sm shadow-gray-100/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <input
                        value={session.label}
                        onChange={(e) =>
                          updateSession(session.key, { label: e.target.value })
                        }
                        className={`${fieldClass} max-w-sm font-semibold`}
                        placeholder="Morning"
                        aria-label="Session name"
                      />
                      <button
                        type="button"
                        onClick={() => removeSession(session.key)}
                        className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700 inline-flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <div className="grid grid-cols-5 gap-2 sm:gap-3 min-w-[36rem] lg:min-w-0">
                        <label className="block min-w-0 cursor-pointer">
                          <span className={labelClass}>Start</span>
                          <input
                            type="time"
                            value={session.startTime}
                            onChange={(e) =>
                              updateSession(session.key, { startTime: e.target.value })
                            }
                            onClick={openNativeDatePicker}
                            className={`${fieldClass} cursor-pointer relative [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
                          />
                        </label>
                        <label className="block min-w-0 cursor-pointer">
                          <span className={labelClass}>End</span>
                          <input
                            type="time"
                            value={session.endTime}
                            onChange={(e) =>
                              updateSession(session.key, { endTime: e.target.value })
                            }
                            onClick={openNativeDatePicker}
                            className={`${fieldClass} cursor-pointer relative [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
                          />
                        </label>
                        <label className="block min-w-0">
                          <span className={labelClass}>Price mode</span>
                          <select
                            value={session.priceMode}
                            onChange={(e) => {
                              const priceMode = e.target.value as "per_person" | "per_group";
                              const nextParty = readGuestPartyFromFilters(
                                selectedSubmission?.customFilters,
                                session.capacity
                              );
                              updateSession(session.key, {
                                priceMode,
                                ...(priceMode === "per_person"
                                  ? { capacity: Math.max(1, nextParty.total) }
                                  : {}),
                              });
                            }}
                            className={fieldClass}
                          >
                            <option value="per_person">Per person</option>
                            <option value="per_group">Per group</option>
                          </select>
                        </label>
                        <label className="block min-w-0">
                          <span className={labelClass}>Capacity</span>
                          <input
                            type="number"
                            min={1}
                            value={session.capacity}
                            onChange={(e) => {
                              const capacity = Math.max(1, Number(e.target.value) || 1);
                              updateSession(session.key, { capacity });
                              if (session.priceMode === "per_person" && party) {
                                saveParty({
                                  ...party,
                                  total: capacity,
                                  adults: Math.min(party.adults, capacity),
                                  children: Math.min(party.children, capacity),
                                });
                              }
                            }}
                            className={fieldClass}
                          />
                        </label>
                        <label className="block min-w-0">
                          <span className={labelClass}>
                            Price ({settings.currency}
                            {session.priceMode === "per_person" ? "/person" : "/group"})
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={session.price}
                            onChange={(e) =>
                              updateSession(session.key, {
                                price: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className={fieldClass}
                          />
                        </label>
                      </div>
                    </div>

                    {session.priceMode === "per_person" && party && guestsTab ? (
                      <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 sm:p-4 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">
                            {guestsTab.label} mix
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                            Caps within Capacity above. Infants are separate and do not count
                            toward the total.
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-xl">
                          {(
                            [
                              { key: "adults" as const, label: "Max adults", min: 0 },
                              { key: "children" as const, label: "Max children", min: 0 },
                              {
                                key: "infants" as const,
                                label: "Max infants",
                                min: 0,
                                absMax: 10,
                              },
                            ] as const
                          ).map((row) => {
                            const max = row.key === "infants" ? row.absMax : party.total;
                            const options: number[] = [];
                            for (let n = row.min; n <= max; n++) options.push(n);
                            return (
                              <label key={row.key} className="block min-w-0">
                                <span className="block text-[10px] font-medium text-gray-500 mb-1.5">
                                  {row.label}
                                </span>
                                <select
                                  id={`session-${session.key}-guests-${row.key}`}
                                  value={String(Math.min(party[row.key], max))}
                                  disabled={!selectedSubmission}
                                  onChange={(e) => {
                                    const value = Math.max(
                                      row.min,
                                      Math.min(max, Number(e.target.value) || row.min)
                                    );
                                    saveParty({ ...party, [row.key]: value });
                                  }}
                                  className={fieldClass}
                                >
                                  {options.map((n) => (
                                    <option key={n} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addSession}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
              >
                <Plus className="w-4 h-4" /> Add session
              </button>
            </div>
          )}

        </section>
        )}

        {!isExperience && rooms.length > 0 && (
          <section className={sectionClass}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className={sectionIconClass}>
                  <BedDouble className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Added rooms ({rooms.length})
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Each row has its own nightly rate. Select a room to edit discounts below.
                  </p>
                </div>
              </div>
            </div>
            <ul className="space-y-2.5">
              {rooms.map((room) => {
                const rate = roomRate(room);
                const isActive = selectedRoomId === room.id;
                return (
                  <li
                    key={room.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 border rounded-2xl p-3.5 transition-colors ${
                      isActive
                        ? "border-green-300 bg-green-50/50 shadow-sm shadow-green-100/60"
                        : "border-gray-100 bg-gray-50/40 hover:border-gray-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedRoomId(room.id)}
                      className="flex-1 min-w-0 text-left flex items-center gap-3"
                    >
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200/80 shrink-0">
                        {room.img ? (
                          <Image
                            src={room.img}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="56px"
                            unoptimized
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <BedDouble className="w-5 h-5" />
                          </span>
                        )}
                      </div>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-gray-900 truncate">{room.name}</span>
                        <span className="block text-xs text-gray-500 mt-0.5">
                          {room.typeName && room.typeName !== room.name ? `${room.typeName} · ` : ""}
                          {room.capacity} guests · {room.beds} beds · {room.baths} baths
                          {(room.maxAdults != null ||
                            room.maxChildren != null ||
                            room.maxInfants != null) && (
                            <span className="text-gray-400">
                              {" "}
                              · {room.maxAdults ?? room.capacity}a
                              {(room.maxChildren ?? 0) > 0 ? `/${room.maxChildren}c` : ""}
                              {(room.maxInfants ?? 0) > 0 ? `/${room.maxInfants}i` : ""}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                    <div
                      className="flex items-center gap-2 flex-wrap sm:flex-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="block">
                        <span className="sr-only">Nightly rate ({settings.currency})</span>
                        <RateInput
                          min={bounds.minNightlyPrice || 0}
                          value={rate.basePrice}
                          commitOnType={false}
                          onCommit={(raw) => handleRoomBasePrice(room, raw)}
                          className="w-28 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(room)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label={`Delete ${room.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {showPricingExtras && settings && (
          <HostListingPricingExtras
            settings={settings}
            onSave={save}
            isExperience={isExperience}
            hostId={hostId ?? undefined}
            currencySymbol={countryConfig.currencySymbol}
          />
        )}

        {/* Tax — checkout only; Events are enquire-only */}
        {!isDirectory && (
        <section className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-green-700" />
              <h3 className="text-sm font-semibold text-gray-900">Currency & tax</h3>
            </div>
            <p className="text-xs font-semibold text-gray-500">From country settings</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Tax rate</span>
              <div className="w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700">
                {settings.taxPct}%
              </div>
            </div>
            <div className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Tax label</span>
              <div className="w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-700">
                {settings.taxLabel}
              </div>
            </div>
            <div className="flex items-end pb-0.5">
              <p className="text-xs text-gray-400">
                {settings.taxLabel} at {settings.taxPct}% is added to the guest total at checkout.
                Currency and tax follow the listing country.
              </p>
            </div>
          </div>
        </section>
        )}

        {qualityChecklist.length > 0 ? (
          <ListingQualityChecklist items={qualityChecklist} />
        ) : null}

        <div className="bg-white rounded-2xl border p-5 space-y-3">
          {message && (
            <p
              role="status"
              aria-live="polite"
              className="bg-amber-50 border border-amber-200 text-amber-950 text-sm rounded-xl px-4 py-3"
            >
              {message}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSubmitForReview()}
              disabled={submittingReview}
              className="bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              {submittingReview ? "Saving & submitting…" : "Save & submit"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={submittingReview}
              className="border border-gray-300 hover:border-gray-400 text-gray-600 font-medium px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Save & submit writes the rate and discounts, then sends the listing to the admin
            approval queue. Cancel returns to{" "}
            {embedded ? "My Listings" : fromListing ? "the listing form" : "My Listings"}.
          </p>
        </div>
      </div>
  );
}
