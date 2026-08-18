import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ipLimiter: Ratelimit | null = null;
let userLimiter: Ratelimit | null = null;

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function getIpLimiter() {
  if (!ipLimiter) {
    const redis = getRedis();
    if (!redis) return null;
    ipLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "farm-stays:auth:ip",
    });
  }
  return ipLimiter;
}

function getUserLimiter() {
  if (!userLimiter) {
    const redis = getRedis();
    if (!redis) return null;
    userLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "farm-stays:auth:user",
    });
  }
  return userLimiter;
}

/** @deprecated use checkAuthRateLimit */
export function getAuthRateLimiter() {
  return getIpLimiter();
}

/** @deprecated use checkAuthRateLimit */
export async function checkRateLimit(identifier: string) {
  const limiter = getIpLimiter();
  if (!limiter) return { success: true, remaining: -1 };
  const result = await limiter.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "anonymous";
  return request.headers.get("x-real-ip") ?? "anonymous";
}

/**
 * Login/signup rate limit: per IP and optionally per email/user identifier.
 * Stored in Redis so all app instances share the same counters.
 */
export async function checkAuthRateLimit(request: Request, userKey?: string) {
  const ip = getClientIp(request);
  const ipLimiterInstance = getIpLimiter();
  const userLimiterInstance = userKey ? getUserLimiter() : null;

  if (!ipLimiterInstance) {
    return { success: true, remaining: -1, limitedBy: null as "ip" | "user" | null };
  }

  const ipResult = await ipLimiterInstance.limit(`ip:${ip}`);
  if (!ipResult.success) {
    return { success: false, remaining: ipResult.remaining, limitedBy: "ip" as const };
  }

  if (userLimiterInstance && userKey) {
    const normalized = userKey.trim().toLowerCase();
    const userResult = await userLimiterInstance.limit(`user:${normalized}`);
    if (!userResult.success) {
      return { success: false, remaining: userResult.remaining, limitedBy: "user" as const };
    }
  }

  return { success: true, remaining: ipResult.remaining, limitedBy: null };
}
