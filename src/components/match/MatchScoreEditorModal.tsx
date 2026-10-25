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

  // Player lists for home and away
  const hTeamId = homeTeam?.id || match?.home_team_id;
  const aTeamId = awayTeam?.id || match?.away_team_id;

  const homePlayers = useMemo(() => {
    return players.filter(p => p.team_id === hTeamId);
  }, [players, hTeamId]);

  const awayPlayers = useMemo(() => {
    return players.filter(p => p.team_id === aTeamId);
  }, [players, aTeamId]);

  const playersMap = useMemo(() => {
    return new Map(players.map(p => [p.id, p]));
  }, [players]);

  // Goal adding handlers
  const handleAddHomeGoal = () => {
    if (!selectedHomePlayerToAdd || !hTeamId) return;
    setHomeGoals(prev => [...prev, { player_id: selectedHomePlayerToAdd, team_id: hTeamId }]);
    setSelectedHomePlayerToAdd('');

    // If homeScore is less than new goals count, auto-update score
    setHomeScore(prev => {
      const current = prev === '' ? 0 : Number(prev);
      return Math.max(current, homeGoals.length + 1);
    });
  };

  const handleRemoveHomeGoal = (index: number) => {
    setHomeGoals(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddAwayGoal = () => {
    if (!selectedAwayPlayerToAdd || !aTeamId) return;
    setAwayGoals(prev => [...prev, { player_id: selectedAwayPlayerToAdd, team_id: aTeamId }]);
    setSelectedAwayPlayerToAdd('');

    // If awayScore is less than new goals count, auto-update score
    setAwayScore(prev => {
      const current = prev === '' ? 0 : Number(prev);
      return Math.max(current, awayGoals.length + 1);
    });
  };

  const handleRemoveAwayGoal = (index: number) => {
    setAwayGoals(prev => prev.filter((_, i) => i !== index));
  };

  // Validation: Check if goals count exceeds entered score
  const numHomeScore = homeScore === '' ? 0 : Number(homeScore);
  const numAwayScore = awayScore === '' ? 0 : Number(awayScore);

  const homeGoalsExceedScore = homeGoals.length > numHomeScore;
  const awayGoalsExceedScore = awayGoals.length > numAwayScore;
  const hasDiscrepancy = homeGoalsExceedScore || awayGoalsExceedScore;

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;

    if (hasDiscrepancy) {
      setErrorNotice('Recorded player goals cannot exceed team final score. Please adjust scores or remove surplus goals.');
      return;
    }

    // Default status to COMPLETED if scores were entered and status is UPCOMING
    let finalStatus = status;
    const finalHomeScore = homeScore === '' ? null : Number(homeScore);
    const finalAwayScore = awayScore === '' ? null : Number(awayScore);

    if (finalHomeScore !== null && finalAwayScore !== null && status === 'UPCOMING') {
      finalStatus = 'COMPLETED';
    }

    setIsSaving(true);
    try {
      const combinedGoals = [...homeGoals, ...awayGoals];
      await onSave({
        matchId: match.id,
        status: finalStatus,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#19191F] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] text-[#F0E9E7] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#141418] border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#21191D] border border-[#F02D50]/40 text-[#F02D50]">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase font-display text-[#F0E9E7] tracking-wide">
                Match #{match.match_number} — Score & Events
              </h2>
              <span className="text-[11px] text-[#A5A1A4] font-mono">
                Round {match.round_number || 1} • {homeTeam?.name || 'Home'} vs {awayTeam?.name || 'Away'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A5A1A4] hover:text-[#F0E9E7] hover:bg-[#202028] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Error / Warning Notice */}
          {errorNotice && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* 1. Scoreboard Input Section */}
          <div className="p-4 rounded-xl bg-[#141418] border border-white/10 space-y-3">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#A5A1A4]">
              Match Score & Status
            </div>

            <div className="grid grid-cols-5 gap-2 items-center text-center">
              {/* Home Team */}
              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  {homeTeam && <TeamBadge team={homeTeam} size="xs" />}
                  <span className="font-bold text-xs text-[#F0E9E7] truncate max-w-[120px] font-display">
                    {homeTeam?.name || 'Home Team'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHomeScore(prev => Math.max(0, (prev === '' ? 0 : prev) - 1))}
                    className="w-8 h-8 rounded-lg bg-[#19191F] border border-white/10 hover:bg-[#202028] text-[#F0E9E7] font-bold text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={homeScore}
                    onChange={e => setHomeScore(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-14 h-10 text-center font-score font-black text-xl rounded-lg bg-[#101013] border border-white/10 text-[#F0E9E7] focus:border-[#F02D50] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setHomeScore(prev => (prev === '' ? 0 : prev) + 1)}
                    className="w-8 h-8 rounded-lg bg-[#19191F] border border-white/10 hover:bg-[#202028] text-[#F0E9E7] font-bold text-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <div className="text-[10px] text-[#A5A1A4] font-mono">
                  {homeGoals.length} goal{homeGoals.length === 1 ? '' : 's'} recorded
                </div>
              </div>

              {/* VS Divider */}
              <div className="col-span-1 flex flex-col items-center justify-center">
                <span className="text-xs font-mono font-black text-[#A5A1A4]">VS</span>
                <span className={`mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  status === 'COMPLETED' ? 'bg-[#101013] text-[#A5A1A4] border border-white/10' :
                  status === 'LIVE' ? 'bg-[#21191D] text-[#F02D50] border border-[#F02D50]/40 animate-pulse' :
                  'bg-[#19191F] text-[#F0E9E7] border border-white/10'
                }`}>
                  {status}
                </span>
              </div>

              {/* Away Team */}
              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-bold text-xs text-[#F0E9E7] truncate max-w-[120px] font-display">
                    {awayTeam?.name || 'Away Team'}
                  </span>
                  {awayTeam && <TeamBadge team={awayTeam} size="xs" />}
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAwayScore(prev => Math.max(0, (prev === '' ? 0 : prev) - 1))}
                    className="w-8 h-8 rounded-lg bg-[#19191F] border border-white/10 hover:bg-[#202028] text-[#F0E9E7] font-bold text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={awayScore}
                    onChange={e => setAwayScore(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-14 h-10 text-center font-score font-black text-xl rounded-lg bg-[#101013] border border-white/10 text-[#F0E9E7] focus:border-[#F02D50] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAwayScore(prev => (prev === '' ? 0 : prev) + 1)}
                    className="w-8 h-8 rounded-lg bg-[#19191F] border border-white/10 hover:bg-[#202028] text-[#F0E9E7] font-bold text-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <div className="text-[10px] text-[#A5A1A4] font-mono">
                  {awayGoals.length} goal{awayGoals.length === 1 ? '' : 's'} recorded
                </div>
              </div>
            </div>

            {/* Discrepancy warnings */}
            {homeGoalsExceedScore && (
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Discrepancy: {homeTeam?.name || 'Home'} score ({numHomeScore}) is lower than recorded goals ({homeGoals.length}).
                </span>
              </div>
            )}
            {awayGoalsExceedScore && (
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Discrepancy: {awayTeam?.name || 'Away'} score ({numAwayScore}) is lower than recorded goals ({awayGoals.length}).
                </span>
              </div>
            )}
          </div>

          {/* 2. Status & Scheduling Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-mono text-[#A5A1A4] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#F02D50]" />
                <span>Status</span>
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] focus:border-[#F02D50] focus:outline-none font-mono"
              >
                <option value="UPCOMING">Upcoming</option>
                <option value="LIVE">Live (In Progress)</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[#A5A1A4] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#F02D50]" />
                <span>Date (Optional)</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] focus:border-[#F02D50] focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-[#A5A1A4] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#F02D50]" />
                <span>Venue (Optional)</span>
              </label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder="e.g. Ground A, Stadium Pitch"
                className="w-full px-3 py-2 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] focus:border-[#F02D50] focus:outline-none placeholder:text-[#6E6A6D]"
              />
            </div>
          </div>

          {/* 3. Goalscorers Section */}
          <div className="space-y-3 pt-2 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#F0E9E7] flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#F02D50]" />
                <span>Goalscorers Tracking</span>
              </div>
              <span className="text-[10px] text-[#A5A1A4] font-mono">
                Associates goals to players for stats & golden boot
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Home Team Goalscorers */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-[#141418] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#F0E9E7] border-b border-white/[0.08] pb-1.5">
                  <span className="truncate">{homeTeam?.name || 'Home'} Goals</span>
                  <span className="px-2 py-0.5 rounded bg-[#21191D] border border-[#F02D50]/40 text-[#F02D50] text-[10px] font-mono font-bold">
                    {homeGoals.length}
                  </span>
                </div>

                {/* Add Goal for Home Team */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedHomePlayerToAdd}
                    onChange={e => setSelectedHomePlayerToAdd(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-[#101013] border border-white/10 text-[#F0E9E7] focus:border-[#F02D50] focus:outline-none truncate"
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
                    className="px-2.5 py-1.5 rounded-lg bg-[#F02D50] text-white text-xs font-bold hover:bg-[#FF3358] transition disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* List of Home Goals */}
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {homeGoals.length === 0 ? (
                    <div className="text-[11px] text-[#A5A1A4] italic py-1 text-center font-mono">
                      No goals recorded yet.
                    </div>
                  ) : (
                    homeGoals.map((g, idx) => {
                      const player = playersMap.get(g.player_id);
                      return (
                        <div
                          key={`hg-${idx}-${g.player_id}`}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#101013] border border-white/10 text-xs text-[#F0E9E7]"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-4 text-center font-mono text-[10px] text-[#F02D50]">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold truncate">
                              {player?.name || 'Unknown Player'}
                            </span>
                            {player?.position && (
                              <span className="text-[10px] text-[#A5A1A4] font-mono">
                                ({player.position})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveHomeGoal(idx)}
                            className="p-1 text-[#A5A1A4] hover:text-rose-400 transition cursor-pointer"
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
              <div className="p-3.5 rounded-xl border border-white/10 bg-[#141418] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#F0E9E7] border-b border-white/[0.08] pb-1.5">
                  <span className="truncate">{awayTeam?.name || 'Away'} Goals</span>
                  <span className="px-2 py-0.5 rounded bg-[#21191D] border border-[#F02D50]/40 text-[#F02D50] text-[10px] font-mono font-bold">
                    {awayGoals.length}
                  </span>
                </div>

                {/* Add Goal for Away Team */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedAwayPlayerToAdd}
                    onChange={e => setSelectedAwayPlayerToAdd(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-[#101013] border border-white/10 text-[#F0E9E7] focus:border-[#F02D50] focus:outline-none truncate"
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
                    className="px-2.5 py-1.5 rounded-lg bg-[#F02D50] text-white text-xs font-bold hover:bg-[#FF3358] transition disabled:opacity-40 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* List of Away Goals */}
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {awayGoals.length === 0 ? (
                    <div className="text-[11px] text-[#A5A1A4] italic py-1 text-center font-mono">
                      No goals recorded yet.
                    </div>
                  ) : (
                    awayGoals.map((g, idx) => {
                      const player = playersMap.get(g.player_id);
                      return (
                        <div
                          key={`ag-${idx}-${g.player_id}`}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#101013] border border-white/10 text-xs text-[#F0E9E7]"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-4 text-center font-mono text-[10px] text-[#F02D50]">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold truncate">
                              {player?.name || 'Unknown Player'}
                            </span>
                            {player?.position && (
                              <span className="text-[10px] text-[#A5A1A4] font-mono">
                                ({player.position})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAwayGoal(idx)}
                            className="p-1 text-[#A5A1A4] hover:text-rose-400 transition cursor-pointer"
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
          <div className="space-y-2 pt-2 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-[#F0E9E7] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Player of the Match (POTM)</span>
              </label>
              <span className="text-[10px] text-[#A5A1A4] font-mono">
                Eligible from participating squads
              </span>
            </div>

            <select
              value={selectedMotmId}
              onChange={e => setSelectedMotmId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] focus:border-[#F02D50] focus:outline-none"
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
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#21191D] border border-amber-500/30 text-xs text-amber-300">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-[#F0E9E7]">
                  {playersMap.get(selectedMotmId)?.name}
                </span>
                <span className="text-[#A5A1A4] text-[11px]">
                  awarded POTM for Match #{match.match_number}
                </span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/[0.08] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-white/10 text-[#A5A1A4] hover:text-[#F0E9E7] hover:bg-[#141418] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || hasDiscrepancy}
              className="px-5 py-2 rounded-xl bg-[#F02D50] hover:bg-[#FF3358] text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
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
