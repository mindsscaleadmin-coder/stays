"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Users,
  X,
} from "lucide-react";
import { useAdminTaxonomy } from "@/components/providers/admin-taxonomy-provider";
import { EventSpaceCapacitySection } from "@/components/listing/event-space-capacity-section";
import {
  buildVenueCapacityLayouts,
  buildVenueSpaceFeatureRows,
  primarySpaceTypeLabel,
} from "@/lib/listings/event-space-display";
import type { EventSpace } from "@/lib/listings/event-space-types";
import { resolveVenueSpaceFilterGroups } from "@/lib/listings/resolve-venue-space-filters";
import { LISTING_PLACEHOLDER_IMG } from "@/lib/listings/submission-to-stay";
import type { VenueDetails } from "@/lib/listings/venue-details-types";
import { isDataImageUrl } from "@/lib/utils";
import { VenueFilterGroupBlock } from "@/components/listing/venue-filter-group-display";
import { ModalPortal } from "@/components/ui/modal-portal";

const DESC_PREVIEW_CHARS = 150;

export function shouldShowSpaceReadMore(desc?: string) {
  return (desc?.trim().length ?? 0) > DESC_PREVIEW_CHARS;
}

function SpaceImageGallery({
  images,
  alt,
  expanded,
  onExpand,
  onCollapse,
  panel = false,
}: {
  images: string[];
  alt: string;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  panel?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const hasMultiple = images.length > 1;
  const current = images[index] ?? LISTING_PLACEHOLDER_IMG;

  useEffect(() => {
    setIndex(0);
  }, [images]);

  function showPrev() {
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  }

  function showNext() {
    setIndex((prev) => (prev + 1) % images.length);
  }

  useEffect(() => {
    if (!hasMultiple) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setIndex((prev) => (prev - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight") {
        setIndex((prev) => (prev + 1) % images.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasMultiple, images.length]);

  const shellClass = panel
    ? "relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-gray-100 lg:aspect-auto lg:h-full lg:min-h-[360px]"
    : expanded
      ? "relative h-full min-h-0 w-full overflow-hidden bg-gray-100"
      : "relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-gray-100";

  return (
    <div className={shellClass}>
      <div className="relative h-full min-h-[inherit] w-full">
        <Image
          src={current}
          alt={alt}
          fill
          className={expanded ? "object-contain bg-gray-950" : "object-cover"}
          sizes={expanded ? "50vw" : panel ? "480px" : "960px"}
          unoptimized={isDataImageUrl(current)}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={showPrev}
              className="absolute start-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={showNext}
              className="absolute end-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
              aria-label="Next photo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute bottom-3 end-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {index + 1} / {images.length}
            </span>
          </>
        ) : null}

        <button
          type="button"
          onClick={expanded ? onCollapse : onExpand}
          className={`absolute flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white ${
            expanded ? "end-3 top-3" : "bottom-3 start-3"
          }`}
          aria-label={expanded ? "Exit full screen" : "View full screen"}
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function SpaceDetailBody({
  space,
  money,
  spaceTypeLabel,
  displayCapacity,
  capacityLayouts,
  filterGroups,
  featureRows,
  showDetailsGrid,
}: {
  space: EventSpace;
  money: (amount: number) => string;
  spaceTypeLabel: string | null;
  displayCapacity: number;
  capacityLayouts: ReturnType<typeof buildVenueCapacityLayouts>;
  filterGroups: { label: string; names: string[] }[];
  featureRows: { label: string; value: string }[];
  showDetailsGrid: boolean;
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="event-space-detail-title"
            className="font-display text-xl font-bold tracking-tight text-gray-950 sm:text-2xl"
          >
            {space.name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-gray-800">
            {spaceTypeLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-gray-500" />
                {spaceTypeLabel}
              </span>
            ) : null}
            {displayCapacity > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-gray-500" />
                {displayCapacity.toLocaleString()} capacity
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-gray-500">
                <Users className="h-4 w-4" />
                Capacity on request
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 text-end">
          <div className="font-display text-2xl font-extrabold tracking-tight text-gray-950">
            {space.price > 0 ? money(space.price) : "On request"}
          </div>
          <p className="mt-0.5 text-xs font-medium text-gray-500">
            {space.price > 0 ? "starting rate · per event" : "contact for quote"}
          </p>
        </div>
      </div>

      {capacityLayouts.length > 0 ? (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <EventSpaceCapacitySection layouts={capacityLayouts} />
        </div>
      ) : null}

      {showDetailsGrid ? (
        <div className="mt-5 space-y-5 border-t border-gray-100 pt-5">
          {filterGroups.length > 0 ? (
            <div className="space-y-4">
              {filterGroups.map((group) => (
                <VenueFilterGroupBlock
                  key={group.label}
                  group={{ label: group.label, items: group.names }}
                />
              ))}
            </div>
          ) : null}

          {featureRows.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-gray-600">Features</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {featureRows.map((row) => (
                  <li
                    key={row.label}
                    className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5 text-sm text-gray-700"
                  >
                    <span className="font-semibold text-gray-900">{row.label}</span>
                    <span className="text-gray-600"> · {row.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {space.desc ? (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <h3 className="font-display text-sm font-bold text-gray-900">About this space</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
            {space.desc}
          </p>
        </div>
      ) : null}

      <p className="mt-5 text-xs leading-relaxed text-gray-500">
        Final pricing and availability are confirmed directly with the host after you send an
        enquiry.
      </p>
    </>
  );
}

export function EventSpaceDetailModal({
  open,
  space,
  money,
  venueDetails,
  showVenueSpaceDetails = false,
  onClose,
  onRequest,
}: {
  open: boolean;
  space: EventSpace | null;
  money: (amount: number) => string;
  venueDetails?: VenueDetails;
  /** Show per-space venue filters (multi-rate listings only). */
  showVenueSpaceDetails?: boolean;
  onClose: () => void;
  onRequest: () => void;
}) {
  const { data: taxonomy } = useAdminTaxonomy();
  const [expandedGallery, setExpandedGallery] = useState(false);

  const images = useMemo(() => {
    if (!space) return [];
    if (space.images?.length) return space.images;
    const cover = space.img || LISTING_PLACEHOLDER_IMG;
    return [cover];
  }, [space]);

  useEffect(() => {
    if (!open) {
      setExpandedGallery(false);
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (expandedGallery) {
          setExpandedGallery(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, expandedGallery]);

  const filterGroups = useMemo(() => {
    if (!showVenueSpaceDetails || !space) return [];
    if (space.filterGroups?.length) return space.filterGroups;
    if (!space.advancedFilterIds?.length) return [];
    return resolveVenueSpaceFilterGroups(taxonomy, space.advancedFilterIds);
  }, [showVenueSpaceDetails, space, taxonomy]);

  const resolvedVenueDetails = space?.venueDetails ?? venueDetails;

  const featureRows = useMemo(
    () => buildVenueSpaceFeatureRows(resolvedVenueDetails, money),
    [resolvedVenueDetails, money]
  );

  const capacityLayouts = useMemo(
    () => buildVenueCapacityLayouts(resolvedVenueDetails),
    [resolvedVenueDetails]
  );

  const spaceTypeLabel = useMemo(
    () => primarySpaceTypeLabel(filterGroups),
    [filterGroups]
  );

  const showDetailsGrid =
    filterGroups.length > 0 || featureRows.length > 0 || capacityLayouts.length > 0;

  if (!open || !space) return null;

  const displayCapacity =
    space.capacity > 0
      ? space.capacity
      : resolvedVenueDetails?.maxGuests ?? venueDetails?.maxGuests ?? 0;

  const bodyProps = {
    space,
    money,
    spaceTypeLabel,
    displayCapacity,
    capacityLayouts,
    filterGroups,
    featureRows,
    showDetailsGrid,
  };

  const dialogClass = expandedGallery
    ? "relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white lg:flex-row"
    : "relative flex max-h-[min(92vh,860px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-gray-200/80 bg-white shadow-2xl sm:rounded-2xl lg:max-h-[min(92vh,860px)] lg:flex-row";

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 z-[100] flex justify-center bg-gray-950/60 backdrop-blur-[3px] ${
          expandedGallery ? "items-stretch p-0" : "items-end sm:items-center sm:p-6"
        }`}
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !expandedGallery) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-space-detail-title"
          className={dialogClass}
        >
          <div
            className={`flex min-h-0 flex-col ${
              expandedGallery
                ? "order-1 h-full w-full overflow-hidden border-gray-200 lg:w-1/2 lg:border-e"
                : "order-2 min-h-0 flex-1 lg:order-1 lg:w-[52%]"
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`absolute z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white ${
                expandedGallery ? "end-3 top-3 lg:start-3 lg:end-auto" : "end-3 top-3 lg:hidden"
              }`}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <SpaceDetailBody {...bodyProps} />
            </div>

            <div className="flex shrink-0 gap-3 border-t border-gray-100 bg-gray-50/80 p-4 sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequest();
                }}
                className="inline-flex flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-green-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-900"
              >
                Request this space
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className={`relative shrink-0 ${
              expandedGallery
                ? "order-2 h-full w-full lg:w-1/2"
                : "order-1 lg:order-2 lg:w-[48%] lg:min-h-[360px] lg:self-stretch"
            }`}
          >
            {!expandedGallery ? (
              <button
                type="button"
                onClick={onClose}
                className="absolute end-3 top-3 z-10 hidden h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white lg:flex"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}

            <SpaceImageGallery
              images={images}
              alt={space.name}
              expanded={expandedGallery}
              onExpand={() => setExpandedGallery(true)}
              onCollapse={() => setExpandedGallery(false)}
              panel={!expandedGallery}
            />
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
