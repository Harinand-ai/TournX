import React, { useState } from 'react';
import { Volume2, VolumeX, Trophy, ChevronDown, KeyRound, Shield, LogIn } from 'lucide-react';
import { audioService } from '../services/audioService';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
  onReplayIntro?: () => void;
  onOpenLiveWindow?: () => void;
  isAdminLoggedIn?: boolean;
  activeTournamentName?: string;
  onOpenTournamentSwitcher?: () => void;
  onOpenAccessCode?: () => void;
  sessionRole?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  activeTournamentName,
  isAdminLoggedIn,
  onOpenTournamentSwitcher,
  onOpenAccessCode,
  sessionRole,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(audioService.getMuted());

  const handleToggleSound = () => {
    const muted = audioService.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a0d0b]/95 border-b border-[#1f2e26] backdrop-blur-md shadow-lg text-[#f1f5f9]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Tournament Brand Logo */}
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#141e17] border border-[#273d2f] flex items-center justify-center text-lime-400 shadow-sm group-hover:scale-105 transition">
              <Trophy className="w-4 h-4 text-lime-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold text-[#f1f5f9] tracking-tight">
                Tourn<span className="text-lime-400 font-pixel">X</span>
              </span>
              <span className="text-[9px] text-slate-400 tracking-wider lowercase font-mono -mt-0.5">
                think.prompt.organise
              </span>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onNavigate('landing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer ${
                currentTab === 'landing' || currentTab === 'home'
                  ? 'bg-[#18231c] text-lime-400 border border-[#2f483a]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b16]'
              }`}
            >
              Start
            </button>

            <button
              onClick={() => onNavigate('public-tournament')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer ${
                currentTab === 'public-tournament' || currentTab === 'matches' || currentTab === 'teams' || currentTab === 'stats'
                  ? 'bg-[#18231c] text-lime-400 border border-[#2f483a]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b16]'
              }`}
            >
              Scoreboard
            </button>

            <button
              onClick={() => onNavigate('workspace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'workspace' || currentTab === 'admin'
                  ? 'bg-[#18231c] text-lime-400 border border-[#2f483a]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#131b16]'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-lime-400" />
              <span>Workspace</span>
            </button>
          </nav>

          {/* Right actions: Switcher + Code + Sound */}
          <div className="flex items-center gap-2">
            
            {/* Tournament Switcher */}
            {onOpenTournamentSwitcher && (
              <button
                onClick={onOpenTournamentSwitcher}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#131b16] hover:bg-[#1a251f] text-slate-300 border border-[#223328] cursor-pointer max-w-[160px] truncate transition"
                title="Switch Tournament"
              >
                <Trophy className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span className="truncate">{activeTournamentName || 'TournX'}</span>
                <ChevronDown className="w-3 h-3 shrink-0 text-slate-500" />
              </button>
            )}

            {/* Access Code entry / Role Badge */}
            {onOpenAccessCode && (
              <button
                onClick={onOpenAccessCode}
                title={sessionRole ? `Active session role: ${sessionRole}` : "Enter Access Code"}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider cursor-pointer border transition ${
                  sessionRole === 'SCORE'
                    ? 'bg-lime-950/60 text-lime-300 border-lime-700/60 font-bold'
                    : sessionRole === 'VIEW'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-700/60 font-bold'
                    : 'bg-[#131b16] text-slate-400 border-[#223328] hover:bg-[#1a251f] hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3 h-3 shrink-0 text-lime-400/80" />
                <span className="hidden sm:inline">{sessionRole || 'Pass'}</span>
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              title={isMuted ? "Unmute audio" : "Mute audio"}
              className="p-2 rounded-lg bg-[#131b16] hover:bg-[#1a251f] text-slate-400 hover:text-lime-400 border border-[#223328] transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-lime-400" />}
            </button>

            {/* Quick Organize / Workspace Button */}
            <button
              onClick={() => onNavigate(isAdminLoggedIn ? 'workspace' : 'organize')}
              className="px-3 py-1.5 rounded-lg bg-lime-500 hover:bg-lime-400 text-black font-extrabold text-xs shadow-md transition cursor-pointer hidden sm:flex items-center gap-1.5"
            >
              {isAdminLoggedIn ? (
                <>
                  <Shield className="w-3 h-3" />
                  <span>Terminal</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3 h-3" />
                  <span>Organize</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
