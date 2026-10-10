/**
 * Supabase Client Stub & Strict Development Isolation Boundary
 *
 * SAFETY NOTICE:
 * In Phase 2, this project runs in 100% LOCAL SYNTHETIC DATA MODE.
 * No network connections to Supabase or external servers are established.
 * Attempts to connect to the original production host (blvbadhssprenjizbnvz.supabase.co)
 * are strictly blocked by runtime assertion.
 */

import { localDataService } from '../services/localDataService';

const PRODUCTION_FORBIDDEN_HOST = 'blvbadhssprenjizbnvz.supabase.co';

const env: Record<string, string | undefined> = 
  (typeof import.meta !== 'undefined' && import.meta.env) 
    ? (import.meta.env as any) 
    : (typeof globalThis !== 'undefined' && (globalThis as any).process?.env ? (globalThis as any).process.env : {});

const rawUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';

if (rawUrl.includes(PRODUCTION_FORBIDDEN_HOST)) {
  const safetyMessage = `CRITICAL SAFETY VIOLATION: Attempted to target forbidden production host "${PRODUCTION_FORBIDDEN_HOST}". Aborting execution.`;
  console.error(safetyMessage);
  throw new Error(safetyMessage);
}

// Phase 2: Supabase is disabled; pure local synthetic mode is active.
export const isSupabaseConfigured = false;
export const supabase = null;

// Helper to get or generate a persistent local voter ID using ftm_dev_ prefix
export function getOrCreateAnonymousVoterId(): string {
  return localDataService.getOrCreateVoterId();
}

export async function getOrInitSupabaseVoterId(): Promise<string> {
  return localDataService.getOrCreateVoterId();
}
