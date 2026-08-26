import type {
  ListingPromotion,
  ListingPromotionDurationDays,
  ListingPromotionKind,
} from "./host-promotions-types";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedPromotions() {
  return isSharedDbEnabled();
}

export async function fetchPromotionsFromApi(input: {
  listingId?: string;
  hostId?: string;
}): Promise<ListingPromotion[]> {
  const params = new URLSearchParams();
  if (input.listingId) params.set("listingId", input.listingId);
  if (input.hostId) params.set("hostId", input.hostId);
  const res = await fetch(`/api/promotions?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load promotions");
  const data = (await res.json()) as { promotions: ListingPromotion[] };
  return data.promotions;
}

export async function purchasePromotionViaApi(input: {
  listingId: string;
  hostId: string;
  kind: ListingPromotionKind;
  durationDays: ListingPromotionDurationDays;
  listingTitle?: string;
}): Promise<{ promotion: ListingPromotion; checkoutUrl?: string } | null> {
  const res = await fetch("/api/promotions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "purchase", ...input }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { promotion: ListingPromotion; checkoutUrl?: string };
  return { promotion: data.promotion, checkoutUrl: data.checkoutUrl };
}

export async function confirmPromotionViaApi(promotionId: string, sessionId: string) {
  const res = await fetch("/api/promotions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "confirm", promotionId, sessionId }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { promotion: ListingPromotion };
  return data.promotion;
}
