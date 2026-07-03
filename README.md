# CeyPall + St. Xavier Group ERP

Internal multi-entity ERP for St. Xavier Timber (`SXT`) and CeyPall (`CPL`). Next.js + Supabase + Vercel.

## Setup

1. **Supabase** — create a project. Open the SQL editor, paste and run `supabase/01_schema.sql`. This creates all tables, the computed views, and RLS. No data is loaded.
2. **Env** — copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key (Project Settings → API).
3. **Build the app** — open this folder in Claude Code and run the kickoff prompt in `docs/build-phase-1.md`. `CLAUDE.md` is loaded automatically and holds the project rules.
4. **Run** — `npm install && npm run dev`.
5. **Make yourself director** — sign up once in the app, then in the Supabase SQL editor run:
   ```sql
   update profiles set role='director', entity_scope=null
   where id='<your-auth-uid>';
   ```
   (Find your uid under Authentication → Users.)
6. **Deploy** — push to a Git repo and import into Vercel; set the same two env vars in the Vercel project.

## Data

Tables start empty. Real data is imported in a later step from QuickBooks (customers, vendors, items, invoices/payments, and the chart of accounts for bank/OD, director loan, and intercompany balances) and other documents, upserting on each table's `external_ref` so the import is safe to re-run.

## Project layout

```
CLAUDE.md                  project rules (auto-loaded by Claude Code)
README.md                  this file
.env.example
supabase/01_schema.sql     database — run first
docs/build-phase-1.md      kickoff prompt for Claude Code
```
