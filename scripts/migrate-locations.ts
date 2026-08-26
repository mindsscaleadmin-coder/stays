/**
 * Import PlatformCatalog taxonomy geo into Country / Location tables.
 *
 *   npm run locations:migrate -- --dry-run
 *   npm run locations:migrate -- --apply
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  formatLocationMigrationReport,
  migrateLocationsFromTaxonomy,
} from "../src/lib/locations/location-migration-service";

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--apply") && args.has("--dry-run")) {
    console.error("Pass only one of --dry-run or --apply");
    process.exit(1);
  }
  const mode = args.has("--apply") ? "apply" : "dry-run";

  const report = await migrateLocationsFromTaxonomy({ mode });
  const markdown = formatLocationMigrationReport(report);
  const reportPath = path.join(process.cwd(), "docs", "location-migration-report.md");
  await writeFile(reportPath, `${markdown}\n`, "utf8");

  console.log(markdown);
  console.log(`Wrote ${reportPath}`);
  if (report.errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
