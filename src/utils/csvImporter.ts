/**
 * TournX Bulk CSV Importer & Validator
 * think.prompt.organise
 *
 * Provides enterprise-grade CSV parsing, template generation, duplicate detection,
 * column mapping, row-level validation, and preview for Teams and Players.
 */

import { Position, Team, Player } from '../types/tournament';

export interface CSVParseResult<T> {
  headers: string[];
  totalRows: number;
  validRows: T[];
  invalidRows: {
    rowNumber: number;
    raw: Record<string, string>;
    errors: string[];
  }[];
}

export interface ParsedTeamRow {
  name: string;
  short_name?: string;
  manager?: string;
  manager_phone?: string;
}

export interface ParsedPlayerRow {
  name: string;
  team_name: string;
  position: Position;
  jersey_number?: number;
  is_captain: boolean;
}

/**
 * Standard CSV Templates
 */
export const TEAM_CSV_TEMPLATE = `name,short_name,manager,manager_phone
Strikers FC,STK,Coach Alex,+91 9876543210
Red Devils,RED,Coach Marcus,+91 9876543211
Golden Eagles,EGL,Coach Sarah,+91 9876543212`;

export const PLAYER_CSV_TEMPLATE = `name,team_name,position,jersey_number,is_captain
John Doe,Strikers FC,FWD,10,true
Jane Smith,Strikers FC,MID,8,false
Carlos Silva,Red Devils,DEF,4,false
David Miller,Red Devils,GK,1,true`;

/**
 * Robust RFC 4180-compliant CSV parser.
 * Single-pass scanner correctly handles quoted fields containing commas, spaces, or escaped quotes.
 */
export function parseCSVString(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  if (!csvText || !csvText.trim()) {
    return { headers: [], rows: [] };
  }

  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRecord.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRecord.push(currentField.trim());
        currentField = '';
        if (currentRecord.some(field => field.length > 0)) {
          records.push(currentRecord);
        }
        currentRecord = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField.trim());
    if (currentRecord.some(field => field.length > 0)) {
      records.push(currentRecord);
    }
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = records[0];
  const headers = rawHeaders.map(h => h.trim().toLowerCase().replace(/[\s_-]+/g, '_'));

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < records.length; r++) {
    const values = records[r];
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}


/**
 * Validates Teams CSV against existing teams in the tournament.
 */
export function validateTeamsCSV(
  csvText: string,
  existingTeams: Team[] = []
): CSVParseResult<ParsedTeamRow> {
  const { headers, rows } = parseCSVString(csvText);
  const validRows: ParsedTeamRow[] = [];
  const invalidRows: CSVParseResult<ParsedTeamRow>['invalidRows'] = [];

  const existingTeamNames = new Set(existingTeams.map(t => t.name.trim().toLowerCase()));
  const seenInBatch = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // 1-indexed, skipping header row
    const errors: string[] = [];

    const name = row['name'] || row['team_name'] || row['team'] || '';
    const shortName = row['short_name'] || row['shortname'] || row['code'] || '';
    const manager = row['manager'] || row['coach'] || '';
    const managerPhone = row['manager_phone'] || row['phone'] || row['contact'] || '';

    if (!name.trim()) {
      errors.push('Team name is required.');
    } else {
      const lower = name.trim().toLowerCase();
      if (existingTeamNames.has(lower)) {
        errors.push(`Team "${name}" already exists in this tournament.`);
      } else if (seenInBatch.has(lower)) {
        errors.push(`Duplicate team "${name}" found within the CSV file.`);
      } else {
        seenInBatch.add(lower);
      }
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber,
        raw: row,
        errors,
      });
    } else {
      validRows.push({
        name: name.trim(),
        short_name: shortName.trim() || undefined,
        manager: manager.trim() || undefined,
        manager_phone: managerPhone.trim() || undefined,
      });
    }
  });

  return {
    headers,
    totalRows: rows.length,
    validRows,
    invalidRows,
  };
}

/**
 * Validates Players CSV against teams in the tournament.
 */
