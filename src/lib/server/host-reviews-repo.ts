import { prisma } from "@/lib/prisma";
import { defaultForHost } from "@/lib/host/host-reviews-data";
import type {
  HostGuestReview,
  HostResponseTemplate,
  HostReviewsData,
  ReviewModerationStatus,
} from "@/lib/host/host-reviews-types";
import type { FlatHostReview } from "@/lib/admin/trust-data";
import { resolveHostName } from "@/lib/admin/trust-data";
import { seedTrustDemoIfEmpty } from "@/lib/server/trust-demo-seed";

type ReviewOverlay = {
  moderationStatus?: ReviewModerationStatus;
  removedReason?: string;
  removedAt?: string;
  hostResponse?: string;
  respondedAt?: string;
  categories?: HostGuestReview["categories"];
};

type MetaPayload = {
  templates: HostResponseTemplate[];
  overlays: Record<string, ReviewOverlay>;
};

function emptyMeta(): MetaPayload {
  return { templates: defaultForHost("").templates, overlays: {} };
}

async function ensureHostUser(hostId: string) {
  const existing = await prisma.user.findUnique({ where: { id: hostId } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id: hostId,
      fullName: resolveHostName(hostId),
      email: `${hostId.replace(/[^a-zA-Z0-9]/g, "")}@hosts.local`,
      roles: JSON.stringify(["host"]),
      isVerified: true,
    },
  });
}

async function loadMeta(hostId: string): Promise<MetaPayload> {
  const row = await prisma.hostReviewsMeta.findUnique({ where: { hostId } });
  if (!row) return emptyMeta();
  const parsed = JSON.parse(row.payload) as Partial<MetaPayload>;
  return {
    templates: parsed.templates?.length ? parsed.templates : emptyMeta().templates,
    overlays: parsed.overlays ?? {},
  };
}

async function saveMeta(hostId: string, meta: MetaPayload) {
  await ensureHostUser(hostId);
  await prisma.hostReviewsMeta.upsert({
    where: { hostId },
    create: { hostId, payload: JSON.stringify(meta) },
    update: { payload: JSON.stringify(meta) },
  });
}

function mapReviewRow(
  row: {
    id: string;
    rating: number;
    comment: string;
    createdAt: Date;
    status: string;
    listing: { title: string; hostId: string };
    author: { fullName: string } | null;
  },
  overlay: ReviewOverlay | undefined
): HostGuestReview {
  const moderationStatus: ReviewModerationStatus =
    overlay?.moderationStatus ?? (row.status === "removed" ? "removed" : "visible");

  return {
    id: row.id,
    guestName: row.author?.fullName || "Guest",
    property: row.listing.title,
    rating: row.rating,
    date: row.createdAt.toISOString().slice(0, 10),
    text: row.comment,
    categories: overlay?.categories ?? [],
    hostResponse: overlay?.hostResponse,
    respondedAt: overlay?.respondedAt,
    moderationStatus,
    removedReason: overlay?.removedReason,
    removedAt: overlay?.removedAt,
  };
}

function computeAggregates(reviews: HostGuestReview[]) {
  const visible = reviews.filter((r) => r.moderationStatus !== "removed");
  const reviewCount = visible.length;
  const overallRating =
    reviewCount > 0
      ? Math.round(
          (visible.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10
        ) / 10
      : 0;

  const defaults = defaultForHost("");
  const categoryBreakdown = defaults.categoryBreakdown.map((cat) => {
    const scores = visible
      .flatMap((r) => r.categories.filter((c) => c.id === cat.id).map((c) => c.score))
      .filter(Boolean);
    if (!scores.length) return { ...cat, score: 0 };
    return {
      ...cat,
      score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    };
  });

  return { overallRating, reviewCount, categoryBreakdown };
}

export async function getHostReviewsFromDb(hostId: string): Promise<HostReviewsData> {
  await ensureHostUser(hostId);
  const meta = await loadMeta(hostId);

  const rows = await prisma.review.findMany({
    where: { listing: { hostId } },
    include: {
      listing: { select: { title: true, hostId: true } },
      author: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const reviews = rows.map((row) => mapReviewRow(row, meta.overlays[row.id]));
  const aggregates = computeAggregates(reviews);

  return {
    hostId,
    ...aggregates,
    reviews,
    templates: meta.templates,
  };
}

export async function respondToReviewInDb(
  hostId: string,
  reviewId: string,
  response: string
): Promise<HostReviewsData> {
  const meta = await loadMeta(hostId);
  meta.overlays[reviewId] = {
    ...meta.overlays[reviewId],
    hostResponse: response.trim(),
    respondedAt: new Date().toISOString(),
  };
  await saveMeta(hostId, meta);
  return getHostReviewsFromDb(hostId);
}

export async function saveResponseTemplatesInDb(
  hostId: string,
  templates: HostResponseTemplate[]
): Promise<HostReviewsData> {
  const meta = await loadMeta(hostId);
  meta.templates = templates;
  await saveMeta(hostId, meta);
  return getHostReviewsFromDb(hostId);
}

export async function moderateHostReviewInDb(
  hostId: string,
  reviewId: string,
  action: "remove" | "restore" | "flag",
  reason?: string
): Promise<HostReviewsData> {
  const meta = await loadMeta(hostId);
  const existing = meta.overlays[reviewId] ?? {};

  if (action === "remove") {
    meta.overlays[reviewId] = {
      ...existing,
      moderationStatus: "removed",
      removedReason: reason?.trim() || "Removed by admin",
      removedAt: new Date().toISOString(),
    };
    await prisma.review.updateMany({
      where: { id: reviewId },
      data: { status: "removed" },
    });
  } else if (action === "restore") {
    meta.overlays[reviewId] = {
      ...existing,
      moderationStatus: "visible",
      removedReason: undefined,
      removedAt: undefined,
    };
    await prisma.review.updateMany({
      where: { id: reviewId },
      data: { status: "published" },
    });
  } else {
    meta.overlays[reviewId] = {
      ...existing,
      moderationStatus: "flagged",
    };
  }

  await saveMeta(hostId, meta);
  return getHostReviewsFromDb(hostId);
}

export async function listAllReviewsFlatFromDb(): Promise<FlatHostReview[]> {
  await seedTrustDemoIfEmpty();

  const rows = await prisma.review.findMany({
    include: {
      listing: { select: { title: true, hostId: true } },
      author: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const metaByHost = new Map<string, MetaPayload>();
  const flat: FlatHostReview[] = [];

  for (const row of rows) {
    const hostId = row.listing.hostId;
    if (!metaByHost.has(hostId)) {
      metaByHost.set(hostId, await loadMeta(hostId));
    }
    const meta = metaByHost.get(hostId)!;
    const mapped = mapReviewRow(row, meta.overlays[row.id]);
    flat.push({
      ...mapped,
      hostId,
      hostName: resolveHostName(hostId),
    });
  }

  return flat;
}

export async function collectHostReviewHostIdsFromDb(): Promise<string[]> {
  const listings = await prisma.listing.findMany({
    select: { hostId: true },
    distinct: ["hostId"],
  });
  const meta = await prisma.hostReviewsMeta.findMany({ select: { hostId: true } });
  const ids = new Set<string>();
  for (const l of listings) ids.add(l.hostId);
  for (const m of meta) ids.add(m.hostId);
  return Array.from(ids);
}
