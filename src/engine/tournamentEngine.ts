/**
 * TournX Deterministic Tournament Engine
 * think.prompt.organise
 *
 * Fully deterministic, standalone TypeScript engine for fixture generation,
 * standings calculation with configurable tie-breakers, and knockout progression.
 * ZERO dependencies on React, browser DOM, or Supabase.
 */

import {
  TournamentRulesConfig,
} from '../types/multiTenant';

export interface EngineTeam {
  id: string;
  name: string;
  short_name?: string;
  seed?: number;
  group_id?: string;
}

export interface EngineMatch {
  id: string;
  tournament_id?: string;
  stage_id?: string;
  group_id?: string | null;
  match_number: number;
  round_number: number;
  round_name?: string; // e.g. "Quarter-Final", "Semi-Final", "Final"
  home_team_id: string | null; // null if waiting for previous match winner
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
  winner_team_id?: string | null;
  next_match_id?: string | null;
  next_match_slot?: 'HOME' | 'AWAY' | null;
  is_bye?: boolean;
}

export interface EngineStandingEntry {
  position: number;
  team_id: string;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export const DEFAULT_RULES_CONFIG: TournamentRulesConfig = {
  points_for_win: 3,
  points_for_draw: 1,
  points_for_loss: 0,
  tie_breaker_order: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'],
  match_duration_minutes: 50,
  half_time_duration_minutes: 5,
  max_substitutes: 5,
  allow_draws: true,
  extra_time_enabled: false,
  penalty_shootout_enabled: false,
};

/**
 * Validates a list of eligible teams.
 */
export function validateTeams(teams: EngineTeam[]): void {
  if (!teams || teams.length < 2) {
    throw new Error('At least 2 teams are required to generate fixtures.');
  }

  const ids = new Set<string>();
  for (const team of teams) {
    if (!team.id || !team.id.trim()) {
      throw new Error('All teams must have a non-empty unique identifier.');
    }
    if (ids.has(team.id)) {
      throw new Error(`Duplicate team ID detected: "${team.id}".`);
    }
    ids.add(team.id);
  }
}

/**
 * Generates Single Round-Robin Fixtures using the deterministic Circle (Berger) algorithm.
 */
export function generateSingleRoundRobin(
  teams: EngineTeam[],
  options: {
    startMatchNumber?: number;
    stageId?: string;
    groupId?: string | null;
    idPrefix?: string;
  } = {}
): EngineMatch[] {
  validateTeams(teams);

  const startNum = options.startMatchNumber || 1;
  const stageId = options.stageId || 'stage-rr-1';
  const groupId = options.groupId ?? null;
  const prefix = options.idPrefix || 'm-srr';

  const teamList = [...teams];
  const isOdd = teamList.length % 2 !== 0;

  // Add dummy bye team if odd
  const BYE_ID = '__BYE__';
  if (isOdd) {
    teamList.push({ id: BYE_ID, name: 'BYE' });
  }

  const numTeams = teamList.length;
  const roundsCount = numTeams - 1;
  const half = numTeams / 2;

  const matches: EngineMatch[] = [];
  let currentMatchNum = startNum;

  // Circle rotation
  const rotating = [...teamList];

  for (let r = 0; r < roundsCount; r++) {
    const roundNumber = r + 1;

    for (let i = 0; i < half; i++) {
      const home = rotating[i];
      const away = rotating[numTeams - 1 - i];

      // If one of the teams is the BYE dummy, skip or mark as bye
      if (home.id === BYE_ID || away.id === BYE_ID) {
        continue;
      }

      // Alternate home/away for the fixed pivot team (index 0) each round
      let homeId = home.id;
      let awayId = away.id;
      if (i === 0 && r % 2 === 1) {
        homeId = away.id;
        awayId = home.id;
      }

      matches.push({
        id: `${prefix}-${currentMatchNum.toString().padStart(3, '0')}`,
        stage_id: stageId,
        group_id: groupId,
        match_number: currentMatchNum++,
        round_number: roundNumber,
        round_name: `Round ${roundNumber}`,
        home_team_id: homeId,
        away_team_id: awayId,
        home_score: null,
        away_score: null,
        status: 'UPCOMING',
      });
    }

    // Rotate: keep rotating[0] fixed, shift others
    const fixed = rotating[0];
    const last = rotating[rotating.length - 1];
    for (let k = rotating.length - 1; k > 1; k--) {
      rotating[k] = rotating[k - 1];
    }
    rotating[1] = last;
    rotating[0] = fixed;
  }

  return matches;
}

/**
 * Generates Double Round-Robin Fixtures (home and away legs).
 */
export function generateDoubleRoundRobin(
  teams: EngineTeam[],
  options: {
    startMatchNumber?: number;
    stageId?: string;
    groupId?: string | null;
    idPrefix?: string;
  } = {}
): EngineMatch[] {
  const leg1 = generateSingleRoundRobin(teams, {
    ...options,
    idPrefix: options.idPrefix || 'm-drr-leg1',
  });

  const roundsCount = Math.max(...leg1.map(m => m.round_number), 0);
  let nextMatchNum = (options.startMatchNumber || 1) + leg1.length;
  const leg2Prefix = options.idPrefix ? `${options.idPrefix}-leg2` : 'm-drr-leg2';

  const leg2: EngineMatch[] = leg1.map(m => ({
    id: `${leg2Prefix}-${nextMatchNum.toString().padStart(3, '0')}`,
    stage_id: m.stage_id,
    group_id: m.group_id,
    match_number: nextMatchNum++,
    round_number: m.round_number + roundsCount,
    round_name: `Round ${m.round_number + roundsCount} (Return Leg)`,
    home_team_id: m.away_team_id,
    away_team_id: m.home_team_id,
    home_score: null,
    away_score: null,
    status: 'UPCOMING',
  }));

  return [...leg1, ...leg2];
}

/**
 * Computes next power of 2 for knockout brackets.
 */
export function nextPowerOf2(n: number): number {
  let count = 1;
  while (count < n) count *= 2;
  return count;
}

/**
 * Standard tournament seed pairing order (e.g. 1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6).
 */
export function getSeedPairs(bracketSize: number): [number, number][] {
  let rounds = [1, 2];
  while (rounds.length < bracketSize) {
    const next: number[] = [];
    const sum = rounds.length * 2 + 1;
    for (const seed of rounds) {
      next.push(seed);
      next.push(sum - seed);
    }
    rounds = next;
  }

  const pairs: [number, number][] = [];
  for (let i = 0; i < rounds.length; i += 2) {
    pairs.push([rounds[i], rounds[i + 1]]);
  }
  return pairs;
}

/**
 * Generates Single-Elimination Knockout Bracket with automatic seeding & byes.
 */
export function generateSingleEliminationKnockout(
  teams: EngineTeam[],
  options: {
    startMatchNumber?: number;
    stageId?: string;
    idPrefix?: string;
    includeThirdPlacePlayoff?: boolean;
  } = {}
): EngineMatch[] {
  validateTeams(teams);

  const startNum = options.startMatchNumber || 1;
  const stageId = options.stageId || 'stage-ko-1';
  const prefix = options.idPrefix || 'm-ko';

  const sortedTeams = [...teams].sort((a, b) => (a.seed || 999) - (b.seed || 999));
  const numTeams = sortedTeams.length;
  const bracketSize = nextPowerOf2(numTeams);
  const totalRounds = Math.log2(bracketSize);

  // Map seed number -> Team
  const seedToTeam = new Map<number, EngineTeam>();
  sortedTeams.forEach((t, idx) => {
    seedToTeam.set(t.seed || idx + 1, t);
  });

  const getRoundName = (roundIdx: number, total: number) => {
    const distanceToFinal = total - roundIdx - 1;
    if (distanceToFinal === 0) return 'Final';
    if (distanceToFinal === 1) return 'Semi-Final';
    if (distanceToFinal === 2) return 'Quarter-Final';
    if (distanceToFinal === 3) return 'Round of 16';
    return `Round of ${Math.pow(2, distanceToFinal + 1)}`;
  };

  const matchesByRound: EngineMatch[][] = [];
  let currentNum = startNum;

  // Build rounds from final down to round 1 so next_match_id can be linked
  for (let r = 0; r < totalRounds; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r + 1);
    const roundMatches: EngineMatch[] = [];

    for (let m = 0; m < matchesInRound; m++) {
      roundMatches.push({
        id: `${prefix}-r${r + 1}-${(m + 1).toString().padStart(2, '0')}`,
        stage_id: stageId,
        group_id: null,
        match_number: currentNum++,
        round_number: r + 1,
        round_name: getRoundName(r, totalRounds),
        home_team_id: null,
        away_team_id: null,
        home_score: null,
        away_score: null,
        status: 'UPCOMING',
      });
    }
    matchesByRound.push(roundMatches);
  }

