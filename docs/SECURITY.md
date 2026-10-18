# TournX — Security Architecture & Threat Model
> **think.prompt.organise**

This document specifies the security controls, authentication boundaries, Row Level Security (RLS) enforcement, and cryptographic design of TournX.

---

## 1. Threat Model & Security Boundaries

| Potential Threat | Defense-in-Depth Mechanism |
|---|---|
| Accidental connection to legacy production database (`blvbadhssprenjizbnvz.supabase.co`) | Hard runtime assertion barrier in `src/lib/supabase.ts` throws immediate fatal error before any network request can occur. |
| Cross-tenant data leakage (Tournament A accessing Tournament B) | Database composite foreign keys `(tournament_id, id)` and PostgreSQL Row Level Security (RLS) with security-definer role checks. |
| Plaintext access code leakage / brute forcing | Unambiguous 8-character charset, salted SHA-256 cryptographic hashing, zero plaintext token storage, and server-side rate-limiting (max 5 failed attempts per 5 minutes). |
| Unauthorized score alteration | Scorer role (`SCORE`) restricted to entering match results and events for authorized tournaments only; cannot modify rules or delete tournaments. |
| Privilege escalation via client-side tampering | Client-side role claims are untrusted. Permissions are evaluated on the database boundary via `auth.uid()` and `tournament_members`. |
| Credential leakage in source control | `.env*` files (except `.env.example`) excluded by `.gitignore`. Repository index verified clean of API keys. |

---

## 2. Role-Based Access Control (RBAC) Matrix

| Entity / Action | VIEW Role | SCORE Role | ORGANIZER Role | Public Visitor |
|---|---|---|---|---|
| View public tournaments | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| View private tournaments | ✅ (With token) | ✅ (With token) | ✅ Owned | ❌ Denied |
| Submit live match score | ❌ Denied | ✅ Allowed | ✅ Allowed | ❌ Denied |
| Submit match events (goals/cards) | ❌ Denied | ✅ Allowed | ✅ Allowed | ❌ Denied |
| Edit tournament rules / points | ❌ Denied | ❌ Denied | ✅ Allowed | ❌ Denied |
| Generate fixtures / brackets | ❌ Denied | ❌ Denied | ✅ Allowed | ❌ Denied |
| Generate / revoke access tokens | ❌ Denied | ❌ Denied | ✅ Allowed | ❌ Denied |
| Delete tournament | ❌ Denied | ❌ Denied | ✅ Creator only | ❌ Denied |

---

## 3. Cryptographic Token Lifecycle

1. **Generation**: High-entropy 8-character code generated using unambiguous character set `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (eliminating visually ambiguous characters `0/O`, `1/I/L`).
2. **Hashing**: Code is salted and hashed via deterministic SHA-256:
   `code_hash = SHA256("tx_salt_" + code)`
3. **Storage**: Only `code_hash` is stored in the `access_codes` table.
4. **Display**: The plaintext token is revealed exactly once to the organizer.
5. **Redemption**: Validated via `redeem_tournament_access_code` RPC (PostgreSQL `pgcrypto` function `encode(digest('tx_salt_' || upper(trim(code)), 'sha256'), 'hex')`) matching the client-side SHA-256 algorithm exactly. Zero use of incompatible `crypt()` methods.
6. **Rate-Limiting**: Enforced on the database boundary via `access_code_rate_limits` table (max 5 failed attempts per 5-minute rolling window per client). Direct client access to rate limits table is denied by RLS.
7. **Revocation & Expiry**: Organizers can revoke active tokens instantly; expired tokens are rejected at the database level.

---

## 4. Media Storage Security

1. **Bucket Isolation**: Development assets are isolated within the `tournament-media` bucket.
2. **File Restrictions**: Max 5 MB per file; MIME types strictly restricted to `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`.
3. **Storage Policies**:
   - `SELECT`: Public read for tournament media assets.
   - `INSERT`/`UPDATE`/`DELETE`: Restricted to authenticated users with organizer permissions. Anonymous uploads and modifications are strictly rejected.

---

## 5. Organizer Bootstrap & Ownership Model

The system solves the initial provisioning problem without backdoor bypasses or weakened RLS:

1. **Self-Contained Ownership**:
   - When any authenticated user inserts a row into `tournaments`, the RLS policy `tournaments_insert` verifies `auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid())`.
   - The security-definer function `get_user_tournament_role(target_tournament_id)` checks both `tournament_members` AND `tournaments.created_by = auth.uid()`.
   - If the user is the creator, the function immediately returns `'ORGANIZER'`.
2. **Atomic Member Assignment**:
   - The client immediately registers the creator as an explicit `tournament_members` row. Because `get_user_tournament_role` already returns `'ORGANIZER'`, the member insert policy `get_user_tournament_role(tournament_id) = 'ORGANIZER'` succeeds without circular dependency.
3. **Immutability of Audit Logs**:
   - The `audit_logs` table defines only `SELECT` and `INSERT` policies. No `UPDATE` or `DELETE` policies exist, making audit logs strictly tamper-evident and append-only.
4. **Security-Definer Function Search Path**:
   - All security-definer RPC functions specify `SET search_path = public, pg_temp` to prevent search_path hijacking attacks.

---

## 6. Client Bundle & Environment Hygiene

1. **Zero Secret Key Exposure**:
   - The frontend application strictly consumes `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`.
   - No `service_role` key is ever included in code, environment variables, production bundles, or Capacitor assets.
2. **Forbidden Production Host Barrier**:
   - Runtime guard in `src/lib/supabase.ts` throws a fatal error if `blvbadhssprenjizbnvz.supabase.co` is referenced, completely eliminating cross-contamination risk.
