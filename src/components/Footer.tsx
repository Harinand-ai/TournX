import React from 'react';
import { TournXLogo } from './TournXLogo';

interface FooterProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-[#101013] border-t border-white/[0.08] text-[#A5A1A4] mt-16 pb-16 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Brand info */}
          <div className="flex items-center gap-3">
            <TournXLogo size="sm" showTagline={true} />
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <button
              type="button"
              onClick={() => onNavigate('landing')}
              className="text-[#A5A1A4] hover:text-[#F0E9E7] transition cursor-pointer"
            >
              Start
            </button>
            <span className="text-white/20">•</span>
            <button
              type="button"
              onClick={() => onNavigate('workspace')}
              className="text-[#A5A1A4] hover:text-[#F0E9E7] transition cursor-pointer"
            >
              Organizer Workspace
            </button>
            <span className="text-white/20">•</span>
            <button
              type="button"
              onClick={() => onNavigate('public-tournament')}
              className="text-[#A5A1A4] hover:text-[#F0E9E7] transition cursor-pointer"
            >
              Scoreboard
            </button>
          </div>

        </div>

        <div className="mt-6 pt-4 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#6E6A6D] font-mono">
          <span>TournX • Obsidian & Crimson Football Technology</span>
          <span>think • prompt • organise</span>
        </div>
      </div>
    </footer>
  );
};