export function validatePlayersCSV(
  csvText: string,
  currentTeams: Team[],
  existingPlayers: Player[] = []
): CSVParseResult<ParsedPlayerRow> {
  const { headers, rows } = parseCSVString(csvText);
  const validRows: ParsedPlayerRow[] = [];
  const invalidRows: CSVParseResult<ParsedPlayerRow>['invalidRows'] = [];

  const teamNameToObj = new Map<string, Team>();
  currentTeams.forEach(t => {
    teamNameToObj.set(t.name.trim().toLowerCase(), t);
    if (t.short_name) {
      teamNameToObj.set(t.short_name.trim().toLowerCase(), t);
    }
  });

  const existingPlayerKeys = new Set(
    existingPlayers.map(p => `${p.name.trim().toLowerCase()}__${p.team_id}`)
  );
  const seenInBatch = new Set<string>();

  const VALID_POSITIONS: Record<string, Position> = {
    gk: 'GK',
    goalkeeper: 'GK',
    keeper: 'GK',
    def: 'DEF',
    defender: 'DEF',
    df: 'DEF',
    mid: 'MID',
    midfielder: 'MID',
    mf: 'MID',
    fwd: 'FWD',
    forward: 'FWD',
    striker: 'FWD',
    att: 'FWD',
  };

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const errors: string[] = [];

    const name = row['name'] || row['player_name'] || row['player'] || '';
    const teamNameRaw = row['team_name'] || row['team'] || row['club'] || '';
    const posRaw = (row['position'] || row['pos'] || 'MID').trim().toLowerCase();
    const jerseyRaw = row['jersey_number'] || row['jersey'] || row['number'] || '';
    const captainRaw = (row['is_captain'] || row['captain'] || 'false').trim().toLowerCase();

    // 1. Validate Player Name
    if (!name.trim()) {
      errors.push('Player name is required.');
    }

    // 2. Validate Team Matching
    let matchedTeam: Team | undefined;
    if (!teamNameRaw.trim()) {
      errors.push('Team name is required.');
    } else {
      matchedTeam = teamNameToObj.get(teamNameRaw.trim().toLowerCase());
      if (!matchedTeam) {
        errors.push(
          `Team "${teamNameRaw}" not found. Available teams: ${currentTeams.map(t => t.name).join(', ')}`
        );
      }
    }

    // 3. Validate Position
    const position = VALID_POSITIONS[posRaw];
    if (!position) {
      errors.push(`Invalid position "${posRaw}". Must be GK, DEF, MID, or FWD.`);
    }

    // 4. Validate Jersey Number (optional, but if provided must be integer)
    let jerseyNumber: number | undefined;
    if (jerseyRaw) {
      const parsed = parseInt(jerseyRaw, 10);
      if (isNaN(parsed) || parsed < 0 || parsed > 99) {
        errors.push(`Jersey number must be a valid integer between 0 and 99.`);
      } else {
        jerseyNumber = parsed;
      }
    }

    // 5. Captain boolean
    const isCaptain = captainRaw === 'true' || captainRaw === 'yes' || captainRaw === '1';

    // 6. Duplicate check
    if (name.trim() && matchedTeam) {
      const key = `${name.trim().toLowerCase()}__${matchedTeam.id}`;
      if (existingPlayerKeys.has(key)) {
        errors.push(`Player "${name}" is already registered in team "${matchedTeam.name}".`);
      } else if (seenInBatch.has(key)) {
        errors.push(`Duplicate player "${name}" in team "${matchedTeam.name}" within this CSV.`);
      } else {
        seenInBatch.add(key);
      }
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber,
        raw: row,
        errors,
      });
    } else {
      validRows.push({
        name: name.trim(),
        team_name: matchedTeam ? matchedTeam.name : teamNameRaw.trim(),
        position: position || 'MID',
        jersey_number: jerseyNumber,
        is_captain: isCaptain,
      });
    }
  });

  return {
    headers,
    totalRows: rows.length,
    validRows,
    invalidRows,
  };
}
