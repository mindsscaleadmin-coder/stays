import { Calendar, Heart, LifeBuoy, Settings, User } from "lucide-react";
import type { DashboardNavItem } from "@/components/dashboard/dashboard-shell";

export const GUEST_NAV: DashboardNavItem[] = [
  { label: "Profile", href: "/account", icon: User },
  { label: "My Bookings", href: "/account?tab=bookings", icon: Calendar },
  { label: "Saved Stays", href: "/account?tab=favorites", icon: Heart },
  { label: "Support", href: "/account/support", icon: LifeBuoy },
  { label: "Settings", href: "/account?tab=settings", icon: Settings },
];
