import { describe, it, expect, beforeEach } from 'vitest';
import { localDataService, DEMO_TOURNAMENT_ID } from '../localDataService';
import { tournamentService } from '../tournamentService';
import { getTopScorers, getMotmLeaderboard } from '../../utils/leagueCalculations';
import { Goal, ManOfTheMatch, Player, Team } from '../../types/tournament';

describe('TournX Match Events, POTM Aggregation & Deletion Regression Tests', () => {
  beforeEach(() => {
    localDataService.resetDemoData();
  });

  it('supports recording multiple goals by the same player and multiple scorers in a match', async () => {
    // Create test tournament
    const tourney = localDataService.createTournament({ name: 'Championship Cup' });
    const teamA = await tournamentService.addTeam({ name: 'Team Alpha', short_name: 'ALP' }, tourney.id);
    const teamB = await tournamentService.addTeam({ name: 'Team Beta', short_name: 'BET' }, tourney.id);

    const player1 = await tournamentService.addPlayer({ name: 'Striker One', team_id: teamA.id, position: 'CF', is_captain: false }, tourney.id);
    const player2 = await tournamentService.addPlayer({ name: 'Winger Two', team_id: teamA.id, position: 'MID', is_captain: false }, tourney.id);
    const player3 = await tournamentService.addPlayer({ name: 'Forward Three', team_id: teamB.id, position: 'CF', is_captain: false }, tourney.id);

    const match = (await tournamentService.createMatches([{
      match_number: 1,
      round_number: 1,
      home_team_id: teamA.id,
      away_team_id: teamB.id,
      scheduled_date: '2026-10-20',
      scheduled_time: null,
      venue: 'Main Arena',
      home_score: null,
      away_score: null,
      status: 'UPCOMING',
    }], tourney.id))[0];

    // Record 2 goals for player1 (brace), 1 goal for player2, and 1 goal for player3
    const goalsToRecord = [
      { player_id: player1.id, team_id: teamA.id },
      { player_id: player1.id, team_id: teamA.id },
      { player_id: player2.id, team_id: teamA.id },
      { player_id: player3.id, team_id: teamB.id },
    ];

    await tournamentService.saveSimplifiedMatch(
      match.id,
      'COMPLETED',
      {
        scheduled_date: '2026-10-20',
        scheduled_time: null,
        venue: 'Main Arena',
        referee: null,
        assistant_referee_1: null,
        assistant_referee_2: null,
      },
      3,
      1,
      goalsToRecord,
      player1.id // player1 is POTM
    );

    // Verify goals in storage
    const storedGoals = await tournamentService.getGoals(tourney.id);
    expect(storedGoals.length).toBe(4);
    expect(storedGoals.filter(g => g.player_id === player1.id).length).toBe(2);

    // Verify Golden Boot stats calculation
    const allPlayers: Player[] = [player1, player2, player3];
    const allTeams: Team[] = [teamA, teamB];
    const topScorers = getTopScorers(storedGoals, allPlayers, allTeams);

    expect(topScorers.length).toBe(3);
    expect(topScorers[0].player_name).toBe('Striker One');
    expect(topScorers[0].value).toBe(2); // 2 goals
    expect(topScorers[1].value).toBe(1);
    expect(topScorers[2].value).toBe(1);
  });

  it('does NOT accumulate duplicate POTM awards or goal events upon repeated saves', async () => {
    const tourney = localDataService.createTournament({ name: 'POTM Cup' });
    const teamA = await tournamentService.addTeam({ name: 'Alpha', short_name: 'ALP' }, tourney.id);
    const teamB = await tournamentService.addTeam({ name: 'Beta', short_name: 'BET' }, tourney.id);
    const playerA = await tournamentService.addPlayer({ name: 'Star Player', team_id: teamA.id, position: 'MID', is_captain: false }, tourney.id);

    const match = (await tournamentService.createMatches([{
      match_number: 1,
      round_number: 1,
      home_team_id: teamA.id,
      away_team_id: teamB.id,
      scheduled_date: '2026-10-20',
      scheduled_time: null,
      venue: 'Main Arena',
      home_score: 1,
      away_score: 0,
      status: 'COMPLETED',
    }], tourney.id))[0];

    const fixtureDetails = {
      scheduled_date: '2026-10-20',
      scheduled_time: null,
      venue: 'Main Arena',
      referee: null,
      assistant_referee_1: null,
      assistant_referee_2: null,
    };

    // Save first time
    await tournamentService.saveSimplifiedMatch(
      match.id,
      'COMPLETED',
      fixtureDetails,
      1,
      0,
      [{ player_id: playerA.id, team_id: teamA.id }],
      playerA.id
    );

    // Save second time (e.g. repeated click or editing date)
    await tournamentService.saveSimplifiedMatch(
      match.id,
      'COMPLETED',
      fixtureDetails,
      1,
      0,
      [{ player_id: playerA.id, team_id: teamA.id }],
      playerA.id
    );

    // Verify MOTM counts
    const motms = await tournamentService.getManOfTheMatches(tourney.id);
    expect(motms.length).toBe(1); // exactly 1, not duplicated!

    const leaderboard = getMotmLeaderboard(motms, [playerA], [teamA]);
    expect(leaderboard.length).toBe(1);
    expect(leaderboard[0].value).toBe(1); // 1x POTM
  });

  it('correctly updates and clears POTM when award is changed', async () => {
    const tourney = localDataService.createTournament({ name: 'POTM Switch Cup' });
    const teamA = await tournamentService.addTeam({ name: 'Alpha', short_name: 'ALP' }, tourney.id);
    const teamB = await tournamentService.addTeam({ name: 'Beta', short_name: 'BET' }, tourney.id);
    const p1 = await tournamentService.addPlayer({ name: 'Player One', team_id: teamA.id, position: 'MID', is_captain: false }, tourney.id);
    const p2 = await tournamentService.addPlayer({ name: 'Player Two', team_id: teamB.id, position: 'CF', is_captain: false }, tourney.id);

    const match = (await tournamentService.createMatches([{
      match_number: 1,
      round_number: 1,
      home_team_id: teamA.id,
      away_team_id: teamB.id,
      scheduled_date: null,
      scheduled_time: null,
      venue: null,
      home_score: 1,
      away_score: 1,
      status: 'COMPLETED',
    }], tourney.id))[0];

    const fixtureDetails = {
      scheduled_date: null,
      scheduled_time: null,
      venue: null,
      referee: null,
      assistant_referee_1: null,
      assistant_referee_2: null,
    };

    // Award p1
    await tournamentService.saveSimplifiedMatch(match.id, 'COMPLETED', fixtureDetails, 1, 1, [], p1.id);
    let motms = await tournamentService.getManOfTheMatches(tourney.id);
    expect(motms[0].player_id).toBe(p1.id);

    // Change award to p2
    await tournamentService.saveSimplifiedMatch(match.id, 'COMPLETED', fixtureDetails, 1, 1, [], p2.id);
    motms = await tournamentService.getManOfTheMatches(tourney.id);
    expect(motms.length).toBe(1);
    expect(motms[0].player_id).toBe(p2.id);

    // Clear award
    await tournamentService.saveSimplifiedMatch(match.id, 'COMPLETED', fixtureDetails, 1, 1, [], '');
    motms = await tournamentService.getManOfTheMatches(tourney.id);
    expect(motms.length).toBe(0);
  });

  it('safely deletes tournament, purges all associated sub-collections and resets active pointers', async () => {
    const tourney = localDataService.createTournament({ name: 'Delete Me Cup' });
    localDataService.setActiveTournamentId(tourney.id);
    localDataService.setLastJoinedTournament(tourney.id, tourney.slug || undefined);

    // Add teams, matches, goals
    const team = await tournamentService.addTeam({ name: 'Ephemeral FC', short_name: 'EPH' }, tourney.id);
    const match = (await tournamentService.createMatches([{
      match_number: 1,
      round_number: 1,
      home_team_id: team.id,
      away_team_id: team.id,
      scheduled_date: null,
      scheduled_time: null,
      venue: null,
      home_score: null,
      away_score: null,
      status: 'UPCOMING',
    }], tourney.id))[0];

    expect(localDataService.getTournamentById(tourney.id)).not.toBeNull();
    expect(localDataService.getActiveTournamentId()).toBe(tourney.id);

    // Perform deletion
    const deleteResult = await tournamentService.deleteTournament(tourney.id);
    expect(deleteResult).toBe(true);

    // Confirm tournament is no longer in tournaments list
    const remaining = await tournamentService.getTournaments();
    expect(remaining.some(t => t.id === tourney.id)).toBe(false);

    // Confirm active tournament switched to default demo
    expect(localDataService.getActiveTournamentId()).toBe(DEMO_TOURNAMENT_ID);

    // Confirm last joined pointers cleared
    const last = localDataService.getLastJoinedTournament();
    expect(last.id).toBeNull();

    // Confirm sub-collections purged
    expect(localDataService.getTeams(tourney.id).length).toBe(0);
    expect(localDataService.getMatches(tourney.id).length).toBe(0);
  });
});
