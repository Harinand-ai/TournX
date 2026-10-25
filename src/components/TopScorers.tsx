import React from 'react';
import { motion } from 'framer-motion';
import { PlayerStatEntry, Player } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { PlayerAvatar } from './PlayerAvatar';
import { Flame, ChevronRight } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface TopScorersProps {
  scorers: PlayerStatEntry[];
  limit?: number;
  allPlayers?: Player[];
  onSelectPlayer?: (playerId: string) => void;
  onViewAll?: () => void;
}

export const TopScorers: React.FC<TopScorersProps> = ({
  scorers,
  limit = 5,
  allPlayers = [],
  onSelectPlayer,
  onViewAll,
}) => {
  const playersMap = React.useMemo(() => new Map(allPlayers.map(p => [p.id, p])), [allPlayers]);
  const displayScorers = limit ? scorers.slice(0, limit) : scorers;

  if (displayScorers.length === 0) {
    return (
      <EmptyState
        title="NO GOALSCORER DATA YET"
        description="Goalscorer statistics will appear after matches are completed."
        icon={Flame}
      />
    );
  }

  return (
    <div className="w-full rounded-2xl bg-[#19191F] border border-white/10 overflow-hidden shadow-xl">
      <div className="divide-y divide-white/[0.06]">
        {displayScorers.map((entry, index) => {
          const rank = index + 1;
          const isGoldenBoot = rank === 1;

          return (
            <motion.div
              key={entry.player_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => onSelectPlayer?.(entry.player_id)}
              className={`flex items-center justify-between p-4 transition-all ${
                isGoldenBoot ? 'bg-[#21191D]/40 border-l-2 border-[#F02D50]' : 'hover:bg-[#202028]'
              } ${onSelectPlayer ? 'cursor-pointer group' : ''}`}
            >
              {/* Rank & Player info */}
              <div className="flex items-center gap-3.5">
                <span
                  className={`font-score font-black text-xl sm:text-2xl w-8 text-center ${
                    isGoldenBoot
                      ? 'text-[#F02D50]'
                      : 'text-[#A5A1A4]'
                  }`}
                >
                  {rank}
                </span>

                {playersMap.get(entry.player_id) ? (
                  <PlayerAvatar
                    player={playersMap.get(entry.player_id)!}
                    team={entry.team}
                    size="sm"
                  />
                ) : (
                  <TeamBadge team={entry.team} size="sm" />
                )}

                <div>
                  <h4 className="font-display font-extrabold text-sm text-[#F0E9E7] tracking-tight uppercase group-hover:text-[#F02D50] transition-colors">
                    {entry.player_name}
                  </h4>
                  <p className="text-[11px] text-[#A5A1A4] font-mono">
                    {entry.team.name}
                  </p>
                </div>
              </div>

              {/* Goals counter */}
              <div className="flex items-center gap-3">
                <div className="text-right font-mono">
                  <span className="font-score font-black text-xl sm:text-2xl text-[#F02D50]">
                    {entry.value}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#A5A1A4] block -mt-1">
                    {entry.value === 1 ? 'GOAL' : 'GOALS'}
                  </span>
                </div>
                {onSelectPlayer && (
                  <ChevronRight className="w-4 h-4 text-[#A5A1A4] group-hover:text-[#F02D50] transition-colors" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {onViewAll && scorers.length > limit && (
        <div className="p-3 bg-[#141418] border-t border-white/[0.08] text-center font-mono">
          <button
            onClick={onViewAll}
            className="text-xs font-bold uppercase tracking-wider text-[#F02D50] hover:text-[#F0E9E7] transition-colors cursor-pointer"
          >
            View Full Leaderboard →
          </button>
        </div>
      )}
    </div>
  );
};
