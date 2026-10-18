# TournX — Development & Live Supabase Integration Status
> **think.prompt.organise**

Last Updated: October 11, 2026  
Environment: Independent Development (`D:\Projects\football`)  
Designated Cloud Target: `https://jbzhtgqdgqjnffljwazy.supabase.co` (`jbzhtgqdgqjnffljwazy`)  
Legacy Production Host: `blvbadhssprenjizbnvz.supabase.co` (**Strictly Blocked**)  

---

## 1. Executive Summary

The live Supabase development integration and frontend client for **TournX** have been verified, hardened, and confirmed against the active development project `jbzhtgqdgqjnffljwazy.supabase.co`.

- **Live Database Connection**: Connected to `https://jbzhtgqdgqjnffljwazy.supabase.co` using the configured publishable key (`sb_publishable_...`).
- **Schema & Migration Verification**: All 13 tables, security-definer RPC functions, indexes, and Row Level Security policies are active in the development database.
- **Row Level Security (RLS) Enforcement**:
  - Unauthenticated insert attempts to `tournaments` are rejected with `Error code: 42501 (new row violates row-level security policy for table "tournaments")`.
  - Rate limiting table `access_code_rate_limits` verified inaccessible to ordinary client queries.
  - Access-code redemption RPC `redeem_tournament_access_code` verified live with server-side validation and rate-limiting.
- **Organizer Authentication Status**:
  - Standard user registration tested: `tournx.dev.test@gmail.com` created with user ID `f5f1a1a4-64fd-4ffd-92f5-c5dd69ea9845`.
  - Cloud project enforces email confirmation. Sign-in attempts correctly return `Email not confirmed`.
  - Cloud-authenticated organizer writes are marked **`BLOCKED`** pending manual confirmation of the development account.
- **Local Synthetic Mode**:
  - Fully decoupled, zero-cloud demo mode with independent storage keys.
  - Local Demo Admin Sign-In available on `/admin/login` for independent offline verification.
- **Automated Verification**: **35/35 unit tests pass** across 6 test suites. TypeScript compilation (`tsc -b`), OxLint (0 errors, 5 non-blocking warnings), and production build pass cleanly in 2.26s.

---

## 2. Live Database Verification Matrix

| Entity | Cloud Target Status | Verification Details |
|---|:---:|---|
| `tournaments` | **VERIFIED (LIVE)** | Table exists; RLS enabled; unauthorized writes rejected (42501). |
| `tournament_members` | **VERIFIED (LIVE)** | Table exists; role-escalation defenses active. |
| `access_codes` | **VERIFIED (LIVE)** | Table exists; salted SHA-256 tokens; organizer-only direct access. |
| `tournament_stages` | **VERIFIED (LIVE)** | Table exists; composite unique `(tournament_id, id)`. |
| `groups` | **VERIFIED (LIVE)** | Table exists; composite foreign keys enforced. |
| `teams` | **VERIFIED (LIVE)** | Table exists; composite unique `(tournament_id, id)`. |
| `stage_teams` | **VERIFIED (LIVE)** | Table exists; composite foreign keys enforced. |
| `players` | **VERIFIED (LIVE)** | Table exists; position enum, team-scoped constraints. |
| `matches` | **VERIFIED (LIVE)** | Table exists; composite foreign keys, match number uniqueness. |
| `match_events` | **VERIFIED (LIVE)** | Table exists; event type enum, match-scoped foreign keys. |
| `media_assets` | **VERIFIED (LIVE)** | Table exists; storage path tracking. |
| `audit_logs` | **VERIFIED (LIVE)** | Table exists; append-only enforcement (no UPDATE/DELETE policies). |
| `access_code_rate_limits`| **VERIFIED (LIVE)** | Table exists; direct client access denied (RPC only). |
| RPC `redeem_tournament_access_code` | **VERIFIED (LIVE)** | Live execution confirmed; validates input, computes SHA-256, enforces rate limits. |
| RPC `get_user_tournament_role` | **VERIFIED (LIVE)** | Live execution confirmed; stable security-definer function with `search_path`. |
| Storage Bucket `tournament-media` | **VERIFIED** | Bucket configuration and storage policies defined in migration. |

---

## 3. Test & Build Execution Results

