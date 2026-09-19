import { bulkUpdateListings, loadActiveSubmissions } from "@/lib/listings/submission-data";
import { pushPolicyAlertToAllHosts } from "@/lib/host/host-notifications-data";
import { cancellationPolicyAllowed } from "@/lib/admin/platform-config-data";
import {
  ALL_HOSTS_AUDIENCE,
  normalizeAnnouncementAudience,
} from "@/lib/admin/announcement-audience";
import type {
  BlogPost,
  CancellationPolicyOption,
  CmsSettings,
  ContentPolicySettings,
  HouseRuleTemplate,
  MessageTemplate,
  ParentCategoryPolicyPack,
  PlatformAnnouncement,
} from "./content-policy-types";

import { emitSyncCustomEvent } from "@/lib/emit-sync-event";
const STORAGE_KEY = "farm-stays-content-policy";
export const CONTENT_POLICY_SYNC_EVENT = "farm-stays-content-policy-updated";

export const DEFAULT_HOUSE_RULE_TEMPLATES: HouseRuleTemplate[] = [
  {
    id: "hr-checkin",
    title: "Check-in",
    description: "From 3:00 PM. Early check-in subject to availability.",
    enabled: true,
  },
  {
    id: "hr-checkout",
    title: "Check-out",
    description: "Before 11:00 AM. Late check-out may incur extra charges.",
    enabled: true,
  },
  {
    id: "hr-quiet",
    title: "Quiet hours",
    description: "Quiet hours after 10 PM. Please respect neighbours and wildlife.",
    enabled: true,
  },
  {
    id: "hr-smoking",
    title: "Smoking",
    description: "No smoking indoors. Designated outdoor areas only.",
    enabled: true,
  },
  {
    id: "hr-pets",
    title: "Pets",
    description: "Pets allowed on request. Additional cleaning fee may apply.",
    enabled: true,
  },
  {
    id: "hr-guests",
    title: "Maximum guests",
    description: "Only registered guests may stay overnight. Day visitors by arrangement.",
    enabled: true,
  },
];

export const DEFAULT_CANCELLATION_POLICIES: CancellationPolicyOption[] = [
  {
    id: "flexible",
    label: "Flexible",
    shortDescription: "Full refund up to 7 days before check-in",
    fullText:
      "Free cancellation up to 7 days before arrival. 50% refund if cancelled within 7 days. No refund within 48 hours of check-in.",
    refundDaysBefore: 7,
    refundPercent: 100,
    enabled: true,
  },
  {
    id: "moderate",
    label: "Moderate",
    shortDescription: "Full refund up to 14 days before check-in",
    fullText:
      "Free cancellation up to 14 days before arrival. 50% refund if cancelled 7–14 days before. No refund within 7 days of check-in.",
    refundDaysBefore: 14,
    refundPercent: 100,
    enabled: true,
  },
  {
    id: "strict",
    label: "Strict",
    shortDescription: "50% refund up to 30 days before check-in",
    fullText:
      "50% refund if cancelled at least 30 days before arrival. No refund within 30 days of check-in except for extenuating circumstances.",
    refundDaysBefore: 30,
    refundPercent: 50,
    enabled: true,
  },
  {
    id: "non-refundable",
    label: "Non-refundable",
    shortDescription: "No refunds after booking confirmation",
    fullText:
      "This rate is non-refundable. Changes may be allowed subject to availability and price difference.",
    refundDaysBefore: 0,
    refundPercent: 0,
    enabled: true,
  },
];

function cloneTemplates(templates: HouseRuleTemplate[]): HouseRuleTemplate[] {
  return templates.map((t) => ({ ...t }));
}

function clonePolicies(policies: CancellationPolicyOption[]): CancellationPolicyOption[] {
  return policies.map((p) => ({ ...p }));
}

const STAYS_HOUSE_RULES = DEFAULT_HOUSE_RULE_TEMPLATES;
const STAYS_CANCELLATION = DEFAULT_CANCELLATION_POLICIES;

