export interface HostPublicProfile {
  hostId: string;
  /** Shown on listings / guest-facing surfaces */
  displayName: string;
  /** Legal / trading company name */
  companyName: string;
  bio: string;
  city: string;
  whatsapp?: string;
  /** Prefer WhatsApp for guest contact */
  preferWhatsapp: boolean;
  /** Optional brand / host logo (data URL or remote URL) */
  logoUrl?: string;
  logoFileName?: string;
  /** Original file size in bytes */
  logoBytes?: number;
  /** Natural image width in px */
  logoWidth?: number;
  /** Natural image height in px */
  logoHeight?: number;
  /** Host opt-in for instant booking (requires platform-wide toggle) */
  instantBookEnabled?: boolean;
}

export type HostPublicProfileInput = Omit<HostPublicProfile, "hostId">;
