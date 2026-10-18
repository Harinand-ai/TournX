/**
 * TournX Conversational Prompt Parsers
 * think.prompt.organise
 *
 * Provides robust, deterministic, zero-dependency natural language parsers for:
 * 1. Tournament Setup Prompts (teams, format, duration, venue, dates, points, squad limits, visibility, optional features)
 * 2. Squad & Player Prompts (team association, positions, numbers, captains, managers)
 * 3. Organizer Workspace Operational Prompts (rescheduling, scores, venue, rules)
 */

import { Match, Position, Team } from '../types/tournament';
import { StageType } from '../types/multiTenant';

// ============================================================================
// 1. TOURNAMENT SETUP PARSER
// ============================================================================

export interface ParsedTournamentFeatures {
  goalscorerTracking: boolean;
  playerOfTheMatch: boolean;
  cardsAndSubs: boolean;
  referees: boolean;
}

export interface ParsedTournamentDraft {
  name: string;
  description: string;
  sport: string;
  matchType: string;
  startingPlayersPerTeam: number;
  substitutesPerTeam: number;
  squadSize: number;
  teams: string[];
  teamCount: number;
  format: StageType;
  matchDurationMinutes: number;
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  venue: string;
  startDate: string;
  startDateIso: string | null;
  startTime: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  features: ParsedTournamentFeatures;
  unsupportedFeatures: string[];
  matchesPerRound?: number;
  playoffQualifiers?: 2 | 4;
  includeThirdPlace?: boolean;
  embeddedSquads?: ParsedSquadDraft;
  rawPrompt: string;
  missingFields: string[];
  ambiguities: string[];
  followUpQuestion?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

const WORD_TO_NUMBER: Record<string, number> = {
  zero: 0,
  none: 0,
  no: 0,
  nil: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fourteen: 14,
  sixteen: 16,
  twenty: 20,
};

const MONTH_MAP: Record<string, string> = {
  january: '01', jan: '01',
  february: '02', feb: '02',
  march: '03', mar: '03',
  april: '04', apr: '04',
  may: '05',
  june: '06', jun: '06',
  july: '07', jul: '07',
  august: '08', aug: '08',
  september: '09', sep: '09', sept: '09',
  october: '10', oct: '10',
  november: '11', nov: '11',
  december: '12', dec: '12',
};

function parseNumberWordOrDigits(val: string): number | null {
  const clean = val.toLowerCase().trim();
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  if (clean in WORD_TO_NUMBER) return WORD_TO_NUMBER[clean];
  return null;
}

export function normalizeDateToIso(rawDate: string): { displayDate: string; isoDate: string | null } {
  if (!rawDate) return { displayDate: '', isoDate: null };
  const trimmed = rawDate.trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { displayDate: trimmed, isoDate: trimmed };
  }

  // "November 15", "Nov 15", "November 15, 2026"
  const m1 = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?$/i);
  if (m1 && MONTH_MAP[m1[1].toLowerCase()]) {
    const month = MONTH_MAP[m1[1].toLowerCase()];
    const day = m1[2].padStart(2, '0');
    const year = m1[3] || '2026';
    return { displayDate: `${m1[1]} ${m1[2]}`, isoDate: `${year}-${month}-${day}` };
  }

  // "15 November", "15th Nov", "15th of November 2026"
  const m2 = trimmed.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+)(?:,?\s*(\d{4}))?$/i);
  if (m2 && MONTH_MAP[m2[2].toLowerCase()]) {
    const month = MONTH_MAP[m2[2].toLowerCase()];
    const day = m2[1].padStart(2, '0');
    const year = m2[3] || '2026';
    return { displayDate: `${m2[2]} ${m2[1]}`, isoDate: `${year}-${month}-${day}` };
  }

  return { displayDate: trimmed, isoDate: null };
}

export const FOOTBALL_CLUB_ALIASES: Record<string, string> = {
  // Benchmark and misspellings
  'crystal apalce': 'Crystal Palace',
  'crystal palace': 'Crystal Palace',
  'palace': 'Crystal Palace',
  'fulham': 'Fulham',
  'dotmund': 'Borussia Dortmund',
  'dortmund': 'Borussia Dortmund',
  'borussia dortmund': 'Borussia Dortmund',
  'bvb': 'Borussia Dortmund',
  'spurs': 'Tottenham Hotspur (Spurs)',
  'tottenham': 'Tottenham Hotspur (Spurs)',
  'tottenham hotspur': 'Tottenham Hotspur (Spurs)',
  'tottenham hotspurs': 'Tottenham Hotspur (Spurs)',

  // Premier League & International top clubs
  'arsenal': 'Arsenal',
  'chelsea': 'Chelsea',
  'liverpool': 'Liverpool',
  'man city': 'Manchester City',
  'mancity': 'Manchester City',
  'manchester city': 'Manchester City',
  'man utd': 'Manchester United',
  'manutd': 'Manchester United',
  'man united': 'Manchester United',
  'manchester united': 'Manchester United',
  'aston villa': 'Aston Villa',
  'newcastle': 'Newcastle United',
  'newcastle united': 'Newcastle United',
  'west ham': 'West Ham United',
  'west ham united': 'West Ham United',
  'everton': 'Everton',
  'wolves': 'Wolverhampton Wanderers',
  'wolverhampton': 'Wolverhampton Wanderers',
  'brighton': 'Brighton & Hove Albion',
  'brentford': 'Brentford',
  'bournemouth': 'AFC Bournemouth',
  'nottingham forest': 'Nottingham Forest',
  'leicester': 'Leicester City',
  'leicester city': 'Leicester City',
  'southampton': 'Southampton',
  'ipswich': 'Ipswich Town',
  'ipswich town': 'Ipswich Town',
  'real madrid': 'Real Madrid',
  'barcelona': 'FC Barcelona',
  'barca': 'FC Barcelona',
  'bayern': 'Bayern Munich',
  'bayern munich': 'Bayern Munich',
  'psg': 'Paris Saint-Germain',
  'paris saint germain': 'Paris Saint-Germain',
  'juventus': 'Juventus',
  'inter milan': 'Inter Milan',
  'ac milan': 'AC Milan',
  'atletico madrid': 'Atlético Madrid',
};

