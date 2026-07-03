"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/treatment-suite", label: "Dashboard", exact: true },
  { href: "/treatment-suite/calculator", label: "Calculator" },
  { href: "/treatment-suite/batches", label: "KD Batches" },
  { href: "/treatment-rates", label: "Price List" },
  { href: "/treatment-suite/settings", label: "Settings" },
  { href: "#", label: "📅 Scheduler", disabled: true },
  { href: "#", label: "📈 Reports", disabled: true },
];

export function SuiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 flex-wrap">
      {TABS.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : !tab.disabled && pathname.startsWith(tab.href);

        if (tab.disabled) {
          return (
            <span
              key={tab.href + tab.label}
              title="Coming soon"
              className="cursor-not-allowed rounded-md px-3 py-1.5 text-sm text-slate-300"
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
              isActive
                ? "bg-blue-50 text-blue-700"
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
