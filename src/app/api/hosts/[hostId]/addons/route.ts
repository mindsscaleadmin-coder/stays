import { NextResponse } from "next/server";
import { getHostAddons, saveHostAddons } from "@/lib/server/host-addons-repo";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import type { HostAddonsData } from "@/lib/host/host-addons-types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);
  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);
    const data = await getHostAddons(hostId);
    return NextResponse.json({ data }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host add-ons GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);

    const body = (await request.json()) as { data?: HostAddonsData };
    if (!body.data || body.data.hostId !== hostId) {
      return NextResponse.json({ error: "Invalid add-ons payload" }, { status: 400 });
    }

    const data = await saveHostAddons(body.data);
    return NextResponse.json({ data }, { headers: { "x-request-id": requestId } });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host add-ons save error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
