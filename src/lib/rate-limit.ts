import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitScope = "auth" | "booking" | "enquiry" | "search";

const SCOPE_LIMITS: Record<RateLimitScope, { ipPerMinute: number; userPerMinute: number }> = {
  auth: { ipPerMinute: 10, userPerMinute: 5 },
  booking: { ipPerMinute: 10, userPerMinute: 5 },
  enquiry: { ipPerMinute: 10, userPerMinute: 5 },
  search: { ipPerMinute: 10, userPerMinute: 5 },
};

const ipLimiters = new Map<RateLimitScope, Ratelimit>();
const userLimiters = new Map<RateLimitScope, Ratelimit>();

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function getIpLimiter(scope: RateLimitScope) {
  let limiter = ipLimiters.get(scope);
  if (!limiter) {
    const redis = getRedis();
    if (!redis) return null;
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(SCOPE_LIMITS[scope].ipPerMinute, "1 m"),
      prefix: `farm-stays:${scope}:ip`,
    });
    ipLimiters.set(scope, limiter);
  }
  return limiter;
}

function getUserLimiter(scope: RateLimitScope) {
  let limiter = userLimiters.get(scope);
  if (!limiter) {
    const redis = getRedis();
    if (!redis) return null;
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(SCOPE_LIMITS[scope].userPerMinute, "1 m"),
      prefix: `farm-stays:${scope}:user`,
    });
    userLimiters.set(scope, limiter);
  }
  return limiter;
}

/** @deprecated use checkScopedRateLimit */
export function getAuthRateLimiter() {
  return getIpLimiter("auth");
}

/** @deprecated use checkScopedRateLimit */
export async function checkRateLimit(identifier: string) {
  const limiter = getIpLimiter("auth");
  if (!limiter) return { success: true, remaining: -1 };
  const result = await limiter.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}

const memoryHits = new Map<string, { count: number; resetAt: number }>();

function memoryScopedLimit(
  scope: RateLimitScope,
  ip: string,
  userKey?: string,
  part: RateLimitPart = "all"
): RateLimitResult {
  const now = Date.now();
  const windowMs = 60_000;
  const limits = SCOPE_LIMITS[scope];

  const bump = (key: string, max: number): RateLimitResult | null => {
    const row = memoryHits.get(key);
    if (!row || row.resetAt < now) {
      memoryHits.set(key, { count: 1, resetAt: now + windowMs });
      return null;
    }
    row.count += 1;
    if (row.count > max) {
      return {
        success: false,
        remaining: 0,
        limitedBy: key.includes(":user:") ? "user" : "ip",
      };
    }
    return null;
  };

  if (part !== "user") {
    const limited = bump(`${scope}:ip:${ip}`, limits.ipPerMinute);
    if (limited) return limited;
  }
  if (part !== "ip" && userKey) {
    const limited = bump(
      `${scope}:user:${userKey.trim().toLowerCase()}`,
      limits.userPerMinute
    );
    if (limited) return limited;
  }
  return { success: true, remaining: -1, limitedBy: null };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "anonymous";
  return request.headers.get("x-real-ip") ?? "anonymous";
}

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  limitedBy: "ip" | "user" | null;
};

type RateLimitPart = "ip" | "user" | "all";

/**
 * Per-scope rate limit: per IP and optionally per user identifier.
 * Stored in Redis so all app instances share the same counters.
 */
export async function checkScopedRateLimit(
  request: Request,
  scope: RateLimitScope,
  userKey?: string,
  part: RateLimitPart = "all"
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const ipLimiterInstance = part !== "user" ? getIpLimiter(scope) : null;
  const userLimiterInstance =
    part !== "ip" && userKey ? getUserLimiter(scope) : null;

  if (!ipLimiterInstance && !userLimiterInstance) {
    if (process.env.NODE_ENV === "production") {
      return memoryScopedLimit(scope, ip, userKey, part);
    }
    return { success: true, remaining: -1, limitedBy: null };
  }

  if (ipLimiterInstance) {
    const ipResult = await ipLimiterInstance.limit(`ip:${ip}`);
    if (!ipResult.success) {
      return { success: false, remaining: ipResult.remaining, limitedBy: "ip" };
    }
  }

  if (userLimiterInstance && userKey) {
    const normalized = userKey.trim().toLowerCase();
    const userResult = await userLimiterInstance.limit(`user:${normalized}`);
    if (!userResult.success) {
      return { success: false, remaining: userResult.remaining, limitedBy: "user" };
    }
  }

  return { success: true, remaining: -1, limitedBy: null };
}

/** Login/signup rate limit: per IP and optionally per email/user identifier. */
export async function checkAuthRateLimit(request: Request, userKey?: string) {
  return checkScopedRateLimit(request, "auth", userKey);
}

export async function checkBookingRateLimit(
  request: Request,
  userKey?: string,
  part: RateLimitPart = userKey ? "all" : "ip"
) {
  return checkScopedRateLimit(request, "booking", userKey, part);
}

export async function checkEnquiryRateLimit(
  request: Request,
  userKey?: string,
  part: RateLimitPart = userKey ? "all" : "ip"
) {
  return checkScopedRateLimit(request, "enquiry", userKey, part);
}

export async function checkSearchRateLimit(request: Request) {
  return checkScopedRateLimit(request, "search", undefined, "ip");
}

export function tooManyRequestsResponse(remaining: number, requestId?: string) {
  return Response.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Remaining": String(remaining),
        ...(requestId ? { "x-request-id": requestId } : {}),
      },
    }
  );
}
