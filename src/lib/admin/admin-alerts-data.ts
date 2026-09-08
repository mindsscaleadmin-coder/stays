import { resolveBookingHost } from "@/lib/admin/booking-oversight-utils";
import { loadAllUsers } from "@/lib/admin/user-data";
import { loadHostBookings } from "@/lib/host/host-booking-data";
import { loadAllSubmissions } from "@/lib/listings/submission-data";
import { loadAllReviewsFlat } from "@/lib/admin/trust-data";
import { aggregateAllTransactions } from "@/lib/admin/financial-data";
import { parseBookingAmount } from "@/lib/admin/platform-analytics-data";
import { loadAllPromotions } from "@/lib/host/host-promotions-data";
import { HOST_LISTINGS } from "@/lib/mock/dashboard-data";
import type {
  AdminAlert,
  AdminAlertCategory,
  AdminAlertSettings,
  AdminAlertsState,
  SystemServiceStatus,
} from "./admin-alerts-types";

import { emitSyncCustomEvent } from "@/lib/emit-sync-event";
const STORAGE_KEY = "farm-stays-admin-alerts";
export const ADMIN_ALERTS_SYNC_EVENT = "farm-stays-admin-alerts-updated";

export const ADMIN_ALERT_CATEGORY_LABELS: Record<AdminAlertCategory, string> = {
  host_signup: "Host signups",
  flagged_content: "Flagged content",
  high_value_tx: "High-value / fraud",
  system_health: "System health",
  host_payment: "Host payments",
};
export const DEFAULT_ADMIN_ALERT_SETTINGS: AdminAlertSettings = {
  highValueThresholdAed: 5000,
  newHostSignupDays: 14,
  enabledCategories: {
    host_signup: true,
    flagged_content: true,
    high_value_tx: true,
    system_health: true,
    host_payment: true,
  },
  systemHealth: {
    paymentGateway: "operational",
    emailService: "operational",
    smsService: "degraded",
    lastCheckedAt: new Date().toISOString(),
  },
};

const DEFAULT_STATE: AdminAlertsState = {
  settings: DEFAULT_ADMIN_ALERT_SETTINGS,
  dismissedSourceKeys: [],
  readSourceKeys: [],
};

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(ADMIN_ALERTS_SYNC_EVENT);
  }
}

