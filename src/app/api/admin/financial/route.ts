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
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { requirePlatformStaff } from "@/lib/auth/guards";
import { getRequestId } from "@/lib/observability/logger";
import type { FinancialSettings, RefundRequest } from "@/lib/admin/financial-types";
import { getPlatformLedger } from "@/lib/server/host-accounts-repo";
import { refundBooking, rejectPendingRefund } from "@/lib/booking/booking-ops";

export const dynamic = "force-dynamic";


export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requirePlatformStaff("manage_financial");
    const [settings, ledger] = await Promise.all([
      loadFinancialSettingsFromDb(),
      getPlatformLedger(),
    ]);
    return NextResponse.json(
      { settings, ledger },
      { headers: { "x-request-id": requestId } }
    );
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
    await requirePlatformStaff("manage_financial");
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
      const refundId = String(body.id);
      if (
        refundId.startsWith("refund-") &&
        (body.status === "approved" || body.status === "rejected")
      ) {
        const bookingId = refundId.slice("refund-".length);
        if (body.status === "approved") {
          await refundBooking({
            bookingId,
            actor: "admin",
            reason: typeof body.reviewNote === "string" ? body.reviewNote : "Admin approved refund",
          });
        } else if (body.status === "rejected") {
          await rejectPendingRefund({
            bookingId,
            actor: "Admin",
            reason: typeof body.reviewNote === "string" ? body.reviewNote : undefined,
          });
        }
      }
      const settings = await reviewRefundRequestInDb(refundId, {
        status: body.status as RefundRequest["status"],
        reviewNote: body.reviewNote,
      });
      const ledger = await getPlatformLedger();
      return NextResponse.json(
        { settings, ledger },
        { headers: { "x-request-id": requestId } }
      );
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
