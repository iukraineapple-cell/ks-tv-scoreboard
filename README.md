# KS TV Scoreboard

KS TV Scoreboard is a football broadcast scoreboard with live timer, score, lineups, match events and an admin area.

The migration target is:

- Vercel for the Vite frontend
- Supabase Auth for Google sign-in
- Supabase Postgres for application data
- Supabase RLS for access control

## Local setup

1. Create a Supabase project and enable Google in Authentication > Providers.
2. Run `supabase/migrations/20260728190000_initial.sql` in the Supabase SQL editor.
3. Copy `code/.env.example` to `code/.env` and fill in the Supabase URL and anon key.
4. Install and build:

```bash
cd code
npm install
npm run build
```

For Vercel, use the repository root as the project root. `vercel.json` contains the build and SPA rewrite configuration. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel environment variables, then add the deployed Vercel URL to Supabase Auth redirect URLs.

The original Cloudflare/Mocha export files are intentionally not part of the deployable migration. Local database dumps and user exports are ignored by Git to avoid publishing personal data.

The server-side Supabase pooler URL is stored in Vercel as `SUPABASE_DB_URL`. It is never exposed as a `VITE_` variable. The deployment exposes `/api/db-health` for a basic production connection check.
