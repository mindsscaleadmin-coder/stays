"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  BadgeDollarSign,
  BedDouble,
  CalendarRange,
  Loader2,
  Percent,
  Plus,
  Power,
  ReceiptText,
  Trash2,
  Users,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { HostDashboardShell } from "@/components/dashboard/host-dashboard-shell";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { resolveCountryPricingConfig } from "@/lib/admin/country-utils";
import {
  resolvePropertyTabId,
  DEFAULT_CUSTOM_ITEMS,
  type FilterTab,
} from "@/lib/admin/taxonomy-types";
import {
  filterHostListings,
  resolveHostId,
  resolveHostName,
  useListingSubmissions,
} from "@/lib/listings/use-listing-submissions";
import type { ListingRoom, SubmittedListing } from "@/lib/listings/submission-types";
import { useHostPricing } from "@/lib/host/use-host-pricing";
import { useHostExtraLibrary } from "@/lib/host/use-host-extra-library";
import { usePlatformConfig } from "@/lib/admin/use-admin-platform-config";
import { clampNightlyPrice } from "@/lib/admin/platform-config-data";
import {
  EXTRA_CHARGE_BILLING_LABELS,
  type ExtraChargeBilling,
} from "@/lib/admin/extra-charges-catalog-types";
import {
  normalizeExtraChargeBilling,
  type ExtraCharge,
} from "@/lib/host/host-pricing-types";

const fieldClass =
  "w-full border border-gray-200/90 rounded-xl px-3 py-2.5 text-sm bg-white shadow-sm shadow-gray-100/80 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:shadow-none";
const labelClass = "text-xs font-medium text-gray-600 mb-1.5 block";
const sectionClass =
  "bg-white rounded-2xl border border-gray-200/80 shadow-sm shadow-gray-100/60 p-5 sm:p-6 space-y-4";
const sectionIconClass =
  "inline-flex items-center justify-center w-8 h-8 rounded-xl bg-green-50 text-green-700 border border-green-100 shrink-0";

/** Common stay extras — simple toggle + price on Pricing */
const COMMON_STAY_EXTRAS = [
  {
    key: "extra-bed-breakfast",
    label: "Extra bed with breakfast",
    billing: "per_night" as ExtraChargeBilling,
    defaultAmount: 150,
    hint: "Bed + breakfast for one extra guest, charged per night",
  },
  {
    key: "extra-bed",
    label: "Extra bed",
    billing: "per_night" as ExtraChargeBilling,
    defaultAmount: 100,
    hint: "Extra bed only, per night",
  },
  {
    key: "breakfast",
    label: "Breakfast",
    billing: "per_person_per_night" as ExtraChargeBilling,
    defaultAmount: 45,
    hint: "Breakfast only, per person per night",
  },
] as const;

function commonCatalogId(key: string) {
  return `common:${key}`;
}

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

