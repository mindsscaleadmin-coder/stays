import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  DoorOpen,
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
import { HostNotificationsBadge } from "@/lib/host/host-notifications-badge";

/**
 * Host dashboard sidebar — daily ops + Support, secondary items under More.
 */
export const HOST_NAV: DashboardNavItem[] = [
  { label: "Overview", href: "/host", icon: LayoutDashboard },
  { label: "Bookings", href: "/host/bookings", icon: CalendarDays },
  { label: "Enquiries", href: "/host/enquiries", icon: CalendarCheck },
  { label: "Check-in / out", href: "/host/check-in-out", icon: DoorOpen },
  { label: "Calendar", href: "/host/calendar", icon: CalendarRange },
  { label: "Customers", href: "/host/customers", icon: Users },
  { label: "Messages", href: "/host/messages", icon: MessageSquare },
  {
    label: "Notifications",
    href: "/host/notifications",
    icon: Bell,
    Trailing: HostNotificationsBadge,
  },
  { label: "Reviews", href: "/host/reviews", icon: Star },
  { label: "Support", href: "/host/support", icon: LifeBuoy },
  {
    label: "More",
    href: "/host/profile",
    icon: MoreHorizontal,
    overviewLabel: "Profile",
    children: [
      { label: "User / Staff", href: "/host/staff", icon: UserCog },
      { label: "My Listings", href: "/host/listings", icon: List },
      { label: "Promote", href: "/host/promote", icon: Megaphone },
      { label: "Extra charges", href: "/host/extra-charges", icon: ReceiptText },
      { label: "House rules & policies", href: "/host/house-rules", icon: ClipboardList },
      { label: "Accounts", href: "/host/accounts", icon: Wallet },
      { label: "Farm add-ons", href: "/host/add-ons", icon: Sprout },
    ],
  },
];
