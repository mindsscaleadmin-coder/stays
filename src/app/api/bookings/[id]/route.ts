import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertBookingParticipant,
  isDemoApiMode,
} from "@/lib/auth/booking-access";
import { getSessionUser } from "@/lib/auth/session";
import { resolveSessionActor } from "@/lib/auth/resolve-actor";
import { AuthError } from "@/lib/auth/session";
import { bookingAccessResponse } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import { expirePendingBookings } from "@/lib/booking/lifecycle";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { id } = await context.params;
    await expirePendingBookings();
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        listing: { select: { hostId: true, title: true } },
        guest: true,
      },
    });
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!isDemoApiMode()) {
      const user = await getSessionUser();
      if (!user) throw new AuthError("Sign in required");
      assertBookingParticipant(booking, await resolveSessionActor(user));
    }

    return NextResponse.json(
      { booking },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return bookingAccessResponse(error, requestId);
    }
    throw error;
  }
}
