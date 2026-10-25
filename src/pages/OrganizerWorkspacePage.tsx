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
  Loader2,
  FileText,
  Calendar,
  ChevronDown,
  Trophy
} from 'lucide-react';
import { Tournament } from '../types/multiTenant';
import { DEFAULT_RULES_CONFIG } from '../engine/tournamentEngine';
import { Team, Match, Player, Goal, ManOfTheMatch } from '../types/tournament';
import { tournamentService } from '../services/tournamentService';
import { TournamentInvite, localDataService, FTM_STORAGE_KEYS } from '../services/localDataService';
import { parseWorkspaceCommand, ProposedWorkspaceAction } from '../utils/promptParsers';
import { BulkMediaUploadModal } from '../components/admin/BulkMediaUploadModal';
import { MatchScoreEditorModal } from '../components/match/MatchScoreEditorModal';
import { StatsAndLeadersView } from '../components/stats/StatsAndLeadersView';
import { DraftsModal } from '../components/admin/DraftsModal';
import { FootballGroundOverview, FootballGroundFormat } from '../components/pitch/FootballGroundOverview';
import { ShareTournamentModal } from '../components/ShareTournamentModal';
import { PageTransition3D } from '../components/PageTransition3D';

interface OrganizerWorkspacePageProps {
  tournament: Tournament | null;
  teams: Team[];
  matches: Match[];
  players: Player[];
  standings: any[];
  currentUserId?: string | null;
  onDataChanged: () => void;
  onNavigateHome: () => void;
  onNavigateToCreate?: (prompt?: string) => void;
  onTournamentDeleted?: (nextTournamentId: string) => void;
  onLogout: () => void;
  onOpenTournamentSwitcher?: () => void;
}

type WorkspaceTab = 'overview' | 'matches' | 'standings' | 'teams' | 'stats' | 'collaborators' | 'settings';

