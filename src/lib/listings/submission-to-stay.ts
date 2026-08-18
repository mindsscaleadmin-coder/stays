import type { Stay } from "@/lib/mock/data";
import { isInstantBookingEffective } from "@/lib/admin/platform-config-data";
import type { SubmittedListing } from "./submission-types";

const DEFAULT_IMG =
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200";

function parseCount(label: string, value: string, fallback: number): number {
  const match = value.match(/\d+/);
  if (match) return Number(match[0]);
  const fromLabel = label.match(/\d+/);
  if (fromLabel) return Number(fromLabel[0]);
  return fallback;
}

export function submissionToStay(listing: SubmittedListing): Stay {
  const bedroomsFilter = listing.customFilters.find((f) => /bedroom/i.test(f.label));
  const bedsOnlyFilter = listing.customFilters.find((f) => /^beds?$/i.test(f.label.trim()));
  const bathsFilter = listing.customFilters.find((f) => /bath/i.test(f.label));

  const beds = bedroomsFilter
    ? parseCount(bedroomsFilter.label, bedroomsFilter.value, 2)
    : bedsOnlyFilter
      ? parseCount(bedsOnlyFilter.label, bedsOnlyFilter.value, 2)
      : 2;
  const baths = bathsFilter
    ? parseCount(bathsFilter.label, bathsFilter.value, 1)
    : 1;

  const type: Stay["type"] =
    listing.type === "homestay"
      ? "homestay"
      : listing.type === "venue"
        ? "venue"
        : listing.type === "experience"
          ? "experience"
          : "farmstay";

  return {
    id: listing.id,
    name: listing.title,
    location: `${listing.district}, ${listing.state}, ${listing.country}`,
    price: 800,
    rating: listing.status === "approved" ? 4.8 : 0,
    reviews: 0,
    guests: Math.max(beds * 2, 2),
    beds,
    baths,
    badge: listing.featured
      ? "Featured"
      : listing.status === "approved"
        ? "Live"
        : "Preview",
    badgeColor: listing.featured
      ? "bg-purple-600"
      : listing.status === "approved"
        ? "bg-green-600"
        : "bg-amber-500",
    img: listing.photoUrls[0] ?? DEFAULT_IMG,
    category: listing.category || listing.subcategory,
    subcategory: listing.subcategory,
    type,
    parentCategory: listing.parentCategory,
    photoCount: Math.max(listing.photoUrls?.length ?? listing.photoCount ?? 1, 1),
    postedAt: listing.submittedAt,
    instantBook: typeof window !== "undefined" ? isInstantBookingEffective() : false,
    amenities:
      (() => {
        const merged = [
          ...(listing.amenities ?? []),
          ...(listing.advancedFilters ?? []),
        ];
        const seen = new Set<string>();
        const out: string[] = [];
        for (const item of merged) {
          const label = item.trim();
          if (!label) continue;
          const key = label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(label);
        }
        return out.length > 0
          ? out
          : ["Free WiFi", "BBQ Area", "Farm Activities"];
      })(),
  };
}

export function submissionGallery(listing: SubmittedListing): string[] {
  if (listing.photoUrls.length > 0) return listing.photoUrls;
  return [DEFAULT_IMG];
}

export interface GalleryPhoto {
  src: string;
  tag?: string;
}

/** Photos with optional tags from host listing (aligned by index). */
export function submissionGalleryPhotos(listing: SubmittedListing): GalleryPhoto[] {
  const urls = submissionGallery(listing);
  const tags = listing.photoTags ?? [];
  return urls.map((src, index) => ({
    src,
    tag: tags[index]?.trim() || undefined,
  }));
}

