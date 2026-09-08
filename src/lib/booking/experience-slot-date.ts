/** Normalize YYYY-MM-DD to UTC midnight Date for ExperienceSlot.date. */
export function experienceSlotDate(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) throw new Error(`Invalid experience date: ${isoDate}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0));
}

export function experienceSlotDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
