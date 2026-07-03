"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/cpi-suite", label: "Dashboard", exact: true },
  { href: "/cpi-suite/costing", label: "Treatment Costing" },
  { href: "/cpi-suite/calculator", label: "Price Calculator" },
  { href: "/cpi-suite/price-lists", label: "Price Lists" },
  { href: "/cpi-suite/chemical-calc", label: "Chemical Calc" },
  { href: "/cpi-suite/competitors", label: "Competitors" },
  { href: "/cpi-suite/settings", label: "Settings" },
  { href: "/cpi-suite/reports", label: "Reports" },
];

export function CpiNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {TABS.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              isActive
                ? "bg-emerald-50 text-emerald-700"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
