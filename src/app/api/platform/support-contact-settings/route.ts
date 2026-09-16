import { NextResponse } from "next/server";
import type { SupportContactSettings } from "@/lib/admin/support-contact-settings-types";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { requireAdmin } from "@/lib/auth/guards";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";
import {
  getSupportContactSettingsFromDb,
  saveSupportContactSettingsToDb,
} from "@/lib/server/support-contact-repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSupportContactSettingsFromDb();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);

  try {
    await requireAdmin();

    const body = (await request.json()) as Partial<SupportContactSettings>;
    const current = await getSupportContactSettingsFromDb();
    const saved = await saveSupportContactSettingsToDb({ ...current, ...body });

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
