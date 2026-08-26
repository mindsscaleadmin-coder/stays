/**
 * Prove Country → State → District for India / Kerala / Idukki.
 *
 *   npx tsx scripts/verify-india-locations.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const india = await prisma.country.findUnique({ where: { iso2: "IN" } });
  if (!india) throw new Error("Country India (IN) missing");

  const kerala = await prisma.location.findFirst({
    where: { countryId: india.id, parentId: null, normalizedName: "kerala" },
  });
  if (!kerala) throw new Error("Location Kerala missing");

  const idukki = await prisma.location.findFirst({
    where: { countryId: india.id, parentId: kerala.id, normalizedName: "idukki" },
  });
  if (!idukki) throw new Error("Location Idukki missing");

  const locationCount = await prisma.location.count();
  const mapped = await prisma.listing.findFirst({
    where: { locationId: idukki.id },
    select: { id: true, country: true, state: true, district: true, countryId: true, locationId: true },
  });

  const result = {
    india: { id: india.id, name: india.name, iso2: india.iso2 },
    kerala: {
      id: kerala.id,
      name: kerala.name,
      parentId: kerala.parentId,
      countryId: kerala.countryId,
      type: kerala.type,
      code: kerala.code,
    },
    idukki: {
      id: idukki.id,
      name: idukki.name,
      parentId: idukki.parentId,
      countryId: idukki.countryId,
      type: idukki.type,
      code: idukki.code,
    },
    checks: {
      locationCount,
      locationCountPositive: locationCount > 0,
      keralaParentIsNull: kerala.parentId === null,
      idukkiParentIsKerala: idukki.parentId === kerala.id,
      idukkiCountryIsIndia: idukki.countryId === india.id,
      keralaCountryIsIndia: kerala.countryId === india.id,
      listingReferencesIdukki: Boolean(mapped),
      listing: mapped,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  if (
    !result.checks.locationCountPositive ||
    !result.checks.keralaParentIsNull ||
    !result.checks.idukkiParentIsKerala ||
    !result.checks.idukkiCountryIsIndia ||
    !result.checks.listingReferencesIdukki
  ) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
