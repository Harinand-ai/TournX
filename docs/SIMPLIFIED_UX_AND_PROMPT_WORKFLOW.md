# TournX — Simplified UX & Prompt-Driven Tournament Creator Architecture

**Product:** TournX  
**Tagline:** think.prompt.organise  
**Workspace:** `D:\Projects\football`  
**Development Supabase Host:** `jbzhtgqdgqjnffljwazy.supabase.co`

---

## 1. Executive Summary

TournX has been redesigned and simplified around one unifying interaction:

> **Describe your tournament. Preview it. Add your squads. Publish it. Share the link.**

All excessive cognitive clutter, multiple disparate administrative screens, and aggressive retro pixel overrides have been replaced with a clean, modern, lightweight sports platform powered by deterministic, zero-dependency conversational prompt parsers and unified workspace operations.

---

## 2. Core User Journey & Screens

### Screen 1: Landing Page (`src/pages/LandingPage.tsx`)
- **Strictly two primary actions:**
  1. **Organize a tournament**:
     - **Sign up**: First-time organizers enter Name, Email, Password, Tournament Name, Description, and Visibility (`Public` or `Private`). Immediately creates account and opens the tournament wizard prefilled with the tournament name.
     - **Sign in**: Existing organizers sign in and land directly in their workspace.
     - **Local Demo Sandbox**: Quick link to open the local organizer workspace without requiring credentials during development/offline mode.
  2. **Join a tournament**:
     - Accepts tournament slug (e.g., `tournx-championship`), shareable link, or access/invite codes (`INV-...`, `TX-VIEW-...`, `TX-SCORE-...`).
     - Includes direct link to the showcase public tournament.
- **Terminology:** Consistent use of **Sign in**, **Sign up**, and **Join a tournament**.

### Step 1–5: Guided Setup Wizard (`src/components/wizard/CreateTournamentWizard.tsx`)
1. **Prompt Input**:
   - Accepts free-form conversational descriptions (e.g. *"Create the TournX Championship with six teams: Apex FC, Cobalt United, Solaris City, Vanguard Rovers, Northside FC and Royal Strikers. Use a single round-robin format with three points for a win and one for a draw. Matches are 50 minutes long and will be played at the college ground. Starts November 10."*).
   - Parsed deterministically by `parseTournamentPrompt` with ambiguity and missing field detection.
2. **Tournament Preview**:
   - Clean, structured card preview: Name, Format, Match Duration, Venue, Start Date, Teams, and generated fixtures.
   - Three primary actions: **Edit details**, **Continue to players**, **Save draft**.
3. **Prompt-Driven Squads & Managers**:
   - Single prompt box accepts team rosters, player positions, jersey numbers, captains, and managers (e.g., *"For Apex FC, add goalkeeper Daniel, defender Arjun, midfielder Rahul and forward Cristiano. Make Arjun the captain. The team manager is Michael."*).
   - Parsed by `parseSquadPrompt` with automatic team grouping and manual inline editing.
4. **Optional Features**:
   - Hidden until needed: Referees, Player of the Match (POTM) voting, Goalscorers & match events, Cards & substitutions, Custom tie-breakers, Knockout playoffs.
5. **Final Review & Publishing**:
   - Complete tournament summary before persistence.
   - Actions: **Publish tournament**, **Save as draft**, **Edit setup**.
   - Generates shareable URL (`/t/:slug`) with a one-click copy button.

### Central Organizer Workspace (`src/pages/OrganizerWorkspacePage.tsx`)
- **Single unified page** eliminating multiple confusing admin subpages.
- **Top Metrics**: Tournament Name & Status, Next match card, Live matches, Recent results, and Standings preview.
- **Conversational Operational Prompt Box**:
  - Handles operational commands such as *"Record score as 2-1 and mark the match completed"*, *"Move Apex FC vs Cobalt United to Saturday 4 PM"*, *"Change venue to main stadium"*, and *"Update match duration to 45 minutes"*.
  - Opens a **Proposed Action Diff Modal** for organizer review before consequential database changes are executed.
- **Consolidated Tabs**:
  - **Overview**: Live scores, upcoming match, recent results, standings.
  - **Matches & Scores**: Interactive list of fixtures with score entry modal.
  - **Teams & Squads**: Roster review, captain badges, and managers.
  - **Collaborators**: Email pre-authorization with role assignment (`Organizer`, `Scorer`, `Viewer`), redemption codes, and revocation controls.
  - **Settings**: Tournament metadata, duration, and account sign-out.

### Public Tournament Viewer (`src/pages/PublicTournamentPage.tsx`)
- Accessed via `/t/:slug`.
- Displays honest data with no admin controls, access code hashes, or unpublished drafts.
- Sections: Overview, Fixtures & Results, Full Standings, Clubs & Squads, Top Scorers.
- Shows a non-intrusive floating banner for organizers who are currently signed in.

---

## 3. Deterministic Natural Language Parsing (`src/utils/promptParsers.ts`)

| Parser Function | Purpose | Extracted Data | Zero External Dependencies |
|---|---|---|:---:|
| `parseTournamentPrompt` | Tournament creation | Name, teams, format (`SINGLE_ROUND_ROBIN`, `DOUBLE_ROUND_ROBIN`, `SINGLE_ELIMINATION`), duration, venue, dates, points rules, missing fields | Yes |
| `parseSquadPrompt` | Squad & roster creation | Team names, players, positions (`GK`, `DEF`, `MID`, `FWD`), jersey numbers, captains, managers | Yes |
| `parseWorkspaceCommand` | Operational updates | Action types (`RECORD_SCORE`, `RESCHEDULE_MATCH`, `CHANGE_VENUE`, `ADD_TEAM`, `UPDATE_DURATION`), proposed diffs | Yes |

---

## 4. Security & Isolation Guarantees

1. **Development Supabase Boundary**:
   - Connected exclusively to `jbzhtgqdgqjnffljwazy.supabase.co`.
   - Production host `blvbadhssprenjizbnvz.supabase.co` is strictly blocked by runtime barriers.
2. **Dual-Mode Persistence**:
   - Cloud mode requires Supabase authenticated session; unauthorized writes throw clear, transparent errors.
   - Offline / local synthetic mode persists via isolated `ftm_dev_` keys.
3. **Collaborator Permissions**:
   - Roles (`ORGANIZER`, `SCORE`, `VIEW`) verified via cryptographic access codes and pre-authorized email invitations.
   - Unauthenticated claims cannot bypass authorization.

---

## 5. Verification & Test Results

- **Automated Tests**: 45 passing unit and integration tests (`vitest run`).
- **TypeScript**: 0 errors (`npx tsc -b`).
- **Production Build**: Built in 2.33s with 0 errors (`npm run build`).
- **End-to-End Browser Flow**: Verified across landing page, wizard setup, squad parsing, tournament publication, workspace operational prompt, and public viewer.
