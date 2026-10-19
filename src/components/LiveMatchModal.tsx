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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f1411] border border-[#1f2e26] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[#f1f5f9]">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#141d18] border-b border-[#1f2e26]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-mono font-bold uppercase text-lime-400 tracking-wider">
                TournX Arcade Match Centre
              </span>
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                • LIVE SIMULATION
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close window"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a261f] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-6 bg-[#0b100d] flex flex-col items-center justify-center space-y-6 min-h-[300px]">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#121c15] border border-lime-700/60 rounded-full text-xs text-lime-300 font-mono">
            <Activity className="w-3.5 h-3.5 text-lime-400" />
            <span>Live Broadcast Feed • Active Match</span>
          </div>

          {liveMatch && homeTeam && awayTeam ? (
            <div className="w-full max-w-md bg-[#121c16] border border-lime-500/80 p-6 text-center rounded-2xl shadow-[0_0_24px_rgba(132,204,22,0.12)] space-y-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">
                {liveMatch.venue || 'Stadium Arena'} • Match #{liveMatch.match_number}
              </div>

              <div className="flex items-center justify-around py-3">
                <div className="flex-1 text-center">
                  <div className="text-sm font-mono font-bold text-[#f1f5f9] truncate px-1">{homeTeam.name}</div>
                  <div className="text-3xl font-pixel-score text-lime-400 mt-2">{liveMatch.home_score ?? 0}</div>
                </div>

                <div className="px-3 font-pixel text-slate-500 text-xs">VS</div>

                <div className="flex-1 text-center">
                  <div className="text-sm font-mono font-bold text-[#f1f5f9] truncate px-1">{awayTeam.name}</div>
                  <div className="text-3xl font-pixel-score text-lime-400 mt-2">{liveMatch.away_score ?? 0}</div>
                </div>
              </div>

              <div className="text-xs text-slate-400 border-t border-[#1f2e26] pt-3 font-mono flex items-center justify-between">
                <span>Status: <strong className="text-lime-400">{liveMatch.status}</strong></span>
                <span>Round {liveMatch.round_number || 1}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm font-mono text-slate-400">No scheduled match available for simulation.</p>
          )}

          <p className="text-xs font-mono text-slate-500 text-center max-w-sm">
            Live match simulation operates synchronously within the TournX retro stadium engine.
          </p>
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-3 bg-[#141d18] border-t border-[#1f2e26] flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 truncate">
            <Radio className="w-3.5 h-3.5 text-lime-400" />
            <span>TournX Real-Time Signal</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono font-bold text-slate-300 hover:text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
