import React from 'react';
import { Trophy, Shield, Calendar, Users } from 'lucide-react';
import { DEMO_TEAMS } from '../data/syntheticData';

interface FooterProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-[#241a12] border-t-4 border-[#120d08] text-[#c7b49d] mt-16 pb-16 md:pb-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          {/* Brand info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#4a7227] border-2 border-[#120d08] flex items-center justify-center text-[#ffff55] font-bold text-xs">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <span className="font-black text-white text-xs mc-title-yellow">
                Tourn<span className="text-[#55ff55]">X</span>
              </span>
            </div>
            <p className="text-xs text-[#a89680] font-mono">
              think.prompt.organise
            </p>
            <p className="text-xs text-[#a89680]">
              Independent Football Tournament Management Platform.
            </p>
          </div>

          {/* Clubs */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-[#ffff55] mb-2">
              Tournament Clubs
            </h4>
            <ul className="space-y-1 text-sm">
              {DEMO_TEAMS.map(team => (
                <li key={team.id}>
                  <button
                    onClick={() => onNavigate('team-detail', team.id)}
                    className="hover:text-[#ffff55] text-left flex items-center justify-between w-full group py-0.5 cursor-pointer"
                  >
                    <span className="font-bold text-[#f0e4cf] group-hover:text-[#ffff55]">
                      {team.name}
                    </span>
                    <span className="text-xs text-[#968470]">
                      {team.manager_name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Shortcuts */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-[#ffff55] mb-2">
              Navigation
            </h4>
            <div className="flex flex-col space-y-1 text-sm">
              <button
                onClick={() => onNavigate('matches')}
                className="text-left text-[#f0e4cf] hover:text-[#ffff55] flex items-center gap-1.5 cursor-pointer py-0.5"
              >
                <Calendar className="w-3 h-3 text-[#55ff55]" />
                <span>Fixtures & Results</span>
              </button>
              <button
                onClick={() => onNavigate('teams')}
                className="text-left text-[#f0e4cf] hover:text-[#ffff55] flex items-center gap-1.5 cursor-pointer py-0.5"
              >
                <Shield className="w-3 h-3 text-[#55ffff]" />
                <span>Participating Squads</span>
              </button>
              <button
                onClick={() => onNavigate('stats')}
                className="text-left text-[#f0e4cf] hover:text-[#ffff55] flex items-center gap-1.5 cursor-pointer py-0.5"
              >
                <Trophy className="w-3 h-3 text-[#ffaa00]" />
                <span>Standings & Stats</span>
              </button>
              <button
                onClick={() => onNavigate('admin')}
                className="text-left text-[#968470] hover:text-white flex items-center gap-1.5 cursor-pointer py-0.5"
              >
                <Users className="w-3 h-3" />
                <span>Admin Operations</span>
              </button>
            </div>
          </div>

        </div>

        <div className="mt-8 pt-4 border-t-2 border-[#19110a] text-center text-xs text-[#806f5e]">
          TournX • think.prompt.organise • Football Tournament Manager (Development Mode)
        </div>
      </div>
    </footer>
  );
};
