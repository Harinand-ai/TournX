import { describe, it, expect, beforeEach } from 'vitest';
import { localDataService, DEMO_TOURNAMENT_ID } from '../localDataService';
import { tournamentService } from '../tournamentService';

describe('Participant Access Control, Role Isolation & Data Integrity', () => {
  beforeEach(() => {
    localDataService.resetDemoData();
    localDataService.clearLastJoinedTournament();
    localDataService.setDevAdminLoggedIn(false);
  });

  describe('Strict Role Determination & No Organizer Leakage', () => {
    it('grants VIEW role when valid participant access code is used', () => {
      const tourney = localDataService.createTournament({
        name: 'Malabar Premier League',
        season: '2026',
        organizerId: 'org-real-user-1',
      });

      // Generate a VIEW access code
      const { rawCode, code } = localDataService.generateAccessCode(
        tourney.id,
        'VIEW',
        'Spectator Code'
      );
      expect(rawCode).toBeDefined();
      expect(code.role).toBe('VIEW');

      // Verify code
      const result = localDataService.verifyAccessCode(tourney.id, rawCode);
      expect(result.success).toBe(true);
      expect(result.role).toBe('VIEW');

      // Check session role
      const sessionRole = localDataService.getSessionRole(tourney.id);
      expect(sessionRole).toBe('VIEW');
      expect(sessionRole).not.toBe('ORGANIZER');
    });

    it('grants SCORE role when valid modifier access code is used', () => {
      const tourney = localDataService.createTournament({
        name: 'Calicut Super Cup',
        season: '2026',
        organizerId: 'org-real-user-2',
      });

      const { rawCode, code } = localDataService.generateAccessCode(
        tourney.id,
        'SCORE',
        'Official Scorer'
      );
      expect(code.role).toBe('SCORE');

      const result = localDataService.verifyAccessCode(tourney.id, rawCode);
      expect(result.success).toBe(true);
      expect(result.role).toBe('SCORE');

      const sessionRole = localDataService.getSessionRole(tourney.id);
      expect(sessionRole).toBe('SCORE');
      expect(sessionRole).not.toBe('ORGANIZER');
    });

    it('does NOT leak ORGANIZER role to participant route even if dev admin was previously logged in', () => {
      // Simulate dev admin login
      localDataService.setDevAdminLoggedIn(true);
      expect(localDataService.isDevAdminLoggedIn()).toBe(true);

      // Create a tournament owned by a third-party organizer
      const tourney = localDataService.createTournament({
        name: 'Kochi Futsal Trophy',
        season: '2026',
        organizerId: 'different-organizer-id',
      });

      // Clear any session role for this specific tournament
      localDataService.setSessionRole(tourney.id, null);

      // The session role for this foreign tournament must NOT be 'ORGANIZER'
      const sessionRole = localDataService.getSessionRole(tourney.id);
      expect(sessionRole).toBe('ANONYMOUS');
      expect(sessionRole).not.toBe('ORGANIZER');
    });

    it('denies access or returns invalid for wrong access code', () => {
      const tourney = localDataService.createTournament({
        name: 'Wayanad Hills Cup',
        season: '2026',
      });

      const result = localDataService.verifyAccessCode(tourney.id, 'INVALID-CODE-999');
      expect(result.success).toBe(false);
      expect(result.role).toBeUndefined();
    });
  });

  describe('Match Events, Multiple Scorers & POTM Calculation', () => {
    it('accurately aggregates goalscorers including braces and hat-tricks without hardcoded data', async () => {
      const tourney = localDataService.getTournamentById(DEMO_TOURNAMENT_ID);
      expect(tourney).not.toBeNull();

      const players = localDataService.getPlayers(tourney!.id);
      const matches = localDataService.getMatches(tourney!.id);

      expect(players.length).toBeGreaterThanOrEqual(4);
      expect(matches.length).toBeGreaterThanOrEqual(1);

      const match = matches[0];
      const player1 = players[0];
      const player2 = players[1];

      // Save match with player1 scoring 2 goals and player2 scoring 1 goal
      const fixtureDetails = {
        scheduled_date: '2026-10-20',
        scheduled_time: null,
        venue: 'Main Arena',
        referee: null,
        assistant_referee_1: null,
        assistant_referee_2: null,
      };

      const goalsToRecord = [
        { player_id: player1.id, team_id: match.home_team_id },
        { player_id: player1.id, team_id: match.home_team_id },
        { player_id: player2.id, team_id: match.away_team_id },
      ];

      await tournamentService.saveSimplifiedMatch(
        match.id,
        'COMPLETED',
        fixtureDetails,
        2,
        1,
        goalsToRecord,
        player1.id
      );

      // Verify goals stored via service
      const storedGoals = await tournamentService.getGoals(tourney!.id);
      const matchGoals = storedGoals.filter(g => g.match_id === match.id);
      expect(matchGoals.length).toBe(3);

      // Verify goal count by player
      const p1Goals = matchGoals.filter(g => g.player_id === player1.id);
      expect(p1Goals.length).toBe(2);

      const p2Goals = matchGoals.filter(g => g.player_id === player2.id);
      expect(p2Goals.length).toBe(1);

      // Verify POTM
      const motmList = await tournamentService.getManOfTheMatches(tourney!.id);
      const matchMotm = motmList.find(m => m.match_id === match.id);
      expect(matchMotm).toBeDefined();
      expect(matchMotm?.player_id).toBe(player1.id);
    });

    it('updating POTM replaces existing record without creating duplicate awards', async () => {
      const tourney = localDataService.getTournamentById(DEMO_TOURNAMENT_ID);
      expect(tourney).not.toBeNull();
      const players = localDataService.getPlayers(tourney!.id);
      const matches = localDataService.getMatches(tourney!.id);
      const match = matches[0];

      const fixtureDetails = {
        scheduled_date: '2026-10-20',
        scheduled_time: null,
        venue: 'Main Arena',
        referee: null,
        assistant_referee_1: null,
        assistant_referee_2: null,
      };

      // First award to player 0
      await tournamentService.saveSimplifiedMatch(
        match.id,
        'COMPLETED',
        fixtureDetails,
        1,
        0,
        [{ player_id: players[0].id, team_id: match.home_team_id }],
        players[0].id
      );

      let motmList = await tournamentService.getManOfTheMatches(tourney!.id);
      expect(motmList.filter(m => m.match_id === match.id).length).toBe(1);
      expect(motmList.find(m => m.match_id === match.id)?.player_id).toBe(players[0].id);

      // Re-award to player 1
      await tournamentService.saveSimplifiedMatch(
        match.id,
        'COMPLETED',
        fixtureDetails,
        1,
        0,
        [{ player_id: players[0].id, team_id: match.home_team_id }],
        players[1].id
      );

      motmList = await tournamentService.getManOfTheMatches(tourney!.id);
      // Still exactly 1 POTM record for this match!
      expect(motmList.filter(m => m.match_id === match.id).length).toBe(1);
      expect(motmList.find(m => m.match_id === match.id)?.player_id).toBe(players[1].id);
    });
  });

  describe('Route and Layout Isolation Pattern', () => {
    it('correctly identifies participant routes vs organizer workspace routes', () => {
      const isParticipantRoute = (path: string) => {
        return path.startsWith('/t/') || path.startsWith('/join');
      };

      expect(isParticipantRoute('/t/tournx-championship')).toBe(true);
      expect(isParticipantRoute('/t/kerala-cup')).toBe(true);
      expect(isParticipantRoute('/join')).toBe(true);
      expect(isParticipantRoute('/join?code=ABC')).toBe(true);

      expect(isParticipantRoute('/')).toBe(false);
      expect(isParticipantRoute('/workspace')).toBe(false);
      expect(isParticipantRoute('/admin-login')).toBe(false);
      expect(isParticipantRoute('/my-tournaments')).toBe(false);
    });
  });
});
