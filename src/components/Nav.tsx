"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { EntityKey } from "@/lib/entities";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/jobs", label: "Jobs" },
  { href: "/invoices", label: "Invoices" },
  { href: "/products", label: "Products" },
  { href: "/pallets", label: "Pallets", cplOnly: true },
  { href: "/materials", label: "Materials", cplOnly: true },
  { href: "/treatment-rates", label: "Treatment Rates", sxtOnly: true },
  { href: "/treatment-quotes", label: "Treatment Quotes", sxtOnly: true },
  { href: "/treatment-suite", label: "KD Suite", sxtOnly: true },
  { href: "/cpi-suite", label: "CPI Suite", sxtOnly: true },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/purchase-orders", label: "Purchase Orders" },
  { href: "/vendor-bills", label: "Vendor Bills" },
  { href: "/petty-cash", label: "Petty Cash" },
  { href: "/inventory", label: "Inventory" },
  { href: "/warehouses", label: "Warehouses" },
  { href: "/chemicals", label: "Chemicals" },
];

export function Nav({ activeEntity }: { activeEntity: EntityKey }) {
  const pathname = usePathname();
  const links = LINKS.filter(
    (link) => (!link.cplOnly || activeEntity !== "SXT") && (!link.sxtOnly || activeEntity !== "CPL")
  );

  return (
    <nav className="flex items-center gap-1 py-2">
      {links.map((link) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-green-800 ${
              isActive ? "text-white" : "text-slate-500 hover:text-slate-900"
            }`}
            style={isActive ? { backgroundColor: "#1A4D10" } : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
