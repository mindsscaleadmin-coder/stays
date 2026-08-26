import { NextResponse } from "next/server";
import { syncListingIcalFeeds } from "@/lib/server/listing-availability-repo";
import {
  hostDataErrorResponse,
  requireListingHostOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { id } = await context.params;
    await requireListingHostOrAdmin(id);
    const settings = await syncListingIcalFeeds(id);
    return NextResponse.json({ settings }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
