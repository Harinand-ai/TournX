-- ==============================================================================
-- TournX — Authorized Test Data Cleanup & Migration Fix
-- Supabase Project: jbzhtgqdgqjnffljwazy (https://jbzhtgqdgqjnffljwazy.supabase.co)
--
-- TARGET RECORDS CONFIRMED FOR DISPOSAL:
-- 1. Tournament 'prem' (UUID: d3959224-cfab-48b0-b9db-81125f0d85ad, created_by: NULL)
-- 2. Tournament 'an 8 team tournemnt' (UUID: 763809f3-0e6d-41a3-b5d1-9e56fd37547b, created_by: 7e9f81a4-06e7-4008-9829-a447ece98b85)
-- 3. Tournament 'TournX Championship' (UUID: a0d5ce7e-14c0-4945-9da5-05602ac20cd2, created_by: 6d92623e-6475-40d3-b107-0d7635f8ce55)
--
-- CRITICAL SAFETY INVARIANT:
-- STRICTLY PRESERVES HOSTEL LEAGUE 26 AND ALL UNRELATED PRODUCTION DATA.
-- ==============================================================================

BEGIN;

-- 1. Clean dependent test data for confirmed test tournaments
DELETE FROM matches 
WHERE tournament_id IN (
  'd3959224-cfab-48b0-b9db-81125f0d85ad',
  '763809f3-0e6d-41a3-b5d1-9e56fd37547b',
  'a0d5ce7e-14c0-4945-9da5-05602ac20cd2'
)
AND tournament_id NOT IN (
  SELECT id FROM tournaments WHERE slug ILIKE '%hostel%' OR name ILIKE '%hostel league 26%'
);

DELETE FROM teams 
WHERE tournament_id IN (
  'd3959224-cfab-48b0-b9db-81125f0d85ad',
  '763809f3-0e6d-41a3-b5d1-9e56fd37547b',
  'a0d5ce7e-14c0-4945-9da5-05602ac20cd2'
)
AND tournament_id NOT IN (
  SELECT id FROM tournaments WHERE slug ILIKE '%hostel%' OR name ILIKE '%hostel league 26%'
);

DELETE FROM tournament_stages 
WHERE tournament_id IN (
  'd3959224-cfab-48b0-b9db-81125f0d85ad',
  '763809f3-0e6d-41a3-b5d1-9e56fd37547b',
  'a0d5ce7e-14c0-4945-9da5-05602ac20cd2'
)
AND tournament_id NOT IN (
  SELECT id FROM tournaments WHERE slug ILIKE '%hostel%' OR name ILIKE '%hostel league 26%'
);

DELETE FROM access_codes 
WHERE tournament_id IN (
  'd3959224-cfab-48b0-b9db-81125f0d85ad',
  '763809f3-0e6d-41a3-b5d1-9e56fd37547b',
  'a0d5ce7e-14c0-4945-9da5-05602ac20cd2'
);

DELETE FROM tournament_members 
WHERE tournament_id IN (
  'd3959224-cfab-48b0-b9db-81125f0d85ad',
  '763809f3-0e6d-41a3-b5d1-9e56fd37547b',
  'a0d5ce7e-14c0-4945-9da5-05602ac20cd2'
);

DELETE FROM access_code_rate_limits 
WHERE tournament_id IN (
  'd3959224-cfab-48b0-b9db-81125f0d85ad',
  '763809f3-0e6d-41a3-b5d1-9e56fd37547b',
  'a0d5ce7e-14c0-4945-9da5-05602ac20cd2'
);

-- 2. Safely remove the 3 confirmed disposable test tournaments
DELETE FROM tournaments 
WHERE id IN (
  'd3959224-cfab-48b0-b9db-81125f0d85ad',
  '763809f3-0e6d-41a3-b5d1-9e56fd37547b',
  'a0d5ce7e-14c0-4945-9da5-05602ac20cd2'
)
AND slug NOT ILIKE '%hostel%'
AND name NOT ILIKE '%hostel league 26%';

-- 3. Remove confirmed disposable test Auth accounts (if present in auth.users)
DELETE FROM auth.users 
WHERE id IN (
  '7e9f81a4-06e7-4008-9829-a447ece98b85',
  '6d92623e-6475-40d3-b107-0d7635f8ce55',
  'f5f1a1a4-64fd-4ffd-92f5-c5dd69ea9845'
);

-- 4. Fix RPC pgcrypto extensions schema resolution and bytea cast
CREATE OR REPLACE FUNCTION redeem_tournament_access_code(
  p_tournament_id UUID,
  p_code TEXT,
  p_client_identifier TEXT DEFAULT 'client_default'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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

  -- 4. Compute Salted SHA-256 Hash with explicit extensions.digest bytea call
  v_target_hash := CASE
    WHEN length(trim(p_code)) = 64 AND p_code ~ '^[0-9a-fA-F]{64}$' THEN lower(trim(p_code))
    ELSE encode(extensions.digest(('tx_salt_' || upper(trim(p_code)))::bytea, 'sha256'), 'hex')
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

REVOKE ALL ON FUNCTION redeem_tournament_access_code(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_tournament_access_code(UUID, TEXT, TEXT) TO authenticated, anon;

COMMIT;