const EXPERIENCES_HOUSE_RULES: HouseRuleTemplate[] = [
  {
    id: "hr-exp-meeting",
    title: "Meeting point",
    description: "Guests must arrive at the listed meeting point 15 minutes before start time.",
    enabled: true,
  },
  {
    id: "hr-exp-age",
    title: "Age requirement",
    description: "Minimum age applies where noted. Children must be accompanied by a paying adult.",
    enabled: true,
  },
  {
    id: "hr-exp-weather",
    title: "Weather changes",
    description: "Outdoor experiences may be rescheduled for safety. Host will offer the next available slot.",
    enabled: true,
  },
  {
    id: "hr-exp-safety",
    title: "Safety gear",
    description: "Follow host safety instructions. Protective equipment must be worn when provided.",
    enabled: true,
  },
];

const EXPERIENCES_CANCELLATION: CancellationPolicyOption[] = [
  {
    id: "exp-flexible",
    label: "Flexible",
    shortDescription: "Free reschedule up to 24 hours before start",
    fullText:
      "Cancel or reschedule free up to 24 hours before the experience. 50% credit within 24 hours. No-show forfeits the booking.",
    refundDaysBefore: 1,
    refundPercent: 100,
    enabled: true,
  },
  {
    id: "exp-moderate",
    label: "Moderate",
    shortDescription: "Full refund up to 48 hours before start",
    fullText:
      "Full refund if cancelled at least 48 hours before start. 50% refund within 48 hours. Weather cancellations receive a full refund or reschedule.",
    refundDaysBefore: 2,
    refundPercent: 100,
    enabled: true,
  },
  {
    id: "exp-strict",
    label: "Strict",
    shortDescription: "Non-refundable within 72 hours of start",
    fullText:
      "Full refund up to 72 hours before start. No refund within 72 hours except for host cancellation or unsafe weather.",
    refundDaysBefore: 3,
    refundPercent: 100,
    enabled: true,
  },
];

const EVENTS_HOUSE_RULES: HouseRuleTemplate[] = [
  {
    id: "hr-ev-capacity",
    title: "Guest capacity",
    description: "Maximum guest count includes staff and vendors. Over-capacity bookings may be declined at entry.",
    enabled: true,
  },
  {
    id: "hr-ev-setup",
    title: "Setup & teardown",
    description: "Access times must be agreed in advance. Overtime setup or teardown may incur extra venue charges.",
    enabled: true,
  },
  {
    id: "hr-ev-noise",
    title: "Noise curfew",
    description: "Amplified music and events must end by the agreed curfew time shown on the listing.",
    enabled: true,
  },
  {
    id: "hr-ev-vendors",
    title: "Outside vendors",
    description: "Third-party catering, décor, or AV requires prior approval and may need venue insurance proof.",
    enabled: true,
  },
];

const EVENTS_CANCELLATION: CancellationPolicyOption[] = [
  {
    id: "ev-deposit",
    label: "Deposit non-refundable",
    shortDescription: "Deposit held on confirmation; balance due before event",
    fullText:
      "A non-refundable deposit confirms the date. Remaining balance is due 14 days before the event. Deposit may transfer to a new date once within 6 months.",
    refundDaysBefore: 0,
    refundPercent: 0,
    enabled: true,
  },
  {
    id: "ev-moderate",
    label: "Moderate",
    shortDescription: "50% refund up to 30 days before event",
    fullText:
      "50% refund if cancelled at least 30 days before the event date. No refund within 30 days except force majeure.",
    refundDaysBefore: 30,
    refundPercent: 50,
    enabled: true,
  },
  {
    id: "ev-flexible",
    label: "Flexible",
    shortDescription: "Full refund up to 14 days before event",
    fullText:
      "Full refund if cancelled at least 14 days before the event. 50% refund within 14 days. Date changes subject to availability.",
    refundDaysBefore: 14,
    refundPercent: 100,
    enabled: true,
  },
];

