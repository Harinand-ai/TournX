/**
 * TournX Bulk Media Filename Normalization & Matching Utility
 * think.prompt.organise
 *
 * Implements deterministic matching between uploaded image filenames (PNG, JPEG, WebP)
 * and tournament team logos or player photos.
 */

import { Team, Player } from '../types/tournament';

export type MediaTargetType = 'TEAM_LOGO' | 'PLAYER_PHOTO' | 'UNASSIGNED';

export type MatchStatus = 'EXACT' | 'FUZZY' | 'AMBIGUOUS' | 'UNMATCHED';

export interface ProposedMediaMatch {
  file: File;
  fileName: string;
  normalizedName: string;
  fileSize: number;
  previewUrl: string;
  status: MatchStatus;
  targetType: MediaTargetType;
  targetId: string | null;
  targetName: string | null;
  possibleCandidates: { id: string; name: string; type: MediaTargetType; score: number }[];
  warning?: string;
}

/**
 * Normalizes text for comparing names and filenames.
 * e.g., "ADWAITH K(1).jpg" -> "adwaith k"
 * e.g., "FC Goa.png" -> "fc goa"
 */
export function normalizeMediaName(input: string): string {
  return input
    // Remove extension
    .replace(/\.[a-zA-Z0-9]+$/, '')
    // Remove parenthetical numbers e.g. (1), (2), [1]
    .replace(/[\(\[]\d+[\)\]]/g, '')
    // Replace underscores, hyphens, periods with space
    .replace(/[._-]+/g, ' ')
    // Remove extra punctuation
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Calculates similarity score between two normalized strings (0 to 1).
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  // Exact substring match
  if (a.includes(b) || b.includes(a)) {
    const minLen = Math.min(a.length, b.length);
    const maxLen = Math.max(a.length, b.length);
    return 0.8 + 0.2 * (minLen / maxLen);
  }

  // Token overlap (e.g. "Adwaith K" vs "K Adwaith")
  const tokensA = new Set(a.split(' ').filter(t => t.length > 0));
  const tokensB = new Set(b.split(' ').filter(t => t.length > 0));
  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  if (union === 0) return 0;
  return intersection / union;
}

/**
 * Matches a list of uploaded files to teams and players.
 */
export function matchMediaFiles(
  files: File[],
  teams: Team[],
  players: Player[]
): ProposedMediaMatch[] {
  const results: ProposedMediaMatch[] = [];

  for (const file of files) {
    const rawName = file.name;
    const normalized = normalizeMediaName(rawName);
    const previewUrl = URL.createObjectURL(file);

    const candidates: { id: string; name: string; type: MediaTargetType; score: number }[] = [];

    // 1. Check Teams (for team logos)
    for (const team of teams) {
      const normTeam = normalizeMediaName(team.name);
      const score = calculateSimilarity(normalized, normTeam);
      if (score >= 0.7) {
        candidates.push({ id: team.id, name: team.name, type: 'TEAM_LOGO', score });
      }
    }

    // 2. Check Players (for player photos)
    for (const player of players) {
      const normPlayer = normalizeMediaName(player.name);
      const score = calculateSimilarity(normalized, normPlayer);
      if (score >= 0.7) {
        const team = teams.find(t => t.id === player.team_id);
        const displayName = team ? `${player.name} (${team.short_name || team.name})` : player.name;
        candidates.push({ id: player.id, name: displayName, type: 'PLAYER_PHOTO', score });
      }
    }

    // Sort by highest score
    candidates.sort((a, b) => b.score - a.score);

    let status: MatchStatus = 'UNMATCHED';
    let targetType: MediaTargetType = 'UNASSIGNED';
    let targetId: string | null = null;
    let targetName: string | null = null;
    let warning: string | undefined = undefined;

    if (candidates.length === 0) {
      status = 'UNMATCHED';
      warning = 'No matching team or player found. You can select one manually.';
    } else if (candidates.length === 1 || (candidates[0].score >= 0.95 && candidates[0].score > (candidates[1]?.score || 0) + 0.15)) {
      // Clear winner
      const best = candidates[0];
      status = best.score === 1.0 ? 'EXACT' : 'FUZZY';
      targetType = best.type;
      targetId = best.id;
      targetName = best.name;
    } else {
      // Ambiguous multiple close matches
      status = 'AMBIGUOUS';
      const best = candidates[0];
      targetType = best.type;
      targetId = best.id;
      targetName = best.name;
      warning = `Multiple close matches detected (${candidates.map(c => c.name).slice(0, 3).join(', ')}). Please verify the assignment.`;
    }

    results.push({
      file,
      fileName: rawName,
      normalizedName: normalized,
      fileSize: file.size,
      previewUrl,
      status,
      targetType,
      targetId,
      targetName,
      possibleCandidates: candidates,
      warning,
    });
  }

  return results;
}

/**
 * Converts a File object into a base64 Data URL.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });
}
