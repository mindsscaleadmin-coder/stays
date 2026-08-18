import { Queue } from "bullmq";
import IORedis from "ioredis";
import { logger } from "@/lib/observability/logger";

export const QUEUE_NAME = "farm-stays-jobs";

let connection: IORedis | null = null;
let queue: Queue | null = null;

export function getRedisConnection(): IORedis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!connection) {
    connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connection;
}

export function getJobQueue(): Queue | null {
  const conn = getRedisConnection();
  if (!conn) return null;

  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: conn });
  }
  return queue;
}

export function isQueueConfigured() {
  return Boolean(process.env.REDIS_URL);
}

export async function closeQueueConnections() {
  await queue?.close();
  connection?.disconnect();
  queue = null;
  connection = null;
}

export async function safeAddJob<T extends Record<string, unknown>>(
  name: string,
  data: T
) {
  const q = getJobQueue();
  if (!q) {
    logger.debug("queue_skipped", { name, reason: "REDIS_URL not set" });
    return false;
  }

  try {
    await q.add(name, data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
    return true;
  } catch (error) {
    logger.warn("queue_enqueue_failed", {
      name,
      error: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}