const DINING_HOUSE_RULES: HouseRuleTemplate[] = [
  {
    id: "hr-din-reservation",
    title: "Reservations",
    description: "Tables are held for 15 minutes. Please call if running late.",
    enabled: true,
  },
  {
    id: "hr-din-duration",
    title: "Seating duration",
    description: "Table time limits may apply during peak hours. Extensions subject to availability.",
    enabled: true,
  },
  {
    id: "hr-din-dress",
    title: "Dress code",
    description: "Smart casual unless stated otherwise. Management may refuse entry for dress code violations.",
    enabled: true,
  },
  {
    id: "hr-din-outside",
    title: "Outside food & drinks",
    description: "Outside food and beverages are not permitted unless pre-approved for private dining.",
    enabled: true,
  },
];

const DINING_CANCELLATION: CancellationPolicyOption[] = [
  {
    id: "din-standard",
    label: "Standard",
    shortDescription: "Free cancellation up to 2 hours before reservation",
    fullText:
      "Cancel free up to 2 hours before your reservation. Late cancellations or no-shows may incur a per-cover fee.",
    refundDaysBefore: 0,
    refundPercent: 100,
    enabled: true,
  },
  {
    id: "din-prepaid",
    label: "Prepaid tasting menu",
    shortDescription: "Prepaid menus are non-refundable within 24 hours",
    fullText:
      "Prepaid tasting menus are fully refundable up to 24 hours before service. No refund within 24 hours.",
    refundDaysBefore: 1,
    refundPercent: 100,
    enabled: true,
  },
  {
    id: "din-private",
    label: "Private dining deposit",
    shortDescription: "Deposit non-refundable within 48 hours",
    fullText:
      "Private dining deposits are refundable up to 48 hours before the booking. Later cancellations forfeit the deposit.",
    refundDaysBefore: 2,
    refundPercent: 0,
    enabled: true,
  },
];

export const DEFAULT_PARENT_POLICY_PACKS: ParentCategoryPolicyPack[] = [
  {
    parentId: "p1",
    parentName: "Stays",
    houseRuleTemplates: cloneTemplates(STAYS_HOUSE_RULES),
    cancellationPolicies: clonePolicies(STAYS_CANCELLATION),
  },
  {
    parentId: "p2",
    parentName: "Experiences",
    houseRuleTemplates: cloneTemplates(EXPERIENCES_HOUSE_RULES),
    cancellationPolicies: clonePolicies(EXPERIENCES_CANCELLATION),
  },
  {
    parentId: "p3",
    parentName: "Events",
    houseRuleTemplates: cloneTemplates(EVENTS_HOUSE_RULES),
    cancellationPolicies: clonePolicies(EVENTS_CANCELLATION),
  },
  {
    parentId: "p-dining",
    parentName: "Dining",
    houseRuleTemplates: cloneTemplates(DINING_HOUSE_RULES),
    cancellationPolicies: clonePolicies(DINING_CANCELLATION),
  },
];

function normalizeParentName(name: string): string {
  return name.trim().toLowerCase();
}

export function resolveParentPolicyPack(
  settings: ContentPolicySettings,
  parentCategory?: string | null
): ParentCategoryPolicyPack {
  const packs = settings.parentPolicyPacks;
  if (!parentCategory?.trim()) {
    return (
      packs.find((p) => normalizeParentName(p.parentName) === "stays") ??
      packs[0] ??
      DEFAULT_PARENT_POLICY_PACKS[0]
    );
  }
  const key = normalizeParentName(parentCategory);
  return (
    packs.find(
      (p) =>
        p.parentId === parentCategory.trim() ||
        normalizeParentName(p.parentName) === key ||
        normalizeParentName(p.parentName).includes(key) ||
        key.includes(normalizeParentName(p.parentName))
    ) ??
    packs.find((p) => normalizeParentName(p.parentName) === "stays") ??
    packs[0] ??
    DEFAULT_PARENT_POLICY_PACKS[0]
  );
}

