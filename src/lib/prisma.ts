import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "@/lib/observability/logger";

const SLOW_QUERY_MS = 200;
/** Bump after `prisma generate` so the Next.dev singleton picks up new Booking fields. */
const PRISMA_CLIENT_REV = 8;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClientRev?: number;
};

function bookingModelHasField(fieldName: string): boolean {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "Booking");
  return Boolean(model?.fields.some((f) => f.name === fieldName));
}

function bookingHasRequiredFields(): boolean {
  return (
    bookingModelHasField("checkInStatus") &&
    bookingModelHasField("guestQuoteSnapshot") &&
    bookingModelHasField("financialSnapshot")
  );
}

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

const staleSingleton =
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  (globalForPrisma.prismaClientRev !== PRISMA_CLIENT_REV || !bookingHasRequiredFields());

if (staleSingleton) {
  void globalForPrisma.prisma?.$disconnect();
  globalForPrisma.prisma = undefined;
}

if (!bookingHasRequiredFields()) {
  logger.warn("prisma_client_missing_booking_fields", {
    hint: "Run npm run dev:clean after prisma generate",
    hasCheckInStatus: bookingModelHasField("checkInStatus"),
    hasGuestQuoteSnapshot: bookingModelHasField("guestQuoteSnapshot"),
    hasFinancialSnapshot: bookingModelHasField("financialSnapshot"),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientRev = PRISMA_CLIENT_REV;
}

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
