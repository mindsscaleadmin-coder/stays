import { Lock, MapPin } from "lucide-react";
import { ListingMapEmbed } from "@/components/listing/listing-map-embed";
import { buildLocationMapEmbedUrl } from "@/lib/listings/map-embed";

/** Decorative, non-interactive map for guest listing pages. */
export function ListingLocationPreview({
  areaLabel,
  mapEmbedUrl,
  mapSearchQuery,
  className,
}: {
  areaLabel: string;
  mapEmbedUrl?: string;
  /** Full location string used to build a fallback map when no embed URL is saved. */
  mapSearchQuery?: string;
  className?: string;
}) {
  const label = areaLabel.trim() || "This area";
  const resolvedMapUrl =
    mapEmbedUrl ||
    buildLocationMapEmbedUrl(mapSearchQuery?.trim() || label, {
      zoom: 6,
      mapType: "terrain",
    });

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100 select-none touch-none ${className ?? "h-56 w-full"}`}
      role="img"
      aria-label={`Approximate area — ${label}`}
    >
      {resolvedMapUrl ? (
        <div className="absolute inset-0">
          <ListingMapEmbed
            src={resolvedMapUrl}
            title={`Map preview — ${label}`}
            className="h-full w-full"
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50/80" />
      )}

      <div
        className="pointer-events-none absolute left-1/2 top-[42%] z-10 -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <span className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-400/30 animate-ping" />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-green-600 text-white shadow-lg shadow-green-900/25">
          <MapPin className="h-5 w-5" />
        </span>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/55 via-black/25 to-transparent px-4 pb-3 pt-10">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 text-white">
            <p className="text-sm font-semibold truncate drop-shadow-sm">{label}</p>
            <p className="text-[11px] text-white/85 mt-0.5">Exact pin shared after booking</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-700 shadow-sm">
            <Lock className="h-3 w-3 text-green-700" />
            Preview
          </span>
        </div>
      </div>
    </div>
  );
}
