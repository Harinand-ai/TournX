import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Calendar, 
  Clock, 
  Shield, 
  Share2, 
  ChevronRight,
  LogOut,
  MapPin,
  Edit,
  ExternalLink,
  Users
} from 'lucide-react';
import { Tournament } from '../types/multiTenant';
import { Team, Match, Player, Goal, ManOfTheMatch } from '../types/tournament';
import { localDataService } from '../services/localDataService';
import { tournamentService } from '../services/tournamentService';
import { TeamBadge } from '../components/TeamBadge';
import { StatsAndLeadersView } from '../components/stats/StatsAndLeadersView';
import { MatchScoreEditorModal } from '../components/match/MatchScoreEditorModal';
import { PageTransition3D } from '../components/PageTransition3D';
import { ShareTournamentModal } from '../components/ShareTournamentModal';
import { GeometricPitchGraphic } from '../components/public/GeometricPitchGraphic';

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
    <div className="w-full min-h-screen bg-[#0C0E14] text-[#E2E8F0] pb-16 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-5">

        {/* NEO-RETRO STATUS & ROLE BANNER */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-2 border-[#262E3E] bg-[#121622] shadow-[2px_2px_0px_#06080D]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 ${isModifier ? 'bg-[#FF3358]' : 'bg-[#38B264]'} shadow-[1px_1px_0px_#000]`} />
            <span className="font-pixel text-[11px] uppercase tracking-wide text-[#E2E8F0]">
              {isOrganizerLoggedIn
                ? '[CONTROL: ORGANIZER]'
                : sessionRole === 'SCORE'
                ? '[CONTROL: SCOREKEEPER]'
                : '[OBSERVER SCOREBOARD • READ-ONLY]'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isOrganizerLoggedIn && onNavigateToWorkspace && (
              <button
                type="button"
                onClick={onNavigateToWorkspace}
                className="px-2.5 py-1 border-2 border-[#333E54] bg-[#181F2E] hover:bg-[#20293D] text-[#38B264] font-pixel text-[10px] tracking-wider transition cursor-pointer flex items-center gap-1 shadow-[2px_2px_0px_#07080D]"
              >
                <span>WORKSPACE</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-2.5 py-1 border-2 border-[#333E54] bg-[#181F2E] hover:bg-[#20293D] text-[#E2E8F0] font-pixel text-[10px] tracking-wider transition cursor-pointer flex items-center gap-1 shadow-[2px_2px_0px_#07080D]"
            >
              <Share2 className="w-3 h-3 text-[#FFC700]" />
              <span>SHARE</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLeaveModal(true)}
              className="px-2.5 py-1 border-2 border-[#333E54] bg-[#181F2E] hover:bg-[#20293D] text-[#94A3B8] hover:text-white font-pixel text-[10px] tracking-wider transition cursor-pointer flex items-center gap-1 shadow-[2px_2px_0px_#07080D]"
            >
              <LogOut className="w-3 h-3 text-[#FF3358]" />
              <span>LEAVE</span>
            </button>
          </div>
        </div>

        {/* MINECRAFT-INSPIRED NEO-RETRO TOURNAMENT HEADER */}
        <header className="p-5 sm:p-7 border-2 border-[#2F384C] bg-[#161B26] shadow-[3px_3px_0px_#06080D] space-y-3 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[10px] sm:text-[11px] text-[#FFC700] uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#FFC700]" />
                  <span>TOURNAMENT HUB</span>
                </span>
                {liveMatches.length > 0 && (
                  <span className="px-2 py-0.5 border border-[#FF3358] bg-[#FF3358]/20 text-[#FF3358] font-pixel text-[10px] font-bold shadow-[1px_1px_0px_#000] animate-pulse">
                    [● {liveMatches.length} LIVE]
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-pixel font-bold text-[#F1F5F9] tracking-wide">
                {tournament.name}
              </h1>
              {tournament.description && (
                <p className="text-xs sm:text-sm text-[#94A3B8] font-sans leading-relaxed pt-0.5">
                  {tournament.description}
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t-2 border-[#222938] flex flex-wrap items-center gap-x-4 gap-y-1.5 font-pixel text-[10px] sm:text-[11px] text-[#94A3B8]">
            <span className="flex items-center gap-1 text-[#38B264]">
              <Shield className="w-3 h-3" />
              <span>[{teams.length} CLUBS]</span>
            </span>
            <span className="flex items-center gap-1 text-[#38B264]">
              <Calendar className="w-3 h-3" />
              <span>[{matches.length} MATCHES]</span>
            </span>
            <span className="flex items-center gap-1 text-[#38B264]">
              <Clock className="w-3 h-3" />
              <span>[{tournament.rules_config?.match_duration_minutes || 50} MINS]</span>
            </span>
            {tournament.season && (
              <span className="text-[#64748B]">
                [SEASON {tournament.season}]
              </span>
            )}
          </div>
        </header>

        {/* NEO-RETRO NAVIGATION TABS */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'OVERVIEW' },
            { id: 'fixtures', label: `FIXTURES (${matches.length})` },
            { id: 'standings', label: 'STANDINGS' },
            { id: 'teams', label: `SQUADS (${teams.length})` },
            { id: 'stats', label: 'STATS' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as PublicTab)}
                className={`px-3.5 py-2 border-2 font-pixel text-[10px] sm:text-[11px] tracking-wider uppercase transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-[#FFC700] bg-[#222A3A] text-[#FFC700] shadow-[2px_2px_0px_#06080D]'
                    : 'border-[#262E3E] bg-[#121622] text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-[#181F2E]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* TAB PANELS WITH 3D TRANSITION */}
        <PageTransition3D transitionKey={activeTab} type="depth">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              
              {/* RETRO BLOCK HERO MATCH */}
              {heroMatch && (
                <div className="border-2 border-[#2F384C] bg-[#161B26] shadow-[3px_3px_0px_#06080D] p-5 sm:p-6 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-[#222938]">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 ${
                        heroMatch.status === 'LIVE' ? 'bg-[#FF3358] animate-ping' : heroMatch.status === 'COMPLETED' ? 'bg-[#64748B]' : 'bg-[#38B264]'
                      } shadow-[1px_1px_0px_#000]`} />
                      <span className="font-pixel text-[11px] sm:text-xs uppercase tracking-wider text-[#E2E8F0]">
                        {heroMatch.status === 'LIVE'
                          ? '[LIVE MATCH IN PROGRESS]'
                          : heroMatch.status === 'COMPLETED'
                          ? '[FINAL MATCH RESULT]'
                          : '[NEXT UPCOMING FIXTURE]'}
                      </span>
                    </div>

                    <span className="font-pixel text-[10px] sm:text-[11px] text-[#FFC700] px-2 py-0.5 border border-[#FFC700]/40 bg-[#FFC700]/10">
                      MATCH #{heroMatch.match_number}
                    </span>
                  </div>

                  {/* TEAMS & BOLD RETRO SCORE CENTERPIECE */}
                  {(() => {
                    const home = teamsMap.get(heroMatch.home_team_id);
                    const away = teamsMap.get(heroMatch.away_team_id);
                    return (
                      <div className="py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-5 text-center sm:text-left">
                          
                          {/* Home Club */}
                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            <TeamBadge team={home} size="lg" />
                            <div>
                              <div className="text-base sm:text-lg font-bold text-[#F1F5F9] font-sans">
                                {home?.name || heroMatch.home_team_id || 'TBD'}
                              </div>
                              <div className="font-pixel text-[9px] text-[#38B264] mt-0.5">[HOME CLUB]</div>
                            </div>
                          </div>

                          {/* Centerpiece: Pixel Score */}
                          <div className="flex flex-col items-center justify-center py-2 sm:py-0">
                            {heroMatch.status === 'COMPLETED' || heroMatch.status === 'LIVE' ? (
                              <div className="font-pixel text-4xl sm:text-5xl font-black tracking-widest text-[#FFC700] drop-shadow-[2px_2px_0px_#000]">
                                {heroMatch.home_score ?? 0} <span className="text-[#64748B]">-</span> {heroMatch.away_score ?? 0}
                              </div>
                            ) : (
                              <div className="space-y-1 text-center">
                                <div className="font-pixel text-xs text-[#38B264] uppercase tracking-widest px-2.5 py-1 border border-[#38B264]/40 bg-[#38B264]/10">
                                  {heroMatch.scheduled_time || 'KICKOFF TBD'}
                                </div>
                                <div className="font-pixel text-[10px] text-[#94A3B8]">
                                  {heroMatch.scheduled_date || 'DATE TBD'}
                                </div>
                              </div>
                            )}

                            {heroMatch.venue && (
                              <div className="flex items-center gap-1 font-pixel text-[9px] sm:text-[10px] text-[#94A3B8] mt-2">
                                <MapPin className="w-3 h-3 text-[#FFC700]" />
                                <span>{heroMatch.venue}</span>
                              </div>
                            )}
                          </div>

                          {/* Away Club */}
                          <div className="flex flex-col sm:flex-row-reverse items-center gap-3 text-center sm:text-right">
                            <TeamBadge team={away} size="lg" />
                            <div>
                              <div className="text-base sm:text-lg font-bold text-[#F1F5F9] font-sans">
                                {away?.name || heroMatch.away_team_id || 'TBD'}
                              </div>
                              <div className="font-pixel text-[9px] text-[#FFC700] mt-0.5">[AWAY CLUB]</div>
                            </div>
                          </div>

                        </div>

                        {/* Modifier Quick Action */}
                        {isModifier && (
                          <div className="mt-5 pt-3 border-t-2 border-[#222938] flex justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingMatch(heroMatch)}
                              className="px-3 py-1.5 border-2 border-[#38B264] bg-[#16291C] hover:bg-[#1E3B27] text-[#38B264] font-pixel text-[10px] tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_#000] cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>UPDATE SCORE</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* GEOMETRIC FOOTBALL PITCH GRAPHIC */}
              <GeometricPitchGraphic
                homeTeamName={teamsMap.get(heroMatch?.home_team_id || '')?.name || 'Home Club'}
                awayTeamName={teamsMap.get(heroMatch?.away_team_id || '')?.name || 'Away Club'}
                format={`${tournament.rules_config?.match_duration_minutes || 50}m Match`}
                venue={heroMatch?.venue || 'Tournament Pitch'}
              />

              {/* UPCOMING MATCHDAY SCHEDULE */}
              <div className="border-2 border-[#2F384C] bg-[#161B26] shadow-[3px_3px_0px_#06080D] p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b-2 border-[#222938]">
                  <h2 className="font-pixel text-xs sm:text-sm text-[#FFC700] uppercase tracking-wide">
                    MATCH SCHEDULE SNAPSHOT
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('fixtures')}
                    className="font-pixel text-[10px] text-[#38B264] hover:text-[#4ADE80] flex items-center gap-1 cursor-pointer"
                  >
                    <span>VIEW ALL FIXTURES</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {upcomingMatches.length === 0 ? (
                  <p className="font-pixel text-[11px] text-[#94A3B8] py-4 text-center">
                    NO UPCOMING FIXTURES PENDING. ALL TOURNAMENT MATCHES CONCLUDED.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcomingMatches.slice(0, 4).map((m) => {
                      const home = teamsMap.get(m.home_team_id);
                      const away = teamsMap.get(m.away_team_id);
                      return (
                        <div key={m.id} className="p-3 border-2 border-[#222938] bg-[#121622] flex items-center justify-between gap-3 shadow-[2px_2px_0px_#07080D]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-pixel text-[10px] text-[#FFC700] w-7 shrink-0">
                              #{m.match_number}
                            </span>
                            <span className="font-sans font-bold text-xs sm:text-sm text-[#F1F5F9] truncate">
                              {home?.name || m.home_team_id}
                            </span>
                            <span className="font-pixel text-[10px] text-[#64748B]">vs</span>
                            <span className="font-sans font-bold text-xs sm:text-sm text-[#F1F5F9] truncate">
                              {away?.name || m.away_team_id}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-pixel text-[10px] text-[#38B264]">
                              {m.scheduled_time || 'TIME TBD'}
                            </div>
                            <div className="font-pixel text-[9px] text-[#64748B]">
                              {m.scheduled_date || 'DATE TBD'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STANDINGS SNAPSHOT */}
              {standings && standings.length > 0 && (
                <div className="border-2 border-[#2F384C] bg-[#161B26] shadow-[3px_3px_0px_#06080D] p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-[#222938]">
                    <h2 className="font-pixel text-xs sm:text-sm text-[#FFC700] uppercase tracking-wide">
                      LEAGUE TABLE SNAPSHOT
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('standings')}
                      className="font-pixel text-[10px] text-[#38B264] hover:text-[#4ADE80] flex items-center gap-1 cursor-pointer"
                    >
                      <span>FULL TABLE</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b-2 border-[#222938] font-pixel text-[10px] text-[#38B264]">
                          <th className="py-2 pr-3">POS</th>
                          <th className="py-2 px-3">CLUB</th>
                          <th className="py-2 px-2 text-center">P</th>
                          <th className="py-2 px-2 text-center">GD</th>
                          <th className="py-2 pl-3 text-right text-[#FFC700]">PTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1D2433]">
                        {standings.slice(0, 5).map((row, idx) => (
                          <tr key={row.team_id || idx} className="hover:bg-[#1B2230]">
                            <td className="py-2.5 pr-3 font-pixel text-[10px] text-[#94A3B8]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold font-sans text-xs sm:text-sm text-[#F1F5F9]">
                              {row.team_name}
                            </td>
                            <td className="py-2.5 px-2 text-center font-pixel text-[10px] text-[#94A3B8]">
                              {row.played}
                            </td>
                            <td className="py-2.5 px-2 text-center font-pixel text-[10px] text-[#94A3B8]">
                              {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                            </td>
                            <td className="py-2.5 pl-3 text-right font-pixel text-xs font-bold text-[#FFC700]">
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
              <div className="p-4 border-2 border-[#2F384C] bg-[#161B26] shadow-[2px_2px_0px_#06080D] flex flex-wrap items-center gap-3 text-xs">
                <div>
                  <label className="font-pixel text-[9px] text-[#94A3B8] block mb-1">ROUND</label>
                  <select
                    value={filterRound}
                    onChange={(e) => setFilterRound(e.target.value)}
                    className="px-3 py-1.5 border-2 border-[#2F384C] bg-[#121622] text-[#F1F5F9] font-pixel text-[10px] focus:outline-none"
                  >
                    <option value="ALL">ALL ROUNDS</option>
                    {availableRounds.map(r => (
                      <option key={r} value={String(r)}>ROUND {r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-pixel text-[9px] text-[#94A3B8] block mb-1">CLUB</label>
                  <select
                    value={filterTeamId}
                    onChange={(e) => setFilterTeamId(e.target.value)}
                    className="px-3 py-1.5 border-2 border-[#2F384C] bg-[#121622] text-[#F1F5F9] font-sans font-bold text-xs focus:outline-none"
                  >
                    <option value="ALL">ALL CLUBS</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-pixel text-[9px] text-[#94A3B8] block mb-1">STATUS</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 border-2 border-[#2F384C] bg-[#121622] text-[#F1F5F9] font-pixel text-[10px] focus:outline-none"
                  >
                    <option value="ALL">ALL STATUSES</option>
                    <option value="LIVE">LIVE</option>
                    <option value="UPCOMING">UPCOMING</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              {/* Fixtures List */}
              <div className="space-y-3">
                {filteredMatches.length === 0 ? (
                  <div className="p-8 text-center font-pixel text-xs text-[#94A3B8] border-2 border-[#2F384C] bg-[#161B26]">
                    NO MATCHES FOUND MATCHING FILTER CRITERIA.
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
                        className={`p-4 sm:p-5 border-2 transition shadow-[3px_3px_0px_#06080D] ${
                          isLive
                            ? 'border-[#FF3358] bg-[#1F141A]'
                            : 'border-[#2F384C] bg-[#161B26]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-[#222938]">
                          <div className="flex items-center gap-2">
                            <span className="font-pixel text-[10px] text-[#FFC700]">
                              MATCH #{m.match_number}
                            </span>
                            {m.round_number && (
                              <span className="font-pixel text-[10px] text-[#64748B]">• ROUND {m.round_number}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {isLive && (
                              <span className="px-2 py-0.5 border border-[#FF3358] bg-[#FF3358]/20 text-[#FF3358] font-pixel text-[9px] uppercase animate-pulse">
                                [● LIVE]
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-2 py-0.5 border border-[#38B264]/40 bg-[#38B264]/10 text-[#38B264] font-pixel text-[9px] uppercase">
                                [FINAL]
                              </span>
                            )}
                            {!isLive && !isCompleted && (
                              <span className="font-pixel text-[9px] text-[#94A3B8]">
                                [{m.scheduled_date || 'UPCOMING'}]
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Teams & Score Row */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 text-right font-sans font-bold text-xs sm:text-base text-[#F1F5F9]">
                            {home?.name || m.home_team_id}
                          </div>

                          <div className="shrink-0 px-4 py-1.5 border-2 border-[#2F384C] bg-[#121622] font-pixel font-black text-lg sm:text-2xl text-[#FFC700] min-w-[80px] text-center shadow-[2px_2px_0px_#000]">
                            {isCompleted || isLive ? (
                              `${m.home_score ?? 0} - ${m.away_score ?? 0}`
                            ) : (
                              m.scheduled_time || 'VS'
                            )}
                          </div>

                          <div className="flex-1 text-left font-sans font-bold text-xs sm:text-base text-[#F1F5F9]">
                            {away?.name || m.away_team_id}
                          </div>
                        </div>

                        {/* Modifier Score Edit Action */}
                        {isModifier && (
                          <div className="mt-3 pt-3 border-t border-[#222938] flex justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingMatch(m)}
                              className="px-3 py-1 border-2 border-[#38B264] bg-[#16291C] hover:bg-[#1E3B27] text-[#38B264] font-pixel text-[10px] tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>EDIT SCORE</span>
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
            <div className="p-5 sm:p-7 border-2 border-[#2F384C] bg-[#161B26] shadow-[3px_3px_0px_#06080D] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#222938]">
                <h2 className="font-pixel text-xs sm:text-sm text-[#FFC700] uppercase tracking-wide">
                  OFFICIAL LEAGUE STANDINGS
                </h2>
                <span className="font-pixel text-[10px] text-[#38B264]">
                  [{standings.length} TEAMS COMPETING]
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-[#222938] font-pixel text-[10px] text-[#38B264] uppercase tracking-wider">
                      <th className="py-2.5 pr-3">POS</th>
                      <th className="py-2.5 px-3">CLUB</th>
                      <th className="py-2.5 px-2 text-center">P</th>
                      <th className="py-2.5 px-2 text-center">W</th>
                      <th className="py-2.5 px-2 text-center">D</th>
                      <th className="py-2.5 px-2 text-center">L</th>
                      <th className="py-2.5 px-2 text-center">GF</th>
                      <th className="py-2.5 px-2 text-center">GA</th>
                      <th className="py-2.5 px-2 text-center">GD</th>
                      <th className="py-2.5 pl-4 text-right text-[#FFC700]">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D2433]">
                    {standings.map((row, idx) => (
                      <tr key={row.team_id || idx} className="hover:bg-[#1B2230]">
                        <td className="py-3 pr-3 font-pixel text-[10px] text-[#94A3B8]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-sans font-bold text-xs sm:text-sm text-[#F1F5F9]">
                          {row.team_name}
                        </td>
                        <td className="py-3 px-2 text-center font-pixel text-[10px] text-[#94A3B8]">
                          {row.played}
                        </td>
                        <td className="py-3 px-2 text-center font-pixel text-[10px] text-[#94A3B8]">
                          {row.won}
                        </td>
                        <td className="py-3 px-2 text-center font-pixel text-[10px] text-[#94A3B8]">
                          {row.drawn}
                        </td>
                        <td className="py-3 px-2 text-center font-pixel text-[10px] text-[#94A3B8]">
                          {row.lost}
                        </td>
                        <td className="py-3 px-2 text-center font-pixel text-[10px] text-[#94A3B8]">
                          {row.goals_for}
                        </td>
                        <td className="py-3 px-2 text-center font-pixel text-[10px] text-[#94A3B8]">
                          {row.goals_against}
                        </td>
                        <td className="py-3 px-2 text-center font-pixel text-[10px] text-[#38B264]">
                          {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                        </td>
                        <td className="py-3 pl-4 text-right font-pixel text-sm font-bold text-[#FFC700]">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Club Selector Column */}
              <div className="space-y-2">
                <h3 className="font-pixel text-[10px] text-[#FFC700] uppercase tracking-wider mb-2">
                  PARTICIPATING CLUBS
                </h3>
                {teams.map((t) => {
                  const isSelected = activeRosterTeam?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTeamId(t.id)}
                      className={`w-full p-3 border-2 text-left transition flex items-center justify-between cursor-pointer shadow-[2px_2px_0px_#06080D] ${
                        isSelected
                          ? 'border-[#FFC700] bg-[#1E2535] text-white'
                          : 'border-[#2F384C] bg-[#161B26] hover:bg-[#1B2230] text-[#94A3B8]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <TeamBadge team={t} size="sm" />
                        <div>
                          <div className="font-sans font-bold text-xs text-[#F1F5F9]">{t.name}</div>
                          {t.manager_name && (
                            <div className="font-pixel text-[9px] text-[#38B264] mt-0.5">MGR: {t.manager_name}</div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                    </button>
                  );
                })}
              </div>

              {/* Roster Column */}
              <div className="md:col-span-2 p-5 sm:p-6 border-2 border-[#2F384C] bg-[#161B26] shadow-[3px_3px_0px_#06080D] space-y-4">
                {activeRosterTeam ? (
                  <>
                    <div className="flex items-center gap-3 pb-3 border-b-2 border-[#222938]">
                      <TeamBadge team={activeRosterTeam} size="md" />
                      <div>
                        <h2 className="font-sans font-bold text-base sm:text-lg text-[#F1F5F9]">{activeRosterTeam.name}</h2>
                        <div className="font-pixel text-[10px] text-[#38B264]">
                          [{activeRosterPlayers.length} REGISTERED PLAYERS • OFFICIAL ROSTER]
                        </div>
                      </div>
                    </div>

                    {activeRosterPlayers.length === 0 ? (
                      <p className="font-pixel text-[10px] text-[#94A3B8] py-6 text-center">
                        NO SQUAD PLAYERS REGISTERED IN ROSTER YET.
                      </p>
                    ) : (
                      <div className="divide-y divide-[#1D2433]">
                        {activeRosterPlayers.map((p) => (
                          <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <span className="font-pixel text-[10px] text-[#FFC700] w-6">
                                #{p.jersey_number || '-'}
                              </span>
                              <span className="font-sans font-bold text-xs sm:text-sm text-[#F1F5F9]">
                                {p.name}
                              </span>
                            </div>
                            <span className="font-pixel text-[9px] px-2 py-0.5 border border-[#38B264]/40 bg-[#38B264]/10 text-[#38B264] uppercase">
                              [{p.position || 'PLAYER'}]
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="font-pixel text-[10px] text-[#94A3B8] text-center py-6">
                    SELECT A TEAM TO INSPECT SQUAD ROSTER.
                  </p>
                )}
              </div>

            </div>
          )}

          {/* TAB 5: STATS & LEADERS */}
          {activeTab === 'stats' && (
            <div className="p-5 sm:p-6 border-2 border-[#2F384C] bg-[#161B26] shadow-[3px_3px_0px_#06080D]">
              <StatsAndLeadersView
                teams={teams}
                matches={matches}
                players={players}
                goals={goals}
                motms={motms}
                theme="minecraft"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm p-6 border-2 border-[#2F384C] bg-[#161B26] shadow-[4px_4px_0px_#000] space-y-4">
            <h3 className="font-pixel text-xs sm:text-sm text-[#FFC700]">LEAVE TOURNAMENT?</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed font-sans">
              This will clear your active tournament device shortcut. You can rejoin anytime by entering the access code or clicking its shared link.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="px-3.5 py-1.5 border-2 border-[#2F384C] bg-[#121622] font-pixel text-[10px] text-[#94A3B8] hover:text-white"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="px-4 py-1.5 border-2 border-[#FF3358] bg-[#FF3358] hover:bg-[#b01e37] text-white font-pixel text-[10px] font-bold shadow-[2px_2px_0px_#000]"
              >
                CONFIRM LEAVE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
