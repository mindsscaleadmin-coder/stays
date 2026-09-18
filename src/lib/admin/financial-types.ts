export type AdminPayoutStatus = "pending_review" | "approved" | "held" | "processing" | "paid";

export type RefundRequestStatus = "pending" | "approved" | "rejected";

export interface HostCommissionOverride {
  hostId: string;
  hostName: string;
  feePct: number;
  note?: string;
}

/** One paid tier of a directory vertical, priced by listing capacity. */
export interface EventsSubscriptionPlan {
  id: string;
  name: string;
  /** Venue/outlet listings included. null = unlimited. */
  maxListings: number | null;
  /**
   * Event-only: rentable spaces (halls, lawns, etc.) per venue listing.
   * For multi-venue tiers this is the cap on each venue, not a shared pool.
   * null = unlimited. Ignored for Dining tiers.
   */
  maxSpaces?: number | null;
  yearlyFeeAed: number;
  active: boolean;
}

/** Bundled yearly offer covering both Events and Dining directory access. */
export interface DirectoryComboOffer {
  enabled: boolean;
  active: boolean;
  name: string;
  description: string;
  yearlyFeeAed: number;
  /** Included Events venue listings. null = unlimited. */
  eventsSpaces: number | null;
  /** Included rentable event spaces (halls, lawns). null = unlimited. */
  eventsHallSpaces?: number | null;
  /** Included Dining outlets. null = unlimited. */
  diningSpaces: number | null;
}

export interface EventsSubscriptionSettings {
  /**
   * Launch phase: approved directory listings are public and free — no subscription
   * required. Turn this off to start enforcing the paid tiers below.
   */
  freeDuringLaunch: boolean;
  /** Yearly tiers for Events / venue directory listings. */
  eventsPlans: EventsSubscriptionPlan[];
  /** Yearly tiers for Dining directory listings — separate capacity from Events. */
  diningPlans: EventsSubscriptionPlan[];
  /** Optional Events + Dining bundle — one yearly price for both verticals. */
  comboOffer?: DirectoryComboOffer;
  /** @deprecated Use `eventsPlans`. Kept for stored payload migration. */
  plans?: EventsSubscriptionPlan[];
  /** @deprecated Flat single fee kept for stored payload shape. */
  yearlyFeeAed: number;
}

export interface PlatformCommissionSettings {
  globalFeePct: number;
  /** Flat service fee added per booking (display / config) */
  globalServiceFeeFlat: number;
  hostOverrides: HostCommissionOverride[];
}

export interface FinancialSettings {
  commission: PlatformCommissionSettings;
  eventsSubscription: EventsSubscriptionSettings;
  payoutStates: Record<string, AdminPayoutState>;
  refundRequests: RefundRequest[];
}

export interface AdminPayoutState {
  adminStatus: AdminPayoutStatus;
  holdReason?: string;
  reviewedAt?: string;
}

export interface AdminPayoutItem {
  id: string;
  hostId: string;
  hostName: string;
  scheduledDate: string;
  amount: number;
  currency: string;
  bookingCount: number;
  sourceStatus: "scheduled" | "processing" | "paid";
  adminStatus: AdminPayoutStatus;
  holdReason?: string;
}

export interface AdminTransactionRow {
  id: string;
  hostId: string;
  hostName: string;
  date: string;
  guestName: string;
  property: string;
  bookingRef: string;
  currency: string;
  grossAmount: number;
  platformFeePct: number;
  platformFee: number;
  taxAmount: number;
  taxLabel: string;
  netEarnings: number;
  payoutStatus: "pending" | "included" | "paid";
  stripeProcessingFee?: number;
}

export interface RefundRequest {
  id: string;
  bookingRef: string;
  guestName: string;
  hostName: string;
  amount: string;
  currency: string;
  reason: string;
  status: RefundRequestStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface FinancialReport {
  platformRevenue: number;
  hostEarnings: number;
  taxCollected: number;
  stripeFeesTotal: number;
  payoutTransferCosts: number;
  truePlatformMargin: number;
  outstandingPayouts: number;
  pendingRefunds: number;
  currency: string;
  transactionCount: number;
}
