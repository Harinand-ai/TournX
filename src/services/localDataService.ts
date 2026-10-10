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

export const FTM_STORAGE_KEYS = {
  DEV_MODE: 'ftm_dev_mode_active',
  SCHEMA_VERSION: 'ftm_dev_schema_version',
  TOURNAMENTS_INDEX: 'ftm_dev_tournaments_index',
  ACTIVE_TOURNAMENT_ID: 'ftm_dev_active_tournament_id',
  ADMIN_AUTH: 'ftm_dev_admin_auth',
  VOTER_ID: 'ftm_dev_voter_id',
  ACTIVE_TAB: 'ftm_dev_active_tab',
  ACTIVE_PARAM: 'ftm_dev_active_param',
} as const;

export const DEMO_TOURNAMENT_ID = 'ftm-demo-tourney-01';

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
   */
  public initialize(): void {
    const storage = this.getStorage();

    // 1. Initialize tournaments list
    let tournaments = this.getItem<Tournament[]>(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, []);
    let demoTourney = tournaments.find(t => t.id === DEMO_TOURNAMENT_ID);

    if (!demoTourney) {
      demoTourney = {
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
      tournaments = [demoTourney, ...tournaments];
      this.setItem(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, tournaments);
    }

    // 2. Set active tournament if not set
    if (!storage.getItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID)) {
      storage.setItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID, DEMO_TOURNAMENT_ID);
    }

    // 3. Populate demo tournament resources if missing
    const demoTeamsKey = this.tourneyKey(DEMO_TOURNAMENT_ID, 'teams');
    if (!storage.getItem(demoTeamsKey)) {
      this.setItem(demoTeamsKey, DEMO_TEAMS);
    }

    const demoPlayersKey = this.tourneyKey(DEMO_TOURNAMENT_ID, 'players');
    if (!storage.getItem(demoPlayersKey)) {
      this.setItem(demoPlayersKey, DEMO_PLAYERS);
    }

    const demoMatchesKey = this.tourneyKey(DEMO_TOURNAMENT_ID, 'matches');
    if (!storage.getItem(demoMatchesKey)) {
      this.setItem(demoMatchesKey, DEMO_MATCHES);
    }

    const demoGoalsKey = this.tourneyKey(DEMO_TOURNAMENT_ID, 'goals');
    if (!storage.getItem(demoGoalsKey)) {
      this.setItem(demoGoalsKey, DEMO_GOALS);
    }

    const demoAssistsKey = this.tourneyKey(DEMO_TOURNAMENT_ID, 'assists');
    if (!storage.getItem(demoAssistsKey)) {
      this.setItem(demoAssistsKey, DEMO_ASSISTS);
    }

    const demoMotmKey = this.tourneyKey(DEMO_TOURNAMENT_ID, 'motm');
    if (!storage.getItem(demoMotmKey)) {
      this.setItem(demoMotmKey, DEMO_MOTM);
    }

    const demoCommitteeKey = this.tourneyKey(DEMO_TOURNAMENT_ID, 'committee');
    if (!storage.getItem(demoCommitteeKey)) {
      this.setItem(demoCommitteeKey, DEMO_COMMITTEE);
    }

    const demoRulesKey = this.tourneyKey(DEMO_TOURNAMENT_ID, 'rules');
    if (!storage.getItem(demoRulesKey)) {
      this.setItem(demoRulesKey, DEMO_RULES);
    }

    storage.setItem(FTM_STORAGE_KEYS.DEV_MODE, 'true');
    storage.setItem(FTM_STORAGE_KEYS.SCHEMA_VERSION, '2.0.0');
  }

  // ================= TOURNAMENT MANAGEMENT =================

  public getAllTournaments(): Tournament[] {
    this.initialize();
    return this.getItem<Tournament[]>(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, []);
  }

  public getActiveTournamentId(): string {
    this.initialize();
    const storage = this.getStorage();
    return storage.getItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID) || DEMO_TOURNAMENT_ID;
  }

  public setActiveTournamentId(id: string): void {
    const tournaments = this.getAllTournaments();
    const found = tournaments.find(t => t.id === id);
    if (!found) {
      console.warn(`[LocalDataService] Tournament ID "${id}" not found. Keeping current.`);
      return;
    }
    const storage = this.getStorage();
    storage.setItem(FTM_STORAGE_KEYS.ACTIVE_TOURNAMENT_ID, id);
  }

  public getActiveTournament(): Tournament {
    const activeId = this.getActiveTournamentId();
    const all = this.getAllTournaments();
    return all.find(t => t.id === activeId) || all[0];
  }

  public getTournamentById(id: string): Tournament | null {
    const all = this.getAllTournaments();
    return all.find(t => t.id === id) || null;
  }

  public getTournamentBySlug(slug: string): Tournament | null {
    const all = this.getAllTournaments();
    return all.find(t => t.slug === slug || t.id === slug) || null;
  }

  public createTournament(input: {
    name: string;
    slug?: string;
    description?: string;
    season?: string;
    rules_config?: Partial<TournamentRulesConfig>;
  }): Tournament {
    this.initialize();
    const all = this.getAllTournaments();

    const id = `tourney-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    let baseSlug = input.slug ? slugify(input.slug) : slugify(input.name);
    if (!baseSlug) baseSlug = id;

    // Ensure unique slug
    let finalSlug = baseSlug;
    let counter = 1;
    while (all.some(t => t.slug === finalSlug && t.id !== id)) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const newTournament: Tournament = {
      id,
      name: input.name.trim(),
      slug: finalSlug,
      description: input.description?.trim() || '',
      season: input.season?.trim() || new Date().getFullYear().toString(),
      logo_url: null,
      status: 'REGISTRATION',
      visibility: 'PRIVATE',
      rules_config: {
        ...DEFAULT_RULES_CONFIG,
        ...(input.rules_config || {}),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    all.push(newTournament);
    this.setItem(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, all);
    this.setActiveTournamentId(id);

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

  public deleteTournament(id: string): boolean {
    if (id === DEMO_TOURNAMENT_ID) {
      console.warn('Cannot delete the default TournX demo tournament.');
      return false;
    }

    const all = this.getAllTournaments();
    const filtered = all.filter(t => t.id !== id);
    this.setItem(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, filtered);

    // Switch active if current was deleted
    if (this.getActiveTournamentId() === id) {
      this.setActiveTournamentId(DEMO_TOURNAMENT_ID);
    }

    return true;
  }

  /**
   * Resets ONLY the demo tournament to pristine state.
   * STRICT GUARANTEE: Does NOT delete any user-created tournaments!
   */
  public resetDemoData(): void {
    console.info('[LocalDataService] Resetting demo tournament (custom tournaments preserved)...');
    const demo = this.getTournamentById(DEMO_TOURNAMENT_ID);
    if (demo) {
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
    const players = this.getPlayers(tournamentId);
    this.setPlayers([...players, player], tournamentId);
  }

  public updatePlayer(updated: Player, tournamentId?: string): void {
    const players = this.getPlayers(tournamentId);
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
      label: label || `${role} Access Code`,
      is_active: true,
      use_count: 0,
      expires_at: expiresAt,
      created_at: now.toISOString(),
    };

    const existing = this.getAccessCodes(tournamentId);
    this.setItem(this.tourneyKey(tournamentId, 'access_codes'), [...existing, newCode]);

    return { rawCode, code: newCode };
  }

  public verifyAccessCode(
    tournamentId: string,
    rawCode: string
  ): { success: boolean; role?: 'VIEW' | 'SCORE'; label?: string; error?: string } {
    const normalized = rawCode.trim().toUpperCase();
    if (!normalized) {
      return { success: false, error: 'Access code cannot be empty.' };
    }

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
    const codes = this.getAccessCodes(tournamentId);
    const found = codes.find(c => c.code_hash === expectedHash);

    if (!found || !found.is_active) {
      rateData.attempts += 1;
      this.setItem(rateLimitKey, rateData);
      return { success: false, error: 'Invalid or revoked access code.' };
    }

    if (found.expires_at && new Date(found.expires_at).getTime() < now) {
      return { success: false, error: 'This access code has expired.' };
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


  public revokeAccessCode(tournamentId: string, codeId: string): void {
    const existing = this.getAccessCodes(tournamentId);
    const updated = existing.map(c =>
      c.id === codeId ? { ...c, is_active: false, revoked_at: new Date().toISOString() } : c
    );
    this.setItem(this.tourneyKey(tournamentId, 'access_codes'), updated);
  }

  public getSessionRole(tournamentId: string): 'VIEW' | 'SCORE' | 'ORGANIZER' | 'ANONYMOUS' {
    if (this.isDevAdminLoggedIn()) {
      return 'ORGANIZER';
    }
    const storage = this.getStorage();
    const role = storage.getItem(`ftm_role_${tournamentId}`);
    if (role === 'VIEW' || role === 'SCORE' || role === 'ORGANIZER') {
      return role;
    }
    return 'ANONYMOUS';
  }

  public setSessionRole(tournamentId: string, role: 'VIEW' | 'SCORE' | 'ORGANIZER' | null): void {
    const storage = this.getStorage();
    if (role) {
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

  // Local Admin Session
  public isDevAdminLoggedIn(): boolean {
    const storage = this.getStorage();
    return storage.getItem(FTM_STORAGE_KEYS.ADMIN_AUTH) === 'true';
  }

  public setDevAdminLoggedIn(loggedIn: boolean): void {
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
