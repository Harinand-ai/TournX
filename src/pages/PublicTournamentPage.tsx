import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Calendar, 
  Clock, 
  Shield, 
  Share2, 
  Check, 
  ChevronRight,
  LogOut,
  Filter,
  MapPin,
  Award,
  Edit,
  ExternalLink,
  Star
} from 'lucide-react';
import { Tournament } from '../types/multiTenant';
import { Team, Match, Player, Goal, ManOfTheMatch } from '../types/tournament';
import { localDataService, DEMO_TOURNAMENT_ID } from '../services/localDataService';
import { tournamentService } from '../services/tournamentService';
import { TeamBadge } from '../components/TeamBadge';
import { StatsAndLeadersView } from '../components/stats/StatsAndLeadersView';
import { MatchScoreEditorModal } from '../components/match/MatchScoreEditorModal';

interface PublicTournamentPageProps {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  players: Player[];
  standings: any[];
  topScorers: any[];
  goals?: Goal[];
  motms?: ManOfTheMatch[];
  sessionRole?: 'ORGANIZER' | 'SCORE' | 'VIEW' | 'ANONYMOUS' | null;
  isOrganizerLoggedIn?: boolean;
  onNavigateToWorkspace?: () => void;
  onNavigateHome?: () => void;
  onLeaveTournament?: () => void;
  onDataChanged?: () => void;
}

type PublicTab = 'overview' | 'fixtures' | 'standings' | 'teams' | 'stats';

