# TournX — Supabase Development Setup Guide
> **think.prompt.organise**

This document details how to configure, verify, and synchronize the dedicated TournX development Supabase database.

---

## 1. Designated Development Environment

- **Authorized Project URL**: `https://jbzhtgqdgqjnffljwazy.supabase.co`
- **Project Ref**: `jbzhtgqdgqjnffljwazy`
- **Off-Limits Legacy Production Host**: `blvbadhssprenjizbnvz.supabase.co` (strictly blocked by runtime assertion).

---

## 2. Environment Variables Setup

Create a local environment file `.env.local` in `D:\Projects\football` (alongside `package.json`):

```env
VITE_SUPABASE_URL=https://jbzhtgqdgqjnffljwazy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<YOUR_SUPABASE_PUBLISHABLE_KEY>
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_PUBLISHABLE_KEY>
```

> [!NOTE]
> `.env.local` is matched by `.gitignore` (`*.local`) and will never be committed to Git.
> Both `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_ANON_KEY` are supported interchangeably by [`src/lib/supabase.ts`](file:///d:/Projects/football/src/lib/supabase.ts).

---

## 3. Database Migration Execution

The complete multi-tenant database migration is version-controlled at:
[`supabase/migrations/20260410000000_multi_tenant_schema.sql`](file:///d:/Projects/football/supabase/migrations/20260410000000_multi_tenant_schema.sql)

### Safe Execution Steps:
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard) and open the `jbzhtgqdgqjnffljwazy` project.
2. Confirm the project URL displays `https://jbzhtgqdgqjnffljwazy.supabase.co` in **Settings > API**.
3. Open **SQL Editor**.
4. Paste the contents of `supabase/migrations/20260410000000_multi_tenant_schema.sql`.
5. Execute the script.
6. Verify table creation in **Table Editor**:
   - `tournaments`
   - `tournament_members`
   - `access_codes`
   - `tournament_stages`
   - `groups`
   - `teams`
   - `stage_teams`
   - `players`
   - `matches`
   - `match_events`
   - `media_assets`
   - `audit_logs`
   - `access_code_rate_limits`

---

## 4. Switching Between Modes

- **Supabase Cloud Mode**: Activated automatically when `VITE_SUPABASE_URL` matches `jbzhtgqdgqjnffljwazy.supabase.co` and a valid publishable key token is supplied in `.env.local`. Real authentication and RLS are enforced.
- **Local Synthetic Mode**: Activated automatically if `.env.local` is absent, or if the key is empty/placeholder. Persists locally via `ftm_dev_` keys. Completely offline and safe.

---

## 5. Developer Organizer Account Confirmation

Supabase Auth requires email verification by default. When an organizer account is registered through the TournX UI (`/admin/login` -> "Sign up as Organizer"):

1. The account is created in `auth.users` with `CONFIRMATION_REQUIRED`.
2. To complete verification, open the [Supabase Dashboard Users Tab](https://supabase.com/dashboard/project/jbzhtgqdgqjnffljwazy/auth/users).
3. Find the registered email (e.g. `tournx.dev.test@gmail.com`).
4. Click `...` -> **Confirm user** (or click the link sent to the inbox).
5. Once confirmed, sign in directly at `http://localhost:5173/#/admin/login` to begin managing cloud tournaments.

---

## 6. Troubleshooting & Safety

| Symptom | Cause | Resolution |
|---|---|---|
| `CRITICAL SAFETY VIOLATION` error | Attempt to target legacy production URL | Ensure `VITE_SUPABASE_URL` points to `jbzhtgqdgqjnffljwazy.supabase.co`. |
| Running in Local Synthetic Mode | Publishable key is empty or placeholder | Insert authentic publishable key into `.env.local` and restart dev server. |
| Email not confirmed | Unconfirmed Supabase developer account | Confirm the email via dashboard or inbox as described in Section 5. |
| Permission Denied (403/42501) | RLS blocked unauthorized operation | Ensure user has redeemed a valid `SCORE` or `ORGANIZER` access code or signed in. |
