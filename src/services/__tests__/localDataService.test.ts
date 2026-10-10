import { describe, it, expect, beforeEach } from 'vitest';
import { localDataService, DEMO_TOURNAMENT_ID } from '../localDataService';

describe('LocalDataService — Multi-Tournament Isolation & Foundation', () => {
  beforeEach(() => {
    localDataService.resetDemoData();
  });

  it('initializes with default demo tournament', () => {
    const tournaments = localDataService.getAllTournaments();
    expect(tournaments.length).toBeGreaterThanOrEqual(1);

    const demo = localDataService.getTournamentById(DEMO_TOURNAMENT_ID);
    expect(demo).not.toBeNull();
    expect(demo?.name).toContain('TournX');
    expect(demo?.slug).toBe('tournx-championship');
  });

  it('creates an independent new tournament with unique slug', () => {
    const newTourney = localDataService.createTournament({
      name: 'Spring Super Cup',
      season: '2026',
      description: 'Test tournament B',
    });

    expect(newTourney.id).toMatch(/^tourney-/);
    expect(newTourney.slug).toBe('spring-super-cup');

    // Retrieve by slug
    const foundBySlug = localDataService.getTournamentBySlug('spring-super-cup');
    expect(foundBySlug?.id).toBe(newTourney.id);

    // Create another with the exact same name -> slug collision avoided by suffix
    const duplicate = localDataService.createTournament({
      name: 'Spring Super Cup',
    });
    expect(duplicate.slug).toBe('spring-super-cup-1');
  });

  it('guarantees strict data isolation between multiple tournaments', () => {
    // 1. Check demo tournament teams
    const demoTeams = localDataService.getTeams(DEMO_TOURNAMENT_ID);
    expect(demoTeams.length).toBe(4);

    // 2. Create Tournament B
    const tourneyB = localDataService.createTournament({
      name: 'Youth Premier League',
    });

    // 3. Tournament B starts with zero teams
    const teamsB = localDataService.getTeams(tourneyB.id);
    expect(teamsB).toHaveLength(0);

    // 4. Add a team specifically to Tournament B
    localDataService.addPlayer(
      {
        id: 'p-custom-1',
        team_id: 'team-custom-b',
        name: 'Custom Striker',
        position: 'CF',
        is_captain: true,
      },
      tourneyB.id
    );

    // 5. Verify team/player was NOT added to the Demo tournament
    const demoPlayers = localDataService.getPlayers(DEMO_TOURNAMENT_ID);
    expect(demoPlayers.some(p => p.id === 'p-custom-1')).toBe(false);

    // 6. Verify player IS in Tournament B
    const bPlayers = localDataService.getPlayers(tourneyB.id);
    expect(bPlayers.some(p => p.id === 'p-custom-1')).toBe(true);
  });

  it('resets demo tournament without deleting user-created tournaments', () => {
    // 1. Create a custom tournament
    const custom = localDataService.createTournament({
      name: 'Preserved Cup',
    });

    const beforeCount = localDataService.getAllTournaments().length;

    // 2. Execute resetDemoData()
    localDataService.resetDemoData();

    // 3. Custom tournament MUST still exist!
    const afterCount = localDataService.getAllTournaments().length;
    expect(afterCount).toBe(beforeCount);

    const preserved = localDataService.getTournamentById(custom.id);
    expect(preserved).not.toBeNull();
    expect(preserved?.name).toBe('Preserved Cup');
  });

  it('generates and manages cryptographic access codes per tournament', () => {
    const { rawCode, code } = localDataService.generateAccessCode(
      DEMO_TOURNAMENT_ID,
      'SCORE',
      'Field Scorer 1'
    );

    expect(rawCode).toHaveLength(8);
    expect(code.role).toBe('SCORE');
    expect(code.is_active).toBe(true);

    const codes = localDataService.getAccessCodes(DEMO_TOURNAMENT_ID);
    expect(codes.some(c => c.id === code.id)).toBe(true);

    // Revoke code
    localDataService.revokeAccessCode(DEMO_TOURNAMENT_ID, code.id);
    const updatedCodes = localDataService.getAccessCodes(DEMO_TOURNAMENT_ID);
    const revoked = updatedCodes.find(c => c.id === code.id);
    expect(revoked?.is_active).toBe(false);
    expect(revoked?.revoked_at).not.toBeNull();
  });

  it('verifies valid access codes and unlocks corresponding role', () => {
    const { rawCode, code } = localDataService.generateAccessCode(
      DEMO_TOURNAMENT_ID,
      'SCORE',
      'Scorer Official Key'
    );

    const verification = localDataService.verifyAccessCode(DEMO_TOURNAMENT_ID, rawCode);
    expect(verification.success).toBe(true);
    expect(verification.role).toBe('SCORE');

    // Role is granted to session
    expect(localDataService.getSessionRole(DEMO_TOURNAMENT_ID)).toBe('SCORE');

    // Revoked code cannot be verified
    localDataService.revokeAccessCode(DEMO_TOURNAMENT_ID, code.id);
    const verificationRevoked = localDataService.verifyAccessCode(DEMO_TOURNAMENT_ID, rawCode);
    expect(verificationRevoked.success).toBe(false);
    expect(verificationRevoked.error).toContain('revoked');
  });

  it('rate-limits repeated invalid access code attempts', () => {
    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      localDataService.verifyAccessCode(DEMO_TOURNAMENT_ID, `WRONG_${i}`);
    }

    // 6th attempt should trigger rate limiting error
    const blocked = localDataService.verifyAccessCode(DEMO_TOURNAMENT_ID, 'ANOTHER_WRONG');
    expect(blocked.success).toBe(false);
    expect(blocked.error).toContain('Rate limit exceeded');
  });
});

