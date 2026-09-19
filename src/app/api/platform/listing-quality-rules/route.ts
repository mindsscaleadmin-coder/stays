import { NextResponse } from "next/server";
import {
  getListingQualityRulesStoreFromDb,
  saveListingQualityRulesStoreToDb,
} from "@/lib/server/platform-catalog-repo";
import { requirePlatformStaff } from "@/lib/auth/guards";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";
import { normalizeListingQualityRulesStore } from "@/lib/admin/listing-quality-rules-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await getListingQualityRulesStoreFromDb();
  return NextResponse.json({ store, rules: store.fallback });
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requirePlatformStaff("manage_settings");
    const body = await request.json();
    const store = await saveListingQualityRulesStoreToDb(
      normalizeListingQualityRulesStore(body)
    );
    return NextResponse.json(
      { store, rules: store.fallback },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
