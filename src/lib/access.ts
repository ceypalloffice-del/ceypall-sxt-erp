export type Role = "director" | "accounts" | "production" | "viewer";

export const ROLES: Role[] = ["director", "accounts", "production", "viewer"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

// Section prefixes each role may open. Directors get everything; viewers get
// everything except /admin (RLS blocks their writes at the DB level).
const SECTIONS: Record<"accounts" | "production", string[]> = {
  accounts: [
    "/customers",
    "/jobs",
    "/invoices",
    "/products",
    "/suppliers",
    "/purchase-orders",
    "/vendor-bills",
    "/petty-cash",
  ],
  production: [
    "/jobs",
    "/products",
    "/pallets",
    "/materials",
    "/treatment-rates",
    "/treatment-quotes",
    "/treatment-suite",
    "/cpi-suite",
    "/inventory",
    "/warehouses",
    "/chemicals",
    "/purchase-orders",
  ],
};

export function canAccess(role: Role, pathname: string): boolean {
  if (role === "director") return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return false;
  if (role === "viewer") return true;
  if (pathname === "/") return true; // everyone gets the dashboard
  return SECTIONS[role].some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}
