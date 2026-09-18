import type { DirectoryBillingStatus } from "./directory-billing-types";

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
  /** @deprecated Bookings always confirm instantly; kept for stored profile shape. */
  instantBookEnabled?: boolean;
  /** ISO datetime — Event directory listings stay public until this date. */
  eventsSubscriptionExpiresAt?: string;
  /** ISO datetime — Dining directory listings stay public until this date. */
  diningSubscriptionExpiresAt?: string;
  /** ISO datetime — bundled Events + Dining combo subscription. */
  directoryComboExpiresAt?: string;
  /** Admin-editable Events venue listing cap. null = unlimited; unset = use plan/combo defaults. */
  eventsVenueSpaces?: number | null;
  /** Admin-editable rentable event space cap (halls, lawns). null = unlimited. */
  eventsHallSpaces?: number | null;
  /** Admin-editable Dining outlet cap. null = unlimited; unset = use plan/combo defaults. */
  diningOutletSpaces?: number | null;
  /** Admin toggle — host must pay even while global launch is free. */
  directoryBillingEnforced?: boolean;
  directoryBillingStatus?: DirectoryBillingStatus;
  /** Plan/combo id chosen at onboarding (e.g. events-single, combo). */
  preferredDirectoryPlanId?: string;
  /** When admin turned billing on for this host. */
  directoryBillingEnabledAt?: string;
  /** Last successful directory subscription payment. */
  directoryBillingPaidAt?: string;
  /** Admin follow-up notes (called, invoiced, bank transfer pending). */
  directoryBillingNotes?: string;
  /** Grace period end before listings are hidden. */
  directoryBillingGraceEndsAt?: string;
}

export type HostPublicProfileInput = Omit<HostPublicProfile, "hostId">;
