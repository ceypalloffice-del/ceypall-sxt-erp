import { CpiNav } from "./CpiNav";

export default function CpiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
            CPI Suite
          </span>
          <span className="text-xs text-slate-400">Chemical Pressure Impregnation</span>
        </div>
        <CpiNav />
      </div>
      {children}
    </div>
  );
}
