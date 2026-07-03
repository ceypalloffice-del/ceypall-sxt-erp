import { SuiteNav } from "./SuiteNav";

export default function TreatmentSuiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 py-2">
            <span className="mr-3 text-xs font-semibold tracking-widest text-slate-400 uppercase">
              KD Suite
            </span>
            <SuiteNav />
          </div>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
