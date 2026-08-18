import { NextResponse } from "next/server";
import {
  createSupportTicketInDb,
  listGuestSupportTickets,
} from "@/lib/server/support-tickets-repo";
import {
  hostDataErrorResponse,
  requireGuestSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError, isDemoApiMode } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

function toGuestFacing(tickets: Awaited<ReturnType<typeof listGuestSupportTickets>>) {
  return tickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    message: t.message,
    status:
      t.status === "escalated"
        ? "in_progress"
        : t.status === "closed"
          ? "resolved"
          : t.status === "open" || t.status === "in_progress" || t.status === "resolved"
            ? t.status
            : "open",
    createdAt: t.createdAt,
    bookingRef: t.bookingRef,
    property: t.property,
  }));
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ guestId: string }> }
) {
  const requestId = getRequestId(_request);
  try {
    const { guestId } = await context.params;
    if (!isDemoApiMode()) {
      await requireGuestSelfOrAdmin(guestId);
    }
    const tickets = toGuestFacing(await listGuestSupportTickets(guestId));
    return NextResponse.json({ tickets }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Guest support GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ guestId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { guestId } = await context.params;
    if (!isDemoApiMode()) {
      await requireGuestSelfOrAdmin(guestId);
    }
    const body = await request.json();
    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();
    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    const bookingRef =
      typeof body.bookingRef === "string" && body.bookingRef.trim()
        ? body.bookingRef.trim()
        : undefined;

    await createSupportTicketInDb({
      source: "guest",
      subject,
      message,
      requesterId: guestId,
      requesterName: String(body.guestName ?? guestId).trim(),
      requesterEmail:
        typeof body.guestEmail === "string" ? body.guestEmail.trim() : undefined,
      bookingRef,
      property:
        typeof body.property === "string" && body.property.trim()
          ? body.property.trim()
          : undefined,
      priority: bookingRef ? "high" : "normal",
    });

    const tickets = toGuestFacing(await listGuestSupportTickets(guestId));
    return NextResponse.json({ tickets }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Guest support POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
