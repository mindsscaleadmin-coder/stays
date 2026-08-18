import { NextResponse } from "next/server";
import {
  getActivePromotedListingIdsFromDb,
  listActivePromotionsFromDb,
} from "@/lib/listings/promotions-repo";
import type { ListingPromotionKind } from "@/lib/host/host-promotions-types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get("kind") || "featured") as ListingPromotionKind;
  if (kind !== "featured" && kind !== "trending") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const listingIds = await getActivePromotedListingIdsFromDb(kind);
  const promotions = await listActivePromotionsFromDb(kind);
  return NextResponse.json({ kind, listingIds, promotions });
}
