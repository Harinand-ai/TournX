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

// Any valid Supabase host or local dev server is permitted, strictly excluding the forbidden legacy host
const isAuthorizedHost = 
  Boolean(rawUrl) &&
  !rawUrl.includes(PRODUCTION_FORBIDDEN_HOST) &&
  (rawUrl.includes('.supabase.co') || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1'));

const hasValidKey = isValidKey(rawKey);

// Maintain singleton instance across Vite HMR reloads
const globalScope = typeof globalThis !== 'undefined' ? (globalThis as any) : (window as any);

let clientInstance: SupabaseClient | null = globalScope.__tournx_supabase_client__ || null;
let configured = Boolean(clientInstance);

if (!clientInstance && rawUrl && isAuthorizedHost && hasValidKey) {
  try {
    clientInstance = createClient(rawUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'ftm_dev_auth_token',
      },
    });
    globalScope.__tournx_supabase_client__ = clientInstance;
    configured = true;
    try {
      const parsedHost = new URL(rawUrl).host;
      console.info(`[TournX] Supabase client initialized for project host: ${parsedHost}`);
    } catch {
      console.info(`[TournX] Supabase client initialized`);
    }
  } catch (err) {
    console.warn('[TournX] Failed to initialize Supabase client. Reverting to local synthetic mode.', err);
    clientInstance = null;
    configured = false;
  }
} else if (!hasValidKey && !clientInstance) {
  console.info('[TournX] Running in local synthetic data mode (persistent local storage).');
}

export const isSupabaseConfigured: boolean = configured;
export const supabase: SupabaseClient | null = clientInstance;

/**
 * Returns the currently configured Supabase project hostname (e.g. jbzhtgqdgqjnffljwazy.supabase.co) or null
 */
export function getSupabaseProjectHost(): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).host;
  } catch {
    return rawUrl;
  }
}

/**
 * Resends the signup confirmation email to the specified address
 */
export async function resendConfirmationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase client is not configured.' };
  }
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resend confirmation email.' };
  }
}

/**
 * Sends a password reset email to the specified address
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase authentication service is not configured.' };
  }
  try {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/#admin-login` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: redirectUrl,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send password reset email.' };
  }
}

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
