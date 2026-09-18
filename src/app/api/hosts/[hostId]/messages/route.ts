import { NextResponse } from "next/server";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import { listHostMessageInbox } from "@/lib/server/host-messages-repo";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "50");

    const result = await listHostMessageInbox(hostId, { page, pageSize });
    return NextResponse.json(result, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host messages GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
