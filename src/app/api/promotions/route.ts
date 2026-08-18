import { NextResponse } from "next/server";
import { z } from "zod";
import {
  upsertPromotionToDb,
  setListingFeaturedInDb,
  listPromotionsForListing,
  listPromotionsForHost,
  purchasePromotionInDb,
} from "@/lib/listings/promotions-repo";
import type { ListingPromotion } from "@/lib/host/host-promotions-types";
import { requireHostSelfOrAdmin, assertListingHostOrAdmin, hostDataErrorResponse } from "@/lib/auth/listing-access";
import { AuthError, requireSessionUser } from "@/lib/auth/session";
import { BookingAccessError, getUserRoles } from "@/lib/auth/booking-access";
import { canAccessAdmin } from "@/lib/auth/roles";
import { getRequestId } from "@/lib/observability/logger";

const purchaseSchema = z.object({
  id: z.string().optional(),
  listingId: z.string(),
  hostId: z.string(),
  kind: z.enum(["featured", "trending"]),
  durationDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  priceAed: z.number().optional(),
  purchasedAt: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  status: z.enum(["active", "expired"]).optional(),
  paymentRef: z.string().optional(),
  listingTitle: z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  const hostId = searchParams.get("hostId");

  try {
    if (listingId) {
      const promotions = await listPromotionsForListing(listingId);
      return NextResponse.json({ promotions });
    }

    if (hostId) {
      await requireHostSelfOrAdmin(hostId);
      const promotions = await listPromotionsForHost(hostId);
      return NextResponse.json({ promotions });
    }

    return NextResponse.json(
      { error: "listingId or hostId query param required" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const json = await request.json();

    if (json.action === "setFeatured") {
      const user = await requireSessionUser();
      const roles = getUserRoles(user);
      if (!canAccessAdmin(roles)) {
        throw new BookingAccessError("Admin access required");
      }
      const result = await setListingFeaturedInDb({
        listingId: String(json.listingId),
        hostId: String(json.hostId || user.id),
        featured: Boolean(json.featured),
        title: typeof json.title === "string" ? json.title : undefined,
      });
      return NextResponse.json(result);
    }

    if (json.action === "purchase") {
      const user = await requireSessionUser();
      const listingId = String(json.listingId || "");
      const hostId = String(json.hostId || user.id);
      await assertListingHostOrAdmin(listingId, user.id);

      const saved = await purchasePromotionInDb({
        listingId,
        hostId,
        kind: json.kind,
        durationDays: json.durationDays,
        listingTitle: typeof json.listingTitle === "string" ? json.listingTitle : undefined,
      });
      if (!saved) {
        return NextResponse.json({ error: "Invalid promotion package" }, { status: 400 });
      }
      return NextResponse.json({ promotion: saved });
    }

    const parsed = purchaseSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid promotion" }, { status: 400 });
    }

    const user = await requireSessionUser();
    await assertListingHostOrAdmin(parsed.data.listingId, user.id);

    const now = new Date().toISOString();
    const promo: ListingPromotion = {
      id: parsed.data.id || `promo-${Date.now()}`,
      listingId: parsed.data.listingId,
      hostId: parsed.data.hostId,
      kind: parsed.data.kind,
      durationDays: parsed.data.durationDays,
      priceAed: parsed.data.priceAed ?? 0,
      currency: "AED",
      purchasedAt: parsed.data.purchasedAt ?? now,
      startsAt: parsed.data.startsAt ?? now,
      endsAt: parsed.data.endsAt ?? now,
      status: parsed.data.status ?? "active",
      paymentRef: parsed.data.paymentRef ?? `PAY-${Date.now()}`,
    };
    const saved = await upsertPromotionToDb(promo, parsed.data.listingTitle);
    return NextResponse.json({ promotion: saved });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Promotion save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save promotion" },
      { status: 500 }
    );
  }
}
