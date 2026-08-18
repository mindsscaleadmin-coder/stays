import {
  BadgeDollarSign,
  BarChart3,
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

/**
 * Host dashboard sidebar — one link per section, all routes exist under /host/*.
 * Verification & Trust lives under Profile.
 */
export const HOST_NAV: DashboardNavItem[] = [
  { label: "Overview", href: "/host", icon: LayoutDashboard },
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
  { label: "Analytics", href: "/host/analytics", icon: BarChart3 },
  { label: "Farm add-ons", href: "/host/add-ons", icon: Sprout },
  { label: "Notifications", href: "/host/notifications", icon: Bell },
  { label: "Support", href: "/host/support", icon: LifeBuoy },
];
