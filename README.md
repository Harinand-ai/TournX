# TournX — Football Tournament Management Platform
> **think.prompt.organise**

TournX is an independent, high-performance, multi-tenant football tournament management platform designed for tournament organizers, match officials, and viewers. Built on React 19, TypeScript, and Vite, TournX runs offline with persistent synthetic data out of the box, synchronizes optionally with an isolated development Supabase backend, and packages as a native Android application using Capacitor.

---

## 🛡️ Critical Safety & Isolation Guarantees

1. **Independent Workspace**: All development and assets reside exclusively in `D:\Projects\football`.
2. **Zero Legacy Production Interference**: Never targets legacy production database hosts (`blvbadhssprenjizbnvz.supabase.co`). Hard runtime assertion barriers prevent network connections to production hostnames.
3. **Isolated Git Repository**: Operates under a clean local Git repository with no upstream remote targeting legacy repositories.
4. **Data Isolation**: Multi-tenant data partition enforces strict tenant boundaries (`tournament_id` composite keys) preventing cross-tenant leakage.

---

## 🚀 Key Platform Capabilities

### 1. Deterministic Tournament Engine (`src/engine/tournamentEngine.ts`)
- **Zero React or Supabase dependencies**: Pure, standalone TypeScript engine.
- **Single Round-Robin**: Deterministic Berger circle algorithm handling odd/even teams and automatic byes.
- **Double Round-Robin**: Home and away fixture legs.
- **Knockout Bracket**: Seeded pairings (1 vs N, etc.), power-of-2 tree calculation, automatic bye advancement, and winner progression.
- **Configurable Standings**: Configurable win/draw/loss points with deterministic multi-level tie-breakers: `POINTS` → `GOAL_DIFFERENCE` → `GOALS_FOR` → `HEAD_TO_HEAD`.

### 2. Multi-Tournament Foundation & Isolation
- Stable immutable tournament UUIDs with unique, editable URL slugs (`/t/<slug>`).
- Dedicated local storage partitioning (`ftm_dev_t_{id}_*`).
- Non-destructive demo reset: Organizer can reset the demo tournament without deleting user-created tournaments.

### 3. Cryptographic Access Control & Role Matrix
- **VIEW**: Read-only access to private tournament details and brackets.
- **SCORE**: Scorer privileges to record live scores and match events (cannot alter tournament rules or delete tournaments).
- **ORGANIZER**: Full control of tournaments, clubs, players, fixtures, and settings.
- **Unambiguous 8-Character Codes**: Characters `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no confusing 0/O, 1/I/L).
- **Salted SHA-256 Storage**: Plaintext codes are displayed only once upon generation; only cryptographic hashes are stored.
- **Brute-Force Rate Limiting**: Maximum 5 failed attempts per 5-minute window per tenant.

### 4. Bulk CSV Importer (`src/utils/csvImporter.ts`)
- RFC 4180-compliant single-pass scanner supporting quotes, escaped commas, and trimming.
- Downloadable sample CSV templates for Teams and Players.
- Row-level validation with duplicate detection, squad limit verification, and accepted/rejected row previews.

### 5. Native Android Packaging with Capacitor
- App ID: `com.tournx.app`
- App Name: `TournX`
- Seamless asset sync pipeline: `npm run cap:build` (`npm run build && cap sync`).
- Native project configured at `android/`.

---

## 📋 Implementation Checklist

| Stage | Feature Area | Status | Verification |
|---|---|---|---|
| **Stage 1** | Audit & Workspace Isolation | ✅ Complete | Verified git remotes, runtime barriers, zero production keys |
| **Stage 2** | Generic Multi-Tournament Foundation | ✅ Complete | Dynamic routing (`/t/<slug>`), switcher modal, tenant isolation |
| **Stage 3** | Deterministic Tournament Engine | ✅ Complete | 10 comprehensive Vitest unit tests passing |
| **Stage 4** | Normalized Database Schema & RLS | ✅ Complete | Composite foreign keys, 360+ lines SQL migration in `supabase/` |
| **Stage 5** | Authentication & Access Codes | ✅ Complete | Salted SHA-256 hashes, rate-limiting, 7 Vitest unit tests |
| **Stage 6** | Complete Organizer Experience | ✅ Complete | Fixture generator, scorer interface, tournament settings UI |
| **Stage 7** | Bulk CSV Importer & Validator | ✅ Complete | RFC-4180 parser, preview tables, 5 Vitest unit tests |
| **Stage 8** | Web Testing & Local Preview | ✅ Complete | 22/22 unit tests passing, production build passing (2.4s) |
| **Stage 9** | Vercel Preview Deployment Preparation | ✅ Complete | `vercel.json` SPA rewrite rules and clean `.env.example` |
| **Stage 10**| Stable Web Release Pipeline | ✅ Complete | Zero lint/build errors, rollback documentation |
| **Stage 11**| Capacitor & Android Packaging | ✅ Complete | Native Android platform added, `cap:build` synced |

---

## 🛠️ Getting Started & Commands

### Prerequisites
- Node.js 18+ (tested on Node.js 20+)
- npm 9+
- Android Studio (for running on Android Emulator or physical devices)

### Setup & Local Development
```bash
# Install dependencies
npm install

# Start Vite local development server
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) to launch TournX in offline synthetic mode.

### Running Test Suite
```bash
# Execute Vitest test suite
npm test
```
Runs 22 unit tests across the tournament engine, local data isolation, access code cryptography, and CSV parsing.

### Production Web Build
```bash
npm run build
```
Compiles TypeScript types and builds the optimized production bundle to `dist/`.

### Android Build & Sync
```bash
# Build web app and sync native Android assets
npm run cap:build

# Open project in Android Studio
npm run cap:android
```

---

## 🗄️ Database Integration Guide (Development Supabase)

1. Create a separate development project in Supabase (e.g., `tournx-dev`).
2. Verify the project URL is **NOT** `blvbadhssprenjizbnvz.supabase.co`.
3. In the Supabase SQL Editor, execute the migration:
   `supabase/migrations/20260410000000_multi_tenant_schema.sql`
4. Copy the development URL and anon key into `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://<your-dev-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-dev-anon-key>
   ```
5. Restart the development server.

---

## 📄 License & Attribution
TournX — *think.prompt.organise*  
Developed by the TournX Team.
