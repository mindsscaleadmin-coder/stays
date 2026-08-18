import { NextResponse } from "next/server";
import {
  getHostNotifications,
  markAlertRead,
  markAllAlertsRead,
  saveNotificationPrefs,
} from "@/lib/server/host-notifications-repo";
import {
  hostDataErrorResponse,
  requireHostSelfOrAdmin,
} from "@/lib/auth/listing-access";
import { AuthError } from "@/lib/auth/session";
import { BookingAccessError } from "@/lib/auth/booking-access";
import { getRequestId } from "@/lib/observability/logger";
import type { HostNotificationPrefs } from "@/lib/host/host-notifications-types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const { hostId } = await context.params;
  const data = await getHostNotifications(hostId);
  return NextResponse.json({ data });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ hostId: string }> }
) {
  const requestId = getRequestId(request);

  try {
    const { hostId } = await context.params;
    await requireHostSelfOrAdmin(hostId);
    const body = await request.json();

    if (body.action === "savePrefs" && body.prefs && typeof body.prefs === "object") {
      const data = await saveNotificationPrefs(hostId, body.prefs as HostNotificationPrefs);
      return NextResponse.json({ data }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "markRead" && typeof body.alertId === "string") {
      const data = await markAlertRead(hostId, body.alertId);
      return NextResponse.json({ data }, { headers: { "x-request-id": requestId } });
    }

    if (body.action === "markAllRead") {
      const data = await markAllAlertsRead(hostId);
      return NextResponse.json({ data }, { headers: { "x-request-id": requestId } });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof BookingAccessError) {
      return hostDataErrorResponse(error, requestId);
    }
    console.error("Host notifications update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
