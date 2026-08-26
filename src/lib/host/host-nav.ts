import {
  BadgeDollarSign,
  Bell,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  LifeBuoy,
  List,
  MessageSquare,
  Megaphone,
  ReceiptText,
  Sprout,
  User,
  Users,
  Wallet,
} from "lucide-react";
import type { DashboardNavItem } from "@/components/dashboard/dashboard-shell";
import { HostNotificationsBadge } from "@/lib/host/host-notifications-badge";

/**
 * Host dashboard sidebar — one link per section, all routes exist under /host/*.
 * Verification & Trust lives under Profile.
 */
export const HOST_NAV: DashboardNavItem[] = [
  { label: "Overview", href: "/host", icon: LayoutDashboard },
  { label: "Notifications", href: "/host/notifications", icon: Bell, Trailing: HostNotificationsBadge },
  { label: "Profile", href: "/host/profile", icon: User },
  { label: "User / Staff", href: "/host/staff", icon: Users },
  { label: "My Listings", href: "/host/listings", icon: List },
  { label: "Pricing", href: "/host/pricing", icon: BadgeDollarSign },
  { label: "Promote", href: "/host/promote", icon: Megaphone },
  { label: "Extra charges", href: "/host/extra-charges", icon: ReceiptText },
  { label: "House rules & policies", href: "/host/house-rules", icon: ClipboardList },
  { label: "Bookings", href: "/host/bookings", icon: CalendarDays },
  { label: "Calendar & Availability", href: "/host/calendar", icon: CalendarRange },
  { label: "Accounts", href: "/host/accounts", icon: Wallet },
  { label: "Reviews", href: "/host/reviews", icon: MessageSquare },
  { label: "Farm add-ons", href: "/host/add-ons", icon: Sprout },
  { label: "Support", href: "/host/support", icon: LifeBuoy },
];