export function HostPricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { data: taxonomy } = useAdminTaxonomy();
  const platformConfig = usePlatformConfig();
  const hostId = resolveHostId(user);
  const hostName = resolveHostName(user);
  const { all, update, updateRoomPrice, deleteRoom, ready: listingsReady, setStatus } =
    useListingSubmissions();
  const submissions = filterHostListings(all, hostId ?? "", hostName);

  const bounds = platformConfig.features.hostBounds;
  const dynamicPricingOn = platformConfig.features.hostFeatures.dynamicPricing;
  const allowSeasonal = dynamicPricingOn && bounds.allowSeasonalPricing;
  const allowDiscounts = dynamicPricingOn && bounds.allowDiscounts;
  const allowExtraCharges = bounds.allowExtraCharges;

  const listingOptions = useMemo(
    () =>
      submissions.map((l) => ({
        id: l.id,
        title: l.title,
        country: l.country,
        rooms: l.rooms ?? [],
      })),
    [submissions]
  );

  const initialListingId =
    searchParams.get("listing") ?? listingOptions[0]?.id ?? "";

  const fromListing = searchParams.get("from") === "listing";

  const [listingId, setListingId] = useState(initialListingId);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    searchParams.get("room") ?? ""
  );
  const [message, setMessage] = useState(
    fromListing
      ? "Listing saved. Pricing was filled from the listing country and a similar property when available."
      : ""
  );

  useEffect(() => {
    if (!fromListing) return;
    const t = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(t);
  }, [fromListing]);

  const [newSeason, setNewSeason] = useState({ name: "", startDate: "", endDate: "", price: "" });
  const [newCharge, setNewCharge] = useState({
    label: "",
    amount: "",
    billing: "per_stay" as ExtraChargeBilling,
    saveToLibrary: true,
  });

  const {
    items: savedExtras,
    add: addSavedExtra,
    remove: removeSavedExtra,
  } = useHostExtraLibrary(hostId);

  const selectedListing = useMemo(
    () => listingOptions.find((l) => l.id === listingId),
    [listingOptions, listingId]
  );

  const selectedSubmission = useMemo(
    () => submissions.find((l) => l.id === listingId) ?? null,
    [submissions, listingId]
  );

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

  const optionsForTab = useCallback((tab: FilterTab | null, canonicalId?: string) => {
    if (!tab && !canonicalId) return [];
    const tabId = tab?.id ?? canonicalId!;
    const fromTaxonomy = [...(taxonomy.customItems[tabId] ?? [])]
      .filter((i) => i.enabled !== false)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
      );
    if (fromTaxonomy.length > 0) return fromTaxonomy;
    const defaults = canonicalId ? DEFAULT_CUSTOM_ITEMS[canonicalId] : undefined;
    return defaults ? [...defaults] : [];
  }, [taxonomy.customItems]);

  function selectedIdForTab(tab: FilterTab | null, options: { id: string; name: string }[]) {
    if (!selectedSubmission || !tab) return "";
    const saved = (selectedSubmission.customFilters ?? []).find(
      (f) => f.label === tab.label || (tab.id === "guests" && /^guests?$/i.test(f.label))
    );
    if (!saved?.value) return "";
    return (
      options.find((o) => o.name.toLowerCase() === saved.value.trim().toLowerCase())?.id ??
      ""
    );
  }

  const bedsTab = useMemo(() => findCapacityTab("beds"), [findCapacityTab]);
  const bathsTab = useMemo(() => findCapacityTab("baths"), [findCapacityTab]);
  const guestsTab = useMemo(
    () => findCapacityTab("guests") ?? ({ id: "guests", label: "Guests" } satisfies FilterTab),
    [findCapacityTab]
  );
  const bedsOptions = useMemo(
    () => optionsForTab(bedsTab, "beds"),
    [bedsTab, optionsForTab]
  );
  const bathsOptions = useMemo(
    () => optionsForTab(bathsTab, "baths"),
    [bathsTab, optionsForTab]
  );
  const guestsOptions = useMemo(
    () => optionsForTab(guestsTab, "guests"),
    [guestsTab, optionsForTab]
  );

  async function saveListingCustomFilters(
    listing: SubmittedListing,
    customFilters: { label: string; value: string }[],
    successMessage: string
  ) {
    const ok = await update(listing.id, {
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
    if (ok) flash(successMessage);
  }

  async function handleCustomTabChange(tab: FilterTab | null, itemId: string) {
    if (!selectedSubmission || !tab) return;
    const options = optionsForTab(tab);
    const item = options.find((o) => o.id === itemId);
    const without = (selectedSubmission.customFilters ?? []).filter(
      (f) => f.label !== tab.label
    );
    const customFilters = item
      ? [...without, { label: tab.label, value: item.name }]
      : without;
    await saveListingCustomFilters(
      selectedSubmission,
      customFilters,
      item ? `${tab.label} set to “${item.name}”.` : `${tab.label} cleared.`
    );
  }

  useEffect(() => {
    const fromUrl = searchParams.get("listing");
    if (fromUrl && listingOptions.some((l) => l.id === fromUrl)) {
      setListingId(fromUrl);
    } else if (!listingOptions.some((l) => l.id === listingId) && listingOptions[0]) {
      setListingId(listingOptions[0].id);
    }
  }, [listingId, listingOptions, searchParams]);

  useEffect(() => {
    const fromUrl = searchParams.get("room");
    if (fromUrl && rooms.some((r) => r.id === fromUrl)) {
      setSelectedRoomId(fromUrl);
      return;
    }
    if (selectedRoomId && !rooms.some((r) => r.id === selectedRoomId)) {
      setSelectedRoomId(rooms[0]?.id ?? "");
    } else if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, searchParams, selectedRoomId]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId]
  );

  const countryConfig = useMemo(
    () => resolveCountryPricingConfig(taxonomy.countries, selectedListing?.country),
    [taxonomy.countries, selectedListing?.country]
  );

  const {
    settings,
    ready,
    save,
    flushSave,
    setRoomPrice,
    addSeasonalPrice,
    removeSeasonalPrice,
    addExtraCharge,
    updateExtraCharge,
    removeExtraCharge,
  } = useHostPricing(listingId, countryConfig);

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

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  }

  async function handleSubmitForReview() {
    if (!listingId) return;
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
    } catch {
      flash("Could not save and submit. Please try again.");
      setSubmittingReview(false);
    }
  }

  function handleCancel() {
    if (fromListing) {
      router.push(`/host/listings/${listingId}/edit`);
      return;
    }
    router.push("/host/listings");
  }

  function handleAddSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!allowSeasonal || !settings?.seasonalEnabled) return;
    if (!newSeason.name.trim() || !newSeason.startDate || !newSeason.endDate || !newSeason.price) return;
    addSeasonalPrice({
      name: newSeason.name.trim(),
      startDate: newSeason.startDate,
      endDate: newSeason.endDate,
      price: clampNightlyPrice(Math.max(0, Number(newSeason.price) || 0)),
    });
    setNewSeason({ name: "", startDate: "", endDate: "", price: "" });
    flash("Seasonal price added.");
  }

  function handleAddCharge(e: React.FormEvent) {
    e.preventDefault();
    if (!allowExtraCharges || !settings?.extraChargesEnabled) return;
    if (!newCharge.label.trim() || !newCharge.amount) return;
    const amount = Math.max(0, Number(newCharge.amount) || 0);
    let libraryId: string | undefined;
    if (newCharge.saveToLibrary && hostId) {
      const saved = addSavedExtra({
        label: newCharge.label.trim(),
        amount,
        billing: newCharge.billing,
      });
      libraryId = saved?.id;
    }
    addExtraCharge({
      label: newCharge.label.trim(),
      amount,
      billing: newCharge.billing,
      libraryId,
    });
    setNewCharge({ label: "", amount: "", billing: "per_stay", saveToLibrary: true });
    flash(libraryId ? "Extra charge added and saved for reuse." : "Extra charge added to this listing.");
  }

  function findCommonExtra(key: string, label: string) {
    if (!settings) return undefined;
    const catalogId = commonCatalogId(key);
    return settings.extraCharges.find(
      (c) =>
        c.catalogId === catalogId || c.label.trim().toLowerCase() === label.trim().toLowerCase()
    );
  }

  function setCommonExtraEnabled(
    item: (typeof COMMON_STAY_EXTRAS)[number],
    enabled: boolean,
    amountOverride?: number
  ) {
    if (!settings) return;
    const existing = findCommonExtra(item.key, item.label);
    if (!enabled) {
      if (existing) {
        removeExtraCharge(existing.id);
        flash(`“${item.label}” turned off.`);
      }
      return;
    }
    const amount =
      amountOverride !== undefined
        ? Math.max(0, amountOverride)
        : existing?.amount ?? item.defaultAmount;
    if (existing) {
      save({
        extraCharges: settings.extraCharges.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                catalogId: commonCatalogId(item.key),
                label: item.label,
                amount,
                billing: item.billing,
              }
            : c
        ),
      });
      return;
    }
    let libraryId: string | undefined;
    if (hostId) {
      const saved = addSavedExtra({
        label: item.label,
        amount,
        billing: item.billing,
      });
      libraryId = saved?.id;
    }
    addExtraCharge({
      label: item.label,
      amount,
      billing: item.billing,
      catalogId: commonCatalogId(item.key),
      libraryId,
    });
    flash(`“${item.label}” is on for this listing.`);
  }

  function setCommonExtraAmount(item: (typeof COMMON_STAY_EXTRAS)[number], raw: string) {
    if (!settings) return;
    const amount = Math.max(0, Number(raw) || 0);
    const existing = findCommonExtra(item.key, item.label);
    if (!existing) {
      setCommonExtraEnabled(item, true, amount);
      return;
    }
    updateExtraCharge(existing.id, { amount });
  }

  function toggleLibraryOnListing(libraryId: string) {
    if (!settings) return;
    const template = savedExtras.find((i) => i.id === libraryId);
    if (!template) return;
    const existing = settings.extraCharges.find((c) => c.libraryId === libraryId);
    if (existing) {
      removeExtraCharge(existing.id);
      flash(`“${template.label}” removed from this listing.`);
      return;
    }
    addExtraCharge({
      label: template.label,
      amount: template.amount,
      billing: template.billing,
      libraryId: template.id,
    });
    flash(`“${template.label}” tagged on this listing.`);
  }

  function billingLabel(charge: ExtraCharge) {
    return EXTRA_CHARGE_BILLING_LABELS[normalizeExtraChargeBilling(charge)];
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

  function SectionToggle({
    enabled,
    onToggle,
    label,
  }: {
    enabled: boolean;
    onToggle: () => void;
    label: string;
  }) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
          enabled
            ? "border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
            : "border-gray-200 text-gray-500 hover:bg-gray-50"
        }`}
        aria-pressed={enabled}
        title={enabled ? `Turn off ${label}` : `Turn on ${label}`}
      >
        <Power className={`w-3.5 h-3.5 ${enabled ? "text-green-700" : "text-gray-400"}`} />
        {enabled ? "On" : "Off"}
      </button>
    );
  }

  if (!listingsReady) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  if (listingOptions.length === 0) {
    return (
      <HostDashboardShell>
        <div className="bg-white rounded-2xl border p-8 text-center max-w-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-2">No listings yet</h2>
          <p className="text-sm text-gray-500 mb-4">
            Add a property first. Rates, discounts, and extras are saved on that listing.
          </p>
          <Link
            href="/host/listings/new"
            className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Add Property
          </Link>
        </div>
      </HostDashboardShell>
    );
  }

  if (!ready || !settings) {
    return (
      <HostDashboardShell>
        <div className="flex items-center justify-center min-h-[320px]">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </HostDashboardShell>
    );
  }

  return (
    <HostDashboardShell>
      <div className="space-y-5 sm:space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-green-100/80 bg-gradient-to-br from-green-50 via-white to-emerald-50/40 px-5 py-5 sm:px-6 sm:py-6">
          <div
            className="pointer-events-none absolute -end-8 -top-10 h-36 w-36 rounded-full bg-green-200/30 blur-2xl"
            aria-hidden
          />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-green-700/80 mb-1.5">
              Host tools
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-display tracking-tight">
              Pricing
            </h2>
            <p className="text-gray-600 text-sm mt-1.5 max-w-2xl leading-relaxed">
              Set rates, discounts, and extra charges. Currency and tax follow the listing&apos;s
              country from Admin → Countries.
            </p>
          </div>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3 shadow-sm shadow-green-100/50">
            {message}
          </div>
        )}

        {/* Property + base pricing */}
        <section className={sectionClass}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={sectionIconClass}>
                <BadgeDollarSign className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {rooms.length > 0 ? "Room types" : "Base pricing"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {rooms.length === 0
                    ? "No rooms yet — this nightly rate is what guests see on the listing and calculator."
                    : "Each room category has its own nightly rate. Guests pick a room on the listing."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <label className="block flex-1 min-w-0">
              <span className={labelClass}>Property</span>
              <select
                value={listingId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setListingId(nextId);
                  const nextRooms =
                    listingOptions.find((l) => l.id === nextId)?.rooms ?? [];
                  setSelectedRoomId(nextRooms[0]?.id ?? "");
                }}
                className={fieldClass}
              >
                {listingOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                    {(l.rooms?.length ?? 0) > 0 ? ` · ${l.rooms!.length} room${l.rooms!.length === 1 ? "" : "s"}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {rooms.length === 0 && (
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

          {rooms.length === 0 && (() => {
            const nightly = settings.basePrice;
            if (!nightly) return null;
            return (
              <p className="text-xs text-gray-500">
                Guests see {settings.currency} {Math.round(nightly).toLocaleString()}/night
                for the whole property until you add room types. Add weekly, monthly, or date
                discounts in the sections below — they apply automatically at checkout.
              </p>
            );
          })()}

          {(bedsTab || bathsTab || guestsTab) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-gray-100">
              {bedsTab && (
                <label className="block">
                  <span className={labelClass}>{bedsTab.label}</span>
                  <select
                    id="listing-beds"
                    value={selectedIdForTab(bedsTab, bedsOptions)}
                    onChange={(e) => void handleCustomTabChange(bedsTab, e.target.value)}
                    disabled={!selectedSubmission || bedsOptions.length === 0}
                    className={fieldClass}
                  >
                    <option value="">Select beds</option>
                    {bedsOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {bathsTab && (
                <label className="block">
                  <span className={labelClass}>{bathsTab.label}</span>
                  <select
                    id="listing-baths"
                    value={selectedIdForTab(bathsTab, bathsOptions)}
                    onChange={(e) => void handleCustomTabChange(bathsTab, e.target.value)}
                    disabled={!selectedSubmission || bathsOptions.length === 0}
                    className={fieldClass}
                  >
                    <option value="">Select baths</option>
                    {bathsOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block">
                <span className={labelClass}>{guestsTab.label}</span>
                <select
                  id="listing-guests"
                  value={selectedIdForTab(guestsTab, guestsOptions)}
                  onChange={(e) => void handleCustomTabChange(guestsTab, e.target.value)}
                  disabled={!selectedSubmission || guestsOptions.length === 0}
                  className={fieldClass}
                >
                  <option value="">Select guests</option>
                  {guestsOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {rooms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-amber-900/80">
                Add rooms if this property has more than one unit. Each room can be a different category with its own rate.
              </p>
              <Link
                href={`/host/listings/${listingId}/rooms/new`}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-xl shadow-sm shadow-green-700/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add room
              </Link>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <label className="block flex-1 min-w-0">
                <span className={labelClass}>Room</span>
                <select
                  value={selectedRoomId || rooms[0]?.id || ""}
                  onChange={(e) => {
                    if (e.target.value) setSelectedRoomId(e.target.value);
                  }}
                  className={fieldClass}
                >
                  {rooms.map((room) => {
                    const rate = roomRate(room);
                    return (
                      <option key={room.id} value={room.id}>
                        {room.typeName && room.typeName !== room.name
                          ? `${room.name} · ${room.typeName}`
                          : room.name}
                        {rate.basePrice > 0
                          ? ` · ${settings.currency} ${rate.basePrice}/night`
                          : ""}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Guests pick from these room types on the listing details page and price calculator.
                </p>
              </label>
              <Link
                href={`/host/listings/${listingId}/rooms/new`}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 text-xs font-semibold bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-xl shadow-sm shadow-green-700/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add room
              </Link>
            </div>
          )}
        </section>

        {rooms.length > 0 && (
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

        {/* Seasonal pricing */}
        <section className={sectionClass}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={sectionIconClass}>
                <CalendarRange className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-semibold text-gray-900">Seasonal pricing</h3>
            </div>
            {allowSeasonal && (
              <SectionToggle
                enabled={settings.seasonalEnabled}
                label="seasonal pricing"
                onToggle={() => {
                  const on = !settings.seasonalEnabled;
                  save({ seasonalEnabled: on }, { immediate: true });
                  flash(
                    on
                      ? "Seasonal pricing is on. Guests see those rates on the listing."
                      : "Seasonal pricing is off. Guests only see the base nightly rate."
                  );
                }}
              />
            )}
          </div>
          {!allowSeasonal ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              Seasonal pricing is disabled by platform admin.
            </p>
          ) : !settings.seasonalEnabled ? (
            <p className="text-sm text-gray-500">
              Seasonal pricing is turned off for this listing. Turn it on to add date-based rates.
            </p>
          ) : (
          <>
          <p className="text-xs text-gray-500 leading-relaxed">
            Choose a start and end date. The seasonal nightly rate replaces the base/room rate for
            stays that fall in that window.
          </p>
          {settings.seasonalPricing.length === 0 ? (
            <p className="text-sm text-gray-400">No seasonal pricing configured.</p>
          ) : (
            <ul className="space-y-2">
              {settings.seasonalPricing.map((sp) => (
                <li
                  key={sp.id}
                  className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl p-3.5 bg-gray-50/50"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{sp.name}</p>
                    <p className="text-xs text-gray-500">
                      {sp.startDate} → {sp.endDate} · {settings.currency} {sp.price}/night
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      removeSeasonalPrice(sp.id);
                      flash("Seasonal price removed.");
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {allowSeasonal && settings.seasonalEnabled && (
          <form onSubmit={handleAddSeason} className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              value={newSeason.name}
              onChange={(e) => setNewSeason((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Peak winter"
              required
              className={fieldClass}
            />
            <input
              type="date"
              value={newSeason.startDate}
              onChange={(e) => setNewSeason((p) => ({ ...p, startDate: e.target.value }))}
              required
              className={fieldClass}
            />
            <input
              type="date"
              value={newSeason.endDate}
              min={newSeason.startDate || undefined}
              onChange={(e) => setNewSeason((p) => ({ ...p, endDate: e.target.value }))}
              required
              className={fieldClass}
            />
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={newSeason.price}
                onChange={(e) => setNewSeason((p) => ({ ...p, price: e.target.value }))}
                placeholder={`${settings.currency}/night`}
                required
                className={fieldClass}
              />
              <button
                type="submit"
                className="shrink-0 inline-flex items-center gap-1 text-sm bg-green-700 hover:bg-green-800 text-white px-3 py-2.5 rounded-xl font-semibold shadow-sm shadow-green-700/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>
          )}
          </>
          )}
        </section>

        {/* Discounts */}
        <section className={sectionClass}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={sectionIconClass}>
                <Percent className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-semibold text-gray-900">Discounts</h3>
            </div>
            {allowDiscounts && (
              <SectionToggle
                enabled={settings.discountsEnabled}
                label="discounts"
                onToggle={() => {
                  const on = !settings.discountsEnabled;
                  save({ discountsEnabled: on }, { immediate: true });
                  flash(
                    on
                      ? "Discounts are on. Guests see them on the listing and at checkout."
                      : "Discounts are off. They no longer apply at checkout."
                  );
                }}
              />
            )}
          </div>
          {!allowDiscounts ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              Discount tools are disabled by platform admin.
            </p>
          ) : !settings.discountsEnabled ? (
            <p className="text-sm text-gray-500">
              Discounts are turned off for this listing. Turn them on to offer stay and booking
              discounts.
            </p>
          ) : (
          <>
          <p className="text-xs text-gray-500 leading-relaxed">
            Applied on the base or room nightly rate when no seasonal rate is active.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className={labelClass}>Weekly stay discount (%)</span>
              <RateInput
                min={0}
                max={100}
                value={settings.weeklyDiscountPct}
                onCommit={(raw) =>
                  save({ weeklyDiscountPct: Math.min(100, Math.max(0, Number(raw) || 0)) })
                }
              />
            </label>
            <label className="block">
              <span className={labelClass}>Monthly stay discount (%)</span>
              <RateInput
                min={0}
                max={100}
                value={settings.monthlyDiscountPct}
                onCommit={(raw) =>
                  save({ monthlyDiscountPct: Math.min(100, Math.max(0, Number(raw) || 0)) })
                }
              />
            </label>
            <label className="block">
              <span className={labelClass}>Early bird discount (%)</span>
              <RateInput
                min={0}
                max={100}
                value={settings.earlyBirdDiscountPct}
                onCommit={(raw) =>
                  save({ earlyBirdDiscountPct: Math.min(100, Math.max(0, Number(raw) || 0)) })
                }
              />
            </label>
            <label className="block">
              <span className={labelClass}>Early bird — days ahead</span>
              <RateInput
                min={1}
                value={settings.earlyBirdDaysAhead}
                onCommit={(raw) =>
                  save({ earlyBirdDaysAhead: Math.max(1, Number(raw) || 1) })
                }
              />
            </label>
            <label className="block">
              <span className={labelClass}>Last-minute discount (%)</span>
              <RateInput
                min={0}
                max={100}
                value={settings.lastMinuteDiscountPct}
                onCommit={(raw) =>
                  save({ lastMinuteDiscountPct: Math.min(100, Math.max(0, Number(raw) || 0)) })
                }
              />
            </label>
            <label className="block">
              <span className={labelClass}>Last-minute — within N days</span>
              <RateInput
                min={1}
                value={settings.lastMinuteDaysAhead}
                onCommit={(raw) =>
                  save({ lastMinuteDaysAhead: Math.max(1, Number(raw) || 1) })
                }
              />
            </label>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Weekly = 7+ nights, monthly discount = 28+ nights (only when no monthly rate is set).
            Early bird and last-minute apply based on how far ahead the guest books. These stack with
            the base price only when seasonal pricing is not covering those dates.
          </p>
          </>
          )}
        </section>

        {/* Extra charges */}
        <section className={`${sectionClass} !space-y-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex items-start gap-3">
              <span className={sectionIconClass}>
                <ReceiptText className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900">Extra charges</h3>
                  {allowExtraCharges && settings.extraChargesEnabled && (
                    <span className="text-[11px] font-medium text-green-800 bg-green-50 border border-green-100 px-2 py-0.5 rounded-md">
                      {settings.extraCharges.length} active
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 max-w-xl leading-relaxed">
                  Set Extra bed with breakfast in one click, or add other optional fees.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {allowExtraCharges && (
                <Link
                  href="/host/extra-charges"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-green-800 border border-gray-200 hover:border-green-200 hover:bg-green-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  Manage library
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              )}
              {allowExtraCharges && (
                <SectionToggle
                  enabled={settings.extraChargesEnabled}
                  label="extra charges"
                  onToggle={() => {
                    const on = !settings.extraChargesEnabled;
                    save({ extraChargesEnabled: on }, { immediate: true });
                    flash(
                      on
                        ? "Extra charges are on. Guests can add them on the listing and at checkout."
                        : "Extra charges are off. Guests will not see extras or extra-guest fees."
                    );
                  }}
                />
              )}
            </div>
          </div>

          {!allowExtraCharges ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              Extra charges are disabled by platform admin.
            </p>
          ) : !settings.extraChargesEnabled ? (
            <p className="text-sm text-gray-500">
              Turn on to apply optional fees and guest surcharges for this listing.
            </p>
          ) : (
          <>
          {/* Simple common stay extras */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <p className="text-sm font-semibold text-gray-900">Extra bed & breakfast</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Turn on and set the nightly price — no library needed
              </p>
            </div>
            <ul className="divide-y divide-gray-100">
              {COMMON_STAY_EXTRAS.map((item) => {
                const active = findCommonExtra(item.key, item.label);
                const enabled = Boolean(active);
                return (
                  <li
                    key={item.key}
                    className={`flex flex-wrap items-center gap-3 px-4 py-3.5 ${
                      item.key === "extra-bed-breakfast" ? "bg-green-50/40" : ""
                    }`}
                  >
                    <label className="inline-flex items-center gap-3 flex-1 min-w-[200px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setCommonExtraEnabled(item, e.target.checked)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">
                          {item.label}
                        </span>
                        <span className="block text-[11px] text-gray-500">{item.hint}</span>
                      </span>
                    </label>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">{settings.currency}</span>
                      <input
                        type="number"
                        min={0}
                        value={active?.amount ?? item.defaultAmount}
                        onChange={(e) => setCommonExtraAmount(item, e.target.value)}
                        onFocus={() => {
                          if (!enabled) setCommonExtraEnabled(item, true);
                        }}
                        className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500"
                        aria-label={`${item.label} price`}
                      />
                      <span className="text-[11px] text-gray-400 w-20 text-end leading-tight">
                        {EXTRA_CHARGE_BILLING_LABELS[item.billing].replace(/^Per /i, "/ ")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <p className="text-xs font-semibold text-gray-800 tracking-wide uppercase">
                  Other saved extras
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Custom fees from your library
                </p>
              </div>
              <div className="p-2">
                {savedExtras.filter(
                  (item) =>
                    !COMMON_STAY_EXTRAS.some(
                      (c) => c.label.toLowerCase() === item.label.toLowerCase()
                    )
                ).length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <p className="text-sm text-gray-500">No other saved extras</p>
                    <Link
                      href="/host/extra-charges"
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-green-700 hover:text-green-800"
                    >
                      Add custom extras
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {savedExtras
                      .filter(
                        (item) =>
                          !COMMON_STAY_EXTRAS.some(
                            (c) => c.label.toLowerCase() === item.label.toLowerCase()
                          )
                      )
                      .map((item) => {
                      const onListing = settings.extraCharges.some((c) => c.libraryId === item.id);
                      return (
                        <li key={item.id} className="flex items-center gap-2 px-2 py-2.5 hover:bg-gray-50/80 rounded-lg group">
                          <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={onListing}
                              onChange={() => toggleLibraryOnListing(item.id)}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-gray-900 truncate">
                                {item.label}
                              </span>
                              <span className="block text-[11px] text-gray-500">
                                {EXTRA_CHARGE_BILLING_LABELS[item.billing]}
                              </span>
                            </span>
                          </label>
                          <span className="text-sm font-semibold text-gray-800 tabular-nums shrink-0">
                            {settings.currency} {item.amount}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onListing) {
                                const linked = settings.extraCharges.find(
                                  (c) => c.libraryId === item.id
                                );
                                if (linked) removeExtraCharge(linked.id);
                              }
                              removeSavedExtra(item.id);
                              flash(`“${item.label}” removed from library.`);
                            }}
                            className="p-1.5 rounded-md text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-opacity"
                            aria-label={`Delete ${item.label}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <p className="text-xs font-semibold text-gray-800 tracking-wide uppercase">
                  Active on this listing
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Fees guests will see for this property
                </p>
              </div>
              <div className="p-2 min-h-[120px]">
                {settings.extraCharges.length === 0 ? (
                  <div className="px-3 py-8 text-center">
                    <p className="text-sm text-gray-500">None selected</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Use Extra bed & breakfast above, or add a custom charge
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {settings.extraCharges.map((ec) => (
                      <li
                        key={ec.id}
                        className="flex items-center gap-3 px-2 py-2.5 hover:bg-gray-50/80 rounded-lg group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 truncate">{ec.label}</p>
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                ec.catalogId?.startsWith("common:")
                                  ? "bg-green-50 text-green-700"
                                  : ec.libraryId
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {ec.catalogId?.startsWith("common:")
                                ? "Stay extra"
                                : ec.libraryId
                                  ? "Library"
                                  : "One-off"}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">{billingLabel(ec)}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-800 tabular-nums shrink-0">
                          {settings.currency} {ec.amount}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            removeExtraCharge(ec.id);
                            flash("Charge removed from this listing.");
                          }}
                          className="p-1.5 rounded-md text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-opacity"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <form
            onSubmit={handleAddCharge}
            className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 p-4 space-y-3"
          >
            <p className="text-xs font-semibold text-gray-800">Add a custom charge</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <label className="block sm:col-span-5">
                <span className="text-[11px] font-medium text-gray-500 mb-1 block">Name</span>
                <input
                  value={newCharge.label}
                  onChange={(e) => setNewCharge((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Airport transfer"
                  required
                  className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-medium text-gray-500 mb-1 block">
                  Amount ({settings.currency})
                </span>
                <input
                  type="number"
                  min={0}
                  value={newCharge.amount}
                  onChange={(e) => setNewCharge((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0"
                  required
                  className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block sm:col-span-3">
                <span className="text-[11px] font-medium text-gray-500 mb-1 block">Billing</span>
                <select
                  value={newCharge.billing}
                  onChange={(e) =>
                    setNewCharge((p) => ({
                      ...p,
                      billing: e.target.value as ExtraChargeBilling,
                    }))
                  }
                  className="w-full border border-gray-200 bg-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {(Object.keys(EXTRA_CHARGE_BILLING_LABELS) as ExtraChargeBilling[]).map((key) => (
                    <option key={key} value={key}>
                      {EXTRA_CHARGE_BILLING_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1 text-sm bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg font-semibold"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={newCharge.saveToLibrary}
                onChange={(e) =>
                  setNewCharge((p) => ({ ...p, saveToLibrary: e.target.checked }))
                }
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              Save to library for reuse on other listings
            </label>
          </form>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-semibold text-gray-800 tracking-wide uppercase">
                Guest capacity pricing
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] font-medium text-gray-500 mb-1 block">
                  Guests included in base price
                </span>
                <input
                  type="number"
                  min={1}
                  value={settings.guestsIncludedInBase}
                  onChange={(e) =>
                    save({ guestsIncludedInBase: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-gray-500 mb-1 block">
                  Extra guest surcharge ({settings.currency}/night)
                </span>
                <input
                  type="number"
                  min={0}
                  value={settings.extraGuestCharge}
                  onChange={(e) =>
                    save({ extraGuestCharge: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
            </div>
          </div>
          </>
          )}
        </section>

        {/* Tax */}
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

        <div className="bg-white rounded-2xl border p-5 space-y-3">
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
            approval queue. Cancel returns to {fromListing ? "the listing form" : "My Listings"}.
          </p>
        </div>
      </div>
    </HostDashboardShell>
  );
}
