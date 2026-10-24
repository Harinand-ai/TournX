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
  MapPin,
  Award,
  Edit,
  ExternalLink,
  Users
} from 'lucide-react';
import { Tournament } from '../types/multiTenant';
import { Team, Match, Player, Goal, ManOfTheMatch } from '../types/tournament';
import { localDataService, DEMO_TOURNAMENT_ID } from '../services/localDataService';
import { tournamentService } from '../services/tournamentService';
import { TeamBadge } from '../components/TeamBadge';
import { StatsAndLeadersView } from '../components/stats/StatsAndLeadersView';
import { MatchScoreEditorModal } from '../components/match/MatchScoreEditorModal';
import { PageTransition3D } from '../components/PageTransition3D';
import { ShareTournamentModal } from '../components/ShareTournamentModal';

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
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Fixture Filters
  const [filterRound, setFilterRound] = useState<string>('ALL');
  const [filterTeamId, setFilterTeamId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modifier Match Score Editing
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  const isModifier = sessionRole === 'SCORE' || sessionRole === 'ORGANIZER' || isOrganizerLoggedIn;

  const handleConfirmLeave = () => {
    setShowLeaveModal(false);
    localDataService.clearLastJoinedTournament();
    localDataService.setSessionRole(tournament.id, null);
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

  const liveMatches = useMemo(() => {
    return matches.filter(m => m.status === 'LIVE');
  }, [matches]);

  const upcomingMatches = useMemo(() => {
    return matches
      .filter(m => m.status === 'UPCOMING')
      .sort((a, b) => {
        if (a.scheduled_date && b.scheduled_date) {
          const dc = a.scheduled_date.localeCompare(b.scheduled_date);
          if (dc !== 0) return dc;
        }
        return a.match_number - b.match_number;
      });
  }, [matches]);

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

  // Next prominent match to show in hero (live match or next upcoming fixture)
  const heroMatch = liveMatches[0] || upcomingMatches[0] || completedMatches[0] || null;

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
    if (onDataChanged) {
      onDataChanged();
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#faf9f5] text-[#0f1712] pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-6">

        {/* Status & Role Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[#e5e3d8] shadow-2xs text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="font-semibold text-[#0f1712]">
              {isOrganizerLoggedIn
                ? 'Organizer Control Mode'
                : sessionRole === 'SCORE'
                ? 'Scorekeeper Access Mode'
                : 'Participant Scoreboard • Read-Only'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isOrganizerLoggedIn && onNavigateToWorkspace && (
              <button
                type="button"
                onClick={onNavigateToWorkspace}
                className="px-2.5 py-1 rounded-md bg-[#0f1712] text-white font-medium hover:bg-[#1f2e24] transition cursor-pointer flex items-center gap-1"
              >
                <span>Workspace</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-2.5 py-1 rounded-md border border-[#e5e3d8] bg-[#f4f2ea] hover:bg-[#eae7dc] text-[#0f1712] font-medium transition cursor-pointer flex items-center gap-1"
            >
              <Share2 className="w-3 h-3" />
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="px-2.5 py-1 rounded-md text-[#57635a] hover:text-[#0f1712] hover:bg-[#f4f2ea] transition cursor-pointer flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* Minimalist Editorial Header */}
        <header className="p-6 sm:p-8 rounded-2xl bg-white border border-[#e5e3d8] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 text-emerald-700" />
                <span>Tournament Hub</span>
                {liveMatches.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold animate-pulse">
                    {liveMatches.length} Live
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1712] tracking-tight">
                {tournament.name}
              </h1>
              {tournament.description && (
                <p className="text-xs sm:text-sm text-[#57635a] font-sans leading-relaxed pt-1">
                  {tournament.description}
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#e5e3d8] flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#57635a]">
            <span className="flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-emerald-700" />
              <span>{teams.length} Clubs</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>{matches.length} Matches</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-700" />
              <span>{tournament.rules_config?.match_duration_minutes || 50} mins</span>
            </span>
            {tournament.season && (
              <span className="text-[#8a968d]">
                • Season {tournament.season}
              </span>
            )}
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 border-b border-[#e5e3d8] overflow-x-auto pb-1 text-xs">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'fixtures', label: `Fixtures (${matches.length})` },
            { id: 'standings', label: 'Standings' },
            { id: 'teams', label: `Squads (${teams.length})` },
            { id: 'stats', label: 'Statistics' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as PublicTab)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0f1712] text-white shadow-xs'
                  : 'text-[#57635a] hover:text-[#0f1712] hover:bg-[#f4f2ea]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* TAB PANELS WITH 3D DEPTH TRANSITION */}
        <PageTransition3D transitionKey={activeTab} type="depth">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* DOMINANT VISUAL CENTERPIECE: Editorial Hero Match */}
              {heroMatch && (
                <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#e5e3d8] shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        heroMatch.status === 'LIVE' ? 'bg-rose-600 animate-ping' : heroMatch.status === 'COMPLETED' ? 'bg-[#57635a]' : 'bg-emerald-600'
                      }`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#0f1712]">
                        {heroMatch.status === 'LIVE'
                          ? 'Live Stadium Match'
                          : heroMatch.status === 'COMPLETED'
                          ? 'Latest Match Result'
                          : 'Next Scheduled Fixture'}
                      </span>
                    </div>

                    <span className="text-xs font-medium text-[#57635a]">
                      Match {heroMatch.match_number}
                    </span>
                  </div>

                  {/* Editorial Teams & Score Typography */}
                  {(() => {
                    const home = teamsMap.get(heroMatch.home_team_id);
                    const away = teamsMap.get(heroMatch.away_team_id);
                    return (
                      <div className="py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-6 text-center sm:text-left">
                          
                          {/* Home Club */}
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <TeamBadge team={home} size="lg" />
                            <div>
                              <div className="text-lg sm:text-xl font-bold text-[#0f1712]">
                                {home?.name || heroMatch.home_team_id || 'TBD'}
                              </div>
                              <div className="text-xs text-[#57635a]">Home Club</div>
                            </div>
                          </div>

                          {/* Center Score / Time Composition */}
                          <div className="flex flex-col items-center justify-center">
                            {heroMatch.status === 'COMPLETED' || heroMatch.status === 'LIVE' ? (
                              <div className="font-editorial-num text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0f1712]">
                                {heroMatch.home_score ?? 0} <span className="text-[#8a968d]">-</span> {heroMatch.away_score ?? 0}
                              </div>
                            ) : (
                              <div className="space-y-1 text-center">
                                <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                                  {heroMatch.scheduled_time || 'Upcoming'}
                                </div>
                                <div className="text-xs text-[#57635a]">
                                  {heroMatch.scheduled_date || 'Date TBD'}
                                </div>
                              </div>
                            )}

                            {heroMatch.venue && (
                              <div className="flex items-center gap-1 text-[11px] text-[#57635a] mt-2">
                                <MapPin className="w-3 h-3" />
                                <span>{heroMatch.venue}</span>
                              </div>
                            )}
                          </div>

                          {/* Away Club */}
                          <div className="flex flex-col sm:flex-row-reverse items-center gap-3 text-center sm:text-right">
                            <TeamBadge team={away} size="lg" />
                            <div>
                              <div className="text-lg sm:text-xl font-bold text-[#0f1712]">
                                {away?.name || heroMatch.away_team_id || 'TBD'}
                              </div>
                              <div className="text-xs text-[#57635a]">Away Club</div>
                            </div>
                          </div>

                        </div>

                        {/* Modifier Quick Action */}
                        {isModifier && (
                          <div className="mt-6 pt-4 border-t border-[#e5e3d8] flex justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingMatch(heroMatch)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#0f1712] hover:bg-[#1f2e24] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Update Match Score</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Upcoming Fixtures Quick List */}
              <div className="p-6 rounded-2xl bg-white border border-[#e5e3d8] shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#e5e3d8]">
                  <h2 className="text-sm font-bold text-[#0f1712] uppercase tracking-wider">
                    Upcoming Matchday Schedule
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('fixtures')}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                  >
                    <span>All Fixtures</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {upcomingMatches.length === 0 ? (
                  <p className="text-xs text-[#57635a] py-4 text-center">
                    No upcoming fixtures scheduled. All matches have concluded.
                  </p>
                ) : (
                  <div className="divide-y divide-[#e5e3d8]">
                    {upcomingMatches.slice(0, 4).map((m) => {
                      const home = teamsMap.get(m.home_team_id);
                      const away = teamsMap.get(m.away_team_id);
                      return (
                        <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono font-bold text-[#57635a] w-6">
                              #{m.match_number}
                            </span>
                            <span className="text-xs font-bold text-[#0f1712] truncate">
                              {home?.name || m.home_team_id}
                            </span>
                            <span className="text-xs text-[#8a968d]">vs</span>
                            <span className="text-xs font-bold text-[#0f1712] truncate">
                              {away?.name || m.away_team_id}
                            </span>
                          </div>

                          <div className="text-right text-xs shrink-0">
                            <div className="font-semibold text-[#0f1712]">
                              {m.scheduled_time || 'Time TBD'}
                            </div>
                            <div className="text-[11px] text-[#57635a]">
                              {m.scheduled_date || 'Date TBD'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Standings Snapshot */}
              {standings && standings.length > 0 && (
                <div className="p-6 rounded-2xl bg-white border border-[#e5e3d8] shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#e5e3d8]">
                    <h2 className="text-sm font-bold text-[#0f1712] uppercase tracking-wider">
                      League Table Snapshot
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('standings')}
                      className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                    >
                      <span>Full Table</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#e5e3d8] text-[#57635a]">
                          <th className="py-2 pr-3 font-semibold">Pos</th>
                          <th className="py-2 px-3 font-semibold">Club</th>
                          <th className="py-2 px-2 text-center font-semibold">P</th>
                          <th className="py-2 px-2 text-center font-semibold">GD</th>
                          <th className="py-2 pl-3 text-right font-bold text-[#0f1712]">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e5e3d8]">
                        {standings.slice(0, 5).map((row, idx) => (
                          <tr key={row.team_id || idx} className="hover:bg-[#faf9f5]">
                            <td className="py-2.5 pr-3 font-mono font-bold text-[#57635a]">
                              0{idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-[#0f1712]">
                              {row.team_name}
                            </td>
                            <td className="py-2.5 px-2 text-center text-[#57635a]">
                              {row.played}
                            </td>
                            <td className="py-2.5 px-2 text-center text-[#57635a]">
                              {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                            </td>
                            <td className="py-2.5 pl-3 text-right font-editorial-num font-extrabold text-[#0f1712]">
                              {row.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: FIXTURES & RESULTS */}
          {activeTab === 'fixtures' && (
            <div className="space-y-4">
              
              {/* Fixture Filters */}
              <div className="p-4 rounded-xl bg-white border border-[#e5e3d8] flex flex-wrap items-center gap-3 text-xs">
                <div>
                  <label className="text-[11px] text-[#57635a] block mb-1">Round</label>
                  <select
                    value={filterRound}
                    onChange={(e) => setFilterRound(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#faf9f5] border border-[#e5e3d8] text-[#0f1712] font-medium"
                  >
                    <option value="ALL">All Rounds</option>
                    {availableRounds.map(r => (
                      <option key={r} value={String(r)}>Round {r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#57635a] block mb-1">Club</label>
                  <select
                    value={filterTeamId}
                    onChange={(e) => setFilterTeamId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#faf9f5] border border-[#e5e3d8] text-[#0f1712] font-medium"
                  >
                    <option value="ALL">All Clubs</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#57635a] block mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#faf9f5] border border-[#e5e3d8] text-[#0f1712] font-medium"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="LIVE">Live</option>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              {/* Fixtures List */}
              <div className="space-y-3">
                {filteredMatches.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#57635a] bg-white rounded-xl border border-[#e5e3d8]">
                    No matches found matching selected filters.
                  </div>
                ) : (
                  filteredMatches.map((m) => {
                    const home = teamsMap.get(m.home_team_id);
                    const away = teamsMap.get(m.away_team_id);
                    const isLive = m.status === 'LIVE';
                    const isCompleted = m.status === 'COMPLETED';

                    return (
                      <div
                        key={m.id}
                        className={`p-4 sm:p-5 rounded-xl border transition ${
                          isLive
                            ? 'bg-rose-50/50 border-rose-300 shadow-xs'
                            : 'bg-white border-[#e5e3d8] hover:border-[#c9c5b6]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-[#57635a] mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#0f1712]">
                              Match {m.match_number}
                            </span>
                            {m.round_number && (
                              <span>• Round {m.round_number}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {isLive && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px] uppercase animate-pulse">
                                Live
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-2 py-0.5 rounded-full bg-[#f4f2ea] text-[#57635a] font-semibold text-[10px] uppercase">
                                Final
                              </span>
                            )}
                            {!isLive && !isCompleted && (
                              <span className="text-[11px] text-[#57635a]">
                                {m.scheduled_date || 'Upcoming'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Teams & Score Row */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 text-right font-bold text-sm sm:text-base text-[#0f1712]">
                            {home?.name || m.home_team_id}
                          </div>

                          <div className="shrink-0 px-4 py-1.5 rounded-lg bg-[#f4f2ea] border border-[#e5e3d8] font-editorial-num font-extrabold text-base sm:text-lg text-[#0f1712] min-w-[70px] text-center">
                            {isCompleted || isLive ? (
                              `${m.home_score ?? 0} - ${m.away_score ?? 0}`
                            ) : (
                              m.scheduled_time || 'vs'
                            )}
                          </div>

                          <div className="flex-1 text-left font-bold text-sm sm:text-base text-[#0f1712]">
                            {away?.name || m.away_team_id}
                          </div>
                        </div>

                        {/* Modifier Score Edit Action */}
                        {isModifier && (
                          <div className="mt-3 pt-3 border-t border-[#e5e3d8] flex justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingMatch(m)}
                              className="px-3 py-1 rounded-md bg-[#0f1712] hover:bg-[#1f2e24] text-white text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit Score</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* TAB 3: STANDINGS */}
          {activeTab === 'standings' && (
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#e5e3d8] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e5e3d8]">
                <h2 className="text-base font-bold text-[#0f1712] uppercase tracking-wider">
                  Official League Standings
                </h2>
                <span className="text-xs text-[#57635a]">
                  {standings.length} Teams Competing
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e5e3d8] text-[#57635a] uppercase tracking-wider text-[11px]">
                      <th className="py-3 pr-3 font-semibold">Pos</th>
                      <th className="py-3 px-3 font-semibold">Club</th>
                      <th className="py-3 px-2 text-center font-semibold">P</th>
                      <th className="py-3 px-2 text-center font-semibold">W</th>
                      <th className="py-3 px-2 text-center font-semibold">D</th>
                      <th className="py-3 px-2 text-center font-semibold">L</th>
                      <th className="py-3 px-2 text-center font-semibold">GF</th>
                      <th className="py-3 px-2 text-center font-semibold">GA</th>
                      <th className="py-3 px-2 text-center font-semibold">GD</th>
                      <th className="py-3 pl-4 text-right font-bold text-[#0f1712]">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e3d8]">
                    {standings.map((row, idx) => (
                      <tr key={row.team_id || idx} className="hover:bg-[#faf9f5]">
                        <td className="py-3.5 pr-3 font-mono font-bold text-[#57635a]">
                          {idx < 9 ? `0${idx + 1}` : idx + 1}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-sm text-[#0f1712]">
                          {row.team_name}
                        </td>
                        <td className="py-3.5 px-2 text-center text-[#57635a]">
                          {row.played}
                        </td>
                        <td className="py-3.5 px-2 text-center text-[#57635a]">
                          {row.won}
                        </td>
                        <td className="py-3.5 px-2 text-center text-[#57635a]">
                          {row.drawn}
                        </td>
                        <td className="py-3.5 px-2 text-center text-[#57635a]">
                          {row.lost}
                        </td>
                        <td className="py-3.5 px-2 text-center text-[#57635a]">
                          {row.goals_for}
                        </td>
                        <td className="py-3.5 px-2 text-center text-[#57635a]">
                          {row.goals_against}
                        </td>
                        <td className="py-3.5 px-2 text-center font-semibold text-[#0f1712]">
                          {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                        </td>
                        <td className="py-3.5 pl-4 text-right font-editorial-num font-black text-base text-[#0f1712]">
                          {row.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: TEAMS & SQUADS */}
          {activeTab === 'teams' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Club Selector Column */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#0f1712] uppercase tracking-wider mb-2">
                  Participating Clubs
                </h3>
                {teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTeamId(t.id)}
                    className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      (activeRosterTeam?.id === t.id)
                        ? 'bg-white border-[#0f1712] shadow-xs'
                        : 'bg-white/60 border-[#e5e3d8] hover:border-[#c9c5b6]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <TeamBadge team={t} size="sm" />
                      <div>
                        <div className="font-bold text-xs text-[#0f1712]">{t.name}</div>
                        {t.manager_name && (
                          <div className="text-[11px] text-[#57635a]">Mgr: {t.manager_name}</div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#57635a]" />
                  </button>
                ))}
              </div>

              {/* Roster Column */}
              <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-[#e5e3d8] shadow-xs space-y-4">
                {activeRosterTeam ? (
                  <>
                    <div className="flex items-center gap-3 pb-3 border-b border-[#e5e3d8]">
                      <TeamBadge team={activeRosterTeam} size="md" />
                      <div>
                        <h2 className="text-lg font-bold text-[#0f1712]">{activeRosterTeam.name}</h2>
                        <div className="text-xs text-[#57635a]">
                          {activeRosterPlayers.length} Registered Players • Squad Roster
                        </div>
                      </div>
                    </div>

                    {activeRosterPlayers.length === 0 ? (
                      <p className="text-xs text-[#57635a] py-6 text-center">
                        No players registered in roster yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-[#e5e3d8]">
                        {activeRosterPlayers.map((p) => (
                          <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-[#57635a] w-5">
                                #{p.jersey_number || '-'}
                              </span>
                              <span className="font-bold text-[#0f1712]">
                                {p.name}
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-[#57635a] uppercase">
                              {p.position || 'Player'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-[#57635a] text-center py-6">Select a team to inspect its squad roster.</p>
                )}
              </div>

            </div>
          )}

          {/* TAB 5: STATS & LEADERS */}
          {activeTab === 'stats' && (
            <div className="p-6 rounded-2xl bg-white border border-[#e5e3d8] shadow-xs">
              <StatsAndLeadersView
                teams={teams}
                matches={matches}
                players={players}
                goals={goals}
                motms={motms}
              />
            </div>
          )}

        </PageTransition3D>

      </div>

      {/* MATCH SCORE EDITOR MODAL FOR MODIFIERS */}
      {editingMatch && (
        <MatchScoreEditorModal
          isOpen={Boolean(editingMatch)}
          onClose={() => setEditingMatch(null)}
          match={editingMatch}
          homeTeam={teamsMap.get(editingMatch.home_team_id)}
          awayTeam={teamsMap.get(editingMatch.away_team_id)}
          players={players}
          currentGoals={goals.filter(g => g.match_id === editingMatch.id)}
          currentMotm={motms.find(m => m.match_id === editingMatch.id)}
          onSave={handleSaveScoreFromModifier}
        />
      )}

      {/* SHARE TOURNAMENT MODAL */}
      <ShareTournamentModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        tournament={tournament}
      />

      {/* LEAVE TOURNAMENT CONFIRMATION MODAL */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-white border border-[#e5e3d8] shadow-xl space-y-4">
            <h3 className="text-base font-bold text-[#0f1712]">Leave Tournament?</h3>
            <p className="text-xs text-[#57635a] leading-relaxed">
              This will clear your active tournament device shortcut. You can rejoin anytime by entering the access code or clicking its shared link.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-[#e5e3d8] text-xs font-semibold text-[#57635a] hover:bg-[#f4f2ea]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="px-4 py-1.5 rounded-lg bg-[#0f1712] text-white text-xs font-semibold hover:bg-[#1f2e24]"
              >
                Confirm Leave
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
