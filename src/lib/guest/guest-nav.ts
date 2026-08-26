import { Calendar, Heart, LifeBuoy, Settings, ShoppingBag, User } from "lucide-react";
import type { DashboardNavItem } from "@/components/dashboard/dashboard-shell";
import { GuestCartBadge } from "@/lib/guest/guest-cart-badge";

export const GUEST_NAV: DashboardNavItem[] = [
  { label: "Profile", href: "/account", icon: User },
  { label: "My Bookings", href: "/account?tab=bookings", icon: Calendar },
  { label: "Cart", href: "/cart", icon: ShoppingBag, Trailing: GuestCartBadge },
  { label: "Saved Stays", href: "/account?tab=favorites", icon: Heart },
  { label: "Support", href: "/account/support", icon: LifeBuoy },
  { label: "Settings", href: "/account?tab=settings", icon: Settings },
];
