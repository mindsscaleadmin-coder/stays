import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Heart, MapPin, Star } from "lucide-react";
import { isDataImageUrl } from "@/lib/utils";

export function HomeTrendingCard({
  href,
  name,
  location,
  img,
  badge,
  badgeColor,
  price,
  priceSuffix,
  rating,
  reviewCount,
  wishlisted,
  onToggleWishlist,
}: {
  href: string;
  name: string;
  location: string;
  img: string;
  badge: string;
  badgeColor: string;
  price: string;
  priceSuffix?: string;
  rating: number;
  reviewCount: number;
  wishlisted: boolean;
  onToggleWishlist: () => void;
}) {
  return (
    <article
      className="home-carousel-item group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200/80 hover:shadow-md"
    >
      <Link href={href} className="absolute inset-0 z-10" aria-label={`View ${name}`} />
      <div className="relative aspect-[20/19] overflow-hidden bg-gray-100">
        <Image
          src={img}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 743px) 50vw, (max-width: 1279px) 17vw, 14vw"
          unoptimized={isDataImageUrl(img)}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/35 to-transparent" />
        <span
          className={`absolute start-2 top-2 ${badgeColor} text-white text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shadow-sm`}
        >
          {badge}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleWishlist();
          }}
          className="absolute end-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur-sm transition-transform hover:scale-105"
          aria-label="Add to wishlist"
        >
          <Heart
            className={`h-3.5 w-3.5 ${wishlisted ? "fill-red-500 text-red-500" : "text-gray-400"}`}
          />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="text-[13px] font-semibold leading-tight text-gray-900 line-clamp-1">
          {name}
        </h3>
        <p className="flex min-w-0 items-center gap-1 text-[11px] text-gray-500">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{location}</span>
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <p className="min-w-0 truncate text-sm font-bold text-green-700 tabular-nums">
            {price}
            {priceSuffix ? (
              <span className="text-[10px] font-normal text-gray-400"> {priceSuffix}</span>
            ) : null}
          </p>
          {reviewCount > 0 ? (
            <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-gray-600">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </span>
          ) : (
            <span className="shrink-0 text-[10px] font-medium text-gray-400">New</span>
          )}
        </div>
      </div>
    </article>
  );
}
