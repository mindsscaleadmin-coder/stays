import { Redis as UpstashRedis } from "@upstash/redis";

let upstash: UpstashRedis | null = null;

/** Upstash REST Redis — works from serverless and horizontally scaled instances. */
export function getUpstashRedis(): UpstashRedis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!upstash) {
    upstash = new UpstashRedis({ url, token });
  }
  return upstash;
}

export function isRedisConfigured() {
  return Boolean(getUpstashRedis());
}

const PROFILE_PREFIX = "farm-stays:profile:";
const DEFAULT_PROFILE_TTL_SEC = 300;

export async function getCachedProfile<T>(userId: string): Promise<T | null> {
  const redis = getUpstashRedis();
  if (!redis) return null;
  return redis.get<T>(`${PROFILE_PREFIX}${userId}`);
}

export async function setCachedProfile(userId: string, profile: unknown, ttlSec = DEFAULT_PROFILE_TTL_SEC) {
  const redis = getUpstashRedis();
  if (!redis) return;
  await redis.set(`${PROFILE_PREFIX}${userId}`, profile, { ex: ttlSec });
}

/** Explicit invalidation — call after profile/role updates. */
export async function invalidateCachedProfile(userId: string) {
  const redis = getUpstashRedis();
  if (!redis) return;
  await redis.del(`${PROFILE_PREFIX}${userId}`);
}
