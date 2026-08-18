import { NextResponse } from "next/server";
import {
  getHostReviewsFromDb,
  respondToReviewInDb,
  saveResponseTemplatesInDb,
} from "@/lib/server/host-reviews-repo";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const { hostId } = await context.params;
  const data = await getHostReviewsFromDb(hostId);
  return NextResponse.json({ data });
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

    if (body.action === "respond" && typeof body.reviewId === "string") {
      const data = await respondToReviewInDb(
        hostId,
        body.reviewId,
        typeof body.response === "string" ? body.response : ""
      );
      return NextResponse.json({ data }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "saveTemplates" && Array.isArray(body.templates)) {
      const data = await saveResponseTemplatesInDb(hostId, body.templates);
      return NextResponse.json({ data }, { headers: { "x-request-id": requestId } });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
