import type { City, District, State } from "@/lib/admin/taxonomy-types";

export type DestinationHit = {
  kind: "state" | "district" | "city";
  key: string;
  name: string;
  subtitle: string;
  stateId: string;
  districtId?: string;
  cityId?: string;
};

function enabled<T extends { enabled?: boolean }>(row: T): boolean {
  return row.enabled !== false;
}

function score(name: string, query: string): number {
  const n = name.trim().toLowerCase();
  if (!query) return 1;
  if (n === query) return 0;
  if (n.startsWith(query)) return 1;
  if (n.includes(query)) return 2;
  return 9;
}

export function searchDestinations(
  countryId: string,
  query: string,
  catalog: { states: State[]; districts: District[]; cities?: City[] },
  limit = 12
): DestinationHit[] {
  if (!countryId) return [];

  const q = query.trim().toLowerCase();
  const states = catalog.states.filter((s) => enabled(s) && s.countryId === countryId);
  const stateById = new Map(states.map((s) => [s.id, s] as const));
  const districts = catalog.districts.filter(
    (d) => enabled(d) && stateById.has(d.stateId)
  );
  const districtById = new Map(districts.map((d) => [d.id, d] as const));
  const cities = (catalog.cities ?? []).filter(
    (c) => enabled(c) && districtById.has(c.districtId)
  );

  if (!q) {
    return states.slice(0, 40).map((s) => ({
      kind: "state" as const,
      key: `state:${s.id}`,
      name: s.name,
      subtitle: "State",
      stateId: s.id,
    }));
  }

  const hits: (DestinationHit & { rank: number })[] = [];

  for (const s of states) {
    const rank = score(s.name, q);
    if (rank > 2) continue;
    hits.push({
      kind: "state",
      key: `state:${s.id}`,
      name: s.name,
      subtitle: "State",
      stateId: s.id,
      rank,
    });
  }

  for (const d of districts) {
    const rank = score(d.name, q);
    if (rank > 2) continue;
    const state = stateById.get(d.stateId);
    hits.push({
      kind: "district",
      key: `district:${d.id}`,
      name: d.name,
      subtitle: state?.name ?? "District",
      stateId: d.stateId,
      districtId: d.id,
      rank,
    });
  }

  for (const c of cities) {
    const rank = score(c.name, q);
    if (rank > 2) continue;
    const district = districtById.get(c.districtId);
    const state = district ? stateById.get(district.stateId) : undefined;
    hits.push({
      kind: "city",
      key: `city:${c.id}`,
      name: c.name,
      subtitle: [district?.name, state?.name].filter(Boolean).join(", "),
      stateId: district?.stateId ?? "",
      districtId: c.districtId,
      cityId: c.id,
      rank,
    });
  }

  hits.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  return hits.slice(0, limit).map((hit) => {
    const { rank, ...rest } = hit;
    void rank;
    return rest;
  });
}
