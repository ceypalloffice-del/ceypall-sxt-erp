# CeyPall + St. Xavier Group ERP

Internal multi-entity ERP for a Sri Lankan group: **St. Xavier Timber** (`SXT` — timber kiln-drying & VPI treatment) and **CeyPall (Pvt) Ltd** (`CPL` — ISPM-15 pallet manufacturing). Per-entity books plus a consolidated view. Users: one director plus a few staff.

## Stack
- Next.js (App Router, TypeScript) + Tailwind CSS
- Supabase (Postgres, Auth, RLS) via `@supabase/ssr`
- Deploy target: Vercel

## Database contract (non-negotiable)
- The schema is `supabase/01_schema.sql`. **Match it exactly — never create, rename, or drop tables.**
- Every transactional row carries `entity_id` (`'SXT'` | `'CPL'`). "Consolidated" is a query with no entity filter.
- Balances and margins are **Postgres views** — `customer_balances`, `supplier_payables`, `job_pnl`, `ar_ageing`. Read from them; never store or recompute a balance/margin in app code.
- RLS is enabled. Always query with the **user's** session (anon key + cookies). Never use the service-role key in app code — **sole exception:** `src/lib/supabase/admin.ts` (`SUPABASE_SERVICE_ROLE_KEY`) exists for auth admin ops (director-gated user creation in `actions/users.ts`); never widen it to business data.
- `job_pnl` exposes margin → only query it when the user's role is `director`.
- Importable tables carry `external_ref` for idempotent QuickBooks import. Don't repurpose it.

## Entity model
A global switcher (St. Xavier / CeyPall / Consolidated) is persisted in a cookie so Server Components can read it per request. It sets the accent colour and filters every query. If a user's `entity_scope` is set, lock them to that entity and hide the switcher.

## Design house style
- Ground `#F5F6F8`, white cards, `border-slate-200`, slate text.
- Accents: SXT `#185FA5` (tint `#E6F1FB`), CPL `#0F6E56` (tint `#E1F5EE`), Consolidated `#334155` (tint `#F1F5F9`).
- All identifiers (`job_no`, `invoice_no`) and all LKR figures use **monospace + `tabular-nums`**; body uses a clean sans.
- LKR format: `LKR 1,172,880` (no decimals); negatives `-LKR …`.
- Quality floor: responsive to mobile, visible keyboard focus, reduced motion respected.

## Conventions
- Reads in Server Components (per-request Supabase server client from cookies); writes in Server Actions + `revalidatePath`.
- Client env only: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Scope
Phase 1 is defined in `docs/build-phase-1.md`. **Tables start empty** — real data arrives later via QuickBooks + document import, so build informative empty states; never fabricate placeholder rows.

**Phase 2 (in progress)** turns the accounting system into a manufacturing ERP, built sequentially module-by-module (each: migration → seed → actions → UI → dashboard/accounting integration → entity filter → RLS → verify). Migrations live in `supabase/NN_*.sql`, run in numeric order, all idempotent. Module status:
- ✅ Module 1 — Inventory (`09_inventory.sql`): `warehouses`, `inventory_items`, append-only `inventory_movements`; stock-on-hand and avg-cost are **views** (`inventory_with_stock`), never stored/recomputed in app code. Pages: `/inventory`, `/inventory/[id]`, `/warehouses`; dashboard low-stock widget.
- ⏳ Next: Module 4 (Purchase Orders) → then Production Orders, BOM, QC, ISPM-15, timber tracking, maintenance, banking, HR, documents, AI assistant.

Future entity: Serendib Gemstones will join the same multi-company framework — keep everything entity-scoped, never hard-code a two-entity assumption.

## First run
See `README.md`. After the first signup, elevate your own user in the Supabase SQL editor:
`update profiles set role='director', entity_scope=null where id='<your-auth-uid>';`
