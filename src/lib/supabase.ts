/**
 * TournX Supabase Client & Strict Environment Isolation Boundary
 * think.prompt.organise
 *
 * SAFETY GUARANTEES:
 * 1. Hard runtime barrier: Attempts to target the legacy production host
 *    (blvbadhssprenjizbnvz.supabase.co) throw an immediate fatal error.
 * 2. Designated dev project: Only targets jbzhtgqdgqjnffljwazy.supabase.co.
 * 3. Graceful fallback: If credentials are missing or placeholders, runs in 100%
 *    local synthetic mode without throwing or failing builds.
 * 4. Zero secret exposure: Never logs publishable keys or credentials.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { localDataService } from '../services/localDataService';

const PRODUCTION_FORBIDDEN_HOST = 'blvbadhssprenjizbnvz.supabase.co';
const AUTHORIZED_DEV_HOST = 'jbzhtgqdgqjnffljwazy.supabase.co';

const env: Record<string, string | undefined> = 
  (typeof import.meta !== 'undefined' && import.meta.env) 
    ? (import.meta.env as any) 
    : (typeof globalThis !== 'undefined' && (globalThis as any).process?.env ? (globalThis as any).process.env : {});

const rawUrl = (env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const rawKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

// 1. Strict Barrier against Original Production Database
if (rawUrl.includes(PRODUCTION_FORBIDDEN_HOST)) {
  const safetyMessage = `CRITICAL SAFETY VIOLATION: Attempted to target forbidden production host "${PRODUCTION_FORBIDDEN_HOST}". Aborting execution.`;
  console.error(safetyMessage);
  throw new Error(safetyMessage);
}

// 2. Check if a valid, non-placeholder publishable key is present
function isValidKey(key: string): boolean {
  if (!key) return false;
  if (key.startsWith('YOUR_') || key.includes('your-dev') || key.includes('placeholder')) {
    return false;
  }
  // JWT tokens typically contain 2 dots (header.payload.signature) or sb_publishable format
  return key.length > 20 && (key.includes('.') || key.startsWith('sb_p') || key.startsWith('sbp_'));
}

const isAuthorizedHost = rawUrl.includes(AUTHORIZED_DEV_HOST) || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1');
const hasValidKey = isValidKey(rawKey);

let clientInstance: SupabaseClient | null = null;
let configured = false;

if (rawUrl && isAuthorizedHost && hasValidKey) {
  try {
    clientInstance = createClient(rawUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'ftm_dev_auth_token',
      },
    });
    configured = true;
    console.info(`[TournX] Supabase client initialized for authorized development project: ${AUTHORIZED_DEV_HOST}`);
  } catch (err) {
    console.warn('[TournX] Failed to initialize Supabase client. Reverting to local synthetic mode.', err);
    clientInstance = null;
    configured = false;
  }
} else {
  if (rawUrl && !isAuthorizedHost) {
    console.warn(`[TournX] Provided Supabase URL does not match authorized development host (${AUTHORIZED_DEV_HOST}). Defaulting to local synthetic mode.`);
  } else if (!hasValidKey) {
    // Expected during development prior to key provision
    console.info('[TournX] Running in local synthetic data mode (persistent local storage).');
  }
}

export const isSupabaseConfigured: boolean = configured;
export const supabase: SupabaseClient | null = clientInstance;

/**
 * Returns true if real Supabase authentication is active and configured
 */
export function isRemoteAuthAvailable(): boolean {
  return isSupabaseConfigured && supabase !== null;
}

/**
 * Persistent anonymous voter ID helper for POTM polls
 */
export function getOrCreateAnonymousVoterId(): string {
  return localDataService.getOrCreateVoterId();
}

export async function getOrInitSupabaseVoterId(): Promise<string> {
  return localDataService.getOrCreateVoterId();
}
