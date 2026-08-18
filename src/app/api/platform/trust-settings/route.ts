import { NextResponse } from "next/server";
import {
  getTrustAdminSettings,
  saveTrustAdminSettings,
} from "@/lib/server/trust-admin-repo";
import { requireSessionUser, AuthError } from "@/lib/auth/session";
import { getUserRoles } from "@/lib/auth/booking-access";
import { canAccessAdmin } from "@/lib/auth/roles";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";
import type { TrustAdminSettings } from "@/lib/admin/trust-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const adminView = searchParams.get("admin") === "1";

  if (adminView) {
    const requestId = getRequestId(request);
    try {
      const user = await requireSessionUser();
      if (!canAccessAdmin(getUserRoles(user))) {
        throw new BookingAccessError("Admin access required");
      }
      const settings = await getTrustAdminSettings();
      return NextResponse.json({ settings }, { headers: { "x-request-id": requestId } });
    } catch (error) {
      if (error instanceof AuthError || error instanceof BookingAccessError) {
        return hostDataErrorResponse(error, requestId);
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  const settings = await getTrustAdminSettings();
  return NextResponse.json({
    settings: {
      badgeCatalog: settings.badgeCatalog,
      manualHostFlags: [],
    } satisfies Partial<TrustAdminSettings>,
  });
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);

  try {
    const user = await requireSessionUser();
    if (!canAccessAdmin(getUserRoles(user))) {
      throw new BookingAccessError("Admin access required");
    }

    const body = (await request.json()) as Partial<TrustAdminSettings>;
    const current = await getTrustAdminSettings();
    const saved = await saveTrustAdminSettings({ ...current, ...body });

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