function defaultPackForParent(parent: { id: string; name: string }): ParentCategoryPolicyPack {
  const known = DEFAULT_PARENT_POLICY_PACKS.find(
    (p) =>
      p.parentId === parent.id || normalizeParentName(p.parentName) === normalizeParentName(parent.name)
  );
  if (known) {
    return {
      ...known,
      parentId: parent.id,
      parentName: parent.name,
      houseRuleTemplates: cloneTemplates(known.houseRuleTemplates),
      cancellationPolicies: clonePolicies(known.cancellationPolicies),
    };
  }
  return {
    parentId: parent.id,
    parentName: parent.name,
    houseRuleTemplates: cloneTemplates(STAYS_HOUSE_RULES),
    cancellationPolicies: clonePolicies(STAYS_CANCELLATION),
  };
}

export function mergeParentPolicyPacks(
  parsed: Partial<ContentPolicySettings> | null | undefined,
  taxonomyParents?: { id: string; name: string }[]
): ParentCategoryPolicyPack[] {
  const legacyRules = parsed?.houseRuleTemplates?.length
    ? parsed.houseRuleTemplates
    : undefined;
  const legacyCancel = parsed?.cancellationPolicies?.length
    ? parsed.cancellationPolicies
    : undefined;

  let packs =
    parsed?.parentPolicyPacks?.length
      ? parsed.parentPolicyPacks.map((pack) => ({
          ...pack,
          houseRuleTemplates: pack.houseRuleTemplates?.length
            ? pack.houseRuleTemplates
            : cloneTemplates(STAYS_HOUSE_RULES),
          cancellationPolicies: pack.cancellationPolicies?.length
            ? pack.cancellationPolicies
            : clonePolicies(STAYS_CANCELLATION),
        }))
      : DEFAULT_PARENT_POLICY_PACKS.map((pack) => ({
          ...pack,
          houseRuleTemplates: cloneTemplates(pack.houseRuleTemplates),
          cancellationPolicies: clonePolicies(pack.cancellationPolicies),
        }));

  if (legacyRules || legacyCancel) {
    packs = packs.map((pack) => {
      if (normalizeParentName(pack.parentName) !== "stays") return pack;
      return {
        ...pack,
        houseRuleTemplates: legacyRules ?? pack.houseRuleTemplates,
        cancellationPolicies: legacyCancel ?? pack.cancellationPolicies,
      };
    });
  }

  const parents =
    taxonomyParents?.length
      ? taxonomyParents
      : DEFAULT_PARENT_POLICY_PACKS.map((p) => ({ id: p.parentId, name: p.parentName }));

  const byId = new Map(packs.map((pack) => [pack.parentId, pack]));
  return parents.map((parent) => {
    const existing = byId.get(parent.id);
    if (existing) {
      return { ...existing, parentId: parent.id, parentName: parent.name };
    }
    return defaultPackForParent(parent);
  });
}

