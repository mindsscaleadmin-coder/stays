"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, ChevronLeft, ChevronRight, Tag } from "lucide-react";
import type { Stay } from "@/lib/mock/data";
import { photoTagLabel } from "@/lib/listings/photo-tags";
import { cn } from "@/lib/utils";

export type GalleryPhotoItem = { src: string; tag?: string };

function GalleryCarousel({
  photos,
  alt,
}: {
  photos: GalleryPhotoItem[];
  alt: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const total = photos.length;

  const syncIndex = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || total === 0) return;
    const width = el.clientWidth;
    if (width <= 0) return;
    const next = Math.round(el.scrollLeft / width);
    setIndex(Math.min(total - 1, Math.max(0, next)));
  }, [total]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncIndex();
    el.addEventListener("scroll", syncIndex, { passive: true });
    window.addEventListener("resize", syncIndex);
    return () => {
      el.removeEventListener("scroll", syncIndex);
      window.removeEventListener("resize", syncIndex);
    };
  }, [syncIndex]);

  const goTo = useCallback(
    (next: number) => {
      const el = scrollerRef.current;
      if (!el || total === 0) return;
      const clamped = Math.min(total - 1, Math.max(0, next));
      el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
      setIndex(clamped);
    },
    [total]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index]);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-sm text-gray-400">
        No photos
      </div>
    );
  }

  const canPrev = index > 0;
  const canNext = index < total - 1;

  return (
    <div className="relative bg-black">
      <div
        ref={scrollerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${alt} photo gallery`}
      >
        {photos.map((photo, i) => (
          <div
            key={`${photo.src}-${i}`}
            className="relative w-full min-w-full h-[min(78vh,720px)] shrink-0 snap-center snap-always"
            aria-hidden={i !== index}
          >
            <Image
              src={photo.src}
              alt={
                photo.tag
                  ? `${alt} — ${photoTagLabel(photo.tag)}`
                  : `${alt} ${i + 1}`
              }
              fill
              className="object-contain bg-black"
              sizes="100vw"
              priority={i === 0}
              unoptimized={photo.src.startsWith("data:")}
              draggable={false}
            />
            {photo.tag ? (
              <span className="absolute top-4 start-4 z-10 inline-flex items-center gap-1.5 max-w-[80%] truncate bg-black/65 text-white text-xs font-medium px-3 py-1.5 rounded-md">
                <Tag className="w-3.5 h-3.5 shrink-0" />
                {photoTagLabel(photo.tag)}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            disabled={!canPrev}
            onClick={() => goTo(index - 1)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 start-3 z-10 w-10 h-10 rounded-full bg-white/90 text-gray-900 shadow-md flex items-center justify-center transition-opacity",
              canPrev ? "opacity-100 hover:bg-white" : "opacity-0 pointer-events-none"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            disabled={!canNext}
            onClick={() => goTo(index + 1)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 end-3 z-10 w-10 h-10 rounded-full bg-white/90 text-gray-900 shadow-md flex items-center justify-center transition-opacity",
              canNext ? "opacity-100 hover:bg-white" : "opacity-0 pointer-events-none"
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 inset-x-0 z-10 flex flex-col items-center gap-2 pointer-events-none">
            <span className="text-xs font-semibold text-white bg-black/55 px-2.5 py-1 rounded-full">
              {index + 1} / {total}
            </span>
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to photo ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => goTo(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                  )}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ListingGalleryContent({
  stay,
  images,
  photos,
}: {
  stay: Stay;
  images?: string[];
  photos?: GalleryPhotoItem[];
}) {
  const stayName = stay.name;
  const gallery: GalleryPhotoItem[] =
    photos && photos.length > 0
      ? photos
      : (images ?? []).map((src) => ({ src }));

  return (
    <div className="bg-black min-h-screen">
      <div className="border-b border-white/10 bg-black/90 sticky top-0 z-20 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/listing/${stay.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to listing
          </Link>
          <span className="text-white/25">|</span>
          <h1 className="text-sm font-semibold text-white truncate">{stayName}</h1>
          <span className="text-xs text-white/50 ms-auto shrink-0">
            {gallery.length} photos
          </span>
        </div>
      </div>

      <GalleryCarousel photos={gallery} alt={stayName} />
    </div>
  );
}
