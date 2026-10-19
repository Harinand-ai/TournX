import { describe, it, expect } from 'vitest';
import { parseTournamentPrompt, parseSquadPrompt } from '../promptParsers';

describe('TournX Natural-Language Tournament Input Overhaul', () => {
  // Example 1: Single letter team list with trailing instruction
  it('parses informal "teams are a, b, c, d, make tournament"', () => {
    const input = 'teams are a, b, c, d, make tournament';
    const parsed = parseTournamentPrompt(input);

    expect(parsed.teams).toEqual(['A', 'B', 'C', 'D']);
    expect(parsed.teamCount).toBe(4);
    expect(parsed.format).toBe('SINGLE_ROUND_ROBIN');
    expect(parsed.missingFields).toContain('Start date');
    expect(parsed.missingFields).toContain('Venue / match location');
    expect(parsed.followUpQuestion).toBeDefined();
  });

  // Example 2: Common football clubs with aliases
  it('parses "make a tournament with Arsenal, Chelsea, Liverpool and Spurs"', () => {
    const input = 'make a tournament with Arsenal, Chelsea, Liverpool and Spurs';
    const parsed = parseTournamentPrompt(input);

    expect(parsed.teams).toEqual([
      'Arsenal',
      'Chelsea',
      'Liverpool',
      'Tottenham Hotspur (Spurs)',
    ]);
    expect(parsed.teamCount).toBe(4);
    expect(parsed.format).toBe('SINGLE_ROUND_ROBIN');
  });

  // Example 3: Explicit count with custom team names
  it('parses "I have 4 teams: Red, Blue, Green and Yellow. Arrange a football tournament"', () => {
    const input = 'I have 4 teams: Red, Blue, Green and Yellow. Arrange a football tournament';
    const parsed = parseTournamentPrompt(input);

    expect(parsed.teams).toEqual(['Red', 'Blue', 'Green', 'Yellow']);
    expect(parsed.teamCount).toBe(4);
    expect(parsed.ambiguities).toHaveLength(0);
  });

  // Example 4: Sequential known clubs without commas + venue + date + kickoff time
  it('parses "Crystal Palace Fulham Dortmund Spurs at college ground tomorrow 5 pm"', () => {
    const input = 'Crystal Palace Fulham Dortmund Spurs at college ground tomorrow 5 pm';
    const parsed = parseTournamentPrompt(input);

    expect(parsed.teams).toEqual([
      'Crystal Palace',
      'Fulham',
      'Borussia Dortmund',
      'Tottenham Hotspur (Spurs)',
    ]);
    expect(parsed.venue).toBe('College Ground');
    expect(parsed.startDate).toBe('Tomorrow');
    expect(parsed.startDateIso).not.toBeNull();
    expect(parsed.startTime).toBe('5:00 PM');
    expect(parsed.confidence).toBe('HIGH');
  });

  // Example 5: Knockout format with single-letter teams
  it('parses "create a knockout tournament for these teams: A, B, C, D"', () => {
    const input = 'create a knockout tournament for these teams: A, B, C, D';
    const parsed = parseTournamentPrompt(input);

    expect(parsed.teams).toEqual(['A', 'B', 'C', 'D']);
    expect(parsed.format).toBe('SINGLE_ELIMINATION');
  });

  // Example 6: Colon prefix with Team A, Team B format
  it('parses "teams: Team A, Team B, Team C, Team D"', () => {
    const input = 'teams: Team A, Team B, Team C, Team D';
    const parsed = parseTournamentPrompt(input);

    expect(parsed.teams).toEqual(['Team A', 'Team B', 'Team C', 'Team D']);
    expect(parsed.teamCount).toBe(4);
  });

  // Example 7: Round-robin description without team names (gracefully prompts for missing teams)
  it('parses "we have 6 teams and want everyone to play each other once" without inventing teams', () => {
    const input = 'we have 6 teams and want everyone to play each other once';
    const parsed = parseTournamentPrompt(input);

    expect(parsed.teams).toHaveLength(0);
    expect(parsed.format).toBe('SINGLE_ROUND_ROBIN');
    expect(parsed.missingFields.some(f => f.includes('6 teams'))).toBe(true);
    expect(parsed.ambiguities.some(a => a.includes('6 teams'))).toBe(true);
    expect(parsed.followUpQuestion).toContain('6');
    expect(parsed.confidence).toBe('MEDIUM');
  });

  // Example 8: 8 teams with top 4 semifinals (League with playoffs)
  it('parses "make a tournament for 8 teams, top 4 go to semifinals"', () => {
    const input = 'make a tournament for 8 teams, top 4 go to semifinals';
    const parsed = parseTournamentPrompt(input);

    expect(parsed.format).toBe('LEAGUE_WITH_PLAYOFFS');
    expect(parsed.playoffQualifiers).toBe(4);
    expect(parsed.teams).toHaveLength(0);
    expect(parsed.followUpQuestion).toContain('8');
  });

  // Example 9: Custom single-letter teams, weekday date, time, and venue
  it('parses "Team names are A, B, C and D. Start at 5 PM on Friday at college ground"', () => {
    const input = 'Team names are A, B, C and D. Start at 5 PM on Friday at college ground';
    const parsed = parseTournamentPrompt(input);

    expect(parsed.teams).toEqual(['A', 'B', 'C', 'D']);
    expect(parsed.startTime).toBe('5:00 PM');
    expect(parsed.startDate).toBe('Friday');
    expect(parsed.startDateIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed.venue).toBe('College Ground');
  });

  // Example 10: Match fixture pair syntax
  it('parses "A vs B, C vs D, make tournament"', () => {
    const input = 'A vs B, C vs D, make tournament';
    const parsed = parseTournamentPrompt(input);

    expect(parsed.teams).toEqual(['A', 'B', 'C', 'D']);
    expect(parsed.teamCount).toBe(4);
  });

  // Requirement 3: Distinguish team list from player roster
  it('distinguishes team lists from player rosters without mixing players into teams', () => {
    const input = `
      Teams are Arsenal and Chelsea.
      Arsenal players are Saka, Rice, Odegaard.
      Chelsea players are Palmer, Jackson, Enzo.
    `;
    const parsed = parseTournamentPrompt(input);

    // Only Arsenal and Chelsea should be teams
    expect(parsed.teams).toEqual(['Arsenal', 'Chelsea']);
    expect(parsed.teams).not.toContain('Saka');
    expect(parsed.teams).not.toContain('Palmer');

    // Players should be assigned to embedded squads
    expect(parsed.embeddedSquads).toBeDefined();
    expect(parsed.embeddedSquads?.squads['Arsenal']?.players.map(p => p.name)).toEqual(
      expect.arrayContaining(['Saka', 'Rice', 'Odegaard'])
    );
    expect(parsed.embeddedSquads?.squads['Chelsea']?.players.map(p => p.name)).toEqual(
      expect.arrayContaining(['Palmer', 'Jackson', 'Enzo'])
    );
  });

  // Requirement 8: Ambiguous team count triggers clarification
  it('triggers a clarification question when explicit team count does not match list', () => {
    const input = 'I have 4 teams: Arsenal, Chelsea. Make tournament.';
    const parsed = parseTournamentPrompt(input);

    expect(parsed.teams).toEqual(['Arsenal', 'Chelsea']);
    expect(parsed.ambiguities.length).toBeGreaterThan(0);
    expect(parsed.followUpQuestion).toContain('4');
  });

  // Double elimination format
  it('parses double elimination descriptions', () => {
    const input = 'create a double elimination bracket for Red, Blue, Green, Yellow';
    const parsed = parseTournamentPrompt(input);

    expect(parsed.teams).toEqual(['Red', 'Blue', 'Green', 'Yellow']);
    expect(parsed.format).toBe('DOUBLE_ELIMINATION');
  });
});
