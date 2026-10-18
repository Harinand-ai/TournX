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
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  inactivity_days INT NOT NULL DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce One Active Tournament Per Organizer Account rule at database level
CREATE UNIQUE INDEX IF NOT EXISTS uq_organizer_single_active ON tournaments (created_by) 
  WHERE created_by IS NOT NULL 
    AND status NOT IN ('ARCHIVED', 'COMPLETED') 
    AND deleted_at IS NULL;


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
SET search_path = public, pg_temp
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

-- ------------------------------------------------------------------------------
-- A. Tournaments Policies
-- ------------------------------------------------------------------------------

CREATE POLICY "tournaments_read" ON tournaments
  FOR SELECT USING (
    visibility = 'PUBLIC' 
    OR created_by = auth.uid() 
    OR get_user_tournament_role(id) IS NOT NULL
  );

CREATE POLICY "tournaments_insert" ON tournaments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY "tournaments_update" ON tournaments
  FOR UPDATE USING (
    get_user_tournament_role(id) = 'ORGANIZER'
  );

CREATE POLICY "tournaments_delete" ON tournaments
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- ------------------------------------------------------------------------------
-- B. Tournament Members Policies
-- ------------------------------------------------------------------------------

CREATE POLICY "tournament_members_read" ON tournament_members
  FOR SELECT USING (
    user_id = auth.uid() 
    OR get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

CREATE POLICY "tournament_members_insert" ON tournament_members
  FOR INSERT WITH CHECK (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

CREATE POLICY "tournament_members_update" ON tournament_members
  FOR UPDATE USING (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

CREATE POLICY "tournament_members_delete" ON tournament_members
  FOR DELETE USING (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

-- ------------------------------------------------------------------------------
-- C. Teams & Squads Policies
-- ------------------------------------------------------------------------------

CREATE POLICY "teams_read" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id 
        AND (t.visibility = 'PUBLIC' OR get_user_tournament_role(t.id) IS NOT NULL)
    )
  );

CREATE POLICY "teams_manage" ON teams
  FOR ALL USING (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

CREATE POLICY "players_read" ON players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id 
        AND (t.visibility = 'PUBLIC' OR get_user_tournament_role(t.id) IS NOT NULL)
    )
  );

CREATE POLICY "players_manage" ON players
  FOR ALL USING (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

-- ------------------------------------------------------------------------------
-- D. Stages, Groups & Enrollments Policies
-- ------------------------------------------------------------------------------

CREATE POLICY "stages_read" ON tournament_stages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id 
        AND (t.visibility = 'PUBLIC' OR get_user_tournament_role(t.id) IS NOT NULL)
    )
  );

CREATE POLICY "stages_manage" ON tournament_stages
  FOR ALL USING (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

CREATE POLICY "groups_read" ON groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id 
        AND (t.visibility = 'PUBLIC' OR get_user_tournament_role(t.id) IS NOT NULL)
    )
  );

CREATE POLICY "groups_manage" ON groups
  FOR ALL USING (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

CREATE POLICY "stage_teams_read" ON stage_teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id 
        AND (t.visibility = 'PUBLIC' OR get_user_tournament_role(t.id) IS NOT NULL)
    )
  );

CREATE POLICY "stage_teams_manage" ON stage_teams
  FOR ALL USING (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

-- ------------------------------------------------------------------------------
-- E. Matches & Fixtures Policies
-- ------------------------------------------------------------------------------

CREATE POLICY "matches_read" ON matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id 
        AND (t.visibility = 'PUBLIC' OR get_user_tournament_role(t.id) IS NOT NULL)
    )
  );

CREATE POLICY "matches_insert" ON matches
  FOR INSERT WITH CHECK (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

CREATE POLICY "matches_update" ON matches
  FOR UPDATE USING (
    get_user_tournament_role(tournament_id) IN ('ORGANIZER', 'SCORE')
  );

CREATE POLICY "matches_delete" ON matches
  FOR DELETE USING (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

-- ------------------------------------------------------------------------------
-- F. Match Events Policies (Goals, Cards, Substitutions)
-- ------------------------------------------------------------------------------

CREATE POLICY "events_read" ON match_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id 
        AND (t.visibility = 'PUBLIC' OR get_user_tournament_role(t.id) IS NOT NULL)
    )
  );

CREATE POLICY "events_record" ON match_events
  FOR INSERT WITH CHECK (
    get_user_tournament_role(tournament_id) IN ('ORGANIZER', 'SCORE')
  );

CREATE POLICY "events_update" ON match_events
  FOR UPDATE USING (
    get_user_tournament_role(tournament_id) IN ('ORGANIZER', 'SCORE')
  );