export function PublicTournamentPage({
  tournament,
  teams,
  matches,
  players,
  standings,
  topScorers: _topScorers,
  goals = [],
  motms = [],
  sessionRole,
  isOrganizerLoggedIn,
  onNavigateToWorkspace,
  onNavigateHome,
  onLeaveTournament,
  onDataChanged
}: PublicTournamentPageProps) {
  const [activeTab, setActiveTab] = useState<PublicTab>('overview');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Fixture Filters
  const [filterRound, setFilterRound] = useState<string>('ALL');
  const [filterTeamId, setFilterTeamId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modifier Match Score Editing
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  const isModifier = sessionRole === 'SCORE' || sessionRole === 'ORGANIZER' || isOrganizerLoggedIn;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleConfirmLeave = () => {
    setShowLeaveModal(false);
    localDataService.clearLastJoinedTournament();
    localDataService.setSessionRole(tournament.id, null);
    localDataService.setActiveTournamentId(DEMO_TOURNAMENT_ID);
    try {
      window.history.pushState(null, '', '/');
    } catch {}
    if (onLeaveTournament) {
      onLeaveTournament();
    } else if (onNavigateHome) {
      onNavigateHome();
    }
  };

  // Match lookup helpers
  const teamsMap = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
  const playersMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  // Dynamic match categorization
  const liveMatches = useMemo(() => matches.filter(m => m.status === 'LIVE'), [matches]);

  const upcomingMatches = useMemo(() => {
    return matches
      .filter(m => m.status === 'UPCOMING')
      .sort((a, b) => {
        if (a.scheduled_date && b.scheduled_date) {
          const dc = a.scheduled_date.localeCompare(b.scheduled_date);
          if (dc !== 0) return dc;
          if (a.scheduled_time && b.scheduled_time) {
            return a.scheduled_time.localeCompare(b.scheduled_time);
          }
        }
        return a.match_number - b.match_number;
      });
  }, [matches]);

  const nextUpcomingMatch = useMemo(() => upcomingMatches[0] || null, [upcomingMatches]);

  const completedMatches = useMemo(() => {
    return matches
      .filter(m => m.status === 'COMPLETED')
      .sort((a, b) => {
        if (a.scheduled_date && b.scheduled_date) {
          const dc = b.scheduled_date.localeCompare(a.scheduled_date);
          if (dc !== 0) return dc;
        }
        return b.match_number - a.match_number;
      });
  }, [matches]);

  // Filtered fixtures
  const availableRounds = useMemo(() => {
    const rounds = Array.from(new Set(matches.map(m => m.round_number).filter((r): r is number => typeof r === 'number')));
    return rounds.sort((a, b) => a - b);
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (filterRound !== 'ALL' && m.round_number !== Number(filterRound)) return false;
      if (filterTeamId !== 'ALL' && m.home_team_id !== filterTeamId && m.away_team_id !== filterTeamId) return false;
      if (filterStatus !== 'ALL' && m.status !== filterStatus) return false;
      return true;
    }).sort((a, b) => {
      const statusWeight: Record<string, number> = { LIVE: 1, UPCOMING: 2, COMPLETED: 3, POSTPONED: 4 };
      const weightDiff = (statusWeight[a.status] || 2) - (statusWeight[b.status] || 2);
      if (weightDiff !== 0) return weightDiff;
      return a.match_number - b.match_number;
    });
  }, [matches, filterRound, filterTeamId, filterStatus]);

  const activeRosterTeam = useMemo(() => {
    if (selectedTeamId) {
      return teams.find(t => t.id === selectedTeamId) || teams[0];
    }
    return teams[0];
  }, [teams, selectedTeamId]);

  const activeRosterPlayers = useMemo(() => {
    if (!activeRosterTeam) return [];
    return players.filter(p => p.team_id === activeRosterTeam.id);
  }, [players, activeRosterTeam]);

  // Handle Modifier Saving Score
  const handleSaveScoreFromModifier = async (params: {
    matchId: string;
    status: Match['status'];
    homeScore: number | null;
    awayScore: number | null;
    scheduledDate: string | null;
    venue: string | null;
    goals: { player_id: string; team_id: string }[];
    motmPlayerId?: string;
  }) => {
    await tournamentService.saveSimplifiedMatch(
      params.matchId,
      params.status,
      {
        scheduled_date: params.scheduledDate,
        scheduled_time: null,
        venue: params.venue,
        referee: null,
        assistant_referee_1: null,
        assistant_referee_2: null,
      },
      params.homeScore,
      params.awayScore,
      params.goals,
      params.motmPlayerId
    );
    onDataChanged?.();
  };

  return (
    <div className="theme-minecraft-stadium min-h-screen py-4 sm:py-6 px-3 sm:px-6">
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-5">
        
        {/* Subtle, refined organizer indicator (only for verified organizers) */}
        {isOrganizerLoggedIn && (
          <div className="px-3.5 py-2 rounded-xl bg-[#132219] border border-emerald-800/40 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-medium text-emerald-300">
                Organizer View • Match modifier tools enabled
              </span>
            </div>
            {onNavigateToWorkspace && (
              <button
                type="button"
                onClick={onNavigateToWorkspace}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 hover:text-white transition cursor-pointer"
              >
                <span>Workspace</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Subtle modifier indicator (for SCORE role collaborators) */}
        {sessionRole === 'SCORE' && !isOrganizerLoggedIn && (
          <div className="px-3.5 py-2 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center gap-2 text-xs text-amber-200">
            <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] font-medium">
              Match Modifier Access (SCORE) • You can record and edit match scores & player awards
            </span>
          </div>
        )}

        {/* Compact Tournament Header */}
        <header className="stadium-card p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#16271e] border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-xs">
                <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-pixel text-emerald-400 uppercase tracking-wider">
                    TournX Stadium Hub
                  </span>
                  {liveMatches.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-950/80 border border-rose-500/50 text-rose-300 text-[9px] font-bold uppercase animate-pulse">
                      Live Matches
                    </span>
                  )}
                </div>
                <h1 className="text-lg sm:text-2xl font-bold text-slate-100 tracking-tight truncate">
                  {tournament.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 sm:px-3.5 py-2 stadium-block-btn text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                title="Copy tournament share link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Share'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLeaveModal(true)}
                className="px-3 py-2 rounded-lg bg-[#141d18] hover:bg-[#1a2620] text-slate-300 hover:text-white text-xs font-medium border border-[#233529] transition cursor-pointer flex items-center gap-1.5"
                title="Leave tournament"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </div>
          </div>

          {tournament.description && (
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {tournament.description}
            </p>
          )}

          {/* Quieter Secondary Metadata Row */}
          <div className="pt-2.5 border-t border-[#1f2e26] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>{teams.length} Clubs</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>{matches.length} Matches</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>{tournament.rules_config?.match_duration_minutes || 50} mins/match</span>
            </span>
            {tournament.season && (
              <span className="text-slate-400 hidden sm:inline">
                • Season {tournament.season}
              </span>
            )}
          </div>
        </header>

        {/* Compact Navigation Tabs (Scrollable on Android/Mobile) */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'fixtures', label: `Fixtures (${matches.length})` },
            { id: 'standings', label: 'Standings' },
            { id: 'teams', label: `Clubs (${teams.length})` },
            { id: 'stats', label: 'Stats & POTM' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as PublicTab)}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap text-xs font-semibold transition cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'stadium-pill-active'
                  : 'stadium-pill-inactive'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* ==================== TAB 1: OVERVIEW ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            
            {/* Live Matches Hero */}
            {liveMatches.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <h2 className="text-xs font-pixel uppercase tracking-wider text-rose-400">
                    Live Stadium Action
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {liveMatches.map((m) => {
                    const home = teamsMap.get(m.home_team_id);
                    const away = teamsMap.get(m.away_team_id);

                    return (
                      <div key={m.id} className="stadium-card-live p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs text-emerald-300/80">
                          <span className="text-[11px] font-medium text-slate-300">
                            Match #{m.match_number} • Round {m.round_number || 1}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-500/50 text-rose-300 font-pixel text-[10px] animate-pulse">
                            LIVE
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-2 items-center text-center py-1">
                          <div className="col-span-2 space-y-1">
                            <div className="flex items-center justify-center">
                              {home && <TeamBadge team={home} size="sm" />}
                            </div>
                            <span className="font-semibold text-xs text-slate-100 block truncate">
                              {home?.name || 'Home'}
                            </span>
                          </div>

                          <div className="col-span-1">
                            <div className="font-pixel-score text-xl text-emerald-400">
                              {m.home_score ?? 0} : {m.away_score ?? 0}
                            </div>
                          </div>

                          <div className="col-span-2 space-y-1">
                            <div className="flex items-center justify-center">
                              {away && <TeamBadge team={away} size="sm" />}
                            </div>
                            <span className="font-semibold text-xs text-slate-100 block truncate">
                              {away?.name || 'Away'}
                            </span>
                          </div>
                        </div>

                        {/* Modifier Quick Action */}
                        {isModifier && (
                          <div className="pt-2 border-t border-[#1f2e26] flex justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingMatch(m)}
                              className="px-3 py-1.5 stadium-block-btn text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Update Score & Events</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Next Upcoming Match Banner */}
            {nextUpcomingMatch && liveMatches.length === 0 && (
              <div className="stadium-card p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Next Match Scheduled</span>
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{nextUpcomingMatch.scheduled_date || 'Date TBD'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 items-center text-center py-2">
                  <div className="col-span-2 space-y-1">
                    <div className="flex items-center justify-center">
                      {teamsMap.get(nextUpcomingMatch.home_team_id) && (
                        <TeamBadge team={teamsMap.get(nextUpcomingMatch.home_team_id)!} size="sm" />
                      )}
                    </div>
                    <span className="font-semibold text-xs sm:text-sm text-slate-100 block truncate">
                      {teamsMap.get(nextUpcomingMatch.home_team_id)?.name || 'Home'}
                    </span>
                  </div>

                  <div className="col-span-1">
                    <span className="font-pixel text-slate-500 text-xs">VS</span>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <div className="flex items-center justify-center">
                      {teamsMap.get(nextUpcomingMatch.away_team_id) && (
                        <TeamBadge team={teamsMap.get(nextUpcomingMatch.away_team_id)!} size="sm" />
                      )}
                    </div>
                    <span className="font-semibold text-xs sm:text-sm text-slate-100 block truncate">
                      {teamsMap.get(nextUpcomingMatch.away_team_id)?.name || 'Away'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1f2e26] text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="truncate">{nextUpcomingMatch.venue || 'Kannur Municipal Stadium'}</span>
                  </span>
                  {isModifier && (
                    <button
                      type="button"
                      onClick={() => setEditingMatch(nextUpcomingMatch)}
                      className="px-2.5 py-1 stadium-block-btn text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Prepare Match</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Recent Completed Matches Section */}
            {completedMatches.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Recent Match Results</span>
                  </h2>
                  <button
                    onClick={() => setActiveTab('fixtures')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {completedMatches.slice(0, 3).map((m) => {
                    const home = teamsMap.get(m.home_team_id);
                    const away = teamsMap.get(m.away_team_id);
                    const matchMotm = motms.find(motm => motm.match_id === m.id);
                    const motmPlayer = matchMotm ? playersMap.get(matchMotm.player_id) : null;
                    const matchGoals = goals.filter(g => g.match_id === m.id);

                    return (
                      <div key={m.id} className="stadium-card p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            Match #{m.match_number} • Round {m.round_number || 1}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#16271e] text-emerald-400 font-pixel text-[9px] border border-emerald-800/40">
                            FINAL
                          </span>
                        </div>

                        {/* Teams & Score */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {home && <TeamBadge team={home} size="xs" />}
                            <span className="font-semibold text-xs text-slate-100 truncate">
                              {home?.name || 'Home'}
                            </span>
                          </div>

                          <div className="px-2.5 py-1 rounded bg-[#0b110e] border border-[#1f2e26] font-pixel-score text-sm text-emerald-400 shrink-0 mx-2">
                            {m.home_score} : {m.away_score}
                          </div>

                          <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
                            <span className="font-semibold text-xs text-slate-100 truncate">
                              {away?.name || 'Away'}
                            </span>
                            {away && <TeamBadge team={away} size="xs" />}
                          </div>
                        </div>

                        {/* Goalscorers & POTM Footer */}
                        <div className="pt-2 border-t border-[#1f2e26] flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            {motmPlayer && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-800/40 text-amber-300 text-[11px]">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>POTM: {motmPlayer.name}</span>
                              </div>
                            )}
                            {matchGoals.length > 0 && (
                              <span className="text-[11px] text-slate-400">
                                ⚽ {matchGoals.length} goal{matchGoals.length === 1 ? '' : 's'}
                              </span>
                            )}
                          </div>

                          {isModifier && (
                            <button
                              type="button"
                              onClick={() => setEditingMatch(m)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Standings Preview */}
            <div className="stadium-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Standings Snapshot
                </h2>
                <button
                  onClick={() => setActiveTab('standings')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Full Table</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[11px] text-slate-400 border-b border-[#1f2e26]">
                      <th className="py-2 w-8">#</th>
                      <th className="py-2">Club</th>
                      <th className="py-2 text-center w-8">P</th>
                      <th className="py-2 text-center w-8">GD</th>
                      <th className="py-2 text-center w-10 font-bold text-emerald-400">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18261e]">
                    {standings.slice(0, 5).map((s, idx) => (
                      <tr key={s.team.id} className="hover:bg-[#15201b] transition-colors">
                        <td className="py-2 text-xs text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <TeamBadge team={s.team} size="xs" />
                            <span className="font-semibold text-slate-100 truncate">{s.team.name}</span>
                          </div>
                        </td>
                        <td className="py-2 text-center text-slate-300">{s.played}</td>
                        <td className="py-2 text-center text-slate-400 font-mono">
                          {s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}
                        </td>
                        <td className="py-2 text-center font-bold text-emerald-400">{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 2: FIXTURES & RESULTS ==================== */}
        {activeTab === 'fixtures' && (
          <div className="space-y-3.5">
            {/* Filter Toolbar */}
            <div className="stadium-card p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                
                {/* Round Filter */}
                <select
                  value={filterRound}
                  onChange={e => setFilterRound(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0b110e] border border-[#233529] text-slate-200 text-xs focus:outline-none"
                >
                  <option value="ALL">All Rounds</option>
                  {availableRounds.map(r => (
                    <option key={r} value={r}>Round {r}</option>
                  ))}
                </select>

                {/* Team Filter */}
                <select
                  value={filterTeamId}
                  onChange={e => setFilterTeamId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0b110e] border border-[#233529] text-slate-200 text-xs focus:outline-none truncate max-w-[130px]"
                >
                  <option value="ALL">All Clubs</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0b110e] border border-[#233529] text-slate-200 text-xs focus:outline-none"
                >
                  <option value="ALL">All Status</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="LIVE">Live</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <span className="text-[11px] text-slate-400">
                {filteredMatches.length} Fixtures
              </span>
            </div>

            {/* Match Cards List */}
            <div className="space-y-2.5">
              {filteredMatches.length === 0 ? (
                <div className="stadium-card p-8 text-center text-slate-400 text-xs">
                  No matches found for the selected filter.
                </div>
              ) : (
                filteredMatches.map((m) => {
                  const home = teamsMap.get(m.home_team_id);
                  const away = teamsMap.get(m.away_team_id);
                  const matchMotm = motms.find(motm => motm.match_id === m.id);
                  const motmPlayer = matchMotm ? playersMap.get(matchMotm.player_id) : null;
                  const matchGoals = goals.filter(g => g.match_id === m.id);
                  const isCompleted = m.status === 'COMPLETED';
                  const isLive = m.status === 'LIVE';

                  return (
                    <div
                      key={m.id}
                      className={`stadium-card p-3.5 space-y-2.5 ${
                        isLive ? 'stadium-card-live' : 'stadium-card-hover'
                      }`}
                    >
                      {/* Top Header Line */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-pixel text-emerald-400">
                            Round {m.round_number || 1} • Match #{m.match_number}
                          </span>
                          {m.venue && (
                            <span className="text-slate-400 text-[11px] hidden sm:inline flex items-center gap-1">
                              • <MapPin className="w-3 h-3 text-slate-500 inline" /> {m.venue}
                            </span>
                          )}
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          isCompleted ? 'bg-[#15201b] text-slate-300 border border-[#233529]' :
                          isLive ? 'bg-rose-950 text-rose-300 border border-rose-500/60 animate-pulse' :
                          'bg-[#121c17] text-slate-400 border border-[#1f2e26]'
                        }`}>
                          {m.status}
                        </span>
                      </div>

                      {/* Main Scoreboard Row */}
                      <div className="grid grid-cols-5 gap-2 items-center text-center py-1">
                        <div className="col-span-2 space-y-1">
                          <div className="flex items-center justify-center">
                            {home && <TeamBadge team={home} size="sm" />}
                          </div>
                          <span className="font-semibold text-xs sm:text-sm text-slate-100 block truncate">
                            {home?.name || 'Home'}
                          </span>
                        </div>

                        <div className="col-span-1">
                          {isCompleted ? (
                            <div className="font-pixel-score text-base sm:text-lg text-emerald-400">
                              {m.home_score} : {m.away_score}
                            </div>
                          ) : isLive ? (
                            <div className="font-pixel-score text-base sm:text-lg text-rose-400">
                              {m.home_score ?? 0} : {m.away_score ?? 0}
                            </div>
                          ) : (
                            <div className="text-slate-400 font-semibold text-xs">
                              VS
                            </div>
                          )}
                        </div>

                        <div className="col-span-2 space-y-1">
                          <div className="flex items-center justify-center">
                            {away && <TeamBadge team={away} size="sm" />}
                          </div>
                          <span className="font-semibold text-xs sm:text-sm text-slate-100 block truncate">
                            {away?.name || 'Away'}
                          </span>
                        </div>
                      </div>

                      {/* Match Details & Events Footer */}
                      <div className="pt-2 border-t border-[#1f2e26] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          {motmPlayer && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300 text-[11px] font-medium">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>POTM: {motmPlayer.name}</span>
                            </div>
                          )}
                          {isCompleted && matchGoals.length > 0 && (
                            <span className="text-[11px] text-slate-400">
                              ⚽ {matchGoals.length} goal{matchGoals.length === 1 ? '' : 's'}
                            </span>
                          )}
                          {!isCompleted && m.scheduled_date && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{m.scheduled_date}</span>
                            </span>
                          )}
                        </div>

                        {/* Modifier Score Button */}
                        {isModifier && (
                          <button
                            type="button"
                            onClick={() => setEditingMatch(m)}
                            className="px-2.5 py-1 stadium-block-btn text-xs font-semibold flex items-center gap-1 cursor-pointer ml-auto"
                          >
                            <Edit className="w-3 h-3" />
                            <span>{isCompleted ? 'Edit Score' : 'Record Score'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: STANDINGS ==================== */}
        {activeTab === 'standings' && (
          <div className="stadium-card p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#1f2e26] pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-100">
                  Official League Table
                </h2>
                <span className="text-xs text-slate-400 font-sans">
                  Standings calculated directly from match results
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                W=3 • D=1 • L=0
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="text-[11px] text-slate-400 border-b border-[#1f2e26]">
                    <th className="py-2 w-8">#</th>
                    <th className="py-2">Club</th>
                    <th className="py-2 text-center w-8">P</th>
                    <th className="py-2 text-center w-8">W</th>
                    <th className="py-2 text-center w-8">D</th>
                    <th className="py-2 text-center w-8">L</th>
                    <th className="py-2 text-center w-8">GF</th>
                    <th className="py-2 text-center w-8">GA</th>
                    <th className="py-2 text-center w-9">GD</th>
                    <th className="py-2 text-center w-10 font-bold text-emerald-400">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18261e]">
                  {standings.map((s, idx) => (
                    <tr key={s.team.id} className="hover:bg-[#15201b] transition-colors">
                      <td className="py-2.5 font-mono text-xs text-slate-400">{idx + 1}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <TeamBadge team={s.team} size="xs" />
                          <span className="font-semibold text-slate-100 truncate">{s.team.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-slate-300">{s.played}</td>
                      <td className="py-2.5 text-center text-slate-300">{s.won}</td>
                      <td className="py-2.5 text-center text-slate-300">{s.drawn}</td>
                      <td className="py-2.5 text-center text-slate-300">{s.lost}</td>
                      <td className="py-2.5 text-center text-slate-300">{s.goals_for}</td>
                      <td className="py-2.5 text-center text-slate-300">{s.goals_against}</td>
                      <td className="py-2.5 text-center text-slate-400 font-mono">
                        {s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}
                      </td>
                      <td className="py-2.5 text-center font-bold text-emerald-400 text-sm">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: CLUBS & SQUADS ==================== */}
        {activeTab === 'teams' && (
          <div className="space-y-3.5">
            {/* Club Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                    activeRosterTeam?.id === t.id
                      ? 'stadium-pill-active'
                      : 'stadium-pill-inactive'
                  }`}
                >
                  <TeamBadge team={t} size="xs" />
                  <span className="truncate max-w-[120px]">{t.name}</span>
                </button>
              ))}
            </div>

            {/* Active Squad Card */}
            {activeRosterTeam && (
              <div className="stadium-card p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#1f2e26] pb-3">
                  <div className="flex items-center gap-3">
                    <TeamBadge team={activeRosterTeam} size="md" />
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-100">
                        {activeRosterTeam.name}
                      </h2>
                      <span className="text-xs text-slate-400">
                        Manager: <span className="text-slate-200 font-medium">{activeRosterTeam.manager_name || 'None'}</span>
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-[#16271e] text-emerald-300 font-semibold text-xs border border-emerald-800/40">
                    {activeRosterPlayers.length} Players
                  </span>
                </div>

                {/* Squad Members Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {activeRosterPlayers.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-xs text-slate-400 italic">
                      No registered players in this squad.
                    </div>
                  ) : (
                    activeRosterPlayers.map(p => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-xl bg-[#0e1612] border border-[#1f2e26] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt={p.name}
                              className="w-8 h-8 rounded-lg object-cover border border-[#233529] shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#16271e] text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-800/30 text-xs">
                              {p.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-100 block truncate">
                              {p.name} {p.is_captain && '★'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Jersey #{p.jersey_number ?? '-'}
                            </span>
                          </div>
                        </div>

                        <span className="px-1.5 py-0.5 rounded bg-[#16271e] text-emerald-300 font-mono text-[10px] border border-emerald-800/30 shrink-0">
                          {p.position || 'MID'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 5: STATS & POTM ==================== */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <StatsAndLeadersView
              goals={goals}
              motms={motms}
              players={players}
              teams={teams}
              matches={matches}
              theme="minecraft"
            />
          </div>
        )}

      </div>

      {/* Match Score & Events Editor Modal for Modifiers */}
      {isModifier && editingMatch && (
        <MatchScoreEditorModal
          isOpen={Boolean(editingMatch)}
          onClose={() => setEditingMatch(null)}
          match={editingMatch}
          homeTeam={teamsMap.get(editingMatch.home_team_id)}
          awayTeam={teamsMap.get(editingMatch.away_team_id)}
          players={players}
          currentGoals={goals}
          currentMotm={motms.find(m => m.match_id === editingMatch.id)}
          onSave={handleSaveScoreFromModifier}
        />
      )}

      {/* LEAVE TOURNAMENT CONFIRMATION MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm stadium-card p-5 space-y-4 border border-[#233529] shadow-2xl text-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-400">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">Leave Tournament?</h3>
                <p className="text-[11px] text-slate-400">Exit the current participant hub</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to leave <span className="font-semibold text-emerald-400">{tournament.name}</span>? This will clear this tournament from your device&apos;s active session. You can rejoin at any time using your tournament code or link.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1f2e26]">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#121a16] hover:bg-[#18261e] border border-[#233529] text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Tournament</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
