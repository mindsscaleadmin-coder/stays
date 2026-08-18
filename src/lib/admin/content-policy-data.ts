import { bulkUpdateListings, loadActiveSubmissions } from "@/lib/listings/submission-data";
import { pushPolicyAlertToAllHosts } from "@/lib/host/host-notifications-data";
import { cancellationPolicyAllowed } from "@/lib/admin/platform-config-data";
import type {
  BlogPost,
  CancellationPolicyOption,
  CmsSettings,
  ContentPolicySettings,
  HouseRuleTemplate,
  MessageTemplate,
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

const DEFAULT_CMS: CmsSettings = {
  heroTitle: "Discover Authentic",
  heroHighlight: "Farm Stays",
  heroTitleEnd: "in the UAE",
  heroSubtitle: "Book unique countryside retreats, organic farms, and desert camps.",
  heroEnabled: false,
  featuredListingIds: ["L-A01"],
  blogPosts: [
    {
      id: "blog-1",
      title: "Top 5 farm stays in Al Ain",
      excerpt: "From palm groves to mountain views — our editors' picks for a countryside escape.",
      slug: "top-farm-stays-al-ain",
      published: true,
      publishedAt: "2026-07-01T10:00:00",
    },
    {
      id: "blog-2",
      title: "What to expect at an organic farm stay",
      excerpt: "Harvest tours, farm-to-table meals, and sustainable living tips for first-time guests.",
      slug: "organic-farm-stay-guide",
      published: true,
      publishedAt: "2026-06-15T10:00:00",
    },
    {
      id: "blog-3",
      title: "Family-friendly farm activities in Sharjah",
      excerpt: "Animal feeding, fruit picking, and BBQ evenings the whole family will love.",
      slug: "family-farm-activities-sharjah",
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
  houseRuleTemplates: DEFAULT_HOUSE_RULE_TEMPLATES,
  cancellationPolicies: DEFAULT_CANCELLATION_POLICIES,
  platformAnnouncements: [
    {
      id: "pa-seed-1",
      title: "Updated cancellation policy for farm stays",
      message: "Review the new cancellation tiers before Aug 1. Flexible and moderate options remain available.",
      priority: "high",
      status: "sent",
      createdAt: "2026-07-10T08:00:00",
      pushedAt: "2026-07-10T08:05:00",
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
    blogPosts: mergeList(parsed?.blogPosts, DEFAULT_CMS.blogPosts),
    contentSections: mergeList(parsed?.contentSections, DEFAULT_CMS.contentSections).sort(
      (a, b) => a.sortOrder - b.sortOrder
    ),
  };
}

export function loadContentPolicy(): ContentPolicySettings {
  if (typeof window === "undefined") return DEFAULT_CONTENT_POLICY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONTENT_POLICY;
    const parsed = JSON.parse(raw) as Partial<ContentPolicySettings>;
    return {
      houseRuleTemplates: mergeList(parsed.houseRuleTemplates, DEFAULT_HOUSE_RULE_TEMPLATES),
      cancellationPolicies: mergeList(parsed.cancellationPolicies, DEFAULT_CANCELLATION_POLICIES),
      platformAnnouncements: mergeList(
        parsed.platformAnnouncements,
        DEFAULT_CONTENT_POLICY.platformAnnouncements
      ),
      messageTemplates: mergeList(parsed.messageTemplates, DEFAULT_MESSAGE_TEMPLATES),
      cms: mergeCms(parsed.cms),
    };
  } catch {
    return DEFAULT_CONTENT_POLICY;
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
  settings: ContentPolicySettings = loadContentPolicy()
): HouseRuleTemplate[] {
  return settings.houseRuleTemplates.filter((t) => t.enabled && t.title.trim());
}

export function getEnabledCancellationPolicies(
  settings: ContentPolicySettings = loadContentPolicy()
): CancellationPolicyOption[] {
  return settings.cancellationPolicies.filter((p) => p.enabled);
}

/** Enabled policies that also respect Super Admin max-strictness bound. */
export function getHostSelectableCancellationPolicies(
  settings: ContentPolicySettings = loadContentPolicy()
): CancellationPolicyOption[] {
  return getEnabledCancellationPolicies(settings).filter((p) =>
    cancellationPolicyAllowed(p.id)
  );
}

export function getCancellationPolicyById(
  id: string,
  settings: ContentPolicySettings = loadContentPolicy()
): CancellationPolicyOption | undefined {
  return settings.cancellationPolicies.find((p) => p.id === id);
}

/** Default house rules for new listings — first four enabled templates */
export function getDefaultHouseRulesFromTemplates(
  settings: ContentPolicySettings = loadContentPolicy()
): { title: string; description: string }[] {
  const templates = getEnabledHouseRuleTemplates(settings);
  const defaults = templates.slice(0, 4);
  if (defaults.length > 0) {
    return defaults.map(({ title, description }) => ({ title, description }));
  }
  return DEFAULT_HOUSE_RULE_TEMPLATES.slice(0, 4).map(({ title, description }) => ({
    title,
    description,
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

  pushPolicyAlertToAllHosts(announcement.title, announcement.message);

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
  pushPolicyAlertToAllHosts(input.title, input.message);
  const item: PlatformAnnouncement = {
    ...input,
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
