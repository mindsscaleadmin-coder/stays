"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarRange,
  Percent,
  Plus,
  Power,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useHostExtraLibrary } from "@/lib/host/use-host-extra-library";
import { usePlatformConfig } from "@/lib/admin/use-admin-platform-config";
import { clampNightlyPrice } from "@/lib/admin/platform-config-data";
import { openNativeDatePicker } from "@/lib/utils";
import {
  EXTRA_CHARGE_BILLING_LABELS,
  type ExtraChargeBilling,
} from "@/lib/admin/extra-charges-catalog-types";
import {
  normalizeExtraChargeBilling,
  type ExtraCharge,
  type ListingPricingSettings,
  type SeasonalPrice,
} from "@/lib/host/host-pricing-types";
import { newExtraChargeId, newSeasonalPriceId } from "@/lib/host/host-pricing-data";

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

function SectionToggle({
  enabled,
  onToggle,
  label,
  disabled = false,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
        enabled
          ? "border-green-300 bg-green-50 text-green-800 hover:bg-green-100"
          : "border-gray-200 text-gray-500 hover:bg-gray-50"
      } ${disabled ? "opacity-60 cursor-not-allowed hover:bg-transparent" : ""}`}
      aria-pressed={enabled}
      title={disabled ? `${label} is off` : enabled ? `Turn off ${label}` : `Turn on ${label}`}
    >
      <Power className={`w-3.5 h-3.5 ${enabled ? "text-green-700" : "text-gray-400"}`} />
      {enabled ? "On" : "Off"}
    </button>
  );
}

export function HostListingPricingExtras({
  settings,
  onSave,
  isExperience = false,
  hostId,
  lockTogglesOff = false,
}: {
  settings: ListingPricingSettings;
  onSave: (patch: Partial<ListingPricingSettings>) => void;
  isExperience?: boolean;
  hostId?: string;
  currencySymbol?: string;
  /** Keep seasonal / discounts / extra-charge toggles off and non-interactive. */
  lockTogglesOff?: boolean;
}) {
  const platformConfig = usePlatformConfig();
  const bounds = platformConfig.features.hostBounds;
  const dynamicPricingOn = platformConfig.features.hostFeatures.dynamicPricing;
  const allowSeasonal = dynamicPricingOn && bounds.allowSeasonalPricing;
  const allowDiscounts = dynamicPricingOn && bounds.allowDiscounts;
  const allowExtraCharges = bounds.allowExtraCharges;

  const seasonalEnabled = lockTogglesOff ? false : settings.seasonalEnabled;
  const discountsEnabled = lockTogglesOff ? false : settings.discountsEnabled;
  const extraChargesEnabled = lockTogglesOff ? false : settings.extraChargesEnabled;

  const {
    items: savedExtras,
    add: addSavedExtra,
  } = useHostExtraLibrary(hostId);

  const [newSeason, setNewSeason] = useState({ name: "", startDate: "", endDate: "", price: "" });
  const [newCharge, setNewCharge] = useState({
    label: "",
    amount: "",
    billing: "per_stay" as ExtraChargeBilling,
    saveToLibrary: true,
  });
  const [showCustomFeeForm, setShowCustomFeeForm] = useState(false);

  function addSeasonalPrice(input: Omit<SeasonalPrice, "id">) {
    onSave({
      seasonalPricing: [...settings.seasonalPricing, { ...input, id: newSeasonalPriceId() }],
    });
  }

  function removeSeasonalPrice(id: string) {
    onSave({
      seasonalPricing: settings.seasonalPricing.filter((s) => s.id !== id),
    });
  }

  function addExtraCharge(input: Omit<ExtraCharge, "id">) {
    onSave({
      extraCharges: [...settings.extraCharges, { ...input, id: newExtraChargeId() }],
    });
  }

  function updateExtraCharge(
    id: string,
    patch: Partial<Pick<ExtraCharge, "label" | "amount" | "billing">>
  ) {
    onSave({
      extraCharges: settings.extraCharges.map((c) =>
        c.id === id
          ? {
              ...c,
              label: patch.label?.trim() || c.label,
              amount: patch.amount !== undefined ? Math.max(0, patch.amount) : c.amount,
              billing: patch.billing ?? c.billing,
            }
          : c
      ),
    });
  }

  function removeExtraCharge(id: string) {
    onSave({
      extraCharges: settings.extraCharges.filter((c) => c.id !== id),
    });
  }

  function handleAddSeason(e: React.FormEvent) {
    e.preventDefault();
    if (!allowSeasonal || !seasonalEnabled) return;
    if (!newSeason.name.trim() || !newSeason.startDate || !newSeason.endDate || !newSeason.price) return;
    addSeasonalPrice({
      name: newSeason.name.trim(),
      startDate: newSeason.startDate,
      endDate: newSeason.endDate,
      price: clampNightlyPrice(Math.max(0, Number(newSeason.price) || 0)),
    });
    setNewSeason({ name: "", startDate: "", endDate: "", price: "" });
  }

  function handleAddCharge(e: React.FormEvent) {
    e.preventDefault();
    if (!allowExtraCharges || !extraChargesEnabled) return;
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
    setShowCustomFeeForm(false);
  }

  function findCommonExtra(key: string, label: string) {
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
    const existing = findCommonExtra(item.key, item.label);
    if (!enabled) {
      if (existing) removeExtraCharge(existing.id);
      return;
    }
    const amount =
      amountOverride !== undefined
        ? Math.max(0, amountOverride)
        : existing?.amount ?? item.defaultAmount;
    if (existing) {
      onSave({
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
  }

  function setCommonExtraAmount(item: (typeof COMMON_STAY_EXTRAS)[number], raw: string) {
    const amount = Math.max(0, Number(raw) || 0);
    const existing = findCommonExtra(item.key, item.label);
    if (!existing) {
      setCommonExtraEnabled(item, true, amount);
      return;
    }
    updateExtraCharge(existing.id, { amount });
  }

  function toggleLibraryOnListing(libraryId: string) {
    const template = savedExtras.find((i) => i.id === libraryId);
    if (!template) return;
    const existing = settings.extraCharges.find((c) => c.libraryId === libraryId);
    if (existing) {
      removeExtraCharge(existing.id);
      return;
    }
    addExtraCharge({
      label: template.label,
      amount: template.amount,
      billing: template.billing,
      libraryId: template.id,
    });
  }

  function billingLabel(charge: ExtraCharge) {
    return EXTRA_CHARGE_BILLING_LABELS[normalizeExtraChargeBilling(charge)];
  }

  const libraryExtras = savedExtras.filter(
    (item) =>
      !COMMON_STAY_EXTRAS.some((c) => c.label.toLowerCase() === item.label.toLowerCase())
  );

  return (
    <>
      {/* Seasonal pricing — nightly-rate concept, not for session or event directory pricing */}
      {!isExperience && (
        <section className={sectionClass}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={sectionIconClass}>
                <CalendarRange className="w-4 h-4" />
              </span>
              <h3 className="font-display text-sm font-semibold text-gray-900">Seasonal pricing</h3>
            </div>
            {allowSeasonal && (
              <SectionToggle
                enabled={seasonalEnabled}
                label="seasonal pricing"
                disabled={lockTogglesOff}
                onToggle={() => onSave({ seasonalEnabled: !settings.seasonalEnabled })}
              />
            )}
          </div>
          {!allowSeasonal ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              Seasonal pricing is disabled by platform admin.
            </p>
          ) : !seasonalEnabled ? (
            <p className="text-sm text-gray-500">
              Seasonal pricing is turned off for this listing. Turn it on to add date-based rates.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500 leading-relaxed">
                Choose a start and end date. The seasonal nightly rate replaces the base or room rate
                for those nights. Percentage discounts do not stack on stays that include seasonal
                nights.
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
                        onClick={() => removeSeasonalPrice(sp.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {allowSeasonal && seasonalEnabled && (
                <form
                  onSubmit={handleAddSeason}
                  className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
                >
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
                    onClick={openNativeDatePicker}
                    required
                    className={`${fieldClass} cursor-pointer`}
                  />
                  <input
                    type="date"
                    value={newSeason.endDate}
                    min={newSeason.startDate || undefined}
                    onChange={(e) => setNewSeason((p) => ({ ...p, endDate: e.target.value }))}
                    onClick={openNativeDatePicker}
                    required
                    className={`${fieldClass} cursor-pointer`}
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
      )}

      {/* Discounts — stay/experience checkout only */}
      <section className={sectionClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={sectionIconClass}>
              <Percent className="w-4 h-4" />
            </span>
            <h3 className="font-display text-sm font-semibold text-gray-900">Discounts</h3>
          </div>
          {allowDiscounts && (
            <SectionToggle
              enabled={discountsEnabled}
              label="discounts"
              disabled={lockTogglesOff}
              onToggle={() => onSave({ discountsEnabled: !settings.discountsEnabled })}
            />
          )}
        </div>
        {!allowDiscounts ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Discount tools are disabled by platform admin.
          </p>
        ) : !discountsEnabled ? (
          <p className="text-sm text-gray-500">
            Discounts are turned off for this listing. Turn them on to offer stay and booking
            discounts.
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-500 leading-relaxed">
              Applied on the base or room nightly rate. If any night in the guest&apos;s stay uses a
              seasonal rate, these percentage discounts are not applied for that booking.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className={labelClass}>Weekly stay discount (%)</span>
                <RateInput
                  min={0}
                  max={100}
                  value={settings.weeklyDiscountPct}
                  onCommit={(raw) =>
                    onSave({ weeklyDiscountPct: Math.min(100, Math.max(0, Number(raw) || 0)) })
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
                    onSave({ monthlyDiscountPct: Math.min(100, Math.max(0, Number(raw) || 0)) })
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
                    onSave({ earlyBirdDiscountPct: Math.min(100, Math.max(0, Number(raw) || 0)) })
                  }
                />
              </label>
              <label className="block">
                <span className={labelClass}>Early bird — days ahead</span>
                <RateInput
                  min={1}
                  value={settings.earlyBirdDaysAhead}
                  onCommit={(raw) =>
                    onSave({ earlyBirdDaysAhead: Math.max(1, Number(raw) || 1) })
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
                    onSave({ lastMinuteDiscountPct: Math.min(100, Math.max(0, Number(raw) || 0)) })
                  }
                />
              </label>
              <label className="block">
                <span className={labelClass}>Last-minute — within N days</span>
                <RateInput
                  min={1}
                  value={settings.lastMinuteDaysAhead}
                  onCommit={(raw) =>
                    onSave({ lastMinuteDaysAhead: Math.max(1, Number(raw) || 1) })
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

      {/* Extra charges — stay/experience checkout only */}
      <section className={`${sectionClass} !space-y-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-3">
            <span className={sectionIconClass}>
              <ReceiptText className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-sm font-semibold text-gray-900">Extra charges</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-lg leading-relaxed">
                Optional fees guests can add when they book this listing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {allowExtraCharges && (
              <SectionToggle
                enabled={extraChargesEnabled}
                label="extra charges"
                disabled={lockTogglesOff}
                onToggle={() => onSave({ extraChargesEnabled: !settings.extraChargesEnabled })}
              />
            )}
          </div>
        </div>

        {!allowExtraCharges ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            Extra charges are disabled by platform admin.
          </p>
        ) : !extraChargesEnabled ? (
          <p className="text-sm text-gray-500">
            Turn on to apply optional fees for this listing.
          </p>
        ) : (
          <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            <div className="px-4 py-4 sm:px-5 bg-gray-50/50">
              <p className="text-sm font-semibold text-gray-900">On this listing</p>
              {settings.extraCharges.length === 0 ? (
                <p className="text-sm text-gray-500 mt-2">No fees added yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {settings.extraCharges.map((ec) => (
                    <li
                      key={ec.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{ec.label}</p>
                        <p className="text-[11px] text-gray-500">{billingLabel(ec)}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">
                        {settings.currency} {ec.amount}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExtraCharge(ec.id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                        aria-label={`Remove ${ec.label}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-4 py-4 sm:px-5 space-y-4">
              <p className="text-sm font-semibold text-gray-900">Add a fee</p>

              {!isExperience && (
                <ul className="space-y-2">
                  {COMMON_STAY_EXTRAS.map((item) => {
                    const active = findCommonExtra(item.key, item.label);
                    const enabled = Boolean(active);
                    return (
                      <li
                        key={item.key}
                        className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 ${
                          enabled ? "border-green-200 bg-green-50/40" : "border-gray-200 bg-white"
                        }`}
                      >
                        <label className="inline-flex items-center gap-2.5 flex-1 min-w-[12rem] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setCommonExtraEnabled(item, e.target.checked)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4 shrink-0"
                          />
                          <span className="text-sm font-medium text-gray-900">{item.label}</span>
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
                            disabled={!enabled}
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400"
                            aria-label={`${item.label} price`}
                          />
                          <span className="text-[11px] text-gray-400">
                            {EXTRA_CHARGE_BILLING_LABELS[item.billing].replace(/^Per /i, "/ ")}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {libraryExtras.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Saved fees</p>
                  <ul className="space-y-1.5">
                    {libraryExtras.map((item) => {
                      const onListing = settings.extraCharges.some((c) => c.libraryId === item.id);
                      return (
                        <li key={item.id}>
                          <label
                            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer ${
                              onListing
                                ? "border-green-200 bg-green-50/40"
                                : "border-gray-200 bg-white hover:bg-gray-50/80"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={onListing}
                              onChange={() => toggleLibraryOnListing(item.id)}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500 shrink-0"
                            />
                            <span className="flex-1 min-w-0 text-sm text-gray-900 truncate">
                              {item.label}
                            </span>
                            <span className="text-sm font-semibold text-gray-800 tabular-nums shrink-0">
                              {settings.currency} {item.amount}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {showCustomFeeForm ? (
                <form onSubmit={handleAddCharge} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block sm:col-span-2">
                      <span className={labelClass}>Name</span>
                      <input
                        value={newCharge.label}
                        onChange={(e) => setNewCharge((p) => ({ ...p, label: e.target.value }))}
                        placeholder="e.g. Airport transfer"
                        required
                        className={fieldClass}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Amount ({settings.currency})</span>
                      <input
                        type="number"
                        min={0}
                        value={newCharge.amount}
                        onChange={(e) => setNewCharge((p) => ({ ...p, amount: e.target.value }))}
                        placeholder="0"
                        required
                        className={fieldClass}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Billing</span>
                      <select
                        value={newCharge.billing}
                        onChange={(e) =>
                          setNewCharge((p) => ({
                            ...p,
                            billing: e.target.value as ExtraChargeBilling,
                          }))
                        }
                        className={fieldClass}
                      >
                        {(Object.keys(EXTRA_CHARGE_BILLING_LABELS) as ExtraChargeBilling[]).map(
                          (key) => (
                            <option key={key} value={key}>
                              {EXTRA_CHARGE_BILLING_LABELS[key]}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCharge.saveToLibrary}
                        onChange={(e) =>
                          setNewCharge((p) => ({ ...p, saveToLibrary: e.target.checked }))
                        }
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      Save for other listings
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCustomFeeForm(false)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1.5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 text-sm bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg font-semibold"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomFeeForm(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
                >
                  <Plus className="w-4 h-4" /> Custom fee
                </button>
              )}

              <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                Reuse fees across listings in{" "}
                <Link href="/host/extra-charges" className="text-green-700 hover:text-green-800 font-medium">
                  Manage library
                  <ArrowUpRight className="inline w-3 h-3 ms-0.5" />
                </Link>
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
