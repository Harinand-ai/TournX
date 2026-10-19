import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tournamentService } from '../tournamentService';
import { localDataService, DEMO_TOURNAMENT_ID } from '../localDataService';
import { parseTournamentPrompt } from '../../utils/promptParsers';
import * as supabaseModule from '../../lib/supabase';

describe('Production-Ready Testing Mode & Auth Hardening', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localDataService.resetDemoData();
    localDataService.setDevAdminLoggedIn(false);
  });

  describe('1. Synthetic Authentication Safeguards', () => {
    it('prohibits synthetic dev admin when import.meta.env.DEV is false', () => {
      const originalDev = import.meta.env.DEV;
      try {
        (import.meta.env as any).DEV = false;

        // Even if someone calls setDevAdminLoggedIn(true)
        localDataService.setDevAdminLoggedIn(true);

        // isDevAdminLoggedIn must strictly return false in non-DEV environments
        expect(localDataService.isDevAdminLoggedIn()).toBe(false);
      } finally {
        (import.meta.env as any).DEV = originalDev;
      }
    });

    it('preserves dev admin only when import.meta.env.DEV is true or during test runner', () => {
      localDataService.setDevAdminLoggedIn(true);
      expect(localDataService.isDevAdminLoggedIn()).toBe(true);

      localDataService.setDevAdminLoggedIn(false);
      expect(localDataService.isDevAdminLoggedIn()).toBe(false);
    });
  });

  describe('2. Failed Supabase Operations Never Reported as Successful', () => {
    it('throws an explicit error on unauthenticated cloud tournament creation instead of creating synthetic data', async () => {
      vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
        from: vi.fn(),
      } as any);

      const originalDev = import.meta.env.DEV;
      try {
        (import.meta.env as any).DEV = false;

        await expect(
          tournamentService.createTournament({
            name: 'Production Test Cup',
            visibility: 'PUBLIC',
          })
        ).rejects.toThrow(/organizer/i);
      } finally {
        (import.meta.env as any).DEV = originalDev;
      }
    });

    it('propagates Supabase database insert error without silent success fallback', async () => {
      vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'real-user-123', email: 'organizer@real.com' } },
            error: null,
          }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'tournaments') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: '42P01', message: 'relation tournaments does not exist' },
                  }),
                }),
              }),
            };
          }
          return {};
        }),
      } as any);

      await expect(
        tournamentService.createTournament({
          name: 'Real Production Cup',
          visibility: 'PUBLIC',
        })
      ).rejects.toThrow(/relation tournaments does not exist/i);
    });
  });

  describe('3. Organizer Authorization and Public Participant Access', () => {
    it('allows public participant access to tournament data without an organizer session', async () => {
      localDataService.setDevAdminLoggedIn(false);

      const tournament = await tournamentService.getTournament(DEMO_TOURNAMENT_ID);
      expect(tournament).not.toBeNull();
      expect(tournament?.visibility).toBe('PUBLIC');

      // Participant can load teams, fixtures, and standings without credentials
      const teams = await tournamentService.getTeams(DEMO_TOURNAMENT_ID);
      expect(teams.length).toBeGreaterThan(0);

      const matches = await tournamentService.getMatches(DEMO_TOURNAMENT_ID);
      expect(matches.length).toBeGreaterThan(0);

      const role = localDataService.getSessionRole(DEMO_TOURNAMENT_ID);
      expect(role).toBe('ANONYMOUS');
    });

    it('enforces modifier access code permissions without granting organizer rights', () => {
      const accessCode = localDataService.generateAccessCode(DEMO_TOURNAMENT_ID, 'SCORE', 'Scorekeeper Device');
      expect(accessCode.rawCode).toBeDefined();

      const verification = localDataService.verifyAccessCode(DEMO_TOURNAMENT_ID, accessCode.rawCode);
      expect(verification.success).toBe(true);
      expect(verification.role).toBe('SCORE');

      // Active role should now be SCORE (can record match events, cannot delete tournament)
      expect(localDataService.getSessionRole(DEMO_TOURNAMENT_ID)).toBe('SCORE');
    });

    it('rejects invalid or tampered access codes', () => {
      const verification = localDataService.verifyAccessCode(DEMO_TOURNAMENT_ID, 'INVALID-1234');
      expect(verification.success).toBe(false);
      expect(verification.error).toBeDefined();
    });

    it('prevents unauthorized tournament deletion and protects system demo tournament', async () => {
      await expect(
        tournamentService.deleteTournament(DEMO_TOURNAMENT_ID)
      ).rejects.toThrow(/default TournX demo tournament cannot be deleted/i);
    });
  });

  describe('4. Missing Date and Venue Are Never Synthesized', () => {
    it('does not invent date or venue when not provided by user in prompt', () => {
      const parsed = parseTournamentPrompt('Four teams: Alpha, Beta, Gamma, Delta. Make tournament.');
      expect(parsed.startDate).toBeFalsy();
      expect(parsed.startDateIso).toBeNull();
      expect(parsed.venue).toBeFalsy();
      expect(parsed.missingFields).toContain('Start date');
      expect(parsed.missingFields).toContain('Venue / match location');
    });
  });
});
