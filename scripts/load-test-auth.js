import http from "k6/http";
import { check, sleep } from "k6";

/**
 * Simulates concurrent login attempts from many virtual locations (IPs).
 * Hits the server-side auth rate-limit gate — call before Supabase signIn on the client.
 *
 * Usage:
 *   k6 run scripts/load-test-auth.js
 *   BASE_URL=http://localhost:8080 k6 run scripts/load-test-auth.js
 */
export const options = {
  scenarios: {
    multi_location_login: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 30 },
        { duration: "40s", target: 80 },
        { duration: "20s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<3000"],
    http_req_failed: ["rate<0.15"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

function virtualIp(vu, iter) {
  // Spread across synthetic /24 subnets to mimic multi-region clients
  const a = 203 + (vu % 5);
  const b = (vu * 7 + iter) % 256;
  const c = (vu * 13) % 256;
  const d = (iter * 17 + vu) % 254 + 1;
  return `${a}.${b}.${c}.${d}`;
}

export default function loadTestAuth() {
  const email = `loadtest-${__VU}-${__ITER}@example.com`;
  const ip = virtualIp(__VU, __ITER);

  const headers = {
    "Content-Type": "application/json",
    "X-Forwarded-For": ip,
    "X-Request-Id": `k6-${__VU}-${__ITER}`,
  };

  const health = http.get(`${BASE_URL}/api/healthz`, { headers });
  check(health, {
    "healthz reachable": (r) => r.status === 200 || r.status === 503,
  });

  const res = http.post(
    `${BASE_URL}/api/auth/rate-limit`,
    JSON.stringify({ email }),
    { headers }
  );

  check(res, {
    "rate limit responded": (r) => r.status === 200 || r.status === 429,
    "has request id": (r) => Boolean(r.headers["X-Request-Id"]),
  });

  sleep(0.3 + Math.random() * 0.7);
}
