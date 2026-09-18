import { assertCronAuthorized, bookingAccessResponse } from "@/lib/auth/booking-access";
import { AuthError } from "@/lib/auth/session";
import { renderPrometheusMetrics } from "@/lib/observability/metrics";

export const dynamic = "force-dynamic";

/** Prometheus scrape — Bearer CRON_SECRET required in production (same as expire-pending cron). */
export async function GET(request: Request) {
  try {
    assertCronAuthorized(request);
    return new Response(renderPrometheusMetrics(), {
      headers: {
        "content-type": "text/plain; version=0.0.4; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return bookingAccessResponse(error);
    }
    throw error;
  }
}
