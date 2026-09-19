import { NextResponse } from "next/server";
import { listPendingCertifications, reviewFarmCertification } from "@/lib/server/host-trust-repo";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { requirePlatformStaff } from "@/lib/auth/guards";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requirePlatformStaff("manage_trust");
    const pending = await listPendingCertifications();
    return NextResponse.json({ pending }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    await requirePlatformStaff("manage_trust");

    const body = await request.json();
    const hostId = String(body.hostId || "");
    const certId = String(body.certId || "");
    const status = body.status as "verified" | "rejected" | "none";
    const note = typeof body.note === "string" ? body.note : undefined;

    if (!hostId || !certId || !["verified", "rejected", "none"].includes(status)) {
      return NextResponse.json({ error: "Invalid review payload" }, { status: 400 });
    }

    const trust = await reviewFarmCertification(hostId, certId, status, note);
    return NextResponse.json(
      { trust },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
