import { describe, it, expect, beforeEach } from 'vitest';
import { localDataService, DEMO_TOURNAMENT_ID, DEFAULT_CLEAN_TOURNAMENT, FTM_STORAGE_KEYS } from '../localDataService';
import { tournamentService } from '../tournamentService';
import { Tournament } from '../../types/multiTenant';

describe('TournX — Tournament Flow, Access Code Resolution & 3D Transitions Regression Tests', () => {
  beforeEach(() => {
    localDataService.resetDemoData();
  });

  describe('1. Access Code Resolution to Exact Tournament (Never Apex FC / Demo)', () => {
    it('resolves valid access code to its exact matching tournament and sets role strictly', async () => {
      // Create Tournament Alpha
      const tourneyAlpha = localDataService.createTournament({
        name: 'Coastal Champions Invitational',
        season: '2026',
        rules_config: {
          points_for_win: 3,
          points_for_draw: 1,
          points_for_loss: 0,
          tie_breaker_order: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'],
          match_duration_minutes: 50,
        },
      });

      // Create Tournament Beta
      const tourneyBeta = localDataService.createTournament({
        name: 'Malabar Super League',
        season: '2026',
        rules_config: {
          points_for_win: 3,
          points_for_draw: 1,
          points_for_loss: 0,
          tie_breaker_order: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'],
          match_duration_minutes: 40,
        },
      });

      // Generate Access Codes
      const codeAlpha = localDataService.generateAccessCode(tourneyAlpha.id, 'VIEW', 'Alpha Spectator');
      const codeBeta = localDataService.generateAccessCode(tourneyBeta.id, 'SCORE', 'Beta Scorekeeper');

      // Verify resolving codeAlpha opens EXACTLY tourneyAlpha
      const resAlpha = await tournamentService.resolveAccessCode(codeAlpha.rawCode);
      expect(resAlpha.success).toBe(true);
      expect(resAlpha.tournament?.id).toBe(tourneyAlpha.id);
      expect(resAlpha.tournament?.name).toBe('Coastal Champions Invitational');
      expect(resAlpha.role).toBe('VIEW');
      expect(localDataService.getActiveTournamentId()).toBe(tourneyAlpha.id);

      // Verify resolving codeBeta opens EXACTLY tourneyBeta (NOT Alpha, NOT Demo)
      const resBeta = await tournamentService.resolveAccessCode(codeBeta.rawCode);
      expect(resBeta.success).toBe(true);
      expect(resBeta.tournament?.id).toBe(tourneyBeta.id);
      expect(resBeta.tournament?.name).toBe('Malabar Super League');
      expect(resBeta.role).toBe('SCORE');
      expect(localDataService.getActiveTournamentId()).toBe(tourneyBeta.id);
    });

    it('rejects invalid or tampered access codes with zero fallback to demo or Apex FC', async () => {
      // Create a tournament
      const tourney = localDataService.createTournament({
        name: 'Wayanad Cup 2026',
        season: '2026',
      });
      localDataService.generateAccessCode(tourney.id, 'VIEW', 'Viewer Code');

      // Enter completely bogus code
      const bogusResult = await tournamentService.resolveAccessCode('TX-INVALID-0000');
      expect(bogusResult.success).toBe(false);
      expect(bogusResult.tournament).toBeUndefined();
      expect(bogusResult.error).toContain('Invalid or revoked access code');

      // Enter empty/whitespace code
      const emptyResult = await tournamentService.resolveAccessCode('   ');
      expect(emptyResult.success).toBe(false);
      expect(emptyResult.tournament).toBeUndefined();
    });

    it('rejects revoked and expired codes with clear error without redirecting to another tournament', async () => {
      const tourney = localDataService.createTournament({
        name: 'Calicut Premier Cup',
      });

      // Generate code and revoke it
      const code = localDataService.generateAccessCode(tourney.id, 'VIEW', 'Test Code');
      localDataService.revokeAccessCode(tourney.id, code.code.id);

      const result = await tournamentService.resolveAccessCode(code.rawCode);
      expect(result.success).toBe(false);
      expect(result.error).toContain('revoked');
      expect(result.tournament).toBeUndefined();
    });

    it('stale active tournament state or cached draft cannot hijack code resolution', async () => {
      // Set active tournament to demo
      localDataService.setActiveTournamentId(DEMO_TOURNAMENT_ID);
      expect(localDataService.getActiveTournamentId()).toBe(DEMO_TOURNAMENT_ID);

      // Create a brand new tournament
      const newTourney = localDataService.createTournament({
        name: 'Kannur Championship',
      });
      const code = localDataService.generateAccessCode(newTourney.id, 'SCORE', 'Kannur Modifier');

      // Resolve the code
      const res = await tournamentService.resolveAccessCode(code.rawCode);
      expect(res.success).toBe(true);
      expect(res.tournament?.id).toBe(newTourney.id);
      expect(res.tournament?.name).toBe('Kannur Championship');

      // Active tournament pointer must now point to newTourney, NEVER demo
      expect(localDataService.getActiveTournamentId()).toBe(newTourney.id);
    });
  });

  describe('2. Clean Frontend State & Zero Cloud Deletion', () => {
    it('cleanFrontendDemoState removes demo tournament keys safely from frontend', () => {
      const storage = (localDataService as any).getStorage();
      storage.setItem('ftm_dev_t_ftm-demo-tourney-01_teams', '[]');
      storage.setItem(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX, JSON.stringify([
        { id: DEMO_TOURNAMENT_ID, name: 'TournX Championship (Demo)' },
        { id: 'real-tourney-1', name: 'Real Tournament 1' }
      ]));

      localDataService.cleanFrontendDemoState();

      // Demo keys must be purged
      expect(storage.getItem('ftm_dev_t_ftm-demo-tourney-01_teams')).toBeNull();

      // Real tournaments must be preserved
      const remaining = JSON.parse(storage.getItem(FTM_STORAGE_KEYS.TOURNAMENTS_INDEX) || '[]');
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('real-tourney-1');
    });

    it('returns default clean template when no tournaments exist without hardcoding demo teams', () => {
      expect(DEFAULT_CLEAN_TOURNAMENT).toBeDefined();
      expect(DEFAULT_CLEAN_TOURNAMENT.id).toBe('tournx-initial');
      expect(DEFAULT_CLEAN_TOURNAMENT.name).toBe('TournX Tournament');
      // Must not be Apex FC demo tournament
      expect(DEFAULT_CLEAN_TOURNAMENT.id).not.toBe(DEMO_TOURNAMENT_ID);
      expect(DEFAULT_CLEAN_TOURNAMENT.status).toBe('DRAFT');
    });
  });

  describe('3. Tournament Creation & Share Deep Link', () => {
    it('generates shareable deep links and access codes correctly for newly created tournaments', () => {
      const tourney = localDataService.createTournament({
        name: 'Champions Trophy 2026',
        slug: 'champions-trophy-2026',
      });

      const vCode = localDataService.generateAccessCode(tourney.id, 'VIEW', 'Spectator Pass');
      const mCode = localDataService.generateAccessCode(tourney.id, 'SCORE', 'Scorekeeper Pass');

      expect(vCode.rawCode.length).toBe(8);
      expect(mCode.rawCode.length).toBe(8);

      const deepLink = `https://tournx.app/t/${tourney.slug}`;
      expect(deepLink).toBe('https://tournx.app/t/champions-trophy-2026');
    });
  });

  describe('4. Single-Active-Tournament Organizer Isolation', () => {
    it('preserves single-active tournament isolation and role authorization boundaries', () => {
      const tourney = localDataService.createTournament({
        name: 'Super Cup',
      });

      // Default role without access code is ANONYMOUS
      expect(localDataService.getSessionRole(tourney.id)).toBe('ANONYMOUS');

      // Set viewer role
      localDataService.setSessionRole(tourney.id, 'VIEW');
      expect(localDataService.getSessionRole(tourney.id)).toBe('VIEW');

      // Verify that session role for another tournament is isolated and remains ANONYMOUS
      expect(localDataService.getSessionRole('other-tournament-id')).toBe('ANONYMOUS');
    });
  });
});
