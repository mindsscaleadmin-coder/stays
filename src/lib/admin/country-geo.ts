import type { District, State, TaxonomyData } from "@/lib/admin/taxonomy-types";

export interface CountryGeoState {
  name: string;
  districts: string[];
}

function locId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Built-in state/district packs keyed by ISO country code. */
export const COUNTRY_GEO_PRESETS: Record<string, CountryGeoState[]> = {
  AE: [
    {
      name: "Abu Dhabi",
      districts: ["Al Ain", "Al Dhafra", "Liwa", "Abu Dhabi City"],
    },
    { name: "Dubai", districts: ["Hatta", "Dubai City", "Jebel Ali"] },
    { name: "Sharjah", districts: ["Kalba", "Khor Fakkan", "Sharjah City"] },
    { name: "Ajman", districts: ["Ajman City"] },
    { name: "Umm Al Quwain", districts: ["Umm Al Quwain City"] },
    { name: "Ras Al Khaimah", districts: ["Ras Al Khaimah City"] },
    { name: "Fujairah", districts: ["Fujairah City", "Dibba"] },
  ],
  SA: [
    { name: "Riyadh", districts: ["Riyadh City", "Diriyah", "Al Kharj"] },
    { name: "Makkah", districts: ["Jeddah", "Makkah City", "Taif"] },
    { name: "Madinah", districts: ["Madinah City", "Yanbu"] },
    { name: "Eastern Province", districts: ["Dammam", "Al Khobar", "Al Ahsa"] },
    { name: "Asir", districts: ["Abha", "Khamis Mushait"] },
    { name: "Tabuk", districts: ["Tabuk City", "Al Ula"] },
  ],
  OM: [
    { name: "Muscat", districts: ["Muscat City", "Muttrah", "Seeb"] },
    { name: "Dhofar", districts: ["Salalah", "Mirbat"] },
    { name: "Al Batinah North", districts: ["Sohar", "Shinas"] },
    { name: "Ad Dakhiliyah", districts: ["Nizwa", "Bahla"] },
    { name: "Ash Sharqiyah South", districts: ["Sur"] },
  ],
  QA: [
    { name: "Doha", districts: ["West Bay", "The Pearl", "Al Sadd"] },
    { name: "Al Rayyan", districts: ["Education City", "Al Wakrah"] },
    { name: "Al Khor", districts: ["Al Khor City"] },
    { name: "Al Daayen", districts: ["Lusail"] },
  ],
  IN: [
    { name: "Kerala", districts: ["Kochi", "Munnar", "Wayanad", "Alleppey"] },
    { name: "Goa", districts: ["North Goa", "South Goa"] },
    { name: "Rajasthan", districts: ["Jaipur", "Udaipur", "Jodhpur"] },
    { name: "Himachal Pradesh", districts: ["Manali", "Shimla", "Dharamshala"] },
    { name: "Karnataka", districts: ["Coorg", "Chikmagalur", "Bengaluru"] },
  ],
};

export function getCountryGeoPreset(code?: string): CountryGeoState[] | null {
  if (!code) return null;
  return COUNTRY_GEO_PRESETS[code.trim().toUpperCase()] ?? null;
}

export function hasCountryGeoPreset(code?: string): boolean {
  return Boolean(getCountryGeoPreset(code));
}

export function buildLocationRows(
  countryId: string,
  geo: CountryGeoState[]
): { states: State[]; districts: District[] } {
  const states: State[] = [];
  const districts: District[] = [];

  for (const item of geo) {
    const stateName = item.name.trim();
    if (!stateName) continue;
    const stateId = locId("s");
    states.push({ id: stateId, name: stateName, countryId });
    for (const districtName of item.districts) {
      const name = districtName.trim();
      if (!name) continue;
      districts.push({ id: locId("d"), name, stateId });
    }
  }

  return { states, districts };
}

