"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Building2, Plus, Trash2 } from "lucide-react";
import {
  DraftRoomPhotosEditor,
  MAX_ROOM_PHOTOS,
  type DraftRoomPhoto,
} from "@/components/dashboard/listing-draft-rooms-panel";
import { VenueDetailsFields } from "@/components/dashboard/host-venue-listing-sections";
import { ListingAdvancedFiltersField } from "@/components/dashboard/listing-advanced-filters-field";
import { RichTextEditor } from "@/components/dashboard/rich-text-editor";
import {
  LISTING_TITLE_MAX_CHARS,
  LISTING_TITLE_MAX_WORDS,
  clampListingTitle,
  listingTitleWordCount,
} from "@/lib/listings/listing-title";
import {
  createEmptyVenueDetails,
  type VenueDetails,
  type VenueDetailsVariant,
} from "@/lib/listings/venue-details-types";
import type { ListingFilterValues } from "@/lib/listings/submission-types";

export type DraftVenueSpace = {
  key: string;
  name: string;
  description: string;
  price: string;
  capacity: number;
  photos: DraftRoomPhoto[];
  /** Suitable for, amenities, indoor/outdoor, facilities — per space in multi-rate mode. */
  advancedIds: string[];
  /** Capacity, size, and pricing terms — per space in multi-rate mode. */
  venueDetails?: VenueDetails;
};

