import { NextResponse } from "next/server";
import { z } from "zod";
import { actingHostId } from "@/lib/auth/guards";
import { hostDataErrorResponse, requireHostSelfOrAdmin } from "@/lib/auth/listing-access";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { AuthError } from "@/lib/auth/session";
import { withBookingAuth } from "@/lib/auth/with-booking-auth";
import { getEventAvailabilityRequest } from "@/lib/server/event-availability-repo";
import { getEventOpsView, patchEventOps } from "@/lib/server/host-ops-mutations";
import { HostOpsAccessError } from "@/lib/server/host-ops-repo";
import { getRequestId } from "@/lib/observability/logger";

const patchBodySchema = z.object({
  assignedStaffId: z.string().min(1).nullable().optional(),
  privateNotes: z.string().max(4000).nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

function opsErrorResponse(error: unknown, requestId: string) {
  if (error instanceof HostOpsAccessError) {
    const status = error.message === "Invalid staff assignment" ? 400 : 403;
    return NextResponse.json({ error: error.message }, { status, headers: { "x-request-id": requestId } });
  }
  if (error instanceof AuthError || error instanceof BookingAccessError) {
    return hostDataErrorResponse(error, requestId);
  }
  throw error;
}

export const GET = withBookingAuth(async (request, context, actor) => {
  const requestId = getRequestId(request);
  try {
    const { id } = await context.params;
    const hostId = actingHostId(actor);
    const eventRequest = await getEventAvailabilityRequest(id);
    if (!eventRequest) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await requireHostSelfOrAdmin(eventRequest.hostId);

    const view = await getEventOpsView(hostId, id);
    return NextResponse.json({
      ops: view.ops,
      assignedStaffName: view.assignedStaffName,
    });
  } catch (error) {
    return opsErrorResponse(error, requestId);
  }
});

export const PATCH = withBookingAuth(async (request, context, actor) => {
  const requestId = getRequestId(request);
  try {
    const { id } = await context.params;
    const hostId = actingHostId(actor);
    const body = patchBodySchema.parse(await request.json());

    const eventRequest = await getEventAvailabilityRequest(id);
    if (!eventRequest) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await requireHostSelfOrAdmin(eventRequest.hostId);

    const ops = await patchEventOps(hostId, id, body);
    const assignedStaffName =
      ops.assignedStaffId ? (await getEventOpsView(hostId, id)).assignedStaffName : null;

    return NextResponse.json({ ops, assignedStaffName });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return opsErrorResponse(error, requestId);
  }
});
