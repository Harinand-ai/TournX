import { describe, it, expect } from 'vitest';
import {
  parseCSVString,
  validateTeamsCSV,
  validatePlayersCSV,
  TEAM_CSV_TEMPLATE,
  PLAYER_CSV_TEMPLATE,
} from '../csvImporter';
import { Team } from '../../types/tournament';

describe('CSV Importer & Validator', () => {
  it('parses standard comma-separated values correctly', () => {
    const csv = `name,short_name,manager
Team Alpha,TAL,Coach A
Team Beta,TBE,Coach B`;

    const result = parseCSVString(csv);
    expect(result.headers).toEqual(['name', 'short_name', 'manager']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].name).toBe('Team Alpha');
    expect(result.rows[1].short_name).toBe('TBE');
  });

  it('handles quoted fields and escaped commas', () => {
    const csv = `name,manager,notes
"Thunderbolts, FC","Coach ""The Rock"" John","Best, team, ever"`;

    const result = parseCSVString(csv);
    expect(result.rows[0].name).toBe('Thunderbolts, FC');
    expect(result.rows[0].manager).toBe('Coach "The Rock" John');
    expect(result.rows[0].notes).toBe('Best, team, ever');
  });

  it('validates teams CSV and rejects duplicate or empty names', () => {
    const existingTeams: Team[] = [
      { id: 't1', name: 'Existing FC', short_name: 'EXI' },
    ];

    const csv = `name,short_name,manager
New Squad,NSQ,Manager X
Existing FC,EXI,Manager Y
,EMPTY,Manager Z
New Squad,NSQ2,Duplicate In File`;

    const report = validateTeamsCSV(csv, existingTeams);
    expect(report.totalRows).toBe(4);
    expect(report.validRows).toHaveLength(1);
    expect(report.validRows[0].name).toBe('New Squad');

    expect(report.invalidRows).toHaveLength(3);
    // Row 3 (Existing FC)
    expect(report.invalidRows.some(r => r.errors.some(e => e.includes('already exists')))).toBe(true);
    // Row 4 (empty name)
    expect(report.invalidRows.some(r => r.errors.some(e => e.includes('name is required')))).toBe(true);
    // Row 5 (duplicate in file)
    expect(report.invalidRows.some(r => r.errors.some(e => e.includes('Duplicate team')))).toBe(true);
  });

  it('validates players CSV, matches teams, and checks positions', () => {
    const currentTeams: Team[] = [
      { id: 't1', name: 'Strikers FC', short_name: 'STK' },
      { id: 't2', name: 'Red Devils', short_name: 'RED' },
    ];

    const csv = `name,team_name,position,jersey_number,is_captain
Cristiano,Strikers FC,FWD,7,true
Lionel,Red Devils,MID,10,false
Invalid Guy,Unknown FC,MID,5,false
Wrong Pos,Strikers FC,QUARTERBACK,12,false
Invalid Jersey,Strikers FC,DEF,999,false`;

    const report = validatePlayersCSV(csv, currentTeams);
    expect(report.validRows).toHaveLength(2);
    expect(report.validRows[0]).toEqual({
      name: 'Cristiano',
      team_name: 'Strikers FC',
      position: 'FWD',
      jersey_number: 7,
      is_captain: true,
    });

    expect(report.invalidRows).toHaveLength(3);
    expect(report.invalidRows.some(r => r.errors.some(e => e.includes('Unknown FC')))).toBe(true);
    expect(report.invalidRows.some(r => r.errors.some(e => e.includes('Invalid position')))).toBe(true);
    expect(report.invalidRows.some(r => r.errors.some(e => e.includes('Jersey number')))).toBe(true);
  });

  it('validates standard templates with no errors', () => {
    const teamsReport = validateTeamsCSV(TEAM_CSV_TEMPLATE);
    expect(teamsReport.invalidRows).toHaveLength(0);
    expect(teamsReport.validRows.length).toBeGreaterThanOrEqual(3);

    const dummyTeams: Team[] = [
      { id: '1', name: 'Strikers FC' },
      { id: '2', name: 'Red Devils' },
    ];
    const playersReport = validatePlayersCSV(PLAYER_CSV_TEMPLATE, dummyTeams);
    expect(playersReport.invalidRows).toHaveLength(0);
    expect(playersReport.validRows.length).toBe(4);
  });

  it('handles empty input and whitespace-only files gracefully', () => {
    const emptyTeams = validateTeamsCSV('');
    expect(emptyTeams.totalRows).toBe(0);
    expect(emptyTeams.validRows).toEqual([]);
    expect(emptyTeams.invalidRows).toEqual([]);

    const whitespacePlayers = validatePlayersCSV('   \n  \r\n  ', []);
    expect(whitespacePlayers.totalRows).toBe(0);
    expect(whitespacePlayers.validRows).toEqual([]);
    expect(whitespacePlayers.invalidRows).toEqual([]);
  });

  it('correctly handles non-English international characters and accents', () => {
    const csv = `name,short_name,manager
"São Paulo FC",SPO,"Rogério Ceni"
"Bayern München",BAY,"Thomas Müller"
"Atlético Madrid",ATM,"Diego Simeone"`;

    const report = validateTeamsCSV(csv);
    expect(report.totalRows).toBe(3);
    expect(report.validRows).toHaveLength(3);
    expect(report.validRows[0].name).toBe('São Paulo FC');
    expect(report.validRows[1].manager).toBe('Thomas Müller');
    expect(report.validRows[2].name).toBe('Atlético Madrid');
  });

  it('rejects rows with incorrect headers or missing required columns', () => {
    const badHeaderCsv = `random_header,another_col
Val 1,Val 2
Val 3,Val 4`;

    const report = validateTeamsCSV(badHeaderCsv);
    expect(report.totalRows).toBe(2);
    expect(report.validRows).toHaveLength(0);
    expect(report.invalidRows).toHaveLength(2);
    expect(report.invalidRows[0].errors).toContain('Team name is required.');
  });
});

