import { isDemoApiMode } from "@/lib/auth/booking-access";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TRUST_ADMIN, resolveHostName } from "@/lib/admin/trust-data";
import { getSeedListings } from "@/lib/listings/listing-seeds";
import { defaultForHost as defaultTrustForHost } from "@/lib/host/host-trust-data";
import { defaultForHost as defaultReviewsForHost } from "@/lib/host/host-reviews-data";
import { seedListingsIfEmpty } from "@/lib/server/listings-repo";
import { getTrustAdminSettings, saveTrustAdminSettings } from "@/lib/server/trust-admin-repo";
import { saveHostTrust } from "@/lib/server/host-trust-repo";

let trustDemoSeeded = false;

async function ensureGuestUser(id: string, fullName: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id,
      fullName,
      email: `${id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}@guests.local`,
      roles: JSON.stringify(["guest"]),
      isVerified: true,
    },
  });
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

/** Seed demo reviews, pending certs, and India badge catalog when shared DB is empty. */
export async function seedTrustDemoIfEmpty(): Promise<boolean> {
  if (trustDemoSeeded) return false;
  if (!isDemoApiMode()) return false;

  const reviewCount = await prisma.review.count();
  const trustSettingsRow = await prisma.trustCatalogSettings.findUnique({
    where: { id: "default" },
  });

  if (reviewCount > 0 && trustSettingsRow) {
    trustDemoSeeded = true;
    return false;
  }

  await seedListingsIfEmpty(getSeedListings());

  if (!trustSettingsRow) {
    await saveTrustAdminSettings(DEFAULT_TRUST_ADMIN);
  }

  const listing =
    (await prisma.listing.findFirst({
      where: { status: "approved" },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.listing.findFirst({ orderBy: { createdAt: "asc" } }));

  const hostId = listing?.hostId ?? "seed-host-4";
  await ensureHostUser(hostId);

  if (reviewCount === 0 && listing) {
    const guests = [
      { id: "U-GUEST-TRUST-1", name: "Mehul Joshi" },
      { id: "U-GUEST-TRUST-2", name: "Ananya Reddy" },
      { id: "U-GUEST-TRUST-3", name: "Guest User" },
    ];

    for (const guest of guests) {
      await ensureGuestUser(guest.id, guest.name);
    }

    const demoReviews = [
      {
        id: "demo-review-1",
        authorId: guests[0].id,
        rating: 5,
        comment:
          "Absolutely stunning property! The pool area was perfect and the farm breakfast was incredible.",
        daysAgo: 14,
      },
      {
        id: "demo-review-2",
        authorId: guests[1].id,
        rating: 4,
        comment: "Lovely stay. Kids loved the animal feeding. WiFi was slow in the cottage.",
        daysAgo: 28,
      },
      {
        id: "demo-review-3",
        authorId: guests[2].id,
        rating: 1,
        comment: "Misleading photos. Property did not match listing description.",
        daysAgo: 21,
        status: "published" as const,
      },
    ];

    for (const review of demoReviews) {
      const createdAt = new Date(Date.now() - review.daysAgo * 24 * 60 * 60 * 1000);
      await prisma.review.upsert({
        where: { id: review.id },
        create: {
          id: review.id,
          listingId: listing.id,
          authorId: review.authorId,
          rating: review.rating,
          comment: review.comment,
          status: review.status ?? "published",
          createdAt,
        },
        update: {},
      });
    }

    await prisma.hostReviewsMeta.upsert({
      where: { hostId },
      create: {
        hostId,
        payload: JSON.stringify({
          templates: defaultReviewsForHost(hostId).templates,
          overlays: {
            "demo-review-3": { moderationStatus: "flagged" },
          },
        }),
      },
      update: {
        payload: JSON.stringify({
          templates: defaultReviewsForHost(hostId).templates,
          overlays: {
            "demo-review-3": { moderationStatus: "flagged" },
          },
        }),
      },
    });
  }

  const hostTrustRow = await prisma.hostTrust.findUnique({ where: { hostId } });
  if (!hostTrustRow) {
    const catalog = await getTrustAdminSettings();
    const base = defaultTrustForHost(hostId);
    const certifications = base.certifications.map((cert) => {
      if (cert.id === "cert-eco") {
        return {
          ...cert,
          status: "pending" as const,
          submittedAt: new Date().toISOString(),
          documentName: "eco-tourism-registration.pdf",
        };
      }
      if (cert.id === "cert-organic") {
        return { ...cert, status: "verified" as const, verifiedAt: "2025-11-10" };
      }
      return cert;
    });

    await saveHostTrust({
      ...base,
      hostId,
      certifications: certifications.filter((cert) =>
        catalog.badgeCatalog.some((badge) => badge.id === cert.id)
      ),
    });
  }

  trustDemoSeeded = true;
  return true;
}
