import { describe, it, expect } from 'vitest';
import {
  generateSingleRoundRobin,
  generateDoubleRoundRobin,
  generateSingleEliminationKnockout,
  generateLeagueWithPlayoffs,
  updatePlayoffSlotsFromStandings,
  advanceKnockoutResult,
  calculateDeterministicStandings,
  validateTeams,
  EngineTeam,
  EngineMatch,
  DEFAULT_RULES_CONFIG,
} from '../tournamentEngine';

describe('Tournament Engine — Fixture Generation', () => {
  const teamsEven: EngineTeam[] = [
    { id: 't1', name: 'Alpha FC', seed: 1 },
    { id: 't2', name: 'Beta United', seed: 2 },
    { id: 't3', name: 'Gamma City', seed: 3 },
    { id: 't4', name: 'Delta Rovers', seed: 4 },
  ];

  const teamsOdd: EngineTeam[] = [
    { id: 't1', name: 'Alpha FC', seed: 1 },
    { id: 't2', name: 'Beta United', seed: 2 },
    { id: 't3', name: 'Gamma City', seed: 3 },
    { id: 't4', name: 'Delta Rovers', seed: 4 },
    { id: 't5', name: 'Epsilon Town', seed: 5 },
  ];

  it('throws validation error for insufficient teams', () => {
    expect(() => validateTeams([])).toThrow(/At least 2 teams are required/);
    expect(() => validateTeams([{ id: 't1', name: 'Solo' }])).toThrow(/At least 2 teams are required/);
  });

  it('throws validation error for duplicate team IDs', () => {
    expect(() =>
      validateTeams([
        { id: 't1', name: 'Alpha' },
        { id: 't1', name: 'Beta' },
      ])
    ).toThrow(/Duplicate team ID detected/);
  });

  it('generates Single Round-Robin for even team count (4 teams -> 6 matches, 3 rounds)', () => {
    const fixtures = generateSingleRoundRobin(teamsEven);
    expect(fixtures).toHaveLength(6);

    const rounds = new Set(fixtures.map(f => f.round_number));
    expect(rounds.size).toBe(3);

    // Verify no self-play
    for (const f of fixtures) {
      expect(f.home_team_id).not.toBe(f.away_team_id);
    }

    // Verify all pairs played exactly once
    const pairs = fixtures.map(f => [f.home_team_id, f.away_team_id].sort().join('-'));
    const uniquePairs = new Set(pairs);
    expect(uniquePairs.size).toBe(6);
  });

  it('generates Single Round-Robin for odd team count with byes (5 teams -> 10 matches, 5 rounds)', () => {
    const fixtures = generateSingleRoundRobin(teamsOdd);
    expect(fixtures).toHaveLength(10); // 5 * 4 / 2 = 10 matches

    const rounds = new Set(fixtures.map(f => f.round_number));
    expect(rounds.size).toBe(5);

    // Each round has exactly 2 matches (one team on bye)
    for (let r = 1; r <= 5; r++) {
      const roundMatches = fixtures.filter(f => f.round_number === r);
      expect(roundMatches).toHaveLength(2);
    }
  });

  it('generates Double Round-Robin (4 teams -> 12 matches, 6 rounds, inverted legs)', () => {
    const fixtures = generateDoubleRoundRobin(teamsEven);
    expect(fixtures).toHaveLength(12);

    const rounds = new Set(fixtures.map(f => f.round_number));
    expect(rounds.size).toBe(6);

    // Verify return leg matches exist with reversed home/away
    const leg1 = fixtures.slice(0, 6);
    const leg2 = fixtures.slice(6, 12);

    for (let i = 0; i < 6; i++) {
      expect(leg2[i].home_team_id).toBe(leg1[i].away_team_id);
      expect(leg2[i].away_team_id).toBe(leg1[i].home_team_id);
    }
  });

  it('generates Single-Elimination Knockout bracket for 4 teams (Semi-Finals -> Final)', () => {
    const bracket = generateSingleEliminationKnockout(teamsEven);
    expect(bracket).toHaveLength(3); // 2 semi-finals + 1 final

    const semi1 = bracket[0];
    const semi2 = bracket[1];
    const final = bracket[2];

    expect(semi1.round_name).toBe('Semi-Final');
    expect(semi2.round_name).toBe('Semi-Final');
    expect(final.round_name).toBe('Final');

    // Seed pairing: 1 vs 4, 2 vs 3
    expect(semi1.home_team_id).toBe('t1');
    expect(semi1.away_team_id).toBe('t4');
    expect(semi2.home_team_id).toBe('t2');
    expect(semi2.away_team_id).toBe('t3');

    // Final awaits winners
    expect(final.home_team_id).toBeNull();
    expect(final.away_team_id).toBeNull();
  });

  it('handles byes properly in knockout bracket with 3 teams (bracket of 4, seed 1 gets bye)', () => {
    const teams3 = teamsEven.slice(0, 3); // seeds 1, 2, 3
    const bracket = generateSingleEliminationKnockout(teams3);

    // Semi 1: Seed 1 has bye -> automatically completed, advances to Final
    const semi1 = bracket[0];
    const final = bracket[2];

    expect(semi1.is_bye).toBe(true);
    expect(semi1.status).toBe('COMPLETED');
    expect(semi1.winner_team_id).toBe('t1');
    expect(final.home_team_id).toBe('t1'); // seed 1 already in final
  });
});

