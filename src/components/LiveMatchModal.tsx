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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#19191F] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[#F0E9E7]">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#141418] border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F02D50] animate-ping shrink-0" />
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-mono font-bold uppercase text-[#F02D50] tracking-wider">
                TournX Match Centre
              </span>
              <span className="text-[11px] text-[#A5A1A4] font-mono hidden sm:inline">
                • LIVE SIMULATION
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close window"
            className="p-1.5 rounded-lg text-[#A5A1A4] hover:text-[#F0E9E7] hover:bg-[#202028] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-6 bg-[#101013] flex flex-col items-center justify-center space-y-6 min-h-[300px]">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#21191D] border border-[#F02D50]/40 rounded-full text-xs text-[#F0E9E7] font-mono">
            <Activity className="w-3.5 h-3.5 text-[#F02D50]" />
            <span>Live Broadcast Feed • Active Match</span>
          </div>

          {liveMatch && homeTeam && awayTeam ? (
            <div className="w-full max-w-md bg-[#19191F] border border-[#F02D50]/60 p-6 text-center rounded-2xl shadow-[0_0_24px_rgba(240, 45, 80,0.2)] space-y-4">
              <div className="text-xs text-[#A5A1A4] uppercase tracking-wider font-mono">
                {liveMatch.venue || 'Stadium Arena'} • Match #{liveMatch.match_number}
              </div>

              <div className="flex items-center justify-around py-3">
                <div className="flex-1 text-center">
                  <div className="text-sm font-display font-bold text-[#F0E9E7] truncate px-1">{homeTeam.name}</div>
                  <div className="text-4xl font-score font-black text-[#F02D50] mt-2">{liveMatch.home_score ?? 0}</div>
                </div>

                <div className="px-3 font-mono font-bold text-[#A5A1A4] text-xs">VS</div>

                <div className="flex-1 text-center">
                  <div className="text-sm font-display font-bold text-[#F0E9E7] truncate px-1">{awayTeam.name}</div>
                  <div className="text-4xl font-score font-black text-[#F02D50] mt-2">{liveMatch.away_score ?? 0}</div>
                </div>
              </div>

              <div className="text-xs text-[#A5A1A4] border-t border-white/[0.08] pt-3 font-mono flex items-center justify-between">
                <span>Status: <strong className="text-[#F02D50]">{liveMatch.status}</strong></span>
                <span>Round {liveMatch.round_number || 1}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm font-mono text-[#A5A1A4]">No scheduled match available for simulation.</p>
          )}

          <p className="text-xs font-mono text-[#6E6A6D] text-center max-w-sm">
            Live match simulation operates synchronously within the TournX sports technology engine.
          </p>
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-3 bg-[#141418] border-t border-white/[0.08] flex items-center justify-between text-xs text-[#A5A1A4] font-mono">
          <span className="flex items-center gap-1.5 truncate">
            <Radio className="w-3.5 h-3.5 text-[#F02D50]" />
            <span>TournX Real-Time Signal</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono font-bold text-[#F0E9E7] hover:text-[#F02D50] transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
