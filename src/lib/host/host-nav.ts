import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  LifeBuoy,
  List,
  MessageSquare,
  Megaphone,
  MoreHorizontal,
  ReceiptText,
  Sprout,
  Star,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import type { DashboardNavItem } from "@/components/dashboard/dashboard-shell";

/**
 * Host dashboard sidebar — primary ops nav first, secondary items under More.
 */
export const HOST_NAV: DashboardNavItem[] = [
  { label: "Overview", href: "/host", icon: LayoutDashboard },
  { label: "Bookings", href: "/host/bookings", icon: CalendarDays },
  { label: "Calendar", href: "/host/calendar", icon: CalendarRange },
  { label: "Customers", href: "/host/customers", icon: Users },
  { label: "Messages", href: "/host/messages", icon: MessageSquare },
  { label: "Reviews", href: "/host/reviews", icon: Star },
  {
    label: "More",
    href: "/host/profile",
    icon: MoreHorizontal,
    overviewLabel: "Profile",
    children: [
      { label: "Notifications", href: "/host/notifications", icon: Bell },
      { label: "User / Staff", href: "/host/staff", icon: UserCog },
      { label: "My Listings", href: "/host/listings", icon: List },
      { label: "Event requests", href: "/host/event-requests", icon: CalendarCheck },
      { label: "Promote", href: "/host/promote", icon: Megaphone },
      { label: "Extra charges", href: "/host/extra-charges", icon: ReceiptText },
      { label: "House rules & policies", href: "/host/house-rules", icon: ClipboardList },
      { label: "Accounts", href: "/host/accounts", icon: Wallet },
      { label: "Farm add-ons", href: "/host/add-ons", icon: Sprout },
      { label: "Support", href: "/host/support", icon: LifeBuoy },
    ],
  },
];
