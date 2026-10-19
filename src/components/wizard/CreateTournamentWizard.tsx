import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  AlertTriangle, 
  Trophy, 
  Users, 
  Shield, 
  Calendar, 
  Clock, 
  MapPin, 
  Settings, 
  Copy, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Edit3,
  Globe,
  RotateCcw
} from 'lucide-react';
import { 
  parseTournamentPrompt, 
  parseSquadPrompt, 
  matchKnownTeam,
  ParsedTournamentDraft, 
  ParsedSquadDraft,
  ParsedTeamSquad,
  ParsedPlayerItem
} from '../../utils/promptParsers';
import { 
  generateSingleRoundRobin, 
  generateDoubleRoundRobin, 
  generateSingleEliminationKnockout,
  generateLeagueWithPlayoffs,
  EngineMatch 
} from '../../engine/tournamentEngine';
import { tournamentService } from '../../services/tournamentService';
import { localDataService, FTM_STORAGE_KEYS } from '../../services/localDataService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Tournament, StageType } from '../../types/multiTenant';
import { Team, Match } from '../../types/tournament';

interface CreateTournamentWizardProps {
  initialData?: {
    name?: string;
    description?: string;
    visibility?: 'PUBLIC' | 'PRIVATE';
  };
  onComplete: (tournament: Tournament) => void;
  onCancel: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

const BENCHMARK_TOURNAMENT_PROMPT = 
  "I'm organising a five-a-side football tournament called Kerala Champions Cup on November 15 at Kannur Municipal Stadium. Six teams are participating: Kerala Blasters, Bengaluru FC, Chennaiyin FC, Mumbai City FC, FC Goa and Hyderabad FC. It should follow a single round-robin format, with three points for a win, one for a draw and none for a loss. Each team can have five starting players and two substitutes. Please enable goalscorer tracking and player of the match, and make the tournament public.";

const BENCHMARK_SQUAD_PROMPT = 
  "For Kerala Blasters, add goalkeeper Daniel, defender Arjun, midfielder Rahul and forward Cristiano. Make Arjun the captain. The team manager is Michael.\n\n" +
  "For Bengaluru FC, add goalkeeper Leo, defender Marcus, midfielder David and forward Samuel. Make Marcus the captain. The team manager is Sarah.";

const CASUAL_EXAMPLE_PROMPTS = [
  { label: 'Teams A, B, C, D', text: 'Teams are A, B, C and D. Make a tournament.' },
  { label: 'Premier League Clubs', text: 'make a tournament with Arsenal, Chelsea, Liverpool and Spurs' },
  { label: 'Tomorrow at 5 PM', text: 'Crystal Palace Fulham Dortmund Spurs at college ground tomorrow 5 pm' },
  { label: 'Colored Teams', text: 'I have 4 teams: Red, Blue, Green and Yellow. Arrange a football tournament' },
  { label: 'Round-Robin (All vs All)', text: 'we have 6 teams and want everyone to play each other once' },
  { label: 'League + Semifinals', text: 'make a tournament for 8 teams, top 4 go to semifinals' },
  { label: 'Match Pairs (A vs B)', text: 'A vs B, C vs D, make tournament' },
];

export function CreateTournamentWizard({
  initialData,
  onComplete,
  onCancel
}: CreateTournamentWizardProps) {
  // Current Step: 1 (Prompt), 2 (Tournament Preview), 3 (Squads), 4 (Optional Features), 5 (Publish)
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Tournament visibility state
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>(initialData?.visibility || 'PUBLIC');

  // Step 1: Tournament Prompt & Interpreted Draft
  const [tournamentPromptText, setTournamentPromptText] = useState(
    initialData?.name
      ? `Create the ${initialData.name} tournament. Matches are 50 minutes long.`
      : ''
  );
  const [isParsingTournament, setIsParsingTournament] = useState(false);
  const [tournamentDraft, setTournamentDraft] = useState<ParsedTournamentDraft | null>(null);
  const [manualEditDraft, setManualEditDraft] = useState(false);
  const [newTeamNameInput, setNewTeamNameInput] = useState('');
  const [step1NewTeam, setStep1NewTeam] = useState('');

  // Step 2: Generated Fixtures preview
  const [generatedMatches, setGeneratedMatches] = useState<EngineMatch[]>([]);

  // Step 3: Squad Prompt & Interpreted Rosters
  const [squadPromptText, setSquadPromptText] = useState('');
  const [isParsingSquad, setIsParsingSquad] = useState(false);
  const [squadRosters, setSquadRosters] = useState<Record<string, ParsedTeamSquad>>({});
  const [newPlayerInputs, setNewPlayerInputs] = useState<Record<string, { name: string; position: 'GK' | 'DEF' | 'MID' | 'FWD'; isCaptain: boolean }>>({});
  const [squadParsePreview, setSquadParsePreview] = useState<ParsedSquadDraft | null>(null);
  const [squadParseWarnings, setSquadParseWarnings] = useState<string[]>([]);
  const [showResetRosterConfirm, setShowResetRosterConfirm] = useState(false);
  const [parseSuccessMessage, setParseSuccessMessage] = useState<string | null>(null);

  // Step 4: Optional Features Toggles
  const [enabledFeatures, setEnabledFeatures] = useState({
    referees: true,
    potmVoting: true,
    goalscorersAndEvents: true,
    cardsAndSubs: true,
    customTieBreakers: false,
    knockoutPlayoffs: false,
    photosAndLogos: false,
  });

  // Step 5: Final Submission & Link Sharing
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedTournament, setPublishedTournament] = useState<Tournament | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewerAccessCode, setViewerAccessCode] = useState<string>('');
  const [modifierAccessCode, setModifierAccessCode] = useState<string>('');
  const [copiedViewerCode, setCopiedViewerCode] = useState(false);
  const [copiedModifierCode, setCopiedModifierCode] = useState(false);
  const [hasSavedDraftPrompt, setHasSavedDraftPrompt] = useState<boolean>(false);

  // Live parsed interpretation summary for progressive input
  const liveParsedDraft = useMemo(() => {
    if (!tournamentPromptText.trim() || tournamentPromptText.trim().length < 3) return null;
    try {
      return parseTournamentPrompt(tournamentPromptText);
    } catch {
      return null;
    }
  }, [tournamentPromptText]);

  // Auto-parse initial prompt or check saved draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FTM_STORAGE_KEYS.PROMPT_DRAFT);
      if (saved && saved.trim() && !tournamentPromptText) {
        setHasSavedDraftPrompt(true);
      }
    } catch {}

    if (tournamentPromptText.trim() && !tournamentDraft) {
      const parsed = parseTournamentPrompt(tournamentPromptText);
      setTournamentDraft(parsed);
      setVisibility(parsed.visibility);
      if (parsed.embeddedSquads && Object.keys(parsed.embeddedSquads.squads).length > 0) {
        setSquadRosters(parsed.embeddedSquads.squads);
      }
    }
  }, []);

  // Update Fixtures whenever tournamentDraft teams or format changes
  useEffect(() => {
    if (!tournamentDraft || tournamentDraft.teams.length < 2) {
      setGeneratedMatches([]);
      return;
    }

    const engineTeams = tournamentDraft.teams.map((name: string, idx: number) => ({
      id: `team-${idx + 1}`,
      name: name,
      short_name: name.substring(0, 3).toUpperCase(),
    }));

    try {
      let fixtures: EngineMatch[] = [];
      if (tournamentDraft.format === 'LEAGUE_WITH_PLAYOFFS') {
        const res = generateLeagueWithPlayoffs(engineTeams, {
          roundRobinType: 'SINGLE',
          qualifiersCount: tournamentDraft.playoffQualifiers || (engineTeams.length >= 4 ? 4 : 2),
          includeThirdPlace: tournamentDraft.includeThirdPlace,
        });
        fixtures = res.allMatches;
      } else if (tournamentDraft.format === 'DOUBLE_ROUND_ROBIN') {
        fixtures = generateDoubleRoundRobin(engineTeams);
      } else if (tournamentDraft.format === 'SINGLE_ELIMINATION') {
        fixtures = generateSingleEliminationKnockout(engineTeams);
      } else {
        fixtures = generateSingleRoundRobin(engineTeams);
      }
      setGeneratedMatches(fixtures);
    } catch (err) {
      console.warn('Fixture generation warning:', err);
    }
  }, [tournamentDraft]);

  // Handle Parse Tournament Prompt or proceed with draft
  const handleParseTournament = (customDraft?: ParsedTournamentDraft) => {
    const draft = customDraft || tournamentDraft || liveParsedDraft || parseTournamentPrompt(tournamentPromptText);
    if (!draft) return;
    setIsParsingTournament(true);
    setTimeout(() => {
      setTournamentDraft(draft);
      setVisibility(draft.visibility);
      if (draft.embeddedSquads && Object.keys(draft.embeddedSquads.squads).length > 0) {
        setSquadRosters(draft.embeddedSquads.squads);
      }
      try {
        localStorage.setItem(FTM_STORAGE_KEYS.PROMPT_DRAFT, tournamentPromptText);
      } catch {}
      setIsParsingTournament(false);
      setCurrentStep(2); // Move to Tournament Preview
    }, 150);
  };

  const handleStep1RemoveTeam = (teamName: string) => {
    const current = tournamentDraft || liveParsedDraft;
    if (!current) return;
    const nextTeams = current.teams.filter(t => t !== teamName);
    setTournamentDraft({
      ...current,
      teams: nextTeams,
      teamCount: nextTeams.length,
    });
  };

  const handleStep1AddTeam = () => {
    if (!step1NewTeam.trim()) return;
    const current = tournamentDraft || liveParsedDraft;
    if (!current) return;
    const trimmed = step1NewTeam.trim();
    if (current.teams.includes(trimmed)) return;
    const nextTeams = [...current.teams, trimmed];
    setTournamentDraft({
      ...current,
      teams: nextTeams,
      teamCount: nextTeams.length,
      ambiguities: current.ambiguities.filter(a => !a.includes('identified')),
    });
    setStep1NewTeam('');
  };

  // Add team manually in preview
  const handleAddTeamInPreview = () => {
    if (!tournamentDraft || !newTeamNameInput.trim()) return;
    const trimmed = newTeamNameInput.trim();
    if (tournamentDraft.teams.includes(trimmed)) return;

    const updatedTeams = [...tournamentDraft.teams, trimmed];
    setTournamentDraft({
      ...tournamentDraft,
      teams: updatedTeams,
      teamCount: updatedTeams.length,
      ambiguities: tournamentDraft.ambiguities.filter(a => !a.includes('identified')),
    });
    setNewTeamNameInput('');
  };

  // Remove team in preview
  const handleRemoveTeamInPreview = (teamIdx: number) => {
    if (!tournamentDraft) return;
    const updatedTeams = [...tournamentDraft.teams];
    updatedTeams.splice(teamIdx, 1);
    setTournamentDraft({
      ...tournamentDraft,
      teams: updatedTeams,
      teamCount: updatedTeams.length,
    });
  };

  // Handle Parse Squad Prompt — Preview First, Never Overwrite Fixtures or Settings
  const handleParseSquad = () => {
    if (!squadPromptText.trim()) return;
    setIsParsingSquad(true);
    setTimeout(() => {
      let currentDraft = tournamentDraft;
      if (!currentDraft) {
        currentDraft = parseTournamentPrompt(squadPromptText);
        setTournamentDraft(currentDraft);
        setVisibility(currentDraft.visibility);
      }

      const parsed = parseSquadPrompt(squadPromptText, currentDraft.teams);
      setSquadParsePreview(parsed);
      setSquadParseWarnings(parsed.warnings);
      setIsParsingSquad(false);
    }, 200);
  };

  // Safe Recovery & Apply Handler: Organizer chooses Merge or Replace Clean
  const handleApplyParsedSquad = (mode: 'REPLACE' | 'MERGE') => {
    if (!squadParsePreview) return;

    // Check if any parsed teams need to be added to tournamentDraft without touching fixtures or settings
    const parsedTeamsWithData = Object.entries(squadParsePreview.squads).filter(
      ([, sq]) => sq.players.length > 0 || sq.managerName
    );
    const parsedTeamNames = parsedTeamsWithData.map(([tName]) => tName);

    if (tournamentDraft) {
      const newTeamsToAdd = parsedTeamNames.filter(
        pt => !tournamentDraft.teams.some(et => matchKnownTeam(pt, [et]) || et.toLowerCase() === pt.toLowerCase())
      );
      if (newTeamsToAdd.length > 0) {
        setTournamentDraft({
          ...tournamentDraft,
          teams: [...tournamentDraft.teams, ...newTeamsToAdd],
          teamCount: tournamentDraft.teams.length + newTeamsToAdd.length,
        });
      }
    }

    setSquadRosters(prev => {
      const next = { ...prev };
      Object.entries(squadParsePreview.squads).forEach(([tName, sq]) => {
        const matchedKey = Object.keys(next).find(k => matchKnownTeam(tName, [k]) || k.toLowerCase() === tName.toLowerCase()) || tName;
        const current = next[matchedKey] || { teamName: matchedKey, managerName: '', players: [] };

        if (mode === 'REPLACE') {
          // Safe Draft Correction: Replace affected team's roster with verified clean players
          next[matchedKey] = {
            teamName: matchedKey,
            managerName: sq.managerName || current.managerName || '',
            players: [...sq.players],
          };
        } else {
          // Idempotent Merge: Update existing players in place, append only genuinely new ones
          const existingNames = new Set(current.players.map(p => p.name.toLowerCase().trim()));
          const mergedPlayers = [...current.players];

          sq.players.forEach(p => {
            const pNorm = p.name.toLowerCase().trim();
            if (!existingNames.has(pNorm)) {
              mergedPlayers.push(p);
              existingNames.add(pNorm);
            } else {
              const idx = mergedPlayers.findIndex(mp => mp.name.toLowerCase().trim() === pNorm);
              if (idx >= 0) {
                mergedPlayers[idx] = { ...mergedPlayers[idx], ...p };
              }
            }
          });

          next[matchedKey] = {
            ...current,
            teamName: matchedKey,
            managerName: sq.managerName || current.managerName,
            players: mergedPlayers,
          };
        }
      });
      return next;
    });

    const affectedTeamCount = Object.keys(squadParsePreview.squads).length;
    setParseSuccessMessage(
      mode === 'REPLACE'
        ? `Draft corrected: Applied clean rosters (${squadParsePreview.totalPlayersParsed} players) across ${affectedTeamCount} teams.`
        : `Rosters updated: Merged ${squadParsePreview.totalPlayersParsed} players into ${affectedTeamCount} teams.`
    );
    setSquadParsePreview(null);
  };

  // Safe Draft Reset Handler for Rosters
  const handleResetAllRosters = () => {
    setSquadRosters({});
    setShowResetRosterConfirm(false);
    setParseSuccessMessage('Team rosters have been reset. Existing tournament settings and fixtures were preserved.');
  };

  // Submit Quick Add Player to Roster with real details
  const handleSubmitAddPlayer = (teamName: string) => {
    const input = newPlayerInputs[teamName];
    if (!input || !input.name.trim()) return;

    const existing = squadRosters[teamName] || {
      teamName,
      managerName: '',
      players: [],
    };

    const newPlayer: ParsedPlayerItem = {
      name: input.name.trim(),
      position: input.position || 'MID',
      isCaptain: !!input.isCaptain,
    };

    setSquadRosters({
      ...squadRosters,
      [teamName]: {
        ...existing,
        players: [...existing.players, newPlayer],
      },
    });

    setNewPlayerInputs(prev => ({
      ...prev,
      [teamName]: {
        name: '',
        position: 'MID',
        isCaptain: false,
      },
    }));
  };


  // Update existing player details inline
  const handleUpdatePlayer = (teamName: string, playerIndex: number, updates: Partial<ParsedPlayerItem>) => {
    const existing = squadRosters[teamName];
    if (!existing || !existing.players[playerIndex]) return;

    const updated = [...existing.players];
    updated[playerIndex] = {
      ...updated[playerIndex],
      ...updates,
    };

    setSquadRosters({
      ...squadRosters,
      [teamName]: {
        ...existing,
        players: updated,
      },
    });
  };

  // Toggle captain status (strictly enforce 1 captain per team for database uniqueness constraint)
  const handleToggleCaptain = (teamName: string, playerIndex: number) => {
    const existing = squadRosters[teamName];
    if (!existing || !existing.players[playerIndex]) return;

    const currentCap = existing.players[playerIndex].isCaptain;
    const nextCap = !currentCap;

    const updatedPlayers = existing.players.map((p, idx) => ({
      ...p,
      isCaptain: idx === playerIndex ? nextCap : (nextCap ? false : p.isCaptain),
    }));

    setSquadRosters({
      ...squadRosters,
      [teamName]: {
        ...existing,
        players: updatedPlayers,
      },
    });
  };

  // Manual Remove Player
  const handleRemovePlayer = (teamName: string, playerIndex: number) => {
    const existing = squadRosters[teamName];
    if (!existing) return;
    const updated = [...existing.players];
    updated.splice(playerIndex, 1);
    setSquadRosters({
      ...squadRosters,
      [teamName]: {
        ...existing,
        players: updated,
      },
    });
  };

  // Ref guard to prevent duplicate submission while save is in progress
  const isPublishingRef = React.useRef(false);
  const [draftTournamentId, setDraftTournamentId] = useState<string | null>(null);

  // Save Tournament & Entities
  const handlePublishTournament = async (asDraft: boolean = false) => {
    if (!tournamentDraft || isPublishing || isPublishingRef.current) return;

    isPublishingRef.current = true;
    setIsPublishing(true);
    setPublishError(null);

    try {
      const activeDraftId = publishedTournament?.id || draftTournamentId;

      // If already published/saved as draft, update existing tournament instead of duplicating
      if (activeDraftId) {
        const nextStatus = asDraft ? 'DRAFT' : 'IN_PROGRESS';
        await tournamentService.updateTournament(activeDraftId, {
          status: nextStatus,
          visibility: visibility,
          name: tournamentDraft.name || 'TournX Championship',
          description: tournamentDraft.description || '',
        });
        localDataService.updateTournament(activeDraftId, {
          status: nextStatus,
          visibility: visibility,
          name: tournamentDraft.name || 'TournX Championship',
          description: tournamentDraft.description || '',
        });
        const refreshed = await tournamentService.getTournament(activeDraftId) || {
          ...(publishedTournament || (localDataService.getTournamentById(activeDraftId)!)),
          status: nextStatus,
          visibility: visibility,
        };
        setPublishedTournament(refreshed);
        setIsPublishing(false);
        isPublishingRef.current = false;
        return;
      }

      // 1. Create Tournament with full rules configuration
      let newTournament: Tournament;
      try {
        newTournament = await tournamentService.createTournament({
          name: tournamentDraft.name || 'TournX Championship',
          description: tournamentDraft.description || '',
          visibility: visibility,
          status: asDraft ? 'DRAFT' : 'IN_PROGRESS',
          rules_config: {
            points_for_win: tournamentDraft.pointsForWin,
            points_for_draw: tournamentDraft.pointsForDraw,
            points_for_loss: tournamentDraft.pointsForLoss,
            tie_breaker_order: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'],
            match_duration_minutes: tournamentDraft.matchDurationMinutes,
            half_time_duration_minutes: 5,
            sport: tournamentDraft.sport,
            match_type: tournamentDraft.matchType,
            starting_players_per_team: tournamentDraft.startingPlayersPerTeam,
            substitutes_per_team: tournamentDraft.substitutesPerTeam,
            squad_size: tournamentDraft.squadSize,
            features: enabledFeatures,
            extra_time_enabled: enabledFeatures.knockoutPlayoffs,
            allow_draws: !enabledFeatures.knockoutPlayoffs,
            playoff_qualifiers: tournamentDraft.playoffQualifiers,
            include_third_place_playoff: tournamentDraft.includeThirdPlace,
          },
        });
      } catch (cloudErr: any) {
        // In production builds or when Supabase is configured, surface the real error immediately.
        // Never silently synthesize local mock data in production!
        if (isSupabaseConfigured || !import.meta.env.DEV) {
          setPublishError(cloudErr.message || 'Failed to save tournament. Real organizer authentication and active database persistence are required.');
          setIsPublishing(false);
          isPublishingRef.current = false;
          return;
        }

        // Pure offline local synthetic fallback when Supabase is not configured
        newTournament = localDataService.createTournament({
          name: tournamentDraft.name || 'TournX Championship',
          description: tournamentDraft.description || '',
          season: tournamentDraft.startDateIso ? tournamentDraft.startDateIso.substring(0, 4) : '2026',
          rules_config: {
            points_for_win: tournamentDraft.pointsForWin,
            points_for_draw: tournamentDraft.pointsForDraw,
            points_for_loss: tournamentDraft.pointsForLoss,
            tie_breaker_order: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'],
            match_duration_minutes: tournamentDraft.matchDurationMinutes,
            half_time_duration_minutes: 5,
            sport: tournamentDraft.sport,
            match_type: tournamentDraft.matchType,
            starting_players_per_team: tournamentDraft.startingPlayersPerTeam,
            substitutes_per_team: tournamentDraft.substitutesPerTeam,
            squad_size: tournamentDraft.squadSize,
            features: enabledFeatures,
            extra_time_enabled: enabledFeatures.knockoutPlayoffs,
            allow_draws: !enabledFeatures.knockoutPlayoffs,
            playoff_qualifiers: tournamentDraft.playoffQualifiers,
            include_third_place_playoff: tournamentDraft.includeThirdPlace,
          },
        });
        localDataService.updateTournament(newTournament.id, {
          visibility: visibility,
          status: asDraft ? 'DRAFT' : 'IN_PROGRESS',
        });
        newTournament = localDataService.getTournamentById(newTournament.id) || newTournament;
      }

      setDraftTournamentId(newTournament.id);

      // Always register in localDataService and set active tournament
      localDataService.registerTournament(newTournament);
      localDataService.setActiveTournamentId(newTournament.id);

      // 2. Persist Teams
      const createdTeamsMap: Record<string, Team> = {};
      for (const teamName of tournamentDraft.teams) {
        const roster = squadRosters[teamName];
        const teamObj = await tournamentService.addTeam(
          {
            name: teamName,
            short_name: teamName.substring(0, 3).toUpperCase(),
            manager_name: roster?.managerName || '',
            primary_color: '#059669',
            secondary_color: '#0f172a',
          },
          newTournament.id
        );
        createdTeamsMap[teamName] = teamObj;

        // 3. Persist Players
        if (roster?.players) {
          for (const p of roster.players) {
            await tournamentService.addPlayer(
              {
                team_id: teamObj.id,
                name: p.name,
                position: p.position || 'MID',
                is_captain: p.isCaptain || false,
              },
              newTournament.id
            );
          }
        }
      }

      // 4. Persist Generated Fixtures (Passing valid ISO scheduled_date and parent tournament_id)
      if (generatedMatches.length > 0) {
        const teamIndexToId: Record<string, string> = {};
        tournamentDraft.teams.forEach((name: string, idx: number) => {
          const created = createdTeamsMap[name];
          if (created) {
            teamIndexToId[`team-${idx + 1}`] = created.id;
          }
        });

        const matchesToSave: Omit<Match, 'id'>[] = generatedMatches.map((gm) => ({
          match_number: gm.match_number,
          round_number: gm.round_number,
          home_team_id: gm.home_team_id ? teamIndexToId[gm.home_team_id] || '' : '',
          away_team_id: gm.away_team_id ? teamIndexToId[gm.away_team_id] || '' : '',
          scheduled_date: tournamentDraft.startDateIso || null,
          scheduled_time: tournamentDraft.startTime || null,
          venue: tournamentDraft.venue || null,
          home_score: null,
          away_score: null,
          status: 'UPCOMING',
        }));

        await tournamentService.createMatches(matchesToSave, newTournament.id);
      }

      // Generate human-readable access codes for sharing
      const vCode = localDataService.generateAccessCode(newTournament.id, 'VIEW', 'Participant Viewer Code');
      const mCode = localDataService.generateAccessCode(newTournament.id, 'SCORE', 'Collaborator Modifier Code');
      setViewerAccessCode(vCode.rawCode);
      setModifierAccessCode(mCode.rawCode);

      // Switch active tournament
      localDataService.setActiveTournamentId(newTournament.id);
      localDataService.setLastJoinedTournament(newTournament.id, newTournament.slug || undefined);
      setPublishedTournament(newTournament);

      // Clear draft
      try {
        localStorage.removeItem(FTM_STORAGE_KEYS.PROMPT_DRAFT);
      } catch {}
    } catch (err: any) {
      console.error('Publish error:', err);
      setPublishError(err.message || 'Failed to save tournament draft. Please try again.');
    } finally {
      setIsPublishing(false);
      isPublishingRef.current = false;
    }
  };

  const shareableUrl = useMemo(() => {
    if (!publishedTournament) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/t/${publishedTournament.slug}`;
  }, [publishedTournament]);

  const handleCopyShareLink = () => {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-6">
      
      {/* Wizard Progress Stepper - Connected Horizontal Stepper */}
      <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="relative flex items-center justify-between max-w-3xl mx-auto px-2">
          {/* Background Connecting Track Line */}
          <div className="absolute top-4 sm:top-5 left-8 right-8 h-0.5 bg-slate-200 -z-0" />
          {/* Active Emerald Progress Track Line */}
          <div 
            className="absolute top-4 sm:top-5 left-8 h-0.5 bg-emerald-600 transition-all duration-300 -z-0"
            style={{ width: `${Math.min(100, Math.max(0, ((currentStep - 1) / 4) * 85))}%` }}
          />

          {[
            { step: 1, label: 'Prompt' },
            { step: 2, label: 'Preview' },
            { step: 3, label: 'Squads' },
            { step: 4, label: 'Features' },
            { step: 5, label: 'Publish' },
          ].map(({ step, label }) => {
            const isActive = currentStep === step;
            const isDone = currentStep > step;
            return (
              <div key={step} className="relative z-10 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (isDone || (tournamentDraft && step <= 4)) {
                      setCurrentStep(step as WizardStep);
                    }
                  }}
                  disabled={!isDone && currentStep < step && !tournamentDraft}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm scale-105'
                      : isDone
                      ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                      : 'bg-white text-slate-400 border-2 border-slate-200 hover:border-slate-300'
                  }`}
                  aria-label={`Step ${step}: ${label}`}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : step}
                </button>
                <span className={`text-[11px] sm:text-xs mt-1.5 font-semibold tracking-tight transition-colors ${
                  isActive ? 'text-emerald-800 font-bold' : isDone ? 'text-slate-700 font-medium' : 'text-slate-400'
                }`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Step Box */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* STEP 1: CONVERSATIONAL PROMPT INPUT */}
        {currentStep === 1 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <span>Describe your tournament</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Type your tournament setup in natural English. TournX extracts teams, formats, squad sizes, and venues deterministically.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTournamentPromptText(BENCHMARK_TOURNAMENT_PROMPT)}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shrink-0"
              >
                <span>Load Kerala Cup sample</span>
              </button>
            </div>

            {hasSavedDraftPrompt && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Unsaved tournament prompt found from your previous session.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const saved = localStorage.getItem(FTM_STORAGE_KEYS.PROMPT_DRAFT);
                      if (saved) {
                        setTournamentPromptText(saved);
                        setHasSavedDraftPrompt(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] cursor-pointer shadow-2xs"
                  >
                    Restore Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      try { localStorage.removeItem(FTM_STORAGE_KEYS.PROMPT_DRAFT); } catch {}
                      setHasSavedDraftPrompt(false);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Quick Example Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Try an informal prompt:</span>
              <div className="flex flex-wrap gap-1.5">
                {CASUAL_EXAMPLE_PROMPTS.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTournamentPromptText(ex.text);
                      const parsed = parseTournamentPrompt(ex.text);
                      setTournamentDraft(parsed);
                      setVisibility(parsed.visibility);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-slate-700 font-medium transition cursor-pointer"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="tournament-prompt" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tournament Prompt
              </label>
              <textarea
                id="tournament-prompt"
                rows={4}
                value={tournamentPromptText}
                onChange={(e) => setTournamentPromptText(e.target.value)}
                placeholder="e.g. Teams are A, B, C and D. Make a tournament. Or: Crystal Palace Fulham Dortmund Spurs at college ground tomorrow 5 pm"
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 transition resize-none font-sans leading-relaxed"
              />
            </div>

            {/* Live Interpretation Summary Card */}
            {(tournamentDraft || liveParsedDraft) && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      TournX Interpretation Summary
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Deterministic Local Parser
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Tournament Name:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {(tournamentDraft || liveParsedDraft)?.name || 'TournX Championship'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Format:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {((tournamentDraft || liveParsedDraft)?.format === 'SINGLE_ROUND_ROBIN' && 'Single Round-Robin (All-play-all once)') ||
                       ((tournamentDraft || liveParsedDraft)?.format === 'DOUBLE_ROUND_ROBIN' && 'Double Round-Robin (Home & Away)') ||
                       ((tournamentDraft || liveParsedDraft)?.format === 'SINGLE_ELIMINATION' && 'Knockout (Single Elimination)') ||
                       ((tournamentDraft || liveParsedDraft)?.format === 'DOUBLE_ELIMINATION' && 'Double Elimination Knockout') ||
                       ((tournamentDraft || liveParsedDraft)?.format === 'LEAGUE_WITH_PLAYOFFS' && `League + Playoffs (Top ${(tournamentDraft || liveParsedDraft)?.playoffQualifiers || 4} qualify)`) ||
                       (tournamentDraft || liveParsedDraft)?.format}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Schedule:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {(tournamentDraft || liveParsedDraft)?.startDateIso || (tournamentDraft || liveParsedDraft)?.startTime
                        ? `${(tournamentDraft || liveParsedDraft)?.startDateIso || ''} ${(tournamentDraft || liveParsedDraft)?.startTime || ''}`.trim()
                        : 'Not specified (editable)'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Venue:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {(tournamentDraft || liveParsedDraft)?.venue || 'Not specified (editable)'}
                    </p>
                  </div>
                </div>

                {/* Extracted Teams with Quick Badges and Inline Add */}
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700">
                      Detected Teams ({(tournamentDraft || liveParsedDraft)?.teams.length || 0}):
                    </span>
                    <span className="text-[11px] text-slate-500">Click &times; to remove</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center">
                    {(tournamentDraft || liveParsedDraft)?.teams.map((tName, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold text-xs"
                      >
                        <span>{tName}</span>
                        <button
                          type="button"
                          onClick={() => handleStep1RemoveTeam(tName)}
                          className="w-4 h-4 rounded-full hover:bg-emerald-200 flex items-center justify-center text-emerald-700 hover:text-emerald-900 cursor-pointer"
                          title={`Remove ${tName}`}
                        >
                          &times;
                        </button>
                      </span>
                    ))}

                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={step1NewTeam}
                        onChange={(e) => setStep1NewTeam(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleStep1AddTeam();
                          }
                        }}
                        placeholder="Add team name..."
                        className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 w-32"
                      />
                      <button
                        type="button"
                        onClick={handleStep1AddTeam}
                        className="px-2 py-1 text-xs rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clarification Alert if Ambiguities or Missing Teams */}
                {(((tournamentDraft || liveParsedDraft)?.ambiguities.length || 0) > 0 || ((tournamentDraft || liveParsedDraft)?.teams.length || 0) < 2) && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Clarification Needed:</p>
                      <p className="mt-0.5">
                        {((tournamentDraft || liveParsedDraft)?.teams.length || 0) < 2
                          ? 'Please provide at least 2 teams to schedule tournament matches.'
                          : (tournamentDraft || liveParsedDraft)?.ambiguities[0]}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-sm font-semibold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!tournamentPromptText.trim() || isParsingTournament || (((tournamentDraft || liveParsedDraft)?.teams.length || 0) < 2)}
                onClick={() => handleParseTournament()}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isParsingTournament ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Review Fixtures & Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TOURNAMENT PREVIEW & REFINEMENT */}
        {currentStep === 2 && tournamentDraft && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Step 2 — Tournament Preview
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Review extracted rules and teams. Correct any fields manually or continue to squad details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setManualEditDraft(!manualEditDraft)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{manualEditDraft ? 'Done editing' : 'Edit details'}</span>
              </button>
            </div>

            {/* Ambiguities or Missing Info Alerts */}
            {(tournamentDraft.missingFields.length > 0 || tournamentDraft.ambiguities.length > 0) && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Items requiring review:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-amber-800">
                  {tournamentDraft.missingFields.map((item: string, idx: number) => (
                    <li key={`m-${idx}`}>Missing: <span className="font-semibold">{item}</span></li>
                  ))}
                  {tournamentDraft.ambiguities.map((item: string, idx: number) => (
                    <li key={`a-${idx}`}>{item}</li>
                  ))}
                </ul>
                <div className="text-[11px] text-amber-700 font-medium">
                  You can edit these fields directly below before proceeding.
                </div>
              </div>
            )}

            {/* Structured Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card 1: Identity & Format */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tournament Name</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setVisibility(visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC')}
                      className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-300 cursor-pointer shadow-2xs"
                    >
                      {visibility}
                    </button>
                  </div>
                </div>
                
                {manualEditDraft ? (
                  <input
                    type="text"
                    value={tournamentDraft.name}
                    onChange={(e) => setTournamentDraft({ ...tournamentDraft, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                ) : (
                  <div className="text-base font-extrabold text-slate-900">
                    {tournamentDraft.name || 'Untitled Tournament'}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Competition Format:</span>
                    {manualEditDraft ? (
                      <select
                        value={tournamentDraft.format}
                        onChange={(e) => setTournamentDraft({ ...tournamentDraft, format: e.target.value as StageType })}
                        className="text-xs font-bold px-2 py-1 rounded bg-white border border-slate-300 text-slate-800"
                      >
                        <option value="SINGLE_ROUND_ROBIN">Single Round-Robin</option>
                        <option value="DOUBLE_ROUND_ROBIN">Double Round-Robin</option>
                        <option value="LEAGUE_WITH_PLAYOFFS">League followed by Playoffs</option>
                        <option value="SINGLE_ELIMINATION">Knockout / Elimination</option>
                        <option value="GROUP_STAGE">Group Stage</option>
                      </select>
                    ) : (
                      <span className="font-bold text-emerald-700">
                        {tournamentDraft.format.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {tournamentDraft.format === 'LEAGUE_WITH_PLAYOFFS' && (
                    <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200 space-y-2 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950">Playoff Qualifiers:</span>
                        {manualEditDraft ? (
                          <select
                            value={tournamentDraft.playoffQualifiers || 4}
                            onChange={(e) => setTournamentDraft({ ...tournamentDraft, playoffQualifiers: parseInt(e.target.value, 10) as 2 | 4 })}
                            className="text-xs font-semibold px-2 py-0.5 rounded bg-white border border-emerald-300 text-emerald-900"
                          >
                            <option value={2}>Top 2 Advance to Final</option>
                            <option value={4}>Top 4 to Semifinals & Final</option>
                          </select>
                        ) : (
                          <span className="font-semibold text-emerald-800">
                            {tournamentDraft.playoffQualifiers === 2 ? 'Top 2 Advance to Final' : 'Top 4 to Semifinals & Final'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-emerald-900">
                        <span>Include 3rd Place Playoff:</span>
                        {manualEditDraft ? (
                          <input
                            type="checkbox"
                            checked={tournamentDraft.includeThirdPlace || false}
                            onChange={(e) => setTournamentDraft({ ...tournamentDraft, includeThirdPlace: e.target.checked })}
                            className="accent-emerald-600 rounded"
                          />
                        ) : (
                          <span>{tournamentDraft.includeThirdPlace ? 'Yes' : 'No'}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Match Type / Code:</span>
                  <span className="font-bold text-slate-900">{tournamentDraft.matchType}</span>
                </div>
              </div>

              {/* Card 2: Schedule & Venue */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule, Squads & Venue</span>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Match Duration:
                    </span>
                    {manualEditDraft ? (
                      <input
                        type="number"
                        value={tournamentDraft.matchDurationMinutes}
                        onChange={(e) => setTournamentDraft({ ...tournamentDraft, matchDurationMinutes: parseInt(e.target.value, 10) || 50 })}
                        className="w-16 px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-900 text-right"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{tournamentDraft.matchDurationMinutes} mins</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Venue:
                    </span>
                    {manualEditDraft ? (
                      <input
                        type="text"
                        value={tournamentDraft.venue}
                        onChange={(e) => setTournamentDraft({ ...tournamentDraft, venue: e.target.value })}
                        placeholder="e.g. Kannur Municipal Stadium"
                        className="w-48 px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-900 text-right"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{tournamentDraft.venue || 'Not specified'}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start Date:
                    </span>
                    {manualEditDraft ? (
                      <input
                        type="text"
                        value={tournamentDraft.startDate}
                        onChange={(e) => setTournamentDraft({ ...tournamentDraft, startDate: e.target.value })}
                        placeholder="e.g. November 15"
                        className="w-32 px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-900 text-right"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">
                        {tournamentDraft.startDate || 'Not specified'}
                        {tournamentDraft.startDateIso ? ` (${tournamentDraft.startDateIso})` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Kick-off Time:
                    </span>
                    {manualEditDraft ? (
                      <input
                        type="text"
                        value={tournamentDraft.startTime || ''}
                        onChange={(e) => setTournamentDraft({ ...tournamentDraft, startTime: e.target.value })}
                        placeholder="e.g. 5:00 PM"
                        className="w-32 px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-900 text-right"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">
                        {tournamentDraft.startTime || 'Not specified'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-600">Squad Limits:</span>
                    <span className="font-semibold text-slate-900">
                      {tournamentDraft.startingPlayersPerTeam} starters + {tournamentDraft.substitutesPerTeam} subs
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Teams List Preview */}
              <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Participating Teams ({tournamentDraft.teams.length})
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tournamentDraft.teams.map((team: string, idx: number) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{team}</span>
                      {manualEditDraft && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTeamInPreview(idx)}
                          className="ml-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {manualEditDraft && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newTeamNameInput}
                      onChange={(e) => setNewTeamNameInput(e.target.value)}
                      placeholder="Add another team..."
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 w-52"
                    />
                    <button
                      type="button"
                      onClick={handleAddTeamInPreview}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Add Team
                    </button>
                  </div>
                )}
              </div>

              {/* Card 4: Generated Fixtures Preview */}
              <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Fixtures Preview ({generatedMatches.length} Matches Generated)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {generatedMatches.slice(0, 9).map((m) => {
                    const homeIdx = parseInt(m.home_team_id?.replace('team-', '') || '1') - 1;
                    const awayIdx = parseInt(m.away_team_id?.replace('team-', '') || '2') - 1;
                    const homeName = tournamentDraft.teams[homeIdx] || m.home_team_id;
                    const awayName = tournamentDraft.teams[awayIdx] || m.away_team_id;

                    return (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between shadow-2xs"
                      >
                        <span className="text-slate-400 text-[10px] font-mono mr-1">R{m.round_number}</span>
                        <span className="font-bold text-slate-900 truncate max-w-[80px]">{homeName}</span>
                        <span className="text-slate-400 font-mono text-[10px] px-1">vs</span>
                        <span className="font-bold text-slate-900 truncate max-w-[80px]">{awayName}</span>
                      </div>
                    );
                  })}
                </div>
                {generatedMatches.length > 9 && (
                  <div className="text-[11px] text-slate-500 text-center pt-1 font-medium">
                    + {generatedMatches.length - 9} more fixtures scheduled
                  </div>
                )}
              </div>

            </div>

            {/* Actions: Save Draft or Continue */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 text-sm font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Edit prompt</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handlePublishTournament(true)}
                  disabled={isPublishing}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition cursor-pointer shadow-2xs"
                >
                  Save as draft
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <span>Continue to players</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ADD TEAMS, PLAYERS & MANAGERS VIA PROMPT */}
        {currentStep === 3 && tournamentDraft && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-700" />
                  <span>Step 3 — Add Teams, Players & Managers</span>
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Describe your rosters in one prompt, or configure them team by team.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetRosterConfirm(true)}
                  className="shrink-0 text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-medium hover:underline"
                  title="Clear all rosters to start fresh"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset rosters</span>
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSquadPromptText(BENCHMARK_SQUAD_PROMPT)}
                  className="shrink-0 text-xs text-emerald-700 hover:text-emerald-800 underline underline-offset-4 cursor-pointer font-medium"
                >
                  Load sample squad
                </button>
              </div>
            </div>

            {/* Success Notification Banner */}
            {parseSuccessMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{parseSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setParseSuccessMessage(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold px-1.5 py-0.5 rounded cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}

            {/* Warnings Notification Banner */}
            {squadParseWarnings.length > 0 && !squadParsePreview && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Validation Notices</span>
                </div>
                <ul className="list-disc list-inside text-[11px] pl-1 space-y-0.5 text-amber-800">
                  {squadParseWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Main Squad Prompt Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Squad Prompt Box
              </label>
              <textarea
                rows={4}
                value={squadPromptText}
                onChange={(e) => setSquadPromptText(e.target.value)}
                placeholder="e.g. For Kerala Blasters, add goalkeeper Daniel, defender Arjun, midfielder Rahul and forward Cristiano. Make Arjun the captain. The team manager is Michael."
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400 transition resize-none font-sans leading-relaxed"
              />
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleParseSquad}
                  disabled={!squadPromptText.trim() || isParsingSquad}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Parse Squad Details</span>
                </button>
              </div>
            </div>

            {/* Squad Parse Preview Modal */}
            {squadParsePreview && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
                <div className="max-w-3xl w-full max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                  {/* Modal Header */}
                  <div className="p-5 bg-gradient-to-r from-emerald-50 to-slate-50 border-b border-slate-200">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Users className="w-5 h-5 text-emerald-600" />
                          <span>Review Proposed Squad Changes</span>
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          Verify parsed rosters, managers, and captain assignments before committing them to your tournament draft.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSquadParsePreview(null)}
                        className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>

                    {/* Metrics bar */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200/80 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 font-semibold text-slate-800 shadow-2xs">
                        🛡️ {Object.keys(squadParsePreview.squads).length} Teams
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold shadow-2xs">
                        ⚽ {squadParsePreview.totalPlayersParsed} Players ({Object.values(squadParsePreview.squads).reduce((acc, s) => acc + s.players.filter(p => p.position !== 'TBD').length, 0)} Starters, {Object.values(squadParsePreview.squads).reduce((acc, s) => acc + s.players.filter(p => p.position === 'TBD').length, 0)} Subs)
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 font-semibold text-slate-800 shadow-2xs">
                        👔 {Object.values(squadParsePreview.squads).filter(s => s.managerName).length} Managers
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 font-bold shadow-2xs">
                        ⭐ {Object.values(squadParsePreview.squads).reduce((acc, s) => acc + s.players.filter(p => p.isCaptain).length, 0)} Captains
                      </span>
                    </div>
                  </div>

                  {/* Warnings Banner */}
                  {squadParsePreview.warnings && squadParsePreview.warnings.length > 0 && (
                    <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-bold">Validation Notices:</div>
                        {squadParsePreview.warnings.map((w, idx) => (
                          <div key={idx}>• {w}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scrollable Team Cards */}
                  <div className="p-5 overflow-y-auto space-y-4 max-h-[50vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(squadParsePreview.squads).map(([tName, sq]) => (
                        <div key={tName} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                            <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                              <Shield className="w-4 h-4 text-emerald-600" />
                              {tName}
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                              {sq.players.length} players
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 flex items-center justify-between">
                            <span className="font-semibold text-slate-500">Manager:</span>
                            <span className="font-bold text-slate-900">{sq.managerName || 'None assigned'}</span>
                          </div>

                          <div className="space-y-1 pt-1">
                            {sq.players.map((p, pIdx) => (
                              <div key={pIdx} className="flex items-center justify-between text-xs py-0.5 px-1.5 rounded bg-white border border-slate-100">
                                <span className="font-medium text-slate-900 flex items-center gap-1">
                                  {p.name}
                                  {p.isCaptain && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-extrabold" title="Captain">
                                      C
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {p.position === 'TBD' ? 'SUB' : p.position}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Modal Footer with Actions */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSquadParsePreview(null)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyParsedSquad('MERGE')}
                        className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs shadow-2xs transition cursor-pointer"
                        title="Update existing rosters without deleting unmatched players"
                      >
                        Merge with Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyParsedSquad('REPLACE')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                        title="Safe Recovery: Clears corrupted records for affected teams and applies clean parsed rosters"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Reset & Replace Affected Rosters</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reset Roster Confirmation Modal */}
            {showResetRosterConfirm && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
                  <div className="flex items-center gap-3 text-rose-600">
                    <AlertTriangle className="w-6 h-6 shrink-0" />
                    <h3 className="text-base font-bold text-slate-900">Reset All Rosters?</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This will clear all player and manager assignments across teams so you can re-parse a clean prompt.
                    Your tournament setup, participating teams, schedule, and fixtures will remain <strong>completely untouched</strong>.
                  </p>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowResetRosterConfirm(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAllRosters}
                      className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                    >
                      Reset Rosters
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Rosters Display per Team */}
            <div className="space-y-4 pt-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Roster Preview & Squads ({tournamentDraft?.teams?.length || 0} Teams)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(tournamentDraft?.teams || []).map((teamName: string) => {
                  const roster = squadRosters[teamName] || {
                    teamName,
                    managerName: '',
                    players: [],
                  };

                  return (
                    <div
                      key={teamName}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-700" />
                          <span className="font-bold text-sm text-slate-900">{teamName}</span>
                        </div>
                      </div>

                      {/* Manager Name */}
                      <div className="text-xs flex items-center justify-between text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                        <span className="font-semibold text-slate-700">Team Manager:</span>
                        <input
                          type="text"
                          value={roster.managerName || ''}
                          onChange={(e) => {
                            setSquadRosters({
                              ...squadRosters,
                              [teamName]: {
                                ...roster,
                                managerName: e.target.value,
                              },
                            });
                          }}
                          placeholder="Manager name"
                          className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-300 text-slate-900 text-xs w-44 text-right focus:bg-white focus:outline-none focus:border-emerald-600 font-medium"
                        />
                      </div>

                      {/* Explicit Manual Player Entry Form */}
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2 shadow-2xs">
                        <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Add Player Details</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">Enter name, position & captain</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Player name (e.g. Daniel)"
                            value={newPlayerInputs[teamName]?.name || ''}
                            onChange={(e) => setNewPlayerInputs(prev => ({
                              ...prev,
                              [teamName]: {
                                name: e.target.value,
                                position: prev[teamName]?.position || 'MID',
                                isCaptain: prev[teamName]?.isCaptain || false,
                              }
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSubmitAddPlayer(teamName);
                              }
                            }}
                            className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
                          />
                          <select
                            value={newPlayerInputs[teamName]?.position || 'MID'}
                            onChange={(e) => setNewPlayerInputs(prev => ({
                              ...prev,
                              [teamName]: {
                                name: prev[teamName]?.name || '',
                                position: e.target.value as 'GK' | 'DEF' | 'MID' | 'FWD',
                                isCaptain: prev[teamName]?.isCaptain || false,
                              }
                            }))}
                            className="px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-600 cursor-pointer"
                          >
                            <option value="GK">GK</option>
                            <option value="DEF">DEF</option>
                            <option value="MID">MID</option>
                            <option value="FWD">FWD</option>
                            <option value="TBD">SUB</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => setNewPlayerInputs(prev => ({
                              ...prev,
                              [teamName]: {
                                name: prev[teamName]?.name || '',
                                position: prev[teamName]?.position || 'MID',
                                isCaptain: !prev[teamName]?.isCaptain,
                              }
                            }))}
                            className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                              newPlayerInputs[teamName]?.isCaptain
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-50 text-slate-500 border-slate-300 hover:bg-slate-100'
                            }`}
                            title="Toggle Captain"
                          >
                            <span>C</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSubmitAddPlayer(teamName)}
                            disabled={!(newPlayerInputs[teamName]?.name?.trim())}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>

                      {/* Players List with Inline Editing */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-1">
                          <span>Roster Players ({roster.players.length})</span>
                          <span className="text-[10px] text-slate-400">Click name or position to edit</span>
                        </div>
                        {roster.players.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic py-3 text-center bg-white rounded-lg border border-dashed border-slate-200">
                            No players added yet. Use prompt above or fill in "Add Player Details".
                          </div>
                        ) : (
                          roster.players.map((p: ParsedPlayerItem, pIdx: number) => (
                            <div
                              key={pIdx}
                              className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs hover:border-slate-300 transition"
                            >
                              {/* Editable Player Name */}
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={p.name}
                                  onChange={(e) => handleUpdatePlayer(teamName, pIdx, { name: e.target.value })}
                                  placeholder="Player name"
                                  className="w-full font-bold text-slate-900 px-1.5 py-0.5 rounded bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-xs"
                                />
                              </div>

                              {/* Captain Badge Toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleCaptain(teamName, pIdx)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition ${
                                  p.isCaptain
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-700'
                                }`}
                                title={p.isCaptain ? 'Captain (click to remove)' : 'Make Captain'}
                              >
                                C
                              </button>

                              {/* Position Selector */}
                              <select
                                value={p.position || 'MID'}
                                onChange={(e) => handleUpdatePlayer(teamName, pIdx, { position: e.target.value as any })}
                                className="font-mono text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold cursor-pointer focus:outline-none"
                              >
                                <option value="GK">GK</option>
                                <option value="DEF">DEF</option>
                                <option value="MID">MID</option>
                                <option value="FWD">FWD</option>
                                <option value="TBD">SUB</option>
                              </select>

                              {/* Remove Player */}
                              <button
                                type="button"
                                onClick={() => handleRemovePlayer(teamName, pIdx)}
                                className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                                title="Remove player"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Wizard Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 text-sm font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <span>Continue to Features</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: OPTIONAL TOURNAMENT FEATURES */}
        {currentStep === 4 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-700" />
                <span>Step 4 — Optional Features</span>
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Customize advanced controls. You can update these rules anytime during the tournament.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'referees',
                  title: 'Referees & Match Officials',
                  desc: 'Assign and track center referees and linesmen.',
                },
                {
                  id: 'potmVoting',
                  title: 'Player of the Match (POTM)',
                  desc: 'Enable voting and award candidate tracking per match.',
                },
                {
                  id: 'goalscorersAndEvents',
                  title: 'Goalscorer Tracking',
                  desc: 'Track individual goal scorers, assists, and golden boot rankings.',
                },
                {
                  id: 'cardsAndSubs',
                  title: 'Cards & Disciplinary Tracking',
                  desc: 'Log yellow/red cards and player suspension rules.',
                },
                {
                  id: 'customTieBreakers',
                  title: 'Custom Tie-Breakers',
                  desc: 'Prioritize head-to-head or goal difference.',
                },
                {
                  id: 'knockoutPlayoffs',
                  title: 'Knockout Playoffs',
                  desc: 'Advance top round-robin teams into semifinals / final.',
                },
              ].map((item) => {
                const isChecked = (enabledFeatures as any)[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setEnabledFeatures({
                        ...enabledFeatures,
                        [item.id]: !isChecked,
                      });
                    }}
                    className={`p-4 rounded-xl border transition cursor-pointer select-none flex items-start justify-between gap-3 shadow-2xs ${
                      isChecked
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">{item.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition ${
                        isChecked ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Wizard Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 text-sm font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Squads</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <span>Final Review & Publish</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: FINAL PREVIEW & PUBLISH */}
        {currentStep === 5 && (
          <div className="p-6 sm:p-8 space-y-6">
            {!publishedTournament ? (
              <>
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-emerald-700" />
                    <span>Final Review & Save</span>
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Your tournament configuration is ready. Save it as a draft or publish it immediately.
                  </p>
                </div>

                {publishError && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{publishError}</span>
                  </div>
                )}

                {/* Complete Final Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tournament Details</span>
                    <div className="text-base font-bold text-slate-900">{tournamentDraft?.name}</div>
                    <div className="text-xs text-slate-600">
                      Visibility: <span className="text-emerald-800 font-semibold">{visibility}</span> • Format: <span className="text-slate-900 font-semibold">{tournamentDraft?.format.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scale & Schedule</span>
                    <div className="text-base font-bold text-slate-900">{tournamentDraft?.teams.length} Teams</div>
                    <div className="text-xs text-slate-600">
                      {generatedMatches.length} Fixtures • {tournamentDraft?.matchDurationMinutes} mins match duration
                    </div>
                  </div>
                </div>

                {/* Final Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 text-sm font-semibold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Edit setup</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isPublishing}
                      onClick={() => handlePublishTournament(true)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition cursor-pointer shadow-2xs"
                    >
                      Save as draft
                    </button>

                    <button
                      type="button"
                      disabled={isPublishing}
                      onClick={() => handlePublishTournament(false)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {isPublishing ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Publish tournament</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* POST-PUBLICATION SHAREABLE SCREEN */
              <div className="text-center py-6 space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-700" />
                </div>

                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Tournament Saved & Published!
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                    Your tournament is ready. Share these access credentials or links with players, managers, and fans.
                  </p>
                </div>

                {/* Unique Access Credentials Cards */}
                <div className="max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {/* Participant Viewer Code */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Participant Access Code
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-base font-extrabold text-slate-900 tracking-wider">
                        {viewerAccessCode || 'TX-VIEW-DEV'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(viewerAccessCode || 'TX-VIEW-DEV');
                          setCopiedViewerCode(true);
                          setTimeout(() => setCopiedViewerCode(false), 2000);
                        }}
                        className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs"
                      >
                        {copiedViewerCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Participants enter this code to join without creating an account.
                    </p>
                  </div>

                  {/* Collaborator Modifier Code */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Modifier Access Code
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-base font-extrabold text-slate-900 tracking-wider">
                        {modifierAccessCode || 'TX-SCORE-DEV'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(modifierAccessCode || 'TX-SCORE-DEV');
                          setCopiedModifierCode(true);
                          setTimeout(() => setCopiedModifierCode(false), 2000);
                        }}
                        className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs"
                      >
                        {copiedModifierCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Co-organizers enter this code to enter live scores and match results.
                    </p>
                  </div>
                </div>

                {/* Share URL Box */}
                <div className="max-w-lg mx-auto p-3.5 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between gap-3 shadow-2xs">
                  <a 
                    href={shareableUrl}
                    className="text-xs text-emerald-800 hover:text-emerald-900 hover:underline truncate font-mono select-all font-semibold text-left flex items-center gap-1.5"
                    title="Click to visit public tournament page"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{shareableUrl}</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={shareableUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      localDataService.setActiveTournamentId(publishedTournament.id);
                      localDataService.registerTournament(publishedTournament);
                      window.history.pushState(null, '', `/t/${publishedTournament.slug}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                    className="px-5 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-sm shadow-2xs transition cursor-pointer inline-flex items-center gap-2"
                  >
                    <Trophy className="w-4 h-4 text-emerald-600" />
                    <span>View Public Hub</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => onComplete(publishedTournament)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Open Organizer Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
