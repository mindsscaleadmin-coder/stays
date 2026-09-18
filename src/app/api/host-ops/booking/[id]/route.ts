import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertHostOwnsListing,
  BookingAccessError,
  isDemoApiMode,
  loadBookingWithListing,
} from "@/lib/auth/booking-access";
import { withBookingAuth } from "@/lib/auth/with-booking-auth";
import { actingHostId } from "@/lib/auth/guards";
import { getBookingOpsView, patchBookingOps } from "@/lib/server/host-ops-mutations";
import { HostOpsAccessError } from "@/lib/server/host-ops-repo";

const patchBodySchema = z.object({
  assignedStaffId: z.string().min(1).nullable().optional(),
  privateNotes: z.string().max(4000).nullable().optional(),
});

function opsErrorResponse(error: unknown) {
  if (error instanceof HostOpsAccessError) {
    const status = error.message === "Invalid staff assignment" ? 400 : 403;
    return NextResponse.json({ error: error.message }, { status });
  }
  if (error instanceof BookingAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

export const GET = withBookingAuth(async (_request, context, actor) => {
  try {
    const { id } = await context.params;
    const hostId = actingHostId(actor);

    if (!isDemoApiMode()) {
      const booking = await loadBookingWithListing(id);
      if (!booking) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      assertHostOwnsListing(booking, actor);
    }

    const view = await getBookingOpsView(hostId, id);
    return NextResponse.json({
      ops: view.ops,
      assignedStaffName: view.assignedStaffName,
    });
  } catch (error) {
    return opsErrorResponse(error);
  }
});

export const PATCH = withBookingAuth(async (request, context, actor) => {
  try {
    const { id } = await context.params;
    const hostId = actingHostId(actor);
    const body = patchBodySchema.parse(await request.json());

    if (!isDemoApiMode()) {
      const booking = await loadBookingWithListing(id);
      if (!booking) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      assertHostOwnsListing(booking, actor);
    }

    const actorLabel = actor.email?.split("@")[0] || actor.id || "Host";
    const ops = await patchBookingOps(hostId, id, body, actorLabel);
    const assignedStaffName =
      ops.assignedStaffId ? (await getBookingOpsView(hostId, id)).assignedStaffName : null;

    return NextResponse.json({ ops, assignedStaffName });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return opsErrorResponse(error);
  }
});
