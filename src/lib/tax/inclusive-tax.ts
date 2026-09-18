/** Extract tax embedded in a GST-inclusive price (India launch). */
export function extractInclusiveTax(
  inclusiveAmount: number,
  taxPct: number
): { taxAmount: number; netAmount: number } {
  const amount = Math.max(0, inclusiveAmount);
  const pct = Math.max(0, taxPct);
  if (pct === 0 || amount === 0) {
    return { taxAmount: 0, netAmount: amount };
  }
  const taxAmount = Math.round((amount * pct) / (100 + pct));
  return { taxAmount, netAmount: amount - taxAmount };
}
