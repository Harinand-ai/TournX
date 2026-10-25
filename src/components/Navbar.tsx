import React from 'react';
import { Trophy, ChevronDown, LogOut, Share2 } from 'lucide-react';
import { TournXLogo } from './TournXLogo';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
  isAdminLoggedIn?: boolean;
  activeTournamentName?: string;
  onOpenTournamentSwitcher?: () => void;
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
  const isOrganizerMode = currentTab === 'workspace' || currentTab === 'admin' || currentTab === 'organize';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#101013]/95 border-b border-white/[0.08] backdrop-blur-md text-[#F0E9E7] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Brand Identity on Far Left */}
          <button
            type="button"
            onClick={() => onNavigate(isAdminLoggedIn ? 'workspace' : 'landing')}
            className="flex items-center text-left focus:outline-none group cursor-pointer"
            title="TournX"
          >
            <TournXLogo size="sm" showTagline={false} />
          </button>

          {/* Right-Side Header Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Tournament Selector & Status on the Right */}
            {onOpenTournamentSwitcher ? (
              <button
                type="button"
                onClick={onOpenTournamentSwitcher}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#19191F] hover:bg-[#22222B] border border-white/[0.1] hover:border-white/[0.18] text-xs font-semibold text-[#F0E9E7] transition-all cursor-pointer shadow-sm group"
                title="Select Tournament"
              >
                <Trophy className="w-3.5 h-3.5 text-[#D72645]" />
                <span className="max-w-[140px] sm:max-w-[200px] truncate">
                  {activeTournamentName || 'No tournaments yet'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#A5A1A4] group-hover:text-[#F0E9E7] transition-colors" />
              </button>
            ) : activeTournamentName ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#19191F] border border-white/[0.08] text-xs font-semibold text-[#F0E9E7]">
                <span className="w-2 h-2 rounded-full bg-[#D72645] animate-pulse" />
                <span className="max-w-[140px] sm:max-w-[200px] truncate">{activeTournamentName}</span>
              </div>
            ) : null}

            {/* Role Badge (when applicable) */}
            {sessionRole && sessionRole !== 'ANONYMOUS' && (
              <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
                sessionRole === 'ORGANIZER' 
                  ? 'bg-[#D72645]/20 text-[#D72645] border border-[#D72645]/40'
                  : sessionRole === 'SCORE'
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-700/60'
                  : 'bg-[#19191F] text-[#A5A1A4] border border-white/10'
              }`}>
                {sessionRole === 'ORGANIZER' ? 'Organizer' : sessionRole === 'SCORE' ? 'Scorekeeper' : 'Participant'}
              </span>
            )}

            {/* Share Action */}
            {onShareTournament && activeTournamentName && (
              <button
                type="button"
                onClick={onShareTournament}
                className="px-3 py-1.5 rounded-xl bg-[#21191D] hover:bg-[#D72645] border border-[#D72645]/40 text-[#F0E9E7] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Share Tournament"
              >
                <Share2 className="w-3.5 h-3.5 text-[#D72645] group-hover:text-white" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

            {/* Account Sign Out Control */}
            {isAdminLoggedIn && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Sign out of organizer account"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#A5A1A4] hover:text-[#F0E9E7] hover:bg-[#19191F] border border-transparent hover:border-white/10 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[#D72645]" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
