import React from 'react';
import { Trophy, Shield, Calendar, Users } from 'lucide-react';
import { DEMO_TEAMS } from '../data/syntheticData';

interface FooterProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-[#0c120e] border-t border-[#1f2e26] text-slate-400 mt-16 pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          {/* Brand info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#141d18] border border-lime-700/60 rounded-lg flex items-center justify-center text-lime-400 font-bold text-xs shadow-xs">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <span className="font-pixel text-[#f1f5f9] text-sm tracking-wider uppercase">
                Tourn<span className="text-lime-400">X</span>
              </span>
            </div>
            <p className="text-xs font-mono text-lime-400 font-medium">
              think.prompt.organise
            </p>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Retro arcade football tournament management platform.
            </p>
          </div>

          {/* Clubs */}
          <div>
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-200 mb-2">
              Tournament Clubs
            </h4>
            <ul className="space-y-1.5 text-xs font-mono">
              {DEMO_TEAMS.map(team => (
                <li key={team.id}>
                  <button
                    onClick={() => onNavigate('team-detail', team.id)}
                    className="hover:text-lime-400 text-left flex items-center justify-between w-full group py-0.5 cursor-pointer transition-colors"
                  >
                    <span className="font-medium text-slate-300 group-hover:text-lime-400">
                      {team.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {team.manager_name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Shortcuts */}
          <div>
            <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-200 mb-2">
              Navigation
            </h4>
            <div className="flex flex-col space-y-1.5 text-xs font-mono">
              <button
                onClick={() => onNavigate('matches')}
                className="text-left text-slate-300 hover:text-lime-400 flex items-center gap-2 cursor-pointer py-0.5 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-lime-500" />
                <span>Fixtures & Results</span>
              </button>
              <button
                onClick={() => onNavigate('teams')}
                className="text-left text-slate-300 hover:text-lime-400 flex items-center gap-2 cursor-pointer py-0.5 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-lime-500" />
                <span>Participating Squads</span>
              </button>
              <button
                onClick={() => onNavigate('stats')}
                className="text-left text-slate-300 hover:text-lime-400 flex items-center gap-2 cursor-pointer py-0.5 transition-colors"
              >
                <Trophy className="w-3.5 h-3.5 text-lime-500" />
                <span>Standings & Stats</span>
              </button>
              <button
                onClick={() => onNavigate('workspace')}
                className="text-left text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer py-0.5 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Organizer Workspace</span>
              </button>
            </div>
          </div>

        </div>

        <div className="mt-8 pt-4 border-t border-[#1f2e26] text-center text-xs font-mono text-slate-500">
          TournX • think.prompt.organise • Retro Football Management
        </div>
      </div>
    </footer>
  );
};
