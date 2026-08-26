import { NextResponse } from "next/server";
import {
  getPromotionCatalogSettings,
  savePromotionCatalogSettings,
} from "@/lib/server/promotion-catalog-repo";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { requireAdmin } from "@/lib/auth/guards";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";
import type { HostPromotionsSettings } from "@/lib/host/host-promotions-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getPromotionCatalogSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);

  try {
    await requireAdmin();

    const body = (await request.json()) as Partial<HostPromotionsSettings>;
    const current = await getPromotionCatalogSettings();
    const saved = await savePromotionCatalogSettings({ ...current, ...body });

    return NextResponse.json(
      { settings: saved },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