export function loadAdminAlertsState(): AdminAlertsState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AdminAlertsState>;
    return {
      settings: {
        ...DEFAULT_ADMIN_ALERT_SETTINGS,
        ...parsed.settings,
        enabledCategories: {
          ...DEFAULT_ADMIN_ALERT_SETTINGS.enabledCategories,
          ...parsed.settings?.enabledCategories,
        },
        systemHealth: {
          ...DEFAULT_ADMIN_ALERT_SETTINGS.systemHealth,
          ...parsed.settings?.systemHealth,
        },
      },
      dismissedSourceKeys: parsed.dismissedSourceKeys ?? [],
      readSourceKeys: parsed.readSourceKeys ?? [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveAdminAlertsState(state: AdminAlertsState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  dispatchSync();
}

function makeAlert(
  partial: Omit<AdminAlert, "read" | "dismissed">,
  state: AdminAlertsState
): AdminAlert {
  return {
    ...partial,
    read: state.readSourceKeys.includes(partial.sourceKey),
    dismissed: state.dismissedSourceKeys.includes(partial.sourceKey),
  };
}

function syncHostSignupAlerts(state: AdminAlertsState): AdminAlert[] {
  if (!state.settings.enabledCategories.host_signup) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - state.settings.newHostSignupDays);

  return loadAllUsers()
    .filter((u) => u.roles.includes("host") && new Date(u.joinedAt) >= cutoff)
    .map((host) =>
      makeAlert(
        {
          id: `alert-host-${host.id}`,
          category: "host_signup",
          severity: host.status === "pending" ? "warning" : "info",
          title: "New host signup",
          message: `${host.name} registered as a host (${host.status}). Review KYC and profile.`,
          createdAt: host.joinedAt,
          href: `/admin/hosts/${encodeURIComponent(host.id)}`,
          sourceKey: `host-signup-${host.id}`,
        },
        state
      )
    );
}

function syncFlaggedContentAlerts(state: AdminAlertsState): AdminAlert[] {
  if (!state.settings.enabledCategories.flagged_content) return [];
  const alerts: AdminAlert[] = [];

  for (const listing of loadAllSubmissions()) {
    if (listing.status === "pending") {
      alerts.push(
        makeAlert(
          {
            id: `alert-listing-pending-${listing.id}`,
            category: "flagged_content",
            severity: "warning",
            title: "Listing pending review",
            message: `"${listing.title}" by ${listing.hostName} awaits moderation.`,
            createdAt: listing.submittedAt,
            href: "/admin/listings?tab=queue",
            sourceKey: `listing-pending-${listing.id}`,
          },
          state
        )
      );
    }
    if (listing.flaggedForReview) {
      alerts.push(
        makeAlert(
          {
            id: `alert-listing-flagged-${listing.id}`,
            category: "flagged_content",
            severity: "critical",
            title: "Flagged listing",
            message: `"${listing.title}" flagged for admin follow-up.`,
            createdAt: listing.statusUpdatedAt ?? listing.submittedAt,
            href: "/admin/listings?tab=listings",
            sourceKey: `listing-flagged-${listing.id}`,
          },
          state
        )
      );
    }
  }

  for (const review of loadAllReviewsFlat()) {
    if (review.moderationStatus === "flagged") {
      alerts.push(
        makeAlert(
          {
            id: `alert-review-flagged-${review.hostId}-${review.id}`,
            category: "flagged_content",
            severity: "warning",
            title: "Flagged guest review",
            message: `Review by ${review.guestName} on ${review.property} needs moderation.`,
            createdAt: review.date,
            href: "/admin/trust?tab=reviews",
            sourceKey: `review-flagged-${review.hostId}-${review.id}`,
          },
          state
        )
      );
    }
  }

  return alerts;
}

function syncHighValueTxAlerts(state: AdminAlertsState): AdminAlert[] {
  if (!state.settings.enabledCategories.high_value_tx) return [];
  const threshold = state.settings.highValueThresholdAed;
  const alerts: AdminAlert[] = [];
  const seen = new Set<string>();

  for (const booking of loadHostBookings().map(resolveBookingHost)) {
    const amount = parseBookingAmount(booking.total);
    if (amount < threshold || booking.status === "cancelled") continue;
    const key = `high-tx-booking-${booking.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    alerts.push(
      makeAlert(
        {
          id: `alert-hvt-${booking.id}`,
          category: "high_value_tx",
          severity: amount >= threshold * 2 ? "critical" : "warning",
          title: "High-value transaction",
          message: `${booking.guest} — ${formatMoney(amount)} for ${booking.property} (${booking.id}). Monitor for fraud.`,
          createdAt: booking.bookedAt,
          href: "/admin/financial?tab=transactions",
          sourceKey: key,
        },
        state
      )
    );
  }

  for (const tx of aggregateAllTransactions()) {
    if (tx.grossAmount < threshold) continue;
    const key = `high-tx-fin-${tx.bookingRef}-${tx.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    alerts.push(
      makeAlert(
        {
          id: `alert-hvt-fin-${tx.bookingRef}`,
          category: "high_value_tx",
          severity: tx.grossAmount >= threshold * 2 ? "critical" : "warning",
          title: "High-value payout transaction",
          message: `${tx.hostName} — ${tx.currency} ${tx.grossAmount.toLocaleString()} (${tx.bookingRef}). Held for fraud review if unusual.`,
          createdAt: tx.date,
          href: "/admin/financial?tab=transactions",
          sourceKey: key,
        },
        state
      )
    );
  }

  return alerts;
}

function syncSystemHealthAlerts(state: AdminAlertsState): AdminAlert[] {
  if (!state.settings.enabledCategories.system_health) return [];
  const { systemHealth } = state.settings;
  const alerts: AdminAlert[] = [];
  const services: { key: keyof typeof systemHealth; label: string }[] = [
    { key: "paymentGateway", label: "Payment gateway" },
    { key: "emailService", label: "Email service" },
    { key: "smsService", label: "SMS service" },
  ];

  for (const { key, label } of services) {
    if (key === "lastCheckedAt") continue;
    const status = systemHealth[key] as SystemServiceStatus;
    if (status === "operational") continue;
    alerts.push(
      makeAlert(
        {
          id: `alert-sys-${key}`,
          category: "system_health",
          severity: status === "down" ? "critical" : "warning",
          title: `${label} ${status}`,
          message:
            status === "down"
              ? `${label} is unavailable. Bookings and notifications may be affected.`
              : `${label} is experiencing degraded performance.`,
          createdAt: systemHealth.lastCheckedAt,
          href: "/admin/alerts?tab=system",
          sourceKey: `system-${key}-${status}`,
        },
        state
      )
    );
  }

  return alerts;
}

function resolveListingTitle(listingId: string): string {
  const sub = loadAllSubmissions().find((l) => l.id === listingId);
  if (sub) return sub.title;
  const mock = HOST_LISTINGS.find((l) => l.id === listingId);
  return mock?.title ?? listingId;
}

function resolveHostLabel(hostId: string): string {
  const user = loadAllUsers().find((u) => u.id === hostId);
  return user?.name ?? hostId;
}

function syncHostPaymentAlerts(state: AdminAlertsState): AdminAlert[] {
  if (!state.settings.enabledCategories.host_payment) return [];
  return loadAllPromotions().map((promo) => {
    const kindLabel = promo.kind === "trending" ? "Trending" : "Featured";
    const listingTitle = resolveListingTitle(promo.listingId);
    const hostName = resolveHostLabel(promo.hostId);
    return makeAlert(
      {
        id: `alert-pay-${promo.id}`,
        category: "host_payment",
        severity: "info",
        title: `Host paid for ${kindLabel}`,
        message: `${hostName} purchased ${kindLabel} (${promo.durationDays} days) for “${listingTitle}” — AED ${promo.priceAed.toLocaleString()} · ${promo.paymentRef}. Ends ${new Date(promo.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.`,
        createdAt: promo.purchasedAt,
        href: "/admin/advertisements",
        sourceKey: `host-payment-${promo.id}`,
      },
      state
    );
  });
}

function formatMoney(amount: number): string {
  return `AED ${Math.round(amount).toLocaleString()}`;
}

export function computeAdminAlerts(state = loadAdminAlertsState()): AdminAlert[] {
  const all = [
    ...syncHostSignupAlerts(state),
    ...syncFlaggedContentAlerts(state),
    ...syncHighValueTxAlerts(state),
    ...syncSystemHealthAlerts(state),
    ...syncHostPaymentAlerts(state),
  ]
    .filter((a) => !a.dismissed)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return all;
}

export function countUnreadAdminAlerts(alerts: AdminAlert[] = computeAdminAlerts()): number {
  return alerts.filter((a) => !a.read).length;
}

export function countCriticalAdminAlerts(alerts: AdminAlert[] = computeAdminAlerts()): number {
  return alerts.filter((a) => !a.read && a.severity === "critical").length;
}

export function markAdminAlertRead(sourceKey: string): void {
  const state = loadAdminAlertsState();
  if (state.readSourceKeys.includes(sourceKey)) return;
  saveAdminAlertsState({
    ...state,
    readSourceKeys: [...state.readSourceKeys, sourceKey],
  });
}

export function markAllAdminAlertsRead(): void {
  const state = loadAdminAlertsState();
  const keys = computeAdminAlerts(state).map((a) => a.sourceKey);
  saveAdminAlertsState({
    ...state,
    readSourceKeys: Array.from(new Set([...state.readSourceKeys, ...keys])),
  });
}

export function dismissAdminAlert(sourceKey: string): void {
  const state = loadAdminAlertsState();
  saveAdminAlertsState({
    ...state,
    dismissedSourceKeys: Array.from(new Set([...state.dismissedSourceKeys, sourceKey])),
  });
}

export function updateAdminAlertSettings(settings: AdminAlertSettings): void {
  const state = loadAdminAlertsState();
  saveAdminAlertsState({ ...state, settings });
}

export function setSystemServiceStatus(
  service: keyof Omit<AdminAlertSettings["systemHealth"], "lastCheckedAt">,
  status: SystemServiceStatus
): void {
  const state = loadAdminAlertsState();
  saveAdminAlertsState({
    ...state,
    settings: {
      ...state.settings,
      systemHealth: {
        ...state.settings.systemHealth,
        [service]: status,
        lastCheckedAt: new Date().toISOString(),
      },
    },
  });
}

export function countByCategory(alerts: AdminAlert[]): Record<AdminAlertCategory, number> {
  return alerts.reduce(
    (acc, a) => {
      acc[a.category] += 1;
      return acc;
    },
    {
      host_signup: 0,
      flagged_content: 0,
      high_value_tx: 0,
      system_health: 0,
      host_payment: 0,
    } as Record<AdminAlertCategory, number>
  );
}

export function countUnreadByCategory(
  alerts: AdminAlert[]
): Record<AdminAlertCategory, number> {
  return alerts.reduce(
    (acc, a) => {
      if (!a.read) acc[a.category] += 1;
      return acc;
    },
    {
      host_signup: 0,
      flagged_content: 0,
      high_value_tx: 0,
      system_health: 0,
      host_payment: 0,
    } as Record<AdminAlertCategory, number>
  );
}
