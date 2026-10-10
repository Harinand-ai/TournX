import React, { useState } from 'react';
import { Team, Match } from '../../types/tournament';
import { Tournament } from '../../types/multiTenant';
import { 
  generateSingleRoundRobin, 
  generateDoubleRoundRobin, 
  generateSingleEliminationKnockout,
  EngineTeam,
  EngineMatch
} from '../../engine/tournamentEngine';
import { localDataService } from '../../services/localDataService';
import { 
  Wand2, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Layers, 
  Trophy, 
  Clock, 
  ChevronRight,
  RefreshCw
} from 'lucide-react';

interface FixtureGeneratorSectionProps {
  tournament: Tournament;
  teams: Team[];
  existingMatches: Match[];
  onFixturesGenerated: () => void;
}

export const FixtureGeneratorSection: React.FC<FixtureGeneratorSectionProps> = ({
  tournament,
  teams,
  existingMatches,
  onFixturesGenerated,
}) => {
  const [format, setFormat] = useState<'SINGLE_RR' | 'DOUBLE_RR' | 'KNOCKOUT'>('SINGLE_RR');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [matchIntervalHours, setMatchIntervalHours] = useState<number>(2);
  const [defaultVenue, setDefaultVenue] = useState<string>('Main Stadium, Pitch 1');
  const [previewMatches, setPreviewMatches] = useState<EngineMatch[] | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const teamMap = new Map<string, Team>(teams.map(t => [t.id, t]));

  const handleGeneratePreview = () => {
    setFeedback(null);
    if (teams.length < 2) {
      setFeedback({
        type: 'error',
        message: 'At least 2 teams are required to generate fixtures. Add more teams first.',
      });
      return;
    }

    try {
      const engineTeams: EngineTeam[] = teams.map((t, idx) => ({
        id: t.id,
        name: t.name,
        short_name: t.short_name,
        seed: idx + 1,
      }));

      let generated: EngineMatch[] = [];
      if (format === 'SINGLE_RR') {
        generated = generateSingleRoundRobin(engineTeams, {
          stageId: 'stage-regular',
          idPrefix: `${tournament.id}-m`,
        });
      } else if (format === 'DOUBLE_RR') {
        generated = generateDoubleRoundRobin(engineTeams, {
          stageId: 'stage-regular',
          idPrefix: `${tournament.id}-drr`,
        });
      } else if (format === 'KNOCKOUT') {
        generated = generateSingleEliminationKnockout(engineTeams, {
          stageId: 'stage-knockout',
          idPrefix: `${tournament.id}-ko`,
        });
      }

      setPreviewMatches(generated);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to generate fixtures.',
      });
    }
  };

  const handleApplyFixtures = () => {
    if (!previewMatches || previewMatches.length === 0) return;

    setIsApplying(true);
    setFeedback(null);

    try {
      const baseDate = new Date(startDate);

      const convertedMatches: Match[] = previewMatches.map((em, idx) => {
        // Calculate date and time slot
        const matchTime = new Date(baseDate.getTime() + idx * matchIntervalHours * 60 * 60 * 1000);
        const dateStr = matchTime.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const timeStr = matchTime.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });

        return {
          id: em.id,
          match_number: em.match_number,
          home_team_id: em.home_team_id || '',
          away_team_id: em.away_team_id || '',
          home_score: em.home_score !== null ? em.home_score : 0,
          away_score: em.away_score !== null ? em.away_score : 0,
          status: em.status === 'COMPLETED' ? 'COMPLETED' : 'UPCOMING',
          venue: defaultVenue,
          date: dateStr,
          time: timeStr,
          referee: 'TBD',
        };
      });

      localDataService.setMatches(convertedMatches, tournament.id);
      setFeedback({
        type: 'success',
        message: `Successfully created ${convertedMatches.length} fixtures for "${tournament.name}".`,
      });
      setPreviewMatches(null);
      onFixturesGenerated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to apply fixtures to tournament.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wand2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">Automated Fixture Generator</h2>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Generate deterministic match schedules for <span className="text-emerald-400 font-semibold">{tournament.name}</span> with round-robin or knockout brackets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
            {teams.length} Registered Teams
          </span>
          <span className="text-xs px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
            {existingMatches.length} Current Fixtures
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          )}
          <div className="text-sm">{feedback.message}</div>
        </div>
      )}

      {/* Generator Configuration Card */}
      <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Tournament Format & Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => { setFormat('SINGLE_RR'); setPreviewMatches(null); }}
            className={`p-4 rounded-xl text-left border transition-all ${
              format === 'SINGLE_RR'
                ? 'bg-emerald-500/10 border-emerald-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">Single Round-Robin</span>
              <Layers className={`w-5 h-5 ${format === 'SINGLE_RR' ? 'text-emerald-400' : 'text-zinc-500'}`} />
            </div>
            <p className="text-xs text-zinc-400">
              Each team plays every other team once. Standard league stage.
            </p>
          </button>

          <button
            type="button"
            onClick={() => { setFormat('DOUBLE_RR'); setPreviewMatches(null); }}
            className={`p-4 rounded-xl text-left border transition-all ${
              format === 'DOUBLE_RR'
                ? 'bg-emerald-500/10 border-emerald-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">Double Round-Robin</span>
              <RefreshCw className={`w-5 h-5 ${format === 'DOUBLE_RR' ? 'text-emerald-400' : 'text-zinc-500'}`} />
            </div>
            <p className="text-xs text-zinc-400">
              Home and away legs for each pair of teams.
            </p>
          </button>

          <button
            type="button"
            onClick={() => { setFormat('KNOCKOUT'); setPreviewMatches(null); }}
            className={`p-4 rounded-xl text-left border transition-all ${
              format === 'KNOCKOUT'
                ? 'bg-emerald-500/10 border-emerald-500 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">Knockout Bracket</span>
              <Trophy className={`w-5 h-5 ${format === 'KNOCKOUT' ? 'text-emerald-400' : 'text-zinc-500'}`} />
            </div>
            <p className="text-xs text-zinc-400">
              Single-elimination tree with seeded pairings and automatic byes.
            </p>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2">
              Match Interval (Hours)
            </label>
            <input
              type="number"
              min="1"
              max="72"
              value={matchIntervalHours}
              onChange={e => setMatchIntervalHours(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-2">
              Default Venue
            </label>
            <input
              type="text"
              value={defaultVenue}
              onChange={e => setDefaultVenue(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
              placeholder="e.g. Ground A, Pitch 1"
            />
          </div>
        </div>

        {existingMatches.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              This tournament already contains <strong>{existingMatches.length}</strong> match(es). Applying new fixtures will overwrite the current schedule.
            </span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleGeneratePreview}
            disabled={teams.length < 2}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Wand2 className="w-4 h-4" />
            Generate Preview
          </button>
        </div>
      </div>

      {/* Fixtures Preview */}
      {previewMatches && (
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/40 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Preview: {previewMatches.length} Fixtures</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-normal">
                  Ready to Apply
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Review match pairings before applying to the active tournament schedule.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreviewMatches(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyFixtures}
                disabled={isApplying}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle className="w-4 h-4" />
                {isApplying ? 'Applying...' : 'Apply to Tournament'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-2">
            {previewMatches.map((m, idx) => {
              const home = m.home_team_id ? teamMap.get(m.home_team_id) : null;
              const away = m.away_team_id ? teamMap.get(m.away_team_id) : null;

              return (
                <div
                  key={m.id || idx}
                  className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-all text-xs"
                >
                  <div className="flex items-center justify-between text-zinc-400 mb-2 font-mono">
                    <span>Match #{m.match_number}</span>
                    <span className="text-zinc-500">{m.round_name || `Round ${m.round_number}`}</span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate">
                        {home?.name || (m.home_team_id ? 'TBD' : 'BYE')}
                      </span>
                      <span className="text-zinc-500 text-[10px] font-mono">HOME</span>
                    </div>
                    <div className="text-center text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
                      vs
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate">
                        {away?.name || (m.away_team_id ? 'TBD' : 'BYE')}
                      </span>
                      <span className="text-zinc-500 text-[10px] font-mono">AWAY</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
