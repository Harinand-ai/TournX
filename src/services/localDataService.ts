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
    label?: string
  ): { rawCode: string; code: AccessCode } {
    // Generate 8-character uppercase unambiguous code (no 0/O, 1/I/L)
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let rawCode = '';
    for (let i = 0; i < 8; i++) {
      rawCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Pseudo-hash for local dev
    const codeHash = `hash_${rawCode.split('').reverse().join('')}_${Date.now().toString(36)}`;

    const newCode: AccessCode = {
      id: `code-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      tournament_id: tournamentId,
      role,
      code_hash: codeHash,
      label: label || `${role} Access Code`,
      is_active: true,
      use_count: 0,
      created_at: new Date().toISOString(),
    };

    const existing = this.getAccessCodes(tournamentId);
    this.setItem(this.tourneyKey(tournamentId, 'access_codes'), [...existing, newCode]);

    return { rawCode, code: newCode };
  }

  public revokeAccessCode(tournamentId: string, codeId: string): void {
    const existing = this.getAccessCodes(tournamentId);
    const updated = existing.map(c =>
      c.id === codeId ? { ...c, is_active: false, revoked_at: new Date().toISOString() } : c
    );
    this.setItem(this.tourneyKey(tournamentId, 'access_codes'), updated);
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
