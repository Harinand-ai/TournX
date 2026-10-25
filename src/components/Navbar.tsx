import React from 'react';
import { Trophy, Shield, Share2, LogOut, LogIn } from 'lucide-react';
import { TournXLogo } from './TournXLogo';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
  onReplayIntro?: () => void;
  isAdminLoggedIn?: boolean;
  activeTournamentName?: string;
  onOpenTournamentSwitcher?: () => void;
  onOpenAccessCode?: () => void;
  sessionRole?: string;
  onShareTournament?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  isAdminLoggedIn,
  activeTournamentName,
  sessionRole,
  onShareTournament,
  onLogout,
}) => {
  const isPreCreation = currentTab === 'landing' || currentTab === 'organize' || currentTab === 'setup' || currentTab === 'wizard' || currentTab === 'admin-login';
  const isWorkspace = currentTab === 'workspace' || currentTab === 'admin';
  const isViewer = currentTab === 'public-tournament' || currentTab === 'matches' || currentTab === 'fixtures' || currentTab === 'results' || currentTab === 'teams' || currentTab === 'stats' || currentTab === 'table';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#101013]/95 border-b border-white/[0.08] backdrop-blur-md text-[#F0E9E7] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Architectural Brand Identity */}
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="flex items-center text-left focus:outline-none group cursor-pointer"
            title="TournX Home"
          >
            <TournXLogo size="sm" showTagline={false} />
          </button>

          {/* Context-Aware Navigation */}
          {isPreCreation ? (
            /* PRE-CREATION: Focused header with organizer authentication link */
            <div className="flex items-center gap-3">
              {isAdminLoggedIn ? (
                <button
                  type="button"
                  onClick={() => onNavigate('workspace')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#F02D50] hover:bg-[#FF3358] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-[0_2px_10px_rgba(240, 45, 80,0.3)]"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>My Workspace</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('admin-login')}
                  className="text-xs font-semibold text-[#A5A1A4] hover:text-[#F0E9E7] transition cursor-pointer flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-white/10 hover:border-white/20 bg-[#19191F]"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#F02D50]" />
                  <span>Organizer Sign In</span>
                </button>
              )}
            </div>
          ) : (
            /* POST-CREATION / IN-TOURNAMENT: Focused workspace or viewer controls */
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Active Tournament Pill */}
              {activeTournamentName && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#19191F] border border-white/10 text-xs font-semibold text-[#F0E9E7]">
                  <span className="w-2 h-2 rounded-full bg-[#F02D50] animate-pulse" />
                  <span className="max-w-[150px] truncate">{activeTournamentName}</span>
                </div>
              )}

              {/* Role Indicator */}
              {sessionRole && sessionRole !== 'ANONYMOUS' && (
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                  sessionRole === 'ORGANIZER' 
                    ? 'bg-[#F02D50]/20 text-[#F02D50] border border-[#F02D50]/40'
                    : sessionRole === 'SCORE'
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-700/60'
                    : 'bg-[#19191F] text-[#A5A1A4] border border-white/10'
                }`}>
                  {sessionRole === 'ORGANIZER' ? 'Organizer' : sessionRole === 'SCORE' ? 'Scorekeeper' : 'Spectator'}
                </span>
              )}

              {/* Share Action */}
              {onShareTournament && (
                <button
                  type="button"
                  onClick={onShareTournament}
                  className="px-3 py-1.5 rounded-lg bg-[#F02D50] hover:bg-[#FF3358] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-[0_2px_10px_rgba(240, 45, 80,0.3)]"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              )}

              {/* Switch / View mode toggle */}
              {isViewer && isAdminLoggedIn && (
                <button
                  type="button"
                  onClick={() => onNavigate('workspace')}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-[#19191F] hover:bg-[#22222B] text-xs font-semibold text-[#F0E9E7] transition cursor-pointer"
                >
                  Workspace
                </button>
              )}

              {isWorkspace && (
                <button
                  type="button"
                  onClick={() => onNavigate('public-tournament')}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-[#19191F] hover:bg-[#22222B] text-xs font-semibold text-[#F0E9E7] transition cursor-pointer"
                >
                  Public View
                </button>
              )}

              {/* Logout */}
              {isAdminLoggedIn && onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-[#A5A1A4] hover:text-[#F0E9E7] hover:bg-[#19191F] border border-transparent hover:border-white/10 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
