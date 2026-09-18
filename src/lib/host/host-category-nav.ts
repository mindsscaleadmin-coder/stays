import {
  BedDouble,
  CalendarCheck,
  CalendarDays,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import {
  HOST_CATEGORY_FLOWS,
  hostCategoryFlowsByKind,
  type HostCategoryFlow,
  type HostCategoryFlowKind,
} from "@/lib/host/host-category-flows";

export interface HostCategoryNavItem {
  id: HostCategoryFlow["id"];
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  kind: HostCategoryFlowKind;
  secondaryHref?: string;
  secondaryLabel?: string;
}

const ICONS: Record<HostCategoryFlow["id"], LucideIcon> = {
  stay: BedDouble,
  experience: CalendarDays,
  event: CalendarCheck,
  dining: UtensilsCrossed,
};

function toNavItem(flow: HostCategoryFlow): HostCategoryNavItem {
  return {
    id: flow.id,
    label: flow.label,
    href: flow.hostStep1Href,
    icon: ICONS[flow.id],
    description: flow.sidebarDescription,
    kind: flow.kind,
    secondaryHref: flow.hostStep2Href,
    secondaryLabel:
      flow.kind === "paid"
        ? flow.id === "stay"
          ? "Check-in"
          : undefined
        : "Confirmed",
  };
}

export const HOST_CATEGORY_NAV: HostCategoryNavItem[] =
  HOST_CATEGORY_FLOWS.map(toNavItem);

export const HOST_CATEGORY_NAV_GROUPS: {
  kind: HostCategoryFlowKind;
  label: string;
  items: HostCategoryNavItem[];
}[] = [
  {
    kind: "paid",
    label: "Paid bookings",
    items: hostCategoryFlowsByKind("paid").map(toNavItem),
  },
  {
    kind: "directory",
    label: "Directory enquiries",
    items: hostCategoryFlowsByKind("directory").map(toNavItem),
  },
];

export function hostCategoryNavHref(
  category: HostCategoryFlow["id"],
  surface: "bookings" | "enquiries" = category === "stay" || category === "experience"
    ? "bookings"
    : "enquiries"
): string {
  const flow = HOST_CATEGORY_FLOWS.find((item) => item.id === category);
  if (!flow) return "/host/bookings";
  return surface === "bookings" && flow.hostStep2Href
    ? flow.hostStep2Href
    : flow.hostStep1Href;
}
