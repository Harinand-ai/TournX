# TournX — Multi-Tenant Database Schema Documentation
> **think.prompt.organise**

This document specifies the relational data model, composite constraints, indexes, and Row Level Security (RLS) architecture of TournX.

---

## 1. Architectural Principles

1. **Root Tenant Isolation**: Every entity belongs directly to a root `tournament_id` (UUID).
2. **Composite Foreign Keys**: Relationships between entities enforce `(tournament_id, id)` matching. A match in Tournament A can **never** reference a team or player registered in Tournament B.
3. **No Duplicate State**: Fixture schedule, scores, and status are stored canonically in `matches`. Standings are derived deterministically or cached with integrity checks.
4. **Hashed Tokens Only**: Plaintext access tokens are never persisted in the database; only salted SHA-256 hashes are stored.

---

## 2. Table Catalog

### `tournaments` (Root Tenant Entity)
- `id` (UUID, PK, Default: `gen_random_uuid()`)
- `name` (VARCHAR(255), NOT NULL)
- `slug` (VARCHAR(255), UNIQUE) — Public URL routing identifier
- `description` (TEXT)
- `season` (VARCHAR(100))
- `logo_url` (TEXT)
- `status` (`tournament_status`: `DRAFT`, `REGISTRATION`, `IN_PROGRESS`, `COMPLETED`, `ARCHIVED`)
- `visibility` (`tournament_visibility`: `PRIVATE`, `UNLISTED`, `PUBLIC`)
- `rules_config` (JSONB) — Win/draw/loss points, tie-breakers, match minutes
- `created_by` (UUID, References `auth.users(id)`)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### `tournament_members` (Role Mapping)
- `id` (UUID, PK)
- `tournament_id` (UUID, FK -> `tournaments.id`)
- `user_id` (UUID, FK -> `auth.users.id`)
- `role` (`tournament_role`: `ORGANIZER`, `SCORE`, `VIEW`)
- Constraint: `UNIQUE(tournament_id, user_id)`

### `access_codes` (Cryptographic Tokens)
- `id` (UUID, PK)
- `tournament_id` (UUID, FK -> `tournaments.id`)
- `role` (`tournament_role`: `VIEW`, `SCORE`)
- `code_hash` (TEXT, NOT NULL) — Salted SHA-256 hash
- `label` (VARCHAR(100))
- `is_active` (BOOLEAN, Default: `true`)
- `max_uses` (INT, Nullable)
- `use_count` (INT, Default: `0`)
- `expires_at`, `revoked_at` (TIMESTAMPTZ)
- Constraint: `UNIQUE(tournament_id, code_hash)`

### `tournament_stages` & `groups`
- Support Single Round-Robin, Double Round-Robin, Knockout, and Group stages.
- Composite Unique: `UNIQUE(tournament_id, id)`.

### `teams` (Clubs)
- `id` (UUID, PK)
- `tournament_id` (UUID, FK -> `tournaments.id`)
- `name` (VARCHAR(100)), `short_name` (VARCHAR(10))
- `manager_name`, `logo_url`, `primary_color`, `secondary_color`
- Composite Unique: `UNIQUE(tournament_id, id)`, `UNIQUE(tournament_id, name)`

### `players` (Squad Members)
- `id` (UUID, PK)
- `tournament_id` (UUID, FK -> `tournaments.id`)
- `team_id` (UUID, FK -> `teams(tournament_id, id)`)
- `name` (VARCHAR(100)), `position` (Enum), `jersey_number` (0-99), `is_captain` (BOOLEAN)
- Partial Unique Index: `UNIQUE(team_id) WHERE is_captain = true`

### `matches` (Fixtures & Canonical Results)
- `id` (UUID, PK)
- `tournament_id` (UUID, FK -> `tournaments.id`)
- `stage_id` (UUID, FK -> `tournament_stages(tournament_id, id)`)
- `home_team_id` (UUID, FK -> `teams(tournament_id, id)`)
- `away_team_id` (UUID, FK -> `teams(tournament_id, id)`)
- `match_number`, `round_number`, `status`, `home_score`, `away_score`, `venue`, `referee`
- Check Constraint: `CHECK (home_team_id <> away_team_id)`

### `match_events` (Events)
- `id` (UUID, PK)
- `tournament_id` (UUID, FK -> `tournaments.id`)
- `match_id` (UUID, FK -> `matches(tournament_id, id)`)
- `team_id` (UUID, FK -> `teams(tournament_id, id)`)
- `player_id` (UUID, FK -> `players(tournament_id, id)`)
- `event_type` (`GOAL`, `ASSIST`, `YELLOW_CARD`, `RED_CARD`, `SUBSTITUTION`, `OWN_GOAL`)
- `minute` (INT, 0-130)

### `media_assets` & `audit_logs`
- Full tracking of uploaded image paths and tamper-evident audit logs.

---

## 3. High-Performance Indexes
- `idx_tournament_members_user` on `tournament_members(user_id)`
- `idx_access_codes_hash` on `access_codes(code_hash) WHERE is_active = true`
- `idx_teams_tournament` on `teams(tournament_id)`
- `idx_players_team` on `players(tournament_id, team_id)`
- `idx_matches_lookup` on `matches(tournament_id, stage_id, status)`
- `idx_matches_round` on `matches(tournament_id, round_number)`
- `idx_match_events_match` on `match_events(match_id, event_type)`
- `idx_audit_logs_tournament` on `audit_logs(tournament_id, created_at DESC)`
