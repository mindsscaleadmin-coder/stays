import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/observability/logger";

const SLOW_QUERY_MS = 200;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "warn" },
          ]
        : [{ emit: "event", level: "query" }, { emit: "stdout", level: "error" }],
  });

  client.$on("query", (event) => {
    if (event.duration > SLOW_QUERY_MS) {
      logger.warn("slow_query", {
        durationMs: event.duration,
        query: event.query,
      });
    }
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function checkDatabaseHealth(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : "database unreachable",
    };
  }
}
