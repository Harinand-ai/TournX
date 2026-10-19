import { describe, it, expect } from 'vitest';
import { parseTournamentPrompt, parseSquadPrompt } from '../promptParsers';

describe('Custom Local Football Team Name Recognition', () => {
  const exampleTeams = ['Sasi', 'Biju', 'Mozhappala FC', 'Karikunnam 6s'];

  describe('1. Four Example Local Team Names Across Informal Input Formats', () => {
    it('parses "teams are Sasi, Biju, Mozhappala FC, Karikunnam 6s"', () => {
      const parsed = parseTournamentPrompt('teams are Sasi, Biju, Mozhappala FC, Karikunnam 6s');
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.teamCount).toBe(4);
    });

    it('parses "make a tournament with Sasi, Biju, Mozhappala FC and Karikunnam 6s"', () => {
      const parsed = parseTournamentPrompt('make a tournament with Sasi, Biju, Mozhappala FC and Karikunnam 6s');
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.teamCount).toBe(4);
      // Generic action should not become tournament title
      expect(parsed.name).toBe('Draft Tournament');
      expect(parsed.missingFields).toContain('Tournament name');
    });

    it('parses "Sasi vs Biju, Mozhappala FC vs Karikunnam 6s"', () => {
      const parsed = parseTournamentPrompt('Sasi vs Biju, Mozhappala FC vs Karikunnam 6s');
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.teamCount).toBe(4);
    });

    it('parses "Create a local football tournament. Teams: Sasi, Biju, Mozhappala FC, Karikunnam 6s"', () => {
      const parsed = parseTournamentPrompt('Create a local football tournament. Teams: Sasi, Biju, Mozhappala FC, Karikunnam 6s');
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.teamCount).toBe(4);
      expect(parsed.name).toBe('Draft Tournament');
    });
  });

  describe('2. Delimiter Handling (Commas, "and", Semicolons, Newlines, Fixture "vs")', () => {
    it('parses comma-delimited prefix-free list', () => {
      const parsed = parseTournamentPrompt('Sasi, Biju, Mozhappala FC, Karikunnam 6s');
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.teamCount).toBe(4);
    });

    it('parses "and"-delimited prefix-free list', () => {
      const parsed = parseTournamentPrompt('Sasi, Biju, Mozhappala FC and Karikunnam 6s');
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.teamCount).toBe(4);
    });

    it('parses semicolon-delimited list', () => {
      const parsed = parseTournamentPrompt('Sasi; Biju; Mozhappala FC; Karikunnam 6s');
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.teamCount).toBe(4);
    });

    it('parses unbulleted newline-separated list', () => {
      const prompt = `Sasi
Biju
Mozhappala FC
Karikunnam 6s`;
      const parsed = parseTournamentPrompt(prompt);
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.teamCount).toBe(4);
    });

    it('parses multiline input with a "Teams:" header', () => {
      const prompt = `Teams:
Sasi
Biju
Mozhappala FC
Karikunnam 6s`;
      const parsed = parseTournamentPrompt(prompt);
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.teamCount).toBe(4);
    });

    it('parses bulleted multiline input with dash bullets', () => {
      const prompt = `- Sasi
- Biju
- Mozhappala FC
- Karikunnam 6s`;
      const parsed = parseTournamentPrompt(prompt);
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.teamCount).toBe(4);
    });

    it('parses numbered multiline list', () => {
      const prompt = `1. Sasi
2. Biju
3. Mozhappala FC
4. Karikunnam 6s`;
      const parsed = parseTournamentPrompt(prompt);
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.teamCount).toBe(4);
    });
  });

  describe('3. Arbitrary Unfamiliar Team Names (Not in Any Alias List)', () => {
    it('parses arbitrary local names with no suffixes', () => {
      const parsed = parseTournamentPrompt('teams are Anoop, Kiran, Rahul and Shaji');
      expect(parsed.teams).toEqual(['Anoop', 'Kiran', 'Rahul', 'Shaji']);
      expect(parsed.teamCount).toBe(4);
    });

    it('parses arbitrary single-word and multi-word names without keywords', () => {
      const parsed = parseTournamentPrompt('Muvattupuzha Strikers, Aluva Boys, Perumbavoor Kings, Kaloor Warriors');
      expect(parsed.teams).toEqual(['Muvattupuzha Strikers', 'Aluva Boys', 'Perumbavoor Kings', 'Kaloor Warriors']);
    });

    it('parses names starting with numbers such as 7s and 6s without stripping leading digits', () => {
      const parsed = parseTournamentPrompt('teams: 6s, 7 Lions, 11 Stars, Black Arrows');
      expect(parsed.teams).toEqual(['6s', '7 Lions', '11 Stars', 'Black Arrows']);
    });

    it('parses names with various football club suffixes like FC, SC, United, CF', () => {
      const parsed = parseTournamentPrompt('Kozhikode FC, Malappuram SC, Wayanad United, Kannur CF');
      expect(parsed.teams).toEqual(['Kozhikode FC', 'Malappuram SC', 'Wayanad United', 'Kannur CF']);
    });

    it('normalizes lowercase team names properly while preserving casing and suffixes', () => {
      const parsed = parseTournamentPrompt('teams: mozhappala fc, karikunnam 6s, sasi, biju');
      expect(parsed.teams).toEqual(['Mozhappala FC', 'Karikunnam 6s', 'Sasi', 'Biju']);
    });
  });

  describe('4. Preserving Existing Professional Club Aliases', () => {
    it('still recognizes and normalizes Premier League and European club aliases', () => {
      const parsed = parseTournamentPrompt('make a tournament with Arsenal, Chelsea, Liverpool and Spurs');
      expect(parsed.teams).toEqual(['Arsenal', 'Chelsea', 'Liverpool', 'Tottenham Hotspur (Spurs)']);
    });

    it('resolves BVB and Dortmund correctly', () => {
      const parsed = parseTournamentPrompt('teams: BVB, Bayern Munich, Real Madrid, Barca');
      expect(parsed.teams).toEqual(['Borussia Dortmund', 'Bayern Munich', 'Real Madrid', 'FC Barcelona']);
    });

    it('preserves single-letter teams uppercase', () => {
      const parsed = parseTournamentPrompt('teams are a, b, c, d, make tournament');
      expect(parsed.teams).toEqual(['A', 'B', 'C', 'D']);
    });

    it('preserves "Team A", "Team B" naming without stripping "Team"', () => {
      const parsed = parseTournamentPrompt('teams: Team A, Team B, Team C, Team D');
      expect(parsed.teams).toEqual(['Team A', 'Team B', 'Team C', 'Team D']);
    });
  });

  describe('5. Duplicate Avoidance & No Invented Teams', () => {
    it('deduplicates teams that appear multiple times in fixture lists', () => {
      const parsed = parseTournamentPrompt('Sasi vs Biju, Sasi vs Mozhappala FC, Karikunnam 6s vs Sasi');
      expect(parsed.teams).toEqual(['Sasi', 'Biju', 'Mozhappala FC', 'Karikunnam 6s']);
      expect(parsed.teamCount).toBe(4);
    });

    it('deduplicates case-insensitive identical team names in a list', () => {
      const parsed = parseTournamentPrompt('teams: Sasi, Biju, sasi, Mozhappala FC, Karikunnam 6s');
      expect(parsed.teams).toEqual(['Sasi', 'Biju', 'Mozhappala FC', 'Karikunnam 6s']);
      expect(parsed.teamCount).toBe(4);
    });

    it('does not invent phantom teams when only 2 teams are provided', () => {
      const parsed = parseTournamentPrompt('Sasi vs Biju');
      expect(parsed.teams).toEqual(['Sasi', 'Biju']);
      expect(parsed.teamCount).toBe(2);
    });
  });

  describe('6. Dates, Venues, Rules and Instructions Do Not Bleed Into Team Names', () => {
    it('isolates dates, venues and schedule attached to prefix-free team lists', () => {
      const parsed = parseTournamentPrompt('Sasi, Biju, Mozhappala FC, Karikunnam 6s at college ground tomorrow 5 pm');
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.venue).toBe('College Ground');
      expect(parsed.startTime).toBe('5:00 PM');
      expect(parsed.startDate).toBeDefined();
    });

    it('does not treat tournament rules or point systems as team names', () => {
      const prompt = `
        Tournament for Sasi, Biju, Mozhappala FC and Karikunnam 6s.
        Each match lasts 20 minutes, with 10 minutes per half, and 5 minutes break.
        3 points for win, 1 point for draw.
        Top 2 teams advance to final.
      `;
      const parsed = parseTournamentPrompt(prompt);
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.pointsForWin).toBe(3);
      expect(parsed.pointsForDraw).toBe(1);
      expect(parsed.matchDurationMinutes).toBe(20);
      expect(parsed.format).toBe('LEAGUE_WITH_PLAYOFFS');
      expect(parsed.playoffQualifiers).toBe(2);
    });

    it('handles trailing "make tournament" commands cleanly', () => {
      const parsed = parseTournamentPrompt('Sasi, Biju, Mozhappala FC, Karikunnam 6s, make tournament');
      expect(parsed.teams).toEqual(exampleTeams);
    });
  });

  describe('7. Squad Input and Player Rosters With Custom Teams', () => {
    it('keeps squad/player parsing functioning seamlessly with custom local teams', () => {
      const prompt = `
        Create tournament for Sasi, Biju, Mozhappala FC and Karikunnam 6s.
        Sasi: Hari (GK, captain), Arjun (DEF), Dev (MID)
        Biju: Rahul (GK), Manoj (MID, captain), Shaji (FWD)
      `;
      const parsed = parseTournamentPrompt(prompt);
      expect(parsed.teams).toEqual(exampleTeams);
      expect(parsed.embeddedSquads).toBeDefined();
      expect(parsed.embeddedSquads?.squads['Sasi']).toBeDefined();
      expect(parsed.embeddedSquads?.squads['Sasi'].players).toHaveLength(3);
      expect(parsed.embeddedSquads?.squads['Sasi'].players.find(p => p.name === 'Hari')?.isCaptain).toBe(true);
      expect(parsed.embeddedSquads?.squads['Biju']).toBeDefined();
      expect(parsed.embeddedSquads?.squads['Biju'].players).toHaveLength(3);
    });

    it('does not confuse player roster lines for new teams', () => {
      const prompt = `
        Teams are Sasi and Biju.
        Sasi players are Hari, Arjun, Dev.
        Biju players are Rahul, Manoj, Shaji.
      `;
      const parsed = parseTournamentPrompt(prompt);
      expect(parsed.teams).toEqual(['Sasi', 'Biju']);
      expect(parsed.teams).not.toContain('Hari');
      expect(parsed.teams).not.toContain('Rahul');
    });
  });

  describe('8. Empty and Ambiguous Input', () => {
    it('returns empty teams and flags missing fields on empty input', () => {
      const parsed = parseTournamentPrompt('');
      expect(parsed.teams).toEqual([]);
      expect(parsed.missingFields).toContain('Team names (no team list detected)');
      expect(parsed.followUpQuestion).toContain('Please list at least two participating teams');
    });

    it('flags ambiguity when explicit team count is mentioned but no names are given', () => {
      const parsed = parseTournamentPrompt('Create a local football tournament with 4 teams');
      expect(parsed.teams).toEqual([]);
      expect(parsed.missingFields).toContain('Team names (4 teams expected)');
      expect(parsed.ambiguities[0]).toContain('4 teams were specified, but individual team names were not provided');
    });
  });
});
