import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Share2, 
  Check, 
  Clock, 
  Shield, 
  Users, 
  UserPlus, 
  AlertTriangle, 
  CheckCircle, 
  Edit, 
  ArrowRight,
  UploadCloud,
  Trash2,
  Key,
  Save,
  Globe,
  Lock,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Tournament } from '../types/multiTenant';
import { Team, Match, Player, Goal, ManOfTheMatch } from '../types/tournament';
import { tournamentService } from '../services/tournamentService';
import { TournamentInvite, localDataService, DEMO_TOURNAMENT_ID } from '../services/localDataService';
import { parseWorkspaceCommand, ProposedWorkspaceAction } from '../utils/promptParsers';
import { BulkMediaUploadModal } from '../components/admin/BulkMediaUploadModal';
import { MatchScoreEditorModal } from '../components/match/MatchScoreEditorModal';
import { StatsAndLeadersView } from '../components/stats/StatsAndLeadersView';

interface OrganizerWorkspacePageProps {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  players: Player[];
  standings: any[];
  onDataChanged: () => void;
  onNavigateHome: () => void;
  onTournamentDeleted?: (nextTournamentId: string) => void;
  onLogout: () => void;
}

type WorkspaceTab = 'overview' | 'matches' | 'standings' | 'teams' | 'stats' | 'collaborators' | 'settings';

