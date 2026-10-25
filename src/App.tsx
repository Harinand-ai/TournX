import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tournamentService } from './services/tournamentService';
import { localDataService, FTM_STORAGE_KEYS, DEMO_TOURNAMENT_ID } from './services/localDataService';
import { Team, Match, Player, Goal, ManOfTheMatch, POTMPoll } from './types/tournament';
import { Tournament } from './types/multiTenant';
import { isSupabaseConfigured, supabase } from './lib/supabase';



import { 
  calculateStandings, 
  getTopScorers, 
  getCleanSheets, 
  getMotmLeaderboard 
} from './utils/leagueCalculations';
import { OpeningAnimation } from './components/OpeningAnimation';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { FixturesPage } from './pages/FixturesPage';
import { TeamsPage } from './pages/TeamsPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { StatsPage } from './pages/StatsPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { RulesPage } from './pages/RulesPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LandingPage } from './pages/LandingPage';
import { CreateTournamentWizard } from './components/wizard/CreateTournamentWizard';
import { OrganizerWorkspacePage } from './pages/OrganizerWorkspacePage';
import { PublicTournamentPage } from './pages/PublicTournamentPage';
import { AdminAuthGuard } from './components/AdminAuthGuard';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { LiveMatchModal } from './components/LiveMatchModal';
import { TournamentSwitcherModal } from './components/TournamentSwitcherModal';
import { CreateTournamentModal } from './components/CreateTournamentModal';
import { AccessCodeModal } from './components/AccessCodeModal';
import { InteractiveTutorialModal } from './components/InteractiveTutorialModal';
import { PageTransition3D } from './components/PageTransition3D';
import { ShareTournamentModal } from './components/ShareTournamentModal';
import { Analytics } from '@vercel/analytics/react';
import { Trophy, Plus, RefreshCw } from 'lucide-react';

export interface RouteState {
  tab: string;
  param?: string;
  tourneySlug?: string;
}

