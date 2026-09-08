/**
 * One-time listing table cleanup (filter columns + status drift).
 *
 * Run after migrate / before traffic, not from request handlers:
 *
 *   npm run listings:backfill -- --dry-run
 *   npm run listings:backfill
 */
import { runListingTableMaintenance } from "../src/lib/server/listing-maintenance";

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--apply") && args.has("--dry-run")) {
    console.error("Pass only one of --dry-run or --apply (default is apply)");
    process.exit(1);
  }
  const dryRun = args.has("--dry-run");

  const report = await runListingTableMaintenance({ dryRun });
  console.log(
    [
      dryRun ? "Dry run — no writes" : "Applied listing maintenance",
      `scanned=${report.scanned}`,
      `filterColumnsUpdated=${report.filterColumnsUpdated}`,
      `statusDriftRepaired=${report.statusDriftRepaired}`,
    ].join(" · ")
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
