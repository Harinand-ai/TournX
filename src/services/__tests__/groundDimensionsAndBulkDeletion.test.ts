import { describe, it, expect, beforeEach } from 'vitest';
import { localDataService, FTM_STORAGE_KEYS } from '../localDataService';
import { tournamentService } from '../tournamentService';
import { GROUND_FORMAT_SPECS, FootballPitchFormat } from '../../components/pitch/FootballGroundOverview';

describe('TournX Ground Dimensions & Complete Deletion Tests', () => {
  beforeEach(() => {
    localDataService.resetDemoData();
    localDataService.deleteAllDrafts();
  });

  describe('1. Authoritative Football Ground Dimensions & Standards', () => {
    const formats: FootballPitchFormat[] = [
      '5-a-side',
      '6-a-side',
      '7-a-side',
      '8-a-side',
      '9-a-side',
      '11-a-side'
    ];

    it('supports all 6 required football formats with authoritative governing body sources', () => {
      for (const format of formats) {
        const spec = GROUND_FORMAT_SPECS[format];
        expect(spec).toBeDefined();
        expect(spec.source).toBeDefined();
        expect(spec.source.length).toBeGreaterThan(0);
        expect(spec.label).toBeDefined();
        expect(typeof spec.isMandatoryStandard).toBe('boolean');
      }
    });

    it('enforces that length exceeds width for every format', () => {
      for (const format of formats) {
        const spec = GROUND_FORMAT_SPECS[format];
        expect(spec.standardLength).toBeGreaterThan(spec.standardWidth);
        expect(spec.minLength).toBeGreaterThan(spec.minWidth);
        expect(spec.maxLength).toBeGreaterThan(spec.maxWidth);
      }
    });

    it('matches authoritative FIFA / IFAB standards for 11-a-side pitch', () => {
      const eleven = GROUND_FORMAT_SPECS['11-a-side'];
      expect(eleven.standardLength).toBe(105);
      expect(eleven.standardWidth).toBe(68);
      expect(eleven.penaltyDepth).toBe(16.5);
      expect(eleven.penaltyWidth).toBe(40.32);
      expect(eleven.goalAreaDepth).toBe(5.5);
      expect(eleven.centerCircleRadius).toBe(9.15);
      expect(eleven.isMandatoryStandard).toBe(true);
      expect(eleven.source).toContain('FIFA');
    });

    it('distinguishes official FIFA standards from recommended ranges in small-sided formats', () => {
      const five = GROUND_FORMAT_SPECS['5-a-side'];
      expect(five.isMandatoryStandard).toBe(false);
      expect(five.source).toContain('FA');
      expect(five.standardLength).toBe(36.5);
      expect(five.standardWidth).toBe(27.5);

      const seven = GROUND_FORMAT_SPECS['7-a-side'];
      expect(seven.isMandatoryStandard).toBe(false);
      expect(seven.source).toContain('FA');
      expect(seven.standardLength).toBe(55);
      expect(seven.standardWidth).toBe(37);

      const nine = GROUND_FORMAT_SPECS['9-a-side'];
      expect(nine.isMandatoryStandard).toBe(false);
      expect(nine.standardLength).toBe(73);
      expect(nine.standardWidth).toBe(46);
    });
  });

  describe('2. Complete Draft Deletion (Local & Cloud dual-model)', () => {
    it('deletes individual drafts safely', async () => {
      localDataService.deleteAllDrafts();
      const draft1 = {
        id: 'draft-101',
        name: 'Draft One',
        prompt: 'Arsenal and Chelsea 5-a-side cup',
        format: 'Single Elimination',
        updated_at: new Date().toISOString()
      };
      const draft2 = {
        id: 'draft-102',
        name: 'Draft Two',
        prompt: 'Liverpool and Spurs 7-a-side league',
        format: 'Single Round-Robin',
        updated_at: new Date().toISOString()
      };

      tournamentService.saveDraft(draft1);
      tournamentService.saveDraft(draft2);

      const draftsNow = tournamentService.getDrafts();
      expect(draftsNow.some(d => d.id === 'draft-101')).toBe(true);
      expect(draftsNow.some(d => d.id === 'draft-102')).toBe(true);

      await tournamentService.deleteDraft('draft-101');
      const remaining = tournamentService.getDrafts();
      expect(remaining.some(d => d.id === 'draft-101')).toBe(false);
      expect(remaining.some(d => d.id === 'draft-102')).toBe(true);
    });

    it('purges all saved drafts and clears active draft pointers via deleteAllDrafts', async () => {
      tournamentService.saveDraft({
        id: 'draft-bulk-1',
        name: 'Bulk Draft 1',
        prompt: 'League 1',
        format: 'Round-Robin',
        updated_at: new Date().toISOString()
      });
      tournamentService.saveDraft({
        id: 'draft-bulk-2',
        name: 'Bulk Draft 2',
        prompt: 'League 2',
        format: 'Knockout',
        updated_at: new Date().toISOString()
      });
      expect(tournamentService.getDrafts().length).toBeGreaterThanOrEqual(2);

      const result = await tournamentService.deleteAllDrafts();
      expect(result.localCount).toBeGreaterThanOrEqual(2);
      expect(tournamentService.getDrafts().length).toBe(0);
      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem(FTM_STORAGE_KEYS.PROMPT_DRAFT)).toBeNull();
      }
    });
  });

  describe('3. Complete Tournament Deletion & Multi-Tenant Boundaries', () => {
    it('bulk deletes user-created tournaments while preserving demo tournament and clearing active pointers', async () => {
      // Create user test tournaments via localDataService
      const t1 = localDataService.createTournament({
        name: 'Disposable User Tourney A',
        slug: 'disposable-tourney-a',
        description: 'For testing deletion',
        rules_config: { points_for_win: 3, points_for_draw: 1, points_for_loss: 0, match_duration_minutes: 40, tie_breaker_order: ['POINTS'], half_time_duration_minutes: 5 }
      });

      const t2 = localDataService.createTournament({
        name: 'Disposable User Tourney B',
        slug: 'disposable-tourney-b',
        description: 'Second disposable',
        rules_config: { points_for_win: 3, points_for_draw: 1, points_for_loss: 0, match_duration_minutes: 40, tie_breaker_order: ['POINTS'], half_time_duration_minutes: 5 }
      });

      localDataService.setActiveTournamentId(t2.id);
      expect(localDataService.getActiveTournamentId()).toBe(t2.id);

      const allBefore = localDataService.getAllTournaments();
      const userTourneysBefore = allBefore.filter(t => t.id === t1.id || t.id === t2.id);
      expect(userTourneysBefore.length).toBe(2);

      // Perform bulk deletion
      const bulkResult = await tournamentService.deleteAllUserTournaments();
      expect(bulkResult.count).toBeGreaterThanOrEqual(2);
      expect(bulkResult.deletedIds).toContain(t1.id);
      expect(bulkResult.deletedIds).toContain(t2.id);

      // Verify user tournaments are gone
      const allAfter = localDataService.getAllTournaments();
      expect(allAfter.find(t => t.id === t1.id)).toBeUndefined();
      expect(allAfter.find(t => t.id === t2.id)).toBeUndefined();

      // Verify active tournament pointer is cleared or reset to safe demo
      const activeId = localDataService.getActiveTournamentId();
      expect(activeId).not.toBe(t1.id);
      expect(activeId).not.toBe(t2.id);

      // Demo tournament must still exist and be intact
      const demo = localDataService.getTournamentById('ftm-demo-tourney-01');
      expect(demo).toBeDefined();
      expect(demo?.name).toContain('TournX');
    });

    it('strictly protects HOSTEL LEAGUE 26 from accidental destruction', async () => {
      // Register a simulated protected hostel league tournament
      const protectedTourney = {
        id: 'hl-26-unique',
        name: 'HOSTEL LEAGUE 26',
        slug: 'hostel-league-26',
        status: 'IN_PROGRESS' as const,
        visibility: 'PUBLIC' as const,
        rules_config: { points_for_win: 3, points_for_draw: 1, points_for_loss: 0, match_duration_minutes: 50, tie_breaker_order: ['POINTS' as const], half_time_duration_minutes: 5 },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localDataService.registerTournament(protectedTourney as any);

      const deleteRes = localDataService.deleteAllUserTournaments();
      expect(deleteRes.deletedIds).not.toContain('hl-26-unique');
      expect(localDataService.getTournamentById('hl-26-unique')).toBeDefined();
    });
  });
});
