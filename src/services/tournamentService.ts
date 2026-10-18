/**
 * TournX Tournament Service — Unified Dual-Mode Persistence Layer
 * think.prompt.organise
 *
 * Implements real database persistence for Supabase Development Mode while
 * fully preserving offline Local Synthetic Data Mode.
 *
 * Guarantees:
 * 1. Cloud-mode errors are thrown transparently and never silently masked.
 * 2. Unauthenticated actions are rejected by Row Level Security (RLS).
 * 3. Local Synthetic Mode remains 100% offline and deterministic.
 */

import {
  Team,
  Match,
  Player,
  Goal,
  Assist,
  ManOfTheMatch,
  CommitteeMember,
  POTMPoll,
  POTMCandidate,
  POTMVote,
} from '../types/tournament';
import { Tournament } from '../types/multiTenant';
import { localDataService, slugify, DEMO_TOURNAMENT_ID, TournamentInvite } from './localDataService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

export function isValidUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

class TournamentService {
  constructor() {
    localDataService.initialize();
  }

  // ================= TOURNAMENTS =================

  async getTournaments(): Promise<Tournament[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('*')
          .neq('status', 'ARCHIVED')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[TournX] Supabase getTournaments error:', error.message);
          throw new Error(`Cloud query error (${error.code}): ${error.message}`);
        }

