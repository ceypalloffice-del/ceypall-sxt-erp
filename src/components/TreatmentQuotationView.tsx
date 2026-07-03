"use client";

import { useMemo, useState } from "react";

type QuoteData = {
  service: string;
  item_kind: string;
  thickness: string | null;
  height: string | null;
  width: string | null;
  qty: number;
  rate_used: number;
};

const SERVICE_LABEL: Record<string, string> = {
  kiln_drying: "Kiln Drying",
  impregnation: "Chemical (Boron) Impregnation",
};

export function TreatmentQuotationView({
  quote,
  defaultUnitPrice,
  defaultCustomerName,
  defaultCustomerAddress,
}: {
  quote: QuoteData;
  defaultUnitPrice: number;
  defaultCustomerName: string;
  defaultCustomerAddress: string;
}) {
  const today = useMemo(() => new Date(), []);
  const inTwoWeeks = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 14);
    return d;
  }, [today]);

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [customerAddress, setCustomerAddress] = useState(defaultCustomerAddress);
  const [date, setDate] = useState(fmt(today));
  const [validUntil, setValidUntil] = useState(fmt(inTwoWeeks));
  const [unitPrice, setUnitPrice] = useState(String(Math.round(defaultUnitPrice)));

  const spec =
    quote.item_kind === "plank" ? `${quote.thickness} thick plank` : `${quote.height} x ${quote.width} beam`;
  const unitLabel = quote.item_kind === "plank" ? "sqft" : "LFT";

  return (
    <div className="min-h-screen bg-[#F5F6F8] py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl px-4 print:px-0">
        <div className="mb-4 flex justify-end gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-10 print:rounded-none print:border-0 print:p-0">
          <div className="flex items-start justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold tracking-wide text-slate-900">ST. XAVIER TIMBER</h2>
              <p className="text-xs text-slate-500">Daluwakotuwa</p>
              <p className="mt-1 text-xs text-slate-500">1088, Daluwakotuwa, Kochchikade, Sri Lanka.</p>
              <p className="text-xs text-slate-500">Office: 031 22 777 52 / Mobile: 076 94 94 944, 071 47 11 417</p>
              <p className="text-xs text-slate-500">info@stxaviertimber.com / www.stxaviertimber.com</p>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-slate-900">QUOTATION</h1>
              <div className="mt-2 text-xs text-slate-500">
                <p>
                  DATE{" "}
                  <input
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-24 rounded border border-slate-200 px-1 text-right font-mono tabular-nums print:border-0"
                  />
                </p>
                <p>
                  VALID UNTIL{" "}
                  <input
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-24 rounded border border-slate-200 px-1 text-right font-mono tabular-nums print:border-0"
                  />
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer details</h3>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="mt-2 block w-full rounded border border-slate-200 px-2 py-1 text-sm font-medium text-slate-900 print:border-0 print:p-0"
            />
            <textarea
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Customer address"
              rows={2}
              className="mt-1 block w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-600 print:border-0 print:p-0"
            />
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Service description</h3>
            <table className="mt-2 w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-600">Service</td>
                  <td className="py-1.5 text-right font-mono tabular-nums text-slate-900">
                    {SERVICE_LABEL[quote.service] ?? quote.service}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-600">Item</td>
                  <td className="py-1.5 text-right font-mono tabular-nums text-slate-900">{spec}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-600">Quantity</td>
                  <td className="py-1.5 text-right font-mono tabular-nums text-slate-900">
                    {quote.qty} {unitLabel}
                  </td>
                </tr>
                <tr className="border-t border-slate-200">
                  <td className="py-2 font-medium text-slate-700">Quoted price</td>
                  <td className="py-2 text-right">
                    <span className="font-mono tabular-nums">LKR</span>{" "}
                    <input
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-28 rounded border border-slate-200 px-1 text-right font-mono font-semibold tabular-nums print:border-0"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-xs text-slate-500">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Additional information</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Boron chemical treatment MSDS certificates can be provided upon request.</li>
              <li>Above prices are quoted without including tax.</li>
            </ul>
          </div>

          <div className="mt-4 text-xs text-slate-500">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment terms</h3>
            <p className="mt-2">
              Production will commence upon receipt of a 50% advance payment. The remaining 50% balance must be
              settled in full on or before delivery or collection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
