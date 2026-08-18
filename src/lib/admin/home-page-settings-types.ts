export interface AnnouncementBarItem {
  id: string;
  emoji: string;
  text: string;
  enabled: boolean;
}

export interface HomePageBanner {
  /** data: URL or remote image URL */
  url: string;
  fileName?: string;
  /** Original file size in bytes */
  fileSize?: number;
  width?: number;
  height?: number;
  updatedAt?: string;
}

export interface HomePageSettings {
  announcementEnabled: boolean;
  announcementItems: AnnouncementBarItem[];
  /** Custom homepage hero banner; null/undefined uses the default image */
  heroBanner: HomePageBanner | null;
  /** Site favicon shown in browser tabs; null uses the default Next.js icon */
  favicon: HomePageBanner | null;
}

export type AnnouncementBarItemInput = Omit<AnnouncementBarItem, "id">;

/** Recommended / enforced limits for homepage banner uploads */
export const HOME_PAGE_BANNER_SPECS = {
  maxFileBytes: 2 * 1024 * 1024, // 2 MB
  maxFileLabel: "2 MB",
  recommendedWidth: 1920,
  recommendedHeight: 1080,
  recommendedAspect: "16:9",
  accept: "image/jpeg,image/png,image/webp",
  acceptLabel: "JPG, PNG, or WebP",
} as const;

/** Recommended / enforced limits for favicon uploads */
export const HOME_PAGE_FAVICON_SPECS = {
  maxFileBytes: 512 * 1024, // 512 KB
  maxFileLabel: "512 KB",
  recommendedWidth: 32,
  recommendedHeight: 32,
  recommendedSizes: "32×32 or 48×48 px (square)",
  accept: "image/png,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/webp,image/svg+xml",
  acceptLabel: "PNG, ICO, JPG, WebP, or SVG",
} as const;
