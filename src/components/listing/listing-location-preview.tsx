import { Lock, MapPin } from "lucide-react";
import { ListingMapEmbed } from "@/components/listing/listing-map-embed";

/** Decorative, non-interactive map for guest listing pages. */
export function ListingLocationPreview({
  areaLabel,
  mapEmbedUrl,
  className,
}: {
  areaLabel: string;
  mapEmbedUrl?: string;
  className?: string;
}) {
  const label = areaLabel.trim() || "This area";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100 select-none touch-none ${className ?? "h-56 w-full"}`}
      role="img"
      aria-label={`Approximate area — ${label}`}
    >
      {mapEmbedUrl ? (
        <div className="absolute inset-0 scale-[1.65]">
          <ListingMapEmbed
            src={mapEmbedUrl}
            title={`Map preview — ${label}`}
            className="h-full w-full"
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50/80">
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(16, 185, 129, 0.08) 1px, transparent 1px)
              `,
              backgroundSize: "28px 28px",
            }}
          />
          <svg
            className="absolute inset-0 h-full w-full text-green-300/40"
            viewBox="0 0 400 224"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 140 C80 120, 120 160, 200 130 S320 100, 400 125 L400 224 L0 224 Z"
              fill="currentColor"
              opacity="0.25"
            />
            <path
              d="M-20 170 C60 150, 140 190, 220 165 S340 140, 420 155"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              opacity="0.5"
            />
          </svg>
        </div>
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
