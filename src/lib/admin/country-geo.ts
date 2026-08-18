import type { District, State } from "@/lib/admin/taxonomy-types";

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

/** Parse CSV: `state,district` (header optional). District column may be empty. */
export function parseLocationCsv(text: string): CountryGeoState[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const start =
    /state/i.test(lines[0].split(",")[0] ?? "") || /district/i.test(lines[0])
      ? 1
      : 0;

  const map = new Map<string, string[]>();

  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const state = (cols[0] ?? "").trim();
    const district = (cols[1] ?? "").trim();
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

/** Parse JSON array of `{ state, districts[] }` or `{ name, districts[] }`. */
export function parseLocationJson(text: string): CountryGeoState[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("JSON must be an array of states.");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid state entry at index ${index}.`);
    }
    const row = item as Record<string, unknown>;
    const name = String(row.state ?? row.name ?? "").trim();
    if (!name) throw new Error(`Missing state name at index ${index}.`);
    const districtsRaw = row.districts;
    const districts = Array.isArray(districtsRaw)
      ? districtsRaw.map((d) => String(d).trim()).filter(Boolean)
      : typeof row.district === "string" && row.district.trim()
        ? [row.district.trim()]
        : [];
    return { name, districts };
  });
}

export async function parseLocationUpload(file: File): Promise<CountryGeoState[]> {
  const text = await file.text();
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".json")) {
    return parseLocationJson(text);
  }
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    return parseLocationCsv(text);
  }
  // Heuristic by content
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) return parseLocationJson(text);
  return parseLocationCsv(text);
}

export const LOCATION_UPLOAD_TEMPLATE_CSV = `state,district
Example State,Example District
Example State,Another District
Another State,
`;
