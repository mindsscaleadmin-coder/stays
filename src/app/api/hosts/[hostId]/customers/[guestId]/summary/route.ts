import { NextResponse } from "next/server";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import { getHostGuestBookingSummary } from "@/lib/server/customer-history-repo";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ hostId: string; guestId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { hostId, guestId } = await context.params;
    await requireHostSelfOrAdmin(hostId);

    const url = new URL(request.url);
    const currentBookingId = url.searchParams.get("bookingId") ?? undefined;

    const summary = await getHostGuestBookingSummary(hostId, guestId, currentBookingId);
    return NextResponse.json({ summary }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host guest summary GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
