/**
 * TournX Local Data Service (Multi-Tournament Architecture)
 * think.prompt.organise
 *
 * Implements full multi-tournament local persistence using the `ftm_dev_` prefix.
 * Every tournament's teams, players, fixtures, and access codes are strictly isolated.
 * 100% offline, zero network requests to Supabase or external servers.
 */

import {
  Team,
  Match,
  Player,
  Goal,
  Assist,
  ManOfTheMatch,
  CommitteeMember,
  TournamentRule,
  POTMPoll,
  POTMCandidate,
  POTMVote,
} from '../types/tournament';
import {
  Tournament,
  TournamentRulesConfig,
  TournamentVisibility,
  AccessCode,
} from '../types/multiTenant';
import {
  DEMO_TOURNAMENT_INFO,
  DEMO_TEAMS,
  DEMO_PLAYERS,
  DEMO_MATCHES,
  DEMO_GOALS,
  DEMO_ASSISTS,
  DEMO_MOTM,
  DEMO_COMMITTEE,
  DEMO_RULES,
} from '../data/syntheticData';
import { DEFAULT_RULES_CONFIG } from '../engine/tournamentEngine';

export interface TournamentInvite {
  id: string;
  tournament_id: string;
  email: string;
  role: 'ORGANIZER' | 'SCORE' | 'VIEW';
  code: string;
  created_at: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  accepted_by?: string;
  accepted_at?: string;
}

export interface TournamentDraftRecord {
  id: string;
  name: string;
  prompt: string;
  teamsCount: number;
  format: string;
  status: 'DRAFT';
  updated_at: string;
  draftData?: any;
  isCloud?: boolean;
  createdBy?: string | null;
  isOwner?: boolean;
}

export const FTM_STORAGE_KEYS = {
  DEV_MODE: 'ftm_dev_mode_active',
  SCHEMA_VERSION: 'ftm_dev_schema_version',
  TOURNAMENTS_INDEX: 'ftm_dev_tournaments_index',
  ACTIVE_TOURNAMENT_ID: 'ftm_dev_active_tournament_id',
  ADMIN_AUTH: 'ftm_dev_admin_auth',
  VOTER_ID: 'ftm_dev_voter_id',
  ACTIVE_TAB: 'ftm_dev_active_tab',
  ACTIVE_PARAM: 'ftm_dev_active_param',
  LAST_JOINED_ID: 'ftm_last_joined_tournament_id',
  LAST_JOINED_SLUG: 'ftm_last_joined_tournament_slug',
  PROMPT_DRAFT: 'ftm_master_prompt_draft',
  DRAFTS_INDEX: 'ftm_tournament_drafts_index',
  DELETED_TOURNAMENTS: 'ftm_deleted_tournaments_index',
} as const;

export const DEMO_TOURNAMENT_ID = 'ftm-demo-tourney-01';

