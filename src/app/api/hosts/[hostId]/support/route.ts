import { NextResponse } from "next/server";
import {
  createSupportTicketInDb,
  listSupportTickets,
} from "@/lib/server/support-tickets-repo";
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
    const tickets = await listSupportTickets(hostId);
    return NextResponse.json({ tickets }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host support GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);
    const body = await request.json();
    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();
    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    const priority =
      body.priority === "low" ||
      body.priority === "high" ||
      body.priority === "critical"
        ? body.priority
        : "normal";

    await createSupportTicketInDb({
      source: "host",
      subject,
      message,
      requesterId: hostId,
      requesterName: String(body.hostName ?? hostId).trim(),
      requesterEmail: body.requesterEmail ? String(body.requesterEmail).trim() : undefined,
      bookingRef: body.bookingRef ? String(body.bookingRef).trim() : undefined,
      property: body.property ? String(body.property).trim() : undefined,
      priority,
    });

    const tickets = await listSupportTickets(hostId);
    return NextResponse.json({ tickets }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host support POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