export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "tpl-booking-conf-guest-email",
    channel: "email",
    audience: "guest",
    name: "Booking confirmation",
    subject: "Your farm stay is confirmed — {{propertyName}}",
    body: "Hi {{guestName}},\n\nYour booking at {{propertyName}} is confirmed.\nCheck-in: {{checkIn}}\nCheck-out: {{checkOut}}\n\nWe look forward to welcoming you!",
    enabled: true,
    variables: ["guestName", "propertyName", "checkIn", "checkOut"],
  },
  {
    id: "tpl-booking-request-host-email",
    channel: "email",
    audience: "host",
    name: "New booking request",
    subject: "New booking request — {{propertyName}}",
    body: "Hi {{hostName}},\n\n{{guestName}} requested {{nights}} nights at {{propertyName}}.\nDates: {{checkIn}} → {{checkOut}}\n\nRespond within 24 hours.",
    enabled: true,
    variables: ["hostName", "guestName", "propertyName", "checkIn", "checkOut", "nights"],
  },
  {
    id: "tpl-checkin-reminder-guest-sms",
    channel: "sms",
    audience: "guest",
    name: "Check-in reminder",
    body: "Reminder: check-in at {{propertyName}} is tomorrow at 3 PM. Reply HELP for support.",
    enabled: true,
    variables: ["propertyName"],
  },
  {
    id: "tpl-payout-host-email",
    channel: "email",
    audience: "host",
    name: "Payout processed",
    subject: "Payout of {{amount}} sent",
    body: "Hi {{hostName}},\n\nYour payout of {{amount}} for booking {{bookingRef}} has been processed.",
    enabled: true,
    variables: ["hostName", "amount", "bookingRef"],
  },
  {
    id: "tpl-review-request-guest-sms",
    channel: "sms",
    audience: "guest",
    name: "Review request",
    body: "How was your stay at {{propertyName}}? Leave a review: {{reviewLink}}",
    enabled: true,
    variables: ["propertyName", "reviewLink"],
  },
  {
    id: "tpl-policy-update-host-email",
    channel: "email",
    audience: "host",
    name: "Policy update notice",
    subject: "Platform policy update — action required",
    body: "Hi {{hostName}},\n\n{{announcementTitle}}\n\n{{announcementMessage}}\n\nPlease review your listings and update policies if needed.",
    enabled: true,
    variables: ["hostName", "announcementTitle", "announcementMessage"],
  },
];

/** Known homepage blocks — admin can add any of these; each must be implemented on the homepage. */
export const CMS_HOMEPAGE_BLOCK_CATALOG: ReadonlyArray<{
  key: string;
  title: string;
  subtitle: string;
  description: string;
}> = [
  {
    key: "trending",
    title: "Trending stays",
    subtitle: "Popular picks near you",
    description: "Trending and nearby stays carousel",
  },
  {
    key: "flashDeals",
    title: "Flash deals",
    subtitle: "Limited-time offers",
    description: "Active flash-deal listings with countdown timers",
  },
  {
    key: "destinations",
    title: "Top destinations",
    subtitle: "Explore by region",
    description: "State and region browse cards from taxonomy",
  },
  {
    key: "categories",
    title: "Popular categories",
    subtitle: "Browse stays by type",
    description: "Category cards from taxonomy",
  },
  {
    key: "experiences",
    title: "Popular experiences",
    subtitle: "Hands-on farm activities",
    description: "Experience parent category cards",
  },
  {
    key: "venues",
    title: "Popular venues",
    subtitle: "Weddings, parties, and retreats",
    description: "Events / venue parent category cards",
  },
  {
    key: "blog",
    title: "From the blog",
    subtitle: "Tips, guides, and farm stories",
    description: "Published CMS blog posts",
  },
  {
    key: "whyBook",
    title: "Why book with us",
    subtitle: "",
    description: "Trust badges (verified, pricing, secure, support)",
  },
];