CREATE POLICY "events_delete" ON match_events
  FOR DELETE USING (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

-- ------------------------------------------------------------------------------
-- G. Access Codes Policies (Private to Organizers only)
-- ------------------------------------------------------------------------------

CREATE POLICY "access_codes_organizer_only" ON access_codes
  FOR ALL USING (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

-- ------------------------------------------------------------------------------
-- H. Media Assets Policies
-- ------------------------------------------------------------------------------

CREATE POLICY "media_assets_read" ON media_assets
  FOR SELECT USING (true);

CREATE POLICY "media_assets_manage" ON media_assets
  FOR ALL USING (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

-- ------------------------------------------------------------------------------
-- I. Audit Logs Policies (Append-only tamper-evident log)
-- ------------------------------------------------------------------------------

CREATE POLICY "audit_logs_read" ON audit_logs
  FOR SELECT USING (
    get_user_tournament_role(tournament_id) = 'ORGANIZER'
  );

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND (actor_id IS NULL OR actor_id = auth.uid())
  );

-- Note: No UPDATE or DELETE policies are defined for audit_logs (append-only enforcement).

-- ==============================================================================
-- 5. SECURE SERVER-SIDE ACCESS CODE REDEMPTION RPC
-- ==============================================================================

CREATE TABLE IF NOT EXISTS access_code_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  client_identifier TEXT NOT NULL,
  attempt_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_rate_limit_client UNIQUE (tournament_id, client_identifier)
);

ALTER TABLE access_code_rate_limits ENABLE ROW LEVEL SECURITY;

-- Deny all direct client access to rate limit tracking table (RPC operates via SECURITY DEFINER)
CREATE POLICY "access_code_rate_limits_deny_all" ON access_code_rate_limits
  FOR ALL USING (false);

CREATE OR REPLACE FUNCTION redeem_tournament_access_code(
  p_tournament_id UUID,
  p_code TEXT,
  p_client_identifier TEXT DEFAULT 'client_default'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code RECORD;
  v_rate RECORD;
  v_target_hash TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- 1. Input Validation
  IF p_tournament_id IS NULL OR p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tournament ID and access code are required.'
    );
  END IF;

  -- 2. Verify Tournament Exists
  IF NOT EXISTS (SELECT 1 FROM tournaments WHERE id = p_tournament_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tournament not found.'
    );
  END IF;

  -- 3. Enforce Server-Side Rate Limiting (Max 5 attempts per 5 minutes per client)
  SELECT * INTO v_rate 
  FROM access_code_rate_limits
  WHERE tournament_id = p_tournament_id AND client_identifier = p_client_identifier;

  IF FOUND THEN
    IF (v_now - v_rate.window_start) < INTERVAL '5 minutes' THEN
      IF v_rate.attempt_count >= 5 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Rate limit exceeded: Too many failed attempts. Please wait 5 minutes.'
        );
      ELSE
        UPDATE access_code_rate_limits
        SET attempt_count = attempt_count + 1
        WHERE id = v_rate.id;
      END IF;
    ELSE
      UPDATE access_code_rate_limits
      SET attempt_count = 1, window_start = v_now
      WHERE id = v_rate.id;
    END IF;
  ELSE
    INSERT INTO access_code_rate_limits (tournament_id, client_identifier, attempt_count, window_start)
    VALUES (p_tournament_id, p_client_identifier, 1, v_now);
  END IF;

  -- 4. Compute Salted SHA-256 Hash Matching Client Algorithm Exactly
  -- Accepts either plain access code or precomputed 64-char hex hash
  v_target_hash := CASE
    WHEN length(trim(p_code)) = 64 AND p_code ~ '^[0-9a-fA-F]{64}$' THEN lower(trim(p_code))
    ELSE encode(digest('tx_salt_' || upper(trim(p_code)), 'sha256'), 'hex')
  END;

  -- 5. Verify Hash against tournament access_codes
  SELECT * INTO v_code
  FROM access_codes
  WHERE tournament_id = p_tournament_id 
    AND code_hash = v_target_hash
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid, expired, or revoked access code.'
    );
  END IF;

  -- 6. Check Expiration
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access code has expired.'
    );
  END IF;

  -- 7. Check Usage Limit
  IF v_code.max_uses IS NOT NULL AND v_code.use_count >= v_code.max_uses THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access code has reached maximum permitted usage limit.'
    );
  END IF;

  -- 8. Increment usage counter
  UPDATE access_codes
  SET use_count = use_count + 1
  WHERE id = v_code.id;

  -- Reset rate limit counter on successful redemption
  DELETE FROM access_code_rate_limits 
  WHERE tournament_id = p_tournament_id AND client_identifier = p_client_identifier;

  -- 9. If authenticated, record/upgrade membership role
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO tournament_members (tournament_id, user_id, role)
    VALUES (p_tournament_id, auth.uid(), v_code.role)
    ON CONFLICT (tournament_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, updated_at = now();
  END IF;

  -- 10. Audit log redemption
  INSERT INTO audit_logs (tournament_id, actor_id, actor_role, action, entity_type, entity_id)
  VALUES (p_tournament_id, auth.uid(), v_code.role, 'REDEEM_CODE', 'access_codes', v_code.id);

  RETURN jsonb_build_object(
    'success', true,
    'role', v_code.role,
    'label', v_code.label,
    'tournament_id', p_tournament_id
  );
END;
$$;

-- Explicit Execution Permissions on Access Code Redemption RPC
REVOKE ALL ON FUNCTION redeem_tournament_access_code(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_tournament_access_code(UUID, TEXT, TEXT) TO authenticated, anon;

-- ==============================================================================
-- 6. STORAGE BUCKET & ROW LEVEL SECURITY POLICIES (TOURNAMENT MEDIA)
-- ==============================================================================

-- Initialize dedicated media bucket in Supabase storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tournament-media',
  'tournament-media',
  true,
  5242880, -- 5 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS on storage.objects
CREATE POLICY "tournament_media_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'tournament-media');

CREATE POLICY "tournament_media_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tournament-media'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "tournament_media_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'tournament-media'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "tournament_media_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tournament-media'
    AND auth.uid() IS NOT NULL
  );


