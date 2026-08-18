type CounterKey = "http_requests_total" | "http_errors_total";

const counters: Record<string, number> = {
  http_requests_total: 0,
  http_errors_total: 0,
};

const latencyBuckets = [50, 100, 200, 500, 1000, 2000, 5000];
const bucketCounts = new Array(latencyBuckets.length + 1).fill(0) as number[];
let latencySumMs = 0;
let latencyCount = 0;

export function recordRequest(status: number, durationMs: number) {
  counters.http_requests_total += 1;
  if (status >= 500) counters.http_errors_total += 1;

  latencySumMs += durationMs;
  latencyCount += 1;

  let placed = false;
  for (let i = 0; i < latencyBuckets.length; i++) {
    if (durationMs <= latencyBuckets[i]) {
      bucketCounts[i] += 1;
      placed = true;
      break;
    }
  }
  if (!placed) bucketCounts[bucketCounts.length - 1] += 1;
}

export function renderPrometheusMetrics(): string {
  const lines: string[] = [];

  for (const key of Object.keys(counters) as CounterKey[]) {
    lines.push(`# TYPE ${key} counter`);
    lines.push(`${key} ${counters[key]}`);
  }

  lines.push("# TYPE http_request_duration_ms summary");
  lines.push(`http_request_duration_ms_sum ${latencySumMs}`);
  lines.push(`http_request_duration_ms_count ${latencyCount}`);

  for (let i = 0; i < latencyBuckets.length; i++) {
    lines.push(`http_request_duration_ms_bucket{le="${latencyBuckets[i]}"} ${bucketCounts[i]}`);
  }
  lines.push(`http_request_duration_ms_bucket{le="+Inf"} ${bucketCounts[bucketCounts.length - 1]}`);

  return lines.join("\n") + "\n";
}