export function applyCountryLocations(
  data: TaxonomyData,
  countryId: string,
  geo: CountryGeoState[],
  mode: "merge" | "replace" = "merge"
): { data: TaxonomyData; statesAdded: number; districtsAdded: number } {
  const built = buildLocationRows(countryId, geo);

  if (mode === "replace") {
    const existingStateIds = data.states
      .filter((s) => s.countryId === countryId)
      .map((s) => s.id);
    return {
      data: {
        ...data,
        states: [
          ...data.states.filter((s) => s.countryId !== countryId),
          ...built.states,
        ],
        districts: [
          ...data.districts.filter((d) => !existingStateIds.includes(d.stateId)),
          ...built.districts,
        ],
        cities: (data.cities ?? []).filter((c) => {
          const district = data.districts.find((d) => d.id === c.districtId);
          return !district || !existingStateIds.includes(district.stateId);
        }),
      },
      statesAdded: built.states.length,
      districtsAdded: built.districts.length,
    };
  }

  const nextStates = [...data.states];
  const nextDistricts = [...data.districts];
  const stateIdByName = new Map(
    data.states
      .filter((s) => s.countryId === countryId)
      .map((s) => [s.name.toLowerCase(), s.id] as const)
  );

  let statesAdded = 0;
  let districtsAdded = 0;

  for (const state of built.states) {
    const key = state.name.toLowerCase();
    let stateId = stateIdByName.get(key);
    if (!stateId) {
      nextStates.push(state);
      stateId = state.id;
      stateIdByName.set(key, stateId);
      statesAdded += 1;
    }

    const districtNames = built.districts
      .filter((d) => d.stateId === state.id)
      .map((d) => d.name);
    const existingDistrictNames = new Set(
      nextDistricts
        .filter((d) => d.stateId === stateId)
        .map((d) => d.name.toLowerCase())
    );

    for (const name of districtNames) {
      if (existingDistrictNames.has(name.toLowerCase())) continue;
      nextDistricts.push({ id: locId("d"), name, stateId });
      existingDistrictNames.add(name.toLowerCase());
      districtsAdded += 1;
    }
  }

  return {
    data: { ...data, states: nextStates, districts: nextDistricts },
    statesAdded,
    districtsAdded,
  };
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "").trim();
}

function normalizeHeader(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isIdOrCodeHeader(header: string): boolean {
  return /(?:^| )(code|id|iso|iso2|iso3|fips|gid|uid|pk|lgd|census|year|s no|sl no|serial|index)(?:$| )/.test(
    header
  );
}

function detectDelimiter(headerLine: string): string {
  const counts = [
    { d: ",", n: (headerLine.match(/,/g) ?? []).length },
    { d: ";", n: (headerLine.match(/;/g) ?? []).length },
    { d: "\t", n: (headerLine.match(/\t/g) ?? []).length },
    { d: "|", n: (headerLine.match(/\|/g) ?? []).length },
  ];
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ",";
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  if (delimiter === ",") return splitCsvLine(line).map((c) => c.trim());
  return line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
}

function scoreHeader(header: string, patterns: { re: RegExp; score: number }[]): number {
  if (isIdOrCodeHeader(header)) return -1;
  let best = -1;
  for (const { re, score } of patterns) {
    if (re.test(header) && score > best) best = score;
  }
  return best;
}

const STATE_HEADER_SCORES: { re: RegExp; score: number }[] = [
  { re: /^name 1$/, score: 100 },
  { re: /^admin ?1( name)?$/, score: 95 },
  { re: /^(state|province|region|governorate|emirate|subdivision)( name| nm)?$/, score: 90 },
  { re: /^(st nm|stname|statename)$/, score: 88 },
  { re: /^state ut$/, score: 86 },
  { re: /(state|province|region|governorate|emirate).*(name|nm)$/, score: 80 },
  { re: /^(state|province|region|governorate|emirate)$/, score: 70 },
];

const DISTRICT_HEADER_SCORES: { re: RegExp; score: number }[] = [
  { re: /^name 2$/, score: 100 },
  { re: /^admin ?2( name)?$/, score: 95 },
  { re: /^(district|city|county|taluk|tehsil|locality|area)( name| nm)?$/, score: 90 },
  { re: /^(dtname|dist name|distname|districtname)$/, score: 88 },
  { re: /(district|city|county).*(name|nm)$/, score: 80 },
  { re: /^(district|city|county|taluk|tehsil)$/, score: 70 },
];

function pickColumn(headers: string[], patterns: { re: RegExp; score: number }[]): number {
  let bestIdx = -1;
  let bestScore = -1;
  headers.forEach((header, idx) => {
    const score = scoreHeader(header, patterns);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });
  return bestScore >= 0 ? bestIdx : -1;
}

function looksLikeHeaderRow(cols: string[]): boolean {
  return pickColumn(cols, STATE_HEADER_SCORES) >= 0 || pickColumn(cols, DISTRICT_HEADER_SCORES) >= 0;
}

/** One row per district (or a state with no districts). Used by the upload preview table. */
export function flattenLocationRows(geo: CountryGeoState[]): { state: string; district: string }[] {
  const rows: { state: string; district: string }[] = [];
  for (const item of geo) {
    if (item.districts.length === 0) {
      rows.push({ state: item.name, district: "" });
      continue;
    }
    for (const district of item.districts) {
      rows.push({ state: item.name, district });
    }
  }
  return rows;
}

/** Parse CSV from data portals: `state,district`, `State Name,District Name`, GADM `NAME_1,NAME_2`. */
export function parseLocationCsv(text: string): CountryGeoState[] {
  const lines = stripBom(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const firstCols = splitDelimitedLine(lines[0], delimiter).map(normalizeHeader);
  const hasHeader = looksLikeHeaderRow(firstCols);

  const headers = hasHeader ? firstCols : [];
  const stateIdx = hasHeader ? pickColumn(headers, STATE_HEADER_SCORES) : 0;
  let districtIdx = hasHeader ? pickColumn(headers, DISTRICT_HEADER_SCORES) : 1;
  if (stateIdx >= 0 && districtIdx === stateIdx) districtIdx = stateIdx + 1;
  const start = hasHeader ? 1 : 0;
  const resolvedStateIdx = stateIdx >= 0 ? stateIdx : 0;

  const map = new Map<string, string[]>();

  for (let i = start; i < lines.length; i++) {
    const cols = splitDelimitedLine(lines[i], delimiter);
    const state = (cols[resolvedStateIdx] ?? "").trim();
    const district = (districtIdx >= 0 ? cols[districtIdx] ?? "" : "").trim();
    if (!state) continue;
    if (!map.has(state)) map.set(state, []);
    if (district && !map.get(state)!.includes(district)) {
      map.get(state)!.push(district);
    }
  }

  return Array.from(map.entries()).map(([name, districts]) => ({ name, districts }));
}

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      cols.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cols.push(current);
  return cols;
}

function foldGeoRows(
  rows: { name: string; districts: string[] }[]
): CountryGeoState[] {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    if (!map.has(name)) map.set(name, []);
    const list = map.get(name)!;
    for (const district of row.districts) {
      const d = district.trim();
      if (d && !list.includes(d)) list.push(d);
    }
  }
  return Array.from(map.entries()).map(([name, districts]) => ({ name, districts }));
}

