import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tournamentService } from './services/tournamentService';
import { localDataService, FTM_STORAGE_KEYS } from './services/localDataService';
import { Team, Match, Player, Goal, ManOfTheMatch, POTMPoll } from './types/tournament';
import { Tournament } from './types/multiTenant';
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
import { AdminAuthGuard } from './components/AdminAuthGuard';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { LiveMatchModal } from './components/LiveMatchModal';
import { TournamentSwitcherModal } from './components/TournamentSwitcherModal';
import { CreateTournamentModal } from './components/CreateTournamentModal';
import { AccessCodeModal } from './components/AccessCodeModal';
import { Analytics } from '@vercel/analytics/react';
import { Trophy, Plus, RefreshCw } from 'lucide-react';


export interface RouteState {
  tab: string;
  param?: string;
  tourneySlug?: string;
}

export const parseCurrentRoute = (): RouteState => {
  if (typeof window === 'undefined') return { tab: 'home' };

  // 1. Check URL hash (e.g. #/t/slug/matches, #/admin/login)
  const hashRaw = window.location.hash.replace(/^#\/?/, '').trim();
  if (hashRaw && hashRaw !== 'quick-view') {
    if (hashRaw.startsWith('t/')) {
      const parts = hashRaw.split('/');
      return { tourneySlug: parts[1], tab: parts[2] || 'home', param: parts[3] };
    }
    if (hashRaw === 'admin/login' || hashRaw === 'admin-login') {
      return { tab: 'admin-login' };
    }
    const [hTab, hParam] = hashRaw.split('/');
    if (hTab === 'admin' && hParam === 'login') {
      return { tab: 'admin-login' };
    }
    if (['home', 'matches', 'fixtures', 'results', 'match-detail', 'teams', 'team-detail', 'stats', 'table', 'rules', 'admin', 'admin-login'].includes(hTab)) {
      return { tab: hTab, param: hParam };
    }
  }

  // 2. Check URL pathname (e.g. /t/slug/matches, /admin)
  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').trim();
  if (pathname) {
    if (pathname.startsWith('t/')) {
      const parts = pathname.split('/');
      return { tourneySlug: parts[1], tab: parts[2] || 'home', param: parts[3] };
    }
    if (pathname === 'admin/login' || pathname === 'admin-login') {
      return { tab: 'admin-login' };
    }
    const [pTab, pParam] = pathname.split('/');
    if (pTab === 'admin') {
      if (pParam === 'login') {
        return { tab: 'admin-login' };
      }
      return { tab: 'admin' };
    }
    if (['home', 'matches', 'fixtures', 'results', 'match-detail', 'teams', 'team-detail', 'stats', 'table', 'rules'].includes(pTab)) {
      return { tab: pTab, param: pParam };
    }
  }

  return { tab: 'home' };
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
        return found;
      }
    }
    return localDataService.getActiveTournament();
  });

  // Modals state
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isLiveWindowOpen, setIsLiveWindowOpen] = useState(false);

  // Authorization Role for active tournament ('VIEW' | 'SCORE' | 'ORGANIZER' | 'ANONYMOUS')
  const [sessionRole, setSessionRole] = useState<'VIEW' | 'SCORE' | 'ORGANIZER' | 'ANONYMOUS'>(() => {
    return localDataService.getSessionRole(activeTournament.id);
  });


  // Intro state: Show animation at first when the site is opened
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('intro') === 'true') return true;
    if (urlParams.get('nointro') === 'true' || urlParams.get('skipIntro') === 'true' || urlParams.get('view') === 'full') {
      return false;
    }
    
    // Don't show intro if directly opening admin
    const route = parseCurrentRoute();
    if (route.tab === 'admin' || route.tab === 'admin-login') {
      return false;
    }
    
    // Check if dismissed in this specific browsing session
    const seenInSession = sessionStorage.getItem('ftm_dev_intro_played_session');
    if (seenInSession === 'true') {
      return false;
    }
    
    return true;
  });

  // Admin auth & session state
  const [isAuthLoading] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localDataService.isDevAdminLoggedIn();
  });

  // Core Tournament Data
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [motms, setMotms] = useState<ManOfTheMatch[]>([]);
  const [activePolls, setActivePolls] = useState<POTMPoll[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data function for active tournament
  const loadData = useCallback(async () => {
    try {
      const tourney = localDataService.getActiveTournament();
      setActiveTournament(tourney);

      const [tData, mData, pData, gData, motmData, pollsData] = await Promise.all([
        tournamentService.getTeams(),
        tournamentService.getMatches(),
        tournamentService.getPlayers(),
        tournamentService.getGoals(),
        tournamentService.getManOfTheMatches(),
        tournamentService.getPolls(),
      ]);

      setTeams(tData);
      setMatches(mData);
      setPlayers(pData);
      setGoals(gData);
      setMotms(motmData);
      setActivePolls(pollsData.filter(p => p.status === 'active'));
      setSessionRole(localDataService.getSessionRole(tourney.id));
    } catch (err) {

      console.error('Error fetching tournament data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle tournament change
  const handleTournamentChanged = useCallback((tourneyId: string) => {
    localDataService.setActiveTournamentId(tourneyId);
    const updated = localDataService.getActiveTournament();
    setActiveTournament(updated);
    loadData();
  }, [loadData]);

  // Listen for browser popstate and hash changes
  useEffect(() => {
    const handleUrlChange = () => {
      const route = parseCurrentRoute();
      if (route.tourneySlug) {
        const found = localDataService.getTournamentBySlug(route.tourneySlug);
        if (found && found.id !== localDataService.getActiveTournamentId()) {
          handleTournamentChanged(found.id);
        }
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
  }, [handleTournamentChanged]);

  const handleNavigate = (tab: string, param?: string) => {
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
    if (normalizedTab === 'admin') {
      targetPath = '/admin';
    } else if (normalizedTab === 'admin-login') {
      targetPath = '/admin/login';
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
      targetPath = `/t/${tourneySlug}`;
    }

    try {
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      } else if (window.location.hash) {
        window.history.replaceState(null, '', targetPath);
      }
    } catch {}

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
    try {
      sessionStorage.setItem('ftm_dev_intro_played_session', 'true');
    } catch {}
    const route = parseCurrentRoute();
    if (route.tab !== 'admin' && route.tab !== 'admin-login') {
      handleNavigate('home');
    }
  };

  const handleReplayIntro = () => {
    try {
      sessionStorage.removeItem('ftm_dev_intro_played_session');
    } catch {}
    setShowIntro(true);
  };

  // Redirect to admin dashboard if logged in user is on admin-login
  useEffect(() => {
    if ((currentTab === 'admin-login' || currentTab === 'admin/login') && isAdminLoggedIn) {
      handleNavigate('admin');
    }
  }, [currentTab, isAdminLoggedIn]);

  const handleAdminLogin = () => {
    localDataService.setDevAdminLoggedIn(true);
    setIsAdminLoggedIn(true);
    handleNavigate('admin');
  };

  const handleAdminLogout = async () => {
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
      case 'home':
        return (
          <HomePage
            teams={teams}
            matches={matches}
            standings={standings}
            topScorers={topScorers}
            players={players}
            activePolls={activePolls}
            onNavigate={handleNavigate}
            onOpenLiveWindow={() => setIsLiveWindowOpen(true)}
            onSelectPlayer={handleSelectPlayer}
          />
        );

      case 'matches':
      case 'fixtures':
      case 'results':
        return (
          <FixturesPage
            matches={matches}
            teams={teams}
            activePollMatchIds={activePollMatchIds}
            onNavigate={handleNavigate}
          />
        );

      case 'teams':
        return (
          <TeamsPage
            standings={standings}
            onNavigate={handleNavigate}
          />
        );

      case 'team-detail':
        return (
          <TeamDetailPage
            teamId={activeParam || teams[0]?.id || ''}
            teams={teams}
            matches={matches}
            standings={standings}
            players={players}
            goals={goals}
            onNavigate={handleNavigate}
            onSelectPlayer={handleSelectPlayer}
          />
        );

      case 'stats':
      case 'table':
        return (
          <StatsPage
            topScorers={topScorers}
            cleanSheets={cleanSheets}
            motmLeaderboard={motmLeaderboard}
            teams={teams}
            matches={matches}
            standings={standings}
            players={players}
            onNavigate={handleNavigate}
            onSelectPlayer={handleSelectPlayer}
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

      case 'admin':
        return (
          <AdminAuthGuard
            isLoading={isAuthLoading}
            isAuthenticated={isAdminLoggedIn}
            onRedirectToLogin={() => handleNavigate('admin/login')}
          >
            <AdminDashboardPage
              tournament={activeTournament}
              teams={teams}
              matches={matches}
              players={players}
              goals={goals}
              assists={[]}
              motms={motms}
              standings={standings}
              topScorers={topScorers}
              onDataChanged={loadData}
              onLogout={handleAdminLogout}
              onNavigateHome={() => handleNavigate('home')}
            />
          </AdminAuthGuard>
        );

      case 'admin-login':
      case 'admin/login':
        return (
          <AdminLoginPage
            onLoginSuccess={handleAdminLogin}
            onNavigateHome={() => handleNavigate('home')}
          />
        );

      default:
        return (
          <HomePage
            teams={teams}
            matches={matches}
            standings={standings}
            topScorers={topScorers}
            players={players}
            activePolls={activePolls}
            onNavigate={handleNavigate}
            onOpenLiveWindow={() => setIsLiveWindowOpen(true)}
            onSelectPlayer={handleSelectPlayer}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#18110a] text-[#f7eed8]">
      
      {/* Animated Opening Sequence */}
      {showIntro && (
        <OpeningAnimation onComplete={handleIntroComplete} />
      )}

      {/* Main Broadcast Navigation */}
      <Navbar
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onReplayIntro={handleReplayIntro}
        onOpenLiveWindow={() => setIsLiveWindowOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        activeTournamentName={activeTournament?.name}
        onOpenTournamentSwitcher={() => setIsSwitcherOpen(true)}
        onOpenAccessCode={() => setIsAccessModalOpen(true)}
        sessionRole={isAdminLoggedIn ? 'ORGANIZER' : sessionRole !== 'ANONYMOUS' ? sessionRole : undefined}
      />

      {/* TournX Multi-Tournament Development Banner */}
      <div className="w-full bg-[#1e293b] border-b border-[#334155] px-3 sm:px-6 py-2 text-xs text-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-black px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] uppercase font-mono tracking-wider shrink-0">
            DEV MODE
          </span>
          <button
            onClick={() => setIsSwitcherOpen(true)}
            className="font-bold text-amber-300 hover:text-amber-200 hover:underline flex items-center gap-1.5 truncate cursor-pointer"
            title="Switch tournament"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="truncate">{activeTournament?.name || 'TournX Championship'}</span>
          </button>
          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
            • think.prompt.organise
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>New Tournament</span>
          </button>

          <button
            onClick={async () => {
              localDataService.resetDemoData();
              await loadData();
            }}
            className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 hover:underline font-bold cursor-pointer"
            title="Reset demo tournament only (custom tournaments preserved)"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Main Page Body */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-20 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab + (activeParam || '') + (activeTournament?.id || '')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {renderCurrentPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Mobile Floating Bottom Bar for Handheld Phones (390px - 430px) */}
      <MobileBottomNav
        currentTab={currentTab}
        onNavigate={handleNavigate}
        onOpenLiveWindow={() => setIsLiveWindowOpen(true)}
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

      {/* Vercel Web Analytics */}
      <Analytics />

    </div>
  );
}

export default App;
