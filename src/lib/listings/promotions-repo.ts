import { prisma } from "@/lib/prisma";
import type {
  ListingPromotion,
  ListingPromotionDurationDays,
  ListingPromotionKind,
} from "@/lib/host/host-promotions-types";
import { getEnabledPromotionPackageFromDb } from "@/lib/server/promotion-catalog-repo";

function toDto(row: {
  id: string;
  listingId: string;
  hostId: string;
  kind: string;
  durationDays: number;
  priceAed: number;
  purchasedAt: Date;
  startsAt: Date;
  endsAt: Date;
  status: string;
  paymentRef: string;
}): ListingPromotion {
  const now = Date.now();
  const ends = row.endsAt.getTime();
  const status =
    row.status === "expired" || ends <= now ? "expired" : "active";
  return {
    id: row.id,
    listingId: row.listingId,
    hostId: row.hostId,
    kind: row.kind as ListingPromotionKind,
    durationDays: row.durationDays as ListingPromotion["durationDays"],
    priceAed: row.priceAed,
    currency: "AED",
    purchasedAt: row.purchasedAt.toISOString(),
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status,
    paymentRef: row.paymentRef,
  };
}

async function ensureListingShell(input: {
  listingId: string;
  hostId: string;
  title?: string;
}) {
  const existing = await prisma.listing.findUnique({ where: { id: input.listingId } });
  if (existing) return existing;

  const host = await prisma.user.findUnique({ where: { id: input.hostId } });
  if (!host) {
    await prisma.user.create({
      data: {
        id: input.hostId,
        fullName: "Host",
        email: `${input.hostId.replace(/[^a-zA-Z0-9]/g, "")}@hosts.local`,
        roles: JSON.stringify(["host"]),
        isVerified: true,
      },
    });
  }

  return prisma.listing.create({
    data: {
      id: input.listingId,
      hostId: input.hostId,
      title: input.title || `Listing ${input.listingId}`,
      status: "approved",
      payload: JSON.stringify({
        id: input.listingId,
        title: input.title || `Listing ${input.listingId}`,
        hostId: input.hostId,
        status: "approved",
      }),
      featured: false,
    },
  });
}

async function refreshListingFeaturedFlag(listingId: string) {
  const now = new Date();
  const active = await prisma.listingPromotion.findFirst({
    where: {
      listingId,
      kind: "featured",
      status: "active",
      endsAt: { gt: now },
    },
  });
  await prisma.listing.update({
    where: { id: listingId },
    data: { featured: Boolean(active) },
  });
}

/** Expire due promotions and refresh featured flags. */
export async function expireDuePromotions(now = new Date()) {
  const due = await prisma.listingPromotion.findMany({
    where: { status: "active", endsAt: { lte: now } },
  });
  for (const row of due) {
    await prisma.listingPromotion.update({
      where: { id: row.id },
      data: { status: "expired" },
    });
    await refreshListingFeaturedFlag(row.listingId);
  }
  return due.length;
}

export async function getActivePromotedListingIdsFromDb(
  kind: ListingPromotionKind,
  now = new Date()
): Promise<string[]> {
  await expireDuePromotions(now);
  const rows = await prisma.listingPromotion.findMany({
    where: {
      kind,
      status: "active",
      endsAt: { gt: now },
    },
    orderBy: { purchasedAt: "desc" },
  });
  const ids: string[] = [];
  for (const r of rows) {
    if (!ids.includes(r.listingId)) ids.push(r.listingId);
  }
  return ids;
}

export async function listActivePromotionsFromDb(
  kind?: ListingPromotionKind,
  now = new Date()
): Promise<ListingPromotion[]> {
  await expireDuePromotions(now);
  const rows = await prisma.listingPromotion.findMany({
    where: {
      status: "active",
      endsAt: { gt: now },
      ...(kind ? { kind } : {}),
    },
    orderBy: { purchasedAt: "desc" },
  });
  return rows.map(toDto);
}

export async function listPromotionsForListing(
  listingId: string,
  now = new Date()
): Promise<ListingPromotion[]> {
  await expireDuePromotions(now);
  const rows = await prisma.listingPromotion.findMany({
    where: { listingId },
    orderBy: { purchasedAt: "desc" },
  });
  return rows.map((r) => toDto(r));
}