  // Link child matches to parent matches in subsequent rounds
  for (let r = 0; r < totalRounds - 1; r++) {
    const currentRound = matchesByRound[r];
    const nextRound = matchesByRound[r + 1];

    for (let m = 0; m < currentRound.length; m++) {
      const parentMatch = nextRound[Math.floor(m / 2)];
      currentRound[m].next_match_id = parentMatch.id;
      currentRound[m].next_match_slot = m % 2 === 0 ? 'HOME' : 'AWAY';
    }
  }

  // Populate Round 1 with teams and byes
  const seedPairs = getSeedPairs(bracketSize);
  const round1 = matchesByRound[0];

  for (let i = 0; i < round1.length; i++) {
    const [seedHome, seedAway] = seedPairs[i];
    const teamHome = seedToTeam.get(seedHome);
    const teamAway = seedToTeam.get(seedAway);

    round1[i].home_team_id = teamHome ? teamHome.id : null;
    round1[i].away_team_id = teamAway ? teamAway.id : null;

    // Handle Bye
    if (teamHome && !teamAway) {
      round1[i].status = 'COMPLETED';
      round1[i].home_score = 0;
      round1[i].away_score = 0;
      round1[i].winner_team_id = teamHome.id;
      round1[i].is_bye = true;

      // Automatically advance to next round
      if (round1[i].next_match_id) {
        const parent = matchesByRound[1]?.find(p => p.id === round1[i].next_match_id);
        if (parent) {
          if (round1[i].next_match_slot === 'HOME') {
            parent.home_team_id = teamHome.id;
          } else {
            parent.away_team_id = teamHome.id;
          }
        }
      }
    } else if (!teamHome && teamAway) {
      round1[i].status = 'COMPLETED';
      round1[i].home_score = 0;
      round1[i].away_score = 0;
      round1[i].winner_team_id = teamAway.id;
      round1[i].is_bye = true;

      if (round1[i].next_match_id) {
        const parent = matchesByRound[1]?.find(p => p.id === round1[i].next_match_id);
        if (parent) {
          if (round1[i].next_match_slot === 'HOME') {
            parent.home_team_id = teamAway.id;
          } else {
            parent.away_team_id = teamAway.id;
          }
        }
      }
    }
  }

