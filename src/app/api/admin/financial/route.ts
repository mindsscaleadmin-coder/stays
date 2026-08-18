import { NextResponse } from "next/server";
import {
  loadFinancialSettingsFromDb,
  removeHostCommissionOverrideInDb,
  reviewRefundRequestInDb,
  saveFullFinancialSettings,
  updateCommissionSettingsInDb,
  updatePayoutStateInDb,
  upsertHostCommissionOverrideInDb,
} from "@/lib/server/financial-settings-repo";
import { requireSessionUser, AuthError } from "@/lib/auth/session";
import { getUserRoles, isDemoApiMode, BookingAccessError } from "@/lib/auth/booking-access";
import { canAccessAdmin } from "@/lib/auth/roles";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";
import type { FinancialSettings, RefundRequest } from "@/lib/admin/financial-types";

export const dynamic = "force-dynamic";

async function requireAdminWhenConfigured() {
  if (isDemoApiMode()) return;
  const user = await requireSessionUser();
  if (!canAccessAdmin(getUserRoles(user))) {
    throw new BookingAccessError("Admin access required");
  }
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdminWhenConfigured();
    const settings = await loadFinancialSettingsFromDb();
    return NextResponse.json({ settings }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Admin financial GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdminWhenConfigured();
    const body = await request.json();

    if (body.action === "saveSettings" && body.settings) {
      const settings = await saveFullFinancialSettings(body.settings as FinancialSettings);
      return NextResponse.json({ settings }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "updateGlobalCommission" && body.globalFeePct !== undefined) {
      const settings = await updateCommissionSettingsInDb({
        globalFeePct: Number(body.globalFeePct),
        ...(body.globalServiceFeeFlat !== undefined
          ? { globalServiceFeeFlat: Number(body.globalServiceFeeFlat) }
          : {}),
      });
      return NextResponse.json({ settings }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "setHostOverride" && body.override) {
      const settings = await upsertHostCommissionOverrideInDb(body.override);
      return NextResponse.json({ settings }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "removeHostOverride" && body.hostId) {
      const settings = await removeHostCommissionOverrideInDb(String(body.hostId));
      return NextResponse.json({ settings }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "updatePayout" && body.payoutId && body.adminStatus) {
      const settings = await updatePayoutStateInDb(String(body.payoutId), {
        adminStatus: body.adminStatus,
        holdReason: body.holdReason,
      });
      return NextResponse.json({ settings }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "reviewRefund" && body.id && body.status) {
      const settings = await reviewRefundRequestInDb(String(body.id), {
        status: body.status as RefundRequest["status"],
        reviewNote: body.reviewNote,
      });
      return NextResponse.json({ settings }, { headers: { "x-request-id": requestId } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Admin financial PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
