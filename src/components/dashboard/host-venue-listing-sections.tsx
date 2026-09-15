"use client";

import { Building2 } from "lucide-react";
import {
  VENUE_PRICE_UNIT_OPTIONS,
  type VenueDetails,
} from "@/lib/listings/venue-details-types";

function numberInput(
  value: number | undefined,
  onChange: (next: number | undefined) => void,
  options?: { min?: number; placeholder?: string; className?: string }
) {
  return (
    <input
      type="number"
      min={options?.min ?? 0}
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? undefined : Math.max(0, Number(raw) || 0));
      }}
      placeholder={options?.placeholder ?? "0"}
      className={
        options?.className ??
        "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
      }
    />
  );
}

/** Combined capacity + pricing fields — used on venue form and inside spaces editor. */
export function VenueDetailsFields({
  value,
  onChange,
  currency,
  currencySymbol,
  showStartingPrice = true,
  compact = false,
}: {
  value: VenueDetails;
  onChange: (next: VenueDetails) => void;
  currency: string;
  currencySymbol?: string;
  showStartingPrice?: boolean;
  compact?: boolean;
}) {
  function patch(partial: Partial<VenueDetails>) {
    onChange({ ...value, ...partial });
  }

  const labelClass = compact ? "text-xs font-medium text-gray-600 mb-1" : "text-sm font-medium text-gray-700";

  const inputClass = compact
    ? "mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
    : undefined;
  const selectClass = compact
    ? "mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
    : "mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";
  const textClass = compact
    ? "mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
    : "mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className={labelClass}>Price unit</span>
          <select
            value={value.priceUnit ?? "event"}
            onChange={(e) => patch({ priceUnit: e.target.value as VenueDetails["priceUnit"] })}
            className={selectClass}
          >
            {VENUE_PRICE_UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Minimum booking</span>
          <input
            type="text"
            value={value.minimumBookingDuration ?? ""}
            onChange={(e) => patch({ minimumBookingDuration: e.target.value })}
            placeholder="e.g. 4 hours, full day"
            className={textClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Security deposit</span>
          <div className={compact ? "mt-1 flex items-stretch" : "mt-1.5 flex items-stretch"}>
            <div className="inline-flex items-center gap-1 rounded-s-lg border border-gray-200 border-e-0 bg-gray-50 px-2.5 text-xs text-gray-700 shrink-0">
              <span className="font-semibold text-gray-900">{currency}</span>
              {currencySymbol ? <span className="text-gray-400">{currencySymbol}</span> : null}
            </div>
            {numberInput(value.securityDeposit, (securityDeposit) => patch({ securityDeposit }), {
              placeholder: "2000",
              className:
                "w-full min-w-0 border border-gray-200 rounded-e-lg rounded-s-none px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500",
            })}
          </div>
        </label>
      </div>

      {showStartingPrice ? (
        <label className="block">
          <span className={labelClass}>Starting price</span>
          <div className={compact ? "mt-1 flex items-stretch" : "mt-1.5 flex items-stretch"}>
            <div className="inline-flex items-center gap-1 rounded-s-lg border border-gray-200 border-e-0 bg-gray-50 px-2.5 text-xs text-gray-700 shrink-0">
              <span className="font-semibold text-gray-900">{currency}</span>
              {currencySymbol ? <span className="text-gray-400">{currencySymbol}</span> : null}
            </div>
            {numberInput(value.startingPrice, (startingPrice) => patch({ startingPrice }), {
              placeholder: "8000",
              className:
                "w-full min-w-0 border border-gray-200 rounded-e-lg rounded-s-none px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500",
            })}
          </div>
        </label>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className={labelClass}>Max guests</span>
          {numberInput(value.maxGuests, (maxGuests) => patch({ maxGuests }), {
            min: 1,
            placeholder: "500",
            className: inputClass,
          })}
        </label>
        <label className="block">
          <span className={labelClass}>Hall size (sq ft)</span>
          {numberInput(value.hallSizeSqFt, (hallSizeSqFt) => patch({ hallSizeSqFt }), {
            placeholder: "5000",
            className: inputClass,
          })}
        </label>
        <label className="block">
          <span className={labelClass}>Ceiling height (ft)</span>
          {numberInput(value.ceilingHeightFt, (ceilingHeightFt) => patch({ ceilingHeightFt }), {
            placeholder: "18",
            className: inputClass,
          })}
        </label>
      </div>

      <div>
        <p className={labelClass}>Capacity by layout</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <label className="block">
            <span className="text-[11px] font-medium text-gray-500">Standing</span>
            {numberInput(value.standingCapacity, (standingCapacity) => patch({ standingCapacity }), {
              placeholder: "1500",
              className: inputClass,
            })}
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-gray-500">Dining</span>
            {numberInput(value.seatedCapacity, (seatedCapacity) => patch({ seatedCapacity }), {
              placeholder: "900",
              className: inputClass,
            })}
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-gray-500">Theatre</span>
            {numberInput(value.theatreCapacity, (theatreCapacity) => patch({ theatreCapacity }), {
              placeholder: "1150",
              className: inputClass,
            })}
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-gray-500">Cabaret</span>
            {numberInput(value.cabaretCapacity, (cabaretCapacity) => patch({ cabaretCapacity }), {
              placeholder: "600",
              className: inputClass,
            })}
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-gray-500">Classroom</span>
            {numberInput(
              value.classroomCapacity,
              (classroomCapacity) => patch({ classroomCapacity }),
              {
                placeholder: "650",
                className: inputClass,
              }
            )}
          </label>
        </div>
      </div>

      <label className="block">
        <span className={labelClass}>Parking</span>
        <input
          type="text"
          value={value.parkingCapacity ?? ""}
          onChange={(e) => patch({ parkingCapacity: e.target.value })}
          placeholder="e.g. 150+ cars, valet available"
          className={textClass}
        />
      </label>
    </div>
  );
}

export function VenueRulesFields({
  value,
  onChange,
}: {
  value: VenueDetails;
  onChange: (next: VenueDetails) => void;
}) {
  function patch(partial: Partial<VenueDetails>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-4">
      <div>
        <p className="font-display text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-green-700" />
          Rules & media
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">Additional rules</span>
        <textarea
          value={value.additionalRules ?? ""}
          onChange={(e) => patch({ additionalRules: e.target.value })}
          rows={3}
          placeholder="Noise curfew, decoration restrictions, cleanup requirements…"
          className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-gray-700">Video tour URL</span>
        <input
          type="url"
          value={value.videoTourUrl ?? ""}
          onChange={(e) => patch({ videoTourUrl: e.target.value })}
          placeholder="https://youtube.com/watch?v=…"
          className="mt-1.5 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>
    </div>
  );
}

/** Single-rate venues: venue details + rules (no per-space editor). */
export function HostVenueListingSections({
  value,
  onChange,
  currency,
  currencySymbol,
  showStartingPrice = true,
}: {
  value: VenueDetails;
  onChange: (next: VenueDetails) => void;
  currency: string;
  currencySymbol?: string;
  showStartingPrice?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-4">
        <div>
          <p className="font-display text-sm font-semibold text-gray-900">Venue details</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {showStartingPrice
              ? "Capacity, size, and pricing for the whole venue."
              : "Capacity and booking terms. Starting price is set next to the title above."}
          </p>
        </div>
        <VenueDetailsFields
          value={value}
          onChange={onChange}
          currency={currency}
          currencySymbol={currencySymbol}
          showStartingPrice={showStartingPrice}
        />
      </div>
      <VenueRulesFields value={value} onChange={onChange} />
    </div>
  );
}