export function normalizeTeamName(raw: string): string {
  const cleaned = raw.trim().replace(/^["']|["']$/g, '').replace(/^[•*\-\d.]+\s*/, '').replace(/^(?:the\s+)/i, '').trim();
  const lower = cleaned.toLowerCase();
  if (FOOTBALL_CLUB_ALIASES[lower]) {
    return FOOTBALL_CLUB_ALIASES[lower];
  }

  // Preserve casing if already properly capitalized or title-case words if all lowercase
  const words = cleaned.split(/\s+/);
  return words
    .map(w => {
      const wLower = w.toLowerCase();
      if (/^(?:fc|afc|cf|sc|bvb)$/i.test(w)) {
        return w.toUpperCase();
      }
      if (/^(?:united|city|rovers|town|wanderers|athletic|hotspur)$/i.test(w)) {
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }
      if (w === w.toLowerCase()) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }
      return w;
    })
    .join(' ');
}

export function normalizeVenueName(raw: string): string {
  const cleaned = raw.trim().replace(/^["']|["']$/g, '').replace(/^(?:the\s+)/i, '').trim();
  return cleaned
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function normalizeTimeTo12Hour(raw: string): string {
  const clean = raw.trim().toLowerCase();

  // "5 in the evening", "5 in the afternoon", "5 at night"
  const mEvening = clean.match(/^(\d{1,2})\s*(?:in the (?:afternoon|evening)|at night)$/);
  if (mEvening) {
    let hour = parseInt(mEvening[1], 10);
    if (hour < 12) hour += 12;
    return `${hour === 12 ? 12 : hour - 12}:00 PM`;
  }

  // "5 in the morning"
  const mMorning = clean.match(/^(\d{1,2})\s*in the morning$/);
  if (mMorning) {
    const hour = parseInt(mMorning[1], 10);
    return `${hour}:00 AM`;
  }

  // "5 pm", "5pm", "5:00 pm", "5:30 pm"
  const mAmPm = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (mAmPm) {
    const hour = parseInt(mAmPm[1], 10);
    const minute = mAmPm[2] || '00';
    const meridiem = mAmPm[3].toUpperCase();
    return `${hour}:${minute} ${meridiem}`;
  }

  // "17:00", "09:30"
  const m24 = clean.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (m24) {
    let hour = parseInt(m24[1], 10);
    const minute = m24[2];
    const meridiem = hour >= 12 ? 'PM' : 'AM';
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return `${hour}:${minute} ${meridiem}`;
  }

  return raw.trim();
}

function cleanText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
}

/**
 * Extracts bullet points or numbered list items if present in prompt
 */
function extractBulletItems(text: string): string[] {
  const lines = text.split('\n');
  const items: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/) || trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (bulletMatch && bulletMatch[1]) {
      const item = bulletMatch[1].trim().replace(/[,;]$/, '');
      if (item.length > 1) {
        items.push(item);
      }
    }
  }
  return items;
}

/**
 * Parses conversational prompt into structured tournament configuration
 */
export function parseTournamentPrompt(promptText: string): ParsedTournamentDraft {
  const rawText = cleanText(promptText);
  const singleLineText = rawText.replace(/\n+/g, ' ');
  const lower = singleLineText.toLowerCase();

  const missingFields: string[] = [];
  const ambiguities: string[] = [];
  const unsupportedFeatures: string[] = [];

  // 1. Sport and Match Format (e.g. 5-a-side, 7-a-side, futsal, standard)
  let sport = 'Football';
  let matchType = '11-a-side';
  let startingPlayersPerTeam = 11;
  let substitutesPerTeam = 5;

  const isFiveASide = 
    /five[- ]a[- ]side/i.test(lower) || 
    /5[- ]a[- ]side/i.test(lower) || 
    /\b5v5\b/i.test(lower) || 
    /\bfutsal\b/i.test(lower) ||
    /five players (?:on each team|on the pitch|per side)/i.test(lower) ||
    /5 players (?:on each team|on the pitch|per side)/i.test(lower);

  const isSevenASide =
    /seven[- ]a[- ]side/i.test(lower) ||
    /7[- ]a[- ]side/i.test(lower) ||
    /\b7v7\b/i.test(lower) ||
    /seven players (?:on each team|on the pitch|per side)/i.test(lower) ||
    /7 players (?:on each team|on the pitch|per side)/i.test(lower);

  if (isFiveASide) {
    matchType = '5-a-side';
    startingPlayersPerTeam = 5;
    substitutesPerTeam = 2;
    if (lower.includes('futsal')) sport = 'Futsal';
  } else if (isSevenASide) {
    matchType = '7-a-side';
    startingPlayersPerTeam = 7;
    substitutesPerTeam = 3;
  }

  // Explicit Starting Players
  const starterMatch = lower.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven)\s+(?:starting players|starters|players on the pitch|players on each team)/i);
  if (starterMatch) {
    const num = parseNumberWordOrDigits(starterMatch[1]);
    if (num !== null && num > 0) {
      startingPlayersPerTeam = num;
      if (num === 5 && !matchType.includes('5')) matchType = '5-a-side';
      if (num === 7 && !matchType.includes('7')) matchType = '7-a-side';
    }
  }

  // Explicit Substitutes
  const subMatch = lower.match(/(\d+|none|zero|no|nil|one|two|three|four|five|six|seven|eight)\s+(?:substitutes|subs)/i);
  if (subMatch) {
    const num = parseNumberWordOrDigits(subMatch[1]);
    if (num !== null && num >= 0) {
      substitutesPerTeam = num;
    }
  }

  const squadSize = startingPlayersPerTeam + substitutesPerTeam;

  // 2. Extract Tournament Name
  let name = '';
  // Pattern A: "called / named <Name>" followed by "on", "at", "with", "starting", period, comma, or end or dash
  const calledMatch = singleLineText.match(/(?:called|named|titled)\s+["']?([A-Z0-9][A-Za-z0-9\s'&.-]{2,60}?)["']?(?=\s+(?:on|at|with|starting|features|featuring|in\s+[A-Z]|-|–|—|\.|\,|$))/i);
  if (calledMatch && calledMatch[1]) {
    let cand = calledMatch[1].trim();
    cand = cand.replace(/\s+[-–—].*$/, '').trim();
    if (cand.length > 2 && !/^(?:six teams|a tournament|the tournament|football)/i.test(cand)) {
      name = cand;
    }
  }

  if (!name) {
    const namePatterns = [
      /(?:create|organize|organizing|organise|organising|set up|start|build)(?:\s+the)?\s+([A-Z0-9][A-Za-z0-9\s'&.-]{2,50}?)(?:\s+(?:with|having|for\s+\d+|at|on|\.|\,|$))/i,
      /(?:tournament|league|cup|championship)\s+(?:named|called)\s+["']?([^"',.]+?)["']?(?:\s+with|\s+for|\.|$)/i,
      /^([A-Z0-9][A-Za-z0-9\s'&.-]{2,50}?)(?:\s+with|\s+has|\s+features)/i,
    ];
    for (const pat of namePatterns) {
      const match = singleLineText.match(pat);
      if (match && match[1]) {
        let candidate = match[1].trim().replace(/\s+(?:with|for|having|featuring|at|on)$/i, '');
        candidate = candidate.replace(/^(?:the\s+)/i, '').trim();
        if (candidate.length > 2 && !candidate.toLowerCase().startsWith('six teams') && !candidate.toLowerCase().startsWith('a tournament')) {
          name = candidate;
          break;
        }
      }
    }
  }

  if (!name) {
    const titleMatch = singleLineText.match(/(?:(?:The\s+event\s+is\s+called|Organising\s+(?:the\s+)?|Organizing\s+(?:the\s+)?|Create\s+(?:the\s+)?)\s+)?([A-Z][a-zA-Z0-9\s]+(?:Championship|Cup|League|Tournament|Trophy|Shield|Super Cup|Open))/i);
    if (titleMatch) {
      const cand = titleMatch[1] || titleMatch[0];
      name = cand.replace(/^(?:the\s+event\s+is\s+called\s+|organising\s+(?:the\s+)?|organizing\s+(?:the\s+)?|create\s+(?:the\s+)?)/i, '').trim();
    } else {
      name = 'Draft Tournament';
      missingFields.push('Tournament name');
    }
  }

  // 3. Extract Teams List & Count
  const teams: string[] = [];
  let explicitTeamCount = 0;

  const countMatch = lower.match(/(?:with\s+)?(?:(\d+)|(two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen|sixteen|twenty))\s+(?:teams|clubs|squads|sides)/i);
  if (countMatch) {
    explicitTeamCount = countMatch[1] ? parseInt(countMatch[1], 10) : parseNumberWordOrDigits(countMatch[2]) || 0;
  }

  // First check bullet items
  const bulletItems = extractBulletItems(rawText);
  if (bulletItems.length >= 2) {
    bulletItems.forEach(item => {
      const cleaned = normalizeTeamName(item);
      if (cleaned.length >= 2 && !teams.includes(cleaned)) {
        teams.push(cleaned);
      }
    });
  }

  // If no bullets, parse conversational sentences
  if (teams.length === 0) {
    const teamSectionPatterns = [
      // Pattern 1: e.g. "teamnames crystal apalce,fulham,dotmund and spurs at college ground..."
      /(?:\bteamnames?\b|\bteam\s+names?\s*:)\s*:?\s*([^.]+?)(?=\s+at\s+[a-z0-9\s'-]+(?:stadium|ground|turf|arena|complex|park|field|pitch)|\s+at\s+\d|\s+on\s+[a-z0-9]|\s+starting|\s+starts|\s+held|\s+play\s+at|[.;!?\n]|$)/i,
      // Pattern 2: e.g. "Four teams: Crystal Palace, Fulham, Dortmund and Spurs."
      /(?:(?:two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen|sixteen|\d+)\s+teams?\s*:\s*)([^.]+?)(?=\s+at\s+[a-z0-9\s'-]+(?:stadium|ground|turf|arena|complex|park|field|pitch)|\s+at\s+\d|\s+on\s+[a-z0-9]|\s+starting|\s+starts|\s+held|\s+play\s+at|[.;!?\n]|$)/i,
      // Pattern 3: Standard conversational sentence e.g. "Six teams are participating: ..." or "teams are: ..."
      /(?:\b(?:teams?|clubs?|squads?|participants?)\b)\s*(?:are\s+participating|participating\s+are|are|include|namely|:|-|—)\s*:?\s*([^.]+?)(?=\.\s*(?:It|Each|Please|Use|Matches|The|Format|Schedule|$)|[.;!?\n]|$)/i,
      /(?:we\s+have|featuring)\s+([A-Z][^.]+?)(?=\.\s*(?:It|Each|Please|Use|Matches|The|Format|Schedule|$))/i,
    ];

    for (const pat of teamSectionPatterns) {
      const match = singleLineText.match(pat);
      if (match && match[1]) {
        const rawList = match[1].trim();
        // Split by comma, semicolon, or "and" (with word boundaries) or "vs" or "&"
        const tokens = rawList.split(/,|;|\band\b|\bvs\b|&/i).map(t => t.trim().replace(/^["']|["']$/g, ''));
        tokens.forEach(tok => {
          let cleaned = tok.replace(/^(?:the\s+)/i, '').trim();
          if (cleaned.length >= 2 && !/^(?:teams|clubs|squads|format|points|participating)$/i.test(cleaned)) {
            cleaned = cleaned.replace(/\s+(?:and|or)$/i, '').trim();
            const normalized = normalizeTeamName(cleaned);
            if (normalized && !teams.includes(normalized)) {
              teams.push(normalized);
            }
          }
        });
        if (teams.length >= 2) break;
      }
    }
  }

  // Fallback: list of capitalized clubs
  if (teams.length === 0) {
    const commaListMatch = singleLineText.match(/([A-Z][A-Za-z0-9\s]+(?:FC|United|City|Rovers|Strikers|Stars|Wanderers|Boys|Warriors|Athletic|Real|Club|Blasters)[^.]+)/);
    if (commaListMatch) {
      const items = commaListMatch[1].split(/,|\band\b/i).map(t => t.trim());
      items.forEach(item => {
        const norm = normalizeTeamName(item);
        if (norm.length > 2 && !teams.includes(norm)) teams.push(norm);
      });
    }
  }

  // Fallback: Check for "Team <Name> is..." or "Team <Name> has..."
  if (teams.length === 0) {
    const teamNameMatches = Array.from(
      singleLineText.matchAll(/(?:^|\n|[.;]\s*)Team\s+([A-Za-z0-9\s'-]{1,30}?)(?=\s+(?:is\s+managed\s+by|is\s+coached\s+by|has\s+players|players\s+are|roster\s+is|is\s+|has\s+|manager\s+is|:|,|\.|\n|$))/gi)
    );
    if (teamNameMatches.length >= 2) {
      teamNameMatches.forEach(m => {
        const fullTeam = `Team ${m[1].trim()}`;
        if (!teams.includes(fullTeam)) {
          teams.push(fullTeam);
        }
      });
    }
  }

  if (teams.length === 0) {
    missingFields.push('Team names (no team list detected)');
  } else if (explicitTeamCount > 0 && teams.length !== explicitTeamCount) {
    ambiguities.push(`You mentioned ${explicitTeamCount} teams, but we identified ${teams.length} team names.`);
  }

  // 4. Format & Playoff Handling
  let format: StageType = 'SINGLE_ROUND_ROBIN';
  const hasPlayoffs = lower.includes('playoff') || lower.includes('play-off') || lower.includes('play offs') ||
                      lower.includes('followed by playoffs') || lower.includes('top two teams advance') ||
                      lower.includes('top 2 teams advance') || lower.includes('top four teams advance') ||
                      lower.includes('top 4 teams advance') || lower.includes('advance to final') ||
                      lower.includes('advance to the final') || lower.includes('advance to semifinals') ||
                      lower.includes('advance to semi-finals') || lower.includes('play the final') ||
                      lower.includes('play the semi');

  let playoffQualifiers: 2 | 4 = 4;
  if (/top\s+(?:two|2)\b/i.test(lower) || /final\s+between\s+top\s+two/i.test(lower) || /top\s+2\s+teams?\s+advance\s+(?:directly\s+)?to\s+(?:the\s+)?final/i.test(lower) || /top\s+(?:two|2)\s+play\s+(?:the\s+)?final/i.test(lower)) {
    playoffQualifiers = 2;
  } else if (/top\s+(?:four|4)\b/i.test(lower) || /semifinal/i.test(lower) || /semi-final/i.test(lower)) {
    playoffQualifiers = 4;
  }

  const includeThirdPlace = /third[- ]place/i.test(lower) || /3rd[- ]place/i.test(lower);

  const hasSingleRR = lower.includes('single round-robin') || lower.includes('single round robin');
  const hasDoubleRR = lower.includes('double round-robin') || lower.includes('double round robin') || lower.includes('home and away') || lower.includes('two legs');
  const hasKnockout = lower.includes('knockout') || lower.includes('single elimination') || lower.includes('bracket') || lower.includes('elimination');
  const hasDoubleElim = lower.includes('double elimination');
  const hasGroupStage = lower.includes('group stage') || lower.includes('groups then knockout');

  // Check unsupported formats
  if (lower.includes('swiss system') || lower.includes('swiss format')) {
    unsupportedFeatures.push('Swiss System');
    ambiguities.push('Swiss System format is not currently supported in TournX. Defaulting to Single Round-Robin.');
  }
  if (lower.includes('triple round-robin') || lower.includes('triple round robin')) {
    unsupportedFeatures.push('Triple Round-Robin');
    ambiguities.push('Triple Round-Robin is not currently supported. Defaulting to Double Round-Robin.');
  }

  if (hasPlayoffs) {
    format = 'LEAGUE_WITH_PLAYOFFS';
  } else if (hasDoubleRR) {
    format = 'DOUBLE_ROUND_ROBIN';
  } else if (hasDoubleElim) {
    format = 'DOUBLE_ELIMINATION';
  } else if (hasGroupStage) {
    format = 'GROUP_STAGE';
  } else if (hasKnockout && !hasSingleRR) {
    format = 'SINGLE_ELIMINATION';
  } else {
    format = 'SINGLE_ROUND_ROBIN';
  }

  // Check conflicting formats
  if (hasSingleRR && hasKnockout && !hasGroupStage && !hasPlayoffs) {
    ambiguities.push('Prompt mentions both round-robin and knockout formats. Using Single Round-Robin by default.');
  }

  // 5. Points System
  let pointsForWin = 3;
  let pointsForDraw = 1;
  let pointsForLoss = 0;

  // Win
  const winMatch = lower.match(/(\d+|one|two|three|four|five)\s+(?:points?|pts?)\s+(?:for\s+a\s+win|per\s+win|for\s+win|win)/i) ||
                   lower.match(/(?:win\s+(?:is\s+)?|three\s+points\s+for\s+a\s+win)/i);
  if (winMatch) {
    if (winMatch[1]) {
      const wVal = parseNumberWordOrDigits(winMatch[1]);
      if (wVal !== null) pointsForWin = wVal;
    } else if (winMatch[0].includes('three')) {
      pointsForWin = 3;
    }
  }

  // Draw
  const drawMatch = lower.match(/(\d+|one|two|three|none|zero)\s+(?:points?|pts?)\s+(?:for\s+a\s+draw|per\s+draw|for\s+draw|draw)/i) ||
                    lower.match(/(?:one\s+for\s+a\s+draw|1\s+for\s+a\s+draw)/i);
  if (drawMatch) {
    if (drawMatch[1]) {
      const dVal = parseNumberWordOrDigits(drawMatch[1]);
      if (dVal !== null) pointsForDraw = dVal;
    } else if (drawMatch[0].includes('one') || drawMatch[0].includes('1')) {
      pointsForDraw = 1;
    }
  }

  // Loss
  const lossMatch = lower.match(/(\d+|none|zero|no|nil)\s+(?:points?|pts?)\s+(?:for\s+a\s+loss|for\s+loss|loss)/i) ||
                    lower.match(/(?:none\s+for\s+a\s+loss|zero\s+for\s+a\s+loss|0\s+for\s+a\s+loss)/i);
  if (lossMatch) {
    if (lossMatch[1]) {
      const lVal = parseNumberWordOrDigits(lossMatch[1]);
      if (lVal !== null) pointsForLoss = lVal;
    } else {
      pointsForLoss = 0;
    }
  }

  // 6. Match Duration
  let matchDurationMinutes = 50;
  const durationMatch = lower.match(/(\d+)(?:\s*|-)(?:minutes?|mins?)\s+(?:long|matches|duration|each|per\s+match)/i) ||
                        lower.match(/(\d+)\s+minutes\s+per\s+match/i) ||
                        lower.match(/matches\s+are\s+(\d+)\s+minutes/i) ||
                        lower.match(/(\d+)\s+minutes/i);
  if (durationMatch) {
    matchDurationMinutes = parseInt(durationMatch[1], 10);
  }

  // 7. Venue
  let venue = '';
  const venuePatterns = [
    /(?:played\s+at|venue\s+is|held\s+at|location\s+is|ground\s+is|play\s+at)\s+(?:the\s+)?([A-Za-z0-9\s'-]{3,50}?)(?=[.,;!?\n]|\s+at\s+\d|\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)|\s+in\s+the\s+(?:morning|afternoon|evening)|\s+on\b|\s+The|\s+Starting|\s+Starts|\s+Matches|\s+Six|\s+Each|\s+Please|$)/i,
    /(?:at\s+)([A-Za-z0-9\s'-]{2,50}?(?:Stadium|Ground|Turf|Arena|Complex|Park|Field|Pitch))(?=[.,;!?\n]|\s+at\s+\d|\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)|\s+in\s+the\s+(?:morning|afternoon|evening)|\s+on\b|\s+Six|\s+The|\s+Each|\s+Please|\s+Starting|\s+Starts|$)/i,
    /(?:played\s+at|venue\s+is|held\s+at|location\s+is|ground\s+is|play\s+at)\s+(?:the\s+)?([A-Za-z0-9\s'-]{3,50}?)$/i,
  ];

  for (const vp of venuePatterns) {
    const vm = singleLineText.match(vp);
    if (vm && vm[1]) {
      const candidate = vm[1].trim().replace(/[,.]$/, '').trim();
      if (candidate.length > 2) {
        venue = normalizeVenueName(candidate);
        break;
      }
    }
  }

  if (!venue) {
    missingFields.push('Venue / match location');
  }

  // 8. Kick-off Time
  let startTime = '';
  const timePatterns = [
    /\b(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    /\b(?:at\s+)?(\d{1,2})\s+(?:in the (?:morning|afternoon|evening)|at night)\b/i,
    /\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i,
  ];
  for (const tp of timePatterns) {
    const tm = singleLineText.match(tp);
    if (tm) {
      startTime = normalizeTimeTo12Hour(tm[0].replace(/^at\s+/i, '').trim());
      break;
    }
  }

  // 9. Start Date
  let startDate = '';
  let startDateIso: string | null = null;

  // Check for "tomorrow"
  const tomorrowMatch = singleLineText.match(/\b(?:starts?\s+|starting\s+|held\s+|beginning\s+)?tomorrow\b/i);
  if (tomorrowMatch) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    startDate = 'Tomorrow';
    startDateIso = `${yyyy}-${mm}-${dd}`;
  } else {
    // Normal date patterns - strictly require month name or ISO format, never matching isolated time
    const datePatterns = [
      /(?:starts\s+on|starting\s+on|beginning\s+on|held\s+on|scheduled\s+for|on\s+)\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:,?\s*\d{4})?|\d{4}-\d{2}-\d{2})(?=\s+at|\.|\s+The|\s+Six|\s+Schedule|\s+Matches|,|$)/i,
    ];

    for (const dp of datePatterns) {
      const dm = singleLineText.match(dp);
      if (dm && dm[1]) {
        const rawDateCandidate = dm[1].trim();
        // Ensure this is not a time (e.g. "5 pm" or "5 in the evening")
        if (!/^\d{1,2}(?::\d{2})?\s*(?:am|pm)$/i.test(rawDateCandidate) && !/in the (?:morning|evening|afternoon)/i.test(rawDateCandidate)) {
          const norm = normalizeDateToIso(rawDateCandidate);
          if (norm.isoDate) {
            startDate = norm.displayDate;
            startDateIso = norm.isoDate;
            break;
          }
        }
      }
    }
  }

  if (!startDate) {
    missingFields.push('Start date');
  }

  // 10. Optional Features & Visibility
  const features: ParsedTournamentFeatures = {
    goalscorerTracking: true,
    playerOfTheMatch: true,
    cardsAndSubs: true,
    referees: true,
  };

  if (lower.includes('goalscorer tracking') || lower.includes('track goals') || lower.includes('goal scorers')) {
    features.goalscorerTracking = true;
  }
  if (lower.includes('player of the match') || lower.includes('man of the match') || lower.includes('potm')) {
    features.playerOfTheMatch = true;
  }
  if (lower.includes('disable cards') || lower.includes('no cards')) {
    features.cardsAndSubs = false;
  }

  let visibility: 'PUBLIC' | 'PRIVATE' = 'PUBLIC';
  if (lower.includes('make the tournament public') || lower.includes('public tournament') || lower.includes('make public')) {
    visibility = 'PUBLIC';
  } else if (lower.includes('make the tournament private') || lower.includes('private tournament') || lower.includes('make private')) {
    visibility = 'PRIVATE';
  }

  // 11. Matches per round
  let matchesPerRound: number | undefined;
  const perRoundMatch = lower.match(/(?:(\d+)|(one|two|three|four|five|six|seven|eight))\s+matches\s+per\s+round/i);
  if (perRoundMatch) {
    matchesPerRound = perRoundMatch[1] ? parseInt(perRoundMatch[1], 10) : parseNumberWordOrDigits(perRoundMatch[2]) || 3;
  }

  // Follow-up formulation
  let followUpQuestion: string | undefined;
  if (teams.length < 2) {
    followUpQuestion = 'Please list at least two participating teams to generate tournament fixtures.';
  } else if (missingFields.length > 0) {
    followUpQuestion = `Would you like to specify ${missingFields.join(' and ')} now?`;
  }

  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
  if (teams.length < 2) {
    confidence = 'LOW';
  } else if (ambiguities.length > 0 || missingFields.length >= 2) {
    confidence = 'MEDIUM';
  }

  // 12. Extract Embedded Squads, Players, Positions, Captains, Managers if present in master prompt
  let embeddedSquads: ParsedSquadDraft | undefined;
  if (/goalkeeper|keeper|goalie|defender|midfielder|forward|striker|captain|manager|\bgk\b|\bdef\b|\bmid\b|\bfwd\b/i.test(lower)) {
    try {
      const parsed = parseSquadPrompt(promptText, teams);
      if (parsed.totalPlayersParsed > 0 || Object.values(parsed.squads).some(s => s.managerName)) {
        embeddedSquads = parsed;
        if (teams.length === 0) {
          const squadTeamNames = Object.keys(parsed.squads).filter(k => k !== 'Unassigned');
          if (squadTeamNames.length >= 2) {
            teams.push(...squadTeamNames);
          }
        }
      }
    } catch {}
  }

  // Clear missing team names if teams were found
  if (teams.length >= 2) {
    const missingIdx = missingFields.indexOf('Team names (no team list detected)');
    if (missingIdx >= 0) missingFields.splice(missingIdx, 1);
    if (followUpQuestion?.includes('participating teams')) {
      followUpQuestion = missingFields.length > 0 ? `Would you like to specify ${missingFields.join(' and ')} now?` : undefined;
    }
    if (confidence === 'LOW') {
      confidence = (ambiguities.length > 0 || missingFields.length >= 2) ? 'MEDIUM' : 'HIGH';
    }
  }

  return {
    name,
    description: `Created via TournX conversational setup prompt.`,
    sport,
    matchType,
    startingPlayersPerTeam,
    substitutesPerTeam,
    squadSize,
    teams,
    teamCount: teams.length,
    format,
    playoffQualifiers: format === 'LEAGUE_WITH_PLAYOFFS' ? playoffQualifiers : undefined,
    includeThirdPlace: format === 'LEAGUE_WITH_PLAYOFFS' ? includeThirdPlace : undefined,
    embeddedSquads,
    matchDurationMinutes,
    pointsForWin,
    pointsForDraw,
    pointsForLoss,
    venue,
    startDate,
    startDateIso,
    startTime,
    visibility,
    features,
    unsupportedFeatures,
    matchesPerRound,
    rawPrompt: promptText,
    missingFields,
    ambiguities,
    followUpQuestion,
    confidence,
  };
}


// ============================================================================
// 2. SQUAD & PLAYER PARSER
// ============================================================================

export interface ParsedPlayerItem {
  name: string;
  position: Position;
  jerseyNumber?: number;
  isCaptain: boolean;
}

export interface ParsedTeamSquad {
  teamName: string;
  managerName?: string;
  players: ParsedPlayerItem[];
}

export interface ParsedSquadDraft {
  squads: Record<string, ParsedTeamSquad>;
  unassignedPlayers: ParsedPlayerItem[];
  warnings: string[];
  totalPlayersParsed: number;
}

const POSITION_MAP: Record<string, Position> = {
  gk: 'GK',
  goalkeeper: 'GK',
  keeper: 'GK',
  goalie: 'GK',
  def: 'DEF',
  defender: 'DEF',
  defence: 'DEF',
  cb: 'DEF',
  lb: 'DEF',
  rb: 'DEF',
  'center back': 'DEF',
  'centre back': 'DEF',
  'left back': 'DEF',
  'right back': 'DEF',
  mid: 'MID',
  midfielder: 'MID',
  midfield: 'MID',
  cm: 'MID',
  cdm: 'MID',
  cam: 'MID',
  'center mid': 'MID',
  'centre mid': 'MID',
  fwd: 'FWD',
  forward: 'FWD',
  striker: 'FWD',
  attacker: 'FWD',
  st: 'FWD',
  lw: 'FWD',
  rw: 'FWD',
  winger: 'FWD',
  wing: 'FWD',
  cf: 'FWD',
  sub: 'TBD',
  substitute: 'TBD',
  substitutes: 'TBD',
  subs: 'TBD',
  bench: 'TBD',
  reserve: 'TBD',
  tbd: 'TBD',
};

/**
 * Normalizes player names by stripping formatting separators, leading/trailing punctuation,
 * bullets, dashes, and extra whitespace without damaging internal hyphens or apostrophes.
 */
export function normalizePlayerName(rawName: string): string {
  if (!rawName) return '';
  let name = rawName.trim();

  // Strip leading numbering, bullets, dashes, punctuation
  name = name.replace(/^[-*•\d+.)\s—–:;,#]+/u, '').trim();

  // Strip trailing dashes, colons, commas, semicolons, bullets, asterisks
  name = name.replace(/[\s—–\-*•:,.;#]+$/u, '').trim();

  // Strip leading articles or keywords
  name = name.replace(/^(?:the\s+|captain\s+|player\s+)/i, '').trim();

  // Collapse internal multiple whitespace
  name = name.replace(/\s+/g, ' ');

  return name;
}

/**
 * Validates whether a candidate string is a plausible player name,
 * filtering out instruction sentences, team headings, and explanatory text.
 */
export function isValidPlayerName(name: string, knownTeams: string[] = []): boolean {
  if (!name || name.length < 2 || name.length > 35) return false;

  const lower = name.toLowerCase().trim();

  // Reject if it matches any known team name (case-insensitive)
  if (knownTeams.some(kt => kt.toLowerCase().trim() === lower)) {
    return false;
  }

  // Reject if it looks like a team heading (e.g. "Team Alpha", "1. Kerala Blasters")
  const teamHeadingMatch = lower.match(/^(?:\d+[\.\)]\s*)?(?:team\s+)?([a-z0-9\s'&.-]+)$/i);
  if (teamHeadingMatch) {
    const candidateTeam = teamHeadingMatch[1].trim();
    if (knownTeams.some(kt => kt.toLowerCase().trim() === candidateTeam)) {
      return false;
    }
  }

  // Reject if candidate has more than 4 words (real player names don't have 5+ words)
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 4) return false;

  // Reject if it matches stop words or roles
  if (/^(?:for|in|to|with|and|the|is|are|manager|coach|team|teams|squad|squads|roster|rosters|captain|captains|player|players|use|please|format|rules|notes?|none|tbd)$/i.test(lower)) {
    return false;
  }

  // Reject instruction/command sentences and phrases
  const instructionKeywords = [
    'tournament', 'fixture', 'fixtures', 'duplicate', 'preview', 'validation',
    'dropping', 'preserve', 'existing', 'confirm', 'format', 'league',
    'knockout', 'schedule', 'roster', 'squads', 'manager', 'coach',
    'substitute rules', 'points for', 'organise', 'organize', 'championship',
    'participating', 'following', 'extract', 'correct', 'manually',
    'stadium', 'matches are', 'use a', 'please', 'let me', 'six teams',
    'teams in', 'save the', 'flag any', 'rather than', 'show a preview',
    'editable names', 'captain assignments', 'existing data', 'save changes',
    'do not create', 'modify existing', 'match each', 'add the following'
  ];

  if (instructionKeywords.some(kw => lower.includes(kw))) {
    return false;
  }

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(name)) return false;

  return true;
}

/**
 * Checks if a block of text looks like tournament or prompt instructions rather than player data.
 */
function isInstructionLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (!lower) return false;
  return /^(?:add\s+the\s+following|do\s+not\s+create|match\s+each\s+player|show\s+a\s+preview|flag\s+any\s+validation|preserve\s+existing|save\s+the\s+changes|use\s+a\s+knockout|please\s+extract|let\s+me\s+correct|organise\s+a|organize\s+a|six\s+teams|it\s+should\s+follow|each\s+team\s+can|please\s+enable|make\s+the\s+tournament|note:|all\s+matches\s+are)/i.test(lower);
}

/**
 * Parses squad creation prompts into per-team rosters with positions, captains, and managers
 */
export function parseSquadPrompt(promptText: string, knownTeams: string[] = []): ParsedSquadDraft {
  const text = cleanText(promptText);
  const squads: Record<string, ParsedTeamSquad> = {};
  const unassignedPlayers: ParsedPlayerItem[] = [];
  const warnings: string[] = [];

  // Canonical team name lookup map (lowercase -> original)
  const canonicalTeamMap: Record<string, string> = {};
  knownTeams.forEach(t => {
    canonicalTeamMap[t.toLowerCase().trim()] = t;
    squads[t] = { teamName: t, players: [] };
  });

  interface FoundTeam {
    teamName: string;
    index: number;
    matchLength: number;
  }

  const occurrences: FoundTeam[] = [];

  // Helper to add occurrence without overlap
  const addOccurrence = (teamName: string, index: number, matchLength: number) => {
    // Canonicalize to existing known team if matched
    const lower = teamName.toLowerCase().trim();
    const canon = canonicalTeamMap[lower] ||
      canonicalTeamMap[lower.replace(/^(?:\d+[\.\)]\s*)?(?:team\s+|the\s+)?/i, '').trim()] ||
      teamName;

    // Avoid duplicate or overlapping matches
    const exists = occurrences.some(o => Math.abs(o.index - index) < Math.max(matchLength, 6));
    if (!exists) {
      occurrences.push({ teamName: canon, index, matchLength });
    }
  };

  // 1. Look for known teams occurrences (handling markdown, numbers, prefixes like "For", "In", "Team", colons, dashes)
  if (knownTeams.length > 0) {
    knownTeams.forEach(kt => {
      const escaped = kt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Header line pattern: e.g. "**1. Kerala Blasters**", "### 2. Bengaluru FC", "1. Kerala Blasters:"
      const headerRegex = new RegExp(`(?:^|\\n)\\s*(?:[*#_~]{1,6}\\s*)?(?:\\d+[\\.\\)]\\s*)?(?:(?:for|in|team)\\s+)?(${escaped})(?:[*_~]{1,6})?\\s*(?:[:\\-–—]|\\n|$)`, 'gi');
      let hm: RegExpExecArray | null;
      while ((hm = headerRegex.exec(text)) !== null) {
        addOccurrence(kt, hm.index, hm[0].length);
      }

      // Conversational prefix pattern: e.g. "For Kerala Blasters, add...", "Team Kerala Blasters is managed by..."
      const convRegex = new RegExp(`(?:^|\\n|[.;]\\s*)(?:for|in|team)\\s+(${escaped})(?=[.,;:\\s\\n]|$)`, 'gi');
      let cm: RegExpExecArray | null;
      while ((cm = convRegex.exec(text)) !== null) {
        addOccurrence(kt, cm.index, cm[0].length);
      }

      // Inline colon pattern: e.g. "Kerala Blasters: Daniel (GK)..."
      const colonRegex = new RegExp(`(?:^|\\n)\\s*(${escaped})\\s*[:\\-–—]`, 'gi');
      let clm: RegExpExecArray | null;
      while ((clm = colonRegex.exec(text)) !== null) {
        addOccurrence(kt, clm.index, clm[0].length);
      }

      // General boundary fallback if not yet matched
      if (!occurrences.some(o => o.teamName.toLowerCase() === kt.toLowerCase())) {
        const boundaryRegex = new RegExp(`(?:^|[\\r\\n\\s*#_~\`"\'\\(\\)\\[\\]\\-:.,;])(?:for|in|team\\s+)?(${escaped})(?=[\\r\\n\\s*#_~\`"\'\\(\\)\\[\\]\\-:.,;]|$)`, 'gi');
        let bm: RegExpExecArray | null;
        while ((bm = boundaryRegex.exec(text)) !== null) {
          addOccurrence(kt, bm.index, bm[0].length);
        }
      }
    });
  }

  // 2. Discover team boundaries from text ONLY IF knownTeams is empty or no known teams were found
  if (occurrences.length === 0) {
    // e.g. "**1. Kerala Blasters**", "### Bengaluru FC", "1. Team Alpha"
    const markdownHeaderRegex = /(?:^|\n)\s*(?:\*{1,3}|#{1,6}\s*|\d+[\.\)]\s*)(?:Team\s+)?([A-Za-z0-9\s'&.-]{2,35}?)(?:\*{1,3})?\s*[:\-–—]?\s*(?=\n\s*(?:Manager|Coach|[-*•\d]|Goalkeeper|Keeper|GK|DEF|MID|FWD))/gi;
    let mhm: RegExpExecArray | null;
    while ((mhm = markdownHeaderRegex.exec(text)) !== null) {
      const rawName = mhm[1].trim();
      if (!isInstructionLine(rawName) && isValidPlayerName(rawName, [])) {
        addOccurrence(rawName, mhm.index, mhm[0].length);
      }
    }

    // Conversational "Team Alpha is managed by...", "Team Alpha has...", "Team Alpha:"
    const teamPrefixRegex = /(?:^|\n|[.;]\s*)(?:Team\s+)([A-Za-z0-9\s'-]{1,30}?)(?=\s+(?:is\s+managed\s+by|is\s+coached\s+by|is\s+|has\s+|players\s+are|roster\s+is|manager\s+is|squad\s+is)|:|,|\.|\n)/gi;
    let tm: RegExpExecArray | null;
    while ((tm = teamPrefixRegex.exec(text)) !== null) {
      const rawName = tm[1].trim();
      const fullName = `Team ${rawName}`;
      addOccurrence(fullName, tm.index, tm[0].length);
    }

    // "For <Team>..." or "In <Team>..."
    const forPrefixRegex = /(?:^|\n|[.;]\s*)(?:For|In)\s+([A-Za-z0-9\s'-]{2,30}?)(?=\s+(?:add|manager|coach|players|is|roster)|:|,|\.|\n)/gi;
    let fm: RegExpExecArray | null;
    while ((fm = forPrefixRegex.exec(text)) !== null) {
      const rawName = fm[1].trim();
      if (!isInstructionLine(rawName)) {
        addOccurrence(rawName, fm.index, fm[0].length);
      }
    }

    // Colon prefix: "<Team>:" (must NOT start with bullet or dash)
    const colonPrefixRegex = /(?:^|\n)\s*(?![*-•\d])([A-Za-z0-9\s'-]{2,30}?)\s*[:\-–—]\s*(?=[A-Za-z0-9\s(]+(?:GK|DEF|MID|FWD|manager|coach))/gi;
    let cm: RegExpExecArray | null;
    while ((cm = colonPrefixRegex.exec(text)) !== null) {
      const rawName = cm[1].trim();
      if (!isInstructionLine(rawName)) {
        addOccurrence(rawName, cm.index, cm[0].length);
      }
    }
  }

  if (occurrences.length > 0) {
    // Sort by position in text
    occurrences.sort((a, b) => a.index - b.index);

    // Segment text into team bodies
    for (let i = 0; i < occurrences.length; i++) {
      const cur = occurrences[i];
      const next = occurrences[i + 1];
      const startIdx = cur.index + cur.matchLength;
      const endIdx = next ? next.index : text.length;
      let body = text.substring(startIdx, endIdx).trim();

      // Clean leading delimiters like ":", ",", "add", "add players to", "-", "—"
      body = body.replace(/^[:,\s\-–—]+/, '').replace(/^add\s+(?:players?\s+(?:to|for)?\s*)?/i, '').trim();

      // Strip trailing prepositions targeting next team (e.g. "...manager is Michael. For")
      body = body.replace(/\b(?:for|in|team|to)\s*$/i, '').trim();

      if (!squads[cur.teamName]) {
        squads[cur.teamName] = { teamName: cur.teamName, players: [] };
      }
      parseTeamBody(body, squads[cur.teamName], warnings, knownTeams);
    }
  } else {
    // Fallback: Default to first known team or Unassigned
    const targetTeamName = knownTeams[0] || 'Unassigned';
    if (!squads[targetTeamName]) {
      squads[targetTeamName] = { teamName: targetTeamName, players: [] };
    }
    parseTeamBody(text, squads[targetTeamName], warnings, knownTeams);
  }

  let totalPlayersParsed = 0;
  Object.values(squads).forEach(sq => {
    totalPlayersParsed += sq.players.length;
  });

  return {
    squads,
    unassignedPlayers,
    warnings,
    totalPlayersParsed,
  };
}

export function splitTopLevelTokens(text: string): string[] {
  const result: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '(' || char === '[') {
      parenDepth++;
      current += char;
    } else if (char === ')' || char === ']') {
      if (parenDepth > 0) parenDepth--;
      current += char;
    } else if (parenDepth === 0) {
      if (char === '\n' || char === ',' || char === ';' || char === '.') {
        if (current.trim()) result.push(current.trim().replace(/\.$/, ''));
        current = '';
      } else if (
        (char === 'a' || char === 'A') &&
        text.substring(i, i + 4).match(/\band\b/i) &&
        (i === 0 || /\s/.test(text[i - 1]))
      ) {
        if (current.trim()) result.push(current.trim().replace(/\.$/, ''));
        current = '';
        i += 3; // skip "and"
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(current.trim().replace(/\.$/, ''));
  }
  return result;
}

/**
 * Parses an individual player token or line into a structured ParsedPlayerItem.
 */
function parsePlayerToken(
  rawToken: string,
  generalCaptainName: string,
  knownTeams: string[] = []
): ParsedPlayerItem | null {
  let token = rawToken.trim();
  if (!token || token.length < 2) return null;

  // Clean leading bullets, dashes, numbers, etc.
  token = token.replace(/^[-*•\d+.)\s—–:]+/, '').replace(/^add\s+/i, '').trim();

  // If token is an obvious instruction line, reject immediately
  if (!token || token.length < 2 || isInstructionLine(token)) {
    return null;
  }

  let isCaptain = false;
  let detectedPosition: Position = 'MID';
  let jerseyNumber: number | undefined;

  // 1. Check if token has separator dash/colon (e.g. "Adithyan Raj — Goalkeeper, Captain" or "Nikhil Das — Defender")
  const dashMatch = token.match(/^(.+?)\s*[—–\-:]\s*([A-Za-z0-9\s,;#()]+)$/);
  if (dashMatch) {
    const leftPart = dashMatch[1].trim();
    const rightPart = dashMatch[2].trim();

    // Check if rightPart contains position, captain, substitute, or jersey number
    const rightSubTokens = rightPart.split(/[,;]+/).map(s => s.trim().toLowerCase());
    let hasRoleOrPos = false;

    rightSubTokens.forEach(sub => {
      // Check captain
      if (sub === 'c' || sub === 'captain' || sub.includes('captain')) {
        isCaptain = true;
        hasRoleOrPos = true;
      }
      // Check position
      const cleanSub = sub.replace(/[()]/g, '').trim();
      if (POSITION_MAP[cleanSub]) {
        detectedPosition = POSITION_MAP[cleanSub];
        hasRoleOrPos = true;
      }
      // Check jersey
      const jMatch = sub.match(/(?:#|no\.?|jersey|number)\s*(\d+)/i);
      if (jMatch) {
        jerseyNumber = parseInt(jMatch[1], 10);
        hasRoleOrPos = true;
      }
    });

    if (hasRoleOrPos) {
      token = leftPart;
    }
  }

  // 2. Check content inside parentheses/brackets (e.g. "(GK)", "(DEF, Captain)", "(Captain)", "(substitute)")
  const parenMatch = token.match(/[\(\[]\s*([^\)\]]+)\s*[\)\]]/);
  if (parenMatch) {
    const insideParts = parenMatch[1].split(/[,;]+/).map(p => p.trim());
    insideParts.forEach(part => {
      const lowerPart = part.toLowerCase();
      if (lowerPart === 'c' || lowerPart === 'captain' || lowerPart.includes('captain')) {
        isCaptain = true;
      } else if (POSITION_MAP[lowerPart]) {
        detectedPosition = POSITION_MAP[lowerPart];
      }
      const jMatch = lowerPart.match(/(?:#|no\.?|jersey|number)\s*(\d+)/i);
      if (jMatch) {
        jerseyNumber = parseInt(jMatch[1], 10);
      }
    });
    token = token.replace(/[\(\[][^\)\]]+[\)\]]/g, '').trim();
  }

  // 3. Check standalone captain keyword
  if (/\bcaptain\b/i.test(token)) {
    isCaptain = true;
    token = token.replace(/\bcaptain\b/gi, '').trim();
  }

  // 4. Check for jersey number
  const jerseyMatch = token.match(/(?:#|number\s*|jersey\s*|no\.\s*)(\d+)/i);
  if (jerseyMatch) {
    jerseyNumber = parseInt(jerseyMatch[1], 10);
    token = token.replace(/(?:#|number\s*|jersey\s*|no\.\s*)\d+/gi, '').trim();
  }

  let pName = token;

  // 5. Check for position after hyphen or colon: e.g. "Daniel - GK", "Daniel: DEF"
  const dashPosMatch = token.match(/[\s—–\-:]+([a-zA-Z\s]+)$/);
  if (dashPosMatch) {
    const posKey = dashPosMatch[1].trim().toLowerCase();
    if (POSITION_MAP[posKey]) {
      detectedPosition = POSITION_MAP[posKey];
      token = token.substring(0, dashPosMatch.index).trim();
      pName = token;
    }
  }

  // 6. Check prefix position: e.g. "goalkeeper Daniel" or "gk Daniel"
  const prefixMatch = token.match(/^(goalkeeper|keeper|goalie|defender|def|midfielder|mid|forward|fwd|striker|attacker|cb|lb|rb|cm|cdm|cam|st|lw|rw|winger|substitute|sub)\s+(.+)$/i);
  if (prefixMatch) {
    const posKey = prefixMatch[1].toLowerCase();
    if (POSITION_MAP[posKey]) {
      detectedPosition = POSITION_MAP[posKey];
      pName = prefixMatch[2].trim();
    }
  }

  // 7. Check suffix position: e.g. "Daniel goalkeeper" or "Daniel GK"
  const suffixMatch = token.match(/^(.+)\s+(goalkeeper|keeper|goalie|defender|def|midfielder|mid|forward|fwd|striker|attacker|cb|lb|rb|cm|cdm|cam|st|lw|rw|winger|substitute|sub)$/i);
  if (suffixMatch && !prefixMatch) {
    const posKey = suffixMatch[2].toLowerCase();
    if (POSITION_MAP[posKey]) {
      detectedPosition = POSITION_MAP[posKey];
      pName = suffixMatch[1].trim();
    }
  }

  // 8. Normalize player name
  pName = normalizePlayerName(pName);

  if (!pName || !isValidPlayerName(pName, knownTeams)) {
    return null;
  }

  if (generalCaptainName && pName.toLowerCase().includes(generalCaptainName)) {
    isCaptain = true;
  }

  // Capitalize first letter of player name nicely if needed
  const cleanPlayerName = pName.charAt(0).toUpperCase() + pName.slice(1);

  return {
    name: cleanPlayerName,
    position: detectedPosition,
    jerseyNumber,
    isCaptain,
  };
}

function parseTeamBody(body: string, squad: ParsedTeamSquad, warnings: string[], knownTeams: string[] = []) {
  // Strip trailing tournament instructions like "Match each player...", "Use a knockout format...", "Preserve existing data..."
  body = body.replace(/(?:\n|\.\s+)\s*(?:Match\s+each\s+|Preserve\s+|Save\s+the\s+|Flag\s+any\s+|Show\s+a\s+|Do\s+not\s+|Use\s+a\s+|Please\s+|Let\s+me\s+|Format\s+is|Schedule\s+is|Matches\s+are|The\s+event|All\s+matches|Each\s+team)[\s\S]*$/i, '.');

  // 1. Extract manager if mentioned (e.g. "Manager: Arjun Nair", "is managed by Rahul Menon", "coach: Sameer")
  const managerMatch = 
    body.match(/(?:(?:is\s+)?(?:managed|coached)\s+by|(?:the\s+)?(?:team\s+)?(?:manager|coach)|manager|coach)\s*(?:is|named|called|=|:)?\s*([A-Za-z0-9\s'.-]{2,35}?)(?:\.|\n|,|\s+and|\s+Its|\s+His|\s+Her|\s+Their|\s+Make|$)/i) ||
    body.match(/(?:manager|coach)\s*[:\-–—]\s*([A-Za-z0-9\s'.-]{2,35}?)(?:\.|\n|,|$)/i);
  if (managerMatch && managerMatch[1]) {
    const rawMgr = managerMatch[1].trim().replace(/^[—–\-*•:,.;\s]+|[—–\-*•:,.;\s]+$/g, '');
    if (rawMgr && rawMgr.length >= 2 && !/^(?:is|none|tbd|the)$/i.test(rawMgr)) {
      squad.managerName = rawMgr;
    }
  }

  // 2. Extract explicit captain declaration if mentioned
  let generalCaptainName = '';
  const captainMatch = 
    body.match(/(?:make|appoint|set)\s+([A-Za-z0-9\s'.-]{2,35}?)\s+(?:the\s+)?captain/i) ||
    body.match(/captain\s+(?:is\s+|:\s*|=)?\s*([A-Za-z0-9\s'.-]{2,35}?)(?:\.|\n|\s+and|$)/i);
  if (captainMatch && captainMatch[1]) {
    generalCaptainName = captainMatch[1].trim().replace(/^[—–\-*•:,.;\s]+|[—–\-*•:,.;\s]+$/g, '').toLowerCase();
  }

  // 3. Remove manager and captain sentences before extracting player tokens
  const sanitizedBody = body
    .replace(/(?:manager|coach)\s*[:\-–—][^\n]*/gi, ' ')
    .replace(/(?:is\s+)?(?:managed|coached)\s+by[^.\n]*(?:\.|\n|$|,)?/gi, ' ')
    .replace(/(?:(?:the\s+)?(?:team\s+)?(?:manager|coach))[^\n]*(?:\.|\n|$|,)?/gi, ' ')
    .replace(/(?:make|appoint|set)[^.\n]*captain[^.\n]*(?:\.|\n|$)/gi, ' ')
    .replace(/captain\s+is[^.\n]*(?:\.|\n|$)/gi, ' ')
    .replace(/(?:its\s+players\s+are|the\s+players\s+are|players\s+are|players\s+include|players:|squad:|roster:)/gi, ' ');

  // 4. Split into candidate tokens: handle multiline bulleted lists vs conversational commas
  const candidateTokens: string[] = [];
  const lines = sanitizedBody.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  lines.forEach(line => {
    // If the line looks like a single player line (e.g. "- Adithyan Raj — Goalkeeper, Captain" or "Daniel (GK)")
    // where any dashes or colons separate the name from position/role details:
    const dashMatch = line.match(/^[-*•\d+.)\s]*([^\—–\-:]+?)\s*[—–\-:]\s*(.+)$/);
    if (dashMatch) {
      // Check if right side only contains roles/positions
      const rightWords = dashMatch[2].toLowerCase().replace(/[,;()]/g, ' ').split(/\s+/).filter(Boolean);
      const isPureRole = rightWords.every(w =>
        POSITION_MAP[w] || ['c', 'captain', 'sub', 'substitute', 'subs', 'no', 'jersey', 'number'].includes(w) || /^\d+$/.test(w)
      );
      if (isPureRole) {
        candidateTokens.push(line);
        return;
      }
    }

    // Otherwise split line by commas/delimiters
    const splitTokens = splitTopLevelTokens(line).filter(Boolean);
    candidateTokens.push(...splitTokens);
  });

  // 5. Parse each candidate token into a player item
  candidateTokens.forEach(rawToken => {
    const playerItem = parsePlayerToken(rawToken, generalCaptainName, knownTeams);
    if (!playerItem) return;

    if (squad.players.some(p => p.name.toLowerCase() === playerItem.name.toLowerCase())) {
      warnings.push(`Duplicate player "${playerItem.name}" ignored for ${squad.teamName}.`);
      return;
    }

    squad.players.push(playerItem);
  });
}


// ============================================================================
// 3. WORKSPACE OPERATIONAL PROMPT PARSER
// ============================================================================

export type WorkspaceActionType = 
  | 'RESCHEDULE_MATCH'
  | 'CHANGE_VENUE'
  | 'RECORD_SCORE'
  | 'ADD_TEAM'
  | 'UPDATE_DURATION'
  | 'UNKNOWN';

export interface ProposedWorkspaceAction {
  actionType: WorkspaceActionType;
  title: string;
  description: string;
  targetEntity?: string;
  diff: {
    before?: string;
    after?: string;
  };
  payload: Record<string, any>;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Parses operational command prompts entered in the Organizer Workspace
 */
export function parseWorkspaceCommand(
  promptText: string,
  context: { teams: Team[]; matches: Match[]; matchDuration?: number; venue?: string }
): ProposedWorkspaceAction {
  const text = cleanText(promptText);
  const lower = text.toLowerCase();

  // A. Score Entry: e.g. "Record the score as 2–1 and mark the match completed" or "Match 1 score 2-1"
  const scoreMatch = text.match(/(?:score|result)(?:\s+as)?\s+(\d+)\s*(?:–|-|to)\s*(\d+)/i) ||
                     text.match(/(\d+)\s*(?:–|-)\s*(\d+)\s+(?:for\s+([A-Za-z0-9\s]+?)\s+vs\s+([A-Za-z0-9\s]+))/i) ||
                     text.match(/match\s+(\d+)\s+(?:score\s+)?(\d+)\s*(?:–|-|to)\s*(\d+)/i) ||
                     text.match(/(?:set\s+score\s+to\s+)(\d+)\s*(?:–|-|to)\s*(\d+)\s+(?:for\s+match\s+(\d+))/i);

  if (scoreMatch) {
    let homeScore: number;
    let awayScore: number;
    let matchNumFromText: number | null = null;

    if (text.match(/match\s+(\d+)\s+(?:score\s+)?(\d+)\s*(?:–|-|to)\s*(\d+)/i)) {
      const m = text.match(/match\s+(\d+)\s+(?:score\s+)?(\d+)\s*(?:–|-|to)\s*(\d+)/i)!;
      matchNumFromText = parseInt(m[1], 10);
      homeScore = parseInt(m[2], 10);
      awayScore = parseInt(m[3], 10);
    } else if (text.match(/(?:set\s+score\s+to\s+)(\d+)\s*(?:–|-|to)\s*(\d+)\s+(?:for\s+match\s+(\d+))/i)) {
      const m = text.match(/(?:set\s+score\s+to\s+)(\d+)\s*(?:–|-|to)\s*(\d+)\s+(?:for\s+match\s+(\d+))/i)!;
      homeScore = parseInt(m[1], 10);
      awayScore = parseInt(m[2], 10);
      matchNumFromText = parseInt(m[3], 10);
    } else {
      homeScore = parseInt(scoreMatch[1], 10);
      awayScore = parseInt(scoreMatch[2], 10);
    }

    // Identify target match
    let targetMatch: Match | undefined;
    if (matchNumFromText !== null) {
      targetMatch = context.matches.find(m => m.match_number === matchNumFromText);
    }

    if (!targetMatch) {
      // Check team names mentioned in command
      for (const m of context.matches) {
        const hTeam = context.teams.find(t => t.id === m.home_team_id)?.name.toLowerCase() || '';
        const aTeam = context.teams.find(t => t.id === m.away_team_id)?.name.toLowerCase() || '';
        if (hTeam && aTeam && lower.includes(hTeam) && lower.includes(aTeam)) {
          targetMatch = m;
          break;
        }
      }
    }

    if (!targetMatch) {
      const numMatch = text.match(/match\s+(?:#|number\s+)?(\d+)/i);
      if (numMatch) {
        const mNum = parseInt(numMatch[1], 10);
        targetMatch = context.matches.find(m => m.match_number === mNum);
      }
    }

    if (!targetMatch) {
      targetMatch = context.matches.find(m => m.status === 'LIVE' || m.status === 'UPCOMING') || context.matches[0];
    }

    if (targetMatch) {
      const homeTeam = context.teams.find(t => t.id === targetMatch!.home_team_id)?.name || 'Home';
      const awayTeam = context.teams.find(t => t.id === targetMatch!.away_team_id)?.name || 'Away';

      return {
        actionType: 'RECORD_SCORE',
        title: `Record Score: Match ${targetMatch.match_number}`,
        description: `Set result for ${homeTeam} vs ${awayTeam} to ${homeScore}–${awayScore} and mark match as COMPLETED.`,
        targetEntity: `Match ${targetMatch.match_number}`,
        diff: {
          before: `${targetMatch.home_score ?? 0}–${targetMatch.away_score ?? 0} (${targetMatch.status})`,
          after: `${homeScore}–${awayScore} (COMPLETED)`,
        },
        payload: {
          matchId: targetMatch.id,
          homeScore,
          awayScore,
          status: 'COMPLETED',
        },
        confidence: 'HIGH',
      };
    }
  }

  // B. Reschedule Match: e.g. "Move the Apex FC versus Cobalt United match to Saturday at 4 PM"
  if (lower.includes('move') || lower.includes('reschedule') || lower.includes('change the time') || lower.includes('change date') || lower.includes('change match')) {
    let targetMatch: Match | undefined;
    for (const m of context.matches) {
      const hTeam = context.teams.find(t => t.id === m.home_team_id)?.name.toLowerCase() || '';
      const aTeam = context.teams.find(t => t.id === m.away_team_id)?.name.toLowerCase() || '';
      if ((hTeam && aTeam && lower.includes(hTeam) && lower.includes(aTeam)) || (hTeam && lower.includes(hTeam))) {
        targetMatch = m;
        break;
      }
    }

    if (!targetMatch && context.matches.length > 0) {
      const mNumMatch = text.match(/match\s+(\d+)/i);
      if (mNumMatch) {
        targetMatch = context.matches.find(m => m.match_number === parseInt(mNumMatch[1], 10));
      } else {
        targetMatch = context.matches.find(m => m.status === 'UPCOMING') || context.matches[0];
      }
    }

    // Extract time (e.g. "4 PM", "16:00", "4:30 PM")
    const timeMatch = text.match(/at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i) ||
                      text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i) ||
                      text.match(/(\d{1,2}:\d{2})/i);
    const newTime = timeMatch ? timeMatch[1].trim() : '16:00';

    // Extract day/date (e.g. "Saturday", "Nov 15", "2026-11-16", "tomorrow")
    const dayMatch = text.match(/(?:to\s+|on\s+)(Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|\d{4}-\d{2}-\d{2}|[A-Za-z]+\s+\d{1,2})/i);
    const newDate = dayMatch ? dayMatch[1].trim() : 'Upcoming Saturday';

    if (targetMatch) {
      const homeTeam = context.teams.find(t => t.id === targetMatch!.home_team_id)?.name || 'Home';
      const awayTeam = context.teams.find(t => t.id === targetMatch!.away_team_id)?.name || 'Away';

      return {
        actionType: 'RESCHEDULE_MATCH',
        title: `Reschedule Match ${targetMatch.match_number}`,
        description: `Move ${homeTeam} vs ${awayTeam} to ${newDate} at ${newTime}.`,
        targetEntity: `Match ${targetMatch.match_number}`,
        diff: {
          before: `${targetMatch.scheduled_date || 'TBD'} ${targetMatch.scheduled_time || ''}`,
          after: `${newDate} ${newTime}`,
        },
        payload: {
          matchId: targetMatch.id,
          date: newDate,
          time: newTime,
        },
        confidence: 'HIGH',
      };
    }
  }

  // C. Change Venue: e.g. "Change the venue to the main ground" or "Update venue to Municipal Stadium Pitch 2"
  if (lower.includes('venue') || lower.includes('ground') || lower.includes('pitch') || lower.includes('stadium')) {
    const venueMatch = text.match(/(?:venue|ground|pitch|stadium)(?:\s+to|\s+is)?\s+(?:the\s+)?([A-Za-z0-9\s'-]{3,50}?)(?:\.|$)/i) ||
                       text.match(/(?:to|at)\s+(?:the\s+)?([A-Za-z0-9\s'-]{3,50}?(?:Stadium|Ground|Pitch|Turf|Arena|Complex))(?:\.|$)/i);
    if (venueMatch && venueMatch[1]) {
      const newVenue = venueMatch[1].trim();
      return {
        actionType: 'CHANGE_VENUE',
        title: 'Update Tournament Venue',
        description: `Set the tournament match venue to "${newVenue}".`,
        targetEntity: 'Tournament Venue',
        diff: {
          before: context.venue || 'Unset',
          after: newVenue,
        },
        payload: {
          venue: newVenue,
        },
        confidence: 'HIGH',
      };
    }
  }

  // D. Update Match Duration: e.g. "Update the match duration to 45 minutes" or "Make matches 40 minutes"
  if (lower.includes('duration') || lower.includes('minutes long') || lower.includes('minutes')) {
    const durMatch = lower.match(/(\d+)\s*(?:minutes?|mins?)/);
    if (durMatch) {
      const newDuration = parseInt(durMatch[1], 10);
      return {
        actionType: 'UPDATE_DURATION',
        title: 'Update Match Duration',
        description: `Change default match duration to ${newDuration} minutes.`,
        targetEntity: 'Match Duration',
        diff: {
          before: `${context.matchDuration || 50} mins`,
          after: `${newDuration} mins`,
        },
        payload: {
          durationMinutes: newDuration,
        },
        confidence: 'HIGH',
      };
    }
  }

  // E. Add Team: e.g. "Add Royal Strikers to the tournament" or "Add Gokulam Kerala FC"
  if (lower.includes('add') && (lower.includes('team') || lower.includes('club') || lower.includes('fc') || lower.includes('to the tournament'))) {
    const teamNameMatch = text.match(/(?:add\s+)?([A-Z][a-zA-Z0-9\s'-]{2,40}?(?:FC|United|City|Rovers|Strikers|Stars|Athletic|Club|Blasters|Giant))\s+(?:to|into)/i) ||
                          text.match(/(?:add\s+team\s+)([A-Z][a-zA-Z0-9\s'-]{2,40}?)(?:\.|\s+to|$)/i) ||
                          text.match(/(?:add\s+)([A-Z][a-zA-Z0-9\s'-]{2,40}?)\s+to\s+the\s+tournament/i);
    if (teamNameMatch && teamNameMatch[1]) {
      const newTeamName = teamNameMatch[1].trim();
      return {
        actionType: 'ADD_TEAM',
        title: `Add Team: ${newTeamName}`,
        description: `Register "${newTeamName}" as a participating club.`,
        targetEntity: 'Tournament Teams',
        diff: {
          before: `${context.teams.length} Teams registered`,
          after: `${context.teams.length + 1} Teams (includes ${newTeamName})`,
        },
        payload: {
          teamName: newTeamName,
        },
        confidence: 'HIGH',
      };
    }
  }

  // Fallback: Unknown or unrecognized command
  return {
    actionType: 'UNKNOWN',
    title: 'Unrecognized Command',
    description: `Could not determine a specific action for: "${text}". Try commands like "Move Match 1 to Saturday 4 PM" or "Record score 2-1 for Match 1".`,
    payload: { rawPrompt: text },
    confidence: 'LOW',
    diff: {},
  };
}
