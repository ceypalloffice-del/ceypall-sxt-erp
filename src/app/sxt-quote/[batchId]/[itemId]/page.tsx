import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { measureTimber } from "@/lib/sxt-engine/units";
import { allocateCost, calcElectricityCost } from "@/lib/sxt-engine/cost";
import { calcRevenue } from "@/lib/sxt-engine/pricing";
import { calcProfit, calcMarginPct } from "@/lib/sxt-engine/profit";

const fmtLKR = (n: number) => `LKR ${Math.round(n).toLocaleString()}`;

export default async function SxtQuotePage({
  params,
}: {
  params: Promise<{ batchId: string; itemId: string }>;
}) {
  const { batchId, itemId } = await params;
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) redirect("/login");

  const [batchRes, itemRes, allItemsRes, settingsRes] = await Promise.all([
    supabase.from("sxt_batches").select("*").eq("id", batchId).single(),
    supabase
      .from("sxt_batch_items")
      .select("*, customers(name)")
      .eq("id", itemId)
      .single(),
    supabase.from("sxt_batch_items").select("thickness_in, width_in, length_ft, qty").eq("batch_id", batchId),
    supabase.from("sxt_settings").select("key, value"),
  ]);

  const batch = batchRes.data;
  const item = itemRes.data;
  if (!batch || !item) notFound();

  const allItems = allItemsRes.data ?? [];
  const settings = Object.fromEntries((settingsRes.data ?? []).map((r) => [r.key, r.value]));

  // Compute total batch m³ for cost allocation
  const total_m3 = allItems.reduce((sum, i) => {
    const m = measureTimber(Number(i.thickness_in), Number(i.width_in), Number(i.length_ft), Number(i.qty));
    return sum + m.cubic_m3;
  }, 0);

  const electricity_cost = calcElectricityCost({
    units_per_day: Number(batch.electricity_units_per_day),
    days: Number(batch.drying_days),
    rate_per_unit: Number(batch.electricity_rate),
  });
  const total_cost = electricity_cost + Number(batch.labour_cost);

  const m = measureTimber(
    Number(item.thickness_in),
    Number(item.width_in),
    Number(item.length_ft),
    Number(item.qty)
  );

  const allocated_cost = allocateCost(m.cubic_m3, total_m3, total_cost);
  const rate = Number(item.rate_per_sqft ?? 0);
  const revenue = calcRevenue(m.sqft, rate);
  const profit = calcProfit(revenue, allocated_cost);
  const margin = calcMarginPct(revenue, allocated_cost);

  const customerName = item.customer_name || (item.customers as { name?: string } | null)?.name || "Walk-in Customer";
  const companyName = settings.company_name || "St. Xavier Timber";
  const companyAddr = settings.company_address || "";
  const companyPhone = settings.company_phone || "";
  const terms = settings.quotation_terms || "";

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const quoteRef = `${batch.batch_no}-Q`;

  const description = `${item.treatment_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} — ${item.thickness_in}" × ${item.width_in}" × ${item.length_ft}' — ${item.qty} pcs`;

  return (
    <html>
      <head>
        <title>{quoteRef} — {customerName}</title>
        <style>{`
          @page { margin: 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, system-ui, sans-serif; font-size: 14px; color: #1e293b; }
          .logo { font-size: 22px; font-weight: 700; color: #185FA5; letter-spacing: -0.5px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #185FA5; margin-bottom: 28px; }
          .section { margin-bottom: 28px; }
          .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; }
          th { font-size: 11px; font-weight: 600; text-align: left; color: #64748b; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
          td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
          .mono { font-family: 'Courier New', monospace; }
          .right { text-align: right; }
          .totals { background: #f8fafc; }
          .totals td { font-weight: 600; font-size: 15px; }
          .terms { font-size: 12px; color: #64748b; line-height: 1.6; }
          .ref-box { background: #E6F1FB; border-radius: 8px; padding: 12px 16px; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        `}</style>
      </head>
      <body>
        <div className="header">
          <div>
            <div className="logo">{companyName}</div>
            {companyAddr && <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>{companyAddr}</div>}
            {companyPhone && <div style={{ fontSize: 12, color: "#64748b" }}>{companyPhone}</div>}
          </div>
          <div className="ref-box" style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>Quotation</div>
            <div style={{ fontFamily: "Courier New, monospace", fontWeight: 700, fontSize: 18, color: "#185FA5", marginTop: 2 }}>
              {quoteRef}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{today}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 48, marginBottom: 28 }}>
          <div className="section">
            <div className="section-title">Prepared for</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{customerName}</div>
          </div>
          <div className="section">
            <div className="section-title">Batch reference</div>
            <div style={{ fontFamily: "Courier New, monospace", fontWeight: 600 }}>{batch.batch_no}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {batch.drying_days} days drying
            </div>
          </div>
        </div>

        <div className="section">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th className="right">Sqft</th>
                <th className="right">Rate / sqft</th>
                <th className="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{description}</td>
                <td className="right mono">{m.sqft.toLocaleString()}</td>
                <td className="right mono">LKR {rate.toFixed(2)}</td>
                <td className="right mono">{fmtLKR(revenue)}</td>
              </tr>
              <tr className="totals">
                <td colSpan={2} />
                <td className="right" style={{ fontSize: 12, color: "#64748b" }}>Total</td>
                <td className="right mono">{fmtLKR(revenue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          <div className="section">
            <div className="section-title">Measurements</div>
            <table>
              <tbody>
                {[
                  ["Linear feet", `${m.lft.toLocaleString()} ft`],
                  ["Square feet", `${m.sqft.toLocaleString()} sqft`],
                  ["Cubic feet", `${m.cubic_ft.toFixed(2)} ft³`],
                  ["Cubic metres", `${m.cubic_m3} m³`],
                ].map(([l, v]) => (
                  <tr key={l}>
                    <td style={{ color: "#64748b", fontSize: 12, paddingLeft: 0 }}>{l}</td>
                    <td className="mono right" style={{ paddingRight: 0 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="section">
            <div className="section-title">Treatment summary</div>
            <table>
              <tbody>
                {[
                  ["Treatment type", description.split("—")[0].trim()],
                  ["Pieces", `${item.qty}`],
                  ["Size", `${item.thickness_in}" × ${item.width_in}" × ${item.length_ft}'`],
                ].map(([l, v]) => (
                  <tr key={l}>
                    <td style={{ color: "#64748b", fontSize: 12, paddingLeft: 0 }}>{l}</td>
                    <td className="right" style={{ paddingRight: 0 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {terms && (
          <div className="section">
            <div className="section-title">Terms & Conditions</div>
            <p className="terms">{terms}</p>
          </div>
        )}

        <div style={{ marginTop: 48, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8" }}>
          <span>Prepared by St. Xavier Timber — {today}</span>
          <span>{quoteRef}</span>
        </div>
      </body>
    </html>
  );
}