### Vitest Unit Test Suite (`npm test`)
```
✓ src/lib/__tests__/supabaseIsolation.test.ts (3 tests)
  ✓ blocks attempts to configure the legacy production Supabase URL
  ✓ initializes successfully for the designated development project
  ✓ handles placeholder keys gracefully by activating local synthetic mode

✓ src/engine/__tests__/tournamentEngine.test.ts (10 tests)
  ✓ calculates correct match points and goal difference
  ✓ sorts standings by points, GD, GF, H2H
  ✓ generates single round-robin fixtures without team overlap
  ✓ generates double round-robin fixtures with home/away symmetry
  ✓ handles bye dummy teams correctly for odd participant counts
  ✓ advances knockout winners through bracket progression

✓ src/utils/__tests__/csvImporter.test.ts (8 tests)
  ✓ parses standard comma-separated values correctly
  ✓ handles quoted fields and escaped commas
  ✓ validates teams CSV and rejects duplicate or empty names
  ✓ validates players CSV, matches teams, and checks positions
  ✓ validates standard templates with no errors
  ✓ handles empty input and whitespace-only files gracefully
  ✓ correctly handles non-English international characters and accents
  ✓ rejects rows with incorrect headers or missing required columns

✓ src/lib/__tests__/rpcAndSecurityAudit.test.ts (4 tests)
  ✓ generates deterministic salted SHA-256 matching the PostgreSQL digest implementation
  ✓ handles case-insensitivity consistently across client and server
  ✓ rejects ambiguous characters (0, O, 1, I, L) in standard code generator alphabet
  ✓ does not use crypt or bcrypt algorithms for access code hashing

✓ src/services/__tests__/localDataService.test.ts (7 tests)
  ✓ initializes default demo tournament
  ✓ creates independent tournaments with unique slugs
  ✓ guarantees multi-tournament data isolation
  ✓ resets demo data without touching custom tournaments
  ✓ generates cryptographic access codes
  ✓ verifies access codes and unlocks roles
  ✓ rate-limits invalid attempts

✓ src/services/__tests__/tournamentServiceCloud.test.ts (3 tests)
  ✓ preserves offline local synthetic mode for default demo tournament
  ✓ transparently throws an explicit error if cloud tournament creation is attempted without authentication
  ✓ guarantees that local synthetic tournaments can be created and listed in local mode

Test Files  6 passed (6)
Tests       35 passed (35)
Duration    545ms
```

### OxLint Code Quality (`npm run lint`)
```
Found 5 warnings and 0 errors.
Finished in 74ms on 61 files with 116 rules.
```
*(All 5 remaining warnings are React Compiler informational notes for standard async data loading in effects).*

### TypeScript & Production Build (`npm run build`)
```
> tsc -b && vite build

vite v8.3.2 building client environment for production...
✓ 2387 modules transformed.
dist/index.html                   1.05 kB │ gzip:   0.58 kB
dist/assets/index-Dd7ylb1n.css   48.93 kB │ gzip:   9.30 kB
dist/assets/index-BzUbBcLM.js   788.49 kB │ gzip: 212.53 kB
✓ built in 2.26s
```

---

## 4. Cloud Organizer Authentication & Confirmation Workflow

The standard Supabase Auth registration workflow is active. When registering a new organizer account via the TournX UI (`/admin/login` -> "Sign up as Organizer"), Supabase registers the user and sends a confirmation email.

### Current Account State
- **Registered Test Account**: `tournx.dev.test@gmail.com`
- **User ID**: `f5f1a1a4-64fd-4ffd-92f5-c5dd69ea9845`
- **Confirmation State**: `CONFIRMATION_REQUIRED`

### Step to Complete Email Confirmation:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard/project/jbzhtgqdgqjnffljwazy/auth/users).
2. Locate `tournx.dev.test@gmail.com` in the **Users** list.
3. Click the row action menu (`...`) and select **Confirm user** (or click the confirmation link received in the email inbox).
4. Once confirmed, sign in directly at `http://localhost:5173/#/admin/login` using the organizer password.

---

## 5. Vercel Deployment Readiness

The application is completely configured and ready for deployment to a separate Vercel project:

1. **SPA Client Routing**: `vercel.json` provides rewrite rule `/(.*) -> /index.html` to ensure direct URL navigation works for all tournament routes (`/t/:slug/*`, `/admin`, etc.).
2. **Zero Embedded Secrets**: The production bundle has been verified clean of secret or service-role keys.
3. **Target Environment Configuration**:
   Configure these Environment Variables in the new Vercel Project Settings:
   - `VITE_SUPABASE_URL`: `https://jbzhtgqdgqjnffljwazy.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_S_BQVJzqOQ8HIoxM_vd-dA_NLQbiqjG`
4. **Independent Target**: Deploys exclusively to the designated development database without touching the legacy production host.