export async function listPromotionsForHost(
  hostId: string,
  now = new Date()
): Promise<ListingPromotion[]> {
  await expireDuePromotions(now);
  const rows = await prisma.listingPromotion.findMany({
    where: { hostId },
    orderBy: { purchasedAt: "desc" },
  });
  return rows.map((r) => toDto(r));
}

export async function purchasePromotionInDb(input: {
  listingId: string;
  hostId: string;
  kind: ListingPromotionKind;
  durationDays: ListingPromotionDurationDays;
  listingTitle?: string;
}): Promise<ListingPromotion | null> {
  const pkg = await getEnabledPromotionPackageFromDb(input.kind, input.durationDays);
  if (!pkg) return null;

  const now = new Date();
  const active = await prisma.listingPromotion.findFirst({
    where: {
      listingId: input.listingId,
      kind: input.kind,
      status: "active",
      endsAt: { gt: now },
    },
    orderBy: { endsAt: "desc" },
  });

  const start = active ? new Date(active.endsAt) : now;
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
    currency: "AED",
    purchasedAt: now.toISOString(),
    startsAt: (active ? now : start).toISOString(),
    endsAt: ends.toISOString(),
    status: "active",
    paymentRef: `PAY-${Date.now().toString(36).toUpperCase()}`,
  };

  return upsertPromotionToDb(promo, input.listingTitle);
}

export async function upsertPromotionToDb(
  promo: ListingPromotion,
  listingTitle?: string
): Promise<ListingPromotion> {
  await ensureListingShell({
    listingId: promo.listingId,
    hostId: promo.hostId,
    title: listingTitle,
  });

  // Expire other active same-kind promos for this listing
  await prisma.listingPromotion.updateMany({
    where: {
      listingId: promo.listingId,
      kind: promo.kind,
      status: "active",
      id: { not: promo.id },
    },
    data: { status: "expired", endsAt: new Date() },
  });

  await prisma.listingPromotion.upsert({
    where: { id: promo.id },
    create: {
      id: promo.id,
      listingId: promo.listingId,
      hostId: promo.hostId,
      kind: promo.kind,
      durationDays: promo.durationDays,
      priceAed: promo.priceAed,
      purchasedAt: new Date(promo.purchasedAt),
      startsAt: new Date(promo.startsAt),
      endsAt: new Date(promo.endsAt),
      status: promo.status,
      paymentRef: promo.paymentRef,
    },
    update: {
      endsAt: new Date(promo.endsAt),
      status: promo.status,
      priceAed: promo.priceAed,
      durationDays: promo.durationDays,
      paymentRef: promo.paymentRef,
    },
  });

  if (promo.kind === "featured") {
    await refreshListingFeaturedFlag(promo.listingId);
  }

  return promo;
}

/** Admin quick feature: create/extend a 7-day featured promo or clear featured. */
export async function setListingFeaturedInDb(input: {
  listingId: string;
  hostId: string;
  featured: boolean;
  title?: string;
}): Promise<{ featured: boolean }> {
  await ensureListingShell({
    listingId: input.listingId,
    hostId: input.hostId,
    title: input.title,
  });

  const now = new Date();
  if (!input.featured) {
    await prisma.listingPromotion.updateMany({
      where: { listingId: input.listingId, kind: "featured", status: "active" },
      data: { status: "expired", endsAt: now },
    });
    await prisma.listing.update({
      where: { id: input.listingId },
      data: { featured: false },
    });
    return { featured: false };
  }

  const ends = new Date(now);
  ends.setDate(ends.getDate() + 7);
  const promo: ListingPromotion = {
    id: `promo-admin-${input.listingId}-${Date.now()}`,
    listingId: input.listingId,
    hostId: input.hostId,
    kind: "featured",
    durationDays: 7,
    priceAed: 0,
    currency: "AED",
    purchasedAt: now.toISOString(),
    startsAt: now.toISOString(),
    endsAt: ends.toISOString(),
    status: "active",
    paymentRef: `ADMIN-FEATURE`,
  };
  await upsertPromotionToDb(promo, input.title);
  return { featured: true };
}
