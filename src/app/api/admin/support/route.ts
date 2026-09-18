import { NextResponse } from "next/server";
import {
  addCommunicationLogInDb,
  assignTicketInDb,
  createSupportTicketInDb,
  escalateTicketInDb,
  listSupportTickets,
  updateTicketStatusInDb,
} from "@/lib/server/support-tickets-repo";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse } from "@/lib/auth/listing-access";
import { requireAdmin } from "@/lib/auth/guards";
import { getRequestId } from "@/lib/observability/logger";
import type { TicketStatus } from "@/lib/admin/support-types";

export const dynamic = "force-dynamic";


export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    const hostId = new URL(request.url).searchParams.get("hostId") ?? undefined;
    const tickets = await listSupportTickets(hostId);
    return NextResponse.json({ tickets }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Admin support GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    await requireAdmin();
    const body = await request.json();

    if (body.action === "assign" && body.ticketId && body.staffId) {
      const ticket = await assignTicketInDb(body.ticketId, body.staffId);
      if (!ticket) {
        return NextResponse.json({ error: "Ticket or staff not found" }, { status: 404 });
      }
      return NextResponse.json({ ticket }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "escalate" && body.ticketId && body.reason) {
      const ticket = await escalateTicketInDb(
        body.ticketId,
        String(body.reason),
        body.actorName ? String(body.actorName) : "Admin"
      );
      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      return NextResponse.json({ ticket }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "setStatus" && body.ticketId && body.status) {
      const ticket = await updateTicketStatusInDb(body.ticketId, body.status as TicketStatus);
      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      return NextResponse.json({ ticket }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "addLog" && body.ticketId && body.summary && body.type) {
      const ticket = await addCommunicationLogInDb(body.ticketId, {
        type: body.type,
        summary: String(body.summary),
        staffId: body.staffId,
        staffName: body.staffName,
        durationMinutes: body.durationMinutes,
      });
      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }
      return NextResponse.json({ ticket }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "create" && body.subject && body.message && body.source && body.requesterId) {
      const ticket = await createSupportTicketInDb({
        source: body.source,
        subject: String(body.subject),
        message: String(body.message),
        requesterId: String(body.requesterId),
        requesterName: String(body.requesterName ?? body.requesterId),
        requesterEmail: body.requesterEmail,
        bookingRef: body.bookingRef,
        property: body.property,
        priority: body.priority,
      });
      return NextResponse.json({ ticket }, { headers: { "x-request-id": requestId } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Admin support PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
