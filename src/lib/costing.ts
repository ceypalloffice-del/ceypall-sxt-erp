export type CostingTotals = {
  grandTotal: number;
  profitAmount: number;
  finalPrice: number;
};

export function computeCosting(grandTotal: number, marginPct: number): CostingTotals {
  const profitAmount = grandTotal * marginPct;
  return { grandTotal, profitAmount, finalPrice: grandTotal + profitAmount };
}
