import { NextResponse } from "next/server";
import {
  getHostTrust,
  toggleSafetyItem,
  submitCertificationForReview,
} from "@/lib/server/host-trust-repo";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);
    const trust = await getHostTrust(hostId);
    return NextResponse.json({ trust }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host trust GET error:", error);
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

    const body = await request.json();

    if (body.action === "toggleSafety" && typeof body.itemId === "string") {
      const trust = await toggleSafetyItem(hostId, body.itemId);
      return NextResponse.json({ trust }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "apply" && typeof body.certId === "string") {
      const trust = await submitCertificationForReview(
        hostId,
        body.certId,
        typeof body.documentName === "string" ? body.documentName : ""
      );
      return NextResponse.json({ trust }, { headers: { "x-request-id": requestId } });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host trust update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