export function OrganizerWorkspacePage({
  tournament: propTournament,
  teams,
  matches,
  players,
  standings,
  currentUserId,
  onDataChanged,
  onNavigateHome,
  onNavigateToCreate,
  onTournamentDeleted,
  onLogout,
  onOpenTournamentSwitcher
}: OrganizerWorkspacePageProps) {
  const tournament: Tournament = propTournament || {
    id: '',
    name: 'No Tournament Selected',
    slug: '',
    description: '',
    season: '2026',
    logo_url: null,
    status: 'DRAFT',
    visibility: 'PRIVATE',
    rules_config: { ...DEFAULT_RULES_CONFIG },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Navigation Tabs: Overview, Matches, Standings, Teams, Stats, Collaborators, Settings
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // Central Operational Prompt Box state
  const [commandPrompt, setCommandPrompt] = useState('');
  const [isAnalyzingCommand, setIsAnalyzingCommand] = useState(false);
  const [commandProposal, setCommandProposal] = useState<ProposedWorkspaceAction | null>(null);
  const [commandSuccessNotice, setCommandSuccessNotice] = useState<string | null>(null);
  const [commandErrorNotice, setCommandErrorNotice] = useState<string | null>(null);

  // Share Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Score quick editing modal
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Tournament Goals and POTM state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [motms, setMotms] = useState<ManOfTheMatch[]>([]);

  const [isTutorialDropdownOpen, setIsTutorialDropdownOpen] = useState(false);
  const [organizerTournaments, setOrganizerTournaments] = useState<Tournament[]>([]);
  const [isLoadingOrganizerTournaments, setIsLoadingOrganizerTournaments] = useState(true);

  const loadMatchEvents = () => {
    if (tournament?.id) {
      tournamentService.getGoals(tournament.id).then(setGoals);
      tournamentService.getManOfTheMatches(tournament.id).then(setMotms);
    }
  };

  useEffect(() => {
    loadMatchEvents();
  }, [tournament?.id]);

  // Collaborators & Invitations state
  const [invites, setInvites] = useState<TournamentInvite[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState<'ORGANIZER' | 'SCORE' | 'VIEW'>('SCORE');
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  // Load Invites on mount or tournament change
  useEffect(() => {
    if (tournament?.id) {
      tournamentService.getInvites(tournament.id).then(setInvites);
    } else {
      setInvites([]);
    }
  }, [tournament?.id]);

  // Media Modal state
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isDeletingTournament, setIsDeletingTournament] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Bulk Deletion state
  const [isDeletingAllTournaments, setIsDeletingAllTournaments] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
  const [userTournamentsCount, setUserTournamentsCount] = useState<number>(1);

  useEffect(() => {
    setIsLoadingOrganizerTournaments(true);
    tournamentService.getOrganizerTournaments(currentUserId || undefined).then(list => {
      setOrganizerTournaments(list);
      setUserTournamentsCount(list.length);
      setIsLoadingOrganizerTournaments(false);
    }).catch(() => {
      setIsLoadingOrganizerTournaments(false);
    });
  }, [currentUserId, tournament?.id]);

  // Master Prompt Tournament Creator (Central Visual Centerpiece)
  const [masterPromptText, setMasterPromptText] = useState('');
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [draftsCount, setDraftsCount] = useState<number>(() => {
    try {
      return tournamentService.getDrafts().length;
    } catch {
      return 0;
    }
  });
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  const refreshDraftsCount = () => {
    try {
      setDraftsCount(tournamentService.getDrafts().length);
    } catch {}
  };

  const handleLaunchMasterPrompt = () => {
    if (!masterPromptText.trim()) return;
    try {
      localStorage.setItem(FTM_STORAGE_KEYS.PROMPT_DRAFT, masterPromptText.trim());
    } catch {}
    if (onNavigateToCreate) {
      onNavigateToCreate(masterPromptText.trim());
    }
  };

  const handleSavePromptDraft = () => {
    if (!masterPromptText.trim()) return;
    try {
      const now = new Date().toISOString();
      tournamentService.saveDraft({
        id: `draft-${Date.now()}`,
        name: masterPromptText.slice(0, 32).trim() + (masterPromptText.length > 32 ? '...' : ''),
        prompt: masterPromptText.trim(),
        teamsCount: 0,
        format: 'Single Round-Robin',
        status: 'DRAFT',
        updated_at: now,
      });
      refreshDraftsCount();
      setDraftNotice('Draft saved to vault.');
      setTimeout(() => setDraftNotice(null), 3000);
    } catch {
      setDraftNotice('Failed to save draft.');
    }
  };

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

  const handleConfirmDeleteAllTournaments = async () => {
    setIsDeletingAllTournaments(true);
    setDeleteAllError(null);
    try {
      const res = await tournamentService.deleteAllUserTournaments();
      localDataService.clearActiveTournament();
      setShowDeleteAllModal(false);
      if (res.errors && res.errors.length > 0) {
        console.warn('[TournX] Some tournaments had deletion notices:', res.errors);
      }
      onDataChanged();
      onNavigateHome();
    } catch (err: any) {
      setDeleteAllError(err.message || 'Failed to delete all tournaments');
      setIsDeletingAllTournaments(false);
    }
  };

  const detectedPitchFormat = useMemo<FootballGroundFormat>(() => {
    if (!tournament) return '11-a-side';
    const pCount = tournament.rules_config?.starting_players_per_team;
    if (pCount === 5) return '5-a-side';
    if (pCount === 6) return '6-a-side';
    if (pCount === 7) return '7-a-side';
    if (pCount === 8) return '8-a-side';
    if (pCount === 9) return '9-a-side';
    if (pCount === 11) return '11-a-side';
    const text = (tournament.name + ' ' + (tournament.description || '')).toLowerCase();
    if (text.includes('5-a-side') || text.includes('5v5') || text.includes('futsal')) return '5-a-side';
    if (text.includes('6-a-side') || text.includes('6v6')) return '6-a-side';
    if (text.includes('7-a-side') || text.includes('7v7')) return '7-a-side';
    if (text.includes('8-a-side') || text.includes('8v8')) return '8-a-side';
    if (text.includes('9-a-side') || text.includes('9v9')) return '9-a-side';
    return '11-a-side';
  }, [tournament]);

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
            primary_color: '#D72645',
            secondary_color: '#101013',
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
    <div className="w-full max-w-6xl mx-auto py-5 px-3 sm:px-6 space-y-6 text-[#F0E9E7]">
      
      {/* Optional Compact Tutorial Dropdown (Closed by default) */}
      <div className="rounded-2xl bg-[#19191F] border border-white/10 overflow-hidden shadow-lg transition">
        <button
          type="button"
          onClick={() => setIsTutorialDropdownOpen(prev => !prev)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#21191D] border border-[#D72645]/40 flex items-center justify-center text-[#D72645]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#F0E9E7] uppercase tracking-wider font-mono">
                TournX Quick Guide (6 Steps)
              </h3>
              <p className="text-[11px] text-[#A5A1A4]">
                How to create and run professional football tournaments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-[#D72645] bg-[#21191D] px-2 py-0.5 rounded border border-[#D72645]/30">
              {isTutorialDropdownOpen ? 'Collapse' : 'Expand Guide'}
            </span>
            <ChevronDown className={`w-4 h-4 text-[#A5A1A4] transition-transform duration-200 ${isTutorialDropdownOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        <AnimatePresence>
          {isTutorialDropdownOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-5 pb-5 pt-1 border-t border-white/5 bg-[#141418]"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
                {[
                  { step: '1', title: 'Enter Prompt Details', desc: 'Type natural language prompt with team names, dates, venue, and format.' },
                  { step: '2', title: 'Review Preview', desc: 'Inspect the extracted tournament rules, teams, and tournament structure.' },
                  { step: '3', title: 'Refine Squads & Times', desc: 'Edit squads, players, captains, schedule dates, and kick-off times.' },
                  { step: '4', title: 'Confirm & Create', desc: 'Confirm creation to save tournament to your organizer dashboard.' },
                  { step: '5', title: 'Manage Matches & Standings', desc: 'Record live match scores, goalscorers, cards, and update standings.' },
                  { step: '6', title: 'Share Real-Time Access', desc: 'Share read-only participant codes or invite collaborators to update scores.' }
                ].map((item) => (
                  <div key={item.step} className="p-3.5 rounded-xl bg-[#19191F] border border-white/5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#D72645]/20 text-[#D72645] text-[10px] font-mono font-bold flex items-center justify-center">
                        {item.step}
                      </span>
                      <h4 className="text-xs font-semibold text-[#F0E9E7]">{item.title}</h4>
                    </div>
                    <p className="text-[11px] text-[#A5A1A4] leading-relaxed pl-7">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fresh Organizer Empty State (When no tournaments exist for current organizer) */}
      {(!propTournament || (currentUserId && userTournamentsCount === 0)) ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-[#19191F] border border-white/10 shadow-2xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#D72645]/50 to-transparent" />
          
          <div className="w-16 h-16 rounded-2xl bg-[#21191D] border border-[#D72645]/40 text-[#D72645] flex items-center justify-center mx-auto shadow-lg shadow-[#D72645]/10">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold font-display text-[#F0E9E7] tracking-tight">
              No tournaments yet. Create your first tournament to get started.
            </h2>
            <p className="text-xs text-[#A5A1A4] leading-relaxed">
              TournX is a modern tournament management engine powered by natural language. Type a prompt describing your teams, schedule, and rules to generate an entire competition with fixtures, squads, and live standings in seconds.
            </p>
          </div>

          <div className="max-w-xl mx-auto space-y-4 pt-2">
            <textarea
              value={masterPromptText}
              onChange={(e) => setMasterPromptText(e.target.value)}
              placeholder="e.g. Create an 8-team weekend tournament with Arsenal, Chelsea, Liverpool, Spurs, Man City, Man United, Everton, and Aston Villa at college ground tomorrow 5 PM"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] text-xs focus:outline-none focus:border-[#D72645] focus:ring-1 focus:ring-[#D72645]/30 placeholder:text-[#6E6A6D] transition resize-none leading-relaxed"
            />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToCreate) {
                    onNavigateToCreate(masterPromptText.trim() || undefined);
                  }
                }}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] text-white font-bold text-xs shadow-lg shadow-[#D72645]/30 transition cursor-pointer flex items-center justify-center gap-2 group"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              {onOpenTournamentSwitcher && (
                <button
                  type="button"
                  onClick={onOpenTournamentSwitcher}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#141418] hover:bg-[#202028] border border-white/10 text-[#A5A1A4] hover:text-[#F0E9E7] text-xs font-mono font-medium transition cursor-pointer"
                >
                  Select Tournament
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Top Banner: Tournament Name, Live Status & Quick Share */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#19191F] border border-white/10 shadow-2xl relative overflow-hidden">
            {/* Subtle Burgundy Depth Corner Ambient Glow */}
            <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#21191D]/80 via-[#D72645]/10 to-transparent pointer-events-none" />

            <div className="min-w-0 relative z-10">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[#F0E9E7] tracking-tight truncate">
                  {tournament.name}
                </h1>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1.5 ${
                  tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED'
                    ? 'bg-[#21191D] text-[#D72645] border-[#D72645]/40'
                    : 'bg-[#141418] text-[#A5A1A4] border-white/10'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    tournament.status === 'IN_PROGRESS' ? 'bg-[#D72645] animate-ping' : 'bg-[#A5A1A4]'
                  }`} />
                  {tournament.status}
                </span>
              </div>

              <p className="text-xs text-[#A5A1A4] mt-1.5 flex items-center gap-2 font-mono">
                <span>{tournament.visibility === 'PUBLIC' ? 'Public Tournament' : 'Private Tournament'}</span>
                <span className="text-white/20">•</span>
                <span>{teams.length} Teams</span>
                <span className="text-white/20">•</span>
                <span>{matches.length} Matches</span>
                <span className="text-white/20">•</span>
                <span>{tournament.season || '2026'}</span>
              </p>
            </div>

            {/* Share Tournament Action */}
            <div className="flex items-center gap-2 shrink-0 relative z-10">
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-[0_2px_12px_rgba(215, 38, 69,0.35)]"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Tournament</span>
              </button>
            </div>
          </div>

      {/* Visual Centerpiece: Master Tournament Prompt Creator (Integrated seamlessly) */}
      <div className="relative p-6 sm:p-7 rounded-2xl bg-[#19191F] border border-white/10 shadow-xl overflow-hidden">
        {/* Subtle crimson accent line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#D72645]/50 to-transparent" />
        
        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141418] border border-white/10 text-[#F0E9E7] text-xs font-mono font-semibold w-fit">
              <Sparkles className="w-3.5 h-3.5 text-[#D72645]" />
              <span>Prompt Engine</span>
            </div>
            
            <button
              type="button"
              onClick={() => setIsDraftsModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#141418] hover:bg-[#202028] border border-white/10 text-[#A5A1A4] hover:text-[#F0E9E7] text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer w-fit"
            >
              <FileText className="w-3.5 h-3.5 text-[#D72645]" />
              <span>Saved Drafts</span>
              {draftsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#D72645]/20 text-[#D72645] text-[10px] font-bold">
                  {draftsCount}
                </span>
              )}
            </button>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-[#F0E9E7] tracking-tight">
              Create a new competition from natural language
            </h2>
            <p className="text-xs text-[#A5A1A4] mt-1 font-sans leading-relaxed">
              Describe squads, dates, round-robins, or knockout brackets in plain English.
            </p>
          </div>

          <div className="space-y-3">
            <textarea
              value={masterPromptText}
              onChange={(e) => setMasterPromptText(e.target.value)}
              placeholder="e.g. Create an 8-team tournament with Arsenal, Chelsea, Liverpool, Spurs, Man City, Man United, Everton and Aston Villa at college ground tomorrow 5 pm"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] text-xs focus:outline-none focus:border-[#D72645] focus:ring-1 focus:ring-[#D72645]/30 font-sans placeholder:text-[#6E6A6D] transition shadow-inner resize-none leading-relaxed"
            />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleSavePromptDraft}
                disabled={!masterPromptText.trim()}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#141418] hover:bg-[#202028] border border-white/10 text-[#A5A1A4] hover:text-[#F0E9E7] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchMasterPrompt}
                disabled={!masterPromptText.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 group"
              >
                <span>Generate Preview</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {draftNotice && (
              <p className="text-xs text-[#D72645] text-center pt-1 font-mono font-medium animate-pulse">
                {draftNotice}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Operational Assistant Command Box (Natural Language for active tournament) */}
      <div className="p-5 rounded-2xl bg-[#19191F] border border-white/10 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#D72645] uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-[#D72645]" />
            <span>Management Assistant</span>
          </div>
          <span className="text-[11px] text-[#A5A1A4] hidden sm:inline font-mono">
            try: "Record score as 2-1" or "Move match 3 to Saturday 5 PM"
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            type="text"
            value={commandPrompt}
            onChange={(e) => setCommandPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeCommand()}
            placeholder="e.g. Move Match 1 to Saturday at 4 PM, or Set score 2-1 for FC Goa vs Chennaiyin FC"
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] text-xs focus:outline-none focus:border-[#D72645] font-sans placeholder:text-[#6E6A6D] transition"
          />

          <button
            type="button"
            disabled={!commandPrompt.trim() || isAnalyzingCommand}
            onClick={handleAnalyzeCommand}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 font-mono"
          >
            {isAnalyzingCommand ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span>Execute Command</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Notices */}
        {commandSuccessNotice && (
          <div className="mt-3 p-3 rounded-xl bg-[#21191D] border border-[#D72645]/40 text-[#F0E9E7] text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#D72645] shrink-0" />
            <span>{commandSuccessNotice}</span>
          </div>
        )}

        {commandErrorNotice && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{commandErrorNotice}</span>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Operational Changes */}
      <AnimatePresence>
        {commandProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-[#19191F] border border-white/10 shadow-2xl space-y-4 text-[#F0E9E7]"
            >
              <div className="flex items-center gap-2 text-[#D72645] font-mono font-bold text-sm">
                <Sparkles className="w-4 h-4 text-[#D72645]" />
                <span>Confirm Proposed Command</span>
              </div>

              <div className="p-4 rounded-xl bg-[#101013] border border-white/10 text-xs space-y-2">
                <div className="text-[#F0E9E7] font-medium">{commandProposal.description}</div>
                <div className="text-xs text-[#D72645] font-mono font-semibold">
                  Action: {commandProposal.actionType}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCommandProposal(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-[#A5A1A4] text-xs font-mono hover:bg-[#141418] hover:text-[#F0E9E7] transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleApplyCommand}
                  className="px-5 py-2 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] text-white text-xs font-mono font-bold transition cursor-pointer shadow-md"
                >
                  Apply Change
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Consolidated Workspace Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.08] overflow-x-auto pb-1 text-xs font-mono font-bold uppercase tracking-wider">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'matches', label: `Fixtures (${matches.length})` },
          { id: 'standings', label: 'Standings' },
          { id: 'teams', label: `Squads (${teams.length})` },
          { id: 'stats', label: 'Stats' },
          { id: 'collaborators', label: `Passes (${invites.length})` },
          { id: 'settings', label: 'Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as WorkspaceTab)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#21191D] text-[#F0E9E7] border border-[#D72645]/40 shadow-sm'
                : 'text-[#A5A1A4] hover:text-[#F0E9E7] hover:bg-[#19191F]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels with Real 3D Depth Transitions */}
      <PageTransition3D transitionKey={activeTab} type="depth">
      
      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Match Highlights & Stadium Overview */}
          <div className="md:col-span-2 space-y-5">
            
            {/* Football Ground Overview with Standard Dimensions & Real 3D Stadium Perspective */}
            <FootballGroundOverview initialFormat={detectedPitchFormat} className="mb-4" />

            {/* LIVE MATCHES HERO (Distinctive crimson live pulse) */}
            {liveMatches.length > 0 && (
              <div className="p-5 rounded-2xl bg-[#1C1418] border border-[#D72645]/60 space-y-3 shadow-[0_8px_30px_rgba(215, 38, 69,0.2)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#D72645] font-mono font-bold text-xs uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D72645] animate-ping" />
                    <span>Live Matches In Progress ({liveMatches.length})</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#A5A1A4]">Live updates enabled</span>
                </div>

                {liveMatches.map((m) => {
                  const home = teams.find(t => t.id === m.home_team_id)?.name || m.home_team_id;
                  const away = teams.find(t => t.id === m.away_team_id)?.name || m.away_team_id;
                  return (
                    <div key={m.id} className="flex items-center justify-between p-4 rounded-xl bg-[#101013] border border-white/10 shadow-sm">
                      <div className="flex-1 font-bold text-[#F0E9E7] text-sm truncate">{home}</div>
                      
                      <div className="px-4 py-1.5 bg-[#21191D] border border-[#D72645]/40 rounded-xl flex items-center gap-2 mx-3">
                        <span className="font-score text-xl font-extrabold text-[#D72645]">
                          {m.home_score ?? 0}
                        </span>
                        <span className="text-[#A5A1A4] font-mono text-xs">-</span>
                        <span className="font-score text-xl font-extrabold text-[#D72645]">
                          {m.away_score ?? 0}
                        </span>
                      </div>

                      <div className="flex-1 font-bold text-[#F0E9E7] text-sm text-right truncate">{away}</div>

                      <button
                        type="button"
                        onClick={() => handleOpenScoreModal(m)}
                        className="ml-4 px-3 py-1.5 rounded-lg bg-[#D72645] hover:bg-[#C21D3A] text-white text-xs font-mono font-bold transition cursor-pointer shadow-sm"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* NEXT SCHEDULED FIXTURE (Distinctive Composition, visually different from ordinary rows) */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1E1920] via-[#19191F] to-[#141418] border border-white/10 shadow-xl space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="text-xs font-mono font-bold text-[#D72645] uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D72645]" /> Next Scheduled Fixture
                </span>
                {nextMatch && (
                  <span className="text-[11px] font-mono text-[#A5A1A4]">
                    Match #{nextMatch.match_number} • Round {nextMatch.round_number}
                  </span>
                )}
              </div>

              {nextMatch ? (
                (() => {
                  const home = teams.find(t => t.id === nextMatch.home_team_id)?.name || nextMatch.home_team_id;
                  const away = teams.find(t => t.id === nextMatch.away_team_id)?.name || nextMatch.away_team_id;
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-11 items-center gap-3 py-2">
                        <div className="col-span-5 text-right font-display font-extrabold text-[#F0E9E7] text-base sm:text-xl truncate">
                          {home}
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <span className="px-2.5 py-1 rounded-md bg-[#21191D] border border-[#D72645]/40 text-[#D72645] font-mono text-xs font-extrabold">
                            VS
                          </span>
                        </div>
                        <div className="col-span-5 text-left font-display font-extrabold text-[#F0E9E7] text-base sm:text-xl truncate">
                          {away}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08] text-xs text-[#A5A1A4]">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-[#D72645]" />
                            <span>{nextMatch.scheduled_date || 'Date TBA'}</span>
                          </span>
                          <span className="flex items-center gap-1.5 font-mono">
                            <Clock className="w-3.5 h-3.5 text-[#D72645]" />
                            <span>{nextMatch.scheduled_time || 'Time TBA'}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenScoreModal(nextMatch)}
                          className="px-4 py-2 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] text-white text-xs font-mono font-bold transition cursor-pointer shadow-[0_2px_10px_rgba(215, 38, 69,0.3)]"
                        >
                          Record Match Score
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-xs text-[#A5A1A4] py-4 text-center font-mono">
                  All matches completed or no matches scheduled yet.
                </div>
              )}
            </div>

            {/* RECENT MATCH RESULTS */}
            <div className="p-5 rounded-2xl bg-[#19191F] border border-white/10 shadow-lg space-y-3">
              <span className="text-xs font-mono font-bold text-[#A5A1A4] uppercase tracking-wider block">
                Recent Match Results
              </span>

              {recentResults.length === 0 ? (
                <div className="text-xs text-[#A5A1A4] py-3 text-center font-mono">
                  No completed matches yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentResults.map((m) => {
                    const home = teams.find(t => t.id === m.home_team_id)?.name || m.home_team_id;
                    const away = teams.find(t => t.id === m.away_team_id)?.name || m.away_team_id;
                    return (
                      <div key={m.id} className="p-3 rounded-xl bg-[#101013] border border-white/10 flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#F0E9E7] truncate max-w-[130px] sm:max-w-[160px]">{home}</span>
                        <span className="font-score font-bold text-sm text-[#F0E9E7] px-3 py-0.5 bg-[#21191D] border border-[#D72645]/40 rounded-lg">
                          {m.home_score} - {m.away_score}
                        </span>
                        <span className="font-semibold text-[#F0E9E7] truncate max-w-[130px] sm:max-w-[160px] text-right">{away}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Column 3: Standings Snapshot */}
          <div className="p-5 rounded-2xl bg-[#19191F] border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <span className="text-xs font-mono font-bold text-[#A5A1A4] uppercase tracking-wider">
                Standings Snapshot
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('standings')}
                className="text-[11px] font-mono text-[#D72645] hover:underline cursor-pointer"
              >
                Full Table &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[#A5A1A4] text-[10px] font-mono uppercase">
                    <th className="pb-2 font-semibold">#</th>
                    <th className="pb-2 font-semibold">Club</th>
                    <th className="pb-2 font-semibold text-center">P</th>
                    <th className="pb-2 font-semibold text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {standings.slice(0, 6).map((st, idx) => (
                    <tr key={st.team.id} className="hover:bg-[#141418] transition-colors">
                      <td className="py-2.5 font-mono text-[#A5A1A4]">{idx + 1}</td>
                      <td className="py-2.5 font-semibold text-[#F0E9E7] truncate max-w-[110px]">{st.team.name}</td>
                      <td className="py-2.5 text-center text-[#A5A1A4] font-mono">{st.played}</td>
                      <td className="py-2.5 text-center font-score font-bold text-sm text-[#D72645]">{st.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: FIXTURES & MATCH SCHEDULES */}
      {activeTab === 'matches' && (
        <div className="p-6 rounded-2xl bg-[#19191F] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <h2 className="text-lg font-display font-bold text-[#F0E9E7]">Fixtures & Match Schedules</h2>
              <p className="text-xs text-[#A5A1A4] mt-0.5 font-sans">Click any fixture to enter match scores, goals, and Player of the Match</p>
            </div>
            <span className="text-xs font-mono text-[#A5A1A4]">{matches.length} Scheduled</span>
          </div>

          <div className="space-y-2.5">
            {matches.map((m) => {
              const home = teams.find(t => t.id === m.home_team_id)?.name || m.home_team_id;
              const away = teams.find(t => t.id === m.away_team_id)?.name || m.away_team_id;

              return (
                <div
                  key={m.id}
                  onClick={() => handleOpenScoreModal(m)}
                  className="p-3.5 sm:p-4 rounded-xl bg-[#141418] border border-white/10 hover:border-[#D72645]/50 hover:bg-[#1D1B22] transition flex items-center justify-between cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-[#D72645] bg-[#21191D] border border-[#D72645]/30 px-2 py-0.5 rounded">
                      R{m.round_number} M{m.match_number}
                    </span>
                    <span className="font-bold text-[#F0E9E7] text-sm truncate max-w-[130px] sm:max-w-[200px]">{home}</span>
                    <span className="text-xs text-[#A5A1A4] font-mono">vs</span>
                    <span className="font-bold text-[#F0E9E7] text-sm truncate max-w-[130px] sm:max-w-[200px]">{away}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {m.status === 'COMPLETED' ? (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const mMotm = motms.find(motm => motm.match_id === m.id);
                          const p = mMotm ? players.find(pl => pl.id === mMotm.player_id) : null;
                          if (!p) return null;
                          return (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#21191D] border border-[#D72645]/30 text-[#F0E9E7] text-[11px] font-mono font-bold">
                              ⭐ {p.name}
                            </span>
                          );
                        })()}
                        <span className="font-score font-bold text-sm text-[#F0E9E7] bg-[#21191D] px-3 py-0.5 rounded-lg border border-[#D72645]/40">
                          {m.home_score} - {m.away_score}
                        </span>
                      </div>
                    ) : m.status === 'LIVE' ? (
                      <span className="font-score font-bold text-sm text-[#D72645] bg-[#21191D] px-3 py-0.5 rounded-lg border border-[#D72645]/60 animate-pulse">
                        {m.home_score ?? 0} - {m.away_score ?? 0} (LIVE)
                      </span>
                    ) : (
                      <span className="text-xs text-[#A5A1A4] group-hover:text-[#D72645] flex items-center gap-1 font-mono font-bold">
                        <Edit className="w-3.5 h-3.5 text-[#D72645]" />
                        <span>Score</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: STANDINGS TABLE */}
      {activeTab === 'standings' && (
        <div className="p-6 rounded-2xl bg-[#19191F] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <h2 className="text-lg font-display font-bold text-[#F0E9E7]">Tournament Standings</h2>
              <p className="text-xs text-[#A5A1A4] mt-0.5 font-sans">Official rankings computed deterministically from match outcomes</p>
            </div>
            <span className="text-[11px] font-mono text-[#A5A1A4]">
              Win = 3 • Draw = 1 • Loss = 0
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-mono font-bold text-[#A5A1A4] border-b border-white/[0.08]">
                  <th className="py-2.5 w-8">#</th>
                  <th className="py-2.5">Club</th>
                  <th className="py-2.5 text-center w-8">P</th>
                  <th className="py-2.5 text-center w-8">W</th>
                  <th className="py-2.5 text-center w-8">D</th>
                  <th className="py-2.5 text-center w-8">L</th>
                  <th className="py-2.5 text-center w-8">GF</th>
                  <th className="py-2.5 text-center w-8">GA</th>
                  <th className="py-2.5 text-center w-9">GD</th>
                  <th className="py-2.5 text-center w-10 font-bold text-[#D72645] font-mono">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {standings.map((s, idx) => (
                  <tr key={s.team.id} className="hover:bg-[#141418] transition-colors">
                    <td className="py-3 font-mono font-bold text-[#A5A1A4]">{idx + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {s.team.logo_url ? (
                          <img src={s.team.logo_url} alt={s.team.name} className="w-5 h-5 rounded-full object-contain" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#21191D] text-[#D72645] border border-[#D72645]/40 text-[10px] font-mono font-bold flex items-center justify-center">
                            {s.team.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-[#F0E9E7] truncate">{s.team.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center text-[#A5A1A4] font-mono">{s.played}</td>
                    <td className="py-3 text-center text-[#A5A1A4] font-mono">{s.won}</td>
                    <td className="py-3 text-center text-[#A5A1A4] font-mono">{s.drawn}</td>
                    <td className="py-3 text-center text-[#A5A1A4] font-mono">{s.lost}</td>
                    <td className="py-3 text-center text-[#A5A1A4] font-mono">{s.goals_for}</td>
                    <td className="py-3 text-center text-[#A5A1A4] font-mono">{s.goals_against}</td>
                    <td className="py-3 text-center text-[#A5A1A4] font-mono">
                      {s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}
                    </td>
                    <td className="py-3 text-center font-score font-black text-[#D72645] text-sm">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TEAMS & SQUADS */}
      {activeTab === 'teams' && (
        <div className="p-6 rounded-2xl bg-[#19191F] border border-white/10 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div>
              <h2 className="text-lg font-display font-bold text-[#F0E9E7]">Teams & Squad Rosters</h2>
              <span className="text-xs font-mono text-[#A5A1A4]">{teams.length} Clubs registered</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMediaModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] text-white text-xs font-mono font-bold flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Bulk Upload Media</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((t) => {
              const teamPlayers = players.filter(p => p.team_id === t.id);

              return (
                <div key={t.id} className="p-4 rounded-xl bg-[#141418] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                    <div className="flex items-center gap-2.5">
                      {t.logo_url ? (
                        <img
                          src={t.logo_url}
                          alt={t.name}
                          className="w-7 h-7 rounded-full object-contain border border-white/10 bg-[#101013] p-0.5"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#21191D] border border-[#D72645]/40 flex items-center justify-center text-[#D72645]">
                          <Shield className="w-4 h-4" />
                        </div>
                      )}
                      <span className="font-bold text-[#F0E9E7] text-sm">{t.name}</span>
                    </div>
                    <span className="text-xs font-mono text-[#A5A1A4]">{teamPlayers.length} Players</span>
                  </div>

                  <div className="text-xs text-[#A5A1A4] font-mono">
                    Manager: <span className="text-[#F0E9E7] font-semibold">{t.manager_name || 'None assigned'}</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    {teamPlayers.length === 0 ? (
                      <div className="text-xs text-[#A5A1A4] italic font-mono">No players added to squad yet.</div>
                    ) : (
                      teamPlayers.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.05]">
                          <div className="flex items-center gap-2">
                            {p.photo_url ? (
                              <img
                                src={p.photo_url}
                                alt={p.name}
                                className="w-5 h-5 rounded-full object-cover border border-white/10 shrink-0"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-[#21191D] shrink-0 flex items-center justify-center text-[9px] font-mono font-bold text-[#D72645] border border-[#D72645]/30">
                                {p.name.charAt(0)}
                              </div>
                            )}
                            <span className="font-medium text-[#F0E9E7]">{p.name} {p.is_captain && '★'}</span>
                          </div>
                          <span className="font-mono text-[10px] text-[#F0E9E7] bg-[#21191D] border border-[#D72645]/30 px-1.5 py-0.2 rounded font-bold">
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

      {/* TAB 5: STATS & AWARDS */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#19191F] border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-display font-bold text-[#F0E9E7]">Tournament Stats & Leaders</h2>
              <p className="text-xs text-[#A5A1A4] mt-0.5">
                Top goalscorers and Player of the Match awards calculated dynamically.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#F0E9E7] bg-[#141418] px-3 py-1.5 rounded-xl border border-white/10">
              <span>{goals.length} Goals Recorded</span>
              <span className="text-white/20">•</span>
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

      {/* TAB 6: COLLABORATORS & PASSES */}
      {activeTab === 'collaborators' && (
        <div className="p-6 rounded-2xl bg-[#19191F] border border-white/10 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-display font-bold text-[#F0E9E7] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#D72645]" />
              <span>Matchday Passes & Collaborators</span>
            </h2>
            <p className="text-xs text-[#A5A1A4] mt-1 font-sans">
              Issue access codes for match scorekeepers, spectators, and staff.
            </p>
          </div>

          {inviteFeedback && (
            <div className="p-3.5 rounded-xl bg-[#21191D] border border-[#D72645]/40 text-[#F0E9E7] text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#D72645] shrink-0" />
              <span>{inviteFeedback}</span>
            </div>
          )}

          {/* Invitation Input Form */}
          <form onSubmit={handleCreateInvite} className="p-4 rounded-xl bg-[#141418] border border-white/10 space-y-3">
            <span className="text-xs font-mono font-bold text-[#F0E9E7] uppercase tracking-wider">
              Authorize an Email Address
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <input
                  type="email"
                  required
                  value={newInviteEmail}
                  onChange={(e) => setNewInviteEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] text-xs focus:outline-none focus:border-[#D72645] placeholder-[#6E6A6D] font-sans"
                />
              </div>

              <div>
                <select
                  value={newInviteRole}
                  onChange={(e) => setNewInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] text-xs focus:outline-none focus:border-[#D72645] font-mono cursor-pointer"
                >
                  <option value="SCORE">SCORE (Scorekeeper)</option>
                  <option value="ORGANIZER">ORGANIZER (Full)</option>
                  <option value="VIEW">VIEW (Spectator)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] text-white font-bold font-mono text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Issue Pass</span>
              </button>
            </div>
          </form>

          {/* Pending Invitations Table */}
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold text-[#A5A1A4] uppercase tracking-wider">
              Issued Passes ({invites.length})
            </span>

            {invites.length === 0 ? (
              <div className="text-xs text-[#A5A1A4] font-mono italic py-4 text-center">
                No collaborator passes issued yet.
              </div>
            ) : (
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl bg-[#141418] border border-white/10 flex items-center justify-between text-xs shadow-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#F0E9E7] flex items-center gap-2">
                        <span>{inv.email}</span>
                        <span className="px-2 py-0.5 rounded bg-[#21191D] border border-[#D72645]/40 text-[#D72645] font-mono text-[10px]">
                          {inv.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A5A1A4] font-mono">
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
                        className="px-2.5 py-1 rounded bg-[#101013] border border-white/10 hover:border-white/20 text-[#F0E9E7] font-mono text-xs transition cursor-pointer"
                      >
                        {copiedInviteId === inv.id ? 'Copied' : 'Copy Code'}
                      </button>

                      {inv.status !== 'REVOKED' && (
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="px-2 py-1 text-[#A5A1A4] hover:text-rose-400 transition cursor-pointer text-xs font-mono"
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

      {/* TAB 7: SETTINGS & DELETION */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#19191F] border border-white/10 shadow-xl space-y-6">
            
            {/* Settings Header with Save button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div>
                <h2 className="text-lg font-display font-bold text-[#F0E9E7] flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#D72645]" />
                  <span>Tournament Settings & Configuration</span>
                </h2>
                <p className="text-xs text-[#A5A1A4] mt-0.5 font-sans">
                  Manage visibility, scoring rules, feature switches, and credentials for <span className="font-semibold text-[#F0E9E7]">{tournament.name}</span>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-4 py-2 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] text-white font-bold font-mono text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50 shrink-0"
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
                    ? 'bg-[#21191D] border-[#D72645]/40 text-[#F0E9E7]'
                    : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                }`}
              >
                {settingsFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#D72645] shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{settingsFeedback.message}</span>
              </div>
            )}

            {/* Settings Form Grid */}
            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* Left Column: Core Identity & Visibility */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A5A1A4] mb-1">
                    Tournament Name
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsName}
                    onChange={e => setSettingsName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] text-xs focus:outline-none focus:border-[#D72645] font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A5A1A4] mb-1">
                      Season / Year
                    </label>
                    <input
                      type="text"
                      value={settingsSeason}
                      onChange={e => setSettingsSeason(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] text-xs focus:outline-none focus:border-[#D72645] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A5A1A4] mb-1">
                      Status
                    </label>
                    <select
                      value={settingsStatus}
                      onChange={e => setSettingsStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] text-xs focus:outline-none focus:border-[#D72645] font-mono cursor-pointer"
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
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A5A1A4] mb-1.5">
                    Visibility Toggle
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSettingsVisibility('PUBLIC')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                        settingsVisibility === 'PUBLIC'
                          ? 'bg-[#21191D] border-[#D72645] text-[#F0E9E7] font-bold'
                          : 'bg-[#141418] border-white/10 text-[#A5A1A4] hover:bg-[#1A1A22]'
                      }`}
                    >
                      <Globe className="w-4 h-4 text-[#D72645] shrink-0" />
                      <div>
                        <div className="text-xs font-mono font-semibold">Public</div>
                        <div className="text-[10px] text-[#A5A1A4]">Accessible to all visitors</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettingsVisibility('PRIVATE')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                        settingsVisibility === 'PRIVATE'
                          ? 'bg-[#21191D] border-[#D72645] text-[#F0E9E7] font-bold'
                          : 'bg-[#141418] border-white/10 text-[#A5A1A4] hover:bg-[#1A1A22]'
                      }`}
                    >
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-xs font-mono font-semibold">Private</div>
                        <div className="text-[10px] text-[#A5A1A4]">Requires VIEW pass</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A5A1A4] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={settingsDescription}
                    onChange={e => setSettingsDescription(e.target.value)}
                    placeholder="Tournament overview, rules, and notes"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] text-xs focus:outline-none focus:border-[#D72645] resize-none font-sans"
                  />
                </div>
              </div>

              {/* Right Column: Rules & Optional Feature Switches */}
              <div className="space-y-4">
                
                {/* Scoring Rules & Duration */}
                <div className="p-4 rounded-xl bg-[#141418] border border-white/10 space-y-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#A5A1A4] block">
                    Points & Duration
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono text-[#A5A1A4] mb-0.5">Win Pts</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={settingsWinPts}
                        onChange={e => setSettingsWinPts(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2 py-1 bg-[#101013] border border-white/10 text-[#D72645] text-xs font-score font-bold text-center rounded-lg focus:outline-none focus:border-[#D72645]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-[#A5A1A4] mb-0.5">Draw Pts</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={settingsDrawPts}
                        onChange={e => setSettingsDrawPts(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2 py-1 bg-[#101013] border border-white/10 text-[#D72645] text-xs font-score font-bold text-center rounded-lg focus:outline-none focus:border-[#D72645]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-[#A5A1A4] mb-0.5">Loss Pts</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={settingsLossPts}
                        onChange={e => setSettingsLossPts(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2 py-1 bg-[#101013] border border-white/10 text-[#D72645] text-xs font-score font-bold text-center rounded-lg focus:outline-none focus:border-[#D72645]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-[#A5A1A4] mb-0.5">
                      Match Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={settingsDuration}
                      onChange={e => setSettingsDuration(parseInt(e.target.value, 10) || 50)}
                      className="w-full px-3 py-1.5 bg-[#101013] border border-white/10 text-[#F0E9E7] text-xs font-score font-bold rounded-lg focus:outline-none focus:border-[#D72645]"
                    />
                  </div>
                </div>

                {/* Optional Feature Toggles */}
                <div className="p-4 rounded-xl bg-[#141418] border border-white/10 space-y-2.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#A5A1A4] block">
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
                            ? 'bg-[#21191D] border-[#D72645]/40 text-[#F0E9E7]'
                            : 'bg-[#101013] border-white/10 text-[#A5A1A4] hover:border-white/20'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold font-mono">{feat.label}</div>
                          <div className="text-[10px] text-[#A5A1A4]">{feat.desc}</div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition ${
                            active ? 'bg-[#D72645] text-white' : 'border border-white/20 bg-[#101013]'
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

            {/* Access Credentials Box */}
            <div className="p-4 rounded-xl bg-[#141418] border border-white/10 space-y-3">
              <div className="flex items-center gap-2 font-mono font-bold text-[#D72645] text-xs">
                <Key className="w-4 h-4 text-[#D72645]" />
                <span>Tournament Access Credentials</span>
              </div>
              <p className="text-[#A5A1A4] text-[11px]">
                Share these codes with spectators or staff. No account registration is required for participants to view scores.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3 rounded-lg bg-[#101013] border border-white/10">
                  <div className="text-[10px] uppercase font-mono font-bold text-[#A5A1A4]">Public Viewer Code</div>
                  <div className="font-mono text-sm font-bold text-[#F0E9E7] mt-0.5">
                    {tournament.rules_config?.viewer_access_code || tournament.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-[10px] text-[#A5A1A4] mt-1 font-mono">Read-only live scores and standings</div>
                </div>

                <div className="p-3 rounded-lg bg-[#101013] border border-white/10">
                  <div className="text-[10px] uppercase font-mono font-bold text-amber-400">Staff Modifier Code</div>
                  <div className="font-mono text-sm font-bold text-amber-300 mt-0.5">
                    {tournament.rules_config?.modifier_access_code || 'MOD-' + tournament.id.slice(0, 6).toUpperCase()}
                  </div>
                  <div className="text-[10px] text-[#A5A1A4] mt-1 font-mono">Update scores without full admin rights</div>
                </div>
              </div>
            </div>

            {/* Danger Zone: Tournament Deletion */}
            <div className="p-5 rounded-2xl bg-[#1A1417] border border-rose-900/40 space-y-4">
              <div className="flex items-center gap-2 font-mono font-bold text-rose-400 text-xs tracking-wider uppercase">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Danger Zone • Tournament Management & Deletion</span>
              </div>
              <p className="text-[#A5A1A4] text-xs leading-relaxed">
                Actions here permanently affect tournament persistence across local browser storage and cloud Supabase records.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Individual Tournament Deletion */}
                <div className="p-4 rounded-xl bg-[#101013] border border-white/[0.08] flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-xs font-mono font-bold text-[#F0E9E7]">Delete Current Tournament</div>
                    <p className="text-[11px] text-[#A5A1A4] mt-1 leading-relaxed">
                      Permanently purges "{tournament.name}" fixtures, results, squads, and access codes.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isDeletingTournament}
                    onClick={() => {
                      setShowDeleteModal(true);
                      setDeleteError(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete "{tournament.name.slice(0, 18)}"</span>
                  </button>
                </div>

                {/* Bulk Delete All My Tournaments */}
                <div className="p-4 rounded-xl bg-[#101013] border border-rose-500/20 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="text-xs font-mono font-bold text-rose-400 flex items-center justify-between">
                      <span>Delete All My Tournaments</span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 text-[10px] border border-rose-800/50">
                        {userTournamentsCount} {userTournamentsCount === 1 ? 'tournament' : 'tournaments'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A5A1A4] mt-1 leading-relaxed">
                      Purges all tournaments, fixtures, squads, and draft records owned by your authenticated account.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isDeletingAllTournaments}
                    onClick={() => {
                      setShowDeleteAllModal(true);
                      setDeleteAllError(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All My Tournaments ({userTournamentsCount})</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-start">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2 rounded-xl bg-[#141418] border border-white/10 text-[#A5A1A4] hover:text-[#F0E9E7] font-mono text-xs transition cursor-pointer"
                >
                  Sign Out of Organizer Account
                </button>
              </div>
            </div>

          </div>

          {/* IN-APP INDIVIDUAL TOURNAMENT DELETION CONFIRMATION MODAL */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-[#19191F] rounded-2xl border border-rose-800/60 shadow-2xl p-6 space-y-4 text-[#F0E9E7]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/60 text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-mono font-bold text-[#F0E9E7]">Delete Tournament?</h3>
                    <p className="text-xs text-[#A5A1A4] font-mono">Permanent and irreversible action</p>
                  </div>
                </div>

                {deleteError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="text-xs text-[#A5A1A4] space-y-2 leading-relaxed bg-[#101013] p-4 rounded-xl border border-white/[0.06]">
                  <p>
                    Are you sure you want to delete <span className="font-bold text-[#F0E9E7] font-mono">"{tournament.name}"</span>?
                  </p>
                  <p>
                    This will permanently purge all fixtures, squads, results, and access codes from both local browser storage and cloud Supabase.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    disabled={isDeletingTournament}
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteError(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-white/10 hover:bg-[#141418] text-xs font-mono text-[#A5A1A4] hover:text-[#F0E9E7] transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isDeletingTournament}
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50"
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

          {/* BULK TOURNAMENT DELETION CONFIRMATION MODAL */}
          {showDeleteAllModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="w-full max-w-lg bg-[#19191F] rounded-2xl border border-rose-600/60 shadow-2xl p-6 space-y-4 text-[#F0E9E7]">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/60 text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-mono font-bold text-[#F0E9E7]">Delete All My Tournaments</h3>
                    <p className="text-xs text-rose-400 font-mono">Irreversible Bulk Destruction • {userTournamentsCount} Tournaments</p>
                  </div>
                </div>

                {deleteAllError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{deleteAllError}</span>
                  </div>
                )}

                <div className="text-xs text-[#A5A1A4] space-y-3 leading-relaxed bg-[#101013] p-4 rounded-xl border border-white/[0.06]">
                  <p className="text-[#F0E9E7] font-medium">
                    This action will permanently purge all tournaments owned by your authenticated account across:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] font-mono text-rose-300">
                    <li>Cloud Supabase Database (tournaments, matches, events, squads)</li>
                    <li>Local Browser Cache & Vaults</li>
                    <li>Viewer & Modifier Access Codes</li>
                  </ul>
                  <p className="text-[11px] text-[#A5A1A4]">
                    Protected tournaments (such as official demo records and tournaments owned by other users) will be strictly preserved.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                  <button
                    type="button"
                    disabled={isDeletingAllTournaments}
                    onClick={() => {
                      setShowDeleteAllModal(false);
                      setDeleteAllError(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-white/10 hover:bg-[#141418] text-xs font-mono text-[#A5A1A4] hover:text-[#F0E9E7] transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isDeletingAllTournaments}
                    onClick={handleConfirmDeleteAllTournaments}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {isDeletingAllTournaments ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Purging All Tournaments...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm & Delete All ({userTournamentsCount})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </PageTransition3D>
      </>
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
        tournamentId={tournament?.id || ''}
        onUploadSuccess={() => {
          setIsMediaModalOpen(false);
          onDataChanged();
        }}
      />

      {/* DRAFTS VAULT MODAL */}
      <DraftsModal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        onSelectDraft={(draft) => {
          if (draft.prompt) {
            setMasterPromptText(draft.prompt);
          }
          if (onNavigateToCreate) {
            onNavigateToCreate(draft.prompt);
          }
        }}
        onDraftsChanged={refreshDraftsCount}
      />

      {/* PROMINENT SHARE TOURNAMENT MODAL */}
      <ShareTournamentModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        tournament={tournament}
      />

    </div>
  );
}
