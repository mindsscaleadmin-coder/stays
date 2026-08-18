/** Server-side experience add-on prices (mirrors checkout UI). */
export const EXPERIENCE_PRICES: Record<string, { title: string; amount: number }> = {
  "farm-tour": { title: "Farm Tour", amount: 75 },
  "fruit-picking": { title: "Fruit Picking", amount: 50 },
  "bbq-evening": { title: "BBQ Evening", amount: 120 },
  "camel-riding": { title: "Camel Riding", amount: 90 },
};

export function sumExperienceTotal(experienceIds: string[], guestCount: number): number {
  const guests = Math.max(1, guestCount);
  return experienceIds.reduce(
    (sum, id) => sum + (EXPERIENCE_PRICES[id]?.amount ?? 0) * guests,
    0
  );
}
