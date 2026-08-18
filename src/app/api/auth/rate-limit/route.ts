import { NextResponse } from "next/server";
import { checkAuthRateLimit } from "@/lib/rate-limit";
import { getRequestId, logger } from "@/lib/observability/logger";
import { recordRequest } from "@/lib/observability/metrics";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const start = performance.now();

  let body: { email?: string } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const { success, remaining, limitedBy } = await checkAuthRateLimit(
    request,
    body.email
  );

  const durationMs = Math.round(performance.now() - start);

  if (!success) {
    recordRequest(429, durationMs);
    logger.warn("auth_rate_limited", { requestId, limitedBy, durationMs });
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
          "x-request-id": requestId,
        },
      }
    );
  }

  recordRequest(200, durationMs);
  logger.info("auth_rate_limit_ok", { requestId, durationMs });

  // Supabase Auth runs client-side; this endpoint gates brute-force at the edge.
  return NextResponse.json(
    { ok: true },
    { headers: { "x-request-id": requestId } }
  );
}