  const allMatches: EngineMatch[] = [];
  matchesByRound.forEach(rm => allMatches.push(...rm));

  // Optional 3rd Place Playoff
  if (options.includeThirdPlacePlayoff && totalRounds >= 2) {
    allMatches.push({
      id: `${prefix}-3rd-place`,
      stage_id: stageId,
      group_id: null,
      match_number: currentNum++,
      round_number: totalRounds,
      round_name: '3rd Place Playoff',
      home_team_id: null,
      away_team_id: null,
      home_score: null,
      away_score: null,
      status: 'UPCOMING',
    });
  }

  return allMatches;
}

/**
 * Advances a winner in a knockout bracket and recalculates progression.
 */
export function advanceKnockoutResult(
  allMatches: EngineMatch[],
  matchId: string,
  winnerId: string | null
): EngineMatch[] {
  const updated = allMatches.map(m => ({ ...m }));
  const target = updated.find(m => m.id === matchId);
  if (!target) return updated;

  target.winner_team_id = winnerId;

  // Propagate to next match
  if (target.next_match_id) {
    const nextMatch = updated.find(m => m.id === target.next_match_id);
    if (nextMatch) {
      if (target.next_match_slot === 'HOME') {
        nextMatch.home_team_id = winnerId;
      } else if (target.next_match_slot === 'AWAY') {
        nextMatch.away_team_id = winnerId;
      }
      // If winner was cleared/corrected, also reset downstream completed scores
      if (!winnerId) {
        nextMatch.home_score = null;
        nextMatch.away_score = null;
        nextMatch.status = 'UPCOMING';
        nextMatch.winner_team_id = null;
      }
    }
  }

  return updated;
}

/**
 * Calculates Deterministic League Standings with configurable points and tie-breakers.
 */
