import React from 'react';
import { Trophy, Shield, Share2, LogOut, LogIn } from 'lucide-react';

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
  onOpenTournamentSwitcher,
  sessionRole,
  onShareTournament,
  onLogout,
}) => {
  const isPreCreation = currentTab === 'landing' || currentTab === 'organize' || currentTab === 'setup' || currentTab === 'wizard' || currentTab === 'admin-login';
  const isWorkspace = currentTab === 'workspace' || currentTab === 'admin';
  const isViewer = currentTab === 'public-tournament' || currentTab === 'matches' || currentTab === 'fixtures' || currentTab === 'results' || currentTab === 'teams' || currentTab === 'stats' || currentTab === 'table';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#faf9f5]/95 border-b border-[#e5e3d8] backdrop-blur-md text-[#0f1712] transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Minimalist Editorial Brand Identity */}
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
            title="TournX Home"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0f1712] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition">
              <Trophy className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold text-[#0f1712] tracking-tight font-sans">
                Tourn<span className="text-emerald-700">X</span>
              </span>
              <span className="text-[10px] text-[#57635a] tracking-wider uppercase font-medium -mt-0.5">
                think • prompt • organise
              </span>
            </div>
          </button>

          {/* Context-Aware Navigation */}
          {isPreCreation ? (
            /* PRE-CREATION: Essential minimal header with auth link only */
            <div className="flex items-center gap-3">
              {isAdminLoggedIn ? (
                <button
                  type="button"
                  onClick={() => onNavigate('workspace')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0f1712] hover:bg-[#1f2e24] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>My Workspace</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('admin-login')}
                  className="text-xs font-semibold text-[#57635a] hover:text-[#0f1712] transition cursor-pointer flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-[#e5e3d8] hover:border-[#cfcbc0] bg-white shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Organizer Sign In</span>
                </button>
              )}
            </div>
          ) : (
            /* POST-CREATION / IN-TOURNAMENT: Focused workspace or viewer controls */
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Active Tournament Pill */}
              {activeTournamentName && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-[#e5e3d8] text-xs font-semibold text-[#0f1712]">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span className="max-w-[140px] truncate">{activeTournamentName}</span>
                </div>
              )}

              {/* Role Indicator */}
              {sessionRole && sessionRole !== 'ANONYMOUS' && (
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                  sessionRole === 'ORGANIZER' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : sessionRole === 'SCORE'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-[#f4f2ea] text-[#57635a] border border-[#e5e3d8]'
                }`}>
                  {sessionRole === 'ORGANIZER' ? 'Organizer' : sessionRole === 'SCORE' ? 'Scorekeeper' : 'Spectator'}
                </span>
              )}

              {/* Share Action */}
              {onShareTournament && (
                <button
                  type="button"
                  onClick={onShareTournament}
                  className="px-3 py-1.5 rounded-lg bg-[#0f1712] hover:bg-[#1f2e24] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              )}

              {/* Switch / View mode toggle */}
              {isViewer && isAdminLoggedIn && (
                <button
                  type="button"
                  onClick={() => onNavigate('workspace')}
                  className="px-3 py-1.5 rounded-lg border border-[#e5e3d8] bg-white hover:bg-[#f4f2ea] text-xs font-semibold text-[#0f1712] transition cursor-pointer"
                >
                  Workspace
                </button>
              )}

              {isWorkspace && (
                <button
                  type="button"
                  onClick={() => onNavigate('public-tournament')}
                  className="px-3 py-1.5 rounded-lg border border-[#e5e3d8] bg-white hover:bg-[#f4f2ea] text-xs font-semibold text-[#0f1712] transition cursor-pointer"
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
                  className="p-1.5 rounded-lg text-[#57635a] hover:text-[#0f1712] hover:bg-[#f4f2ea] transition cursor-pointer"
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
