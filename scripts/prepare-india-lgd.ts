/**
 * Build a validated India State→District file from LGD CSVs and optionally
 * replace India rows in PlatformCatalog.taxonomy (stay-type catalog is kept).
 *
 *   npx tsx scripts/prepare-india-lgd.ts
 *   npx tsx scripts/prepare-india-lgd.ts --write-taxonomy
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { getTaxonomyFromDb, saveTaxonomyToDb } from "../src/lib/server/platform-catalog-repo";
import type { District, State } from "../src/lib/admin/taxonomy-types";
import { createPropertyReference } from "../src/lib/listings/property-reference";

const ROOT = path.join(process.cwd(), "data", "india-lgd");
const STATES_FILE = path.join(ROOT, "lgd-states.csv");
const DISTRICTS_FILE = path.join(ROOT, "lgd-districts.csv");
const CLEAN_CSV = path.join(ROOT, "india-state-district.csv");
const REPORT = path.join(process.cwd(), "docs", "india-lgd-validation-report.md");

type StateRow = {
  stateCode: string;
  stateNameRaw: string;
  stateName: string;
  kind: "state" | "territory";
};

type DistrictRow = {
  stateCode: string;
  stateNameRaw: string;
  districtCode: string;
  districtNameRaw: string;
  districtName: string;
};

type CleanRow = {
  country: string;
  state: string;
  district: string;
  state_lgd_code: string;
  district_lgd_code: string;
};

export type IndiaLgdValidation = {
  states: number;
  districts: number;
  duplicateStateDistrictCombos: string[];
  districtsWithoutState: DistrictRow[];
  emptyNames: number;
  duplicateStateCodes: string[];
  duplicateDistrictCodes: string[];
  homonymousDistricts: { name: string; count: number }[];
  keralaDistricts: string[];
  errors: string[];
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && src[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((c) => c)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some((c) => c)) rows.push(row);
  }
  return rows;
}

function titleCaseName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function col(header: string[], row: string[], name: string): string {
  const idx = header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  return idx >= 0 ? row[idx] ?? "" : "";
}

function loadStates(text: string): StateRow[] {
  const rows = parseCsv(text);
  const header = rows[0] ?? [];
  return rows.slice(1).map((row) => {
    const kindRaw = col(header, row, "State or UT").toUpperCase();
    return {
      stateCode: col(header, row, "State Code"),
      stateNameRaw: col(header, row, "State Name"),
      stateName: titleCaseName(col(header, row, "State Name")),
      kind: kindRaw === "U" ? "territory" : "state",
    };
  });
}

function loadDistricts(text: string): DistrictRow[] {
  const rows = parseCsv(text);
  const header = rows[0] ?? [];
  return rows.slice(1).map((row) => ({
    stateCode: col(header, row, "State Code"),
    stateNameRaw: col(header, row, "State Name"),
    districtCode: col(header, row, "District Code"),
    districtNameRaw: col(header, row, "District Name"),
    districtName: titleCaseName(col(header, row, "District Name")),
  }));
}

export function validateIndiaLgd(states: StateRow[], districts: DistrictRow[]): IndiaLgdValidation {
  const errors: string[] = [];
  const stateCodes = new Map<string, number>();
  for (const s of states) {
    stateCodes.set(s.stateCode, (stateCodes.get(s.stateCode) ?? 0) + 1);
  }
  const duplicateStateCodes = Array.from(stateCodes.entries())
    .filter(([, n]) => n > 1)
    .map(([c]) => c);
  const districtCodes = new Map<string, number>();
  for (const d of districts) {
    districtCodes.set(d.districtCode, (districtCodes.get(d.districtCode) ?? 0) + 1);
  }
  const duplicateDistrictCodes = Array.from(districtCodes.entries())
    .filter(([, n]) => n > 1)
    .map(([c]) => c);

  const combo = new Map<string, number>();
  for (const d of districts) {
    const key = `${d.stateCode}::${titleCaseName(d.districtName)}`;
    combo.set(key, (combo.get(key) ?? 0) + 1);
  }
  const duplicateStateDistrictCombos = Array.from(combo.entries())
    .filter(([, n]) => n > 1)
    .map(([k]) => k);

  const knownStates = new Set(states.map((s) => s.stateCode));
  const districtsWithoutState = districts.filter((d) => !knownStates.has(d.stateCode));
  const emptyNames = [...states.filter((s) => !s.stateName), ...districts.filter((d) => !d.districtName)]
    .length;

  const nameCounts = new Map<string, number>();
  for (const d of districts) {
    const n = d.districtName.toUpperCase();
    nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1);
  }
  const homonymousDistricts = Array.from(nameCounts.entries())
    .filter(([, n]) => n > 1)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const kerala = states.find((s) => s.stateCode === "32");
  const keralaDistricts = districts
    .filter((d) => d.stateCode === "32")
    .map((d) => d.districtName)
    .sort();

  if (states.length < 28) errors.push(`Expected 28+ states/UTs, found ${states.length}`);
  if (districts.length < 700) errors.push(`Expected 700+ districts, found ${districts.length}`);
  if (duplicateStateCodes.length) errors.push("Duplicate LGD state codes");
  if (duplicateDistrictCodes.length) errors.push("Duplicate LGD district codes");
  if (duplicateStateDistrictCombos.length) errors.push("Duplicate state+district combinations");
  if (districtsWithoutState.length) errors.push("Districts without a parent state");
  if (emptyNames) errors.push("Empty names");
  if (!kerala) errors.push("Kerala (LGD 32) missing");
  const requiredKerala = [
    "Alappuzha",
    "Ernakulam",
    "Idukki",
    "Kannur",
    "Kasaragod",
    "Kollam",
    "Kottayam",
    "Kozhikode",
    "Malappuram",
    "Palakkad",
    "Pathanamthitta",
    "Thiruvananthapuram",
    "Thrissur",
    "Wayanad",
  ];
  for (const name of requiredKerala) {
    if (!keralaDistricts.includes(name)) errors.push(`Kerala missing district ${name}`);
  }

  return {
    states: states.length,
    districts: districts.length,
    duplicateStateDistrictCombos,
    districtsWithoutState,
    emptyNames,
    duplicateStateCodes,
    duplicateDistrictCodes,
    homonymousDistricts,
    keralaDistricts,
    errors,
  };
}

function formatReport(
  validation: IndiaLgdValidation,
  states: StateRow[],
  districts: DistrictRow[]
): string {
  const statesWithoutIndia = 0;
  return [
    "# India LGD validation report",
    "",
    "Source: Ministry of Panchayati Raj Local Government Directory (LGD).",
    "Files: `data/india-lgd/lgd-states.csv`, `data/india-lgd/lgd-districts.csv`.",
    "",
    "## Counts",
    "",
    `- States/UTs: ${validation.states}`,
    `- Districts: ${validation.districts}`,
    `- Duplicate state+district combinations: ${validation.duplicateStateDistrictCombos.length}`,
    `- Districts without a state: ${validation.districtsWithoutState.length}`,
    `- States without India as parent: ${statesWithoutIndia} (country is applied at import; every row is India)`,
    `- Empty names: ${validation.emptyNames}`,
    `- Duplicate LGD state codes: ${validation.duplicateStateCodes.length}`,
    `- Duplicate LGD district codes: ${validation.duplicateDistrictCodes.length}`,
    `- Homonymous district names (kept separate by parent + LGD code): ${validation.homonymousDistricts.length}`,
    "",
    "## Kerala districts",
    "",
    ...validation.keralaDistricts.map((n) => `- ${n}`),
    "",
    "## Homonyms (not merged)",
    "",
    ...validation.homonymousDistricts.map((h) => `- ${h.name} (${h.count} states)`),
    "",
    "## Errors",
    "",
    ...(validation.errors.length ? validation.errors.map((e) => `- ${e}`) : ["- none"]),
    "",
    `States/UTs in file: ${states.length}. Districts in file: ${districts.length}.`,
    "",
  ].join("\n");
}

function toCleanRows(states: StateRow[], districts: DistrictRow[]): CleanRow[] {
  const stateByCode = new Map(states.map((s) => [s.stateCode, s]));
  const rows: CleanRow[] = [];
  for (const d of districts) {
    const state = stateByCode.get(d.stateCode);
    if (!state) continue;
    rows.push({
      country: "India",
      state: state.stateName,
      district: d.districtName,
      state_lgd_code: state.stateCode,
      district_lgd_code: d.districtCode,
    });
  }
  rows.sort(
    (a, b) =>
      a.state.localeCompare(b.state) ||
      a.district.localeCompare(b.district) ||
      a.district_lgd_code.localeCompare(b.district_lgd_code)
  );
  return rows;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

async function writeTaxonomy(states: StateRow[], districts: DistrictRow[]) {
  const taxonomy = await getTaxonomyFromDb();
  let india = taxonomy.countries.find((c) => (c.code ?? "").toUpperCase() === "IN") ??
    taxonomy.countries.find((c) => c.name.trim().toLowerCase() === "india");
  if (!india) {
    india = {
      id: "c-lgd-in",
      name: "India",
      code: "IN",
      flag: "🇮🇳",
      currency: "INR",
      currencySymbol: "₹",
      exchangeRateToAED: 0.043,
      taxPct: 18,
      taxLabel: "GST",
      dialCode: "+91",
      enabled: true,
      comingSoon: false,
    };
    taxonomy.countries = [...taxonomy.countries, india];
  } else if (!india.code) {
    india = { ...india, code: "IN" };
    taxonomy.countries = taxonomy.countries.map((c) => (c.id === india!.id ? india! : c));
  }

  const indiaStateIds = new Set(
    taxonomy.states.filter((s) => s.countryId === india.id).map((s) => s.id)
  );
  const nextStates: State[] = [
    ...taxonomy.states.filter((s) => s.countryId !== india.id),
    ...states.map((s) => ({
      id: `s-lgd-${s.stateCode}`,
      name: s.stateName,
      countryId: india.id,
      enabled: true,
      code: s.stateCode,
      type: s.kind,
    })),
  ];
  const nextDistricts: District[] = [
    ...taxonomy.districts.filter((d) => !indiaStateIds.has(d.stateId)),
    ...districts.map((d) => ({
      id: `d-lgd-${d.districtCode}`,
      name: d.districtName,
      stateId: `s-lgd-${d.stateCode}`,
      enabled: true,
      code: d.districtCode,
    })),
  ];

  const saved = await saveTaxonomyToDb({
    ...taxonomy,
    states: nextStates,
    districts: nextDistricts,
  });
  return {
    indiaId: india.id,
    states: saved.states.filter((s) => s.countryId === india.id).length,
    districts: saved.districts.filter((d) => d.stateId.startsWith("s-lgd-")).length,
  };
}

async function ensureIdukkiTestListing() {
  const host = await prisma.listing.findFirst({ select: { hostId: true } });
  const hostId = host?.hostId;
  if (!hostId) return { created: false, reason: "no_host" };
  const existing = await prisma.listing.findUnique({ where: { id: "L-TEST-IDUKKI" } });
  const listing = {
    id: "L-TEST-IDUKKI",
    title: "LGD mapping test — Idukki",
    description: "Fixture listing for Country→State→District migration (Kerala / Idukki).",
    hostId,
    hostName: "LGD Test Host",
    status: "pending" as const,
    submittedAt: new Date().toISOString(),
    country: "India",
    state: "Kerala",
    district: "Idukki",
    parentCategory: "Stays",
    category: "Farm Stays",
    subcategory: "Organic/Working Farm Stay",
    type: "farmstay",
    city: "Idukki",
    customFilters: [],
    advancedFilters: [],
    photoUrls: [],
    photoCount: 0,
  };
  if (existing) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        country: "India",
        state: "Kerala",
        district: "Idukki",
        payload: JSON.stringify({ ...JSON.parse(existing.payload), ...listing }),
      },
    });
    return { created: false, updated: true };
  }
  await prisma.user.upsert({
    where: { id: hostId },
    update: {},
    create: {
      id: hostId,
      fullName: "LGD Test Host",
      roles: JSON.stringify(["host"]),
    },
  });
  await prisma.listing.create({
    data: {
      id: listing.id,
      propertyReference: createPropertyReference(),
      hostId,
      title: listing.title,
      status: listing.status,
      payload: JSON.stringify(listing),
      country: listing.country,
      state: listing.state,
      district: listing.district,
      parentCategory: listing.parentCategory,
      category: listing.category,
      subcategory: listing.subcategory,
    },
  });
  return { created: true };
}

async function main() {
  const writeTaxonomyFlag = process.argv.includes("--write-taxonomy");
  const stateText = await readFile(STATES_FILE, "utf8");
  const districtText = await readFile(DISTRICTS_FILE, "utf8");
  const states = loadStates(stateText);
  const districts = loadDistricts(districtText);
  const validation = validateIndiaLgd(states, districts);
  const clean = toCleanRows(states, districts);

  await mkdir(ROOT, { recursive: true });
  const header = "country,state,district,state_lgd_code,district_lgd_code";
  const body = clean
    .map((r) =>
      [r.country, r.state, r.district, r.state_lgd_code, r.district_lgd_code]
        .map(csvEscape)
        .join(",")
    )
    .join("\n");
  await writeFile(CLEAN_CSV, `${header}\n${body}\n`, "utf8");
  await writeFile(REPORT, formatReport(validation, states, districts), "utf8");

  console.log(formatReport(validation, states, districts));
  console.log(`Wrote ${CLEAN_CSV}`);
  console.log(`Wrote ${REPORT}`);

  if (validation.errors.length) {
    process.exitCode = 1;
    return;
  }

  if (writeTaxonomyFlag) {
    const result = await writeTaxonomy(states, districts);
    const listing = await ensureIdukkiTestListing();
    console.log("Wrote PlatformCatalog India states/districts", result);
    console.log("Idukki test listing", listing);
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
