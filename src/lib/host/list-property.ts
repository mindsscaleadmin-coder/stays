import { canManageListings } from "@/lib/auth/roles";
import type { GuestUser } from "@/lib/auth/types";
import {
  POPULAR_CATEGORIES,
  POPULAR_EXPERIENCES,
  POPULAR_VENUES,
} from "@/lib/mock/data";

export const LIST_PROPERTY_PATH = "/host/new-listing";

export const LIST_PROPERTY_SIGNUP_HREF = `/host/signup?next=${encodeURIComponent(LIST_PROPERTY_PATH)}`;

export const LIST_PROPERTY_CATEGORY_DEFS = [
  { key: "stays", label: "Stays", match: /stay/i },
  { key: "experiences", label: "Experiences", match: /experience/i },
  { key: "events", label: "Events", match: /event/i },
  { key: "dining", label: "Dining", match: /dining/i },
] as const;

export type ListPropertyCategoryKey = (typeof LIST_PROPERTY_CATEGORY_DEFS)[number]["key"];

export interface ListPropertyCategoryOption {
  key: ListPropertyCategoryKey;
  label: string;
  parentId: string;
  parentName: string;
}

export interface ListPropertyCategoryTheme {
  img: string;
  tagline: string;
  badge: string;
  badgeClass: string;
}

export const LIST_PROPERTY_CATEGORY_THEMES: Record<
  ListPropertyCategoryKey,
  ListPropertyCategoryTheme
> = {
  stays: {
    img:
      POPULAR_CATEGORIES.find((c) => /stay/i.test(c.name))?.img ?? POPULAR_CATEGORIES[0].img,
    tagline: "Farm stays, homestays & retreats",
    badge: "Bookable",
    badgeClass: "bg-green-700 text-white",
  },
  experiences: {
    img:
      POPULAR_CATEGORIES.find((c) => /experience/i.test(c.name))?.img ??
      POPULAR_EXPERIENCES[0].img,
    tagline: "Tours, sessions & on-farm activities",
    badge: "Bookable",
    badgeClass: "bg-green-700 text-white",
  },
  events: {
    img: POPULAR_VENUES[0].img,
    tagline: "Weddings, parties & corporate venues",
    badge: "Directory",
    badgeClass: "bg-amber-600 text-white",
  },
  dining: {
    img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    tagline: "Farm tables, pop-ups & dining experiences",
    badge: "Directory",
    badgeClass: "bg-amber-600 text-white",
  },
};

export function resolveListPropertyCategories(
  parents: { id: string; name: string; enabled?: boolean }[]
): ListPropertyCategoryOption[] {
  const enabled = parents.filter((p) => p.enabled !== false);
  return LIST_PROPERTY_CATEGORY_DEFS.map(({ key, label, match }) => {
    const parent = enabled.find((p) => match.test(p.name));
    return {
      key,
      label: parent?.name ?? label,
      parentId: parent?.id ?? "",
      parentName: parent?.name ?? label,
    };
  });
}

export function requiresListPropertySubscription(key: ListPropertyCategoryKey): boolean {
  return key === "events" || key === "dining";
}

export function buildNewListingPath(
  parentName: string,
  opts?: { showSubscription?: boolean; subscriptionPlan?: string }
): string {
  const params = new URLSearchParams();
  params.set("parent", parentName);
  if (opts?.showSubscription) params.set("showSubscription", "1");
  if (opts?.subscriptionPlan) params.set("subscriptionPlan", opts.subscriptionPlan);
  const qs = params.toString();
  return qs ? `${LIST_PROPERTY_PATH}?${qs}` : LIST_PROPERTY_PATH;
}

export function buildHostAuthPath(
  kind: "login" | "signup",
  nextPath: string
): string {
  return `/host/${kind}?next=${encodeURIComponent(nextPath)}`;
}

export function getListPropertyHref(user: GuestUser | null): string {
  if (user && canManageListings(user.roles)) {
    return LIST_PROPERTY_PATH;
  }
  return LIST_PROPERTY_SIGNUP_HREF;
}

export function categoryKeyFromParentName(name: string): ListPropertyCategoryKey | null {
  const needle = name.trim().toLowerCase();
  for (const def of LIST_PROPERTY_CATEGORY_DEFS) {
    if (def.match.test(needle)) return def.key;
  }
  return null;
}
