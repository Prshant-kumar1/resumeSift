## Wire up Supabase credentials

Add the provided Supabase project URL and publishable key to the project so the auth flow (login, signup, Google OAuth, password reset) becomes live.

### Steps

1. **Create `.env`** at project root with:
   ```
   VITE_SUPABASE_URL=https://jrtbwzkmvvwtbzpydznt.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_7SJVFlQdiJeGARCh9GrTwg_5s-Mblwh
   ```
   The existing `src/integrations/supabase/client.ts` already reads these via `import.meta.env`, so no code changes are needed.

2. **Ensure `.env` is gitignored** (verify `.gitignore` includes `.env`; add if missing).

3. **Verify the dev server picks up the new env vars** — Vite requires a restart after `.env` changes; the harness handles this on rebuild.

### Things you'll need to do in your Supabase dashboard

For auth to fully work, in the Supabase dashboard (Authentication → URL Configuration):
- **Site URL**: set to your preview URL (`https://id-preview--ea78dcdb-df85-4902-86c2-feeca4b9ba0b.lovable.app`) or published URL once deployed.
- **Redirect URLs**: add `https://id-preview--ea78dcdb-df85-4902-86c2-feeca4b9ba0b.lovable.app/auth/callback` and `/reset-password`. Add `http://localhost:*` for local testing if needed.
- **Google OAuth** (optional): enable the Google provider under Authentication → Providers and supply your Google OAuth client ID/secret.
- **Email confirmations**: for fastest testing, you can disable "Confirm email" under Authentication → Providers → Email.

### Note on key security
The publishable (`sb_publishable_…`) key is safe to ship to the browser — RLS policies enforce access. Do not paste a `service_role` key into a `VITE_*` variable.