export function OrganizerWorkspacePage({
  tournament,
  teams,
  matches,
  players,
  standings,
  onDataChanged,
  onNavigateHome,
  onTournamentDeleted,
  onLogout
}: OrganizerWorkspacePageProps) {
  // Navigation Tabs: Overview, Matches, Teams, Collaborators, Settings
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // Central Operational Prompt Box state
  const [commandPrompt, setCommandPrompt] = useState('');
  const [isAnalyzingCommand, setIsAnalyzingCommand] = useState(false);
  const [commandProposal, setCommandProposal] = useState<ProposedWorkspaceAction | null>(null);
  const [commandSuccessNotice, setCommandSuccessNotice] = useState<string | null>(null);
  const [commandErrorNotice, setCommandErrorNotice] = useState<string | null>(null);

  // Link copy state
  const [copiedLink, setCopiedLink] = useState(false);

  // Score quick editing modal
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Tournament Goals and POTM state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [motms, setMotms] = useState<ManOfTheMatch[]>([]);

  const loadMatchEvents = () => {
    tournamentService.getGoals(tournament.id).then(setGoals);
    tournamentService.getManOfTheMatches(tournament.id).then(setMotms);
  };

  useEffect(() => {
    loadMatchEvents();
  }, [tournament.id]);

  // Collaborators & Invitations state
  const [invites, setInvites] = useState<TournamentInvite[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState<'ORGANIZER' | 'SCORE' | 'VIEW'>('SCORE');
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Load Invites on mount or tournament change
  useEffect(() => {
    tournamentService.getInvites(tournament.id).then(setInvites);
  }, [tournament.id]);

  // Media Modal state
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isDeletingTournament, setIsDeletingTournament] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Editable Settings state
  const [settingsName, setSettingsName] = useState(tournament.name || '');
  const [settingsDescription, setSettingsDescription] = useState(tournament.description || '');
  const [settingsSeason, setSettingsSeason] = useState(tournament.season || '2026');
  const [settingsVisibility, setSettingsVisibility] = useState<'PUBLIC' | 'PRIVATE'>(tournament.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE');
  const [settingsStatus, setSettingsStatus] = useState<Tournament['status']>(tournament.status || 'REGISTRATION');
  const [settingsDuration, setSettingsDuration] = useState<number>(tournament.rules_config?.match_duration_minutes || 50);
  const [settingsWinPts, setSettingsWinPts] = useState<number>(tournament.rules_config?.points_for_win ?? 3);
  const [settingsDrawPts, setSettingsDrawPts] = useState<number>(tournament.rules_config?.points_for_draw ?? 1);
  const [settingsLossPts, setSettingsLossPts] = useState<number>(tournament.rules_config?.points_for_loss ?? 0);
  
  // Feature Toggles
  const [featureFlags, setFeatureFlags] = useState({
    potmVoting: tournament.rules_config?.features?.potmVoting ?? true,
    goalscorersAndEvents: tournament.rules_config?.features?.goalscorersAndEvents ?? true,
    cardsAndSubs: tournament.rules_config?.features?.cardsAndSubs ?? true,
    referees: tournament.rules_config?.features?.referees ?? true,
  });

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync settings when tournament prop changes
  useEffect(() => {
    setSettingsName(tournament.name || '');
    setSettingsDescription(tournament.description || '');
    setSettingsSeason(tournament.season || '2026');
    setSettingsVisibility(tournament.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE');
    setSettingsStatus(tournament.status || 'REGISTRATION');
    setSettingsDuration(tournament.rules_config?.match_duration_minutes || 50);
    setSettingsWinPts(tournament.rules_config?.points_for_win ?? 3);
    setSettingsDrawPts(tournament.rules_config?.points_for_draw ?? 1);
    setSettingsLossPts(tournament.rules_config?.points_for_loss ?? 0);
    setFeatureFlags({
      potmVoting: tournament.rules_config?.features?.potmVoting ?? true,
      goalscorersAndEvents: tournament.rules_config?.features?.goalscorersAndEvents ?? true,
      cardsAndSubs: tournament.rules_config?.features?.cardsAndSubs ?? true,
      referees: tournament.rules_config?.features?.referees ?? true,
    });
  }, [tournament]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsFeedback(null);
    try {
      const updates = {
        name: settingsName.trim(),
        description: settingsDescription.trim(),
        season: settingsSeason.trim(),
        visibility: settingsVisibility,
        status: settingsStatus,
        rules_config: {
          ...(tournament.rules_config || {}),
          points_for_win: Number(settingsWinPts),
          points_for_draw: Number(settingsDrawPts),
          points_for_loss: Number(settingsLossPts),
          match_duration_minutes: Number(settingsDuration),
          features: {
            ...(tournament.rules_config?.features || {}),
            ...featureFlags,
          },
        },
      };
      await tournamentService.updateTournament(tournament.id, updates);
      localDataService.updateTournament(tournament.id, updates);
      setSettingsFeedback({ type: 'success', message: 'Tournament settings and features saved successfully.' });
      onDataChanged();
    } catch (err: any) {
      setSettingsFeedback({ type: 'error', message: err.message || 'Failed to update tournament settings.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeletingTournament(true);
    setDeleteError(null);
    try {
      await tournamentService.deleteTournament(tournament.id);
      const nextActiveId = localDataService.getActiveTournamentId();
      setShowDeleteModal(false);
      if (onTournamentDeleted) {
        onTournamentDeleted(nextActiveId);
      } else {
        onDataChanged();
        onNavigateHome();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete tournament');
      setIsDeletingTournament(false);
    }
  };

  // Public link computation
  const publicUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/t/${tournament.slug}`;
  }, [tournament.slug]);

  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Dynamic Match computation
  const liveMatches = useMemo(() => {
    return matches.filter(m => m.status === 'LIVE');
  }, [matches]);

  const sortedUpcomingMatches = useMemo(() => {
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
        const rA = a.round_number ?? 0;
        const rB = b.round_number ?? 0;
        if (rA !== rB) {
          return rA - rB;
        }
        return a.match_number - b.match_number;
      });
  }, [matches]);

  const nextMatch = useMemo(() => {
    return sortedUpcomingMatches[0] || null;
  }, [sortedUpcomingMatches]);

  const recentResults = useMemo(() => {
    return matches
      .filter(m => m.status === 'COMPLETED')
      .sort((a, b) => {
        if (a.scheduled_date && b.scheduled_date) {
          const dc = b.scheduled_date.localeCompare(a.scheduled_date);
          if (dc !== 0) return dc;
          if (a.scheduled_time && b.scheduled_time) {
            return b.scheduled_time.localeCompare(a.scheduled_time);
          }
        }
        return b.match_number - a.match_number;
      })
      .slice(0, 4);
  }, [matches]);

  // Handle Command Analysis
  const handleAnalyzeCommand = () => {
    if (!commandPrompt.trim()) return;
    setIsAnalyzingCommand(true);
    setCommandErrorNotice(null);
    setCommandSuccessNotice(null);

    try {
      const proposal = parseWorkspaceCommand(commandPrompt, {
        teams,
        matches,
        matchDuration: tournament.rules_config?.match_duration_minutes,
        venue: matches.find(m => m.venue)?.venue || undefined,
      });

      if (proposal.actionType === 'UNKNOWN') {
        setCommandErrorNotice(proposal.description);
        setIsAnalyzingCommand(false);
        return;
      }

      setCommandProposal(proposal);
    } catch (err: any) {
      setCommandErrorNotice(err.message || 'Failed to interpret command.');
    } finally {
      setIsAnalyzingCommand(false);
    }
  };

  // Execute Confirmed Command Action
  const handleApplyCommand = async () => {
    if (!commandProposal) return;
    setIsAnalyzingCommand(true);

    try {
      if (commandProposal.actionType === 'RECORD_SCORE') {
        const { matchId, homeScore, awayScore, status } = commandProposal.payload;
        const target = matches.find(m => m.id === matchId);
        if (target) {
          await tournamentService.updateMatch(
            {
              ...target,
              home_score: homeScore,
              away_score: awayScore,
              status: status || 'COMPLETED',
            },
            tournament.id
          );
        }
      } else if (commandProposal.actionType === 'RESCHEDULE_MATCH') {
        const { matchId, date, time } = commandProposal.payload;
        const target = matches.find(m => m.id === matchId);
        if (target) {
          await tournamentService.updateMatch(
            {
              ...target,
              scheduled_date: date,
              scheduled_time: time,
            },
            tournament.id
          );
        }
      } else if (commandProposal.actionType === 'ADD_TEAM') {
        const { teamName } = commandProposal.payload;
        await tournamentService.addTeam(
          {
            name: teamName,
            short_name: teamName.substring(0, 3).toUpperCase(),
            manager_name: '',
            primary_color: '#059669',
            secondary_color: '#0f172a',
          },
          tournament.id
        );
      } else if (commandProposal.actionType === 'UPDATE_DURATION') {
        const { durationMinutes } = commandProposal.payload;
        await tournamentService.updateTournament(tournament.id, {
          rules_config: {
            ...tournament.rules_config,
            match_duration_minutes: durationMinutes,
          },
        });
      }

      setCommandSuccessNotice(`Successfully applied: ${commandProposal.title}`);
      setCommandProposal(null);
      setCommandPrompt('');
      onDataChanged();
    } catch (err: any) {
      setCommandErrorNotice(err.message || 'Failed to apply requested change.');
    } finally {
      setIsAnalyzingCommand(false);
    }
  };

  // Open Match Score & Event Editor Modal
  const handleOpenScoreModal = (match: Match) => {
    setEditingMatch(match);
  };

  const handleSaveScore = async (params: {
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
    loadMatchEvents();
    onDataChanged();
  };

  // Handle Collaborator Invite creation
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInviteEmail.trim()) return;

    try {
      const inv = await tournamentService.createInvite(tournament.id, newInviteEmail.trim(), newInviteRole);
      setInvites(prev => [inv, ...prev.filter(i => i.id !== inv.id)]);
      setInviteFeedback(`Created invitation for ${newInviteEmail}. Copy the redemption code below.`);
      setNewInviteEmail('');
      setTimeout(() => setInviteFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to create invite.');
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await tournamentService.revokeInvite(tournament.id, inviteId);
      setInvites(prev => prev.map(i => (i.id === inviteId ? { ...i, status: 'REVOKED' } : i)));
    } catch (err: any) {
      alert(err.message || 'Failed to revoke invite.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 px-3 sm:px-6 space-y-6 text-slate-900">
      
      {/* Top Banner: Tournament Name & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 truncate">
              {tournament.name}
            </h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
              tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}>
              {tournament.status}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 font-medium">
            <span>{tournament.visibility === 'PUBLIC' ? 'Public Tournament' : 'Private Tournament'}</span>
            <span>•</span>
            <span>{teams.length} Teams</span>
            <span>•</span>
            <span>{matches.length} Matches</span>
          </p>
        </div>

        {/* Share Link Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyPublicLink}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-300 shadow-2xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share Tournament'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Operational Prompt Box */}
      <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <span>Make Changes Using Natural Language</span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            try: "Record score as 2-1" or "Change venue to Kannur Pitch 2"
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            type="text"
            value={commandPrompt}
            onChange={(e) => setCommandPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeCommand()}
            placeholder="e.g. Move Match 1 to Saturday at 4 PM, or Set score 2-1 for Kerala Blasters vs Bengaluru FC"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder-slate-400 transition"
          />

          <button
            type="button"
            disabled={!commandPrompt.trim() || isAnalyzingCommand}
            onClick={handleAnalyzeCommand}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isAnalyzingCommand ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span>Apply Prompt</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Notices */}
        {commandSuccessNotice && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{commandSuccessNotice}</span>
          </div>
        )}

        {commandErrorNotice && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{commandErrorNotice}</span>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Operational Changes */}
      <AnimatePresence>
        {commandProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
                <Sparkles className="w-5 h-5 text-emerald-700" />
                <span>Confirm Proposed Action</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm space-y-2">
                <div className="text-slate-900 font-semibold">{commandProposal.description}</div>
                <div className="text-xs text-slate-500 font-mono">
                  Action: {commandProposal.actionType}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCommandProposal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleApplyCommand}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Confirm & Apply Change
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Consolidated Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1 text-sm font-semibold">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'matches', label: `Fixtures & Results (${matches.length})` },
          { id: 'standings', label: 'Standings' },
          { id: 'teams', label: `Clubs & Squads (${teams.length})` },
          { id: 'stats', label: 'Stats & Leaders' },
          { id: 'collaborators', label: `Collaborators (${invites.length})` },
          { id: 'settings', label: 'Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as WorkspaceTab)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Match Highlights */}
          <div className="md:col-span-2 space-y-4">
            
            {/* Live Matches Card (if any) */}
            {liveMatches.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  <span>Live Now ({liveMatches.length})</span>
                </div>
                {liveMatches.map((m) => {
                  const home = teams.find(t => t.id === m.home_team_id)?.name || m.home_team_id;
                  const away = teams.find(t => t.id === m.away_team_id)?.name || m.away_team_id;
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <span className="font-bold text-slate-900 text-sm">{home}</span>
                      <span className="font-mono text-base font-black text-rose-600 px-3 py-1 bg-rose-100 rounded">
                        {m.home_score ?? 0} - {m.away_score ?? 0}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{away}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenScoreModal(m)}
                        className="ml-3 px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white text-xs font-semibold text-slate-800 transition cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Next Match Card */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-700" /> Next Upcoming Match
                </span>
                {nextMatch && (
                  <span className="text-[11px] font-mono text-slate-500">
                    Match #{nextMatch.match_number} • Round {nextMatch.round_number}
                  </span>
                )}
              </div>

              {nextMatch ? (
                (() => {
                  const home = teams.find(t => t.id === nextMatch.home_team_id)?.name || nextMatch.home_team_id;
                  const away = teams.find(t => t.id === nextMatch.away_team_id)?.name || nextMatch.away_team_id;
                  return (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-base truncate">{home}</div>
                      <div className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 font-mono font-bold shadow-2xs">
                        VS
                      </div>
                      <div className="font-bold text-slate-900 text-base truncate">{away}</div>
                      <button
                        type="button"
                        onClick={() => handleOpenScoreModal(nextMatch)}
                        className="ml-4 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs"
                      >
                        Enter Score
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="text-xs text-slate-500 py-3 text-center">
                  All matches completed or no matches scheduled.
                </div>
              )}
            </div>

            {/* Recent Results */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Recent Results
              </span>

              {recentResults.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center">
                  No completed matches yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentResults.map((m) => {
                    const home = teams.find(t => t.id === m.home_team_id)?.name || m.home_team_id;
                    const away = teams.find(t => t.id === m.away_team_id)?.name || m.away_team_id;
                    return (
                      <div key={m.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900 truncate max-w-[120px]">{home}</span>
                        <span className="font-mono font-bold text-emerald-800 px-2 py-0.5 bg-emerald-100 rounded">
                          {m.home_score} - {m.away_score}
                        </span>
                        <span className="font-semibold text-slate-900 truncate max-w-[120px]">{away}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Column 3: Standings Quick Look */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Standings Preview
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase">
                    <th className="pb-1.5 font-semibold">Pos</th>
                    <th className="pb-1.5 font-semibold">Club</th>
                    <th className="pb-1.5 font-semibold text-center">P</th>
                    <th className="pb-1.5 font-semibold text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {standings.slice(0, 6).map((st, idx) => (
                    <tr key={st.team.id} className="hover:bg-slate-50">
                      <td className="py-2 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2 font-semibold text-slate-900 truncate max-w-[100px]">{st.team.name}</td>
                      <td className="py-2 text-center text-slate-600">{st.played}</td>
                      <td className="py-2 text-center font-bold text-emerald-700">{st.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: MATCHES & SCORES */}
      {activeTab === 'matches' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Fixtures & Match Schedules</h2>
            <span className="text-xs text-slate-500">Click any match to record or edit score</span>
          </div>

          <div className="space-y-2">
            {matches.map((m) => {
              const home = teams.find(t => t.id === m.home_team_id)?.name || m.home_team_id;
              const away = teams.find(t => t.id === m.away_team_id)?.name || m.away_team_id;

              return (
                <div
                  key={m.id}
                  onClick={() => handleOpenScoreModal(m)}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 transition flex items-center justify-between cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      R{m.round_number} M{m.match_number}
                    </span>
                    <span className="font-bold text-slate-900 text-sm truncate max-w-[140px] sm:max-w-[180px]">{home}</span>
                    <span className="text-xs text-slate-400 font-mono">vs</span>
                    <span className="font-bold text-slate-900 text-sm truncate max-w-[140px] sm:max-w-[180px]">{away}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {m.status === 'COMPLETED' ? (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const mMotm = motms.find(motm => motm.match_id === m.id);
                          const p = mMotm ? players.find(pl => pl.id === mMotm.player_id) : null;
                          if (!p) return null;
                          return (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                              ⭐ {p.name}
                            </span>
                          );
                        })()}
                        <span className="font-mono font-bold text-sm text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-200">
                          {m.home_score} - {m.away_score}
                        </span>
                      </div>
                    ) : m.status === 'LIVE' ? (
                      <span className="font-mono font-bold text-sm text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded border border-rose-300 animate-pulse">
                        {m.home_score ?? 0} - {m.away_score ?? 0} (LIVE)
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 group-hover:text-emerald-700 flex items-center gap-1 font-semibold">
                        <Edit className="w-3.5 h-3.5" />
                        <span>Enter Score</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: STANDINGS */}
      {activeTab === 'standings' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tournament Standings</h2>
              <span className="text-xs text-slate-500">Official ranking computed from completed match results</span>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">
              Win = 3 • Draw = 1 • Loss = 0
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 border-b border-slate-100">
                  <th className="py-2.5 w-8">#</th>
                  <th className="py-2.5">Club</th>
                  <th className="py-2.5 text-center w-8">P</th>
                  <th className="py-2.5 text-center w-8">W</th>
                  <th className="py-2.5 text-center w-8">D</th>
                  <th className="py-2.5 text-center w-8">L</th>
                  <th className="py-2.5 text-center w-8">GF</th>
                  <th className="py-2.5 text-center w-8">GA</th>
                  <th className="py-2.5 text-center w-9">GD</th>
                  <th className="py-2.5 text-center w-10 font-black text-slate-900">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {standings.map((s, idx) => (
                  <tr key={s.team.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {s.team.logo_url ? (
                          <img src={s.team.logo_url} alt={s.team.name} className="w-5 h-5 rounded-full object-contain" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                            {s.team.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-slate-900 truncate">{s.team.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center text-slate-600">{s.played}</td>
                    <td className="py-3 text-center text-slate-600">{s.won}</td>
                    <td className="py-3 text-center text-slate-600">{s.drawn}</td>
                    <td className="py-3 text-center text-slate-600">{s.lost}</td>
                    <td className="py-3 text-center text-slate-600">{s.goals_for}</td>
                    <td className="py-3 text-center text-slate-600">{s.goals_against}</td>
                    <td className="py-3 text-center text-slate-600">
                      {s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}
                    </td>
                    <td className="py-3 text-center font-black text-slate-900 text-sm">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TEAMS & SQUADS */}
      {activeTab === 'teams' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Teams & Squad Rosters</h2>
              <span className="text-xs text-slate-500">{teams.length} Teams registered</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMediaModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Bulk Upload Logos & Photos</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((t) => {
              const teamPlayers = players.filter(p => p.team_id === t.id);

              return (
                <div key={t.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2.5">
                      {t.logo_url ? (
                        <img
                          src={t.logo_url}
                          alt={t.name}
                          className="w-7 h-7 rounded-full object-contain border border-slate-200 bg-white p-0.5"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-emerald-700" />
                        </div>
                      )}
                      <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                    </div>
                    <span className="text-xs text-slate-500">{teamPlayers.length} Players</span>
                  </div>

                  <div className="text-xs text-slate-600">
                    Manager: <span className="text-slate-900 font-semibold">{t.manager_name || 'None assigned'}</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    {teamPlayers.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">No players added to squad yet.</div>
                    ) : (
                      teamPlayers.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            {p.photo_url ? (
                              <img
                                src={p.photo_url}
                                alt={p.name}
                                className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-[9px] font-bold text-slate-600">
                                {p.name.charAt(0)}
                              </div>
                            )}
                            <span className="font-medium text-slate-800">{p.name} {p.is_captain && '★'}</span>
                          </div>
                          <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                            {p.position}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: STATS & LEADERS */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tournament Statistics & Leaders</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Top goalscorers (Golden Boot) and Player of the Match awards calculated dynamically from match results.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span>{goals.length} Goals Recorded</span>
              <span>•</span>
              <span>{motms.length} POTMs Awarded</span>
            </div>
          </div>

          <StatsAndLeadersView
            goals={goals}
            motms={motms}
            players={players}
            teams={teams}
            matches={matches}
            theme="editorial"
          />
        </div>
      )}

      {/* TAB 4: COLLABORATORS & INVITATIONS */}
      {activeTab === 'collaborators' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              <span>Share & Invite Collaborators</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Invite co-organizers, match scorers, or team managers by email.
            </p>
          </div>

          {inviteFeedback && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{inviteFeedback}</span>
            </div>
          )}

          {/* Invitation Input Form */}
          <form onSubmit={handleCreateInvite} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Pre-Authorize an Email Address
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <input
                  type="email"
                  required
                  value={newInviteEmail}
                  onChange={(e) => setNewInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 placeholder-slate-400"
                />
              </div>

              <div>
                <select
                  value={newInviteRole}
                  onChange={(e) => setNewInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-emerald-600"
                >
                  <option value="SCORE">Scorer (Can update scores)</option>
                  <option value="ORGANIZER">Organizer (Full permissions)</option>
                  <option value="VIEW">Viewer (Authorized view)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Invitation</span>
              </button>
            </div>
          </form>

          {/* Pending Invitations Table */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Invitations & Roles ({invites.length})
            </span>

            {invites.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-4 text-center">
                No collaborators invited yet. Enter an email address above to grant access.
              </div>
            ) : (
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{inv.email}</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-emerald-800 font-mono text-[10px]">
                          {inv.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Code: {inv.code}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(inv.code);
                          setCopiedInviteId(inv.id);
                          setTimeout(() => setCopiedInviteId(null), 2000);
                        }}
                        className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-2xs"
                      >
                        {copiedInviteId === inv.id ? 'Copied' : 'Copy Code'}
                      </button>

                      {inv.status !== 'REVOKED' && (
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="px-2 py-1 text-slate-400 hover:text-rose-600 transition cursor-pointer text-xs"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            
            {/* Settings Header with Save button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-600" />
                  <span>Tournament Settings & Configuration</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage visibility, scoring rules, feature switches, and credentials for <span className="font-semibold text-slate-800">{tournament.name}</span>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
              >
                {isSavingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>

            {/* Save Feedback Notice */}
            {settingsFeedback && (
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
                  settingsFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {settingsFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{settingsFeedback.message}</span>
              </div>
            )}

            {/* Settings Form Grid */}
            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* Left Column: Core Identity & Visibility */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Tournament Name
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsName}
                    onChange={e => setSettingsName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Season / Year
                    </label>
                    <input
                      type="text"
                      value={settingsSeason}
                      onChange={e => setSettingsSeason(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={settingsStatus}
                      onChange={e => setSettingsStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-600 cursor-pointer"
                    >
                      <option value="REGISTRATION">Registration</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Visibility Switch */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Visibility Toggle
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSettingsVisibility('PUBLIC')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                        settingsVisibility === 'PUBLIC'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold">Public</div>
                        <div className="text-[10px] text-slate-500">Accessible to all visitors</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettingsVisibility('PRIVATE')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                        settingsVisibility === 'PRIVATE'
                          ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold ring-1 ring-amber-500'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold">Private</div>
                        <div className="text-[10px] text-slate-500">Requires VIEW access code</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={settingsDescription}
                    onChange={e => setSettingsDescription(e.target.value)}
                    placeholder="Tournament overview, rules, and notes"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-600 resize-none"
                  />
                </div>
              </div>

              {/* Right Column: Rules & Optional Feature Switches */}
              <div className="space-y-4">
                
                {/* Scoring Rules & Duration */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                    Points & Duration
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Win Pts</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={settingsWinPts}
                        onChange={e => setSettingsWinPts(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 text-slate-900 text-xs font-bold text-center rounded-lg focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Draw Pts</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={settingsDrawPts}
                        onChange={e => setSettingsDrawPts(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 text-slate-900 text-xs font-bold text-center rounded-lg focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Loss Pts</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={settingsLossPts}
                        onChange={e => setSettingsLossPts(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 text-slate-900 text-xs font-bold text-center rounded-lg focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                      Match Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={settingsDuration}
                      onChange={e => setSettingsDuration(parseInt(e.target.value, 10) || 50)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Optional Feature Toggles */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                    Optional Feature Toggles
                  </span>

                  {[
                    { key: 'potmVoting', label: 'Player of the Match (POTM)', desc: 'Track MOTM honours per match' },
                    { key: 'goalscorersAndEvents', label: 'Goalscorer Tracking', desc: 'Log individual scorers and golden boot stats' },
                    { key: 'cardsAndSubs', label: 'Cards & Disciplinary', desc: 'Track yellow/red cards & suspensions' },
                    { key: 'referees', label: 'Match Officials', desc: 'Assign center referees & linesmen' },
                  ].map(feat => {
                    const active = (featureFlags as any)[feat.key];
                    return (
                      <div
                        key={feat.key}
                        onClick={() => {
                          setFeatureFlags(prev => ({
                            ...prev,
                            [feat.key]: !active,
                          }));
                        }}
                        className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between select-none ${
                          active
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold">{feat.label}</div>
                          <div className="text-[10px] text-slate-500">{feat.desc}</div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition ${
                            active ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {active && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </form>

            {/* Access Codes & Sharing */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <Key className="w-4 h-4 text-emerald-700" />
                <span>Tournament Access Credentials</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Share these codes with spectators or staff. No account creation is required for participants to view.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Public Viewer Code</div>
                  <div className="font-mono text-sm font-black text-slate-900 mt-0.5">
                    {tournament.rules_config?.viewer_access_code || tournament.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Read-only live scores and standings</div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-amber-700">Staff Modifier Code</div>
                  <div className="font-mono text-sm font-black text-amber-900 mt-0.5">
                    {tournament.rules_config?.modifier_access_code || 'MOD-' + tournament.id.slice(0, 6).toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Update scores without full admin rights</div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-rose-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Organizer Management & Tournament Deletion</span>
              </div>
              <p className="text-rose-700 text-[11px]">
                Each organizer account may own one active tournament at a time. Deleting this tournament frees your account to create a new one. Your user account remains intact.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition cursor-pointer"
                >
                  Sign Out
                </button>

                <button
                  type="button"
                  disabled={isDeletingTournament}
                  onClick={() => {
                    setShowDeleteModal(true);
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Tournament</span>
                </button>
              </div>
            </div>

          </div>

          {/* IN-APP TOURNAMENT DELETION CONFIRMATION MODAL */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Delete Tournament?</h3>
                    <p className="text-xs text-slate-500">Permanent and irreversible action</p>
                  </div>
                </div>

                {deleteError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    Are you sure you want to delete <span className="font-bold text-slate-900">"{tournament.name}"</span>?
                  </p>
                  <p>
                    This will permanently purge all fixtures, squads, results, and access codes. Your organizer account slot will be released so you can create a new tournament.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isDeletingTournament}
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteError(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isDeletingTournament}
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {isDeletingTournament ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting Tournament...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Permanently</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MATCH SCORE & EVENTS EDITOR MODAL */}
      <MatchScoreEditorModal
        isOpen={Boolean(editingMatch)}
        onClose={() => setEditingMatch(null)}
        match={editingMatch}
        homeTeam={teams.find(t => t.id === editingMatch?.home_team_id)}
        awayTeam={teams.find(t => t.id === editingMatch?.away_team_id)}
        players={players}
        currentGoals={goals}
        currentMotm={motms.find(m => m.match_id === editingMatch?.id)}
        onSave={handleSaveScore}
      />

      {/* BULK MEDIA UPLOAD MODAL */}
      <BulkMediaUploadModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        teams={teams}
        players={players}
        tournamentId={tournament.id}
        onUploadSuccess={() => {
          setIsMediaModalOpen(false);
          onDataChanged();
        }}
      />

    </div>
  );
}
