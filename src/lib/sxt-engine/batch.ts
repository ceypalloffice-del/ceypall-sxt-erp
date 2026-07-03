// Multi-customer batch costing.
// Each item's cost is allocated proportionally by cubic metres (volume).
// This is the fairest allocation: a customer with more cubic metres of timber
// in the kiln bears a larger share of the fixed electricity cost.

import { measureTimber } from "./units";
import { calcUtilisation } from "./capacity";
import { calcElectricityCost, allocateCost } from "./cost";
import { calcRevenue } from "./pricing";
import { calcProfit, calcMarginPct } from "./profit";
import type { BatchItemInput, BatchItemResult, BatchResult, ElectricitySettings } from "./types";

export function computeBatch(
  items: BatchItemInput[],
  kiln_capacity_m3: number,
  elec: ElectricitySettings,
  labour_cost: number
): BatchResult {
  const measured = items.map((item) => ({
    ...item,
    ...measureTimber(item.thickness_in, item.width_in, item.length_ft, item.qty),
    display_name:
      item.customer_name?.trim() ||
      (item.customer_id ? `Customer ${item.customer_id.slice(0, 6)}` : "Walk-in"),
  }));

  const total_m3 = measured.reduce((s, i) => s + i.cubic_m3, 0);
  const total_sqft = measured.reduce((s, i) => s + i.sqft, 0);
  const total_lft = measured.reduce((s, i) => s + i.lft, 0);

  const electricity_cost = calcElectricityCost(elec);
  const total_cost = electricity_cost + labour_cost;

  const kiln = calcUtilisation(total_m3, kiln_capacity_m3);

  const resultItems: BatchItemResult[] = measured.map((item) => {
    const allocated_cost = allocateCost(item.cubic_m3, total_m3, total_cost);
    const revenue = calcRevenue(item.sqft, item.rate_per_sqft);
    const profit = calcProfit(revenue, allocated_cost);
    const margin_pct = calcMarginPct(revenue, allocated_cost);
    return { ...item, allocated_cost, revenue, profit, margin_pct };
  });

  const total_revenue = resultItems.reduce((s, i) => s + i.revenue, 0);
  const total_profit = calcProfit(total_revenue, total_cost);
  const overall_margin = calcMarginPct(total_revenue, total_cost);

  return {
    items: resultItems,
    kiln,
    totals: {
      m3: total_m3,
      sqft: total_sqft,
      lft: total_lft,
      electricity_cost,
      labour_cost,
      total_cost,
      revenue: total_revenue,
      profit: total_profit,
      margin_pct: overall_margin,
    },
  };
}