function firstString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const direct = row[key];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    const match = Object.keys(row).find((k) => normalizeHeader(k) === normalizeHeader(key));
    if (match && typeof row[match] === "string" && String(row[match]).trim()) {
      return String(row[match]).trim();
    }
  }
  return "";
}

function geoFromUnknownItem(item: unknown, index: number): { name: string; districts: string[] } {
  if (!item || typeof item !== "object") {
    throw new Error(`Invalid state entry at index ${index}.`);
  }
  const raw = item as Record<string, unknown>;
  const row =
    raw.properties && typeof raw.properties === "object"
      ? (raw.properties as Record<string, unknown>)
      : raw;

  const name = firstString(row, [
    "state",
    "state_name",
    "statename",
    "st_nm",
    "NAME_1",
    "name_1",
    "admin1Name",
    "admin1",
    "province",
    "region",
    "governorate",
    "name",
  ]);
  if (!name) throw new Error(`Missing state name at index ${index}.`);
  const districtsRaw = row.districts ?? row.cities ?? row.areas;
  const districts = Array.isArray(districtsRaw)
    ? districtsRaw.map((d) => String(d).trim()).filter(Boolean)
    : [
        firstString(row, [
          "district",
          "district_name",
          "districtname",
          "dtname",
          "NAME_2",
          "name_2",
          "admin2Name",
          "admin2",
          "city",
          "county",
        ]),
      ].filter(Boolean);
  return { name, districts };
}

function extractJsonRows(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.features)) return obj.features;
  const nested = obj.states ?? obj.locations ?? obj.data ?? obj.rows ?? obj.records;
  return Array.isArray(nested) ? nested : null;
}

/** Parse JSON: `{ state, districts[] }`, flat `{ state, district }`, or GeoJSON features. */
export function parseLocationJson(text: string): CountryGeoState[] {
  const parsed = JSON.parse(stripBom(text)) as unknown;
  const list = extractJsonRows(parsed);
  if (!list) {
    throw new Error("JSON must be an array of states, or { \"states\": [...] } / GeoJSON features.");
  }

  return foldGeoRows(list.map((item, index) => geoFromUnknownItem(item, index)));
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.readAsText(file);
  });
}

export async function parseLocationUpload(file: File): Promise<CountryGeoState[]> {
  const lower = file.name.toLowerCase();
  if (/\.(xlsx|xls|ods)$/.test(lower)) {
    throw new Error("Excel files are not supported. Export as CSV or JSON first.");
  }
  const text = await readFileText(file);
  if (!text.trim()) {
    throw new Error("This file is empty.");
  }
  if (lower.endsWith(".json") || lower.endsWith(".geojson")) {
    return parseLocationJson(text);
  }
  if (lower.endsWith(".csv") || lower.endsWith(".txt") || lower.endsWith(".tsv")) {
    return parseLocationCsv(text);
  }
  const trimmed = stripBom(text);
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) return parseLocationJson(text);
  return parseLocationCsv(text);
}

export const LOCATION_UPLOAD_TEMPLATE_CSV = `state,district
Example State,Example District
Example State,Another District
Another State,
`;

export const LOCATION_UPLOAD_TEMPLATE_JSON = `[
  { "state": "Example State", "districts": ["Example District", "Another District"] },
  { "state": "Another State", "districts": [] }
]
`;
