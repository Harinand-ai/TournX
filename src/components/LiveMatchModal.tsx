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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-bold uppercase text-slate-900 tracking-wider">
                TournX Match Centre
              </span>
              <span className="text-[11px] text-slate-400 lowercase hidden sm:inline">
                • think.prompt.organise
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close window"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-6 bg-slate-50/50 flex flex-col items-center justify-center space-y-6 min-h-[300px]">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-800 font-medium">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>Live Broadcast Simulation • TournX</span>
          </div>

          {liveMatch && homeTeam && awayTeam ? (
            <div className="w-full max-w-md bg-white border border-slate-200 p-6 text-center rounded-2xl shadow-xs space-y-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                {liveMatch.venue || 'Stadium Arena'} • Match #{liveMatch.match_number}
              </div>

              <div className="flex items-center justify-around py-2">
                <div className="flex-1 text-center">
                  <div className="text-sm font-bold text-slate-900">{homeTeam.name}</div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1">{liveMatch.home_score ?? 0}</div>
                </div>

                <div className="px-3 text-xs font-bold text-slate-400">VS</div>

                <div className="flex-1 text-center">
                  <div className="text-sm font-bold text-slate-900">{awayTeam.name}</div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1">{liveMatch.away_score ?? 0}</div>
                </div>
              </div>

              <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                Status: <span className="font-bold text-emerald-700">{liveMatch.status}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No scheduled match available for simulation.</p>
          )}

          <p className="text-xs text-slate-400 text-center max-w-sm">
            This match centre operates locally within the TournX development environment.
          </p>
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 truncate">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>TournX Local Feed</span>
          </span>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
