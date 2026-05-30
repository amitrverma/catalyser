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
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Optional for cloud mode: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
4. Run the Supabase migrations in `supabase/migrations` from the Supabase SQL editor or Supabase CLI
5. Run the app:
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
