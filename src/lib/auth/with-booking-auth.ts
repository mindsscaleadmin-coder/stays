import { NextResponse } from "next/server";
import {
  AuthError,
  getSessionUser,
  requireSessionUser,
} from "@/lib/auth/session";
import {
  BookingAccessError,
  bookingAccessResponse,
  isDemoApiMode,
} from "@/lib/auth/booking-access";
import { getRequestId, logger } from "@/lib/observability/logger";
import { recordRequest } from "@/lib/observability/metrics";

type RouteContext = { params: Promise<{ id: string }> };

type BookingRouteHandler = (
  request: Request,
  context: RouteContext,
  userId: string
) => Promise<Response>;

/** Enforces Supabase session on booking mutations when auth is configured. */
export function withBookingAuth(handler: BookingRouteHandler) {
  return async (request: Request, context: RouteContext) => {
    const requestId = getRequestId(request);
    const start = performance.now();

    try {
      if (isDemoApiMode()) {
        const res = await handler(request, context, "demo");
        recordRequest(res.status, Math.round(performance.now() - start));
        return res;
      }

      const user = await requireSessionUser();
      const res = await handler(request, context, user.id);
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
