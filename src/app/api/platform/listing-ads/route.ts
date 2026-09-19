import { NextResponse } from "next/server";
import {
  getListingAdsFromDb,
  saveListingAdsToDb,
} from "@/lib/server/platform-catalog-repo";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { requirePlatformStaff } from "@/lib/auth/guards";
import { getRequestId } from "@/lib/observability/logger";
import { normalizeListingAds } from "@/lib/admin/listing-ads-data";
import type { ListingAdsSettings } from "@/lib/admin/listing-ads-types";

export const dynamic = "force-dynamic";


export async function GET() {
  const settings = await getListingAdsFromDb();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requirePlatformStaff("manage_settings");
    const body = (await request.json()) as Partial<ListingAdsSettings>;
    const settings = await saveListingAdsToDb(normalizeListingAds(body));
    return NextResponse.json({ settings }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
