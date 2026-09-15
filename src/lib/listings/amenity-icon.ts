import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Car,
  CheckCircle,
  Flame,
  Home,
  Leaf,
  Mountain,
  Music,
  Shield,
  Sparkles,
  Tv,
  Users,
  Utensils,
  Waves,
  Wifi,
  Wind,
  Zap,
} from "lucide-react";

const AMENITY_ICONS: Record<string, LucideIcon> = {
  "Free WiFi": Wifi,
  WiFi: Wifi,
  Wifi: Wifi,
  "Private Pool": Waves,
  "Swimming Pool": Waves,
  Pool: Waves,
  "BBQ Area": Flame,
  BBQ: Flame,
  "Free Parking": Car,
  Parking: Car,
  "Farm Activities": Leaf,
  "Breakfast Incl.": Utensils,
  "Pet Friendly": Leaf,
  "Mountain View": Mountain,
  "Outdoor Seating": Home,
  "Air Conditioning": Wind,
  "Smart TV": Tv,
  Kitchen: Utensils,
  "Family Friendly": Users,
  "Instant Booking": Zap,
  "kids play area": Baby,
  "Kids Play Area": Baby,
  "Kids play area": Baby,
};

export function amenityIcon(name: string): LucideIcon {
  if (AMENITY_ICONS[name]) return AMENITY_ICONS[name];
  const lower = name.trim().toLowerCase();
  const hit = Object.entries(AMENITY_ICONS).find(([key]) => key.toLowerCase() === lower);
  if (hit) return hit[1];
  if (lower.includes("wifi") || lower.includes("wi-fi")) return Wifi;
  if (lower.includes("pool") || lower.includes("swim")) return Waves;
  if (lower.includes("bbq") || lower.includes("barbecue")) return Flame;
  if (lower.includes("park")) return Car;
  if (lower.includes("pet")) return Leaf;
  if (lower.includes("family")) return Users;
  if (lower.includes("instant")) return Zap;
  if (lower.includes("kid") || lower.includes("play") || lower.includes("child")) return Baby;
  if (lower.includes("kitchen") || lower.includes("breakfast") || lower.includes("dining") || lower.includes("cater")) {
    return Utensils;
  }
  if (lower.includes("mountain") || lower.includes("view")) return Mountain;
  if (lower.includes("music") || lower.includes("dj")) return Music;
  if (
    lower.includes("allow") ||
    lower.includes("smoking") ||
    lower.includes("alcohol") ||
    lower.includes("decorator")
  ) {
    return Shield;
  }
  if (lower.includes("wedding") || lower.includes("party") || lower.includes("corporate")) return Sparkles;
  return CheckCircle;
}
