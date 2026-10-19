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
  FileText
} from 'lucide-react';
import { Tournament } from '../types/multiTenant';
import { Team, Match, Player, Goal, ManOfTheMatch } from '../types/tournament';
import { tournamentService } from '../services/tournamentService';
import { TournamentInvite, localDataService, FTM_STORAGE_KEYS } from '../services/localDataService';
import { parseWorkspaceCommand, ProposedWorkspaceAction } from '../utils/promptParsers';
import { BulkMediaUploadModal } from '../components/admin/BulkMediaUploadModal';
import { MatchScoreEditorModal } from '../components/match/MatchScoreEditorModal';
import { StatsAndLeadersView } from '../components/stats/StatsAndLeadersView';

import { DraftsModal } from '../components/admin/DraftsModal';

interface OrganizerWorkspacePageProps {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  players: Player[];
  standings: any[];
  onDataChanged: () => void;
  onNavigateHome: () => void;
  onNavigateToCreate?: (prompt?: string) => void;
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
  onNavigateToCreate,
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

  // Master Prompt Tournament Creator (Central Visual Centerpiece)
  const [masterPromptText, setMasterPromptText] = useState(() => {
    try {
      return localStorage.getItem(FTM_STORAGE_KEYS.PROMPT_DRAFT) || '';
    } catch {
      return '';
    }
  });
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
    <div className="w-full max-w-5xl mx-auto py-4 px-3 sm:px-6 space-y-6 text-[#f1f5f9]">
      
      {/* Top Banner: Tournament Name & Quick Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#0f1411] border border-[#1f2e26] shadow-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#f1f5f9] font-mono tracking-tight truncate">
              {tournament.name}
            </h1>
            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider ${
              tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED'
                ? 'bg-lime-950/60 text-lime-300 border-lime-700/60'
                : 'bg-amber-950/60 text-amber-300 border-amber-700/60'
            }`}>
              {tournament.status}
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-mono">
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
            className="px-3.5 py-2 rounded-xl bg-[#141d18] hover:bg-[#1a261f] text-lime-400 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer border border-[#273a2f]"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share Public Link'}</span>
          </button>
        </div>
      </div>

      {/* Visual Centerpiece: Master Tournament Prompt Creator */}
      <div className="relative p-6 sm:p-8 rounded-2xl bg-[#0f1411] border border-[#23352a] shadow-2xl overflow-hidden">
        {/* Subtle retro glowing ambient gradient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-lime-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#141d18] border border-lime-700/50 text-lime-400 text-[11px] font-pixel tracking-widest uppercase w-fit">
              <Sparkles className="w-3.5 h-3.5 text-lime-400" />
              <span>Master Tournament Engine</span>
            </div>
            
            <button
              type="button"
              onClick={() => setIsDraftsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#141d18] hover:bg-[#19241e] border border-[#23352a] text-slate-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer w-fit"
            >
              <FileText className="w-3.5 h-3.5 text-lime-400" />
              <span>Drafts Vault</span>
              {draftsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-lime-500/20 text-lime-400 text-[10px] font-bold">
                  {draftsCount}
                </span>
              )}
            </button>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#f1f5f9] font-mono tracking-tight">
              Describe your tournament. Generate it. Review it. Confirm it.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
              Type your tournament setup in natural English. Generate brackets, round-robin fixtures, squad rosters, and tie-breakers instantly.
            </p>
          </div>

          <div className="space-y-3">
            <textarea
              value={masterPromptText}
              onChange={(e) => setMasterPromptText(e.target.value)}
              placeholder="e.g. Create an 8-team tournament with Arsenal, Chelsea, Liverpool, Spurs, Man City, Man United, Everton and Aston Villa at college ground tomorrow 5 pm"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#0b100d] border border-[#23352a] text-[#f1f5f9] text-sm focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 font-sans placeholder:text-slate-600 transition shadow-inner resize-none"
            />

            {/* Example chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500">Quick prompts:</span>
              {[
                'Arsenal, Chelsea, Liverpool and Spurs league tomorrow 4pm',
                '8-team knockout college cup at 5pm',
                'Red, Blue, Green, Yellow round-robin 7-a-side'
              ].map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setMasterPromptText(ex)}
                  className="px-2.5 py-1 rounded-lg bg-[#141d18] hover:bg-[#1a261f] border border-[#23352a] text-slate-300 hover:text-lime-300 text-[11px] font-mono transition cursor-pointer"
                >
                  "{ex}"
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleSavePromptDraft}
                disabled={!masterPromptText.trim()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#141d18] hover:bg-[#19241e] border border-[#23352a] text-slate-300 hover:text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5 text-slate-400" />
                <span>Save Prompt as Draft</span>
              </button>

              <button
                type="button"
                onClick={handleLaunchMasterPrompt}
                disabled={!masterPromptText.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-extrabold text-sm shadow-[0_0_20px_rgba(132,204,22,0.35)] transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 font-mono group"
              >
                <span>Generate Preview</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {draftNotice && (
              <p className="text-xs text-lime-400 font-mono text-center pt-1 animate-pulse">
                {draftNotice}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Operational Prompt Box */}
      <div className="p-5 rounded-2xl bg-[#0f1411] border border-[#1f2e26] shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-lime-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-lime-400 animate-pulse" />
            <span>Tactical Management Terminal (Natural Language)</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
            try: "Record score as 2-1" or "Move match 3 to Saturday 5 PM"
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            type="text"
            value={commandPrompt}
            onChange={(e) => setCommandPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeCommand()}
            placeholder="e.g. Move Match 1 to Saturday at 4 PM, or Set score 2-1 for Kerala Blasters vs Bengaluru FC"
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#0b100d] border border-[#23352a] text-[#f1f5f9] text-sm focus:outline-none focus:border-lime-500 font-sans placeholder:text-slate-600 transition"
          />

