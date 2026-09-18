import { Calendar, Heart, LifeBuoy, MessageSquare, Settings, ShoppingBag, User } from "lucide-react";
import type { DashboardNavItem } from "@/components/dashboard/dashboard-shell";
import { GuestCartBadge } from "@/lib/guest/guest-cart-badge";
import { GuestFavoritesBadge } from "@/lib/guest/guest-favorites-badge";

export const GUEST_NAV: DashboardNavItem[] = [
  { label: "Profile", href: "/account", icon: User },
  { label: "My Bookings", href: "/account?tab=bookings", icon: Calendar },
  { label: "Messages", href: "/account?tab=messages", icon: MessageSquare },
  { label: "Cart", href: "/cart", icon: ShoppingBag, Trailing: GuestCartBadge },
  { label: "Saved Stays", href: "/account?tab=favorites", icon: Heart, Trailing: GuestFavoritesBadge },
  { label: "Support", href: "/account/support", icon: LifeBuoy },
  { label: "Settings", href: "/account?tab=settings", icon: Settings },
];

/** Bookings, cart, and saved stays — shown under Profile in the site header menu. */
export const GUEST_HEADER_QUICK_LINKS = GUEST_NAV.slice(1, 4);
