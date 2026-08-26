import { NextResponse } from "next/server";
import { expirePendingBookings } from "@/lib/booking/lifecycle";
import { assertCronAuthorized } from "@/lib/auth/booking-access";
import { AuthError } from "@/lib/auth/session";
import { bookingAccessResponse } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";

/** Cron / manual: expire pending requests past host response deadline. */
async function handleExpire(request: Request) {
  const requestId = getRequestId(request);
  try {
    assertCronAuthorized(request);
    const result = await expirePendingBookings(new Date(), { force: true });
    return NextResponse.json(result, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError) {
      return bookingAccessResponse(error, requestId);
    }
    console.error("Expire pending error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleExpire(request);
}

export async function GET(request: Request) {
  return handleExpire(request);
}
