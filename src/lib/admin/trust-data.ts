import {
  collectHostReviewHostIds,
  loadHostReviews,
} from "@/lib/host/host-reviews-data";
import type { HostGuestReview } from "@/lib/host/host-reviews-types";
import {
  collectHostTrustHostIds,
  loadHostTrust,
} from "@/lib/host/host-trust-data";
import type { FarmCertification } from "@/lib/host/host-trust-types";
import { emitSyncCustomEvent } from "@/lib/emit-sync-event";

export interface FlatHostReview extends HostGuestReview {
  hostId: string;
  hostName: string;
}

export interface HostReviewFlag {
  hostId: string;
  hostName: string;
  poorReviewCount: number;
  avgRating: number;
  totalReviews: number;
  flagged: boolean;
  reason: string;
}

export interface PendingCertification {
  hostId: string;
  hostName: string;
  certification: FarmCertification;
}

export interface TrustBadgeDefinition {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const STORAGE_KEY = "farm-stays-trust-admin";
export const TRUST_ADMIN_SYNC_EVENT = "farm-stays-trust-admin-updated";

const HOST_NAMES: Record<string, string> = {
  "seed-host-4": "Ahmed Al Farsi",
  "seed-host-5": "Sara Khan",
  "demo-host": "Demo Host",
  "U-001": "Ahmed Al Farsi",
  "U-003": "Khalid Al Mazrouei",
};

export const DEFAULT_TRUST_BADGES: TrustBadgeDefinition[] = [
  {
    id: "cert-organic",
    label: "Organic certified",
    description: "Verified organic farming practices.",
    enabled: true,
  },
  {
    id: "cert-eco",
    label: "Eco-tourism registered",
    description: "Registered with national eco-tourism programme.",
    enabled: true,
  },
  {
    id: "cert-halal",
    label: "Halal food service",
    description: "Kitchen and dining meet halal standards.",
    enabled: true,
  },
  {
    id: "cert-sustainable",
    label: "Sustainable agriculture",
    description: "Water conservation and low-impact farming.",
    enabled: true,
  },
];

export interface TrustAdminSettings {
  badgeCatalog: TrustBadgeDefinition[];
  /** Host IDs manually flagged by admin */
  manualHostFlags: string[];
}

export const DEFAULT_TRUST_ADMIN: TrustAdminSettings = {
  badgeCatalog: DEFAULT_TRUST_BADGES,
  manualHostFlags: [],
};

function dispatchSync() {
  if (typeof window !== "undefined") {
    emitSyncCustomEvent(TRUST_ADMIN_SYNC_EVENT);
  }
}

export function mergeTrustAdminSettings(
  parsed: Partial<TrustAdminSettings> | null | undefined
): TrustAdminSettings {
  if (!parsed) return DEFAULT_TRUST_ADMIN;
  return {
    badgeCatalog:
      parsed.badgeCatalog?.length ? parsed.badgeCatalog : DEFAULT_TRUST_ADMIN.badgeCatalog,
    manualHostFlags: parsed.manualHostFlags ?? [],
  };
}

export function loadTrustAdminSettings(): TrustAdminSettings {
  if (typeof window === "undefined") return DEFAULT_TRUST_ADMIN;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TRUST_ADMIN;
    const parsed = JSON.parse(raw) as Partial<TrustAdminSettings>;
    return mergeTrustAdminSettings(parsed);
  } catch {
    return DEFAULT_TRUST_ADMIN;
  }
}

export function saveTrustAdminSettings(settings: TrustAdminSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  dispatchSync();
}

export function resolveHostName(hostId: string): string {
  return HOST_NAMES[hostId] ?? hostId;
}

export function loadAllReviewsFlat(): FlatHostReview[] {
  const rows: FlatHostReview[] = [];
  for (const hostId of collectHostReviewHostIds()) {
    const data = loadHostReviews(hostId);
    for (const review of data.reviews) {
      rows.push({
        ...review,
        hostId,
        hostName: resolveHostName(hostId),
        moderationStatus: review.moderationStatus ?? "visible",
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export function computeHostReviewFlags(
  reviews = loadAllReviewsFlat(),
  manualFlags = loadTrustAdminSettings().manualHostFlags
): HostReviewFlag[] {
  const byHost = new Map<string, FlatHostReview[]>();
  for (const r of reviews.filter((r) => r.moderationStatus !== "removed")) {
    const list = byHost.get(r.hostId) ?? [];
    list.push(r);
    byHost.set(r.hostId, list);
  }

  const flags: HostReviewFlag[] = [];
  for (const [hostId, hostReviews] of Array.from(byHost.entries())) {
    const poorReviewCount = hostReviews.filter((r: FlatHostReview) => r.rating <= 2).length;
    const avgRating =
      hostReviews.length > 0
        ? hostReviews.reduce((s: number, r: FlatHostReview) => s + r.rating, 0) / hostReviews.length
        : 0;
    const autoFlagged = poorReviewCount >= 2 || (hostReviews.length >= 3 && avgRating < 3.5);
    const manuallyFlagged = manualFlags.includes(hostId);
    const flagged = autoFlagged || manuallyFlagged;
    let reason = "";
    if (manuallyFlagged) reason = "Flagged by admin";
    else if (poorReviewCount >= 2) reason = `${poorReviewCount} poor reviews (≤2★)`;
    else if (avgRating < 3.5) reason = `Low average rating (${avgRating.toFixed(1)}★)`;

    flags.push({
      hostId,
      hostName: resolveHostName(hostId),
      poorReviewCount,
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews: hostReviews.length,
      flagged,
      reason,
    });
  }

  return flags.sort(
    (a, b) => Number(b.flagged) - Number(a.flagged) || b.poorReviewCount - a.poorReviewCount
  );
}

export function loadPendingCertifications(): PendingCertification[] {
  const pending: PendingCertification[] = [];
  for (const hostId of collectHostTrustHostIds()) {
    const data = loadHostTrust(hostId);
    for (const cert of data.certifications) {
      if (cert.status === "pending") {
        pending.push({
          hostId,
          hostName: resolveHostName(hostId),
          certification: cert,
        });
      }
    }
  }
  return pending;
}

export function toggleManualHostFlag(hostId: string): TrustAdminSettings {
  const settings = loadTrustAdminSettings();
  const manualHostFlags = settings.manualHostFlags.includes(hostId)
    ? settings.manualHostFlags.filter((id) => id !== hostId)
    : [...settings.manualHostFlags, hostId];
  const next = { ...settings, manualHostFlags };
  saveTrustAdminSettings(next);
  return next;
}

export function updateBadgeCatalog(badgeCatalog: TrustBadgeDefinition[]): TrustAdminSettings {
  const next = { ...loadTrustAdminSettings(), badgeCatalog };
  saveTrustAdminSettings(next);
  return next;
}

export function newBadgeCatalogId(): string {
  return `cert-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
