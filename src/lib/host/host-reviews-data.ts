import type { HostReviewsData } from "./host-reviews-types";
import { emitSyncEvent } from "@/lib/emit-sync-event";

const STORAGE_KEY = "farm-stays-host-reviews";
export const HOST_REVIEWS_SYNC_EVENT = "farm-stays-host-reviews-updated";

export function defaultForHost(hostId: string): HostReviewsData {
  return {
    hostId,
    overallRating: 4.8,
    reviewCount: 24,
    categoryBreakdown: [
      { id: "clean", label: "Cleanliness", score: 4.9 },
      { id: "hosp", label: "Hospitality", score: 4.9 },
      { id: "food", label: "Food", score: 4.7 },
      { id: "exp", label: "Experience", score: 4.8 },
    ],
    reviews: [
      {
        id: "hr-1",
        guestName: "Mehul Joshi",
        property: "Green Valley Farmhouse",
        rating: 5,
        date: "2026-07-15",
        text: "Absolutely stunning property! The pool area was perfect and the farm breakfast was incredible.",
        categories: [
          { id: "clean", label: "Cleanliness", score: 5 },
          { id: "hosp", label: "Hospitality", score: 5 },
          { id: "food", label: "Food", score: 5 },
          { id: "exp", label: "Experience", score: 5 },
        ],
      },
      {
        id: "hr-2",
        guestName: "Fatima Al Mansoori",
        property: "Green Valley Farmhouse",
        rating: 4,
        date: "2026-06-28",
        text: "Lovely stay. Kids loved the animal feeding. WiFi was slow in the cottage.",
        categories: [
          { id: "clean", label: "Cleanliness", score: 4 },
          { id: "hosp", label: "Hospitality", score: 5 },
          { id: "food", label: "Food", score: 4 },
          { id: "exp", label: "Experience", score: 4 },
        ],
      },
      {
        id: "hr-3",
        guestName: "Anonymous Guest",
        property: "Green Valley Farmhouse",
        rating: 1,
        date: "2026-07-01",
        text: "SCAM!!! Fake photos. Do not book. Worst place ever!!!",
        categories: [
          { id: "clean", label: "Cleanliness", score: 1 },
          { id: "hosp", label: "Hospitality", score: 1 },
          { id: "food", label: "Food", score: 1 },
          { id: "exp", label: "Experience", score: 1 },
        ],
        moderationStatus: "flagged",
      },
    ],
    templates: [
      {
        id: "tpl-1",
        title: "Thank you",
        body: "Thank you for staying with us! We're glad you enjoyed the farm experience and hope to welcome you back.",
      },
      {
        id: "tpl-2",
        title: "Address concern",
        body: "Thank you for your feedback. We're sorry to hear about this and have already taken steps to improve. Please reach out if we can make it right.",
      },
    ],
  };
}

function notify() {
  if (typeof window === "undefined") return;
  emitSyncEvent(HOST_REVIEWS_SYNC_EVENT);
}

function readAll(): Record<string, HostReviewsData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, HostReviewsData>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, HostReviewsData>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  notify();
}

export function loadHostReviews(hostId: string): HostReviewsData {
  const stored = readAll()[hostId];
  if (!stored) return defaultForHost(hostId);
  return {
    ...defaultForHost(hostId),
    ...stored,
    hostId,
    templates: stored.templates?.length ? stored.templates : defaultForHost(hostId).templates,
  };
}

export function saveHostReviews(data: HostReviewsData): void {
  const map = readAll();
  map[data.hostId] = data;
  writeAll(map);
}

export function respondToReview(
  hostId: string,
  reviewId: string,
  response: string
): HostReviewsData | null {
  const data = loadHostReviews(hostId);
  const reviews = data.reviews.map((r) =>
    r.id === reviewId
      ? { ...r, hostResponse: response.trim(), respondedAt: new Date().toISOString() }
      : r
  );
  if (reviews.every((r, i) => r === data.reviews[i])) return null;
  const next = { ...data, reviews };
  saveHostReviews(next);
  return next;
}

export function saveResponseTemplates(
  hostId: string,
  templates: HostReviewsData["templates"]
): HostReviewsData {
  const data = loadHostReviews(hostId);
  const next = { ...data, templates };
  saveHostReviews(next);
  return next;
}

export function newTemplateId(): string {
  return `tpl-${Date.now()}`;
}

const DEFAULT_HOST_IDS = ["seed-host-4", "demo-host", "U-001"];

export function collectHostReviewHostIds(): string[] {
  const ids = new Set(DEFAULT_HOST_IDS);
  Object.keys(readAll()).forEach((id) => ids.add(id));
  return Array.from(ids);
}

export function moderateHostReview(
  hostId: string,
  reviewId: string,
  action: "remove" | "restore" | "flag",
  reason?: string
): HostReviewsData | null {
  const data = loadHostReviews(hostId);
  const reviews = data.reviews.map((r) => {
    if (r.id !== reviewId) return r;
    if (action === "remove") {
      return {
        ...r,
        moderationStatus: "removed" as const,
        removedReason: reason?.trim() || "Removed by admin",
        removedAt: new Date().toISOString(),
      };
    }
    if (action === "restore") {
      return {
        ...r,
        moderationStatus: "visible" as const,
        removedReason: undefined,
        removedAt: undefined,
      };
    }
    return { ...r, moderationStatus: "flagged" as const };
  });
  if (reviews.every((r, i) => r === data.reviews[i])) return null;
  const next = { ...data, reviews };
  saveHostReviews(next);
  return next;
}
