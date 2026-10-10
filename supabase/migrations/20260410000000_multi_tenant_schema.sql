-- ==============================================================================
-- TournX Multi-Tenant Database Schema (Draft Migration)
-- think.prompt.organise
-- 
-- Phase 3A: Architectural Design Only.
-- DO NOT EXECUTE AGAINST ANY REMOTE OR PRODUCTION DATABASE.
-- Designed for PostgreSQL 15+ / Supabase with Row Level Security (RLS).
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUMS
-- ==============================================================================

DO $$ BEGIN
  CREATE TYPE tournament_status AS ENUM ('DRAFT', 'REGISTRATION', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tournament_visibility AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tournament_role AS ENUM ('ORGANIZER', 'SCORE', 'VIEW');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stage_type AS ENUM (
    'SINGLE_ROUND_ROBIN',
    'DOUBLE_ROUND_ROBIN',
    'GROUP_STAGE',
    'SINGLE_ELIMINATION',
    'DOUBLE_ELIMINATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stage_status AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE player_position AS ENUM ('GK', 'CB', 'MID', 'CF', 'TBD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('UPCOMING', 'LIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_event_type AS ENUM (
    'GOAL',
    'ASSIST',
    'YELLOW_CARD',
    'RED_CARD',
    'SUBSTITUTION',
    'OWN_GOAL',
    'PENALTY_SCORED',
    'PENALTY_MISSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE media_asset_type AS ENUM ('TOURNAMENT_LOGO', 'TEAM_CREST', 'PLAYER_PHOTO', 'DOCUMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==============================================================================
-- 2. CORE TOURNAMENT TABLES
-- ==============================================================================

-- Tournaments (Root Tenant Entity)
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  season VARCHAR(100),
  logo_url TEXT,
  status tournament_status NOT NULL DEFAULT 'DRAFT',
  visibility tournament_visibility NOT NULL DEFAULT 'PRIVATE',
  rules_config JSONB NOT NULL DEFAULT '{
    "points_for_win": 3,
    "points_for_draw": 1,
    "points_for_loss": 0,
    "tie_breaker_order": ["POINTS", "GOAL_DIFFERENCE", "GOALS_FOR", "HEAD_TO_HEAD"],
    "match_duration_minutes": 50,
    "half_time_duration_minutes": 5,
    "max_substitutes": 5
  }'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tournament Members (User Role Assignments)
CREATE TABLE IF NOT EXISTS tournament_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role tournament_role NOT NULL DEFAULT 'VIEW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tournament_member UNIQUE (tournament_id, user_id)
);

-- Access Codes (Cryptographic Hashed Codes for Code-Based VIEW and SCORE Roles)
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  role tournament_role NOT NULL CHECK (role IN ('VIEW', 'SCORE')),
  code_hash TEXT NOT NULL,
  label VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INT DEFAULT NULL,
  use_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  revoked_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tournament_active_code UNIQUE (tournament_id, code_hash)
);

-- Tournament Stages (Stages within a tournament, e.g. Group Stage, Knockout)
CREATE TABLE IF NOT EXISTS tournament_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sequence_order INT NOT NULL DEFAULT 1,
  stage_type stage_type NOT NULL DEFAULT 'SINGLE_ROUND_ROBIN',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status stage_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_stage_composite UNIQUE (tournament_id, id),
  CONSTRAINT uq_stage_order UNIQUE (tournament_id, sequence_order)
);

-- Groups (Groups within a stage, e.g. Group A, Group B)
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL,
  name VARCHAR(50) NOT NULL,
  sequence_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_group_stage FOREIGN KEY (tournament_id, stage_id)
    REFERENCES tournament_stages(tournament_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_group_composite UNIQUE (tournament_id, id),
  CONSTRAINT uq_stage_group_name UNIQUE (stage_id, name)
);

-- Teams (Participating Clubs)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(10) NOT NULL,
  manager_name VARCHAR(100),
  logo_url TEXT,
  primary_color VARCHAR(20) DEFAULT '#2563eb',
  secondary_color VARCHAR(20) DEFAULT '#93c5fd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_team_composite UNIQUE (tournament_id, id),
  CONSTRAINT uq_tournament_team_name UNIQUE (tournament_id, name),
  CONSTRAINT uq_tournament_team_short UNIQUE (tournament_id, short_name)
);

-- Stage Team Enrollments
CREATE TABLE IF NOT EXISTS stage_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL,
  group_id UUID DEFAULT NULL,
  team_id UUID NOT NULL,
  seed INT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_stage_team_stage FOREIGN KEY (tournament_id, stage_id)
    REFERENCES tournament_stages(tournament_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_stage_team_group FOREIGN KEY (tournament_id, group_id)
    REFERENCES groups(tournament_id, id) ON DELETE SET NULL,
  CONSTRAINT fk_stage_team_team FOREIGN KEY (tournament_id, team_id)
    REFERENCES teams(tournament_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_stage_team UNIQUE (stage_id, team_id)
);

-- Players (Registered Squad Members)
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  position player_position NOT NULL DEFAULT 'TBD',
  jersey_number INT DEFAULT NULL,
  is_captain BOOLEAN NOT NULL DEFAULT false,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_player_team FOREIGN KEY (tournament_id, team_id)
    REFERENCES teams(tournament_id, id) ON DELETE CASCADE,
  CONSTRAINT uq_player_composite UNIQUE (tournament_id, id),
  CONSTRAINT chk_jersey_number CHECK (jersey_number IS NULL OR (jersey_number >= 0 AND jersey_number <= 99))
);

