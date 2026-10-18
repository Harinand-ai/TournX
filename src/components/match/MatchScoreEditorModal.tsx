import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Trophy, 
  Calendar, 
  MapPin, 
  Award, 
  Flame, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Loader2
} from 'lucide-react';
import { Match, Team, Player, Goal, ManOfTheMatch } from '../../types/tournament';
import { TeamBadge } from '../TeamBadge';

interface MatchScoreEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  homeTeam?: Team;
  awayTeam?: Team;
  players: Player[];
  currentGoals: Goal[];
  currentMotm?: ManOfTheMatch | null;
  onSave: (params: {
    matchId: string;
    status: Match['status'];
    homeScore: number | null;
    awayScore: number | null;
    scheduledDate: string | null;
    venue: string | null;
    goals: { player_id: string; team_id: string }[];
    motmPlayerId?: string;
  }) => Promise<void>;
}

export function MatchScoreEditorModal({
  isOpen,
  onClose,
  match,
  homeTeam,
  awayTeam,
  players,
  currentGoals,
  currentMotm,
  onSave,
}: MatchScoreEditorModalProps) {
  // Basic scores & status
  const [homeScore, setHomeScore] = useState<number | ''>(match?.home_score ?? '');
  const [awayScore, setAwayScore] = useState<number | ''>(match?.away_score ?? '');
  const [status, setStatus] = useState<Match['status']>(match?.status || 'UPCOMING');
  const [scheduledDate, setScheduledDate] = useState<string>(match?.scheduled_date || '');
  const [venue, setVenue] = useState<string>(match?.venue || '');

  // Goal events: array of { player_id, team_id }
  const [homeGoals, setHomeGoals] = useState<{ player_id: string; team_id: string }[]>([]);
  const [awayGoals, setAwayGoals] = useState<{ player_id: string; team_id: string }[]>([]);

  // Selected Player of the Match
  const [selectedMotmId, setSelectedMotmId] = useState<string>('');

  // Dropdown player pickers
  const [selectedHomePlayerToAdd, setSelectedHomePlayerToAdd] = useState<string>('');
  const [selectedAwayPlayerToAdd, setSelectedAwayPlayerToAdd] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Initialize data on open
  useEffect(() => {
    if (match) {
      setHomeScore(match.home_score ?? (match.status === 'COMPLETED' ? 0 : ''));
      setAwayScore(match.away_score ?? (match.status === 'COMPLETED' ? 0 : ''));
      setStatus(match.status || 'UPCOMING');
      setScheduledDate(match.scheduled_date || '');
      setVenue(match.venue || '');

      // Filter goals for this match
      const matchGoals = currentGoals.filter(g => g.match_id === match.id);
      const hTeamId = homeTeam?.id || match.home_team_id;
      const aTeamId = awayTeam?.id || match.away_team_id;

      setHomeGoals(
        matchGoals
          .filter(g => g.team_id === hTeamId)
          .map(g => ({ player_id: g.player_id, team_id: g.team_id }))
      );
      setAwayGoals(
        matchGoals
          .filter(g => g.team_id === aTeamId)
          .map(g => ({ player_id: g.player_id, team_id: g.team_id }))
      );

      // Set MOTM
      const motmItem = currentMotm?.match_id === match.id ? currentMotm : null;
      setSelectedMotmId(motmItem?.player_id || (match.metadata as any)?.potm_player_id || '');
      setErrorNotice(null);
    }
  }, [match, currentGoals, currentMotm, homeTeam, awayTeam]);

  // Player rosters
  const homePlayers = useMemo(() => {
    if (!match) return [];
    const tId = homeTeam?.id || match.home_team_id;
    return players.filter(p => p.team_id === tId);
  }, [players, homeTeam, match]);

  const awayPlayers = useMemo(() => {
    if (!match) return [];
    const tId = awayTeam?.id || match.away_team_id;
    return players.filter(p => p.team_id === tId);
  }, [players, awayTeam, match]);

  const playersMap = useMemo(() => {
    return new Map(players.map(p => [p.id, p]));
  }, [players]);

  // Goal adding helpers
  const handleAddHomeGoal = () => {
    if (!selectedHomePlayerToAdd || !match) return;
    const tId = homeTeam?.id || match.home_team_id;
    setHomeGoals(prev => [...prev, { player_id: selectedHomePlayerToAdd, team_id: tId }]);
    
    // Auto-update score if score is currently lower or empty
    const currentVal = homeScore === '' ? 0 : Number(homeScore);
    if (homeGoals.length + 1 > currentVal) {
      setHomeScore(homeGoals.length + 1);
    }
    setSelectedHomePlayerToAdd('');
  };

  const handleAddAwayGoal = () => {
    if (!selectedAwayPlayerToAdd || !match) return;
    const tId = awayTeam?.id || match.away_team_id;
    setAwayGoals(prev => [...prev, { player_id: selectedAwayPlayerToAdd, team_id: tId }]);

    // Auto-update score if score is currently lower or empty
    const currentVal = awayScore === '' ? 0 : Number(awayScore);
    if (awayGoals.length + 1 > currentVal) {
      setAwayScore(awayGoals.length + 1);
    }
    setSelectedAwayPlayerToAdd('');
  };

  const handleRemoveHomeGoal = (index: number) => {
    setHomeGoals(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAwayGoal = (index: number) => {
    setAwayGoals(prev => prev.filter((_, i) => i !== index));
  };

  // Discrepancy checks
  const numHomeScore = homeScore === '' ? null : Number(homeScore);
  const numAwayScore = awayScore === '' ? null : Number(awayScore);

  const homeGoalsExceedScore = numHomeScore !== null && homeGoals.length > numHomeScore;
  const awayGoalsExceedScore = numAwayScore !== null && awayGoals.length > numAwayScore;
  const hasDiscrepancy = homeGoalsExceedScore || awayGoalsExceedScore;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;
    setErrorNotice(null);

    if (hasDiscrepancy) {
      setErrorNotice(
        'Cannot save: Score cannot be less than the number of recorded goal events. Please update the score or remove extra goal events.'
      );
      return;
    }

    // When a match is marked COMPLETED, verify that recorded goal events exactly match the score
    if (status === 'COMPLETED') {
      const finalH = numHomeScore ?? 0;
      const finalA = numAwayScore ?? 0;
      if (homeGoals.length !== finalH) {
        setErrorNotice(
          `Home score is ${finalH}, but ${homeGoals.length} goalscorer${homeGoals.length === 1 ? '' : 's'} recorded. Please add all ${finalH} scorer${finalH === 1 ? '' : 's'} or adjust the score.`
        );
        return;
      }
      if (awayGoals.length !== finalA) {
        setErrorNotice(
          `Away score is ${finalA}, but ${awayGoals.length} goalscorer${awayGoals.length === 1 ? '' : 's'} recorded. Please add all ${finalA} scorer${finalA === 1 ? '' : 's'} or adjust the score.`
        );
        return;
      }
    }

    let finalHomeScore = numHomeScore;
    let finalAwayScore = numAwayScore;

    if (status === 'COMPLETED') {
      if (finalHomeScore === null) finalHomeScore = homeGoals.length;
      if (finalAwayScore === null) finalAwayScore = awayGoals.length;
    }

    setIsSaving(true);
    try {
      const combinedGoals = [...homeGoals, ...awayGoals];
      await onSave({
        matchId: match.id,
        status,
        homeScore: finalHomeScore,
        awayScore: finalAwayScore,
        scheduledDate: scheduledDate ? scheduledDate.trim() : null,
        venue: venue ? venue.trim() : null,
        goals: combinedGoals,
        motmPlayerId: selectedMotmId ? selectedMotmId.trim() : undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to save match result. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] text-slate-900 overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold uppercase text-slate-900 tracking-wide">
                Match #{match.match_number} — Score & Events
              </h2>
              <span className="text-[11px] text-slate-500">
                Round {match.round_number || 1} • {homeTeam?.name || 'Home'} vs {awayTeam?.name || 'Away'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Error / Warning Notice */}
          {errorNotice && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* 1. Scoreboard Input Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Match Score & Status
            </div>

            <div className="grid grid-cols-5 gap-2 items-center text-center">
              {/* Home Team */}
              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  {homeTeam && <TeamBadge team={homeTeam} size="xs" />}
                  <span className="font-bold text-xs text-slate-800 truncate max-w-[120px]">
                    {homeTeam?.name || 'Home Team'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHomeScore(prev => Math.max(0, (prev === '' ? 0 : prev) - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={homeScore}
                    onChange={e => setHomeScore(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-14 h-10 text-center font-bold text-xl rounded-lg bg-white border border-slate-300 text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setHomeScore(prev => (prev === '' ? 0 : prev) + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {homeGoals.length} goal{homeGoals.length === 1 ? '' : 's'} recorded
                </div>
              </div>

              {/* VS Divider */}
              <div className="col-span-1 flex flex-col items-center justify-center">
                <span className="text-xs font-black text-slate-400">VS</span>
                <span className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  status === 'COMPLETED' ? 'bg-slate-200 text-slate-700' :
                  status === 'LIVE' ? 'bg-emerald-100 text-emerald-800 animate-pulse' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {status}
                </span>
              </div>

              {/* Away Team */}
              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-bold text-xs text-slate-800 truncate max-w-[120px]">
                    {awayTeam?.name || 'Away Team'}
                  </span>
                  {awayTeam && <TeamBadge team={awayTeam} size="xs" />}
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAwayScore(prev => Math.max(0, (prev === '' ? 0 : prev) - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={awayScore}
                    onChange={e => setAwayScore(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-14 h-10 text-center font-bold text-xl rounded-lg bg-white border border-slate-300 text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAwayScore(prev => (prev === '' ? 0 : prev) + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {awayGoals.length} goal{awayGoals.length === 1 ? '' : 's'} recorded
                </div>
              </div>
            </div>

            {/* Discrepancy warnings */}
            {homeGoalsExceedScore && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Discrepancy: {homeTeam?.name || 'Home Team'} score ({numHomeScore}) is lower than the {homeGoals.length} recorded goal events. Please increase the score or remove extra goals.
                </span>
              </div>
            )}
            {awayGoalsExceedScore && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Discrepancy: {awayTeam?.name || 'Away Team'} score ({numAwayScore}) is lower than the {awayGoals.length} recorded goal events. Please increase the score or remove extra goals.
                </span>
              </div>
            )}
          </div>

          {/* 2. Status & Scheduling Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Status</span>
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-800 focus:border-emerald-600 focus:outline-none"
              >
                <option value="UPCOMING">Upcoming</option>
                <option value="LIVE">Live (In Progress)</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date (Optional)</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-800 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Venue (Optional)</span>
              </label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Ground A, Stadium Pitch"
                className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-800 focus:border-emerald-600 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 3. Goalscorers Section */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-emerald-600" />
                <span>Goalscorers Tracking</span>
              </div>
              <span className="text-[10px] text-slate-500">
                Associates goals to players for stats & golden boot
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Home Team Goalscorers */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-1.5">
                  <span className="truncate">{homeTeam?.name || 'Home'} Goals</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                    {homeGoals.length}
                  </span>
                </div>

                {/* Add Goal for Home Team */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedHomePlayerToAdd}
                    onChange={e => setSelectedHomePlayerToAdd(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-800 focus:border-emerald-600 focus:outline-none truncate"
                  >
                    <option value="">Select scorer...</option>
                    {homePlayers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.position ? `(${p.position})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddHomeGoal}
                    disabled={!selectedHomePlayerToAdd}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* List of Home Goals */}
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {homeGoals.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-1 text-center">
                      No goals recorded yet.
                    </div>
                  ) : (
                    homeGoals.map((g, idx) => {
                      const player = playersMap.get(g.player_id);
                      return (
                        <div
                          key={`hg-${idx}-${g.player_id}`}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-4 text-center font-mono text-[10px] text-slate-400">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold truncate">
                              {player?.name || 'Unknown Player'}
                            </span>
                            {player?.position && (
                              <span className="text-[10px] text-slate-400">
                                ({player.position})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveHomeGoal(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Remove goal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Away Team Goalscorers */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-1.5">
                  <span className="truncate">{awayTeam?.name || 'Away'} Goals</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                    {awayGoals.length}
                  </span>
                </div>

                {/* Add Goal for Away Team */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedAwayPlayerToAdd}
                    onChange={e => setSelectedAwayPlayerToAdd(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-800 focus:border-emerald-600 focus:outline-none truncate"
                  >
                    <option value="">Select scorer...</option>
                    {awayPlayers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.position ? `(${p.position})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddAwayGoal}
                    disabled={!selectedAwayPlayerToAdd}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* List of Away Goals */}
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {awayGoals.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-1 text-center">
                      No goals recorded yet.
                    </div>
                  ) : (
                    awayGoals.map((g, idx) => {
                      const player = playersMap.get(g.player_id);
                      return (
                        <div
                          key={`ag-${idx}-${g.player_id}`}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-4 text-center font-mono text-[10px] text-slate-400">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold truncate">
                              {player?.name || 'Unknown Player'}
                            </span>
                            {player?.position && (
                              <span className="text-[10px] text-slate-400">
                                ({player.position})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAwayGoal(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Remove goal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* 4. Player of the Match (POTM) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Player of the Match (POTM)</span>
              </label>
              <span className="text-[10px] text-slate-500">
                Eligible from participating squads
              </span>
            </div>

            <select
              value={selectedMotmId}
              onChange={e => setSelectedMotmId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-800 focus:border-emerald-600 focus:outline-none"
            >
              <option value="">-- No Player Selected --</option>
              
              <optgroup label={`${homeTeam?.name || 'Home Team'} Players`}>
                {homePlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    ⭐ {p.name} {p.position ? `(${p.position})` : ''}
                  </option>
                ))}
              </optgroup>

              <optgroup label={`${awayTeam?.name || 'Away Team'} Players`}>
                {awayPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    ⭐ {p.name} {p.position ? `(${p.position})` : ''}
                  </option>
                ))}
              </optgroup>
            </select>

            {selectedMotmId && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold">
                  {playersMap.get(selectedMotmId)?.name}
                </span>
                <span className="text-amber-700 text-[11px]">
                  awarded Player of the Match for Match #{match.match_number}
                </span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || hasDiscrepancy}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Match...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Match Result</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
