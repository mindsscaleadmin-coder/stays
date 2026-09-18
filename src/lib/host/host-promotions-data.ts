import { emitSyncEvent } from "@/lib/emit-sync-event";
import { getPromotionPackageFromSettings, loadHostPromotionsSettings } from "@/lib/admin/host-promotions-settings-data";
import { mergePromotedIds, setCachedPromotedIds } from "@/lib/listings/promotions-cache";
import {
  purchasePromotionViaApi,
  shouldUseSharedPromotions,
} from "./host-promotions-api";
import type {
  ListingPromotion,
  ListingPromotionDurationDays,
  ListingPromotionKind,
} from "./host-promotions-types";

const STORAGE_KEY = "farm-stays-host-promotions";
export const HOST_PROMOTIONS_SYNC_EVENT = "farm-stays-host-promotions-updated";

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(HOST_PROMOTIONS_SYNC_EVENT);
}

function readAll(): ListingPromotion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ListingPromotion[];
  } catch {
    return [];
  }
}

function writeAll(items: ListingPromotion[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // Keep in-memory cache aligned for immediate search ranking
  setCachedPromotedIds(
    "featured",
    items
      .filter((p) => p.kind === "featured" && withStatus(p).status === "active")
      .map((p) => p.listingId)
  );
  setCachedPromotedIds(
    "trending",
    items
      .filter((p) => p.kind === "trending" && withStatus(p).status === "active")
      .map((p) => p.listingId)
  );
  notify();
}

function withStatus(promo: ListingPromotion, now = new Date()): ListingPromotion {
  if (promo.status === "pending") return promo;
  const ends = new Date(promo.endsAt).getTime();
  const expired = Number.isNaN(ends) || ends <= now.getTime();
  return { ...promo, status: expired ? "expired" : "active" };
}

export function loadAllPromotions(now = new Date()): ListingPromotion[] {
  return readAll().map((p) => withStatus(p, now));
}

export function loadPromotionsForListing(
  listingId: string,
  now = new Date()
): ListingPromotion[] {
  return loadAllPromotions(now).filter((p) => p.listingId === listingId);
}

export function loadActivePromotions(
  kind?: ListingPromotionKind,
  now = new Date()
): ListingPromotion[] {
  return loadAllPromotions(now).filter(
    (p) => p.status === "active" && (kind == null || p.kind === kind)
  );
}

export function hasActivePromotion(
  listingId: string,
  kind: ListingPromotionKind,
  now = new Date()
): boolean {
  return loadActivePromotions(kind, now).some((p) => p.listingId === listingId);
}

export function getActivePromotion(
  listingId: string,
  kind: ListingPromotionKind,
  now = new Date()
): ListingPromotion | null {
  return (
    loadActivePromotions(kind, now).find((p) => p.listingId === listingId) ?? null
  );
}

/** Listing IDs with an active paid placement — merges DB cache + local purchases. */
export function getActivePromotedListingIds(
  kind: ListingPromotionKind,
  now = new Date()
): string[] {
  const local = shouldUseSharedPromotions()
    ? []
    : loadActivePromotions(kind, now)
        .sort(
          (a, b) =>
            new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
        )
        .map((p) => p.listingId)
        .filter((id, i, arr) => arr.indexOf(id) === i);

  if (typeof window === "undefined") return local;
  return mergePromotedIds(kind, local);
}

export async function purchasePromotion(input: {
  listingId: string;
  hostId: string;
  kind: ListingPromotionKind;
  durationDays: ListingPromotionDurationDays;
  listingTitle?: string;
}): Promise<{ promotion: ListingPromotion; checkoutUrl?: string } | null> {
  if (shouldUseSharedPromotions()) {
    const saved = await purchasePromotionViaApi(input);
    if (saved) notify();
    return saved;
  }

  const pkg = getPromotionPackageFromSettings(input.kind, input.durationDays);
  if (!pkg) return null;

  const now = new Date();
  const existing = getActivePromotion(input.listingId, input.kind, now);
  const start = existing ? new Date(existing.endsAt) : now;
  if (start.getTime() < now.getTime()) start.setTime(now.getTime());
  const ends = new Date(start);
  ends.setDate(ends.getDate() + input.durationDays);

  const promo: ListingPromotion = {
    id: `promo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    listingId: input.listingId,
    hostId: input.hostId,
    kind: input.kind,
    durationDays: input.durationDays,
    priceAed: pkg.priceAed,
    currency: loadHostPromotionsSettings().currency,
    purchasedAt: now.toISOString(),
    startsAt: (existing ? now : start).toISOString(),
    endsAt: ends.toISOString(),
    status: "active",
    paymentRef: `DEMO-${Date.now().toString(36).toUpperCase()}`,
  };

  const all = readAll();
  const next = all.map((p) => {
    if (
      p.listingId === input.listingId &&
      p.kind === input.kind &&
      withStatus(p, now).status === "active"
    ) {
      return { ...p, status: "expired" as const, endsAt: now.toISOString() };
    }
    return p;
  });
  next.push(promo);
  writeAll(next);

  return { promotion: promo };
}

export function formatPromoEnds(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Whole days remaining until endsAt (0 if ending today, negative if past). */
export function promoDaysRemaining(endsAt: string, now = new Date()): number {
  const ends = new Date(endsAt).getTime();
  if (Number.isNaN(ends)) return 0;
  const ms = ends - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

/** Warn when active promo ends within this many days. */
export const PROMO_EXPIRY_WARN_DAYS = 3;

export function isPromoNearingEnd(
  endsAt: string,
  status: ListingPromotion["status"],
  now = new Date(),
  withinDays = PROMO_EXPIRY_WARN_DAYS
): boolean {
  if (status !== "active") return false;
  const days = promoDaysRemaining(endsAt, now);
  return days >= 0 && days <= withinDays;
}

export function promoExpiryLabel(endsAt: string, now = new Date()): string {
  const days = promoDaysRemaining(endsAt, now);
  if (days < 0) return "Ended";
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  return `Ends in ${days} days`;
}