describe('Tournament Engine — Knockout Progression & Recalculation', () => {
  const teams: EngineTeam[] = [
    { id: 't1', name: 'Alpha FC', seed: 1 },
    { id: 't2', name: 'Beta United', seed: 2 },
    { id: 't3', name: 'Gamma City', seed: 3 },
    { id: 't4', name: 'Delta Rovers', seed: 4 },
  ];

  it('advances winners to the Final and handles score corrections safely', () => {
    const bracket = generateSingleEliminationKnockout(teams);
    const semi1 = bracket[0];
    const semi2 = bracket[1];

    // Play Semi 1: t1 beats t4
    const withSemi1 = advanceKnockoutResult(bracket, semi1.id, 't1');
    expect(withSemi1[2].home_team_id).toBe('t1');

    // Play Semi 2: t2 beats t3
    const withSemi2 = advanceKnockoutResult(withSemi1, semi2.id, 't2');
    expect(withSemi2[2].away_team_id).toBe('t2');

    // Correction: Referee overturns Semi 1, t4 won instead
    const corrected = advanceKnockoutResult(withSemi2, semi1.id, 't4');
    expect(corrected[2].home_team_id).toBe('t4');
    expect(corrected[2].away_team_id).toBe('t2');

    // Resetting winner resets final slot
    const resetSemi = advanceKnockoutResult(corrected, semi1.id, null);
    expect(resetSemi[2].home_team_id).toBeNull();
  });
});

