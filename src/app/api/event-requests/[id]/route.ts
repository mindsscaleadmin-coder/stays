import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { hostDataErrorResponse, requireHostSelfOrAdmin } from "@/lib/auth/listing-access";
import { getRequestId } from "@/lib/observability/logger";
import {
  getEventAvailabilityRequest,
  getEventAvailabilityRequestForHost,
  respondToEventAvailabilityRequest,
} from "@/lib/server/event-availability-repo";
import { enrichHostOpsListRows } from "@/lib/server/host-ops-repo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(_request);
  try {
    const { id } = await context.params;
    const payload = await getEventAvailabilityRequestForHost(id);
    if (!payload) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    await requireHostSelfOrAdmin(payload.request.hostId);

    const [booking] = await enrichHostOpsListRows(payload.request.hostId, [payload.booking]);

    return NextResponse.json(
      { request: payload.request, booking },
      { headers: { "x-request-id": requestId } }
    );
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Get event request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const patchSchema = z.object({
  status: z.enum(["available", "unavailable"]),
  hostNote: z.string().max(1000).optional(),
});

/** Host decision. Confirming "available" is what unlocks contact details for the guest. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { id } = await context.params;
    const existing = await getEventAvailabilityRequest(id);
    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    await requireHostSelfOrAdmin(existing.hostId);

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "status must be available or unavailable", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const saved = await respondToEventAvailabilityRequest(
      id,
      parsed.data.status,
      parsed.data.hostNote
    );

    return NextResponse.json({ request: saved }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Respond to event request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
