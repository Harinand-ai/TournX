import { describe, it, expect, beforeEach } from 'vitest';
import { localDataService, DEMO_TOURNAMENT_ID } from '../localDataService';
import { tournamentService } from '../tournamentService';
import { parseTournamentPrompt } from '../../utils/promptParsers';
import { Tournament } from '../../types/multiTenant';

describe('Cross-Tournament Code Isolation, SQL Injection & Data Security Audit', () => {
  const tourneyAId = 'tourney-sec-a-uuid';
  const tourneyBId = 'tourney-sec-b-uuid';
  const organizerAId = 'org-user-alpha-001';
  const organizerBId = 'org-user-beta-002';

  beforeEach(() => {
    localDataService.resetDemoData();
    localDataService.clearLastJoinedTournament();
    localDataService.setDevAdminLoggedIn(false);

    // Register two completely separate tournaments with separate owners
    const tourneyA: Tournament = {
      id: tourneyAId,
      name: 'Tournament Alpha',
      slug: 'tourney-alpha-2026',
      status: 'IN_PROGRESS',
      visibility: 'PUBLIC',
      created_by: organizerAId,
      rules_config: {
        points_for_win: 3,
        points_for_draw: 1,
        points_for_loss: 0,
        tie_breaker_order: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR'],
        match_duration_minutes: 50,
        half_time_duration_minutes: 10,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const tourneyB: Tournament = {
      id: tourneyBId,
      name: 'Tournament Beta (Private)',
      slug: 'tourney-beta-private-2026',
      status: 'REGISTRATION',
      visibility: 'PRIVATE',
      created_by: organizerBId,
      rules_config: {
        points_for_win: 3,
        points_for_draw: 1,
        points_for_loss: 0,
        tie_breaker_order: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR'],
        match_duration_minutes: 40,
        half_time_duration_minutes: 10,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localDataService.registerTournament(tourneyA);
    localDataService.registerTournament(tourneyB);

    // Add teams to Tournament A
    localDataService.setTeams([
      { id: 'team-a-1', name: 'Alpha Lions', short_name: 'LIO' },
      { id: 'team-a-2', name: 'Alpha Eagles', short_name: 'EAG' }
    ], tourneyAId);

    // Add teams to Tournament B
    localDataService.setTeams([
      { id: 'team-b-1', name: 'Beta Sharks', short_name: 'SHA' },
      { id: 'team-b-2', name: 'Beta Tigers', short_name: 'TIG' }
    ], tourneyBId);
  });

  describe('1. Tournament Code Isolation Between Different Tournaments', () => {
    it('rejects Tournament A access code when redeemed against Tournament B', async () => {
      // Generate a VIEW and SCORE code for Tournament A
      const { rawCode: rawViewA } = localDataService.generateAccessCode(tourneyAId, 'VIEW', 'Alpha Spectator');
      const { rawCode: rawScoreA } = localDataService.generateAccessCode(tourneyAId, 'SCORE', 'Alpha Scorekeeper');

      // Attempt to verify Tournament A's code against Tournament B
      const verifyBWithAView = await tournamentService.verifyAccessCode(tourneyBId, rawViewA);
      expect(verifyBWithAView.success).toBe(false);
      expect(verifyBWithAView.role).toBeUndefined();

      const verifyBWithAScore = await tournamentService.verifyAccessCode(tourneyBId, rawScoreA);
      expect(verifyBWithAScore.success).toBe(false);
      expect(verifyBWithAScore.role).toBeUndefined();

      // Session role for Tournament B must remain ANONYMOUS
      const sessionB = localDataService.getSessionRole(tourneyBId);
      expect(sessionB).toBe('ANONYMOUS');
      expect(sessionB).not.toBe('VIEW');
      expect(sessionB).not.toBe('SCORE');
      expect(sessionB).not.toBe('ORGANIZER');
    });

    it('rejects access codes altered by a single character (off-by-one tampering)', async () => {
      const { rawCode } = localDataService.generateAccessCode(tourneyAId, 'VIEW', 'Alpha Pass');

      // Alter the last character
      const lastChar = rawCode.slice(-1);
      const mutatedChar = lastChar === '9' ? '8' : '9';
      const mutatedCode = rawCode.slice(0, -1) + mutatedChar;

      const result = await tournamentService.verifyAccessCode(tourneyAId, mutatedCode);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid or revoked/i);
    });

    it('rejects revoked access codes immediately', async () => {
      const { rawCode, code } = localDataService.generateAccessCode(tourneyAId, 'SCORE', 'Score Pass');
      
      // Verify valid before revocation
      const validRes = await tournamentService.verifyAccessCode(tourneyAId, rawCode);
      expect(validRes.success).toBe(true);

      // Revoke the code
      localDataService.revokeAccessCode(tourneyAId, code.id);

      // Verify redemption fails after revocation
      const revokedRes = await tournamentService.verifyAccessCode(tourneyAId, rawCode);
      expect(revokedRes.success).toBe(false);
      expect(revokedRes.error).toMatch(/invalid or revoked/i);
    });
  });

  describe('2. Cross-Tournament Data Scoping & UUID Isolation', () => {
    it('scopes team queries strictly to the target tournament without data leakage', () => {
      const teamsA = localDataService.getTeams(tourneyAId);
      const teamsB = localDataService.getTeams(tourneyBId);

      expect(teamsA.length).toBe(2);
      expect(teamsA.map(t => t.name)).toContain('Alpha Lions');
      expect(teamsA.map(t => t.name)).not.toContain('Beta Sharks');

      expect(teamsB.length).toBe(2);
      expect(teamsB.map(t => t.name)).toContain('Beta Sharks');
      expect(teamsB.map(t => t.name)).not.toContain('Alpha Lions');
    });

    it('prevents a non-owner from deleting another tournament', () => {
      // Attacker attempts to delete Tournament B without owner credentials
      expect(() => {
        localDataService.deleteTournament(tourneyBId, organizerAId);
      }).toThrow(/unauthorized/i);

      // Verify Tournament B is still intact
      const tourneyB = localDataService.getTournamentById(tourneyBId);
      expect(tourneyB).not.toBeNull();
      expect(tourneyB?.id).toBe(tourneyBId);
    });

    it('allows owner to delete their own tournament safely', () => {
      localDataService.deleteTournament(tourneyAId, organizerAId);

      const checkA = localDataService.getTournamentById(tourneyAId);
      expect(checkA).toBeNull();

      // Tournament B must be completely unaffected
      const checkB = localDataService.getTournamentById(tourneyBId);
      expect(checkB).not.toBeNull();
    });
  });

  describe('3. SQL Injection & Malicious String Handling', () => {
    it('safely handles SQL injection attempts in tournament names and prompts without syntax errors', () => {
      const sqlInjectionPrompts = [
        "Create tournament called '; DROP TABLE tournaments; -- with Team 1, Team 2",
        "Create tournament called Kerala Champions' OR '1'='1 with 4 teams",
        "Tournament with 1' UNION SELECT * FROM users; -- with Alpha FC, Beta FC",
        "Teams are <script>alert('xss')</script> and Normal FC. Make tournament."
      ];

      for (const prompt of sqlInjectionPrompts) {
        expect(() => {
          const parsed = parseTournamentPrompt(prompt);
          expect(parsed).toBeDefined();

          // Test registration in localDataService with malicious strings
          const injectedTourney: Tournament = {
            id: `tourney-sqli-${Date.now()}-${Math.random()}`,
            name: parsed.name || "Safe Default",
            slug: `injected-slug-${Date.now()}-${Math.random()}`,
            status: 'REGISTRATION',
            visibility: 'PUBLIC',
            rules_config: {
              points_for_win: 3,
              points_for_draw: 1,
              points_for_loss: 0,
              tie_breaker_order: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR'],
              match_duration_minutes: 50,
              half_time_duration_minutes: 10,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          localDataService.registerTournament(injectedTourney);
          const retrieved = localDataService.getTournamentById(injectedTourney.id);
          expect(retrieved).not.toBeNull();
          expect(retrieved?.id).toBe(injectedTourney.id);
        }).not.toThrow();
      }
    });

    it('sanitizes and safely handles special characters and malicious input in access codes', async () => {
      const maliciousCodes = [
        "' OR '1'='1",
        "'; DROP TABLE access_codes; --",
        "TX-VIEW-<script>alert(1)</script>",
        "../../etc/passwd",
        "%00%27%20OR%201=1",
      ];

      for (const code of maliciousCodes) {
        const result = await tournamentService.verifyAccessCode(tourneyAId, code);
        expect(result.success).toBe(false);
        expect(result.role).toBeUndefined();
      }
    });
  });

  describe('4. Single-Active-Tournament Organizer Constraint', () => {
    it('enforces that an organizer account may own only one active tournament at a time', () => {
      // Attempting to create a second active tournament under organizerAId
      expect(() => {
        localDataService.createTournament({
          name: 'Tournament Alpha Second Edition',
          organizerId: organizerAId,
        });
      }).toThrow(/already own an active tournament/i);
    });

    it('allows creating a new tournament once the previous active tournament is deleted or completed', () => {
      // Owner deletes Tournament A
      localDataService.deleteTournament(tourneyAId, organizerAId);

      // Now creation is permitted
      expect(() => {
        localDataService.createTournament({
          name: 'Tournament Alpha Successor',
          organizerId: organizerAId,
        });
      }).not.toThrow();
    });
  });
});
