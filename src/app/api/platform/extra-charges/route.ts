import { NextResponse } from "next/server";
import {
  getExtraChargesCatalogFromDb,
  saveExtraChargesCatalogToDb,
} from "@/lib/server/platform-catalog-repo";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { requirePlatformStaff } from "@/lib/auth/guards";
import { getRequestId } from "@/lib/observability/logger";
import type { ExtraChargeCatalogItem } from "@/lib/admin/extra-charges-catalog-types";

export const dynamic = "force-dynamic";


export async function GET() {
  const items = await getExtraChargesCatalogFromDb();
  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requirePlatformStaff("manage_settings");
    const body = (await request.json()) as { items?: ExtraChargeCatalogItem[] };
    if (!Array.isArray(body.items)) {
      return NextResponse.json({ error: "Invalid catalog payload" }, { status: 400 });
    }
    const items = await saveExtraChargesCatalogToDb(body.items);
    return NextResponse.json({ items }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Extra charges catalog save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
