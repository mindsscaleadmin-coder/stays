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
  _request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const { hostId } = await context.params;
  const tickets = await listSupportTickets(hostId);
  return NextResponse.json({ tickets });
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

    await createSupportTicketInDb({
      source: "host",
      subject,
      message,
      requesterId: hostId,
      requesterName: String(body.hostName ?? hostId).trim(),
      priority: "normal",
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
