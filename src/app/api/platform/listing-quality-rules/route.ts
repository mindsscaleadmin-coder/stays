import { NextResponse } from "next/server";
import {
  getListingQualityRulesFromDb,
  saveListingQualityRulesToDb,
} from "@/lib/server/platform-catalog-repo";
import { requireAdmin } from "@/lib/auth/guards";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";
import { normalizeListingQualityRules } from "@/lib/admin/listing-quality-rules-data";
import type { ListingQualityRules } from "@/lib/admin/listing-quality-rules-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const rules = await getListingQualityRulesFromDb();
  return NextResponse.json({ rules });
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    const body = (await request.json()) as Partial<ListingQualityRules>;
    const rules = await saveListingQualityRulesToDb(normalizeListingQualityRules(body));
    return NextResponse.json({ rules }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
