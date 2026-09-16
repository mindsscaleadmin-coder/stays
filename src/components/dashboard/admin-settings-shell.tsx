"use client";

import {
  ArrowLeft,
  Filter,
  Home,
  ImageIcon,
  KeyRound,
  List,
  MessageSquare,
  Phone,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { DashboardNavItem } from "./dashboard-shell";

export type AdminSettingsNavItem = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export const ADMIN_SETTINGS_NAV: AdminSettingsNavItem[] = [
  {
    label: "Home Page",
    href: "/admin/settings/home",
    description: "Banners, favicon, announcement bar",
    icon: Home,
  },
  {
    label: "Listing",
    href: "/admin/settings/listing",
    description: "Highlights, feature icons, listing fields",
    icon: List,
  },
  {
    label: "Photo tags",
    href: "/admin/settings/photo-tags",
    description: "Tags hosts can apply to listing photos",
    icon: ImageIcon,
  },
  {
    label: "Extra charges",
    href: "/admin/settings/extra-charges",
    description: "Catalog of add-on fees for stays",
    icon: ReceiptText,
  },
  {
    label: "Reviews",
    href: "/admin/settings/reviews",
    description: "Rating categories and guest review prompts",
    icon: MessageSquare,
  },
  {
    label: "Support contact",
    href: "/admin/settings/contact",
    description: "Country-wise help phone numbers",
    icon: Phone,
  },
  {
    label: "Filter",
    href: "/admin/settings/filters",
    description: "Search filters and taxonomy options",
    icon: Filter,
  },
  {
    label: "API keys",
    href: "/admin/settings/api",
    description: "Google Maps & external service credentials",
    icon: KeyRound,
  },
];

export function isAdminSettingsPath(pathname: string): boolean {
  return pathname === "/admin/settings" || pathname.startsWith("/admin/settings/");
}

/** Main sidebar items when browsing Settings (replaces admin nav — one sidebar only). */
export function getAdminSettingsSidebarNav(): DashboardNavItem[] {
  return [
    {
      label: "Back to Admin",
      href: "/admin",
      icon: ArrowLeft,
    },
    ...ADMIN_SETTINGS_NAV.map((item) => ({
      label: item.label,
      href: item.href,
      icon: item.icon,
    })),
  ];
}

/**
 * Settings page chrome — content only.
 * Navigation lives in the main Admin sidebar while on /admin/settings/*.
 */
export function AdminSettingsShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
