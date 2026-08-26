import { NextResponse } from "next/server";
import {
  getHostAccountsData,
  savePayoutAccount,
} from "@/lib/server/host-accounts-repo";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import type { HostPayoutAccountInput } from "@/lib/host/host-accounts-types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);
    const data = await getHostAccountsData(hostId);
    return NextResponse.json({ data }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host accounts GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);

    const body = (await request.json()) as { payoutAccount?: HostPayoutAccountInput };
    if (!body.payoutAccount?.accountHolder?.trim()) {
      return NextResponse.json({ error: "Account holder required" }, { status: 400 });
    }

    await savePayoutAccount(hostId, body.payoutAccount);
    const data = await getHostAccountsData(hostId);
    return NextResponse.json({ data }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host accounts save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