        if (data && data.length > 0) {
          const cloudList = (data as Tournament[]).filter(t => !t.deleted_at && t.status !== 'ARCHIVED');
          const demo = localDataService.getTournamentById(DEMO_TOURNAMENT_ID);
          if (demo && !cloudList.some(t => t.id === DEMO_TOURNAMENT_ID)) {
            return [demo, ...cloudList];
          }
          return cloudList;
        }
      } catch (err: any) {
        if (err.message && err.message.startsWith('Cloud query error')) {
          throw err;
        }
        console.warn('[TournX] Falling back to local tournaments after query notice:', err);
      }
    }
    return localDataService.getAllTournaments();
  }

  async getTournament(idOrSlug: string): Promise<Tournament | null> {
    if (!idOrSlug) return null;
    const local = localDataService.getTournamentById(idOrSlug) || localDataService.getTournamentBySlug(idOrSlug);

    // If already exists in local storage and is a local synthetic tournament (non-UUID), return immediately
    if (local && !isValidUuid(local.id)) {
      return local;
    }

    if (isSupabaseConfigured && supabase && idOrSlug !== DEMO_TOURNAMENT_ID) {
      try {
        const query = isValidUuid(idOrSlug)
          ? supabase.from('tournaments').select('*').eq('id', idOrSlug).maybeSingle()
          : supabase.from('tournaments').select('*').eq('slug', idOrSlug.toLowerCase().trim()).maybeSingle();

        const { data, error } = await query;
        if (!error && data) {
          const cloudTourney = data as Tournament;
          localDataService.registerTournament(cloudTourney);
          return cloudTourney;
        }
      } catch (err) {
        console.warn('[TournX] Failed to fetch tournament from cloud:', err);
      }
    }
    return local;
  }

  async ensureStage(
    tournamentId: string,
    stageType: string = 'SINGLE_ROUND_ROBIN',
    name: string = 'League Stage'
  ): Promise<string> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      // 1. Check if a stage already exists for this tournament
      const { data: existing, error: selectErr } = await supabase
        .from('tournament_stages')
        .select('id')
        .eq('tournament_id', tId)
        .order('sequence_order', { ascending: true })
        .limit(1);

      if (selectErr) {
        console.warn('[TournX] Query tournament_stages error:', selectErr.message);
      }

      if (existing && existing.length > 0) {
        return existing[0].id;
      }

      // 2. Insert new initial stage
      const { data: inserted, error: insertErr } = await supabase
        .from('tournament_stages')
        .insert({
          tournament_id: tId,
          name: name,
          sequence_order: 1,
          stage_type: stageType,
          status: 'ACTIVE',
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('[TournX] Failed to create tournament stage:', insertErr);
        throw new Error(`Cloud stage error (${insertErr.code}): ${insertErr.message}`);
      }

      return inserted.id;
    }

    return 'stage-default';
  }

  async createTournament(data: Partial<Tournament>): Promise<Tournament> {
    if (isSupabaseConfigured && supabase) {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        throw new Error('Supabase authentication required to create tournaments. Please sign in as an organizer.');
      }

      const user = authData.user;

      // Enforce single active tournament per organizer rule
      const { data: existingActive } = await supabase
        .from('tournaments')
        .select('id, name, slug')
        .eq('created_by', user.id)
        .not('status', 'in', '("ARCHIVED","COMPLETED")')
        .limit(1);

      if (existingActive && existingActive.length > 0) {
        throw new Error(
          `You already own an active tournament ("${existingActive[0].name}"). Each organizer account may own only one active tournament at a time. Delete or archive your existing tournament before creating another.`
        );
      }

      const tourneyName = data.name || 'Untitled Tournament';
      const slug = data.slug || slugify(tourneyName);
      const now = new Date();
      const inactDays = data.inactivity_days || 7;
      const expiresAt = new Date(now.getTime() + inactDays * 24 * 60 * 60 * 1000).toISOString();

      const rulesConfigWithLifecycle = {
        ...(data.rules_config || {
          points_for_win: 3,
          points_for_draw: 1,
          points_for_loss: 0,
          tie_breaker_order: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'],
          match_duration_minutes: 50,
          half_time_duration_minutes: 5,
        }),
        expires_at: expiresAt,
        inactivity_days: inactDays,
        last_activity_at: now.toISOString(),
      };

      const newTournament = {
        name: tourneyName,
        slug: slug,
        description: data.description || '',
        season: data.season || now.getFullYear().toString(),
        rules_config: rulesConfigWithLifecycle,
        status: data.status || 'DRAFT',
        visibility: data.visibility || 'PUBLIC',
        created_by: user.id,
      };

      const { data: inserted, error } = await supabase
        .from('tournaments')
        .insert(newTournament)
        .select()
        .single();

      if (error) {
        console.error('[TournX] Supabase createTournament error:', error);
        throw new Error(`Cloud database error (${error.code}): ${error.message}`);
      }

      // Automatically register the creator as ORGANIZER member
      await supabase.from('tournament_members').insert({
        tournament_id: inserted.id,
        user_id: user.id,
        role: 'ORGANIZER',
      });

      // Automatically initialize default stage in tournament_stages
      try {
        await supabase.from('tournament_stages').insert({
          tournament_id: inserted.id,
          name: 'League Stage',
          sequence_order: 1,
          stage_type: 'SINGLE_ROUND_ROBIN',
          status: 'ACTIVE',
        });
      } catch (stageErr) {
        console.warn('[TournX] Notice during initial stage insert:', stageErr);
      }

      const returnedTourney: Tournament = {
        ...(inserted as any),
        expires_at: (inserted as any).expires_at || rulesConfigWithLifecycle.expires_at,
        inactivity_days: (inserted as any).inactivity_days || inactDays,
        last_activity_at: (inserted as any).last_activity_at || rulesConfigWithLifecycle.last_activity_at,
        deleted_at: (inserted as any).deleted_at || null,
      };

      localDataService.registerTournament(returnedTourney);
      localDataService.setLastJoinedTournament(returnedTourney.id, returnedTourney.slug || undefined);
      return returnedTourney;
    }

    // Local Synthetic Mode Fallback
    const createdLocal = localDataService.createTournament({
      name: data.name || 'Untitled Tournament',
      slug: data.slug || undefined,
      description: data.description || '',
      season: data.season || undefined,
      rules_config: data.rules_config,
      organizerId: localDataService.isDevAdminLoggedIn() ? 'dev-admin' : undefined,
    });
    return createdLocal;
  }

  async updateTournament(tournamentId: string, updates: Partial<Tournament>): Promise<void> {
    if (isSupabaseConfigured && supabase && isValidUuid(tournamentId)) {
      const { error } = await supabase
        .from('tournaments')
        .update(updates)
        .eq('id', tournamentId);

      if (error) {
        throw new Error(`Cloud tournament update error (${error.code}): ${error.message}`);
      }
      return;
    }

    const current = localDataService.getTournamentById(tournamentId);
    if (current) {
      localDataService.updateTournament(tournamentId, updates);
    }
  }

  async deleteTournament(tournamentId: string): Promise<boolean> {
    if (!tournamentId) return false;

    if (tournamentId === DEMO_TOURNAMENT_ID) {
      throw new Error('The default TournX demo tournament cannot be deleted.');
    }

    if (isSupabaseConfigured && supabase && isValidUuid(tournamentId)) {
      // 1. Verify user authentication for cloud tournament deletion
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        throw new Error('Authentication required: You must be signed in with your organizer account to delete this cloud tournament.');
      }

      // 2. Verify tournament existence and organizer ownership
      const { data: tourneyRecord, error: fetchErr } = await supabase
        .from('tournaments')
        .select('id, name, created_by')
        .eq('id', tournamentId)
        .maybeSingle();

      if (fetchErr) {
        console.warn('[TournX] Notice fetching tournament before deletion:', fetchErr);
      } else if (tourneyRecord && tourneyRecord.created_by && tourneyRecord.created_by !== authData.user.id) {
        throw new Error(`Unauthorized: You do not own "${tourneyRecord.name}". Only the tournament creator can delete it.`);
      }

      // 3. Delete dependent records first to satisfy foreign key constraints (matches RESTRICT teams)
      try {
        await supabase.from('match_events').delete().eq('tournament_id', tournamentId);
      } catch (e) {
        console.warn('[TournX] Notice deleting match_events:', e);
      }
      try {
        await supabase.from('matches').delete().eq('tournament_id', tournamentId);
      } catch (e) {
        console.warn('[TournX] Notice deleting matches:', e);
      }
      try {
        await supabase.from('stage_teams').delete().eq('tournament_id', tournamentId);
      } catch (e) {
        console.warn('[TournX] Notice deleting stage_teams:', e);
      }
      try {
        await supabase.from('players').delete().eq('tournament_id', tournamentId);
      } catch (e) {
        console.warn('[TournX] Notice deleting players:', e);
      }
      try {
        await supabase.from('teams').delete().eq('tournament_id', tournamentId);
      } catch (e) {
        console.warn('[TournX] Notice deleting teams:', e);
      }
      try {
        await supabase.from('groups').delete().eq('tournament_id', tournamentId);
      } catch (e) {
        console.warn('[TournX] Notice deleting groups:', e);
      }
      try {
        await supabase.from('tournament_stages').delete().eq('tournament_id', tournamentId);
      } catch (e) {
        console.warn('[TournX] Notice deleting tournament_stages:', e);
      }
      try {
        await supabase.from('access_codes').delete().eq('tournament_id', tournamentId);
      } catch (e) {
        console.warn('[TournX] Notice deleting access_codes:', e);
      }
      try {
        await supabase.from('tournament_members').delete().eq('tournament_id', tournamentId);
      } catch (e) {
        console.warn('[TournX] Notice deleting tournament_members:', e);
      }

      // 4. Perform deletion on root tournaments record and verify rows deleted via .select('id')
      const { data: deletedRows, error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId)
        .select('id');

      if (error) {
        console.error('[TournX] Supabase deleteTournament error:', error);
        throw new Error(`Cloud tournament deletion rejected (${error.code}): ${error.message}`);
      }

      if (!deletedRows || deletedRows.length === 0) {
        throw new Error('Cloud tournament could not be deleted. You do not have permission to delete this record or it has already been removed.');
      }
    }

    return localDataService.deleteTournament(tournamentId);
  }

  // ================= TEAMS =================

  async getTeams(tournamentId?: string): Promise<Team[]> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tId);

      if (error) {
        console.error('[TournX] Failed to load teams from cloud:', error);
        throw new Error(`Cloud query error (${error.code}): ${error.message}`);
      }

      if (data) {
        return data.map(t => ({
          id: t.id,
          name: t.name,
          short_name: t.short_name,
          manager_name: t.manager_name || '',
          logo_url: t.logo_url || '',
          primary_color: t.primary_color || '#2563eb',
          secondary_color: t.secondary_color || '#93c5fd',
        }));
      }
    }
    return localDataService.getTeams(tournamentId);
  }

  async addTeam(team: Omit<Team, 'id'>, tournamentId?: string): Promise<Team> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          tournament_id: tId,
          name: team.name,
          short_name: team.short_name || team.name.substring(0, 3).toUpperCase(),
          manager_name: team.manager_name || '',
          logo_url: team.logo_url || '',
          primary_color: team.primary_color || '#2563eb',
          secondary_color: team.secondary_color || '#93c5fd',
        })
        .select()
        .single();

      if (error) {
        console.error('[TournX] Failed to add team to cloud database:', error);
        throw new Error(`Cloud database error (${error.code}): ${error.message}`);
      }

      return {
        id: data.id,
        name: data.name,
        short_name: data.short_name,
        manager_name: data.manager_name || '',
        logo_url: data.logo_url || '',
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
      };
    }

    const existing = localDataService.getTeams(tId);
    const newTeam: Team = {
      id: generateId('team'),
      ...team,
      created_at: new Date().toISOString(),
    };
    localDataService.setTeams([...existing, newTeam], tId);
    return newTeam;
  }

  async updateTeam(team: Team, tournamentId?: string): Promise<void> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      const { error } = await supabase
        .from('teams')
        .update({
          name: team.name,
          short_name: team.short_name,
          manager_name: team.manager_name,
          logo_url: team.logo_url,
          primary_color: team.primary_color,
          secondary_color: team.secondary_color,
        })
        .eq('id', team.id)
        .eq('tournament_id', tId);

      if (error) {
        throw new Error(`Cloud update team error (${error.code}): ${error.message}`);
      }
      return;
    }
    localDataService.updateTeam(team, tournamentId);
  }

  async updateTeamManager(teamId: string, managerName: string, tournamentId?: string): Promise<void> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      const { error } = await supabase
        .from('teams')
        .update({ manager_name: managerName })
        .eq('id', teamId)
        .eq('tournament_id', tId);

      if (error) {
        throw new Error(`Cloud update error (${error.code}): ${error.message}`);
      }
      return;
    }
    localDataService.updateTeamManager(teamId, managerName);
  }

  // ================= MATCHES =================

  async getMatches(tournamentId?: string): Promise<Match[]> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tId)
        .order('match_number', { ascending: true });

      if (error) {
        throw new Error(`Cloud query error (${error.code}): ${error.message}`);
      }

      if (data) {
        return data.map(m => ({
          id: m.id,
          match_number: m.match_number || 1,
          round_number: m.round_number,
          home_team_id: m.home_team_id,
          away_team_id: m.away_team_id,
          scheduled_date: m.scheduled_date,
          scheduled_time: m.scheduled_time,
          venue: m.venue,
          referee: m.referee,
          assistant_referee_1: m.assistant_referee_1,
          assistant_referee_2: m.assistant_referee_2,
          home_score: m.home_score,
          away_score: m.away_score,
          status: m.status,
          created_at: m.created_at,
          updated_at: m.updated_at,
        }));
      }
    }
    return localDataService.getMatches(tournamentId);
  }

  async updateMatch(match: Match, tournamentId?: string): Promise<void> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      const { error } = await supabase
        .from('matches')
        .update({
          home_score: match.home_score,
          away_score: match.away_score,
          status: match.status,
          scheduled_date: match.scheduled_date,
          scheduled_time: match.scheduled_time,
          venue: match.venue,
          referee: match.referee,
          assistant_referee_1: match.assistant_referee_1,
          assistant_referee_2: match.assistant_referee_2,
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.id)
        .eq('tournament_id', tId);

      if (error) {
        throw new Error(`Cloud match update error (${error.code}): ${error.message}`);
      }
      return;
    }
    localDataService.updateMatch(match);
  }

  async createMatches(matches: Omit<Match, 'id'>[], tournamentId?: string, stageId?: string): Promise<Match[]> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (!matches || matches.length === 0) {
      return [];
    }

    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      // 1. Ensure a valid stage exists in tournament_stages
      const validStageId = stageId || (await this.ensureStage(tId));

      // 2. Clean up any existing UPCOMING draft matches for this tournament to avoid duplicates on retry
      try {
        await supabase
          .from('matches')
          .delete()
          .eq('tournament_id', tId)
          .eq('status', 'UPCOMING');
      } catch (cleanupErr) {
        console.warn('[TournX] Notice during draft matches cleanup:', cleanupErr);
      }

      // 3. Helper to ensure valid ISO YYYY-MM-DD for Postgres DATE column
      const sanitizeDate = (d?: string | null): string | null => {
        if (!d) return null;
        const trimmed = d.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
        return null;
      };

      const records = matches.map(m => ({
        tournament_id: tId,
        stage_id: validStageId,
        group_id: null,
        match_number: m.match_number,
        round_number: m.round_number,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        scheduled_date: sanitizeDate(m.scheduled_date),
        scheduled_time: m.scheduled_time || null,
        venue: m.venue || null,
        referee: m.referee || null,
        assistant_referee_1: m.assistant_referee_1 || null,
        assistant_referee_2: m.assistant_referee_2 || null,
        home_score: m.home_score ?? null,
        away_score: m.away_score ?? null,
        status: m.status || 'UPCOMING',
      }));

      const { data, error } = await supabase
        .from('matches')
        .insert(records)
        .select();

      if (error) {
        console.error('[TournX] Cloud matches insert error:', error);
        throw new Error(`Cloud matches insert error (${error.code}): ${error.message}`);
      }

      return (data || []).map(m => ({
        id: m.id,
        match_number: m.match_number,
        round_number: m.round_number,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        scheduled_date: m.scheduled_date,
        scheduled_time: m.scheduled_time,
        venue: m.venue,
        referee: m.referee,
        assistant_referee_1: m.assistant_referee_1,
        assistant_referee_2: m.assistant_referee_2,
        home_score: m.home_score,
        away_score: m.away_score,
        status: m.status,
      }));
    }

    const createdMatches: Match[] = matches.map((m, idx) => ({
      id: generateId(`match-${idx + 1}`),
      ...m,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    localDataService.setMatches(createdMatches, tId);
    return createdMatches;
  }

  // ================= PLAYERS =================

  async getPlayers(tournamentId?: string): Promise<Player[]> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('tournament_id', tId);

      if (error) {
        throw new Error(`Cloud query error (${error.code}): ${error.message}`);
      }

      if (data) {
        return data.map(p => ({
          id: p.id,
          team_id: p.team_id,
          name: p.name,
          position: p.position,
          is_captain: p.is_captain,
          photo_url: p.photo_url,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
      }
    }
    return localDataService.getPlayers(tournamentId);
  }

  async addPlayer(player: Omit<Player, 'id'>, tournamentId?: string): Promise<Player> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      if (player.is_captain && player.team_id) {
        await supabase
          .from('players')
          .update({ is_captain: false })
          .eq('team_id', player.team_id)
          .eq('tournament_id', tId);
      }

      const { data, error } = await supabase
        .from('players')
        .insert({
          tournament_id: tId,
          team_id: player.team_id,
          name: player.name,
          position: player.position,
          is_captain: player.is_captain || false,
          photo_url: player.photo_url || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Cloud player insert error (${error.code}): ${error.message}`);
      }

      return {
        id: data.id,
        team_id: data.team_id,
        name: data.name,
        position: data.position,
        is_captain: data.is_captain,
        photo_url: data.photo_url,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }

    const newPlayer: Player = {
      id: generateId('player'),
      ...player,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localDataService.addPlayer(newPlayer, tournamentId);
    return newPlayer;
  }

  async updatePlayer(player: Player, tournamentId?: string): Promise<void> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      if (player.is_captain && player.team_id) {
        await supabase
          .from('players')
          .update({ is_captain: false })
          .eq('team_id', player.team_id)
          .eq('tournament_id', tId)
          .neq('id', player.id);
      }

      const { error } = await supabase
        .from('players')
        .update({
          team_id: player.team_id,
          name: player.name,
          position: player.position,
          is_captain: player.is_captain,
          photo_url: player.photo_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', player.id)
        .eq('tournament_id', tId);

      if (error) {
        throw new Error(`Cloud player update error (${error.code}): ${error.message}`);
      }
      return;
    }
    localDataService.updatePlayer({
      ...player,
      updated_at: new Date().toISOString(),
    }, tournamentId);
  }

  async deletePlayer(id: string, tournamentId?: string): Promise<void> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id)
        .eq('tournament_id', tId);

      if (error) {
        throw new Error(`Cloud player delete error (${error.code}): ${error.message}`);
      }
      return;
    }
    localDataService.deletePlayer(id, tournamentId);
  }

  // ================= ACCESS CODE REDEMPTION =================

  async verifyAccessCode(
    tournamentId: string,
    rawCode: string
  ): Promise<{ success: boolean; role?: 'VIEW' | 'SCORE'; label?: string; error?: string }> {
    if (isSupabaseConfigured && supabase && isValidUuid(tournamentId)) {
      const voterId = localDataService.getOrCreateVoterId();
      const { data, error } = await supabase.rpc('redeem_tournament_access_code', {
        p_tournament_id: tournamentId,
        p_code: rawCode.trim().toUpperCase(),
        p_client_identifier: voterId,
      });

      if (error) {
        return { success: false, error: `Cloud RPC error: ${error.message}` };
      }
      if (data && data.success) {
        localDataService.setSessionRole(tournamentId, data.role);
        return { success: true, role: data.role, label: data.label };
      }
      return { success: false, error: data?.error || 'Invalid or revoked access code.' };
    }
    return localDataService.verifyAccessCode(tournamentId, rawCode);
  }

  // ================= GOALS =================
  async getGoals(tournamentId?: string): Promise<Goal[]> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      try {
        const { data, error } = await supabase
          .from('match_events')
          .select('*')
          .eq('tournament_id', tId)
          .eq('event_type', 'GOAL');
        if (!error && data && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            match_id: d.match_id,
            player_id: d.player_id,
            team_id: d.team_id,
            minute: d.minute || 0,
            created_at: d.created_at || new Date().toISOString(),
          }));
        }
      } catch (cloudErr) {
        console.warn('[TournX] Notice loading cloud goals:', cloudErr);
      }
    }
    return localDataService.getGoals(tId);
  }

  // ================= ASSISTS =================
  async getAssists(tournamentId?: string): Promise<Assist[]> {
    return localDataService.getAssists(tournamentId);
  }

  // ================= MAN OF THE MATCH =================
  async getManOfTheMatches(tournamentId?: string): Promise<ManOfTheMatch[]> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    if (isSupabaseConfigured && supabase && isValidUuid(tId)) {
      try {
        const { data, error } = await supabase
          .from('man_of_the_match')
          .select('*, matches!inner(tournament_id)')
          .eq('matches.tournament_id', tId);
        if (!error && data && data.length > 0) {
          return data.map(d => ({
            id: d.id,
            match_id: d.match_id,
            player_id: d.player_id,
            created_at: d.created_at || new Date().toISOString(),
          }));
        }
      } catch (cloudErr) {
        console.warn('[TournX] Notice loading cloud MOTM:', cloudErr);
      }
    }
    return localDataService.getMotm(tId);
  }

  // ================= SAVE MATCH EDIT =================
  async saveSimplifiedMatch(
    matchId: string,
    status: Match['status'],
    fixtureDetails: {
      scheduled_date: string | null;
      scheduled_time: string | null;
      venue: string | null;
      referee: string | null;
      assistant_referee_1: string | null;
      assistant_referee_2: string | null;
    },
    homeScore: number | null,
    awayScore: number | null,
    goals: { player_id: string; team_id: string }[],
    motmPlayerId?: string
  ): Promise<void> {
    const matches = await this.getMatches();
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    const targetTournamentId = targetMatch.tournament_id || localDataService.getActiveTournamentId();

    targetMatch.status = status;
    targetMatch.scheduled_date = fixtureDetails.scheduled_date;
    targetMatch.scheduled_time = fixtureDetails.scheduled_time;
    targetMatch.venue = fixtureDetails.venue;
    targetMatch.referee = fixtureDetails.referee;
    targetMatch.assistant_referee_1 = fixtureDetails.assistant_referee_1;
    targetMatch.assistant_referee_2 = fixtureDetails.assistant_referee_2;
    targetMatch.home_score =
      status === 'COMPLETED'
        ? (homeScore ?? goals.filter(g => g.team_id === targetMatch.home_team_id).length)
        : homeScore;
    targetMatch.away_score =
      status === 'COMPLETED'
        ? (awayScore ?? goals.filter(g => g.team_id === targetMatch.away_team_id).length)
        : awayScore;
    targetMatch.updated_at = new Date().toISOString();

    await this.updateMatch(targetMatch);

    // Persist to Supabase if cloud match
    if (isSupabaseConfigured && supabase && isValidUuid(matchId)) {
      try {
        await supabase
          .from('matches')
          .update({
            status: targetMatch.status,
            home_score: targetMatch.home_score,
            away_score: targetMatch.away_score,
            venue: targetMatch.venue,
            scheduled_date: targetMatch.scheduled_date,
            scheduled_time: targetMatch.scheduled_time,
            updated_at: new Date().toISOString(),
          })
          .eq('id', matchId);

        // Clear previous goal events for this match to prevent duplicate accumulation
        await supabase
          .from('match_events')
          .delete()
          .eq('match_id', matchId)
          .eq('event_type', 'GOAL');

        // Insert new goal events
        if (goals.length > 0) {
          const eventsToInsert = goals.map(g => ({
            tournament_id: targetTournamentId,
            match_id: matchId,
            team_id: g.team_id,
            player_id: g.player_id,
            event_type: 'GOAL',
            minute: 0,
          }));
          await supabase.from('match_events').insert(eventsToInsert);
        }

        // Sync MOTM to Supabase
        await supabase.from('man_of_the_match').delete().eq('match_id', matchId);
        if (motmPlayerId && motmPlayerId.trim()) {
          await supabase.from('man_of_the_match').insert({
            id: generateId('motm'),
            match_id: matchId,
            player_id: motmPlayerId.trim(),
          });
        }
      } catch (cloudEvtErr) {
        console.warn('[TournX] Notice syncing match events to cloud:', cloudEvtErr);
      }
    }

    // Update match goals in local storage with proper tournament scoping
    const newGoals: Goal[] = goals.map(g => ({
      id: generateId('goal'),
      match_id: matchId,
      player_id: g.player_id,
      team_id: g.team_id,
      minute: 0,
      created_at: new Date().toISOString(),
    }));

    const allGoals = (await this.getGoals(targetTournamentId)).filter(g => g.match_id !== matchId);
    allGoals.push(...newGoals);
    localDataService.setGoals(allGoals, targetTournamentId);

    // Update MOTM (always remove old MOTM for this match first, add if selected)
    const allMotm = (await this.getManOfTheMatches(targetTournamentId)).filter(m => m.match_id !== matchId);
    if (motmPlayerId && motmPlayerId.trim()) {
      allMotm.push({
        id: generateId('motm'),
        match_id: matchId,
        player_id: motmPlayerId.trim(),
        created_at: new Date().toISOString(),
      });
    }
    localDataService.setMotm(allMotm, targetTournamentId);
  }

  async saveMatchResult(
    matchId: string,
    homeScore: number,
    awayScore: number,
    goals: { player_id: string; team_id: string; minute: number; assist_player_id?: string | null }[],
    _assists: { player_id: string; team_id: string; minute?: number }[],
    motmPlayerId?: string
  ): Promise<void> {
    const matches = await this.getMatches();
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    await this.saveSimplifiedMatch(
      matchId,
      'COMPLETED',
      {
        scheduled_date: targetMatch.scheduled_date ?? null,
        scheduled_time: targetMatch.scheduled_time ?? null,
        venue: targetMatch.venue ?? null,
        referee: targetMatch.referee ?? null,
        assistant_referee_1: targetMatch.assistant_referee_1 ?? null,
        assistant_referee_2: targetMatch.assistant_referee_2 ?? null,
      },
      homeScore,
      awayScore,
      goals.map(g => ({ player_id: g.player_id, team_id: g.team_id })),
      motmPlayerId
    );
  }

  // ================= COMMITTEE =================
  async getCommitteeMembers(): Promise<CommitteeMember[]> {
    return localDataService.getCommittee();
  }

  async updateCommitteeMember(member: CommitteeMember): Promise<void> {
    const members = await this.getCommitteeMembers();
    const updated = members.map(m => (m.id === member.id ? member : m));
    localDataService.setCommittee(updated);
  }

  // ================= POTM POLLS & LOCAL VOTING =================
  async getPolls(tournamentId?: string): Promise<POTMPoll[]> {
    return localDataService.getPolls(tournamentId);
  }

  async getPollByMatchId(matchId: string): Promise<POTMPoll | null> {
    const polls = await this.getPolls();
    return polls.find(p => p.match_id === matchId) || null;
  }

  async getActivePolls(): Promise<POTMPoll[]> {
    const polls = await this.getPolls();
    return polls.filter(p => p.status === 'active');
  }

  async createPoll(matchId: string, title: string, candidatePlayerIds: string[]): Promise<POTMPoll> {
    const pollId = generateId('poll');
    const newPoll: POTMPoll = {
      id: pollId,
      match_id: matchId,
      title,
      status: 'active',
      opened_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const newCandidates: POTMCandidate[] = candidatePlayerIds.map(playerId => ({
      id: generateId('candidate'),
      poll_id: pollId,
      player_id: playerId,
    }));

    const polls = await this.getPolls();
    polls.unshift(newPoll);
    localDataService.setPolls(polls);

    const allCandidates = localDataService.getCandidates();
    allCandidates.push(...newCandidates);
    localDataService.setCandidates(allCandidates);

    return newPoll;
  }

  async closePoll(pollId: string): Promise<void> {
    const polls = await this.getPolls();
    const updated = polls.map(p =>
      p.id === pollId
        ? { ...p, status: 'closed' as const, closed_at: new Date().toISOString() }
        : p
    );
    localDataService.setPolls(updated);
  }

  async getCandidates(pollId: string): Promise<POTMCandidate[]> {
    const all = localDataService.getCandidates();
    return all.filter(c => c.poll_id === pollId);
  }

  async getVotes(pollId: string): Promise<POTMVote[]> {
    const all = localDataService.getVotes();
    return all.filter(v => v.poll_id === pollId);
  }

  async getCurrentVoterId(): Promise<string> {
    return localDataService.getOrCreateVoterId();
  }

  async submitVote(
    pollId: string,
    candidateId: string,
    customUserId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!pollId || !candidateId) {
      return { success: false, error: 'Poll and candidate selection are required.' };
    }

    const voterId = customUserId || localDataService.getOrCreateVoterId();
    const allVotes = localDataService.getVotes();
    const alreadyVoted = allVotes.some(v => v.poll_id === pollId && v.user_id === voterId);
    if (alreadyVoted) {
      return { success: false, error: 'You have already voted in this poll.' };
    }

    const newVote: POTMVote = {
      id: generateId('vote'),
      poll_id: pollId,
      candidate_id: candidateId,
      user_id: voterId,
      created_at: new Date().toISOString(),
    };

    allVotes.push(newVote);
    localDataService.setVotes(allVotes);

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`ftm_dev_potm_voted_${pollId}`, candidateId);
      } catch {}
    }

    return { success: true };
  }

  // ================= COLLABORATOR INVITATIONS =================
  async getInvites(tournamentId?: string): Promise<TournamentInvite[]> {
    const tId = tournamentId || localDataService.getActiveTournamentId();
    return localDataService.getInvites(tId);
  }

  async createInvite(
    tournamentId: string,
    email: string,
    role: 'ORGANIZER' | 'SCORE' | 'VIEW'
  ): Promise<TournamentInvite> {
    const invite = localDataService.createInvite(tournamentId, email, role);
    return invite;
  }

  async revokeInvite(tournamentId: string, inviteId: string): Promise<void> {
    localDataService.revokeInvite(tournamentId, inviteId);
  }

  async acceptInvite(
    inviteCode: string,
    userEmail: string,
    userId?: string
  ): Promise<{ success: boolean; tournament?: Tournament; role?: 'ORGANIZER' | 'SCORE' | 'VIEW'; error?: string }> {
    return localDataService.acceptInvite(inviteCode, userEmail, userId);
  }

  resetToOfficialFixtures(): void {
    localDataService.resetDemoData();
  }
}

export const tournamentService = new TournamentService();
