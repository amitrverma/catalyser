<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Catalyser

Production ledger studio for architecture and interior design teams.

View your app in AI Studio: https://ai.studio/apps/6e183bb8-3bfd-416e-9c09-f5ae06f46613

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Optional for cloud mode: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
3. Run the Supabase migrations in `supabase/migrations` from the Supabase SQL editor or Supabase CLI, in filename order
4. Run the app:
   `npm run dev`

## Checks

- Typecheck: `npm run lint`
- Production build: `npm run build`
- E2E smoke test: `npm run test:e2e`

## Deploy on Vercel with Supabase

Use Vercel's Vite defaults:

- Build command: `npm run build`
- Output directory: `dist`

Add these Vercel environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Keep the Supabase service role key out of browser/Vercel frontend environment variables. Data security is enforced by the RLS policies in `supabase/schema.sql`.

## Production Foundations

- Supabase Auth gates the app when cloud env vars are configured.
- Core project, payment, contact, document, settings, and staff data persists to Supabase.
- Organization and role groundwork is in `supabase/migrations/20260530123000_organizations_and_roles.sql`.
- Organization-scoped app writes, private document Storage uploads, and role-aware RLS are in `supabase/migrations/20260530131500_enterprise_tenancy_storage.sql`.
- GitHub Actions runs typecheck, production build, and Playwright auth smoke tests on `main` and pull requests.
