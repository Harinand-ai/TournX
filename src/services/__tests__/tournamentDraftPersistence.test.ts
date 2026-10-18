import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tournamentService } from '../tournamentService';
import { localDataService } from '../localDataService';
import { supabase } from '../../lib/supabase';

describe('Tournament Draft Persistence & stage_id Integrity', () => {
  beforeEach(() => {
    localDataService.resetDemoData();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves an empty draft with no matches without throwing database errors', async () => {
    const localTourney = localDataService.createTournament({
      name: 'Pre-Season Draft Cup',
      season: '2026',
    });

    // createMatches called with empty array should return empty without attempting invalid inserts
    const matches = await tournamentService.createMatches([], localTourney.id);
    expect(matches).toEqual([]);

    const reloaded = await tournamentService.getTournament(localTourney.id);
    expect(reloaded).toBeDefined();
    expect(reloaded?.name).toBe('Pre-Season Draft Cup');
  });

  it('guarantees stage_id is attached and valid when creating matches in cloud mode', async () => {
    // Mock authenticated user and Supabase client calls for tournament creation and match inserts
    const mockStageId = '11111111-2222-3333-4444-555555555555';
    const mockTourneyId = '99999999-8888-7777-6666-555555555555';

    if (supabase) {
      // Spy on supabase.from to verify stage_id is passed in the insert payload
      const originalFrom = supabase.from.bind(supabase);
      let capturedMatchRecords: any[] = [];

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'tournament_stages') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: [{ id: mockStageId }], error: null }),
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: mockStageId }, error: null }),
              }),
            }),
          } as any;
        }

        if (table === 'matches') {
          return {
            delete: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ error: null }),
              }),
            }),
            insert: (records: any) => {
              capturedMatchRecords = records;
              return {
                select: () => Promise.resolve({
                  data: records.map((r: any, idx: number) => ({ id: `match-uuid-${idx}`, ...r })),
                  error: null,
                }),
              };
            },
          } as any;
        }

        return originalFrom(table);
      });

      const matchesToInsert = [
        {
          match_number: 1,
          round_number: 1,
          home_team_id: 'team-1',
          away_team_id: 'team-2',
          scheduled_date: '2026-11-15',
          home_score: null,
          away_score: null,
          status: 'UPCOMING' as const,
        },
        {
          match_number: 2,
          round_number: 1,
          home_team_id: 'team-3',
          away_team_id: 'team-4',
          scheduled_date: 'invalid-conversational-date',
          home_score: null,
          away_score: null,
          status: 'UPCOMING' as const,
        },
      ];

      const inserted = await tournamentService.createMatches(matchesToInsert, mockTourneyId);
      expect(inserted).toHaveLength(2);
      expect(capturedMatchRecords).toHaveLength(2);

      // Verify stage_id NOT null requirement is satisfied
      expect(capturedMatchRecords[0].stage_id).toBe(mockStageId);
      expect(capturedMatchRecords[1].stage_id).toBe(mockStageId);

      // Verify date sanitization for Postgres DATE column
      expect(capturedMatchRecords[0].scheduled_date).toBe('2026-11-15');
      expect(capturedMatchRecords[1].scheduled_date).toBeNull(); // sanitized because it was conversational text
    }
  });

  it('reloads saved draft by ID or slug reliably', async () => {
    const created = localDataService.createTournament({
      name: 'Reloadable Champions League',
      slug: 'reloadable-champions-league',
      season: '2026',
    });

    const reloadedById = await tournamentService.getTournament(created.id);
    expect(reloadedById).toBeDefined();
    expect(reloadedById?.name).toBe('Reloadable Champions League');

    const reloadedBySlug = await tournamentService.getTournament('reloadable-champions-league');
    expect(reloadedBySlug).toBeDefined();
    expect(reloadedBySlug?.id).toBe(created.id);
  });

  it('prevents duplicate matches on retry', async () => {
    const t = localDataService.createTournament({ name: 'Retry Cup' });

    const initialMatches = [
      {
        match_number: 1,
        round_number: 1,
        home_team_id: 'team-a',
        away_team_id: 'team-b',
        home_score: null,
        away_score: null,
        status: 'UPCOMING' as const,
      },
    ];

    await tournamentService.createMatches(initialMatches, t.id);
    let loaded = await tournamentService.getMatches(t.id);
    expect(loaded).toHaveLength(1);

    // Retrying with new or updated matches overwrites cleanly rather than appending duplicates
    const retriedMatches = [
      {
        match_number: 1,
        round_number: 1,
        home_team_id: 'team-a',
        away_team_id: 'team-b',
        home_score: null,
        away_score: null,
        status: 'UPCOMING' as const,
      },
      {
        match_number: 2,
        round_number: 1,
        home_team_id: 'team-c',
        away_team_id: 'team-d',
        home_score: null,
        away_score: null,
        status: 'UPCOMING' as const,
      },
    ];

    await tournamentService.createMatches(retriedMatches, t.id);
    loaded = await tournamentService.getMatches(t.id);
    expect(loaded).toHaveLength(2);
  });
});
