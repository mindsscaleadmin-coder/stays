import type { HostReviewsData } from "./host-reviews-types";
import type { FlatHostReview } from "@/lib/admin/trust-data";
import { isSharedDbEnabled } from "@/lib/shared-db";

export function shouldUseSharedHostReviews() {
  return isSharedDbEnabled();
}

export async function fetchHostReviewsFromApi(hostId: string): Promise<HostReviewsData> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/reviews`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load host reviews");
  const json = (await res.json()) as { data: HostReviewsData };
  return json.data;
}

export async function respondToReviewViaApi(
  hostId: string,
  reviewId: string,
  response: string
): Promise<HostReviewsData> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/reviews`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "respond", reviewId, response }),
  });
  if (!res.ok) throw new Error("Failed to save response");
  const json = (await res.json()) as { data: HostReviewsData };
  return json.data;
}

export async function saveTemplatesViaApi(
  hostId: string,
  templates: HostReviewsData["templates"]
): Promise<HostReviewsData> {
  const res = await fetch(`/api/hosts/${encodeURIComponent(hostId)}/reviews`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "saveTemplates", templates }),
  });
  if (!res.ok) throw new Error("Failed to save templates");
  const json = (await res.json()) as { data: HostReviewsData };
  return json.data;
}

const ADMIN_REVIEWS_TTL_MS = 8_000;
let adminReviewsCache: FlatHostReview[] | null = null;
let adminReviewsFetchedAt = 0;
let adminReviewsInflight: Promise<FlatHostReview[]> | null = null;

export async function fetchAllReviewsFlatFromApi(force = false): Promise<FlatHostReview[]> {
  if (!force && adminReviewsInflight) return adminReviewsInflight;
  if (!force && adminReviewsCache && Date.now() - adminReviewsFetchedAt < ADMIN_REVIEWS_TTL_MS) {
    return adminReviewsCache;
  }

  adminReviewsInflight = (async () => {
    try {
      const res = await fetch("/api/admin/reviews", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load reviews");
      const json = (await res.json()) as { reviews: FlatHostReview[] };
      adminReviewsCache = json.reviews;
      adminReviewsFetchedAt = Date.now();
      return json.reviews;
    } catch {
      return adminReviewsCache ?? [];
    } finally {
      adminReviewsInflight = null;
    }
  })();

  return adminReviewsInflight;
}

export async function moderateReviewViaApi(input: {
  hostId: string;
  reviewId: string;
  action: "remove" | "restore" | "flag";
  reason?: string;
}) {
  const res = await fetch("/api/admin/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to moderate review");
  return res.json();
}
