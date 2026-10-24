import React from 'react';
import { Trophy, Shield, Calendar } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-[#faf9f5] border-t border-[#e5e3d8] text-[#57635a] mt-16 pb-16 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Brand info */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#0f1712] rounded-lg flex items-center justify-center text-white shadow-xs">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <span className="font-extrabold text-[#0f1712] text-sm tracking-tight font-sans">
                Tourn<span className="text-emerald-700">X</span>
              </span>
              <span className="text-xs text-[#57635a] ml-2 font-medium">
                think • prompt • organise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => onNavigate('landing')}
              className="hover:text-[#0f1712] transition cursor-pointer"
            >
              Start
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onNavigate('workspace')}
              className="hover:text-[#0f1712] transition cursor-pointer"
            >
              Organizer Workspace
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onNavigate('public-tournament')}
              className="hover:text-[#0f1712] transition cursor-pointer"
            >
              Scoreboard
            </button>
          </div>

        </div>

        <div className="mt-6 pt-4 border-t border-[#e5e3d8] text-center text-xs text-[#8a968d] font-sans">
          TournX • Natural Language Football Management Platform
        </div>
      </div>
    </footer>
  );
};
