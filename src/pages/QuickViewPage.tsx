import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Activity, Trophy } from 'lucide-react';
import { localDataService } from '../services/localDataService';

interface QuickViewPageProps {
  onReturn: () => void;
  returnLabel?: string;
}

export const QuickViewPage: React.FC<QuickViewPageProps> = ({
  onReturn,
  returnLabel = 'More Details',
}) => {
  const teams = localDataService.getTeams();
  const matches = localDataService.getMatches();

  return (
    <div className="relative space-y-4">
      
      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-[#241a12] border border-[#362b21] shadow-md"
      >
        <button
          onClick={onReturn}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4a7227] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#5b8c30] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to {returnLabel}</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
          <Activity className="w-3.5 h-3.5" />
          <span>TournX • think.prompt.organise</span>
        </div>
      </motion.div>

      {/* Main Container */}
      <div className="p-6 rounded-xl bg-[#1e150e] border border-[#362b21] space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#4a7227] text-[#ffff55] mx-auto">
            <Trophy className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight">
            TournX Quick Overview
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            think.prompt.organise
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-center">
          <div className="p-3 bg-[#2a1e14] rounded-lg border border-[#3d2c1e]">
            <div className="text-2xl font-black text-[#55ff55]">{teams.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Teams</div>
          </div>
          <div className="p-3 bg-[#2a1e14] rounded-lg border border-[#3d2c1e]">
            <div className="text-2xl font-black text-[#ffff55]">{matches.length}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Fixtures</div>
          </div>
        </div>
      </div>

    </div>
  );
};
