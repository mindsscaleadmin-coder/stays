import { NextResponse } from "next/server";
import type { SeoSettings } from "@/lib/admin/seo-settings-types";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { requirePlatformStaff } from "@/lib/auth/guards";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";
import {
  getSeoSettingsFromDb,
  saveSeoSettingsToDb,
} from "@/lib/server/seo-settings-repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSeoSettingsFromDb();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);

  try {
    await requirePlatformStaff("manage_settings");

    const body = (await request.json()) as Partial<SeoSettings>;
    const current = await getSeoSettingsFromDb();
    const saved = await saveSeoSettingsToDb({ ...current, ...body });

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
