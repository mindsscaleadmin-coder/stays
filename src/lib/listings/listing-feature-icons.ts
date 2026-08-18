import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  Car,
  Flame,
  Home,
  Leaf,
  Mountain,
  Sun,
  Trees,
  Utensils,
  Wifi,
  Waves,
} from "lucide-react";

export const LISTING_FEATURE_ICON_OPTIONS = [
  { key: "mountain", label: "Mountain", Icon: Mountain },
  { key: "trees", label: "Trees / Nature", Icon: Trees },
  { key: "flame", label: "Flame / BBQ", Icon: Flame },
  { key: "home", label: "Home", Icon: Home },
  { key: "car", label: "Parking", Icon: Car },
  { key: "wifi", label: "WiFi", Icon: Wifi },
  { key: "leaf", label: "Garden", Icon: Leaf },
  { key: "utensils", label: "Dining", Icon: Utensils },
  { key: "bed", label: "Bedroom", Icon: BedDouble },
  { key: "sun", label: "Sun / Outdoor", Icon: Sun },
  { key: "waves", label: "Pool / Water", Icon: Waves },
] as const;

export type ListingFeatureIconKey = (typeof LISTING_FEATURE_ICON_OPTIONS)[number]["key"];

const ICON_MAP = Object.fromEntries(
  LISTING_FEATURE_ICON_OPTIONS.map((o) => [o.key, o.Icon])
) as Record<ListingFeatureIconKey, LucideIcon>;

export function getListingFeatureIcon(key: string): LucideIcon {
  return ICON_MAP[key as ListingFeatureIconKey] ?? Home;
}

export function listingFeatureIconLabel(key: string): string {
  return LISTING_FEATURE_ICON_OPTIONS.find((o) => o.key === key)?.label ?? key;
}

export const MAX_LISTING_FEATURE_ICONS = 4;

export const DEFAULT_LISTING_FEATURE_ICON_ROWS = [
  { label: "Mountain View", iconKey: "mountain" as const },
  { label: "Private Pool", iconKey: "waves" as const },
  { label: "BBQ Area", iconKey: "flame" as const },
  { label: "Outdoor Seating", iconKey: "home" as const },
];
