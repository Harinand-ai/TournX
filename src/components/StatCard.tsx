import React from 'react';
import { PlayerStatEntry, Player } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { PlayerAvatar } from './PlayerAvatar';
import { LucideIcon, ChevronRight } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface StatCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  entries: PlayerStatEntry[];
  valueLabel: string;
  emptyTitle?: string;
  emptyDescription?: string;
  allPlayers?: Player[];
  onSelectPlayer?: (playerId: string) => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  entries,
  valueLabel,
  emptyTitle = 'NO DATA YET',
  emptyDescription = 'Statistics will appear once tournament matches are completed.',
  allPlayers = [],
  onSelectPlayer,
}) => {
  const playersMap = React.useMemo(() => new Map(allPlayers.map(p => [p.id, p])), [allPlayers]);

  return (
    <div className="rounded-2xl bg-[#19191F] border border-white/10 overflow-hidden shadow-xl flex flex-col">
      {/* Header */}
      <div className="p-4 bg-[#141418] border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#21191D] border border-[#F02D50]/40 flex items-center justify-center text-[#F02D50]">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#F0E9E7] uppercase tracking-tight font-display">
              {title}
            </h3>
            <p className="text-[11px] text-[#A5A1A4]">{subtitle}</p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-[#A5A1A4] uppercase tracking-wider">
          {valueLabel}
        </span>
      </div>

      {/* Body */}
      <div className="p-2 sm:p-3 flex-1">
        {entries.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            icon={Icon}
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {entries.slice(0, 10).map((entry, index) => {
              const rank = index + 1;
              const isLeader = rank === 1;

              return (
                <div
                  key={entry.player_id}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                    isLeader ? 'bg-[#21191D]/40 border border-[#F02D50]/30' : 'hover:bg-[#202028]'
                  } ${onSelectPlayer ? 'cursor-pointer group' : ''}`}
                  onClick={() => onSelectPlayer?.(entry.player_id)}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-score font-bold text-base w-6 text-center ${
                        isLeader ? 'text-[#F02D50]' : 'text-[#A5A1A4]'
                      }`}
                    >
                      {rank}
                    </span>

                    {playersMap.get(entry.player_id) ? (
                      <PlayerAvatar
                        player={playersMap.get(entry.player_id)!}
                        team={entry.team}
                        size="xs"
                      />
                    ) : (
                      <TeamBadge team={entry.team} size="xs" />
                    )}

                    <div className="min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-[#F0E9E7] block truncate group-hover:text-[#F02D50] transition-colors">
                        {entry.player_name}
                      </span>
                      <span className="text-[10px] text-[#A5A1A4] font-mono truncate block">
                        {entry.team.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-score font-extrabold text-base text-[#F02D50]">
                      {entry.value}
                    </span>
                    {onSelectPlayer && (
                      <ChevronRight className="w-3.5 h-3.5 text-[#A5A1A4] group-hover:text-[#F02D50] group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
