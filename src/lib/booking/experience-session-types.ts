export type ExperiencePriceMode = "per_person" | "per_group";

export type ExperienceSessionTemplate = {
  key: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  priceMode: ExperiencePriceMode;
  price: number;
};

export function normalizeExperienceSessions(
  raw: unknown
): ExperienceSessionTemplate[] {
  if (!Array.isArray(raw)) return [];
  const out: ExperienceSessionTemplate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const key = typeof row.key === "string" ? row.key.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!key || !label) continue;
    const priceMode: ExperiencePriceMode =
      row.priceMode === "per_group" ? "per_group" : "per_person";
    out.push({
      key,
      label,
      startTime: typeof row.startTime === "string" ? row.startTime : "09:00",
      endTime: typeof row.endTime === "string" ? row.endTime : "13:00",
      capacity: Math.max(1, Math.floor(Number(row.capacity) || 1)),
      priceMode,
      price: Math.max(0, Number(row.price) || 0),
    });
  }
  return out;
}

export function defaultExperienceSessions(): ExperienceSessionTemplate[] {
  return [
    {
      key: "morning",
      label: "Morning",
      startTime: "09:00",
      endTime: "13:00",
      capacity: 6,
      priceMode: "per_person",
      price: 0,
    },
    {
      key: "evening",
      label: "Evening",
      startTime: "15:30",
      endTime: "22:00",
      capacity: 6,
      priceMode: "per_person",
      price: 0,
    },
  ];
}