          <button
            type="button"
            disabled={!commandPrompt.trim() || isAnalyzingCommand}
            onClick={handleAnalyzeCommand}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-extrabold text-sm shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 font-mono"
          >
            {isAnalyzingCommand ? (
              <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
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
          <div className="mt-3 p-3 rounded-xl bg-lime-950/40 border border-lime-800/60 text-lime-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-lime-400 shrink-0" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl bg-[#0f1411] border border-[#1f2e26] shadow-2xl space-y-4 text-[#f1f5f9]"
            >
              <div className="flex items-center gap-2 text-lime-400 font-mono font-bold text-base">
                <Sparkles className="w-5 h-5 text-lime-400" />
                <span>Confirm Proposed Command</span>
              </div>

              <div className="p-4 rounded-xl bg-[#0b100d] border border-[#23352a] text-sm space-y-2">
                <div className="text-[#f1f5f9] font-medium">{commandProposal.description}</div>
                <div className="text-xs text-lime-400 font-mono">
                  Action: {commandProposal.actionType}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCommandProposal(null)}
                  className="px-4 py-2 rounded-xl border border-[#23352a] text-slate-400 text-xs font-mono hover:bg-[#151f19] hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleApplyCommand}
                  className="px-5 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-black text-xs font-mono font-extrabold transition cursor-pointer shadow-md"
                >
                  Apply Change
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Consolidated Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#1f2e26] overflow-x-auto pb-1 text-xs font-mono font-bold uppercase tracking-wider">
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
                ? 'bg-[#18231c] text-lime-400 border border-[#2f483a] shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b16]'
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
              <div className="p-4 rounded-xl bg-[#141214] border border-rose-800/60 space-y-2 shadow-lg">
                <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Live Action ({liveMatches.length})</span>
                </div>
                {liveMatches.map((m) => {
                  const home = teams.find(t => t.id === m.home_team_id)?.name || m.home_team_id;
                  const away = teams.find(t => t.id === m.away_team_id)?.name || m.away_team_id;
                  return (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-[#0b100d] border border-[#23352a] shadow-xs">
                      <span className="font-bold text-[#f1f5f9] text-sm">{home}</span>
                      <span className="font-mono text-base font-black text-rose-400 px-3 py-1 bg-rose-950/60 border border-rose-800/40 rounded">
                        {m.home_score ?? 0} - {m.away_score ?? 0}
                      </span>
                      <span className="font-bold text-[#f1f5f9] text-sm">{away}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenScoreModal(m)}
                        className="ml-3 px-2.5 py-1 rounded bg-[#18231c] hover:bg-lime-500 hover:text-black text-xs font-mono font-bold text-lime-400 transition cursor-pointer border border-[#273a2f]"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Next Match Card */}
            <div className="p-5 rounded-xl bg-[#0f1411] border border-[#1f2e26] shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-lime-400" /> Next Scheduled Fixture
                </span>
                {nextMatch && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Match #{nextMatch.match_number} • Round {nextMatch.round_number}
                  </span>
                )}
              </div>

              {nextMatch ? (
                (() => {
                  const home = teams.find(t => t.id === nextMatch.home_team_id)?.name || nextMatch.home_team_id;
                  const away = teams.find(t => t.id === nextMatch.away_team_id)?.name || nextMatch.away_team_id;
                  return (
                    <div className="p-4 rounded-xl bg-[#0b100d] border border-[#23352a] flex items-center justify-between">
                      <div className="font-bold text-[#f1f5f9] text-base truncate">{home}</div>
                      <div className="text-xs px-3 py-1 rounded-full bg-[#141d18] border border-[#25392d] text-lime-400 font-mono font-bold shadow-xs">
                        VS
                      </div>
                      <div className="font-bold text-[#f1f5f9] text-base truncate">{away}</div>
                      <button
                        type="button"
                        onClick={() => handleOpenScoreModal(nextMatch)}
                        className="ml-4 px-3.5 py-1.5 rounded-lg bg-lime-500 hover:bg-lime-400 text-black text-xs font-mono font-extrabold transition cursor-pointer shrink-0 shadow-md"
                      >
                        Enter Score
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="text-xs text-slate-500 py-3 text-center font-mono">
                  All matches completed or no matches scheduled.
                </div>
              )}
            </div>

            {/* Recent Results */}
            <div className="p-5 rounded-xl bg-[#0f1411] border border-[#1f2e26] shadow-lg space-y-3">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Recent Match Results
              </span>

              {recentResults.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center font-mono">
                  No completed matches yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentResults.map((m) => {
                    const home = teams.find(t => t.id === m.home_team_id)?.name || m.home_team_id;
                    const away = teams.find(t => t.id === m.away_team_id)?.name || m.away_team_id;
                    return (
                      <div key={m.id} className="p-3 rounded-lg bg-[#0b100d] border border-[#23352a] flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#f1f5f9] truncate max-w-[120px]">{home}</span>
                        <span className="font-mono font-bold text-lime-400 px-2.5 py-0.5 bg-[#18231c] border border-[#25392d] rounded">
                          {m.home_score} - {m.away_score}
                        </span>
                        <span className="font-semibold text-[#f1f5f9] truncate max-w-[120px]">{away}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Column 3: Standings Quick Look */}
          <div className="p-5 rounded-xl bg-[#0f1411] border border-[#1f2e26] shadow-lg space-y-3">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Standings Snapshot
            </span>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1f2e26] text-slate-400 text-[10px] font-mono uppercase">
                    <th className="pb-1.5 font-semibold">#</th>
                    <th className="pb-1.5 font-semibold">Club</th>
                    <th className="pb-1.5 font-semibold text-center">P</th>
                    <th className="pb-1.5 font-semibold text-center">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18231c]">
                  {standings.slice(0, 6).map((st, idx) => (
                    <tr key={st.team.id} className="hover:bg-[#131b16]">
                      <td className="py-2 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2 font-semibold text-[#f1f5f9] truncate max-w-[100px]">{st.team.name}</td>
                      <td className="py-2 text-center text-slate-400 font-mono">{st.played}</td>
                      <td className="py-2 text-center font-mono font-bold text-lime-400">{st.points}</td>
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
        <div className="p-6 rounded-2xl bg-[#0f1411] border border-[#1f2e26] shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-mono font-bold text-[#f1f5f9]">Fixtures & Match Schedules</h2>
            <span className="text-xs font-mono text-slate-400">Click any fixture to record score</span>
          </div>

          <div className="space-y-2">
            {matches.map((m) => {
              const home = teams.find(t => t.id === m.home_team_id)?.name || m.home_team_id;
              const away = teams.find(t => t.id === m.away_team_id)?.name || m.away_team_id;

              return (
                <div
                  key={m.id}
                  onClick={() => handleOpenScoreModal(m)}
                  className="p-3.5 rounded-xl bg-[#0b100d] border border-[#23352a] hover:border-lime-500 hover:bg-[#121b16] transition flex items-center justify-between cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-lime-400 bg-[#141d18] border border-[#273a2f] px-2 py-0.5 rounded">
                      R{m.round_number} M{m.match_number}
                    </span>
                    <span className="font-bold text-[#f1f5f9] text-sm truncate max-w-[140px] sm:max-w-[180px]">{home}</span>
                    <span className="text-xs text-slate-500 font-mono">vs</span>
                    <span className="font-bold text-[#f1f5f9] text-sm truncate max-w-[140px] sm:max-w-[180px]">{away}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {m.status === 'COMPLETED' ? (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const mMotm = motms.find(motm => motm.match_id === m.id);
                          const p = mMotm ? players.find(pl => pl.id === mMotm.player_id) : null;
                          if (!p) return null;
                          return (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-800/50 text-amber-300 text-[11px] font-mono font-bold">
                              ⭐ {p.name}
                            </span>
                          );
                        })()}
                        <span className="font-mono font-bold text-sm text-lime-400 bg-[#18231c] px-2.5 py-0.5 rounded border border-[#273a2f]">
                          {m.home_score} - {m.away_score}
                        </span>
                      </div>
                    ) : m.status === 'LIVE' ? (
                      <span className="font-mono font-bold text-sm text-rose-400 bg-rose-950/60 px-2.5 py-0.5 rounded border border-rose-800/60 animate-pulse">
                        {m.home_score ?? 0} - {m.away_score ?? 0} (LIVE)
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 group-hover:text-lime-400 flex items-center gap-1 font-mono font-bold">
                        <Edit className="w-3.5 h-3.5 text-lime-400" />
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

      {/* TAB: STANDINGS */}
      {activeTab === 'standings' && (
        <div className="p-6 rounded-2xl bg-[#0f1411] border border-[#1f2e26] shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f2e26] pb-3">
            <div>
              <h2 className="text-lg font-mono font-bold text-[#f1f5f9]">Tournament Standings</h2>
              <span className="text-xs text-slate-400">Official ranking computed from match results</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Win = 3 • Draw = 1 • Loss = 0
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-mono font-bold text-slate-400 border-b border-[#1f2e26]">
                  <th className="py-2.5 w-8">#</th>
                  <th className="py-2.5">Club</th>
                  <th className="py-2.5 text-center w-8">P</th>
                  <th className="py-2.5 text-center w-8">W</th>
                  <th className="py-2.5 text-center w-8">D</th>
                  <th className="py-2.5 text-center w-8">L</th>
                  <th className="py-2.5 text-center w-8">GF</th>
                  <th className="py-2.5 text-center w-8">GA</th>
                  <th className="py-2.5 text-center w-9">GD</th>
                  <th className="py-2.5 text-center w-10 font-black text-lime-400 font-mono">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18231c]">
                {standings.map((s, idx) => (
                  <tr key={s.team.id} className="hover:bg-[#131b16] transition-colors">
                    <td className="py-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {s.team.logo_url ? (
                          <img src={s.team.logo_url} alt={s.team.name} className="w-5 h-5 rounded-full object-contain" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#18231c] text-lime-400 border border-[#273a2f] text-[10px] font-mono font-bold flex items-center justify-center">
                            {s.team.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-[#f1f5f9] truncate">{s.team.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center text-slate-400 font-mono">{s.played}</td>
                    <td className="py-3 text-center text-slate-400 font-mono">{s.won}</td>
                    <td className="py-3 text-center text-slate-400 font-mono">{s.drawn}</td>
                    <td className="py-3 text-center text-slate-400 font-mono">{s.lost}</td>
                    <td className="py-3 text-center text-slate-400 font-mono">{s.goals_for}</td>
                    <td className="py-3 text-center text-slate-400 font-mono">{s.goals_against}</td>
                    <td className="py-3 text-center text-slate-400 font-mono">
                      {s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}
                    </td>
                    <td className="py-3 text-center font-mono font-black text-lime-400 text-sm">{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TEAMS & SQUADS */}
      {activeTab === 'teams' && (
        <div className="p-6 rounded-2xl bg-[#0f1411] border border-[#1f2e26] shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-mono font-bold text-[#f1f5f9]">Teams & Squad Rosters</h2>
              <span className="text-xs font-mono text-slate-400">{teams.length} Clubs registered</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMediaModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-black text-xs font-mono font-extrabold flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Bulk Upload Media</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((t) => {
              const teamPlayers = players.filter(p => p.team_id === t.id);

              return (
                <div key={t.id} className="p-4 rounded-xl bg-[#0b100d] border border-[#23352a] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#1f2e26] pb-2">
                    <div className="flex items-center gap-2.5">
                      {t.logo_url ? (
                        <img
                          src={t.logo_url}
                          alt={t.name}
                          className="w-7 h-7 rounded-full object-contain border border-[#273a2f] bg-[#121a15] p-0.5"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#18231c] border border-[#273a2f] flex items-center justify-center text-lime-400">
                          <Shield className="w-4 h-4 text-lime-400" />
                        </div>
                      )}
                      <span className="font-bold text-[#f1f5f9] text-sm">{t.name}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{teamPlayers.length} Players</span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono">
                    Manager: <span className="text-[#f1f5f9] font-semibold">{t.manager_name || 'None assigned'}</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    {teamPlayers.length === 0 ? (
                      <div className="text-xs text-slate-500 italic font-mono">No players added to squad yet.</div>
                    ) : (
                      teamPlayers.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-[#18231c]">
                          <div className="flex items-center gap-2">
                            {p.photo_url ? (
                              <img
                                src={p.photo_url}
                                alt={p.name}
                                className="w-5 h-5 rounded-full object-cover border border-[#273a2f] shrink-0"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-[#18231c] shrink-0 flex items-center justify-center text-[9px] font-mono font-bold text-lime-400 border border-[#273a2f]">
                                {p.name.charAt(0)}
                              </div>
                            )}
                            <span className="font-medium text-slate-200">{p.name} {p.is_captain && '★'}</span>
                          </div>
                          <span className="font-mono text-[10px] text-lime-300 bg-lime-950/60 border border-lime-800/40 px-1.5 py-0.2 rounded font-bold">
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
          <div className="p-5 rounded-2xl bg-[#0f1411] border border-[#1f2e26] shadow-xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-mono font-bold text-[#f1f5f9]">Tournament Stats & Awards</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Top goalscorers and Player of the Match honours calculated dynamically.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-300 bg-[#0b100d] px-3 py-1.5 rounded-xl border border-[#23352a]">
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
        <div className="p-6 rounded-2xl bg-[#0f1411] border border-[#1f2e26] shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-mono font-bold text-[#f1f5f9] flex items-center gap-2">
              <Users className="w-5 h-5 text-lime-400" />
              <span>Matchday Passes & Collaborators</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Issue access codes for match scorekeepers, spectators, and staff.
            </p>
          </div>

          {inviteFeedback && (
            <div className="p-3.5 rounded-xl bg-lime-950/40 border border-lime-800/60 text-lime-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-lime-400 shrink-0" />
              <span>{inviteFeedback}</span>
            </div>
          )}

          {/* Invitation Input Form */}
          <form onSubmit={handleCreateInvite} className="p-4 rounded-xl bg-[#0b100d] border border-[#23352a] space-y-3">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#131b16] border border-[#25392d] text-[#f1f5f9] text-xs focus:outline-none focus:border-lime-500 placeholder-slate-600 font-sans"
                />
              </div>

              <div>
                <select
                  value={newInviteRole}
                  onChange={(e) => setNewInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#131b16] border border-[#25392d] text-[#f1f5f9] text-xs focus:outline-none focus:border-lime-500 font-mono"
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
                className="px-4 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-extrabold font-mono text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Issue Pass</span>
              </button>
            </div>
          </form>

          {/* Pending Invitations Table */}
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Issued Passes ({invites.length})
            </span>

            {invites.length === 0 ? (
              <div className="text-xs text-slate-500 font-mono italic py-4 text-center">
                No collaborator passes issued yet.
              </div>
            ) : (
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3.5 rounded-xl bg-[#0b100d] border border-[#23352a] flex items-center justify-between text-xs shadow-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#f1f5f9] flex items-center gap-2">
                        <span>{inv.email}</span>
                        <span className="px-2 py-0.5 rounded bg-[#18231c] border border-[#273a2f] text-lime-400 font-mono text-[10px]">
                          {inv.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
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
                        className="px-2.5 py-1 rounded bg-[#18231c] border border-[#273a2f] hover:bg-[#203126] text-lime-400 font-mono text-xs transition cursor-pointer"
                      >
                        {copiedInviteId === inv.id ? 'Copied' : 'Copy Code'}
                      </button>

                      {inv.status !== 'REVOKED' && (
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="px-2 py-1 text-slate-500 hover:text-rose-400 transition cursor-pointer text-xs font-mono"
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
          <div className="p-6 rounded-2xl bg-[#0f1411] border border-[#1f2e26] shadow-xl space-y-6">
            
            {/* Settings Header with Save button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1f2e26]">
              <div>
                <h2 className="text-lg font-mono font-bold text-[#f1f5f9] flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-lime-400" />
                  <span>Tournament Settings & Configuration</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage visibility, scoring rules, feature switches, and credentials for <span className="font-semibold text-lime-400">{tournament.name}</span>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-4 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-extrabold font-mono text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50 shrink-0"
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
                    ? 'bg-lime-950/40 border-lime-800/60 text-lime-300'
                    : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                }`}
              >
                {settingsFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
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
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 mb-1">
                    Tournament Name
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsName}
                    onChange={e => setSettingsName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b100d] border border-[#23352a] text-[#f1f5f9] text-xs focus:outline-none focus:border-lime-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 mb-1">
                      Season / Year
                    </label>
                    <input
                      type="text"
                      value={settingsSeason}
                      onChange={e => setSettingsSeason(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b100d] border border-[#23352a] text-[#f1f5f9] text-xs focus:outline-none focus:border-lime-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 mb-1">
                      Status
                    </label>
                    <select
                      value={settingsStatus}
                      onChange={e => setSettingsStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0b100d] border border-[#23352a] text-[#f1f5f9] text-xs focus:outline-none focus:border-lime-500 font-mono cursor-pointer"
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
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Visibility Toggle
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSettingsVisibility('PUBLIC')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                        settingsVisibility === 'PUBLIC'
                          ? 'bg-lime-950/60 border-lime-500 text-lime-300 font-bold'
                          : 'bg-[#0b100d] border-[#23352a] text-slate-400 hover:bg-[#131b16]'
                      }`}
                    >
                      <Globe className="w-4 h-4 text-lime-400 shrink-0" />
                      <div>
                        <div className="text-xs font-mono font-semibold">Public</div>
                        <div className="text-[10px] text-slate-400">Accessible to all visitors</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettingsVisibility('PRIVATE')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                        settingsVisibility === 'PRIVATE'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold'
                          : 'bg-[#0b100d] border-[#23352a] text-slate-400 hover:bg-[#131b16]'
                      }`}
                    >
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-xs font-mono font-semibold">Private</div>
                        <div className="text-[10px] text-slate-400">Requires VIEW pass</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={settingsDescription}
                    onChange={e => setSettingsDescription(e.target.value)}
                    placeholder="Tournament overview, rules, and notes"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0b100d] border border-[#23352a] text-[#f1f5f9] text-xs focus:outline-none focus:border-lime-500 resize-none font-sans"
                  />
                </div>
              </div>

              {/* Right Column: Rules & Optional Feature Switches */}
              <div className="space-y-4">
                
                {/* Scoring Rules & Duration */}
                <div className="p-4 rounded-xl bg-[#0b100d] border border-[#23352a] space-y-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 block">
                    Points & Duration
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Win Pts</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={settingsWinPts}
                        onChange={e => setSettingsWinPts(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2 py-1 bg-[#131b16] border border-[#25392d] text-lime-400 text-xs font-mono font-bold text-center rounded-lg focus:outline-none focus:border-lime-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Draw Pts</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={settingsDrawPts}
                        onChange={e => setSettingsDrawPts(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2 py-1 bg-[#131b16] border border-[#25392d] text-lime-400 text-xs font-mono font-bold text-center rounded-lg focus:outline-none focus:border-lime-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Loss Pts</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={settingsLossPts}
                        onChange={e => setSettingsLossPts(parseInt(e.target.value, 10) || 0)}
                        className="w-full px-2 py-1 bg-[#131b16] border border-[#25392d] text-lime-400 text-xs font-mono font-bold text-center rounded-lg focus:outline-none focus:border-lime-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
                      Match Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="120"
                      value={settingsDuration}
                      onChange={e => setSettingsDuration(parseInt(e.target.value, 10) || 50)}
                      className="w-full px-3 py-1.5 bg-[#131b16] border border-[#25392d] text-lime-400 text-xs font-mono font-bold rounded-lg focus:outline-none focus:border-lime-500"
                    />
                  </div>
                </div>

                {/* Optional Feature Toggles */}
                <div className="p-4 rounded-xl bg-[#0b100d] border border-[#23352a] space-y-2.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 block">
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
                            ? 'bg-lime-950/60 border-lime-700/60 text-lime-300'
                            : 'bg-[#131b16] border-[#25392d] text-slate-400 hover:border-[#354f3f]'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold font-mono">{feat.label}</div>
                          <div className="text-[10px] text-slate-400">{feat.desc}</div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition ${
                            active ? 'bg-lime-500 text-black' : 'border border-[#25392d] bg-[#0b100d]'
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
            <div className="p-4 rounded-xl bg-[#0b100d] border border-[#23352a] space-y-3">
              <div className="flex items-center gap-2 font-mono font-bold text-lime-400 text-xs">
                <Key className="w-4 h-4 text-lime-400" />
                <span>Tournament Access Credentials</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Share these codes with spectators or staff. No account creation is required for participants to view.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3 rounded-lg bg-[#131b16] border border-[#25392d]">
                  <div className="text-[10px] uppercase font-mono font-bold text-slate-400">Public Viewer Code</div>
                  <div className="font-mono text-sm font-black text-lime-400 mt-0.5">
                    {tournament.rules_config?.viewer_access_code || tournament.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">Read-only live scores and standings</div>
                </div>

                <div className="p-3 rounded-lg bg-[#131b16] border border-[#25392d]">
                  <div className="text-[10px] uppercase font-mono font-bold text-amber-400">Staff Modifier Code</div>
                  <div className="font-mono text-sm font-black text-amber-300 mt-0.5">
                    {tournament.rules_config?.modifier_access_code || 'MOD-' + tournament.id.slice(0, 6).toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">Update scores without full admin rights</div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-3">
              <div className="flex items-center gap-2 font-mono font-bold text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Danger Zone • Tournament Deletion</span>
              </div>
              <p className="text-rose-400 text-[11px] leading-relaxed">
                Each organizer account may own one active tournament at a time. Deleting this tournament frees your account to create a new one. Your user account remains intact.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3.5 py-2 rounded-xl bg-[#141d18] border border-[#273a2f] text-slate-300 hover:text-white font-mono text-xs transition cursor-pointer"
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
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Tournament</span>
                </button>
              </div>
            </div>

          </div>

          {/* IN-APP TOURNAMENT DELETION CONFIRMATION MODAL */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-[#0f1411] rounded-2xl border border-rose-800/60 shadow-2xl p-6 space-y-4 text-[#f1f5f9]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800/60 text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-mono font-bold text-[#f1f5f9]">Delete Tournament?</h3>
                    <p className="text-xs text-slate-400 font-mono">Permanent and irreversible action</p>
                  </div>
                </div>

                {deleteError && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    Are you sure you want to delete <span className="font-bold text-lime-400 font-mono">"{tournament.name}"</span>?
                  </p>
                  <p>
                    This will permanently purge all fixtures, squads, results, and access codes. Your organizer account slot will be released so you can create a new tournament.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f2e26]">
                  <button
                    type="button"
                    disabled={isDeletingTournament}
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteError(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-[#23352a] hover:bg-[#141d18] text-xs font-mono text-slate-300 transition cursor-pointer"
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

    </div>
  );
}
