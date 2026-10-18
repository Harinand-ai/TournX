import { describe, it, expect } from 'vitest';
import { normalizeMediaName, calculateSimilarity, matchMediaFiles } from '../mediaMatcher';
import { Team, Player } from '../../types/tournament';

describe('Media Matcher — Filename Normalization & Matching', () => {
  it('normalizes filenames by stripping extensions, punctuation, and copy numbers', () => {
    expect(normalizeMediaName('ADWAITH K(1).jpg')).toBe('adwaith k');
    expect(normalizeMediaName('ADWAITH K(2).jpg')).toBe('adwaith k');
    expect(normalizeMediaName('Kerala Blasters FC.png')).toBe('kerala blasters fc');
    expect(normalizeMediaName('Abhijith P P.jpeg')).toBe('abhijith p p');
    expect(normalizeMediaName('UHM AHDAL RAHMAN.jpeg')).toBe('uhm ahdal rahman');
  });

  it('calculates similarity scores correctly for exact and substring matches', () => {
    expect(calculateSimilarity('adwaith k', 'adwaith k')).toBe(1.0);
    expect(calculateSimilarity('kerala blasters', 'kerala blasters fc')).toBeGreaterThan(0.7);
    expect(calculateSimilarity('arsenal', 'chelsea')).toBeLessThan(0.3);
  });

  it('matches files to teams and players with status and ambiguity warnings', () => {
    const teams: Team[] = [
      { id: 'tm-1', name: 'Kerala Blasters', short_name: 'KBFC', primary_color: '#facc15', secondary_color: '#1e3a8a' },
      { id: 'tm-2', name: 'Bengaluru FC', short_name: 'BFC', primary_color: '#2563eb', secondary_color: '#dc2626' },
    ];

    const players: Player[] = [
      { id: 'pl-1', team_id: 'tm-1', name: 'Adwaith K', position: 'MID', is_captain: false },
      { id: 'pl-2', team_id: 'tm-1', name: 'Abhijith P P', position: 'DEF', is_captain: false },
      { id: 'pl-3', team_id: 'tm-2', name: 'Adwaith Menon', position: 'FWD', is_captain: false },
    ];

    // Mock File objects (with minimal size)
    const file1 = new File(['mock'], 'Kerala Blasters.png', { type: 'image/png' });
    const file2 = new File(['mock'], 'ADWAITH K(1).jpg', { type: 'image/jpeg' });
    const file3 = new File(['mock'], 'Unknown Player.jpg', { type: 'image/jpeg' });

    const matches = matchMediaFiles([file1, file2, file3], teams, players);

    expect(matches).toHaveLength(3);

    // File 1 -> Team Logo Kerala Blasters
    expect(matches[0].targetType).toBe('TEAM_LOGO');
    expect(matches[0].targetId).toBe('tm-1');

    // File 2 -> Player Photo Adwaith K
    expect(matches[1].targetType).toBe('PLAYER_PHOTO');
    expect(matches[1].targetId).toBe('pl-1');

    // File 3 -> Unmatched
    expect(matches[2].status).toBe('UNMATCHED');
    expect(matches[2].targetType).toBe('UNASSIGNED');
  });
});