export function calculateDeterministicStandings(
  teams: EngineTeam[],
  matches: EngineMatch[],
  rules: TournamentRulesConfig = DEFAULT_RULES_CONFIG
): EngineStandingEntry[] {
  const standingsMap = new Map<string, EngineStandingEntry>();

  for (const team of teams) {
    standingsMap.set(team.id, {
      position: 1,
      team_id: team.id,
      team_name: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0,
      form: [],
    });
  }

  // Filter completed matches with valid scores (skip byes)
  const completed = matches.filter(
    m => m.status === 'COMPLETED' && m.home_score !== null && m.away_score !== null && !m.is_bye
  );

  for (const match of completed) {
    const home = standingsMap.get(match.home_team_id || '');
    const away = standingsMap.get(match.away_team_id || '');

    if (!home || !away) continue;

    const hScore = match.home_score!;
    const aScore = match.away_score!;

    home.played += 1;
    away.played += 1;

    home.goals_for += hScore;
    home.goals_against += aScore;
    away.goals_for += aScore;
    away.goals_against += hScore;

    if (hScore > aScore) {
      home.won += 1;
      home.points += rules.points_for_win;
      home.form.push('W');

      away.lost += 1;
      away.points += rules.points_for_loss;
      away.form.push('L');
    } else if (hScore < aScore) {
      away.won += 1;
      away.points += rules.points_for_win;
      away.form.push('W');

      home.lost += 1;
      home.points += rules.points_for_loss;
      home.form.push('L');
    } else {
      home.drawn += 1;
      home.points += rules.points_for_draw;
      home.form.push('D');

      away.drawn += 1;
      away.points += rules.points_for_draw;
      away.form.push('D');
    }

    home.goal_difference = home.goals_for - home.goals_against;
    away.goal_difference = away.goals_for - away.goals_against;
  }

  const list = Array.from(standingsMap.values());

  // Head-to-head lookup helper for tied teams
  const getHeadToHeadPoints = (teamAId: string, teamBId: string): number => {
    const h2hMatches = completed.filter(
      m =>
        (m.home_team_id === teamAId && m.away_team_id === teamBId) ||
        (m.home_team_id === teamBId && m.away_team_id === teamAId)
    );

    let ptsA = 0;
    for (const m of h2hMatches) {
      if (m.home_team_id === teamAId) {
        if (m.home_score! > m.away_score!) ptsA += rules.points_for_win;
        else if (m.home_score! === m.away_score!) ptsA += rules.points_for_draw;
        else ptsA += rules.points_for_loss;
      } else {
        if (m.away_score! > m.home_score!) ptsA += rules.points_for_win;
        else if (m.away_score! === m.home_score!) ptsA += rules.points_for_draw;
        else ptsA += rules.points_for_loss;
      }
    }
    return ptsA;
  };

  // Sort according to configurable tie-breaker order
  const tieBreakers = rules.tie_breaker_order || ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR'];

  list.sort((a, b) => {
    for (const criterion of tieBreakers) {
      if (criterion === 'POINTS') {
        if (b.points !== a.points) return b.points - a.points;
      } else if (criterion === 'GOAL_DIFFERENCE') {
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
      } else if (criterion === 'GOALS_FOR') {
        if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      } else if (criterion === 'HEAD_TO_HEAD') {
        const ptsA = getHeadToHeadPoints(a.team_id, b.team_id);
        const ptsB = getHeadToHeadPoints(b.team_id, a.team_id);
        if (ptsB !== ptsA) return ptsB - ptsA;
      }
    }
    // Final deterministic fallback: alphabetical team name
    return a.team_name.localeCompare(b.team_name);
  });

  return list.map((entry, idx) => ({
    ...entry,
    position: idx + 1,
  }));
}

export interface LeagueWithPlayoffsOptions {
  roundRobinType?: 'SINGLE' | 'DOUBLE';
  qualifiersCount?: 2 | 4;
  includeThirdPlace?: boolean;
  startMatchNumber?: number;
  stageId?: string;
  playoffStageId?: string;
  idPrefix?: string;
}

/**
 * Generates League followed by Playoffs (top 2 direct to Final, or top 4 to Semifinals + Final).
 */