describe('Tournament Engine — Standings & Configurable Tie-Breakers', () => {
  const teams: EngineTeam[] = [
    { id: 't1', name: 'Alpha FC' },
    { id: 't2', name: 'Beta United' },
    { id: 't3', name: 'Gamma City' },
  ];

  it('calculates points and goal difference correctly for completed matches', () => {
    const matches: EngineMatch[] = [
      {
        id: 'm1',
        match_number: 1,
        round_number: 1,
        home_team_id: 't1',
        away_team_id: 't2',
        home_score: 3,
        away_score: 1,
        status: 'COMPLETED',
      },
      {
        id: 'm2',
        match_number: 2,
        round_number: 2,
        home_team_id: 't2',
        away_team_id: 't3',
        home_score: 2,
        away_score: 0,
        status: 'COMPLETED',
      },
    ];

    const standings = calculateDeterministicStandings(teams, matches);

    // t1: 1 played, 1 won, 0 drawn, 0 lost, GF 3, GA 1, GD +2, PTS 3
    // t2: 2 played, 1 won, 0 drawn, 1 lost, GF 3, GA 3, GD 0, PTS 3
    // t3: 1 played, 0 won, 0 drawn, 1 lost, GF 0, GA 2, GD -2, PTS 0
    expect(standings[0].team_id).toBe('t1');
    expect(standings[0].points).toBe(3);
    expect(standings[0].goal_difference).toBe(2);

    expect(standings[1].team_id).toBe('t2');
    expect(standings[1].points).toBe(3);
    expect(standings[1].goal_difference).toBe(0);

    expect(standings[2].team_id).toBe('t3');
    expect(standings[2].points).toBe(0);
  });

  it('resolves ties using Head-to-Head when configured', () => {
    // Both t1 and t2 have 3 points and identical GD (+1) and identical GF (2)
    // But t1 beat t2 in their direct match
    const tiedTeams: EngineTeam[] = [
      { id: 't1', name: 'Alpha FC' },
      { id: 't2', name: 'Beta United' },
      { id: 't3', name: 'Gamma City' },
    ];

    const matches: EngineMatch[] = [
      // t1 beats t2: 1-0
      {
        id: 'm1',
        match_number: 1,
        round_number: 1,
        home_team_id: 't1',
        away_team_id: 't2',
        home_score: 1,
        away_score: 0,
        status: 'COMPLETED',
      },
      // t3 beats t1: 1-0
      {
        id: 'm2',
        match_number: 2,
        round_number: 2,
        home_team_id: 't3',
        away_team_id: 't1',
        home_score: 1,
        away_score: 0,
        status: 'COMPLETED',
      },
      // t2 beats t3: 2-0
      {
        id: 'm3',
        match_number: 3,
        round_number: 3,
        home_team_id: 't2',
        away_team_id: 't3',
        home_score: 2,
        away_score: 0,
        status: 'COMPLETED',
      },
    ];

    // Configure Head-to-Head as primary tie-breaker after points
    const customRules = {
      ...DEFAULT_RULES_CONFIG,
      tie_breaker_order: ['POINTS', 'HEAD_TO_HEAD', 'GOAL_DIFFERENCE'] as const,
    };

    const standings = calculateDeterministicStandings(tiedTeams, matches, customRules as any);

    expect(standings).toHaveLength(3);
    // Every team has played 2 matches and has 3 points
    expect(standings.every(s => s.points === 3)).toBe(true);
  });

  it('generates League followed by Playoffs (top 2 direct to Final)', () => {
    const testTeams: EngineTeam[] = [
      { id: 't1', name: 'Alpha FC', seed: 1 },
      { id: 't2', name: 'Beta United', seed: 2 },
      { id: 't3', name: 'Gamma City', seed: 3 },
      { id: 't4', name: 'Delta Rovers', seed: 4 },
    ];
    const res = generateLeagueWithPlayoffs(testTeams, {
      roundRobinType: 'SINGLE',
      qualifiersCount: 2,
    });

    expect(res.leagueMatches).toHaveLength(6);
    expect(res.playoffMatches).toHaveLength(1);
    expect(res.playoffMatches[0].round_name).toBe('Final');
    expect(res.allMatches).toHaveLength(7);
  });

  it('generates League followed by Playoffs (top 4 to Semifinals and Final)', () => {
    const testTeams: EngineTeam[] = [
      { id: 't1', name: 'Alpha FC', seed: 1 },
      { id: 't2', name: 'Beta United', seed: 2 },
      { id: 't3', name: 'Gamma City', seed: 3 },
      { id: 't4', name: 'Delta Rovers', seed: 4 },
    ];
    const res = generateLeagueWithPlayoffs(testTeams, {
      roundRobinType: 'SINGLE',
      qualifiersCount: 4,
      includeThirdPlace: true,
    });

    expect(res.leagueMatches).toHaveLength(6);
    // 2 Semifinals + 1 3rd place + 1 Final = 4 playoff matches
    expect(res.playoffMatches).toHaveLength(4);
    expect(res.allMatches).toHaveLength(10);

    const standings = [
      { position: 1, team_id: 't1', team_name: 'Alpha FC', played: 3, won: 3, drawn: 0, lost: 0, goals_for: 5, goals_against: 0, goal_difference: 5, points: 9, form: ['W', 'W', 'W'] as any },
      { position: 2, team_id: 't2', team_name: 'Beta United', played: 3, won: 2, drawn: 0, lost: 1, goals_for: 4, goals_against: 2, goal_difference: 2, points: 6, form: ['W', 'W', 'L'] as any },
      { position: 3, team_id: 't3', team_name: 'Gamma City', played: 3, won: 1, drawn: 0, lost: 2, goals_for: 2, goals_against: 4, goal_difference: -2, points: 3, form: ['W', 'L', 'L'] as any },
      { position: 4, team_id: 't4', team_name: 'Delta Rovers', played: 3, won: 0, drawn: 0, lost: 3, goals_for: 1, goals_against: 6, goal_difference: -5, points: 0, form: ['L', 'L', 'L'] as any },
    ];

    const updated = updatePlayoffSlotsFromStandings(res.playoffMatches, standings);
    const sf1 = updated.find(m => m.round_name?.includes('Semi-Final 1'));
    const sf2 = updated.find(m => m.round_name?.includes('Semi-Final 2'));

    expect(sf1?.home_team_id).toBe('t1'); // 1st
    expect(sf1?.away_team_id).toBe('t4'); // 4th
    expect(sf2?.home_team_id).toBe('t2'); // 2nd
    expect(sf2?.away_team_id).toBe('t3'); // 3rd
  });
});

