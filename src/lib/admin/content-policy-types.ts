export interface HouseRuleTemplate {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface CancellationPolicyOption {
  id: string;
  label: string;
  shortDescription: string;
  fullText: string;
  refundDaysBefore: number;
  refundPercent: number;
  enabled: boolean;
}

export type PlatformAnnouncementStatus = "draft" | "scheduled" | "sent";

export interface PlatformAnnouncement {
  id: string;
  title: string;
  message: string;
  priority: "normal" | "high";
  status: PlatformAnnouncementStatus;
  createdAt: string;
  pushedAt?: string;
  expiresAt?: string;
  /** Empty = every country. */
  countries: string[];
  /** Empty = every parent category. */
  parentCategories: string[];
  /** Empty = every category. */
  categories: string[];
}

export type MessageChannel = "email" | "sms";
export type MessageAudience = "host" | "guest";

export interface MessageTemplate {
  id: string;
  channel: MessageChannel;
  audience: MessageAudience;
  name: string;
  subject?: string;
  body: string;
  enabled: boolean;
  variables: string[];
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  published: boolean;
  publishedAt?: string;
  imageUrl?: string;
}

export interface CmsContentSection {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  sortOrder: number;
}

export interface CmsSettings {
  heroTitle: string;
  heroHighlight: string;
  heroTitleEnd: string;
  heroSubtitle: string;
  heroEnabled: boolean;
  featuredListingIds: string[];
  blogPosts: BlogPost[];
  contentSections: CmsContentSection[];
}

export interface ParentCategoryPolicyPack {
  parentId: string;
  parentName: string;
  houseRuleTemplates: HouseRuleTemplate[];
  cancellationPolicies: CancellationPolicyOption[];
}

export interface ContentPolicySettings {
  /** House rules + cancellation tiers per parent category (Stays, Experiences, Events, Dining). */
  parentPolicyPacks: ParentCategoryPolicyPack[];
  /** @deprecated Migrated into parentPolicyPacks — kept for legacy localStorage reads. */
  houseRuleTemplates?: HouseRuleTemplate[];
  /** @deprecated Migrated into parentPolicyPacks — kept for legacy localStorage reads. */
  cancellationPolicies?: CancellationPolicyOption[];
  platformAnnouncements: PlatformAnnouncement[];
  messageTemplates: MessageTemplate[];
  cms: CmsSettings;
}

export type HouseRuleTemplateInput = Omit<HouseRuleTemplate, "id">;
export type CancellationPolicyInput = Omit<CancellationPolicyOption, "id">;
export type PlatformAnnouncementInput = Omit<
  PlatformAnnouncement,
  "id" | "createdAt" | "status" | "pushedAt"
>;
export type MessageTemplateInput = Omit<MessageTemplate, "id">;
export type BlogPostInput = Omit<BlogPost, "id">;
