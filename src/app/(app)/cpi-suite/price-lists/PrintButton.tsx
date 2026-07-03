"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="hidden rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 print:hidden sm:inline-flex"
    >
      Print
    </button>
  );
}