const DEFAULT_CMS: CmsSettings = {
  heroTitle: "Discover Authentic",
  heroHighlight: "Farm Stays",
  heroTitleEnd: "in India",
  heroSubtitle:
    "Book unique countryside retreats, organic farms, and heritage stays across India.",
  heroEnabled: false,
  featuredListingIds: [],
  blogPosts: [
    {
      id: "blog-1",
      title: "Top 5 farm stays in Kerala",
      excerpt:
        "From backwater views to spice plantations — our editors' picks for a countryside escape.",
      slug: "top-farm-stays-kerala",
      published: true,
      publishedAt: "2026-07-01T10:00:00",
    },
    {
      id: "blog-2",
      title: "What to expect at an organic farm stay",
      excerpt:
        "Harvest tours, farm-to-table meals, and sustainable living tips for first-time guests.",
      slug: "organic-farm-stay-guide",
      published: true,
      publishedAt: "2026-06-15T10:00:00",
    },
    {
      id: "blog-3",
      title: "Family-friendly farm activities in Maharashtra",
      excerpt: "Animal feeding, fruit picking, and bonfire evenings the whole family will love.",
      slug: "family-farm-activities-maharashtra",
      published: false,
      publishedAt: undefined,
    },
  ],
  contentSections: [
    {
      id: "sec-trending",
      key: "trending",
      title: "Trending stays",
      subtitle: "Popular picks near you",
      enabled: true,
      sortOrder: 1,
    },
    {
      id: "sec-flash",
      key: "flashDeals",
      title: "Flash deals",
      subtitle: "Limited-time offers",
      enabled: true,
      sortOrder: 2,
    },
    {
      id: "sec-destinations",
      key: "destinations",
      title: "Top destinations",
      subtitle: "Explore by region",
      enabled: true,
      sortOrder: 3,
    },
    {
      id: "sec-categories",
      key: "categories",
      title: "Popular categories",
      subtitle: "Browse stays by type",
      enabled: true,
      sortOrder: 4,
    },
    {
      id: "sec-experiences",
      key: "experiences",
      title: "Popular experiences",
      subtitle: "Hands-on farm activities",
      enabled: true,
      sortOrder: 5,
    },
    {
      id: "sec-venues",
      key: "venues",
      title: "Popular venues",
      subtitle: "Weddings, parties, and retreats",
      enabled: true,
      sortOrder: 6,
    },
    {
      id: "sec-blog",
      key: "blog",
      title: "From the blog",
      subtitle: "Tips, guides, and farm stories",
      enabled: true,
      sortOrder: 7,
    },
    {
      id: "sec-why",
      key: "whyBook",
      title: "Why book with us",
      subtitle: "",
      enabled: true,
      sortOrder: 8,
    },
  ],
};

export const DEFAULT_CONTENT_POLICY: ContentPolicySettings = {
  parentPolicyPacks: DEFAULT_PARENT_POLICY_PACKS.map((pack) => ({
    ...pack,
    houseRuleTemplates: cloneTemplates(pack.houseRuleTemplates),
    cancellationPolicies: clonePolicies(pack.cancellationPolicies),
  })),
  platformAnnouncements: [
    {
      id: "pa-seed-1",
      title: "India launch — review your listing policies",
      message:
        "House rules and cancellation tiers are now set per listing type (Stays, Experiences, Events, Dining). Please confirm your policies before going live.",
      priority: "high",
      status: "sent",
      createdAt: "2026-07-10T08:00:00",
      pushedAt: "2026-07-10T08:05:00",
      ...ALL_HOSTS_AUDIENCE,
    },
  ],
  messageTemplates: DEFAULT_MESSAGE_TEMPLATES,
  cms: DEFAULT_CMS,
};

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(CONTENT_POLICY_SYNC_EVENT);
  }
}

function mergeList<T extends { id: string }>(parsed: T[] | undefined, fallback: T[]): T[] {
  return parsed && parsed.length > 0 ? parsed : fallback;
}

export function slugifyBlogTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `post-${Date.now()}`;
}

function normalizeBlogPost(post: Partial<BlogPost> & { id: string }): BlogPost {
  return {
    id: post.id,
    title: (post.title ?? "").trim(),
    excerpt: (post.excerpt ?? "").trim(),
    body: (post.body ?? "").trim(),
    slug: (post.slug ?? "").trim(),
    published: post.published ?? false,
    publishedAt: post.publishedAt,
    imageUrl: post.imageUrl?.trim() || undefined,
  };
}

