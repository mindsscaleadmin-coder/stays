/**
 * BullMQ worker — run outside the Next.js request path.
 *
 *   REDIS_URL=redis://localhost:6379 npx tsx scripts/worker.ts
 */
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { QUEUE_NAME } from "../src/lib/queue/client";
import { logger } from "../src/lib/queue/worker-logger";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error("REDIS_URL is required");
  process.exit(1);
}

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

async function handleWelcomeEmail(data: {
  userId: string;
  email: string;
  fullName?: string;
}) {
  // Replace with Resend/SendGrid/Supabase edge function in production.
  logger.info("welcome_email_sent", {
    userId: data.userId,
    email: data.email,
    fullName: data.fullName,
  });
}

async function handleBookingConfirmed(data: { bookingId: string; guestId: string }) {
  logger.info("booking_confirmed_notification", data);
}

async function handleAuditLog(data: {
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}) {
  logger.info("audit_log", data);
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    switch (job.name) {
      case "welcome-email":
        await handleWelcomeEmail(job.data);
        break;
      case "booking-confirmed":
        await handleBookingConfirmed(job.data);
        break;
      case "audit-log":
        await handleAuditLog(job.data);
        break;
      default:
        logger.warn("unknown_job", { name: job.name });
    }
  },
  { connection, concurrency: 5 }
);

worker.on("failed", (job, err) => {
  logger.error("job_failed", {
    name: job?.name,
    id: job?.id,
    error: err.message,
  });
});

logger.info("worker_started", { queue: QUEUE_NAME });
