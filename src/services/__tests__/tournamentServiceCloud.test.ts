import { describe, it, expect, beforeEach } from 'vitest';
import { tournamentService } from '../tournamentService';
import { localDataService, DEMO_TOURNAMENT_ID } from '../localDataService';

describe('TournamentService — Dual-Mode Persistence & Error Transparency', () => {
  beforeEach(() => {
    localDataService.resetDemoData();
  });

  it('preserves offline local synthetic mode for default demo tournament', async () => {
    const teams = await tournamentService.getTeams(DEMO_TOURNAMENT_ID);
    expect(teams.length).toBeGreaterThan(0);
    expect(teams.some(t => t.name.includes('Apex'))).toBe(true);
  });

  it('transparently throws an explicit error if cloud tournament creation is attempted without authentication', async () => {
    // Attempting to create tournament when unauthenticated must NOT silently mask the failure
    await expect(
      tournamentService.createTournament({
        name: 'Cloud Test Cup',
        season: '2026',
      })
    ).rejects.toThrow(/authentication required/i);
  });

  it('guarantees that local synthetic tournaments can be created and listed in local mode', async () => {
    const localTourney = localDataService.createTournament({
      name: 'Local Synthetic League',
      season: '2026',
    });

    expect(localTourney).toBeDefined();
    expect(localTourney.slug).toBe('local-synthetic-league');

    const all = localDataService.getAllTournaments();
    expect(all.some(t => t.id === localTourney.id)).toBe(true);
  });
});
