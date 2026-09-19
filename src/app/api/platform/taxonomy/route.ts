import { NextResponse } from "next/server";
import { getTaxonomyFromDb, saveTaxonomyToDb } from "@/lib/server/platform-catalog-repo";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { requirePlatformStaff } from "@/lib/auth/guards";
import { getRequestId } from "@/lib/observability/logger";
import type { TaxonomyData } from "@/lib/admin/taxonomy-types";

export const dynamic = "force-dynamic";


export async function GET() {
  const data = await getTaxonomyFromDb();
  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requirePlatformStaff("manage_settings");
    const body = (await request.json()) as { data?: TaxonomyData };
    if (!body.data) {
      return NextResponse.json({ error: "Invalid taxonomy payload" }, { status: 400 });
    }
    const data = await saveTaxonomyToDb(body.data);
    return NextResponse.json({ data }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Taxonomy save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
