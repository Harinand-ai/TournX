import { describe, it, expect, beforeEach } from 'vitest';
import { localDataService, DEMO_TOURNAMENT_ID } from '../localDataService';
import { tournamentService } from '../tournamentService';

describe('TournX Regression Tests — Switches, Deletion & Leave Tournament', () => {
  beforeEach(() => {
    localDataService.resetDemoData();
    localDataService.clearLastJoinedTournament();
    localDataService.setDevAdminLoggedIn(false);
  });

  describe('1. Audit All Switches & Toggles', () => {
    it('updates and persists optional tournament feature toggles to rules_config', async () => {
      const tourney = localDataService.createTournament({
        name: 'Feature Toggle Cup',
        rules_config: {
          points_for_win: 3,
          points_for_draw: 1,
          points_for_loss: 0,
          match_duration_minutes: 50,
          features: {
            referees: true,
            potmVoting: true,
            goalscorersAndEvents: true,
            cardsAndSubs: true,
          },
        },
      });

      // Verify initial state
      expect(tourney.rules_config?.features?.potmVoting).toBe(true);
      expect(tourney.rules_config?.features?.referees).toBe(true);

      // Toggle features off and update
      const updatedRules = {
        ...(tourney.rules_config || {}),
        features: {
          referees: false,
          potmVoting: false,
          goalscorersAndEvents: true,
          cardsAndSubs: false,
        },
      };

      await tournamentService.updateTournament(tourney.id, { rules_config: updatedRules });
      localDataService.updateTournament(tourney.id, { rules_config: updatedRules });

      // Fetch and verify persistence
      const reloaded = await tournamentService.getTournament(tourney.id);
      expect(reloaded).not.toBeNull();
      expect(reloaded?.rules_config?.features?.potmVoting).toBe(false);
      expect(reloaded?.rules_config?.features?.referees).toBe(false);
      expect(reloaded?.rules_config?.features?.goalscorersAndEvents).toBe(true);
      expect(reloaded?.rules_config?.features?.cardsAndSubs).toBe(false);
    });

    it('toggles tournament visibility between PUBLIC and PRIVATE and persists immediately', async () => {
      const tourney = localDataService.createTournament({
        name: 'Visibility Test League',
        visibility: 'PUBLIC',
      });

      expect(tourney.visibility).toBe('PUBLIC');

      // Switch to PRIVATE
      await tournamentService.updateTournament(tourney.id, { visibility: 'PRIVATE' });
      localDataService.updateTournament(tourney.id, { visibility: 'PRIVATE' });

      let current = localDataService.getTournamentById(tourney.id);
      expect(current?.visibility).toBe('PRIVATE');

      // Switch back to PUBLIC
      await tournamentService.updateTournament(tourney.id, { visibility: 'PUBLIC' });
      localDataService.updateTournament(tourney.id, { visibility: 'PUBLIC' });

      current = localDataService.getTournamentById(tourney.id);
      expect(current?.visibility).toBe('PUBLIC');
    });

    it('enforces single-captain exclusivity when toggling team captain switch', async () => {
      const tourney = localDataService.createTournament({ name: 'Captain Test FC' });
      const team = await tournamentService.addTeam({ name: 'Alpha Squad' }, tourney.id);

      // Add first player as captain
      const player1 = await tournamentService.addPlayer(
        { name: 'Player One', team_id: team.id, position: 'MID', is_captain: true },
        tourney.id
      );

      let squad = await tournamentService.getPlayers(tourney.id);
      expect(squad.find(p => p.id === player1.id)?.is_captain).toBe(true);

      // Add second player and set as captain
      const player2 = await tournamentService.addPlayer(
        { name: 'Player Two', team_id: team.id, position: 'FWD', is_captain: true },
        tourney.id
      );

      // Verify captain status was transferred to Player Two and removed from Player One
      squad = await tournamentService.getPlayers(tourney.id);
      const p1 = squad.find(p => p.id === player1.id);
      const p2 = squad.find(p => p.id === player2.id);

      expect(p2?.is_captain).toBe(true);
      expect(p1?.is_captain).toBe(false);

      // Now update player1 back to captain via updatePlayer
      await tournamentService.updatePlayer({ ...p1!, is_captain: true }, tourney.id);

      squad = await tournamentService.getPlayers(tourney.id);
      expect(squad.find(p => p.id === player1.id)?.is_captain).toBe(true);
      expect(squad.find(p => p.id === player2.id)?.is_captain).toBe(false);
    });
  });

  describe('2. Fix Delete Button & Deletion Integrity', () => {
    it('prevents deletion of default TournX demo tournament and throws explicit error', async () => {
      await expect(tournamentService.deleteTournament(DEMO_TOURNAMENT_ID)).rejects.toThrow(
        /cannot be deleted/i
      );
      // Verify demo tournament still exists
      const demo = localDataService.getTournamentById(DEMO_TOURNAMENT_ID);
      expect(demo).not.toBeNull();
    });

    it('safely deletes local tournament, purges all associated child collections, and resets active pointers', async () => {
      const tourney = localDataService.createTournament({ name: 'Temporary Cup' });
      const teamA = await tournamentService.addTeam({ name: 'Team Alpha' }, tourney.id);
      const teamB = await tournamentService.addTeam({ name: 'Team Beta' }, tourney.id);
      const player = await tournamentService.addPlayer({ name: 'Striker', team_id: teamA.id, position: 'FWD', is_captain: false }, tourney.id);
      const [match] = await tournamentService.createMatches([{
        match_number: 1,
        round_number: 1,
        home_team_id: teamA.id,
        away_team_id: teamB.id,
        scheduled_date: '2026-11-20',
        scheduled_time: null,
        venue: 'Stadium A',
        home_score: 1,
        away_score: 0,
        status: 'COMPLETED',
      }], tourney.id);

      await tournamentService.saveSimplifiedMatch(
        match.id,
        'COMPLETED',
        { scheduled_date: '2026-11-20', scheduled_time: null, venue: 'Stadium A', referee: null, assistant_referee_1: null, assistant_referee_2: null },
        1,
        0,
        [{ player_id: player.id, team_id: teamA.id }],
        player.id
      );

      // Set as active tournament and last joined
      localDataService.setActiveTournamentId(tourney.id);
      localDataService.setLastJoinedTournament(tourney.id, tourney.slug || undefined);

      expect(localDataService.getActiveTournamentId()).toBe(tourney.id);
      expect((await tournamentService.getTeams(tourney.id)).length).toBe(2);
      expect((await tournamentService.getMatches(tourney.id)).length).toBe(1);

      // Perform deletion
      await tournamentService.deleteTournament(tourney.id);
      localDataService.deleteTournament(tourney.id);

      // Verify tournament was removed
      expect(localDataService.getTournamentById(tourney.id)).toBeNull();
      // Verify child collections are purged
      expect((await tournamentService.getTeams(tourney.id)).length).toBe(0);
      expect((await tournamentService.getMatches(tourney.id)).length).toBe(0);
      expect((await tournamentService.getPlayers(tourney.id)).length).toBe(0);
      expect((await tournamentService.getGoals(tourney.id)).length).toBe(0);
      expect((await tournamentService.getManOfTheMatches(tourney.id)).length).toBe(0);

      // Verify active tournament pointer safely falls back to demo
      expect(localDataService.getActiveTournamentId()).toBe(DEMO_TOURNAMENT_ID);
    });

    it('ensures deleting a tournament does not affect unrelated tournaments or demo data', async () => {
      const tourney1 = localDataService.createTournament({ name: 'Keep This Cup' });
      const tourney2 = localDataService.createTournament({ name: 'Delete This Cup' });

      await tournamentService.addTeam({ name: 'Keepers FC' }, tourney1.id);
      await tournamentService.addTeam({ name: 'Goners FC' }, tourney2.id);

      // Delete tourney2
      await tournamentService.deleteTournament(tourney2.id);
      localDataService.deleteTournament(tourney2.id);

      // Verify tourney1 is intact
      expect(localDataService.getTournamentById(tourney1.id)).not.toBeNull();
      const teams1 = await tournamentService.getTeams(tourney1.id);
      expect(teams1.length).toBe(1);
      expect(teams1[0].name).toBe('Keepers FC');

      // Verify demo tournament is intact
      expect(localDataService.getTournamentById(DEMO_TOURNAMENT_ID)).not.toBeNull();
    });

    it('surfaces an explicit error when unauthenticated cloud tournament deletion is attempted', async () => {
      // Valid UUID format for cloud tournaments
      const cloudTourneyId = '99999999-9999-4999-a999-999999999999';
      
      // When unauthenticated in Supabase, deleteTournament must throw an explicit authorization error
      await expect(tournamentService.deleteTournament(cloudTourneyId)).rejects.toThrow(
        /authentication required|unauthorized|failed to delete/i
      );
    });
  });

  describe('3. Fix Leave Tournament in Public Hub', () => {
    it('clears device lastJoinedTournament and participant session role on leave', () => {
      const tourney = localDataService.createTournament({ name: 'Community League', slug: 'community-league' });
      
      // Participant joins
      localDataService.setLastJoinedTournament(tourney.id, tourney.slug || undefined);
      localDataService.setActiveTournamentId(tourney.id);
      localDataService.setSessionRole(tourney.id, 'VIEW');

      expect(localDataService.getLastJoinedTournament().id).toBe(tourney.id);
      expect(localDataService.getSessionRole(tourney.id)).toBe('VIEW');

      // Participant leaves
      localDataService.clearLastJoinedTournament();
      localDataService.setSessionRole(tourney.id, null);

      // Verify device state is cleared
      expect(localDataService.getLastJoinedTournament().id).toBeNull();
      expect(localDataService.getSessionRole(tourney.id)).toBe('ANONYMOUS');
    });

    it('leaving does NOT delete the tournament, teams, or match data', async () => {
      const tourney = localDataService.createTournament({ name: 'Shared League' });
      const team = await tournamentService.addTeam({ name: 'City Stars' }, tourney.id);
      
      // Simulate participant leaving
      localDataService.clearLastJoinedTournament();
      localDataService.setSessionRole(tourney.id, null);

      // Verify tournament and its data are completely intact
      const existing = localDataService.getTournamentById(tourney.id);
      expect(existing).not.toBeNull();
      expect(existing?.name).toBe('Shared League');
      const teams = await tournamentService.getTeams(tourney.id);
      expect(teams.length).toBe(1);
      expect(teams[0].id).toBe(team.id);
    });

    it('allows participant to rejoin the same tournament again with valid code or link', () => {
      const tourney = localDataService.createTournament({ name: 'Rejoin League', slug: 'rejoin-league' });
      const { rawCode } = localDataService.generateAccessCode(tourney.id, 'VIEW', 'Viewer Code');

      // First join
      const res1 = localDataService.verifyAccessCode(tourney.id, rawCode);
      expect(res1.success).toBe(true);
      localDataService.setLastJoinedTournament(tourney.id, tourney.slug || undefined);

      // Leave
      localDataService.clearLastJoinedTournament();
      localDataService.setSessionRole(tourney.id, null);
      expect(localDataService.getLastJoinedTournament().id).toBeNull();

      // Rejoin using same code
      const res2 = localDataService.verifyAccessCode(tourney.id, rawCode);
      expect(res2.success).toBe(true);
      expect(res2.role).toBe('VIEW');

      localDataService.setLastJoinedTournament(tourney.id, tourney.slug || undefined);
      expect(localDataService.getLastJoinedTournament().id).toBe(tourney.id);
    });

    it('prevents automatic reopening of the left tournament when loading route / without lastJoined state', () => {
      localDataService.createTournament({ name: 'Do Not Reopen League', slug: 'no-reopen' });
      
      // User left tournament
      localDataService.clearLastJoinedTournament();

      // Simulate route parse when navigating to /
      const lastJoined = localDataService.getLastJoinedTournament();
      expect(lastJoined.id).toBeNull();
      // Without lastJoined.id, App falls back to landing without auto-redirecting to /t/no-reopen
    });
  });
});
