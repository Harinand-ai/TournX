import React, { useState } from 'react';
import { Volume2, VolumeX, Trophy, ChevronDown, KeyRound, Shield, LogIn, HelpCircle } from 'lucide-react';
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
  onOpenTutorial?: () => void;
  sessionRole?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onReplayIntro,
  activeTournamentName,
  isAdminLoggedIn,
  onOpenTournamentSwitcher,
  onOpenAccessCode,
  onOpenTutorial,
  sessionRole,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(audioService.getMuted());

  const handleToggleSound = () => {
    const muted = audioService.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0c130f]/95 border-b border-[#1c2921] backdrop-blur-md shadow-sm text-[#faf9f5]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Tournament Brand Logo */}
          <button
            onClick={() => {
              if (onReplayIntro) {
                onReplayIntro();
              } else {
                onNavigate('landing');
              }
            }}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
            title="Click to replay TournX intro animation"
          >
            <div className="w-8 h-8 rounded-xl bg-[#162032] border border-[#2b3a54] flex items-center justify-center text-emerald-400 shadow-xs group-hover:scale-105 transition">
              <Trophy className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold text-[#f8fafc] tracking-tight">
                Tourn<span className="text-emerald-400 font-pixel">X</span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider lowercase font-sans -mt-0.5">
                think • prompt • organise
              </span>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => onNavigate('landing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer ${
                currentTab === 'landing' || currentTab === 'home'
                  ? 'bg-[#162032] text-emerald-400 border border-[#2b3a54]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]'
              }`}
            >
              Start
            </button>

            <button
              onClick={() => onNavigate('public-tournament')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer ${
                currentTab === 'public-tournament' || currentTab === 'matches' || currentTab === 'teams' || currentTab === 'stats'
                  ? 'bg-[#162032] text-emerald-400 border border-[#2b3a54]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]'
              }`}
            >
              Scoreboard
            </button>

            <button
              onClick={() => onNavigate('workspace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'workspace' || currentTab === 'admin'
                  ? 'bg-[#162032] text-emerald-400 border border-[#2b3a54]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111827]'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Workspace</span>
            </button>
          </nav>

          {/* Right actions: Switcher + Code + Sound */}
          <div className="flex items-center gap-2">
            
            {/* Tournament Switcher */}
            {onOpenTournamentSwitcher && (
              <button
                onClick={onOpenTournamentSwitcher}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#162032] hover:bg-[#1e2c44] text-slate-200 border border-[#2b3a54] cursor-pointer max-w-[160px] truncate transition"
                title="Switch Tournament"
              >
                <Trophy className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{activeTournamentName || 'TournX'}</span>
                <ChevronDown className="w-3 h-3 shrink-0 text-slate-400" />
              </button>
            )}

            {/* Access Code entry / Role Badge */}
            {onOpenAccessCode && (
              <button
                onClick={onOpenAccessCode}
                title={sessionRole ? `Active session role: ${sessionRole}` : "Enter Access Code"}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider cursor-pointer border transition ${
                  sessionRole === 'SCORE'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 font-bold'
                    : sessionRole === 'VIEW'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-700/60 font-bold'
                    : 'bg-[#162032] text-slate-400 border-[#2b3a54] hover:bg-[#1e2c44] hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3 h-3 shrink-0 text-emerald-400/80" />
                <span className="hidden sm:inline">{sessionRole || 'Pass'}</span>
              </button>
            )}

            {/* Guided Tutorial Button */}
            {onOpenTutorial && (
              <button
                type="button"
                onClick={onOpenTutorial}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#14261b] hover:bg-[#1a3324] text-emerald-300 border border-[#24432f] cursor-pointer transition shadow-xs"
                title="Open Guided TournX Tutorial"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Tutorial</span>
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              title={isMuted ? "Unmute audio" : "Mute audio"}
              className="p-2 rounded-lg bg-[#162032] hover:bg-[#1e2c44] text-slate-300 hover:text-emerald-400 border border-[#2b3a54] transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {/* Quick Organize / Workspace Button */}
            <button
              onClick={() => onNavigate(isAdminLoggedIn ? 'workspace' : 'organize')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition cursor-pointer hidden sm:flex items-center gap-1.5"
            >
              {isAdminLoggedIn ? (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Workspace</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
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
