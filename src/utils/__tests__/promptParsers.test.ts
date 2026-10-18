import { describe, it, expect } from 'vitest';
import {
  parseTournamentPrompt,
  parseSquadPrompt,
  parseWorkspaceCommand,
  normalizeDateToIso,
  normalizePlayerName,
} from '../promptParsers';
import { Match, Team } from '../../types/tournament';
import { generateSingleRoundRobin } from '../../engine/tournamentEngine';

describe('TournX Conversational Prompt Parsers', () => {
  describe('Tournament Setup Parser', () => {
    // 1. The complete Kerala benchmark prompt
    it('parses the complete Kerala five-a-side football benchmark prompt correctly', () => {
      const benchmarkPrompt =
        "I'm organising a five-a-side football tournament called Kerala Champions Cup on November 15 at Kannur Municipal Stadium. Six teams are participating: Kerala Blasters, Bengaluru FC, Chennaiyin FC, Mumbai City FC, FC Goa and Hyderabad FC. It should follow a single round-robin format, with three points for a win, one for a draw and none for a loss. Each team can have five starting players and two substitutes. Please enable goalscorer tracking and player of the match, and make the tournament public.";

      const parsed = parseTournamentPrompt(benchmarkPrompt);

      expect(parsed.name).toBe('Kerala Champions Cup');
      expect(parsed.sport).toBe('Football');
      expect(parsed.matchType).toBe('5-a-side');
      expect(parsed.startingPlayersPerTeam).toBe(5);
      expect(parsed.substitutesPerTeam).toBe(2);
      expect(parsed.squadSize).toBe(7);
      expect(parsed.teamCount).toBe(6);
      expect(parsed.teams).toEqual([
        'Kerala Blasters',
        'Bengaluru FC',
        'Chennaiyin FC',
        'Mumbai City FC',
        'FC Goa',
        'Hyderabad FC',
      ]);
      expect(parsed.format).toBe('SINGLE_ROUND_ROBIN');
      expect(parsed.pointsForWin).toBe(3);
      expect(parsed.pointsForDraw).toBe(1);
      expect(parsed.pointsForLoss).toBe(0);
      expect(parsed.venue).toBe('Kannur Municipal Stadium');
      expect(parsed.startDate).toBe('November 15');
      expect(parsed.startDateIso).toBe('2026-11-15');
      expect(parsed.visibility).toBe('PUBLIC');
      expect(parsed.features.goalscorerTracking).toBe(true);
      expect(parsed.features.playerOfTheMatch).toBe(true);
      expect(parsed.missingFields).toHaveLength(0);
      expect(parsed.ambiguities).toHaveLength(0);
      expect(parsed.confidence).toBe('HIGH');

      // Verify fixture generation from parsed draft
      const engineTeams = parsed.teams.map((t, idx) => ({ id: `team-${idx + 1}`, name: t }));
      const fixtures = generateSingleRoundRobin(engineTeams);
      // For 6 teams, single round robin has n*(n-1)/2 = 15 matches across 5 rounds
      expect(fixtures).toHaveLength(15);
    });

    // 2. The same information written in different sentence orders
    it('parses the same tournament information written in reversed sentence order', () => {
      const prompt =
        "Six teams are participating: Kerala Blasters, Bengaluru FC, Chennaiyin FC, Mumbai City FC, FC Goa and Hyderabad FC. Each team can have five starting players and two substitutes. It should follow a single round-robin format, with three points for a win, one for a draw and none for a loss. The venue is Kannur Municipal Stadium, starting on November 15. Enable player of the match and goalscorer tracking. Make the tournament public. The event is called Kerala Champions Cup - a five-a-side football tournament.";

      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.name).toBe('Kerala Champions Cup');
      expect(parsed.matchType).toBe('5-a-side');
      expect(parsed.startingPlayersPerTeam).toBe(5);
      expect(parsed.substitutesPerTeam).toBe(2);
      expect(parsed.teamCount).toBe(6);
      expect(parsed.teams).toContain('Kerala Blasters');
      expect(parsed.teams).toContain('FC Goa');
      expect(parsed.format).toBe('SINGLE_ROUND_ROBIN');
      expect(parsed.pointsForWin).toBe(3);
      expect(parsed.pointsForDraw).toBe(1);
      expect(parsed.pointsForLoss).toBe(0);
      expect(parsed.venue).toBe('Kannur Municipal Stadium');
      expect(parsed.startDate).toBe('November 15');
      expect(parsed.startDateIso).toBe('2026-11-15');
      expect(parsed.visibility).toBe('PUBLIC');
    });

    // 3. Paragraphs mixed with bullet points
    it('parses prompt with mixed paragraphs and bullet points', () => {
      const prompt = `
        Organising the Monsoon Trophy at Kozhikode Beach Turf on 2026-12-01.
        Format: single round-robin. 40 minutes per match.
        
        Participating clubs:
        - Malabar FC
        - Wayanad United
        - Calicut Strikers
        - Kannur Warriors
        
        Rules: 3 points for a win, 1 for a draw, 0 for loss.
        Each team has 5 starting players and 3 substitutes.
        Public tournament with goalscorer tracking.
      `;

      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.name).toBe('Monsoon Trophy');
      expect(parsed.venue).toBe('Kozhikode Beach Turf');
      expect(parsed.startDateIso).toBe('2026-12-01');
      expect(parsed.teams).toEqual([
        'Malabar FC',
        'Wayanad United',
        'Calicut Strikers',
        'Kannur Warriors',
      ]);
      expect(parsed.teamCount).toBe(4);
      expect(parsed.startingPlayersPerTeam).toBe(5);
      expect(parsed.substitutesPerTeam).toBe(3);
      expect(parsed.squadSize).toBe(8);
      expect(parsed.matchDurationMinutes).toBe(40);
      expect(parsed.features.goalscorerTracking).toBe(true);
    });

    // 4. Different expressions for five-a-side
    it('normalizes various expressions for five-a-side football', () => {
      const prompt1 = 'Create the Futsal Carnival with four teams: Alpha FC, Beta FC, Gamma FC, Delta FC. 5-a-side rules.';
      const p1 = parseTournamentPrompt(prompt1);
      expect(p1.matchType).toBe('5-a-side');
      expect(p1.startingPlayersPerTeam).toBe(5);

      const prompt2 = 'Create the Spring Cup with four teams: Team A, Team B, Team C, Team D. five players on each team.';
      const p2 = parseTournamentPrompt(prompt2);
      expect(p2.matchType).toBe('5-a-side');
      expect(p2.startingPlayersPerTeam).toBe(5);

      const prompt3 = 'Create the Arena Clash with four teams: Red FC, Blue FC, Green FC, White FC. 5v5 football.';
      const p3 = parseTournamentPrompt(prompt3);
      expect(p3.matchType).toBe('5-a-side');
      expect(p3.startingPlayersPerTeam).toBe(5);
    });

    // 5. Team names containing multiple words
    it('preserves multi-word team names accurately', () => {
      const prompt =
        'Create the Super League with teams: Royal Challengers FC, North East United, Southern Star Warriors and West Coast City FC.';

      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.teams).toEqual([
        'Royal Challengers FC',
        'North East United',
        'Southern Star Warriors',
        'West Coast City FC',
      ]);
    });

    // 6. Missing dates or venues (without inventing fake values)
    it('flags missing dates and venues cleanly in missingFields', () => {
      const prompt =
        'Create the Coastal Cup with teams: Alpha FC, Beta United, Gamma City, Delta Rovers. 40 minutes per match.';

      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.name).toBe('Coastal Cup');
      expect(parsed.venue).toBe('');
      expect(parsed.startDate).toBe('');
      expect(parsed.missingFields).toContain('Venue / match location');
      expect(parsed.missingFields).toContain('Start date');
      expect(parsed.followUpQuestion).toBeDefined();
    });

    // 7. Conflicting instructions
    it('flags conflicting team counts as ambiguities', () => {
      const prompt =
        'Create a league with six teams: Apex FC, Cobalt United, Solaris City.';

      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.ambiguities.some(a => a.includes('mentioned 6 teams'))).toBe(true);
      expect(parsed.confidence).toBe('MEDIUM');
    });

    // 8. Unsupported tournament formats
    it('detects unsupported tournament formats like Swiss System and flags for review', () => {
      const prompt =
        'Create the Master Cup with four teams: A FC, B FC, C FC, D FC. It should follow a Swiss system format.';

      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.unsupportedFeatures).toContain('Swiss System');
      expect(parsed.ambiguities.some(a => a.includes('Swiss System format is not currently supported'))).toBe(true);
      // Falls back safely to supported format
      expect(parsed.format).toBe('SINGLE_ROUND_ROBIN');
    });

    // 9. Mentions substitutes separately from starting players
    it('distinguishes squad substitutes from starting players on pitch', () => {
      const prompt =
        'Create the City League with four teams: Team 1, Team 2, Team 3, Team 4. Each team has five starting players and two substitutes.';

      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.startingPlayersPerTeam).toBe(5);
      expect(parsed.substitutesPerTeam).toBe(2);
      expect(parsed.squadSize).toBe(7);
    });

    // 10. Date normalization helper
    it('normalizes month and day text into ISO YYYY-MM-DD', () => {
      const d1 = normalizeDateToIso('November 15');
      expect(d1.isoDate).toBe('2026-11-15');

      const d2 = normalizeDateToIso('15th November 2026');
      expect(d2.isoDate).toBe('2026-11-15');

      const d3 = normalizeDateToIso('2026-11-15');
      expect(d3.isoDate).toBe('2026-11-15');
    });

    it('recognizes league followed by playoffs format with qualification rules', () => {
      const promptTop2 =
        'Create the Monsoon Cup with four teams: Red, Blue, Green, Yellow. Single round-robin followed by playoffs where the top two teams advance to the final.';
      const parsedTop2 = parseTournamentPrompt(promptTop2);
      expect(parsedTop2.format).toBe('LEAGUE_WITH_PLAYOFFS');
      expect(parsedTop2.playoffQualifiers).toBe(2);

      const promptTop4 =
        'Organise the Champions Shield with six teams: Team A, Team B, Team C, Team D, Team E, Team F. League format, top four teams advance to semifinals and final.';
      const parsedTop4 = parseTournamentPrompt(promptTop4);
      expect(parsedTop4.format).toBe('LEAGUE_WITH_PLAYOFFS');
      expect(parsedTop4.playoffQualifiers).toBe(4);
    });

    it('extracts embedded squads directly from a unified master prompt', () => {
      const masterPrompt =
        'Create the Super Cup with two teams: Apex FC and Cobalt United. Matches are 50 minutes at Kannur Stadium. For Apex FC, add goalkeeper Daniel, defender Arjun (captain) and forward Cristiano. The manager is Michael.';
      const parsed = parseTournamentPrompt(masterPrompt);

      expect(parsed.name).toContain('Super Cup');
      expect(parsed.teams).toContain('Apex FC');
      expect(parsed.teams).toContain('Cobalt United');
      expect(parsed.embeddedSquads).toBeDefined();
      expect(parsed.embeddedSquads?.totalPlayersParsed).toBeGreaterThanOrEqual(3);
      expect(parsed.embeddedSquads?.squads['Apex FC']?.managerName).toBe('Michael');
    });

    // Benchmark Prompt and Variations
    it('accurately parses benchmark prompt with misspellings, unformatted team names, venue and time', () => {
      const prompt = 'teamnames crystal apalce,fulham,dotmund and spurs at college ground at 5 pm';
      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.teams).toEqual([
        'Crystal Palace',
        'Fulham',
        'Borussia Dortmund',
        'Tottenham Hotspur (Spurs)',
      ]);
      expect(parsed.teamCount).toBe(4);
      expect(parsed.venue).toBe('College Ground');
      expect(parsed.startTime).toBe('5:00 PM');
      // Tournament name is missing: clearly editable temporary default
      expect(parsed.name).toBe('Draft Tournament');
      // Start date is omitted: kept missing, never invented
      expect(parsed.startDate).toBe('');
      expect(parsed.startDateIso).toBeNull();
      // Review warning list flags ONLY genuinely missing required fields
      expect(parsed.missingFields).toContain('Tournament name');
      expect(parsed.missingFields).toContain('Start date');
      expect(parsed.missingFields).not.toContain('Venue / match location');
      expect(parsed.missingFields).not.toContain('Team names (no team list detected)');
      expect(parsed.missingFields).toHaveLength(2);
    });

    it('parses variation: "Four teams: Crystal Palace, Fulham, Dortmund and Spurs."', () => {
      const prompt = 'Four teams: Crystal Palace, Fulham, Dortmund and Spurs.';
      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.teams).toEqual([
        'Crystal Palace',
        'Fulham',
        'Borussia Dortmund',
        'Tottenham Hotspur (Spurs)',
      ]);
      expect(parsed.teamCount).toBe(4);
    });

    it('parses variation: "Play at college ground at 5 pm."', () => {
      const prompt = 'Play at college ground at 5 pm.';
      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.venue).toBe('College Ground');
      expect(parsed.startTime).toBe('5:00 PM');
      // Time must not be treated as a date
      expect(parsed.startDate).toBe('');
      expect(parsed.startDateIso).toBeNull();
    });

    it('parses variation: "Start tomorrow at 5 in the evening."', () => {
      const prompt = 'Four teams: Crystal Palace, Fulham, Dortmund and Spurs. Start tomorrow at 5 in the evening.';
      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.startDate).toBe('Tomorrow');
      expect(parsed.startDateIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(parsed.startTime).toBe('5:00 PM');
    });

    it('parses variation: "A knockout tournament with these teams."', () => {
      const prompt = 'A knockout tournament with these teams: Crystal Palace, Fulham, Dortmund and Spurs.';
      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.format).toBe('SINGLE_ELIMINATION');
      expect(parsed.teams).toHaveLength(4);
    });

    it('parses variation: "League format, then the top two play the final."', () => {
      const prompt = 'League format, then the top two play the final. Teams: Crystal Palace, Fulham, Dortmund and Spurs.';
      const parsed = parseTournamentPrompt(prompt);

      expect(parsed.format).toBe('LEAGUE_WITH_PLAYOFFS');
      expect(parsed.playoffQualifiers).toBe(2);
      expect(parsed.teams).toHaveLength(4);
    });
  });

  describe('Squad & Player Parser', () => {
    it('parses benchmark team squad prompt with positions, captain and manager', () => {
      const prompt =
        'For Apex FC, add goalkeeper Daniel, defender Arjun, midfielder Rahul and forward Cristiano. Make Arjun the captain. The team manager is Michael.';

      const parsed = parseSquadPrompt(prompt, ['Apex FC', 'Cobalt United']);

      expect(parsed.totalPlayersParsed).toBe(4);
      const apexSquad = parsed.squads['Apex FC'];
      expect(apexSquad).toBeDefined();
      expect(apexSquad.managerName).toBe('Michael');

      const players = apexSquad.players;
      expect(players).toHaveLength(4);

      const daniel = players.find(p => p.name === 'Daniel');
      expect(daniel?.position).toBe('GK');
      expect(daniel?.isCaptain).toBe(false);

      const arjun = players.find(p => p.name === 'Arjun');
      expect(arjun?.position).toBe('DEF');
      expect(arjun?.isCaptain).toBe(true);

      const cristiano = players.find(p => p.name === 'Cristiano');
      expect(cristiano?.position).toBe('FWD');
    });

    it('parses multi-team benchmark prompt with multiple squads and managers', () => {
      const prompt =
        'For Kerala Blasters, add goalkeeper Daniel, defender Arjun, midfielder Rahul and forward Cristiano. Make Arjun the captain. The team manager is Michael.\n\n' +
        'For Bengaluru FC, add goalkeeper Leo, defender Marcus, midfielder David and forward Samuel. Make Marcus the captain. The team manager is Sarah.';

      const parsed = parseSquadPrompt(prompt, ['Kerala Blasters', 'Bengaluru FC']);
      expect(parsed.totalPlayersParsed).toBe(8);

      const kb = parsed.squads['Kerala Blasters'];
      expect(kb.managerName).toBe('Michael');
      expect(kb.players).toHaveLength(4);
      expect(kb.players.find(p => p.name === 'Arjun')?.isCaptain).toBe(true);

      const bfc = parsed.squads['Bengaluru FC'];
      expect(bfc.managerName).toBe('Sarah');
      expect(bfc.players).toHaveLength(4);
      expect(bfc.players.find(p => p.name === 'Marcus')?.isCaptain).toBe(true);
    });

    it('parses inline squad prompt with parenthesized positions and captains', () => {
      const prompt = 'Kerala Blasters: Daniel (GK), Arjun (DEF, Captain), Rahul (MID), Cristiano (FWD). Manager: Michael';
      const parsed = parseSquadPrompt(prompt, ['Kerala Blasters']);

      const kb = parsed.squads['Kerala Blasters'];
      expect(kb).toBeDefined();
      expect(kb.managerName).toBe('Michael');
      expect(kb.players).toHaveLength(4);

      const arjun = kb.players.find(p => p.name === 'Arjun');
      expect(arjun?.position).toBe('DEF');
      expect(arjun?.isCaptain).toBe(true);
    });

    it('parses squad prompt with Team Alpha and Team Beta sentences', () => {
      const prompt = 'Organise a five-a-side tournament called Night Football Cup with two teams. Team Alpha is managed by Rahul Menon. Its players are Arjun Nair (GK, captain), Vishnu Das (DEF), Amal Raj (MID), Nikhil Dev (FWD), and Kiran S (substitute). Team Beta is managed by Sameer Khan. Its players are Adil Rahman (GK), Joel Thomas (DEF), Kevin Paul (MID, captain), Ryan Mathew (FWD), and Alan Joseph (substitute). Use a knockout format. Please extract the team names, managers, player names, positions and captains, and let me correct them manually before saving.';
      const parsedSquad = parseSquadPrompt(prompt);
      expect(parsedSquad.totalPlayersParsed).toBe(10);
      expect(parsedSquad.squads['Team Alpha']).toBeDefined();
      expect(parsedSquad.squads['Team Alpha'].managerName).toBe('Rahul Menon');
      expect(parsedSquad.squads['Team Alpha'].players).toHaveLength(5);
      expect(parsedSquad.squads['Team Alpha'].players.find(p => p.name === 'Arjun Nair')?.isCaptain).toBe(true);
      expect(parsedSquad.squads['Team Alpha'].players.find(p => p.name === 'Arjun Nair')?.position).toBe('GK');
      expect(parsedSquad.squads['Team Alpha'].players.find(p => p.name === 'Kiran S')?.position).toBe('TBD');

      expect(parsedSquad.squads['Team Beta']).toBeDefined();
      expect(parsedSquad.squads['Team Beta'].managerName).toBe('Sameer Khan');
      expect(parsedSquad.squads['Team Beta'].players).toHaveLength(5);
      expect(parsedSquad.squads['Team Beta'].players.find(p => p.name === 'Kevin Paul')?.isCaptain).toBe(true);
      expect(parsedSquad.squads['Team Beta'].players.find(p => p.name === 'Kevin Paul')?.position).toBe('MID');
      expect(parsedSquad.squads['Team Beta'].players.find(p => p.name === 'Alan Joseph')?.position).toBe('TBD');

      const parsedTournament = parseTournamentPrompt(prompt);
      expect(parsedTournament.name).toBe('Night Football Cup');
      expect(parsedTournament.teams).toEqual(['Team Alpha', 'Team Beta']);
      expect(parsedTournament.matchType).toBe('5-a-side');
      expect(parsedTournament.format).toBe('SINGLE_ELIMINATION');
      expect(parsedTournament.embeddedSquads).toBeDefined();
      expect(parsedTournament.embeddedSquads?.totalPlayersParsed).toBe(10);
    });

    it('parses the exact six-team Kannur Champions Cup benchmark squad prompt without corrupting rosters', () => {
      const knownSixTeams = [
        'Kerala Blasters',
        'Bengaluru FC',
        'Chennaiyin FC',
        'Mumbai City FC',
        'FC Goa',
        'Hyderabad FC',
      ];

      const prompt = `Add the following managers and players to the six existing teams in Kannur Champions Cup 2026. Do not create duplicate teams or modify the existing fixtures.

**1. Kerala Blasters**
Manager: Arjun Nair
- Adithyan Raj — Goalkeeper, Captain
- Nikhil Das — Defender
- Amal Dev — Defender
- Rohan Krishna — Midfielder
- Abin Thomas — Forward
- Vishnu Prasad — Substitute
- Akhil Mohan — Substitute

**2. Bengaluru FC**
Manager: Rahul Menon
- Kiran Suresh — Goalkeeper, Captain
- Dev Anand — Defender
- Sreehari P — Defender
- Alan Joseph — Midfielder
- Joel Mathew — Forward
- Nandu Kumar — Substitute
- Arun Babu — Substitute

**3. Chennaiyin FC**
Manager: Mohammed Shafi
- Farhan Ali — Goalkeeper, Captain
- Suraj Kumar — Defender
- Pranav Raj — Defender
- Kevin George — Midfielder
- Ashwin S — Forward
- Dhanush R — Substitute
- Sidharth V — Substitute

**4. Mumbai City FC**
Manager: Akash Varma
- Rohit Sharma — Goalkeeper, Captain
- Yash Patel — Defender
- Manav Shah — Defender
- Ishan Mehta — Midfielder
- Ritesh Singh — Forward
- Harsh V — Substitute
- Jay Malhotra — Substitute

**5. FC Goa**
Manager: Nithin Fernandes
- Lester D'Souza — Goalkeeper, Captain
- Ryan D'Mello — Defender
- Sahil Naik — Defender
- Aaron Pereira — Midfielder
- Neil Rodrigues — Forward
- Clive Pinto — Substitute
- Shawn Furtado — Substitute

**6. Hyderabad FC**
Manager: Sai Kiran
- Varun Reddy — Goalkeeper, Captain
- Teja Kumar — Defender
- Charan Rao — Defender
- Adarsh Menon — Midfielder
- Vivek Raju — Forward
- Naveen Goud — Substitute
- Prithvi R — Substitute

Match each player and manager to the correct existing team. Show a preview grouped by team, with editable names, positions, and captain assignments. Flag any validation issues rather than silently dropping players. Preserve existing data and fixtures, and save the changes only after I confirm.`;

      const parsed = parseSquadPrompt(prompt, knownSixTeams);

      // Exactly 6 existing teams; no duplicates
      const squadKeys = Object.keys(parsed.squads);
      expect(squadKeys).toHaveLength(6);
      expect(squadKeys.sort()).toEqual([...knownSixTeams].sort());

      // Exactly 42 player records across the six teams (7 per team)
      expect(parsed.totalPlayersParsed).toBe(42);

      // Verify each team has exactly 7 players (5 starters, 2 substitutes)
      knownSixTeams.forEach(team => {
        const sq = parsed.squads[team];
        expect(sq).toBeDefined();
        expect(sq.players).toHaveLength(7);

        // 5 starters (GK, DEF, MID, FWD) + 2 substitutes (TBD)
        const starters = sq.players.filter(p => p.position !== 'TBD');
        const subs = sq.players.filter(p => p.position === 'TBD');
        expect(starters).toHaveLength(5);
        expect(subs).toHaveLength(2);

        // No trailing separators in player names
        sq.players.forEach(p => {
          expect(p.name).not.toMatch(/[—–\-:;,]$/);
          expect(p.name).not.toMatch(/^[—–\-:;,]/);
          // Never contain instruction text or team headings
          expect(p.name.toLowerCase()).not.toContain('following');
          expect(p.name.toLowerCase()).not.toContain('duplicate');
          expect(p.name.toLowerCase()).not.toContain('fixture');
          expect(p.name.toLowerCase()).not.toContain('kerala blasters');
          expect(p.name.toLowerCase()).not.toContain('bengaluru fc');
        });
      });

      // Exactly 6 correctly assigned managers
      expect(parsed.squads['Kerala Blasters'].managerName).toBe('Arjun Nair');
      expect(parsed.squads['Bengaluru FC'].managerName).toBe('Rahul Menon');
      expect(parsed.squads['Chennaiyin FC'].managerName).toBe('Mohammed Shafi');
      expect(parsed.squads['Mumbai City FC'].managerName).toBe('Akash Varma');
      expect(parsed.squads['FC Goa'].managerName).toBe('Nithin Fernandes');
      expect(parsed.squads['Hyderabad FC'].managerName).toBe('Sai Kiran');

      // Exactly 6 captains, one per team, as specified
      knownSixTeams.forEach(team => {
        const captains = parsed.squads[team].players.filter(p => p.isCaptain);
        expect(captains).toHaveLength(1);
      });
      expect(parsed.squads['Kerala Blasters'].players.find(p => p.name === 'Adithyan Raj')?.isCaptain).toBe(true);
      expect(parsed.squads['Bengaluru FC'].players.find(p => p.name === 'Kiran Suresh')?.isCaptain).toBe(true);
      expect(parsed.squads['Chennaiyin FC'].players.find(p => p.name === 'Farhan Ali')?.isCaptain).toBe(true);
      expect(parsed.squads['Mumbai City FC'].players.find(p => p.name === 'Rohit Sharma')?.isCaptain).toBe(true);
      expect(parsed.squads['FC Goa'].players.find(p => p.name === "Lester D'Souza")?.isCaptain).toBe(true);
      expect(parsed.squads['Hyderabad FC'].players.find(p => p.name === 'Varun Reddy')?.isCaptain).toBe(true);

      // Verify specific player details and names with special characters
      const fcGoaPlayers = parsed.squads['FC Goa'].players;
      expect(fcGoaPlayers.some(p => p.name === "Lester D'Souza" && p.position === 'GK')).toBe(true);
      expect(fcGoaPlayers.some(p => p.name === "Ryan D'Mello" && p.position === 'DEF')).toBe(true);

      const bfcPlayers = parsed.squads['Bengaluru FC'].players;
      expect(bfcPlayers.some(p => p.name === 'Sreehari P' && p.position === 'DEF')).toBe(true);

      const mcfcPlayers = parsed.squads['Mumbai City FC'].players;
      expect(mcfcPlayers.some(p => p.name === 'Harsh V' && p.position === 'TBD')).toBe(true);

      // Idempotency check: parsing the same prompt twice produces identical player count
      const secondParse = parseSquadPrompt(prompt, knownSixTeams);
      expect(secondParse.totalPlayersParsed).toBe(42);
    });

    it('handles different team orders and multiline lists', () => {
      const prompt = `### Hyderabad FC
Manager: Sai Kiran
1. Varun Reddy (GK, Captain)
2. Teja Kumar (DEF)
3. Adarsh Menon (MID)
4. Vivek Raju (FWD)
5. Naveen Goud (Substitute)

### Kerala Blasters
Manager: Arjun Nair
- Adithyan Raj: Goalkeeper, Captain
- Nikhil Das: Defender
- Rohan Krishna: Midfielder
- Abin Thomas: Forward
- Vishnu Prasad: Substitute`;

      const parsed = parseSquadPrompt(prompt, ['Kerala Blasters', 'Hyderabad FC']);
      expect(parsed.totalPlayersParsed).toBe(10);
      expect(parsed.squads['Hyderabad FC'].players).toHaveLength(5);
      expect(parsed.squads['Kerala Blasters'].players).toHaveLength(5);
      expect(parsed.squads['Hyderabad FC'].managerName).toBe('Sai Kiran');
      expect(parsed.squads['Kerala Blasters'].managerName).toBe('Arjun Nair');
      expect(parsed.squads['Hyderabad FC'].players.find(p => p.name === 'Varun Reddy')?.isCaptain).toBe(true);
      expect(parsed.squads['Kerala Blasters'].players.find(p => p.name === 'Adithyan Raj')?.isCaptain).toBe(true);
    });

    it('safely normalizes names without damaging legitimate apostrophes or initials', () => {
      expect(normalizePlayerName('  Adithyan Raj —  ')).toBe('Adithyan Raj');
      expect(normalizePlayerName('- Nikhil Das —')).toBe('Nikhil Das');
      expect(normalizePlayerName("Lester D'Souza —")).toBe("Lester D'Souza");
      expect(normalizePlayerName('Sreehari P -')).toBe('Sreehari P');
      expect(normalizePlayerName('1. Harsh V —')).toBe('Harsh V');
      expect(normalizePlayerName('Jean-Pierre')).toBe('Jean-Pierre');
    });

    it('rejects instructions after the last team', () => {
      const prompt = `Kerala Blasters:
Manager: Arjun Nair
- Adithyan Raj — GK, Captain
- Nikhil Das — DEF

Please extract the team names, managers, player names, positions and captains, and let me correct them manually before saving. Use a knockout format.`;

      const parsed = parseSquadPrompt(prompt, ['Kerala Blasters']);
      expect(parsed.squads['Kerala Blasters'].players).toHaveLength(2);
      expect(parsed.squads['Kerala Blasters'].players.map(p => p.name)).toEqual(['Adithyan Raj', 'Nikhil Das']);
    });
  });

  describe('Organizer Workspace Operational Parser', () => {
    const dummyTeams: Team[] = [
      { id: 't1', name: 'Kerala Blasters', short_name: 'KBFC' },
      { id: 't2', name: 'Bengaluru FC', short_name: 'BFC' },
    ];

    const dummyMatches: Match[] = [
      {
        id: 'm1',
        match_number: 1,
        round_number: 1,
        home_team_id: 't1',
        away_team_id: 't2',
        status: 'UPCOMING',
        home_score: null,
        away_score: null,
      },
    ];

    it('parses match rescheduling command into proposed action', () => {
      const cmd = 'Move Match 1 to Saturday at 4 PM.';
      const action = parseWorkspaceCommand(cmd, {
        teams: dummyTeams,
        matches: dummyMatches,
        matchDuration: 50,
        venue: 'Kannur Municipal Stadium',
      });

      expect(action.actionType).toBe('RESCHEDULE_MATCH');
      expect(action.payload.matchId).toBe('m1');
      expect(action.payload.time).toBe('4 PM');
      expect(action.payload.date).toContain('Saturday');
      expect(action.confidence).toBe('HIGH');
    });

    it('parses conversational score recording for named teams', () => {
      const cmd = 'Set score to 2-1 for Kerala Blasters vs Bengaluru FC';
      const action = parseWorkspaceCommand(cmd, {
        teams: dummyTeams,
        matches: dummyMatches,
      });

      expect(action.actionType).toBe('RECORD_SCORE');
      expect(action.payload.homeScore).toBe(2);
      expect(action.payload.awayScore).toBe(1);
      expect(action.payload.status).toBe('COMPLETED');
    });

    it('parses venue update command', () => {
      const cmd = 'Change the venue to Kannur Municipal Stadium Pitch 2.';
      const action = parseWorkspaceCommand(cmd, {
        teams: dummyTeams,
        matches: dummyMatches,
      });

      expect(action.actionType).toBe('CHANGE_VENUE');
      expect(action.payload.venue).toContain('Kannur Municipal Stadium Pitch 2');
    });

    it('parses match duration update command', () => {
      const cmd = 'Update the match duration to 40 minutes.';
      const action = parseWorkspaceCommand(cmd, {
        teams: dummyTeams,
        matches: dummyMatches,
        matchDuration: 50,
      });

      expect(action.actionType).toBe('UPDATE_DURATION');
      expect(action.payload.durationMinutes).toBe(40);
    });

    it('parses add team command', () => {
      const cmd = 'Add Gokulam Kerala FC to the tournament.';
      const action = parseWorkspaceCommand(cmd, {
        teams: dummyTeams,
        matches: dummyMatches,
      });

      expect(action.actionType).toBe('ADD_TEAM');
      expect(action.payload.teamName).toBe('Gokulam Kerala FC');
    });
  });
});