export function generateLeagueWithPlayoffs(
  teams: EngineTeam[],
  options: LeagueWithPlayoffsOptions = {}
): { leagueMatches: EngineMatch[]; playoffMatches: EngineMatch[]; allMatches: EngineMatch[] } {
  validateTeams(teams);
  const rrType = options.roundRobinType || 'SINGLE';
  const qualifiers = options.qualifiersCount || (teams.length >= 4 ? 4 : 2);
  const startNum = options.startMatchNumber || 1;
  const stageId = options.stageId || 'stage-league-1';
  const playoffStageId = options.playoffStageId || 'stage-playoff-1';
  const prefix = options.idPrefix || 'm-lp';

  // 1. Generate League Matches
  const leagueMatches = rrType === 'DOUBLE'
    ? generateDoubleRoundRobin(teams, { startMatchNumber: startNum, stageId, idPrefix: `${prefix}-lg` })
    : generateSingleRoundRobin(teams, { startMatchNumber: startNum, stageId, idPrefix: `${prefix}-lg` });

  let nextMatchNum = startNum + leagueMatches.length;
  const playoffMatches: EngineMatch[] = [];
  const maxRoundNumber = Math.max(...leagueMatches.map(m => m.round_number), 0);

  if (qualifiers === 2) {
    // Top 2 advance directly to Final
    playoffMatches.push({
      id: `${prefix}-final`,
      stage_id: playoffStageId,
      group_id: null,
      match_number: nextMatchNum++,
      round_number: maxRoundNumber + 1,
      round_name: 'Final',
      home_team_id: null,
      away_team_id: null,
      home_score: null,
      away_score: null,
      status: 'UPCOMING',
    });
  } else {
    // Top 4 advance to Semifinals (1st vs 4th, 2nd vs 3rd), followed by Final
    const finalMatchId = `${prefix}-final`;
    const sf1: EngineMatch = {
      id: `${prefix}-sf1`,
      stage_id: playoffStageId,
      group_id: null,
      match_number: nextMatchNum++,
      round_number: maxRoundNumber + 1,
      round_name: 'Semi-Final 1 (1st vs 4th)',
      home_team_id: null,
      away_team_id: null,
      home_score: null,
      away_score: null,
      status: 'UPCOMING',
      next_match_id: finalMatchId,
      next_match_slot: 'HOME',
    };

    const sf2: EngineMatch = {
      id: `${prefix}-sf2`,
      stage_id: playoffStageId,
      group_id: null,
      match_number: nextMatchNum++,
      round_number: maxRoundNumber + 1,
      round_name: 'Semi-Final 2 (2nd vs 3rd)',
      home_team_id: null,
      away_team_id: null,
      home_score: null,
      away_score: null,
      status: 'UPCOMING',
      next_match_id: finalMatchId,
      next_match_slot: 'AWAY',
    };

    const finalMatch: EngineMatch = {
      id: finalMatchId,
      stage_id: playoffStageId,
      group_id: null,
      match_number: nextMatchNum++,
      round_number: maxRoundNumber + 2,
      round_name: 'Final',
      home_team_id: null,
      away_team_id: null,
      home_score: null,
      away_score: null,
      status: 'UPCOMING',
    };

    playoffMatches.push(sf1, sf2);

    if (options.includeThirdPlace) {
      const thirdPlaceMatch: EngineMatch = {
        id: `${prefix}-3rd`,
        stage_id: playoffStageId,
        group_id: null,
        match_number: nextMatchNum++,
        round_number: maxRoundNumber + 2,
        round_name: '3rd Place Playoff',
        home_team_id: null,
        away_team_id: null,
        home_score: null,
        away_score: null,
        status: 'UPCOMING',
      };
      playoffMatches.push(thirdPlaceMatch);
    }

    playoffMatches.push(finalMatch);
  }

  return {
    leagueMatches,
    playoffMatches,
    allMatches: [...leagueMatches, ...playoffMatches],
  };
}

/**
 * Updates playoff match team slots based on league standings.
 */
export function updatePlayoffSlotsFromStandings(
  playoffMatches: EngineMatch[],
  standings: EngineStandingEntry[]
): EngineMatch[] {
  if (!standings || standings.length < 2) return playoffMatches;

  return playoffMatches.map(m => {
    const updated = { ...m };
    if (m.round_name === 'Final' && !m.next_match_id) {
      // Direct 2-team final
      if (!updated.home_team_id && standings[0]) updated.home_team_id = standings[0].team_id;
      if (!updated.away_team_id && standings[1]) updated.away_team_id = standings[1].team_id;
    } else if (m.round_name?.includes('Semi-Final 1')) {
      if (!updated.home_team_id && standings[0]) updated.home_team_id = standings[0].team_id;
      if (!updated.away_team_id && standings[3]) updated.away_team_id = standings[3].team_id;
    } else if (m.round_name?.includes('Semi-Final 2')) {
      if (!updated.home_team_id && standings[1]) updated.home_team_id = standings[1].team_id;
      if (!updated.away_team_id && standings[2]) updated.away_team_id = standings[2].team_id;
    }
    return updated;
  });
}

