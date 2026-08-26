import { NextResponse } from "next/server";
import { AuthError, getSessionUser, requireSessionUser } from "@/lib/auth/session";
import {
  BookingAccessError,
  bookingAccessResponse,
  isDemoApiMode,
} from "@/lib/auth/booking-access";
import { DEMO_ACTOR, resolveSessionActor, type SessionActor } from "@/lib/auth/resolve-actor";
import { getRequestId, logger } from "@/lib/observability/logger";
import { recordRequest } from "@/lib/observability/metrics";

type RouteContext = { params: Promise<{ id: string }> };

type BookingRouteHandler = (
  request: Request,
  context: RouteContext,
  actor: SessionActor
) => Promise<Response>;

/** Enforces a real session on booking mutations when not in local demo mode. */
export function withBookingAuth(handler: BookingRouteHandler) {
  return async (request: Request, context: RouteContext) => {
    const requestId = getRequestId(request);
    const start = performance.now();

    try {
      const actor = isDemoApiMode()
        ? DEMO_ACTOR
        : await resolveSessionActor(await requireSessionUser());
      const res = await handler(request, context, actor);
      recordRequest(res.status, Math.round(performance.now() - start));
      return res;
    } catch (error) {
      const durationMs = Math.round(performance.now() - start);
      if (error instanceof AuthError || error instanceof BookingAccessError) {
        recordRequest(error.status, durationMs);
        return bookingAccessResponse(error, requestId);
      }
      logger.error("booking_route_error", {
        requestId,
        durationMs,
        error: error instanceof Error ? error.message : "unknown",
      });
      recordRequest(500, durationMs);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export async function getOptionalUserId(): Promise<string | null> {
  if (isDemoApiMode()) return null;
  const user = await getSessionUser();
  return user?.id ?? null;
}
