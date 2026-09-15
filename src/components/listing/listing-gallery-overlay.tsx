"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  GalleryCarousel,
  type GalleryPhotoItem,
} from "@/components/listing/listing-gallery-content";

export function ListingGalleryOverlay({
  open,
  onClose,
  photos,
  alt,
  videoTourUrl,
  startIndex = 0,
  startOnVideo = false,
}: {
  open: boolean;
  onClose: () => void;
  photos: GalleryPhotoItem[];
  alt: string;
  videoTourUrl?: string;
  startIndex?: number;
  startOnVideo?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const mediaLabel =
    photos.length > 0 && videoTourUrl
      ? `${photos.length} photos · 1 video`
      : photos.length > 0
        ? `${photos.length} photos`
        : videoTourUrl
          ? "1 video"
          : "0 photos";

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex flex-col bg-black">
        <div className="flex items-center gap-3 border-b border-white/10 bg-black/90 px-4 py-3 backdrop-blur-sm">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{alt}</h2>
          <span className="shrink-0 text-xs text-white/50">{mediaLabel}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gallery"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1">
          <GalleryCarousel
            key={`${startIndex}-${startOnVideo}`}
            photos={photos}
            alt={alt}
            videoTourUrl={videoTourUrl}
            startIndex={startIndex}
            startOnVideo={startOnVideo}
            fullHeight
          />
        </div>
      </div>
    </ModalPortal>
  );
}
