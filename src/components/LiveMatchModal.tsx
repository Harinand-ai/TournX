import React, { useEffect } from 'react';
import { X, Radio, Activity } from 'lucide-react';
import { localDataService } from '../services/localDataService';

interface LiveMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveMatchModal: React.FC<LiveMatchModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const matches = localDataService.getMatches();
  const teams = localDataService.getTeams();
  const teamsMap = new Map(teams.map(t => [t.id, t]));
  const liveMatch = matches.find(m => m.status === 'LIVE') || matches[0];
  const homeTeam = liveMatch ? teamsMap.get(liveMatch.home_team_id) : null;
  const awayTeam = liveMatch ? teamsMap.get(liveMatch.away_team_id) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-[#362b21] border-4 border-[#120d08] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#261d15] border-b-3 border-[#120d08]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 bg-[#ff2222] animate-ping shrink-0" />
            <div className="flex items-center gap-2 truncate">
              <span className="text-[11px] font-black uppercase text-[#ffff55] tracking-wide font-display">
                TOURNX MATCH CENTRE
              </span>
              <span className="text-[9px] text-[#bda88e] lowercase font-mono">
                think.prompt.organise
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close window"
            className="px-2 py-1 mc-btn-red text-white text-[11px] font-black cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-6 bg-[#18110a] flex flex-col items-center justify-center space-y-6 min-h-[300px]">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1f2937] border border-[#374151] rounded-full text-xs text-emerald-400 font-mono">
            <Activity className="w-3.5 h-3.5" />
            <span>Local Broadcast Simulation • TournX</span>
          </div>

          {liveMatch && homeTeam && awayTeam ? (
            <div className="w-full max-w-md bg-[#241a12] border-2 border-[#120d08] p-4 text-center rounded-lg shadow-md">
              <div className="text-[10px] text-amber-400 font-mono uppercase tracking-wider mb-2">
                {liveMatch.venue || 'Stadium Arena'} • Match #{liveMatch.match_number}
              </div>

              <div className="flex items-center justify-around py-3">
                <div className="flex-1 text-center">
                  <div className="text-sm font-bold text-white uppercase">{homeTeam.name}</div>
                  <div className="text-3xl font-black text-amber-400 mt-1">{liveMatch.home_score ?? 0}</div>
                </div>

                <div className="px-3 text-xs text-slate-400 font-mono">VS</div>

                <div className="flex-1 text-center">
                  <div className="text-sm font-bold text-white uppercase">{awayTeam.name}</div>
                  <div className="text-3xl font-black text-amber-400 mt-1">{liveMatch.away_score ?? 0}</div>
                </div>
              </div>

              <div className="text-xs text-slate-400 border-t border-[#362b21] pt-2 mt-2">
                Status: <span className="font-bold text-white">{liveMatch.status}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No scheduled match available for simulation.</p>
          )}

          <p className="text-xs text-slate-500 text-center max-w-sm">
            This match centre operates entirely locally within TournX development environment.
          </p>
        </div>

        {/* Footer info bar */}
        <div className="px-3 py-1.5 bg-[#261d15] border-t-2 border-[#120d08] flex items-center justify-between text-[10px] text-[#baa78e]">
          <span className="flex items-center gap-1.5 truncate">
            <Radio className="w-3 h-3 text-[#55ff55]" />
            <span>TournX Local Feed</span>
          </span>
          <button
            onClick={onClose}
            className="text-[9px] font-black text-[#ffff55] hover:text-white uppercase cursor-pointer"
          >
            [ CLOSE ]
          </button>
        </div>

      </div>
    </div>
  );
};
