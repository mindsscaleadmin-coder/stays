/**
 * Backfill expiresAt for unpaid bookings created before L6 (null deadline).
 *
 *   npm run bookings:backfill-expiry -- --dry-run
 *   npm run bookings:backfill-expiry
 */
import { PENDING_RESPONSE_HOURS } from "../src/lib/booking/policies";

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--apply") && args.has("--dry-run")) {
    console.error("Pass only one of --dry-run or --apply (default is apply)");
    process.exit(1);
  }
  const dryRun = args.has("--dry-run");
  const { prisma } = await import("../src/lib/prisma");

  const stale = await prisma.booking.findMany({
    where: {
      paymentStatus: "unpaid",
      status: { in: ["pending", "confirmed"] },
      expiresAt: null,
    },
    select: { id: true, createdAt: true, status: true },
  });

  if (stale.length === 0) {
    console.log("No unpaid bookings with null expiresAt");
    return;
  }

  const deadlineMs = PENDING_RESPONSE_HOURS * 60 * 60 * 1000;
  let updated = 0;

  for (const row of stale) {
    const expiresAt = new Date(row.createdAt.getTime() + deadlineMs);
    if (dryRun) {
      console.log(`would set ${row.id} (${row.status}) expiresAt=${expiresAt.toISOString()}`);
    } else {
      await prisma.booking.update({
        where: { id: row.id },
        data: { expiresAt },
      });
    }
    updated += 1;
  }

  console.log(
    dryRun
      ? `Dry run — ${updated} booking(s) would be updated`
      : `Updated expiresAt on ${updated} unpaid booking(s)`
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