function mergeCms(parsed: Partial<CmsSettings> | undefined): CmsSettings {
  return {
    heroTitle: parsed?.heroTitle ?? DEFAULT_CMS.heroTitle,
    heroHighlight: parsed?.heroHighlight ?? DEFAULT_CMS.heroHighlight,
    heroTitleEnd: parsed?.heroTitleEnd ?? DEFAULT_CMS.heroTitleEnd,
    heroSubtitle: parsed?.heroSubtitle ?? DEFAULT_CMS.heroSubtitle,
    heroEnabled: parsed?.heroEnabled ?? DEFAULT_CMS.heroEnabled,
    featuredListingIds:
      parsed?.featuredListingIds && parsed.featuredListingIds.length > 0
        ? parsed.featuredListingIds
        : DEFAULT_CMS.featuredListingIds,
    blogPosts: mergeList(parsed?.blogPosts, DEFAULT_CMS.blogPosts).map(normalizeBlogPost),
    contentSections: mergeList(parsed?.contentSections, DEFAULT_CMS.contentSections).sort(
      (a, b) => a.sortOrder - b.sortOrder
    ),
  };
}

export function normalizeContentPolicy(
  parsed: Partial<ContentPolicySettings> | null | undefined,
  taxonomyParents?: { id: string; name: string }[]
): ContentPolicySettings {
  return {
    parentPolicyPacks: mergeParentPolicyPacks(parsed, taxonomyParents),
    platformAnnouncements: mergeList(
      parsed?.platformAnnouncements,
      DEFAULT_CONTENT_POLICY.platformAnnouncements
    ).map((announcement) => ({
      ...announcement,
      ...normalizeAnnouncementAudience(announcement),
    })),
    messageTemplates: mergeList(parsed?.messageTemplates, DEFAULT_MESSAGE_TEMPLATES),
    cms: mergeCms(parsed?.cms),
  };
}

export function loadContentPolicy(
  taxonomyParents?: { id: string; name: string }[]
): ContentPolicySettings {
  if (typeof window === "undefined") return normalizeContentPolicy(null, taxonomyParents);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeContentPolicy(null, taxonomyParents);
    const parsed = JSON.parse(raw) as Partial<ContentPolicySettings>;
    return normalizeContentPolicy(parsed, taxonomyParents);
  } catch {
    return normalizeContentPolicy(null, taxonomyParents);
  }
}

export function saveContentPolicy(settings: ContentPolicySettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  dispatchSync();
}

export function updateContentPolicy(
  updater: (prev: ContentPolicySettings) => ContentPolicySettings
): ContentPolicySettings {
  const next = updater(loadContentPolicy());
  saveContentPolicy(next);
  return next;
}

export function newContentPolicyId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function getEnabledHouseRuleTemplates(
  settings: ContentPolicySettings = loadContentPolicy(),
  parentCategory?: string | null
): HouseRuleTemplate[] {
  return resolveParentPolicyPack(settings, parentCategory).houseRuleTemplates.filter(
    (t) => t.enabled && t.title.trim()
  );
}

export function getEnabledCancellationPolicies(
  settings: ContentPolicySettings = loadContentPolicy(),
  parentCategory?: string | null
): CancellationPolicyOption[] {
  return resolveParentPolicyPack(settings, parentCategory).cancellationPolicies.filter(
    (p) => p.enabled
  );
}

/** Enabled policies that also respect Super Admin max-strictness bound. */
export function getHostSelectableCancellationPolicies(
  settings: ContentPolicySettings = loadContentPolicy(),
  parentCategory?: string | null
): CancellationPolicyOption[] {
  return getEnabledCancellationPolicies(settings, parentCategory).filter((p) =>
    cancellationPolicyAllowed(p.id)
  );
}

export function getCancellationPolicyById(
  id: string,
  settings: ContentPolicySettings = loadContentPolicy(),
  parentCategory?: string | null
): CancellationPolicyOption | undefined {
  return resolveParentPolicyPack(settings, parentCategory).cancellationPolicies.find(
    (p) => p.id === id
  );
}

