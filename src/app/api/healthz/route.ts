import { checkDatabaseHealth } from "@/lib/prisma";
import { isRedisConfigured } from "@/lib/cache/redis";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getRequestId, logger } from "@/lib/observability/logger";
import { recordRequest } from "@/lib/observability/metrics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const start = performance.now();

  const db = await checkDatabaseHealth();
  const authOk = process.env.NODE_ENV !== "production" || isSupabaseConfigured();
  const checks = {
    database: db.ok,
    redis: isRedisConfigured(),
    auth: authOk,
  };

  const ok = checks.database && checks.auth;
  const status = ok ? 200 : 503;
  const durationMs = Math.round(performance.now() - start);

  recordRequest(status, durationMs);
  logger.info("healthz", { requestId, durationMs, checks, dbLatencyMs: db.latencyMs });

  return Response.json(
    {
      status: ok ? "ok" : "degraded",
      checks,
      dbLatencyMs: db.latencyMs,
      error: db.error,
    },
    {
      status,
      headers: { "x-request-id": requestId, "cache-control": "no-store" },
    }
  );
}
