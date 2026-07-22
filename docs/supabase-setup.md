# Supabase account setup

Life OS uses Supabase Auth for email/password accounts and a Postgres user_states
row for each user's durable state. Browser storage is only a scoped offline cache.

## Enable

1. Create a Supabase project.
2. Run supabase/migrations/202607200001_activation_accounts.sql in the SQL editor.
3. Add the following production environment variables:

   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   - NEXT_PUBLIC_SITE_URL

4. In Supabase Auth URL configuration, add:
   - https://your-domain.example/auth/callback
   - local development: http://localhost:3003/auth/callback
5. Keep email/password authentication enabled. Email confirmation is supported:
   after confirmation, the PKCE callback creates the cookie session and resumes
   activation at the readiness step.

When both public Supabase variables are present, Supabase auth replaces the legacy
single-owner LIFEOS_AUTH_* gate. Do not expose a Supabase secret/service-role key
to the browser or add it to .env.example.

## Data isolation

The user_states.user_id primary key references auth.users(id). Row Level Security
permits authenticated users to select, insert, and update only the row whose
user_id equals auth.uid(). Passwords stay inside Supabase Auth and never enter the
Life OS profile, local cache, or Postgres state payload.