/** Default house rules for new listings — first four enabled templates */
export function getDefaultHouseRulesFromTemplates(
  settings: ContentPolicySettings = loadContentPolicy(),
  parentCategory?: string | null
): { title: string; description: string }[] {
  const templates = getEnabledHouseRuleTemplates(settings, parentCategory);
  const defaults = templates.slice(0, 4);
  if (defaults.length > 0) {
    return defaults.map(({ title, description }) => ({ title, description }));
  }
  return DEFAULT_HOUSE_RULE_TEMPLATES.slice(0, 4).map(({ title, description }) => ({
    title,
    description,
  }));
}

export function updateParentPolicyPack(
  parentId: string,
  patch: Partial<Pick<ParentCategoryPolicyPack, "houseRuleTemplates" | "cancellationPolicies">>
): ContentPolicySettings {
  return updateContentPolicy((prev) => ({
    ...prev,
    parentPolicyPacks: prev.parentPolicyPacks.map((pack) =>
      pack.parentId === parentId ? { ...pack, ...patch } : pack
    ),
  }));
}

export function getPublishedBlogPosts(
  settings: ContentPolicySettings = loadContentPolicy()
): BlogPost[] {
  return settings.cms.blogPosts
    .filter((p) => p.published && p.title.trim())
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
    );
}

export function isCmsSectionEnabled(
  key: string,
  settings: ContentPolicySettings = loadContentPolicy()
): boolean {
  const section = settings.cms.contentSections.find((s) => s.key === key);
  return section?.enabled ?? true;
}

export function syncFeaturedListings(featuredIds: string[]): void {
  if (typeof window === "undefined") return;
  const approved = loadActiveSubmissions().filter((l) => l.status === "approved");
  const featuredSet = new Set(featuredIds);
  const toFeature = approved.filter((l) => featuredSet.has(l.id)).map((l) => l.id);
  const toUnfeature = approved.filter((l) => !featuredSet.has(l.id) && l.featured).map((l) => l.id);
  if (toFeature.length > 0) bulkUpdateListings(toFeature, { featured: true });
  if (toUnfeature.length > 0) bulkUpdateListings(toUnfeature, { featured: false });
}

export function saveCmsSettings(cms: CmsSettings): ContentPolicySettings {
  syncFeaturedListings(cms.featuredListingIds);
  return updateContentPolicy((prev) => ({ ...prev, cms }));
}

export function pushPlatformAnnouncement(announcementId: string): PlatformAnnouncement | null {
  const settings = loadContentPolicy();
  const announcement = settings.platformAnnouncements.find((a) => a.id === announcementId);
  if (!announcement || announcement.status === "sent") return null;

  pushPolicyAlertToAllHosts(
    announcement.title,
    announcement.message,
    normalizeAnnouncementAudience(announcement)
  );

  const pushedAt = new Date().toISOString();
  const next = settings.platformAnnouncements.map((a) =>
    a.id === announcementId ? { ...a, status: "sent" as const, pushedAt } : a
  );
  saveContentPolicy({ ...settings, platformAnnouncements: next });
  return { ...announcement, status: "sent", pushedAt };
}

export function createAndPushAnnouncement(
  input: Omit<PlatformAnnouncement, "id" | "createdAt" | "status" | "pushedAt">
): PlatformAnnouncement {
  const id = newContentPolicyId("pa");
  const createdAt = new Date().toISOString();
  const pushedAt = new Date().toISOString();
  const audience = normalizeAnnouncementAudience(input);
  pushPolicyAlertToAllHosts(input.title, input.message, audience);
  const item: PlatformAnnouncement = {
    ...input,
    ...audience,
    id,
    createdAt,
    status: "sent",
    pushedAt,
  };
  updateContentPolicy((prev) => ({
    ...prev,
    platformAnnouncements: [item, ...prev.platformAnnouncements],
  }));
  return item;
}

export function countDraftAnnouncements(
  settings: ContentPolicySettings = loadContentPolicy()
): number {
  return settings.platformAnnouncements.filter((a) => a.status !== "sent").length;
}

export function countDisabledTemplates(
  settings: ContentPolicySettings = loadContentPolicy()
): number {
  return settings.messageTemplates.filter((t) => !t.enabled).length;
}
