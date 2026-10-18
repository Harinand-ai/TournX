import { describe, it, expect, beforeEach } from 'vitest';
import { localDataService, DEMO_TOURNAMENT_ID } from '../localDataService';
import { tournamentService } from '../tournamentService';

describe('Tournament Lifecycle, Returning Users & Single-Organizer Constraint', () => {
  beforeEach(() => {
    localDataService.resetDemoData();
    localDataService.clearLastJoinedTournament();
  });

  it('enforces that an organizer account may own only ONE active tournament at a time', () => {
    const organizerId = 'org-user-123';

    // 1. Organizer creates their first tournament -> should succeed
    const firstTourney = localDataService.createTournament({
      name: 'Kerala Monsoon Cup',
      season: '2026',
      organizerId,
    });

    expect(firstTourney).toBeDefined();
    expect(firstTourney.created_by).toBe(organizerId);

    // 2. Same organizer attempts to create a second tournament without deleting the first -> throws error
    expect(() => {
      localDataService.createTournament({
        name: 'Kerala Winter League',
        season: '2026',
        organizerId,
      });
    }).toThrow(/already own an active tournament/i);

    // 3. A different organizer can create a tournament without conflict
    const otherOrganizerTourney = localDataService.createTournament({
      name: 'Bengaluru Open',
      season: '2026',
      organizerId: 'org-user-456',
    });
    expect(otherOrganizerTourney).toBeDefined();

    // 4. Once the first organizer deletes their tournament, they can create another
    localDataService.deleteTournament(firstTourney.id);

    const secondTourney = localDataService.createTournament({
      name: 'Kerala Winter League',
      season: '2026',
      organizerId,
    });
    expect(secondTourney).toBeDefined();
    expect(secondTourney.name).toBe('Kerala Winter League');
  });

  it('remembers the last joined tournament on the device for returning users', () => {
    // 1. Initially no tournament is joined
    expect(localDataService.getLastJoinedTournament().id).toBeNull();

    // 2. User joins tournament
    localDataService.setLastJoinedTournament('tourney-abc', 'monsoon-cup');
    expect(localDataService.getLastJoinedTournament()).toEqual({
      id: 'tourney-abc',
      slug: 'monsoon-cup',
    });

    // 3. User leaves tournament -> preference is cleared
    localDataService.clearLastJoinedTournament();
    expect(localDataService.getLastJoinedTournament().id).toBeNull();
  });

  it('correctly detects expired and soft-deleted tournaments', () => {
    const active = localDataService.createTournament({
      name: 'Active League',
      inactivityDays: 10,
    });

    // Check active
    const activeCheck = localDataService.isTournamentExpiredOrDeleted(active);
    expect(activeCheck.isDeleted).toBe(false);
    expect(activeCheck.isExpired).toBe(false);

    // Soft delete
    localDataService.softDeleteTournament(active.id);
    const deletedTourney = localDataService.getTournamentById(active.id)!;
    const deletedCheck = localDataService.isTournamentExpiredOrDeleted(deletedTourney);
    expect(deletedCheck.isDeleted).toBe(true);

    // Expired tournament
    const pastDate = new Date(Date.now() - 100000).toISOString();
    const expiredTourney = {
      ...active,
      expires_at: pastDate,
      deleted_at: null,
      status: 'REGISTRATION' as const,
    };
    const expiredCheck = localDataService.isTournamentExpiredOrDeleted(expiredTourney);
    expect(expiredCheck.isExpired).toBe(true);
  });
});
