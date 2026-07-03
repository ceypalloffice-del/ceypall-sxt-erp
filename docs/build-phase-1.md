# Phase 1 kickoff prompt

Paste this as your first message to Claude Code in this repo (after running `supabase/01_schema.sql` and filling in `.env.local`).

---

Build Phase 1 of the CeyPall + St. Xavier Group ERP per `CLAUDE.md`.

**Stack scaffold**
- Next.js (App Router, TypeScript), Tailwind CSS.
- `@supabase/ssr` with a per-request server client (cookies) for Server Components, and a browser client for client components.
- Auth: Supabase email/password sign up + sign in.

**Pages**
1. `/login` and `/signup` — Supabase auth forms.
2. `/` (dashboard) — entity switcher (St. Xavier / CeyPall / Consolidated, persisted in a cookie), cards for: AR ageing summary (`ar_ageing`), open jobs count, recent invoices. Margin/job profitability only visible to `director` role (from `job_pnl`).
3. `/customers` — list from `customers`, filtered by current entity (or all if Consolidated); balances from `customer_balances`.
4. `/jobs` — list from `jobs` filtered by entity; status badges; click into a job detail page showing `job_costs` (director-only) and linked invoices.
5. `/invoices` — list from `invoices` + `invoice_lines`, filtered by entity; status badges (unpaid/partial/paid).
6. `/products` — list from `products`, entity-filtered.

**Behavior**
- Respect `entity_scope` on the user's profile — if set, lock them to that entity and hide the switcher.
- All reads via Server Components using the views, not recomputed in app code.
- Writes (creating customers, jobs, invoices, payments) via Server Actions + `revalidatePath`. Restrict writes to `director`/`accounts` roles per RLS — let RLS be the enforcement, but also hide write UI from `viewer`/`production` roles for clarity.
- Empty states: since all tables start empty, every list page needs a clear, friendly empty state — no fabricated placeholder rows.

**Design**
Follow the house style in `CLAUDE.md` exactly: ground colour, card style, per-entity accent colours, monospace + `tabular-nums` for identifiers and LKR amounts, LKR formatting, mobile-responsive, visible focus states, reduced-motion support.

**Out of scope for Phase 1**
Production pipeline, kiln batches, timber inventory, transport, assets, documents, QR labels, and the QuickBooks import itself — these come in later phases.
