import type { HostBookingCategory } from "@/lib/host/booking-category";
import type { EnquiryCategory } from "@/lib/host/enquiry-category";

export type HostCategoryFlowKind = "paid" | "directory";

export interface HostCategoryFlow {
  id: HostBookingCategory;
  label: string;
  kind: HostCategoryFlowKind;
  guestAction: string;
  hostStep1: string;
  hostStep1Href: string;
  hostStep2?: string;
  hostStep2Href?: string;
  sidebarDescription: string;
}

export const HOST_CATEGORY_FLOWS: HostCategoryFlow[] = [
  {
    id: "stay",
    label: "Stays",
    kind: "paid",
    guestAction: "Guest picks dates and pays on the platform.",
    hostStep1: "Manage in Bookings",
    hostStep1Href: "/host/bookings?category=stay",
    hostStep2: "Check guests in / out",
    hostStep2Href: "/host/check-in-out",
    sidebarDescription: "Paid nightly stays · check-in",
  },
  {
    id: "experience",
    label: "Experiences",
    kind: "paid",
    guestAction: "Guest books a session and pays on the platform.",
    hostStep1: "Manage in Bookings",
    hostStep1Href: "/host/bookings?category=experience",
    sidebarDescription: "Paid sessions · mark complete",
  },
  {
    id: "event",
    label: "Events",
    kind: "directory",
    guestAction: "Guest sends a venue availability enquiry (no payment).",
    hostStep1: "Reply in Enquiries",
    hostStep1Href: "/host/enquiries?category=event",
    hostStep2: "Track confirmed dates in Bookings",
    hostStep2Href: "/host/bookings?category=event",
    sidebarDescription: "Venue enquiries · reply first",
  },
  {
    id: "dining",
    label: "Dining",
    kind: "directory",
    guestAction: "Guest requests a table reservation (no payment).",
    hostStep1: "Reply in Enquiries",
    hostStep1Href: "/host/enquiries?category=dining",
    hostStep2: "Track confirmed tables in Bookings",
    hostStep2Href: "/host/bookings?category=dining",
    sidebarDescription: "Table requests · reply first",
  },
];

export function hostCategoryFlow(id: HostBookingCategory): HostCategoryFlow {
  return HOST_CATEGORY_FLOWS.find((flow) => flow.id === id) ?? HOST_CATEGORY_FLOWS[0];
}

export function hostCategoryFlowsByKind(kind: HostCategoryFlowKind): HostCategoryFlow[] {
  return HOST_CATEGORY_FLOWS.filter((flow) => flow.kind === kind);
}

export function enquiryCategoryToFlow(
  category: EnquiryCategory
): HostCategoryFlow {
  return hostCategoryFlow(category);
}
