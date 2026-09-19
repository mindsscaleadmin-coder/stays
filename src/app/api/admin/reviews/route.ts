import { NextResponse } from "next/server";
import {
  listAllReviewsFlatFromDb,
  moderateHostReviewInDb,
} from "@/lib/server/host-reviews-repo";
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
    const reviews = await listAllReviewsFlatFromDb();
    return NextResponse.json({ reviews }, { headers: { "x-request-id": requestId } });
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
    const reviewId = String(body.reviewId || "");
    const action = body.action as "remove" | "restore" | "flag";
    const reason = typeof body.reason === "string" ? body.reason : undefined;

    if (!hostId || !reviewId || !["remove", "restore", "flag"].includes(action)) {
      return NextResponse.json({ error: "Invalid moderation payload" }, { status: 400 });
    }

    const data = await moderateHostReviewInDb(hostId, reviewId, action, reason);
    return NextResponse.json(
      { data },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
