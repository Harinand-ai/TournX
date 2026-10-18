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
    <header className="sticky top-0 z-40 w-full bg-white/95 border-b border-slate-200 backdrop-blur-md shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Tournament Brand Logo */}
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs group-hover:scale-105 transition">
              <Trophy className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                Tourn<span className="text-emerald-700">X</span>
              </span>
              <span className="text-[10px] text-slate-500 tracking-wider lowercase font-mono -mt-0.5">
                think.prompt.organise
              </span>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onNavigate('landing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'landing' || currentTab === 'home'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Start
            </button>

            <button
              onClick={() => onNavigate('public-tournament')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'public-tournament' || currentTab === 'matches' || currentTab === 'teams' || currentTab === 'stats'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Public Hub
            </button>

            <button
              onClick={() => onNavigate('workspace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'workspace' || currentTab === 'admin'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-700" />
              <span>Workspace</span>
            </button>
          </nav>

          {/* Right actions: Switcher + Code + Sound */}
          <div className="flex items-center gap-2">
            
            {/* Tournament Switcher */}
            {onOpenTournamentSwitcher && (
              <button
                onClick={onOpenTournamentSwitcher}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer max-w-[160px] truncate transition shadow-2xs"
                title="Switch Tournament"
              >
                <Trophy className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{activeTournamentName || 'TournX'}</span>
                <ChevronDown className="w-3 h-3 shrink-0 text-slate-400" />
              </button>
            )}

            {/* Access Code entry / Role Badge */}
            {onOpenAccessCode && (
              <button
                onClick={onOpenAccessCode}
                title={sessionRole ? `Active session role: ${sessionRole}` : "Enter Access Code"}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition shadow-2xs ${
                  sessionRole === 'SCORE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                    : sessionRole === 'VIEW'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <KeyRound className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">{sessionRole || 'Code'}</span>
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              title={isMuted ? "Unmute audio" : "Mute audio"}
              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer shadow-2xs"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-700" />}
            </button>

            {/* Quick Organize / Workspace Button */}
            <button
              onClick={() => onNavigate(isAdminLoggedIn ? 'workspace' : 'organize')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer hidden sm:flex items-center gap-1.5"
            >
              {isAdminLoggedIn ? (
                <>
                  <Shield className="w-3 h-3" />
                  <span>Workspace</span>
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