const parseCurrentRoute = (): RouteState => {
  if (typeof window === 'undefined') return { tab: 'landing' };

  // 1. Check URL hash (e.g. #/t/slug, #/workspace, #/organize)
  const hashRaw = window.location.hash.replace(/^#\/?/, '').trim();
  if (hashRaw && hashRaw !== 'quick-view') {
    if (hashRaw.startsWith('t/')) {
      const parts = hashRaw.split('/');
      return { tourneySlug: parts[1], tab: 'public-tournament', param: parts[2] };
    }
    if (hashRaw === 'organize' || hashRaw === 'setup' || hashRaw === 'wizard') {
      return { tab: 'organize' };
    }
    if (hashRaw === 'workspace' || hashRaw === 'admin') {
      return { tab: 'workspace' };
    }
    if (hashRaw === 'admin/login' || hashRaw === 'admin-login') {
      return { tab: 'admin-login' };
    }
    const [hTab, hParam] = hashRaw.split('/');
    if (['home', 'matches', 'fixtures', 'results', 'match-detail', 'teams', 'team-detail', 'stats', 'table', 'rules', 'landing', 'workspace', 'organize'].includes(hTab)) {
      return { tab: hTab, param: hParam };
    }
  }

  // 2. Check URL pathname (e.g. /t/slug, /workspace, /organize)
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').trim();
  if (pathname) {
    if (pathname.startsWith('t/')) {
      const parts = pathname.split('/');
      return { tourneySlug: parts[1], tab: 'public-tournament', param: parts[2] };
    }
    if (pathname === 'organize' || pathname === 'setup' || pathname === 'wizard') {
      return { tab: 'organize' };
    }
    if (pathname === 'workspace' || pathname === 'admin') {
      return { tab: 'workspace' };
    }
    if (pathname === 'admin/login' || pathname === 'admin-login') {
      return { tab: 'admin-login' };
    }
    const [pTab, pParam] = pathname.split('/');
    if (['home', 'matches', 'fixtures', 'results', 'match-detail', 'teams', 'team-detail', 'stats', 'table', 'rules', 'landing', 'workspace', 'organize'].includes(pTab)) {
      return { tab: pTab, param: pParam };
    }
  }

  // 3. Returning users: Automatically reopen last joined tournament if no explicit route requested
  const lastJoined = localDataService.getLastJoinedTournament();
  if (lastJoined && lastJoined.id) {
    const found = localDataService.getTournamentById(lastJoined.id) ||
                  (lastJoined.slug ? localDataService.getTournamentBySlug(lastJoined.slug) : null);
    if (!found || localDataService.isTournamentExpiredOrDeleted(found).isExpired || localDataService.isTournamentExpiredOrDeleted(found).isDeleted) {
      localDataService.clearLastJoinedTournament();
      return { tab: 'landing', param: 'expired' };
    }
    return { tab: 'public-tournament', tourneySlug: found.slug || undefined };
  }

  return { tab: 'landing' };
};

export function App() {
  const initialNav = useMemo(() => parseCurrentRoute(), []);

  // Navigation & Routing state
  const [currentTab, setCurrentTab] = useState<string>(initialNav.tab);
  const [activeParam, setActiveParam] = useState<string | undefined>(initialNav.param);

  // Active Tournament state
  const [activeTournament, setActiveTournament] = useState<Tournament>(() => {
    if (initialNav.tourneySlug) {
      const found = localDataService.getTournamentBySlug(initialNav.tourneySlug);
      if (found) {
        localDataService.setActiveTournamentId(found.id);
        localDataService.setLastJoinedTournament(found.id, found.slug || undefined);
        return found;
      }
    }
    const lastJoined = localDataService.getLastJoinedTournament();
    if (lastJoined && lastJoined.id) {
      const found = localDataService.getTournamentById(lastJoined.id) ||
                    (lastJoined.slug ? localDataService.getTournamentBySlug(lastJoined.slug) : null);
      if (found && !localDataService.isTournamentExpiredOrDeleted(found).isExpired && !localDataService.isTournamentExpiredOrDeleted(found).isDeleted) {
        localDataService.setActiveTournamentId(found.id);
        return found;
      }
    }
    return localDataService.getActiveTournament();
  });

  // Modals state
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isLiveWindowOpen, setIsLiveWindowOpen] = useState(false);
  const [isGlobalShareOpen, setIsGlobalShareOpen] = useState(false);

  // Authorization Role for active tournament ('VIEW' | 'SCORE' | 'ORGANIZER' | 'ANONYMOUS')
  const [sessionRole, setSessionRole] = useState<'VIEW' | 'SCORE' | 'ORGANIZER' | 'ANONYMOUS'>(() => {
    return localDataService.getSessionRole(activeTournament.id);
  });


  // Intro state: Show arcade opening animation on launch (unless suppressed with ?intro=false)
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('intro') === 'false') return false;
    return true;
  });

  // Wizard initial data passed from organizer sign up or workspace prompt
  const [wizardInitialData, setWizardInitialData] = useState<{
    name?: string;
    description?: string;
    visibility?: 'PUBLIC' | 'PRIVATE';
    prompt?: string;
  } | undefined>(undefined);

  // Admin auth & session state
  const [isAuthLoading] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    if (isSupabaseConfigured || !import.meta.env.DEV) return false;
    return localDataService.isDevAdminLoggedIn();
  });

  // Tournament not found state for shared links
  const [tournamentNotFound, setTournamentNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Core Tournament Data
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [motms, setMotms] = useState<ManOfTheMatch[]>([]);
  const [activePolls, setActivePolls] = useState<POTMPoll[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data function for active tournament
  const loadData = useCallback(async (explicitTourneyId?: string) => {
    try {
      const route = parseCurrentRoute();
      let tourney: Tournament | null = null;
      const requestedSlug = route.tourneySlug;
      
      if (explicitTourneyId) {
        tourney = await tournamentService.getTournament(explicitTourneyId);
      } else if (requestedSlug) {
        tourney = await tournamentService.getTournament(requestedSlug);
      }

      if (requestedSlug && !explicitTourneyId) {
        if (!tourney || localDataService.isTournamentExpiredOrDeleted(tourney).isExpired || localDataService.isTournamentExpiredOrDeleted(tourney).isDeleted) {
          setTournamentNotFound(true);
          setLoading(false);
          return;
        }
      }

      setTournamentNotFound(false);

      if (!tourney) {
        tourney = localDataService.getActiveTournament();
      }

      if (tourney) {
        localDataService.registerTournament(tourney);
        localDataService.setActiveTournamentId(tourney.id);
        setActiveTournament(tourney);
      }

      const activeId = tourney?.id || localDataService.getActiveTournamentId();

      const [tData, mData, pData, gData, motmData, pollsData] = await Promise.all([
        tournamentService.getTeams(activeId),
        tournamentService.getMatches(activeId),
        tournamentService.getPlayers(activeId),
        tournamentService.getGoals(activeId),
        tournamentService.getManOfTheMatches(activeId),
        tournamentService.getPolls(activeId),
      ]);

      setTeams(tData);
      setMatches(mData);
      setPlayers(pData);
      setGoals(gData);
      setMotms(motmData);
      setActivePolls(pollsData.filter(p => p.status === 'active'));
      if (tourney) {
        setSessionRole(localDataService.getSessionRole(tourney.id));
      }
    } catch (err) {
      console.error('Error fetching tournament data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Supabase Auth session restoration and listener
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setIsAdminLoggedIn(true);
          setCurrentUserId(session.user.id);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setIsAdminLoggedIn(true);
          setCurrentUserId(session.user.id);
        } else {
          setIsAdminLoggedIn((isSupabaseConfigured || !import.meta.env.DEV) ? false : localDataService.isDevAdminLoggedIn());
          setCurrentUserId(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);


  // Handle tournament change
  const handleTournamentChanged = useCallback(async (tourneyId: string) => {
    localDataService.setActiveTournamentId(tourneyId);
    const updated = await tournamentService.getTournament(tourneyId);
    if (updated) {
      localDataService.registerTournament(updated);
      setActiveTournament(updated);
    }
    await loadData(tourneyId);
  }, [loadData]);

  // Listen for browser popstate and hash changes
  useEffect(() => {
    const handleUrlChange = async () => {
      const route = parseCurrentRoute();
      if (route.tourneySlug) {
        const found = await tournamentService.getTournament(route.tourneySlug);
        if (found && !localDataService.isTournamentExpiredOrDeleted(found).isExpired && !localDataService.isTournamentExpiredOrDeleted(found).isDeleted) {
          setTournamentNotFound(false);
          localDataService.registerTournament(found);
          localDataService.setActiveTournamentId(found.id);
          setActiveTournament(found);
          await loadData(found.id);
        } else {
          setTournamentNotFound(true);
        }
      } else {
        setTournamentNotFound(false);
      }
      setCurrentTab(route.tab);
      setActiveParam(route.param);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [handleTournamentChanged, loadData]);

  const handleNavigate = useCallback((tab: string, param?: string) => {
    let normalizedTab = tab;
    if (tab === 'admin/login') {
      normalizedTab = 'admin-login';
    }

    setCurrentTab(normalizedTab);
    setActiveParam(param);
    
    try {
      localStorage.setItem(FTM_STORAGE_KEYS.ACTIVE_TAB, normalizedTab);
      if (param) {
        localStorage.setItem(FTM_STORAGE_KEYS.ACTIVE_PARAM, param);
      } else {
        localStorage.removeItem(FTM_STORAGE_KEYS.ACTIVE_PARAM);
      }
    } catch {}

    // Determine target URL path with tournament slug
    const tourneySlug = activeTournament?.slug || 'tournx-championship';
    let targetPath = `/t/${tourneySlug}`;
    if (normalizedTab === 'landing') {
      targetPath = '/';
    } else if (normalizedTab === 'organize' || normalizedTab === 'setup' || normalizedTab === 'wizard') {
      targetPath = '/organize';
    } else if (normalizedTab === 'workspace' || normalizedTab === 'admin') {
      targetPath = '/workspace';
    } else if (normalizedTab === 'admin-login') {
      targetPath = '/admin/login';
    } else if (normalizedTab === 'public-tournament') {
      targetPath = `/t/${tourneySlug}`;
    } else if (normalizedTab === 'matches' || normalizedTab === 'fixtures' || normalizedTab === 'results') {
      targetPath = `/t/${tourneySlug}/matches`;
    } else if (normalizedTab === 'teams') {
      targetPath = `/t/${tourneySlug}/teams`;
    } else if (normalizedTab === 'stats' || normalizedTab === 'table') {
      targetPath = `/t/${tourneySlug}/stats`;
    } else if (normalizedTab === 'rules') {
      targetPath = `/t/${tourneySlug}/rules`;
    } else if (normalizedTab === 'match-detail') {
      targetPath = param ? `/match-detail/${param}` : `/t/${tourneySlug}/matches`;
    } else if (normalizedTab === 'team-detail') {
      targetPath = param ? `/team-detail/${param}` : `/t/${tourneySlug}/teams`;
    } else {
      targetPath = `/`;
    }

    try {
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      } else if (window.location.hash) {
        window.history.replaceState(null, '', targetPath);
      }
    } catch {}

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTournament]);

  // Handle tournament deletion: update active tournament, clear last joined pointer, reload data, and navigate landing
  const handleTournamentDeleted = useCallback(async (nextTournamentId: string) => {
    localDataService.clearLastJoinedTournament();
    localDataService.setActiveTournamentId(nextTournamentId);
    const nextTourney = (await tournamentService.getTournament(nextTournamentId)) || localDataService.getActiveTournament();
    setActiveTournament(nextTourney);
    setSessionRole(localDataService.getSessionRole(nextTourney.id));
    await loadData(nextTournamentId);
    handleNavigate('landing');
  }, [loadData, handleNavigate]);

  // Handle participant leave: clear device last joined session, reset to fallback demo, and navigate landing
  const handleParticipantLeave = useCallback(async () => {
    localDataService.clearLastJoinedTournament();
    const demo = localDataService.getTournamentById(DEMO_TOURNAMENT_ID) || localDataService.getActiveTournament();
    localDataService.setActiveTournamentId(demo.id);
    setActiveTournament(demo);
    setSessionRole('ANONYMOUS');
    await loadData(demo.id);
    handleNavigate('landing');
  }, [loadData, handleNavigate]);

  const handleIntroComplete = () => {
    setShowIntro(false);
    try {
      sessionStorage.setItem('ftm_intro_seen_session', 'true');
    } catch {}
  };

  const handleReplayIntro = () => {
    try {
      localStorage.removeItem('ftm_intro_seen');
      sessionStorage.removeItem('ftm_dev_intro_played_session');
    } catch {}
    setShowIntro(false);
    setTimeout(() => {
      setShowIntro(true);
    }, 20);
  };

  // Redirect to admin dashboard if logged in user is on admin-login
  useEffect(() => {
    if ((currentTab === 'admin-login' || currentTab === 'admin/login') && isAdminLoggedIn) {
      handleNavigate('admin');
    }
  }, [currentTab, isAdminLoggedIn, handleNavigate]);

  const handleAdminLogin = () => {
    if (import.meta.env.DEV) {
      localDataService.setDevAdminLoggedIn(true);
    }
    setIsAdminLoggedIn(true);
    handleNavigate('admin');
  };

  const handleAdminLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    localDataService.setDevAdminLoggedIn(false);
    setIsAdminLoggedIn(false);
    handleNavigate('admin-login');
  };


  // Compute active poll match IDs set
  const activePollMatchIds = useMemo(() => {
    return new Set(activePolls.map(p => p.match_id));
  }, [activePolls]);

  // Calculations
  const standings = useMemo(() => calculateStandings(teams, matches), [teams, matches]);
  const topScorers = useMemo(() => getTopScorers(goals, players, teams), [goals, players, teams]);
  const cleanSheets = useMemo(() => getCleanSheets(matches, players, teams), [matches, players, teams]);
  const motmLeaderboard = useMemo(() => getMotmLeaderboard(motms, players, teams), [motms, players, teams]);

  // Selected player for profile modal
  const handleSelectPlayer = useCallback((playerId: string) => {
    setSelectedPlayerId(playerId);
  }, []);

  const handleClosePlayerModal = useCallback(() => {
    setSelectedPlayerId(null);
  }, []);

  const selectedPlayer = useMemo(
    () => (selectedPlayerId ? players.find(p => p.id === selectedPlayerId) || null : null),
    [players, selectedPlayerId]
  );

  const selectedPlayerTeam = useMemo(
    () => (selectedPlayer ? teams.find(t => t.id === selectedPlayer.team_id) : undefined),
    [teams, selectedPlayer]
  );

  // Render current page content
  const renderCurrentPage = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-green-600 animate-spin" />
          <p className="mt-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading TournX...
          </p>
        </div>
      );
    }

    switch (currentTab) {
      case 'landing':
        return (
          <LandingPage
            activeTournament={activeTournament}
            noticeMessage={
              activeParam === 'expired'
                ? 'Your previous tournament has ended or expired. Please join another tournament or create a new one below.'
                : undefined
            }
            onOpenTutorial={() => setIsTutorialOpen(true)}
            onOrganizeClick={(initialTourney) => {
              if (initialTourney) {
                setWizardInitialData(initialTourney);
                handleNavigate('organize');
              } else {
                handleNavigate('workspace');
              }
            }}
            onJoinTournament={async (slugOrId) => {
              let tourney = localDataService.getTournamentBySlug(slugOrId) || localDataService.getTournamentById(slugOrId);
              if (!tourney) {
                tourney = await tournamentService.getTournament(slugOrId);
              }
              if (tourney && !localDataService.isTournamentExpiredOrDeleted(tourney).isExpired && !localDataService.isTournamentExpiredOrDeleted(tourney).isDeleted) {
                localDataService.registerTournament(tourney);
                localDataService.setActiveTournamentId(tourney.id);
                localDataService.setLastJoinedTournament(tourney.id, tourney.slug || undefined);
                setActiveTournament(tourney);
                setSessionRole(localDataService.getSessionRole(tourney.id));
                await loadData(tourney.id);
                handleNavigate('public-tournament');
              } else {
                setTournamentNotFound(true);
                handleNavigate('landing', 'expired');
              }
            }}
            onOpenPublicDemo={() => {
              handleNavigate('public-tournament');
            }}
          />
        );

      case 'organize':
      case 'setup':
      case 'wizard':
        return (
          <AdminAuthGuard
            isLoading={isAuthLoading}
            isAuthenticated={isAdminLoggedIn}
            onRedirectToLogin={() => handleNavigate('admin/login')}
          >
            <CreateTournamentWizard
              initialData={wizardInitialData}
              onComplete={(newTourney) => {
                localDataService.registerTournament(newTourney);
                localDataService.setActiveTournamentId(newTourney.id);
                setActiveTournament(newTourney);
                handleTournamentChanged(newTourney.id);
                handleNavigate('workspace');
              }}
              onCancel={() => handleNavigate('landing')}
            />
          </AdminAuthGuard>
        );

      case 'workspace':
      case 'admin':
        return (
          <AdminAuthGuard
            isLoading={isAuthLoading}
            isAuthenticated={isAdminLoggedIn}
            onRedirectToLogin={() => handleNavigate('admin/login')}
          >
            <OrganizerWorkspacePage
              tournament={activeTournament}
              teams={teams}
              matches={matches}
              players={players}
              standings={standings}
              onDataChanged={loadData}
              onNavigateHome={() => handleNavigate('landing')}
              onNavigateToCreate={(prompt) => {
                if (prompt) {
                  setWizardInitialData({ prompt });
                }
                handleNavigate('organize');
              }}
              onTournamentDeleted={handleTournamentDeleted}
              onLogout={handleAdminLogout}
            />
          </AdminAuthGuard>
        );

      case 'public-tournament':
      case 'matches':
      case 'fixtures':
      case 'results':
      case 'teams':
      case 'team-detail':
      case 'stats':
      case 'table':
        return (
          <PublicTournamentPage
            tournament={activeTournament}
            teams={teams}
            matches={matches}
            players={players}
            standings={standings}
            topScorers={topScorers}
            goals={goals}
            motms={motms}
            sessionRole={sessionRole}
            isOrganizerLoggedIn={isVerifiedOrganizer}
            onNavigateToWorkspace={() => handleNavigate('workspace')}
            onNavigateHome={() => handleNavigate('landing')}
            onLeaveTournament={handleParticipantLeave}
            onDataChanged={loadData}
          />
        );

      case 'match-detail':
        return (
          <MatchDetailPage
            matchId={activeParam || matches[0]?.id || ''}
            matches={matches}
            teams={teams}
            goals={goals}
            motms={motms}
            players={players}
            onNavigate={handleNavigate}
            onOpenLiveWindow={() => setIsLiveWindowOpen(true)}
            onSelectPlayer={handleSelectPlayer}
          />
        );

      case 'rules':
        return (
          <RulesPage
            onNavigate={handleNavigate}
          />
        );

      case 'admin-login':
      case 'admin/login':
        return (
          <AdminLoginPage
            onLoginSuccess={handleAdminLogin}
            onNavigateHome={() => handleNavigate('landing')}
          />
        );

      default:
        return (
          <LandingPage
            activeTournament={activeTournament}
            isAdminLoggedIn={isAdminLoggedIn}
            onOpenTutorial={() => setIsTutorialOpen(true)}
            onOrganizeClick={(initialTourney) => {
              if (initialTourney) {
                setWizardInitialData(initialTourney);
                handleNavigate('organize');
              } else {
                handleNavigate('workspace');
              }
            }}
            onJoinTournament={async (slugOrId) => {
              let tourney = localDataService.getTournamentBySlug(slugOrId) || localDataService.getTournamentById(slugOrId);
              if (!tourney) {
                tourney = await tournamentService.getTournament(slugOrId);
              }
              if (tourney) {
                handleTournamentChanged(tourney.id);
                handleNavigate('public-tournament');
              } else {
                handleNavigate('landing');
              }
            }}
            onOpenPublicDemo={() => {
              handleNavigate('public-tournament');
            }}
          />
        );
    }
  };

  const isParticipantRoute = useMemo(() => {
    return [
      'public-tournament',
      'matches',
      'fixtures',
      'results',
      'teams',
      'team-detail',
      'stats',
      'table',
    ].includes(currentTab);
  }, [currentTab]);

  const isVerifiedOrganizer = useMemo(() => {
    if (currentUserId && activeTournament?.created_by === currentUserId) return true;
    if (import.meta.env.DEV && isAdminLoggedIn) {
      if (activeTournament?.id === DEMO_TOURNAMENT_ID) return true;
      if (activeTournament?.created_by === 'dev-admin') return true;
    }
    return false;
  }, [isAdminLoggedIn, currentUserId, activeTournament]);

  // If tournament was explicitly not found
  if (tournamentNotFound) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#101013] text-[#F0E9E7]">
        <div className="max-w-md w-full p-6 sm:p-8 text-center space-y-4 rounded-2xl bg-[#19191F] border border-white/10 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-[#21191D] border border-[#F02D50]/40 text-[#F02D50] flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#F0E9E7]">Tournament Unavailable</h1>
            <p className="text-xs text-[#A5A1A4] mt-1 leading-relaxed">
              The tournament link you entered is invalid, has expired, or was removed by its organizer.
            </p>
          </div>
          <button
            onClick={() => {
              setTournamentNotFound(false);
              handleNavigate('landing');
            }}
            className="w-full py-2.5 rounded-lg bg-[#F02D50] hover:bg-[#b01e37] text-white text-xs font-mono font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-[#F02D50]/20 transition"
          >
            Return to TournX Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-x-hidden ${
      isParticipantRoute 
        ? 'bg-[#0C0E14] text-[#E2E8F0] selection:bg-[#38B264]/30 selection:text-white' 
        : 'bg-[#101013] text-[#F0E9E7] selection:bg-[#F02D50]/30 selection:text-white'
    }`}>

      {/* Animated Opening Sequence (Optional if intro=true) */}
      {showIntro && (
        <OpeningAnimation onComplete={handleIntroComplete} />
      )}

      {/* Main Broadcast Navigation */}
      <Navbar
        currentTab={currentTab}
        onNavigate={handleNavigate}
        isAdminLoggedIn={isAdminLoggedIn}
        activeTournamentName={activeTournament?.name}
        sessionRole={isAdminLoggedIn ? 'ORGANIZER' : sessionRole !== 'ANONYMOUS' ? sessionRole : undefined}
        onShareTournament={() => setIsGlobalShareOpen(true)}
        onLogout={handleAdminLogout}
      />

      {/* Main Page Body with Genuine 3D Page Transitions */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-20 md:pb-8">
        <PageTransition3D transitionKey={currentTab + (activeParam || '') + (activeTournament?.id || '')} type="turn">
          {renderCurrentPage()}
        </PageTransition3D>
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Mobile Floating Bottom Bar for Handheld Phones (390px - 430px) */}
      <MobileBottomNav
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onOpenLiveWindow={() => setIsLiveWindowOpen(true)}
      />

      {/* Share Tournament Modal */}
      <ShareTournamentModal
        isOpen={isGlobalShareOpen}
        onClose={() => setIsGlobalShareOpen(false)}
        tournament={activeTournament}
      />

      {/* Tournament Switcher Modal */}
      <TournamentSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
        onSelectTournament={handleTournamentChanged}
        onOpenCreate={() => setIsCreateOpen(true)}
      />

      {/* Create Tournament Modal */}
      <CreateTournamentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onTournamentCreated={handleTournamentChanged}
      />

      {/* Access Code Modal (VIEW / SCORE) */}
      <AccessCodeModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
        tournament={activeTournament}
        onSuccess={(role) => {
          setSessionRole(role);
          loadData();
        }}
      />

      {/* Player Profile Modal */}
      {selectedPlayer && (
        <PlayerProfileModal
          player={selectedPlayer}
          team={selectedPlayerTeam}
          matches={matches}
          goals={goals}
          motms={motms}
          standings={standings}
          allPlayers={players}
          allTeams={teams}
          onClose={handleClosePlayerModal}
          onNavigateToTeam={teamId => handleNavigate('team-detail', teamId)}
          onNavigateToMatch={matchId => handleNavigate('match-detail', matchId)}
        />
      )}

      {/* In-App Live Match Window Modal */}
      <LiveMatchModal
        isOpen={isLiveWindowOpen}
        onClose={() => setIsLiveWindowOpen(false)}
      />

      {/* Interactive 6-Step Guided Tutorial Modal */}
      <InteractiveTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onTryPrompt={(p) => {
          setIsTutorialOpen(false);
          setWizardInitialData({ prompt: p });
          handleNavigate('organize');
        }}
      />

      {/* Vercel Web Analytics */}
      <Analytics />

    </div>
  );
}

export default App;