export function createEmptyDraftVenueSpace(
  variant: VenueDetailsVariant = "event"
): DraftVenueSpace {
  return {
    key: `venue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    description: "",
    price: "",
    capacity: variant === "dining" ? 20 : 50,
    photos: [],
    advancedIds: [],
    venueDetails: createEmptyVenueDetails(variant),
  };
}

function SpaceAdvancedFilters({
  space,
  filterValues,
  onPatch,
}: {
  space: DraftVenueSpace;
  filterValues: ListingFilterValues;
  onPatch: (partial: Partial<DraftVenueSpace>) => void;
}) {
  return (
    <ListingAdvancedFiltersField
      values={{ ...filterValues, advancedIds: space.advancedIds }}
      onChange={(next) => onPatch({ advancedIds: next.advancedIds })}
      placement="venueSpaceColumn"
      embedded
    />
  );
}

function revokeVenuePhotos(photos: DraftRoomPhoto[]) {
  photos.forEach((photo) => {
    if (photo.preview.startsWith("blob:")) URL.revokeObjectURL(photo.preview);
  });
}

function SpaceBasicsFields({
  space,
  index,
  spacesCount,
  currency,
  currencySymbol,
  singleVenueMode,
  variant = "event",
  onPatch,
  onRemove,
}: {
  space: DraftVenueSpace;
  index: number;
  spacesCount: number;
  currency: string;
  currencySymbol?: string;
  singleVenueMode?: boolean;
  variant?: VenueDetailsVariant;
  onPatch: (partial: Partial<DraftVenueSpace>) => void;
  onRemove: () => void;
}) {
  const rateLabel =
    variant === "dining"
      ? singleVenueMode
        ? "Indicative spend (per person)"
        : "Indicative spend"
      : singleVenueMode
        ? "Starting rate"
        : "Indicative rate";

  return (
    <>
      {!singleVenueMode ? (
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
          Space {index + 1}
        </p>
        {spacesCount > 1 ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        ) : null}
      </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_11rem] gap-3">
        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">
            {singleVenueMode
              ? variant === "dining"
                ? "Restaurant name"
                : "Venue name"
              : variant === "dining"
                ? "Dining space name"
                : "Space name"}
          </span>
          <input
            value={space.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            placeholder={
              variant === "dining" ? "Terrace dining, private majlis…" : "Main banquet hall"
            }
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-gray-600 mb-1">{rateLabel}</span>
          <div className="flex items-stretch">
            <div className="inline-flex items-center gap-1 rounded-s-lg border border-gray-200 border-e-0 bg-gray-50 px-2 text-[11px] text-gray-700 shrink-0">
              <span className="font-semibold">{currency}</span>
              {currencySymbol ? <span className="text-gray-400">{currencySymbol}</span> : null}
            </div>
            <input
              type="number"
              min={0}
              value={space.price}
              onChange={(e) => onPatch({ price: e.target.value })}
              placeholder="8000"
              className="w-full min-w-0 border border-gray-200 rounded-e-lg rounded-s-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </label>
      </div>

      <label className="block">
        <span className="block text-xs font-medium text-gray-600 mb-1">Space description</span>
        <textarea
          value={space.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          rows={3}
          placeholder={
            variant === "dining"
              ? "Menu style, seating, best for groups or couples…"
              : "Size, layout, best use cases, included furniture, etc."
          }
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y min-h-[72px]"
        />
      </label>
    </>
  );
}

export function ListingDraftVenueSpacesEditor({
  spaces,
  onSpacesChange,
  venueDetails,
  onVenueDetailsChange,
  currency,
  currencySymbol,
  singleVenueMode = false,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  overviewPhotos,
  filterValues,
  onFilterValuesChange,
  variant = "event",
}: {
  spaces: DraftVenueSpace[];
  onSpacesChange: (spaces: DraftVenueSpace[]) => void;
  venueDetails: VenueDetails;
  onVenueDetailsChange: (next: VenueDetails) => void;
  currency: string;
  currencySymbol?: string;
  variant?: VenueDetailsVariant;
  /** One rate for whole venue — title, description, photos, and venue fields in one card. */
  singleVenueMode?: boolean;
  title?: string;
  onTitleChange?: (value: string) => void;
  description?: string;
  onDescriptionChange?: (value: string) => void;
  overviewPhotos?: ReactNode;
  filterValues?: ListingFilterValues;
  onFilterValuesChange?: (values: ListingFilterValues) => void;
}) {
  const spacesRef = useRef(spaces);
  spacesRef.current = spaces;

  useEffect(() => {
    return () => {
      spacesRef.current.forEach((space) => revokeVenuePhotos(space.photos));
    };
  }, []);

  function patchSpace(key: string, partial: Partial<DraftVenueSpace>) {
    onSpacesChange(spaces.map((space) => (space.key === key ? { ...space, ...partial } : space)));
  }

  function removeSpace(key: string) {
    const target = spaces.find((space) => space.key === key);
    if (target) revokeVenuePhotos(target.photos);
    onSpacesChange(spaces.filter((space) => space.key !== key));
  }

  const firstSpace = spaces[0];
  const mergedSingleCard =
    singleVenueMode && title !== undefined && onTitleChange && overviewPhotos !== undefined;

  const showPerSpaceFilters =
    !singleVenueMode && filterValues !== undefined && onFilterValuesChange !== undefined;

  function handleTitleChange(value: string) {
    const next = clampListingTitle(value);
    onTitleChange?.(next);
    if (firstSpace) {
      patchSpace(firstSpace.key, { name: next.trim() });
    }
  }

  if (variant === "dining" && !mergedSingleCard) {
    return null;
  }

  if (mergedSingleCard) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-green-700" />
            {variant === "dining" ? "Restaurant details" : "Venue details"}
          </p>
        </div>

        <div>
          <div
            className={
              variant === "dining" || !firstSpace
                ? undefined
                : "grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_11rem] gap-x-4 gap-y-1.5"
            }
          >
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="venue-title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <span className="text-xs text-gray-400">
                {listingTitleWordCount(title)}/{LISTING_TITLE_MAX_WORDS} words
              </span>
            </div>
            {firstSpace && variant !== "dining" ? (
              <span className="block text-sm font-medium text-gray-700">Starting rate</span>
            ) : null}
            <input
              id="venue-title"
              name="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              maxLength={LISTING_TITLE_MAX_CHARS}
              placeholder={
                variant === "dining"
                  ? "Sunset Farm Table & Kitchen"
                  : "Grand Palace Estate & Event Venue"
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {firstSpace && variant !== "dining" ? (
              <div className="flex items-stretch">
                <div className="inline-flex items-center gap-1 rounded-s-lg border border-gray-200 border-e-0 bg-gray-50 px-2.5 text-xs text-gray-700 shrink-0">
                  <span className="font-semibold">{currency}</span>
                  {currencySymbol ? <span className="text-gray-400">{currencySymbol}</span> : null}
                </div>
                <input
                  type="number"
                  min={0}
                  value={firstSpace.price}
                  onChange={(e) => patchSpace(firstSpace.key, { price: e.target.value })}
                  placeholder="8000"
                  className="w-full min-w-0 border border-gray-200 rounded-e-lg rounded-s-none px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            ) : null}
          </div>
          {variant === "dining" ? (
            <p className="text-xs text-gray-500 mt-1">
              Indicative pricing is set in Dining details below (price level and average spend).
            </p>
          ) : null}
          <p className="text-xs text-gray-400 mt-1">
            Short titles stay on one line on the listing page.
          </p>
        </div>

        <div>
          <label htmlFor="venue-description" className="block text-sm font-medium text-gray-700 mb-1.5">
            Description
          </label>
          <RichTextEditor
            id="venue-description"
            name="description"
            rows={8}
            value={description ?? ""}
            onChange={(value) => onDescriptionChange?.(value)}
            placeholder={
              variant === "dining"
                ? "Describe your dining experience, menu style, and setting…"
                : "Describe your property..."
            }
          />
        </div>

        {firstSpace && variant !== "dining" ? (
          <VenueDetailsFields
            value={venueDetails}
            onChange={onVenueDetailsChange}
            currency={currency}
            currencySymbol={currencySymbol}
            showStartingPrice={false}
            compact
            variant={variant}
          />
        ) : null}

        <div>
          <p className="text-xs text-gray-500 mb-1.5">
            {variant === "dining"
              ? "Restaurant photos (exterior, dining room, dishes, terrace)."
              : "Venue photos (exterior, entrance, halls, and setup)."}
          </p>
          {overviewPhotos}
        </div>
      </div>
    );
  }

  return (
    <>
      {spaces.map((space, index) => (
        <div
          key={space.key}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <SpaceBasicsFields
            space={space}
            index={index}
            spacesCount={spaces.length}
            currency={currency}
            currencySymbol={currencySymbol}
            singleVenueMode={singleVenueMode}
            variant={variant}
            onPatch={(partial) => patchSpace(space.key, partial)}
            onRemove={() => removeSpace(space.key)}
          />
          <VenueDetailsFields
            value={space.venueDetails ?? createEmptyVenueDetails()}
            onChange={(next) => patchSpace(space.key, { venueDetails: next })}
            currency={currency}
            currencySymbol={currencySymbol}
            showStartingPrice={false}
            compact
            variant={variant}
          />
          {showPerSpaceFilters ? (
            <SpaceAdvancedFilters
              space={space}
              filterValues={filterValues}
              onPatch={(partial) => patchSpace(space.key, partial)}
            />
          ) : null}
          <DraftRoomPhotosEditor
            roomName={space.name}
            photos={space.photos}
            onChange={(photos) => patchSpace(space.key, { photos })}
          />
        </div>
      ))}

      {!singleVenueMode ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSpacesChange([...spaces, createEmptyDraftVenueSpace(variant)]);
          }}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-green-300 bg-green-50/50 px-3 py-2.5 text-sm font-semibold text-green-800 hover:bg-green-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {variant === "dining" ? "Add another dining space" : "Add another space"}
        </button>
      ) : null}
    </>
  );
}
