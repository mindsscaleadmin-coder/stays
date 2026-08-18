import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Globe2,
  Headphones,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";
import type { DashboardNavItem } from "./dashboard-shell";

export const ADMIN_NAV: DashboardNavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Analytics Dashboard", href: "/admin/analytics", icon: BarChart3 },
  { label: "Listing Control", href: "/admin/listings", icon: ClipboardList },
  { label: "Host Control Panel", href: "/admin/hosts", icon: Building2 },
  { label: "Users & Access", href: "/admin/users", icon: Users },
  { label: "Booking Oversight", href: "/admin/bookings", icon: CalendarDays },
  { label: "Support & Disputes", href: "/admin/support", icon: Headphones },
  { label: "Notifications & Alerts", href: "/admin/alerts", icon: Bell },
  { label: "Financial Control", href: "/admin/financial", icon: Wallet },
  { label: "Reviews & Trust", href: "/admin/trust", icon: ShieldCheck },
  { label: "Content & Policy", href: "/admin/content", icon: BookOpen },
  { label: "Countries", href: "/admin/countries", icon: Globe2 },
  { label: "Platform Configuration", href: "/admin/platform", icon: SlidersHorizontal },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];
