import { renderPrometheusMetrics } from "@/lib/observability/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(renderPrometheusMetrics(), {
    headers: {
      "content-type": "text/plain; version=0.0.4; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
