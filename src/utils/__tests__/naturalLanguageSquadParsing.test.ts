import { describe, it, expect } from 'vitest';
import { parseTournamentPrompt, parseSquadPrompt } from '../promptParsers';

describe('Natural Language Team & Player Parsing Regressions', () => {
  it('parses exact user failure prompt with Team 1: FC Goa and bulleted players', () => {
    const prompt = `Team 1: FC Goa  
Players:
- Player A — Goalkeeper
- Player B — Defender
- Player C — Midfielder
- Player D — Forward

Team 2: Chennaiyin FC  
Players:
- Player E — Goalkeeper
- Player F — Defender
- Player G — Midfielder
- Player H — Forward`;

    const tp = parseTournamentPrompt(prompt);
    expect(tp.teams).toEqual(['FC Goa', 'Chennaiyin FC']);
    expect(tp.embeddedSquads).toBeDefined();
    expect(tp.embeddedSquads!.totalPlayersParsed).toBe(8);

    const goa = tp.embeddedSquads!.squads['FC Goa'];
    expect(goa).toBeDefined();
    expect(goa.players.map(p => p.name)).toEqual(['Player A', 'Player B', 'Player C', 'Player D']);
    expect(goa.players.map(p => p.position)).toEqual(['GK', 'DEF', 'MID', 'FWD']);

    const che = tp.embeddedSquads!.squads['Chennaiyin FC'];
    expect(che).toBeDefined();
    expect(che.players.map(p => p.name)).toEqual(['Player E', 'Player F', 'Player G', 'Player H']);
    expect(che.players.map(p => p.position)).toEqual(['GK', 'DEF', 'MID', 'FWD']);
  });

  it('parses 4-team tournament prompt with players and preserves per-team association', () => {
    const prompt = `Create a 4-team cup called Super Cup 2026.
Team 1: FC Goa
Players:
- Player A (GK)
- Player B (DEF)

Team 2: Chennaiyin FC
Players:
- Player C: Midfielder
- Player D: Forward

Team 3: Bengaluru FC
Players:
- Player E - Goalkeeper
- Player F - Defender

Team 4: Mumbai City FC
Players:
- Player G, Midfielder
- Player H, Forward`;

    const tp = parseTournamentPrompt(prompt);
    expect(tp.teams).toEqual(['FC Goa', 'Chennaiyin FC', 'Bengaluru FC', 'Mumbai City FC']);
    expect(tp.embeddedSquads).toBeDefined();
    expect(tp.embeddedSquads!.totalPlayersParsed).toBe(8);

    expect(tp.embeddedSquads!.squads['FC Goa'].players[0].name).toBe('Player A');
    expect(tp.embeddedSquads!.squads['FC Goa'].players[0].position).toBe('GK');

    expect(tp.embeddedSquads!.squads['Chennaiyin FC'].players[1].name).toBe('Player D');
    expect(tp.embeddedSquads!.squads['Chennaiyin FC'].players[1].position).toBe('FWD');

    expect(tp.embeddedSquads!.squads['Bengaluru FC'].players[0].name).toBe('Player E');
    expect(tp.embeddedSquads!.squads['Bengaluru FC'].players[0].position).toBe('GK');

    expect(tp.embeddedSquads!.squads['Mumbai City FC'].players[0].name).toBe('Player G');
    expect(tp.embeddedSquads!.squads['Mumbai City FC'].players[0].position).toBe('MID');
    expect(tp.embeddedSquads!.squads['Mumbai City FC'].players[1].name).toBe('Player H');
    expect(tp.embeddedSquads!.squads['Mumbai City FC'].players[1].position).toBe('FWD');
  });

  it('handles punctuation variations: em-dashes, en-dashes, hyphens, colons, commas, parentheses', () => {
    const prompt = `Team A: Arsenal
Manager: Mikel Arteta
Players:
* David Raya — Goalkeeper, Captain
* William Saliba – Defender
* Declan Rice: Midfielder
* Bukayo Saka, Forward
* Gabriel Martinelli (Forward)
* Leandro Trossard (substitute)

Team B: Chelsea
Manager: Enzo Maresca
Players:
1. Robert Sanchez: GK
2. Levi Colwill - DEF
3. Enzo Fernandez, MID, Captain
4. Cole Palmer — FWD`;

    const tp = parseTournamentPrompt(prompt);
    expect(tp.teams).toContain('Arsenal');
    expect(tp.teams).toContain('Chelsea');

    const arsenal = tp.embeddedSquads!.squads['Arsenal'];
    expect(arsenal.managerName).toBe('Mikel Arteta');
    expect(arsenal.players.length).toBe(6);

    const raya = arsenal.players.find(p => p.name === 'David Raya');
    expect(raya?.position).toBe('GK');
    expect(raya?.isCaptain).toBe(true);

    const saliba = arsenal.players.find(p => p.name === 'William Saliba');
    expect(saliba?.position).toBe('DEF');

    const rice = arsenal.players.find(p => p.name === 'Declan Rice');
    expect(rice?.position).toBe('MID');

    const saka = arsenal.players.find(p => p.name === 'Bukayo Saka');
    expect(saka?.position).toBe('FWD');

    const trossard = arsenal.players.find(p => p.name === 'Leandro Trossard');
    expect(trossard?.isSubstitute).toBe(true);

    const chelsea = tp.embeddedSquads!.squads['Chelsea'];
    expect(chelsea.managerName).toBe('Enzo Maresca');
    expect(chelsea.players.length).toBe(4);
    const palmer = chelsea.players.find(p => p.name === 'Cole Palmer');
    expect(palmer?.position).toBe('FWD');
  });

  it('does not generate squads when input contains only teams without player lists', () => {
    const prompt = `Tournament with 4 teams: Arsenal, Chelsea, Liverpool, and Tottenham Hotspur at Wembley.`;
    const tp = parseTournamentPrompt(prompt);
    expect(tp.teams.length).toBe(4);
    expect(tp.embeddedSquads).toBeUndefined();
  });

  it('parses comma-separated four team prompt: Create a tournament with Kerala Blasters FC, FC Goa, Chennaiyin FC, Bengaluru FC', () => {
    const prompt = 'Create a tournament with Kerala Blasters FC, FC Goa, Chennaiyin FC, Bengaluru FC';
    const tp = parseTournamentPrompt(prompt);
    expect(tp.teams).toEqual(['Kerala Blasters FC', 'FC Goa', 'Chennaiyin FC', 'Bengaluru FC']);
  });
});