-- Ensure captain uniqueness per team
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_captain ON players(team_id) WHERE is_captain = true;

-- Ensure jersey number uniqueness per team (if jersey number assigned)
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_jersey ON players(team_id, jersey_number) WHERE jersey_number IS NOT NULL;

-- Matches / Fixtures
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL,
  group_id UUID DEFAULT NULL,
  match_number INT NOT NULL,
  round_number INT NOT NULL DEFAULT 1,
  home_team_id UUID NOT NULL,
  away_team_id UUID NOT NULL,
  scheduled_date DATE DEFAULT NULL,
  scheduled_time TIME DEFAULT NULL,
  venue VARCHAR(255) DEFAULT NULL,
  referee VARCHAR(100) DEFAULT NULL,
  assistant_referee_1 VARCHAR(100) DEFAULT NULL,
  assistant_referee_2 VARCHAR(100) DEFAULT NULL,
  status match_status NOT NULL DEFAULT 'UPCOMING',
  home_score INT DEFAULT NULL,
  away_score INT DEFAULT NULL,
  is_override BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_match_stage FOREIGN KEY (tournament_id, stage_id)
    REFERENCES tournament_stages(tournament_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_match_group FOREIGN KEY (tournament_id, group_id)
    REFERENCES groups(tournament_id, id) ON DELETE SET NULL,
  CONSTRAINT fk_match_home_team FOREIGN KEY (tournament_id, home_team_id)
    REFERENCES teams(tournament_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_match_away_team FOREIGN KEY (tournament_id, away_team_id)
    REFERENCES teams(tournament_id, id) ON DELETE RESTRICT,
  CONSTRAINT uq_match_composite UNIQUE (tournament_id, id),
  CONSTRAINT uq_tournament_match_number UNIQUE (tournament_id, match_number),
  CONSTRAINT chk_teams_different CHECK (home_team_id <> away_team_id),
  CONSTRAINT chk_scores_valid CHECK (
    (status = 'COMPLETED' AND home_score IS NOT NULL AND away_score IS NOT NULL AND home_score >= 0 AND away_score >= 0) OR
    (status <> 'COMPLETED')
  )
);

-- Match Events (Goals, Assists, Cards, Substitutions)
CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id UUID NOT NULL,
  team_id UUID NOT NULL,
  player_id UUID NOT NULL,
  event_type match_event_type NOT NULL,
  minute INT NOT NULL CHECK (minute >= 0 AND minute <= 130),
  secondary_player_id UUID DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_event_match FOREIGN KEY (tournament_id, match_id)
    REFERENCES matches(tournament_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_event_team FOREIGN KEY (tournament_id, team_id)
    REFERENCES teams(tournament_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_event_player FOREIGN KEY (tournament_id, player_id)
    REFERENCES players(tournament_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_event_secondary_player FOREIGN KEY (tournament_id, secondary_player_id)
    REFERENCES players(tournament_id, id) ON DELETE SET NULL
);

-- Media Assets (Uploaded logos, crests, player headshots)
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  asset_type media_asset_type NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  associated_entity_type VARCHAR(50) DEFAULT NULL,
  associated_entity_id UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_media_path UNIQUE (tournament_id, storage_path)
);

-- Audit Logs (Tamper-evident operations trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  actor_id UUID DEFAULT NULL,
  actor_role tournament_role NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID DEFAULT NULL,
  previous_state JSONB DEFAULT NULL,
  new_state JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. HIGH-PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tournament_members_user ON tournament_members(user_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_hash ON access_codes(code_hash) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_teams_tournament ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(tournament_id, team_id);
CREATE INDEX IF NOT EXISTS idx_matches_lookup ON matches(tournament_id, stage_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id, event_type);
CREATE INDEX IF NOT EXISTS idx_match_events_player ON match_events(player_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tournament ON audit_logs(tournament_id, created_at DESC);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES BLUEPRINT
-- ==============================================================================

-- Enable RLS across all multi-tenant tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Security Definer helper functions to evaluate tournament roles
CREATE OR REPLACE FUNCTION get_user_tournament_role(target_tournament_id UUID)
RETURNS tournament_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role tournament_role;
BEGIN
  -- 1. Check direct tournament_members entry for authenticated user
  SELECT role INTO v_role
  FROM tournament_members
  WHERE tournament_id = target_tournament_id
    AND user_id = auth.uid();
  
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- 2. Check if user is the tournament creator/owner
  IF EXISTS (
    SELECT 1 FROM tournaments
    WHERE id = target_tournament_id AND created_by = auth.uid()
  ) THEN
    RETURN 'ORGANIZER'::tournament_role;
  END IF;

  RETURN NULL;
END;
$$;