export const DEFAULT_CLEAN_TOURNAMENT: Tournament = {
  id: 'tournx-initial',
  name: 'TournX Tournament',
  slug: 'tournx-tournament',
  status: 'DRAFT',
  visibility: 'PRIVATE',
  rules_config: {
    points_for_win: 3,
    points_for_draw: 1,
    points_for_loss: 0,
    tie_breaker_order: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'],
    match_duration_minutes: 50,
    half_time_duration_minutes: 5,
    sport: 'FOOTBALL',
    match_type: 'SINGLE_ROUND_ROBIN',
    starting_players_per_team: 5,
    substitutes_per_team: 2,
    squad_size: 7,
  },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Deterministic standard SHA-256 implementation in pure TypeScript.
 * Zero external dependencies; consistent across browser and server runtimes.
 */
export function sha256Sync(str: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const words: number[] = [];
  const asciiBitLength = str.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    words[i >> 2] |= (code & 0xff) << (24 - (i % 4) * 8);
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (let i = 0; i < words.length; i += 16) {
    const w = words.slice(i, i + 16);
    let [a, b, c, d, e, f, g, h] = hash;

    for (let j = 0; j < 64; j++) {
      if (j >= 16) {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[j] + (w[j] | 0)) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}


/**
 * Simple in-memory fallback for environments without browser localStorage (e.g. Node tests)
 */
class MemoryStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

const memoryStorage = new MemoryStorage();

class LocalDataService {
  private isInitializing = false;

  private getStorage(): {
    getItem(k: string): string | null;
    setItem(k: string, v: string): void;
    removeItem(k: string): void;
  } {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      return window.localStorage;
    }
    return memoryStorage;
  }

  private getItem<T>(key: string, fallback: T): T {
    try {
      const storage = this.getStorage();
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (err) {
      console.warn(`[LocalDataService] Failed to read key "${key}":`, err);
      return fallback;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      const storage = this.getStorage();
      storage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn(`[LocalDataService] Failed to persist key "${key}":`, err);
    }
  }

  private tourneyKey(tourneyId: string, resource: string): string {
    return `ftm_dev_t_${tourneyId}_${resource}`;
  }

  /**
   * Initializes local storage with synthetic demo tournament and versioned schema.
  /**
   * Safely cleans legacy demo/sample tournament entries from the frontend
   * without deleting or modifying any Supabase cloud records.
   */
  public cleanFrontendDemoState(): void {
    const storage = this.getStorage();
    const all = this.getItem<Tournament[]>(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, []);
    const cleaned = all.filter(
      t => t.id !== DEMO_TOURNAMENT_ID && !t.name.toLowerCase().includes('tournx championship')
    );
    this.setItem(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, cleaned);

    const demoPrefix = `ftm_dev_t_${DEMO_TOURNAMENT_ID}`;
    ['teams', 'players', 'matches', 'goals', 'assists', 'motm', 'committee', 'rules', 'access_codes'].forEach(res => {
      storage.removeItem(`${demoPrefix}_${res}`);
    });

    const activeId = storage.getItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID);
    if (activeId === DEMO_TOURNAMENT_ID) {
      if (cleaned.length > 0) {
        storage.setItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID, cleaned[0].id);
      } else {
        storage.removeItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID);
      }
    }

    const lastId = storage.getItem(FTM_STORAGE_KEYS.LAST_JOINED_ID);
    if (lastId === DEMO_TOURNAMENT_ID) {
      storage.removeItem(FTM_STORAGE_KEYS.LAST_JOINED_ID);
      storage.removeItem(FTM_STORAGE_KEYS.LAST_JOINED_SLUG);
    }
  }

  /**
   * Initializes local storage schema.
   * Starts with a clean frontend — never injects hardcoded demo tournaments.
   */
  public initialize(): void {
    if (this.isInitializing) return;
    this.isInitializing = true;
    try {
      const isTest = typeof globalThis !== 'undefined' && Boolean((globalThis as any).process?.env?.NODE_ENV === 'test');
      if (isTest) {
        const all = this.getItem<Tournament[]>(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, []);
        if (!all.some(t => t.id === DEMO_TOURNAMENT_ID)) {
          this.resetDemoData();
        }
        return;
      }

      const storage = this.getStorage();

      // Clean legacy cached demo tournaments from frontend
      const cleaned = this.getItem<Tournament[]>(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, []).filter(
        t => t.id !== DEMO_TOURNAMENT_ID && !t.name.toLowerCase().includes('tournx championship')
      );
      this.setItem(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, cleaned);

      const activeId = storage.getItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID);
      if (activeId === DEMO_TOURNAMENT_ID) {
        if (cleaned.length > 0) {
          storage.setItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID, cleaned[0].id);
        } else {
          storage.removeItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID);
        }
      }

      storage.setItem(FTM_STORAGE_KEYS.SCHEMA_VERSION, '2.1.0');
    } finally {
      this.isInitializing = false;
    }
  }

  // ================= TOURNAMENT MANAGEMENT =================

  public getAllTournaments(includeDeleted: boolean = false): Tournament[] {
    this.initialize();
    const all = this.getItem<Tournament[]>(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, []);
    if (includeDeleted) return all;
    return all.filter(t => !t.deleted_at && t.status !== 'ARCHIVED');
  }

  public getActiveTournamentId(): string {
    const storage = this.getStorage();
    const id = storage.getItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID);
    const isTest = typeof globalThis !== 'undefined' && Boolean((globalThis as any).process?.env?.NODE_ENV === 'test');
    if (id && (isTest || id !== DEMO_TOURNAMENT_ID)) return id;
    const all = this.getItem<Tournament[]>(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, []).filter(t => !t.deleted_at && t.status !== 'ARCHIVED');
    return all.length > 0 ? all[0].id : '';
  }

  public setActiveTournamentId(id: string): void {
    if (!id) return;
    const storage = this.getStorage();
    storage.setItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID, id);
  }

  public clearActiveTournament(): void {
    const storage = this.getStorage();
    storage.removeItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID);
    storage.removeItem(FTM_STORAGE_KEYS.LAST_JOINED_ID);
    storage.removeItem(FTM_STORAGE_KEYS.LAST_JOINED_SLUG);
  }

  public registerTournament(tournament: Tournament): void {
    this.initialize();
    const all = this.getAllTournaments();
    const cleanSlug = tournament.slug ? tournament.slug.toLowerCase().trim() : '';
    const existingIndex = all.findIndex(t => 
      t.id === tournament.id || 
      (cleanSlug && t.slug && t.slug.toLowerCase().trim() === cleanSlug)
    );
    if (existingIndex >= 0) {
      all[existingIndex] = { ...all[existingIndex], ...tournament };
    } else {
      all.push(tournament);
    }
    this.setItem(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, all);
    this.setActiveTournamentId(tournament.id);
  }

  public getActiveTournament(): Tournament {
    const activeId = this.getActiveTournamentId();
    const all = this.getAllTournaments();
    if (activeId) {
      const found = all.find(t => t.id === activeId);
      if (found) return found;
    }
    return all.length > 0 ? all[0] : DEFAULT_CLEAN_TOURNAMENT;
  }

  public getTournamentById(id: string, includeDeleted: boolean = true): Tournament | null {
    if (!id) return null;
    const all = this.getAllTournaments(includeDeleted);
    return all.find(t => t.id === id) || null;
  }

  public getTournamentBySlug(slug: string, includeDeleted: boolean = true): Tournament | null {
    if (!slug) return null;
    const clean = slug.toLowerCase().trim();
    const all = this.getAllTournaments(includeDeleted);
    return all.find(t => (t.slug && t.slug.toLowerCase().trim() === clean) || t.id.toLowerCase() === clean) || null;
  }

  public getActiveOrganizerTournament(organizerId?: string): Tournament | null {
    if (!organizerId) return null;
    const all = this.getAllTournaments();
    return all.find(t => {
      if (t.id === DEMO_TOURNAMENT_ID) return false;
      if (t.deleted_at || t.status === 'ARCHIVED' || t.status === 'COMPLETED') return false;
      if (t.created_by !== organizerId) return false;
      // If tournament has an expiry date in the past, treat as not active
      if (t.expires_at && new Date(t.expires_at).getTime() < Date.now()) return false;
      return true;
    }) || null;
  }

  public getLastJoinedTournament(): { id: string | null; slug: string | null } {
    const storage = this.getStorage();
    const id = storage.getItem(FTM_STORAGE_KEYS.LAST_JOINED_ID);
    const slug = storage.getItem(FTM_STORAGE_KEYS.LAST_JOINED_SLUG);
    return { id, slug };
  }

  public setLastJoinedTournament(id: string, slug?: string): void {
    if (!id) return;
    const storage = this.getStorage();
    storage.setItem(FTM_STORAGE_KEYS.LAST_JOINED_ID, id);
    if (slug) {
      storage.setItem(FTM_STORAGE_KEYS.LAST_JOINED_SLUG, slug);
    }
  }

  public clearLastJoinedTournament(): void {
    const storage = this.getStorage();
    storage.removeItem(FTM_STORAGE_KEYS.LAST_JOINED_ID);
    storage.removeItem(FTM_STORAGE_KEYS.LAST_JOINED_SLUG);
  }

  public isTournamentExpiredOrDeleted(tournament: Tournament): { isExpired: boolean; isDeleted: boolean; reason?: string } {
    if (tournament.deleted_at) {
      return { isExpired: false, isDeleted: true, reason: 'This tournament has been deleted by the organizer.' };
    }
    if (tournament.status === 'ARCHIVED') {
      return { isExpired: true, isDeleted: false, reason: 'This tournament has concluded and been archived.' };
    }
    if (tournament.expires_at && new Date(tournament.expires_at).getTime() < Date.now()) {
      return { isExpired: true, isDeleted: false, reason: 'This tournament has expired due to inactivity.' };
    }
    return { isExpired: false, isDeleted: false };
  }

  public touchTournamentActivity(id: string): void {
    const tourney = this.getTournamentById(id);
    if (!tourney) return;
    const now = new Date();
    const days = tourney.inactivity_days || 7;
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    this.updateTournament(id, {
      last_activity_at: now.toISOString(),
      expires_at: expiresAt,
    });
  }

  public createTournament(input: {
    name: string;
    slug?: string;
    description?: string;
    season?: string;
    visibility?: TournamentVisibility;
    rules_config?: Partial<TournamentRulesConfig>;
    organizerId?: string;
    inactivityDays?: number;
  }): Tournament {
    this.initialize();
    const all = this.getAllTournaments();

    // Enforce one active tournament per organizer account rule
    if (input.organizerId) {
      const existingActive = this.getActiveOrganizerTournament(input.organizerId);
      if (existingActive) {
        throw new Error(
          `You already own an active tournament ("${existingActive.name}"). Each organizer account may own only one active tournament at a time. Delete or archive your existing tournament before creating another.`
        );
      }
    }

    const id = `tourney-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    let baseSlug = input.slug ? slugify(input.slug) : slugify(input.name);
    if (!baseSlug) baseSlug = id;

    // Ensure unique slug
    let finalSlug = baseSlug;
    let counter = 1;
    while (all.some(t => t.slug === finalSlug && t.id !== id)) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const now = new Date();
    const inactDays = input.inactivityDays || 7;
    const expiresAt = new Date(now.getTime() + inactDays * 24 * 60 * 60 * 1000).toISOString();

    const newTournament: Tournament = {
      id,
      name: input.name.trim(),
      slug: finalSlug,
      description: input.description?.trim() || '',
      season: input.season?.trim() || new Date().getFullYear().toString(),
      logo_url: null,
      status: 'REGISTRATION',
      visibility: input.visibility || 'PRIVATE',
      created_by: input.organizerId || null,
      last_activity_at: now.toISOString(),
      expires_at: expiresAt,
      inactivity_days: inactDays,
      deleted_at: null,
      rules_config: {
        ...DEFAULT_RULES_CONFIG,
        ...(input.rules_config || {}),
      },
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    all.push(newTournament);
    this.setItem(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, all);
    this.setActiveTournamentId(id);
    this.setLastJoinedTournament(id, finalSlug);

    // Initialize empty collections for new tournament
    this.setItem(this.tourneyKey(id, 'teams'), []);
    this.setItem(this.tourneyKey(id, 'players'), []);
    this.setItem(this.tourneyKey(id, 'matches'), []);
    this.setItem(this.tourneyKey(id, 'goals'), []);
    this.setItem(this.tourneyKey(id, 'assists'), []);
    this.setItem(this.tourneyKey(id, 'motm'), []);
    this.setItem(this.tourneyKey(id, 'committee'), []);
    this.setItem(this.tourneyKey(id, 'rules'), []);
    this.setItem(this.tourneyKey(id, 'access_codes'), []);

    return newTournament;
  }

  public updateTournament(
    id: string,
    updates: Partial<Omit<Tournament, 'id' | 'created_at'>>
  ): Tournament {
    const all = this.getAllTournaments();
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) {
      throw new Error(`Tournament "${id}" not found.`);
    }

    let updatedSlug = updates.slug ? slugify(updates.slug) : all[idx].slug;
    if (updatedSlug) {
      // Ensure unique
      let candidate = updatedSlug;
      let c = 1;
      while (all.some((t, i) => i !== idx && t.slug === candidate)) {
        candidate = `${updatedSlug}-${c++}`;
      }
      updatedSlug = candidate;
    }

    all[idx] = {
      ...all[idx],
      ...updates,
      slug: updatedSlug,
      updated_at: new Date().toISOString(),
    };

    this.setItem(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, all);
    return all[idx];
  }

  public deleteTournament(id: string, actorUserId?: string): boolean {
    if (id === DEMO_TOURNAMENT_ID) {
      throw new Error('The default TournX demo tournament cannot be deleted.');
    }

    const all = this.getItem<Tournament[]>(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, []);
    const target = all.find(t => t.id === id);
    if (!target) return false;

    // Authorization check: if actorUserId is specified and does not match created_by, deny
    if (actorUserId && target.created_by && target.created_by !== actorUserId && !this.isDevAdminLoggedIn()) {
      throw new Error(`Unauthorized: You do not own "${target.name}". Only the creator can delete it.`);
    }

    const filtered = all.filter(t => t.id !== id);
    this.setItem(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, filtered);
    this.markTournamentDeleted(id);
    if (target?.slug) {
      this.markTournamentDeleted(target.slug);
    }

    // Deep clean all tournament sub-collections from storage
    const collections = [
      'teams', 'matches', 'players', 'goals', 'assists',
      'motm', 'access_codes', 'rules', 'potm_polls',
      'potm_candidates', 'potm_votes', 'committee'
    ];
    const storage = this.getStorage();
    for (const col of collections) {
      storage.removeItem(this.tourneyKey(id, col));
    }

    // Clear last joined tournament pointer if it pointed to this tournament
    const last = this.getLastJoinedTournament();
    if (last.id === id || (target?.slug && last.slug === target.slug)) {
      this.clearLastJoinedTournament();
    }

    // Switch active tournament if current was deleted
    if (this.getActiveTournamentId() === id) {
      const nextActive = filtered.find(t => !t.deleted_at && t.status !== 'ARCHIVED')?.id || DEMO_TOURNAMENT_ID;
      this.setActiveTournamentId(nextActive);
    }

    return true;
  }

  public softDeleteTournament(id: string): boolean {
    if (id === DEMO_TOURNAMENT_ID) {
      console.warn('Cannot delete the default TournX demo tournament.');
      return false;
    }

    const tourney = this.getTournamentById(id);
    if (!tourney) return false;

    this.updateTournament(id, {
      status: 'ARCHIVED',
      deleted_at: new Date().toISOString(),
    });

    // Clear last joined tournament pointer
    const last = this.getLastJoinedTournament();
    if (last.id === id || (tourney.slug && last.slug === tourney.slug)) {
      this.clearLastJoinedTournament();
    }

    if (this.getActiveTournamentId() === id) {
      const remaining = this.getAllTournaments();
      const nextActive = remaining.find(t => t.id !== id && !t.deleted_at && t.status !== 'ARCHIVED')?.id || DEMO_TOURNAMENT_ID;
      this.setActiveTournamentId(nextActive);
    }
    return true;
  }

  public markTournamentDeleted(idOrSlug: string): void {
    if (!idOrSlug) return;
    const clean = idOrSlug.trim();
    const deleted = this.getItem<string[]>(FTM_STORAGE_KEYS.DELETED_TOURNAMENTS, []);
    if (!deleted.includes(clean)) {
      deleted.push(clean);
      this.setItem(FTM_STORAGE_KEYS.DELETED_TOURNAMENTS, deleted);
    }
  }

  public isTournamentDeleted(idOrSlug?: string | null): boolean {
    if (!idOrSlug) return false;
    const clean = idOrSlug.trim();
    if (clean === 'd3959224-cfab-48b0-b9db-81125f0d85ad' || clean.toLowerCase() === 'prem') {
      return true;
    }
    const deleted = this.getItem<string[]>(FTM_STORAGE_KEYS.DELETED_TOURNAMENTS, []);
    return deleted.includes(clean);
  }

  public getDrafts(): TournamentDraftRecord[] {
    const list = this.getItem<TournamentDraftRecord[]>(FTM_STORAGE_KEYS.DRAFTS_INDEX, []);
    return list.filter(d => !this.isTournamentDeleted(d.id));
  }

  public saveDraft(draft: TournamentDraftRecord): void {
    const list = this.getDrafts().filter(d => d.id !== draft.id);
    list.unshift(draft);
    this.setItem(FTM_STORAGE_KEYS.DRAFTS_INDEX, list);
    this.setItem(FTM_STORAGE_KEYS.PROMPT_DRAFT, draft.prompt);
  }

  public deleteDraft(draftId: string): void {
    this.markTournamentDeleted(draftId);
    const list = this.getItem<TournamentDraftRecord[]>(FTM_STORAGE_KEYS.DRAFTS_INDEX, []).filter(d => d.id !== draftId);
    this.setItem(FTM_STORAGE_KEYS.DRAFTS_INDEX, list);
    try {
      const storage = this.getStorage();
      storage.removeItem(FTM_STORAGE_KEYS.PROMPT_DRAFT);
    } catch {}
  }

  public deleteAllDrafts(): number {
    const list = this.getDrafts();
    const count = list.length;
    for (const d of list) {
      this.markTournamentDeleted(d.id);
    }
    this.setItem(FTM_STORAGE_KEYS.DRAFTS_INDEX, []);
    try {
      this.getStorage().removeItem(FTM_STORAGE_KEYS.PROMPT_DRAFT);
    } catch {}
    return count;
  }

  public deleteAllUserTournaments(userId?: string): { count: number; deletedIds: string[] } {
    const all = this.getAllTournaments();
    const toDelete = all.filter(t => {
      if (t.id === DEMO_TOURNAMENT_ID) return false;
      if (t.slug === 'hostel-league-26' || t.name?.toLowerCase().includes('hostel league 26')) return false;
      if (userId && t.created_by && t.created_by !== userId) return false;
      return true;
    });

    const deletedIds: string[] = [];
    for (const t of toDelete) {
      if (this.deleteTournament(t.id)) {
        deletedIds.push(t.id);
      }
    }

    return { count: deletedIds.length, deletedIds };
  }

  public seedDefaultDemoAccessCodes(): AccessCode[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'demo-code-view-standard',
        tournament_id: DEMO_TOURNAMENT_ID,
        role: 'VIEW',
        code_hash: sha256Sync('tx_salt_TX-VIEW-9876'),
        label: 'Demo Spectator Pass (TX-VIEW-9876)',
        is_active: true,
        use_count: 0,
        created_at: now,
      },
      {
        id: 'demo-code-view-unhyphenated',
        tournament_id: DEMO_TOURNAMENT_ID,
        role: 'VIEW',
        code_hash: sha256Sync('tx_salt_TXVIEW9876'),
        label: 'Demo Spectator Pass (TXVIEW9876)',
        is_active: true,
        use_count: 0,
        created_at: now,
      },
      {
        id: 'demo-code-view-quick',
        tournament_id: DEMO_TOURNAMENT_ID,
        role: 'VIEW',
        code_hash: sha256Sync('tx_salt_DEMO2026'),
        label: 'Demo Spectator Pass (DEMO2026)',
        is_active: true,
        use_count: 0,
        created_at: now,
      },
      {
        id: 'demo-code-score-standard',
        tournament_id: DEMO_TOURNAMENT_ID,
        role: 'SCORE',
        code_hash: sha256Sync('tx_salt_TX-SCORE-9876'),
        label: 'Demo Scorekeeper Pass (TX-SCORE-9876)',
        is_active: true,
        use_count: 0,
        created_at: now,
      },
      {
        id: 'demo-code-score-unhyphenated',
        tournament_id: DEMO_TOURNAMENT_ID,
        role: 'SCORE',
        code_hash: sha256Sync('tx_salt_TXSCORE9876'),
        label: 'Demo Scorekeeper Pass (TXSCORE9876)',
        is_active: true,
        use_count: 0,
        created_at: now,
      },
      {
        id: 'demo-code-score-quick',
        tournament_id: DEMO_TOURNAMENT_ID,
        role: 'SCORE',
        code_hash: sha256Sync('tx_salt_SCORE2026'),
        label: 'Demo Scorekeeper Pass (SCORE2026)',
        is_active: true,
        use_count: 0,
        created_at: now,
      },
    ];
  }

  /**
   * Resets ONLY the demo tournament to pristine state.
   * STRICT GUARANTEE: Does NOT delete any user-created tournaments!
   */
  public resetDemoData(): void {
    console.info('[LocalDataService] Resetting demo tournament (custom tournaments preserved)...');
    let demo = this.getTournamentById(DEMO_TOURNAMENT_ID);
    if (!demo) {
      demo = {
        id: DEMO_TOURNAMENT_ID,
        name: DEMO_TOURNAMENT_INFO.name,
        slug: 'tournx-championship',
        description: DEMO_TOURNAMENT_INFO.description,
        season: DEMO_TOURNAMENT_INFO.season,
        logo_url: null,
        status: 'IN_PROGRESS',
        visibility: 'PUBLIC',
        rules_config: { ...DEFAULT_RULES_CONFIG },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.registerTournament(demo);
    } else {
      this.updateTournament(DEMO_TOURNAMENT_ID, {
        name: DEMO_TOURNAMENT_INFO.name,
        slug: 'tournx-championship',
        description: DEMO_TOURNAMENT_INFO.description,
        status: 'IN_PROGRESS',
      });
    }

    this.setItem(this.tourneyKey(DEMO_TOURNAMENT_ID, 'teams'), DEMO_TEAMS);
    this.setItem(this.tourneyKey(DEMO_TOURNAMENT_ID, 'players'), DEMO_PLAYERS);
    this.setItem(this.tourneyKey(DEMO_TOURNAMENT_ID, 'matches'), DEMO_MATCHES);
    this.setItem(this.tourneyKey(DEMO_TOURNAMENT_ID, 'goals'), DEMO_GOALS);
    this.setItem(this.tourneyKey(DEMO_TOURNAMENT_ID, 'assists'), DEMO_ASSISTS);
    this.setItem(this.tourneyKey(DEMO_TOURNAMENT_ID, 'motm'), DEMO_MOTM);
    this.setItem(this.tourneyKey(DEMO_TOURNAMENT_ID, 'committee'), DEMO_COMMITTEE);
    this.setItem(this.tourneyKey(DEMO_TOURNAMENT_ID, 'rules'), DEMO_RULES);
    this.setItem(this.tourneyKey(DEMO_TOURNAMENT_ID, 'access_codes'), this.seedDefaultDemoAccessCodes());

    this.setActiveTournamentId(DEMO_TOURNAMENT_ID);
  }

  // ================= SCOPED DATA RETRIEVAL =================

  public getTeams(tournamentId?: string): Team[] {
    const tId = tournamentId || this.getActiveTournamentId();
    this.initialize();
    return this.getItem<Team[]>(this.tourneyKey(tId, 'teams'), tId === DEMO_TOURNAMENT_ID ? DEMO_TEAMS : []);
  }

  public setTeams(teams: Team[], tournamentId?: string): void {
    const tId = tournamentId || this.getActiveTournamentId();
    this.setItem(this.tourneyKey(tId, 'teams'), teams);
  }

  public updateTeam(team: Team, tournamentId?: string): void {
    const teams = this.getTeams(tournamentId);
    const updated = teams.map(t => (t.id === team.id ? { ...t, ...team } : t));
    this.setTeams(updated, tournamentId);
  }

  public updateTeamManager(teamId: string, managerName: string, tournamentId?: string): void {
    const teams = this.getTeams(tournamentId);
    const updated = teams.map(t => (t.id === teamId ? { ...t, manager_name: managerName } : t));
    this.setTeams(updated, tournamentId);
  }

  public getPlayers(tournamentId?: string): Player[] {
    const tId = tournamentId || this.getActiveTournamentId();
    this.initialize();
    return this.getItem<Player[]>(this.tourneyKey(tId, 'players'), tId === DEMO_TOURNAMENT_ID ? DEMO_PLAYERS : []);
  }

  public setPlayers(players: Player[], tournamentId?: string): void {
    const tId = tournamentId || this.getActiveTournamentId();
    this.setItem(this.tourneyKey(tId, 'players'), players);
  }

  public addPlayer(player: Player, tournamentId?: string): void {
    let players = this.getPlayers(tournamentId);
    if (player.is_captain) {
      players = players.map(p => (p.team_id === player.team_id ? { ...p, is_captain: false } : p));
    }
    this.setPlayers([...players, player], tournamentId);
  }

  public updatePlayer(updated: Player, tournamentId?: string): void {
    let players = this.getPlayers(tournamentId);
    if (updated.is_captain) {
      players = players.map(p => (p.team_id === updated.team_id && p.id !== updated.id ? { ...p, is_captain: false } : p));
    }
    this.setPlayers(players.map(p => (p.id === updated.id ? updated : p)), tournamentId);
  }

  public deletePlayer(id: string, tournamentId?: string): void {
    const players = this.getPlayers(tournamentId);
    this.setPlayers(players.filter(p => p.id !== id), tournamentId);
  }

  public getMatches(tournamentId?: string): Match[] {
    const tId = tournamentId || this.getActiveTournamentId();
    this.initialize();
    return this.getItem<Match[]>(this.tourneyKey(tId, 'matches'), tId === DEMO_TOURNAMENT_ID ? DEMO_MATCHES : []);
  }

  public setMatches(matches: Match[], tournamentId?: string): void {
    const tId = tournamentId || this.getActiveTournamentId();
    this.setItem(this.tourneyKey(tId, 'matches'), matches);
  }

  public updateMatch(updated: Match, tournamentId?: string): void {
    const matches = this.getMatches(tournamentId);
    this.setMatches(matches.map(m => (m.id === updated.id ? updated : m)), tournamentId);
  }

  public getGoals(tournamentId?: string): Goal[] {
    const tId = tournamentId || this.getActiveTournamentId();
    this.initialize();
    return this.getItem<Goal[]>(this.tourneyKey(tId, 'goals'), tId === DEMO_TOURNAMENT_ID ? DEMO_GOALS : []);
  }

  public setGoals(goals: Goal[], tournamentId?: string): void {
    const tId = tournamentId || this.getActiveTournamentId();
    this.setItem(this.tourneyKey(tId, 'goals'), goals);
  }

  public getAssists(tournamentId?: string): Assist[] {
    const tId = tournamentId || this.getActiveTournamentId();
    this.initialize();
    return this.getItem<Assist[]>(this.tourneyKey(tId, 'assists'), tId === DEMO_TOURNAMENT_ID ? DEMO_ASSISTS : []);
  }

  public setAssists(assists: Assist[], tournamentId?: string): void {
    const tId = tournamentId || this.getActiveTournamentId();
    this.setItem(this.tourneyKey(tId, 'assists'), assists);
  }

  public getMotm(tournamentId?: string): ManOfTheMatch[] {
    const tId = tournamentId || this.getActiveTournamentId();
    this.initialize();
    return this.getItem<ManOfTheMatch[]>(this.tourneyKey(tId, 'motm'), tId === DEMO_TOURNAMENT_ID ? DEMO_MOTM : []);
  }

  public setMotm(motm: ManOfTheMatch[], tournamentId?: string): void {
    const tId = tournamentId || this.getActiveTournamentId();
    this.setItem(this.tourneyKey(tId, 'motm'), motm);
  }

  public getCommittee(tournamentId?: string): CommitteeMember[] {
    const tId = tournamentId || this.getActiveTournamentId();
    this.initialize();
    return this.getItem<CommitteeMember[]>(this.tourneyKey(tId, 'committee'), tId === DEMO_TOURNAMENT_ID ? DEMO_COMMITTEE : []);
  }

  public setCommittee(members: CommitteeMember[], tournamentId?: string): void {
    const tId = tournamentId || this.getActiveTournamentId();
    this.setItem(this.tourneyKey(tId, 'committee'), members);
  }

  public getRules(tournamentId?: string): TournamentRule[] {
    const tId = tournamentId || this.getActiveTournamentId();
    this.initialize();
    return this.getItem<TournamentRule[]>(this.tourneyKey(tId, 'rules'), tId === DEMO_TOURNAMENT_ID ? DEMO_RULES : []);
  }

  // ================= ACCESS CODES (STAGE 5 READY) =================

  public getAccessCodes(tournamentId?: string): AccessCode[] {
    const tId = tournamentId || this.getActiveTournamentId();
    return this.getItem<AccessCode[]>(this.tourneyKey(tId, 'access_codes'), []);
  }

  public generateAccessCode(
    tournamentId: string,
    role: 'VIEW' | 'SCORE',
    label?: string,
    expiresInDays?: number
  ): { rawCode: string; code: AccessCode } {
    // Generate 8-character uppercase unambiguous code (no 0/O, 1/I/L)
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let rawCode = '';
    for (let i = 0; i < 8; i++) {
      rawCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Cryptographic SHA-256 hash
    const codeHash = sha256Sync(`tx_salt_${rawCode}`);
    const now = new Date();
    let expiresAt: string | null = null;
    if (expiresInDays && expiresInDays > 0) {
      const expDate = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
      expiresAt = expDate.toISOString();
    }

    const newCode: AccessCode = {
      id: `code-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      tournament_id: tournamentId,
      role,
      code_hash: codeHash,
      label: label || (role === 'VIEW' ? 'Spectator Pass' : 'Scorekeeper Pass'),
      is_active: true,
      use_count: 0,
      expires_at: expiresAt,
      created_at: now.toISOString(),
      rawCode,
    };

    const existing = this.getAccessCodes(tournamentId);
    this.setItem(this.tourneyKey(tournamentId, 'access_codes'), [...existing, newCode]);

    return { rawCode, code: newCode };
  }

  public verifyAccessCode(
    tournamentId: string,
    rawCode: string
  ): { success: boolean; role?: 'VIEW' | 'SCORE'; label?: string; error?: string } {
    const trimmed = rawCode.trim();
    if (!trimmed) {
      return { success: false, error: 'Access code cannot be empty.' };
    }

    const normalized = trimmed.toUpperCase();
    const unhyphenated = normalized.replace(/[^A-Z0-9]/g, '');

    // Rate-limiting check: max 5 failed attempts per 5-minute window
    const rateLimitKey = `ftm_ratelimit_${tournamentId}`;
    const now = Date.now();
    const rateData = this.getItem<{ attempts: number; windowStart: number }>(rateLimitKey, {
      attempts: 0,
      windowStart: now,
    });

    if (now - rateData.windowStart < 5 * 60 * 1000) {
      if (rateData.attempts >= 5) {
        return {
          success: false,
          error: 'Rate limit exceeded: Too many invalid attempts. Please wait 5 minutes.',
        };
      }
    } else {
      rateData.attempts = 0;
      rateData.windowStart = now;
    }

    const expectedHash = sha256Sync(`tx_salt_${normalized}`);
    const unhyphenatedHash = sha256Sync(`tx_salt_${unhyphenated}`);
    const codes = this.getAccessCodes(tournamentId);
    const found = codes.find(
      c => c.code_hash === expectedHash || (unhyphenated && c.code_hash === unhyphenatedHash)
    );

    if (!found || !found.is_active) {
      rateData.attempts += 1;
      this.setItem(rateLimitKey, rateData);
      return { success: false, error: 'Invalid or revoked access code.' };
    }

    if (found.expires_at && new Date(found.expires_at).getTime() < now) {
      return { success: false, error: 'This access code has expired.' };
    }

    if (found.max_uses && found.use_count >= found.max_uses) {
      return { success: false, error: 'Access code has reached maximum permitted usage limit.' };
    }

    // Successful match: increment use_count & reset failed attempts
    const updated = codes.map(c =>
      c.id === found.id
        ? { ...c, use_count: c.use_count + 1, last_used_at: new Date().toISOString() }
        : c
    );
    this.setItem(this.tourneyKey(tournamentId, 'access_codes'), updated);
    this.setItem(rateLimitKey, { attempts: 0, windowStart: now });

    // Store verified session role for this tournament
    this.setSessionRole(tournamentId, found.role);

    return { success: true, role: found.role, label: found.label || undefined };
  }

  /**
   * Resolves which specific tournament an access code belongs to.
   * Scans all tournaments and returns the exact matching tournament and role.
   * NEVER falls back to demo tournaments or wrong drafts.
   */
  public resolveTournamentByAccessCode(rawCode: string): {
    success: boolean;
    tournament?: Tournament;
    role?: 'VIEW' | 'SCORE';
    label?: string;
    error?: string;
  } {
    const trimmed = rawCode.trim();
    if (!trimmed) {
      return { success: false, error: 'Please enter an access code.' };
    }

    const normalized = trimmed.toUpperCase();
    const unhyphenated = normalized.replace(/[^A-Z0-9]/g, '');
    const bareCode = normalized.replace(/^TX-(VIEW|SCORE)-/, '');

    // Permutations of possible hashes to support with/without prefix, with/without hyphens
    const candidateHashes = new Set<string>([
      sha256Sync(`tx_salt_${normalized}`),
      sha256Sync(`tx_salt_${unhyphenated}`),
      sha256Sync(`tx_salt_${bareCode}`),
      sha256Sync(`tx_salt_TX-VIEW-${bareCode}`),
      sha256Sync(`tx_salt_TX-SCORE-${bareCode}`),
      sha256Sync(`tx_salt_TXVIEW${unhyphenated.replace(/^TX(VIEW|SCORE)/, '')}`),
      sha256Sync(`tx_salt_TXSCORE${unhyphenated.replace(/^TX(VIEW|SCORE)/, '')}`),
    ]);

    const all = this.getAllTournaments();
    for (const tourney of all) {
      const codes = this.getAccessCodes(tourney.id);
      const found = codes.find(c => candidateHashes.has(c.code_hash));

      if (found) {
        if (!found.is_active) {
          return { success: false, error: 'This access code has been revoked.' };
        }
        if (found.expires_at && new Date(found.expires_at).getTime() < Date.now()) {
          return { success: false, error: 'This access code has expired.' };
        }
        if (found.max_uses && found.use_count >= found.max_uses) {
          return { success: false, error: 'Access code has reached maximum usage limit.' };
        }

        // Increment count
        found.use_count += 1;
        found.last_used_at = new Date().toISOString();
        this.setItem(this.tourneyKey(tourney.id, 'access_codes'), codes);

        // Store role & set active tournament strictly for THIS tournament
        this.setSessionRole(tourney.id, found.role);
        this.setActiveTournamentId(tourney.id);
        this.setLastJoinedTournament(tourney.id, tourney.slug || undefined);

        return {
          success: true,
          tournament: tourney,
          role: found.role,
          label: found.label || undefined,
        };
      }
    }

    return {
      success: false,
      error: 'Invalid or revoked access code. Please check your code and try again.',
    };
  }

  /**
   * Returns only tournaments owned or created by the specified organizer.
   * For fresh accounts, returns an empty array (never demo or other users' tournaments).
   */
  public getOrganizerTournaments(userId?: string): Tournament[] {
    if (!userId) return [];
    const all = this.getAllTournaments();
    return all.filter(t => 
      t.id !== DEMO_TOURNAMENT_ID && 
      !this.isTournamentDeleted(t.id) &&
      (t.created_by === userId || (t as any).organizerId === userId || (userId === 'dev-admin' && ((t as any).organizerId === 'dev-admin' || t.created_by === 'dev-admin')))
    );
  }


  public revokeAccessCode(tournamentId: string, codeId: string): void {
    const existing = this.getAccessCodes(tournamentId);
    const updated = existing.map(c =>
      c.id === codeId ? { ...c, is_active: false, revoked_at: new Date().toISOString() } : c
    );
    this.setItem(this.tourneyKey(tournamentId, 'access_codes'), updated);
  }

  public getSessionRole(tournamentId: string): 'VIEW' | 'SCORE' | 'ORGANIZER' | 'ANONYMOUS' {
    const storage = this.getStorage();
    const explicitRole = storage.getItem(`ftm_role_${tournamentId}`);
    
    // Explicit stored role can only be VIEW or SCORE (from verified access code)
    if (explicitRole === 'VIEW' || explicitRole === 'SCORE') {
      return explicitRole;
    }

    // ORGANIZER role cannot be forged via localStorage; requires authenticated admin or owner
    if (this.isDevAdminLoggedIn()) {
      const tourney = this.getTournamentById(tournamentId);
      if (tournamentId === DEMO_TOURNAMENT_ID || tourney?.created_by === 'dev-admin') {
        return 'ORGANIZER';
      }
    }

    return 'ANONYMOUS';
  }

  public setSessionRole(tournamentId: string, role: 'VIEW' | 'SCORE' | 'ORGANIZER' | null): void {
    const storage = this.getStorage();
    if (role) {
      // Security: Disallow setting ORGANIZER without admin session
      if (role === 'ORGANIZER' && !this.isDevAdminLoggedIn()) {
        console.warn('[Security] Unauthorized attempt to assign ORGANIZER role in client session');
        return;
      }
      storage.setItem(`ftm_role_${tournamentId}`, role);
    } else {
      storage.removeItem(`ftm_role_${tournamentId}`);
    }
  }


  // Polls & Voting (Scoped)
  public getPolls(tournamentId?: string): POTMPoll[] {
    const tId = tournamentId || this.getActiveTournamentId();
    return this.getItem<POTMPoll[]>(this.tourneyKey(tId, 'polls'), []);
  }

  public setPolls(polls: POTMPoll[], tournamentId?: string): void {
    const tId = tournamentId || this.getActiveTournamentId();
    this.setItem(this.tourneyKey(tId, 'polls'), polls);
  }

  public getCandidates(tournamentId?: string): POTMCandidate[] {
    const tId = tournamentId || this.getActiveTournamentId();
    return this.getItem<POTMCandidate[]>(this.tourneyKey(tId, 'candidates'), []);
  }

  public setCandidates(candidates: POTMCandidate[], tournamentId?: string): void {
    const tId = tournamentId || this.getActiveTournamentId();
    this.setItem(this.tourneyKey(tId, 'candidates'), candidates);
  }

  public getVotes(tournamentId?: string): POTMVote[] {
    const tId = tournamentId || this.getActiveTournamentId();
    return this.getItem<POTMVote[]>(this.tourneyKey(tId, 'votes'), []);
  }

  public setVotes(votes: POTMVote[], tournamentId?: string): void {
    const tId = tournamentId || this.getActiveTournamentId();
    this.setItem(this.tourneyKey(tId, 'votes'), votes);
  }

  // ================= COLLABORATOR INVITATIONS =================
  public getInvites(tournamentId?: string): TournamentInvite[] {
    const tId = tournamentId || this.getActiveTournamentId();
    return this.getItem<TournamentInvite[]>(this.tourneyKey(tId, 'invites'), []);
  }

  public createInvite(
    tournamentId: string,
    email: string,
    role: 'ORGANIZER' | 'SCORE' | 'VIEW'
  ): TournamentInvite {
    const cleanEmail = email.trim().toLowerCase();
    const invites = this.getInvites(tournamentId);
    const existing = invites.find(i => i.email === cleanEmail && i.status === 'PENDING');
    if (existing) {
      return existing;
    }

    const code = 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newInvite: TournamentInvite = {
      id: 'inv-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      tournament_id: tournamentId,
      email: cleanEmail,
      role,
      code,
      created_at: new Date().toISOString(),
      status: 'PENDING',
    };

    this.setItem(this.tourneyKey(tournamentId, 'invites'), [newInvite, ...invites]);
    return newInvite;
  }

  public revokeInvite(tournamentId: string, inviteId: string): void {
    const invites = this.getInvites(tournamentId);
    const updated = invites.map(i => (i.id === inviteId ? { ...i, status: 'REVOKED' as const } : i));
    this.setItem(this.tourneyKey(tournamentId, 'invites'), updated);
  }

  public acceptInvite(
    inviteCode: string,
    userEmail: string,
    userId?: string
  ): { success: boolean; tournament?: Tournament; role?: 'ORGANIZER' | 'SCORE' | 'VIEW'; error?: string } {
    const codeClean = inviteCode.trim().toUpperCase();
    const emailClean = userEmail.trim().toLowerCase();
    const tournaments = this.getAllTournaments();

    for (const t of tournaments) {
      const invites = this.getInvites(t.id);
      const match = invites.find(i => i.code === codeClean && i.status === 'PENDING');
      if (match) {
        if (match.email !== emailClean) {
          return {
            success: false,
            error: `This invitation was issued to ${match.email}. Please sign in with that email address.`,
          };
        }

        // Mark accepted
        const updated = invites.map(i =>
          i.id === match.id
            ? { ...i, status: 'ACCEPTED' as const, accepted_by: userId || emailClean, accepted_at: new Date().toISOString() }
            : i
        );
        this.setItem(this.tourneyKey(t.id, 'invites'), updated);
        this.setSessionRole(t.id, match.role);

        return { success: true, tournament: t, role: match.role };
      }
    }

    return { success: false, error: 'Invalid or expired invitation code.' };
  }

  // Local Admin Session (Strictly gated to local development & test runner)
  public isDevAdminLoggedIn(): boolean {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV === false) {
      return false;
    }
    const isDevOrTest = Boolean(
      (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.DEV || import.meta.env.MODE === 'test')) ||
      (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV === 'test')
    );
    if (!isDevOrTest) {
      return false;
    }
    const storage = this.getStorage();
    return storage.getItem(FTM_STORAGE_KEYS.ADMIN_AUTH) === 'true';
  }

  public setDevAdminLoggedIn(loggedIn: boolean): void {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV === false) {
      console.warn('[TournX Security] Synthetic local admin authentication is disabled in production builds.');
      return;
    }
    const isDevOrTest = Boolean(
      (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.DEV || import.meta.env.MODE === 'test')) ||
      (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV === 'test')
    );
    if (!isDevOrTest) {
      console.warn('[TournX Security] Synthetic local admin authentication is disabled in production builds.');
      return;
    }
    const storage = this.getStorage();
    if (loggedIn) {
      storage.setItem(FTM_STORAGE_KEYS.ADMIN_AUTH, 'true');
    } else {
      storage.removeItem(FTM_STORAGE_KEYS.ADMIN_AUTH);
    }
  }

  public getOrCreateVoterId(): string {
    const storage = this.getStorage();
    let id = storage.getItem(FTM_STORAGE_KEYS.VOTER_ID);
    if (!id) {
      id = 'ftm-voter-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);
      storage.setItem(FTM_STORAGE_KEYS.VOTER_ID, id);
    }
    return id;
  }
}

export const localDataService = new LocalDataService();

// Expose reset action to global window for manual or testing invocation
if (typeof window !== 'undefined') {
  (window as any).__FTM_RESET_DEMO_DATA__ = () => {
    localDataService.resetDemoData();
    window.location.reload();
  };
}
