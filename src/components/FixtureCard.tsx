import React from 'react';
import { Match, Team } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { ChevronRight } from 'lucide-react';

interface FixtureCardProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  onClick?: () => void;
  showRound?: boolean;
  hasActivePoll?: boolean;
}

export const FixtureCard: React.FC<FixtureCardProps> = ({
  match,
  homeTeam,
  awayTeam,
  onClick,
  showRound = false,
  hasActivePoll = false,
}) => {
  const isCompleted = match.status === 'COMPLETED';
  const isLive = match.status === 'LIVE';

  return (
    <div
      onClick={onClick}
      className={`bg-[#19191F] rounded-xl border border-white/10 p-3.5 sm:p-4 transition-all shadow-sm hover:border-[#F02D50]/40 hover:bg-[#1E1E26] ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Top Header: Match Number & Status */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08] text-xs">
        <div className="flex items-center gap-1.5 font-mono font-bold text-[#F0E9E7]">
          <span>MATCH {String(match.match_number).padStart(2, '0')}</span>
          {showRound && (
            <span className="text-[#A5A1A4] font-normal">• Round {match.round_number}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {hasActivePoll && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-tight bg-[#21191D] text-[#F02D50] border border-[#F02D50]/40 animate-pulse">
              POTM VOTE
            </span>
          )}
          {isLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#21191D] text-[#F02D50] border border-[#F02D50]/50">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F02D50] animate-ping" />
              LIVE
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#141418] text-[#A5A1A4] border border-white/10">
              COMPLETED
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-[#141418] text-[#A5A1A4] border border-white/10">
              UPCOMING
            </span>
          )}
        </div>
      </div>

      {/* Teams and Score */}
      <div className="grid grid-cols-7 items-center gap-2 py-1">
        {/* Home team */}
        <div className="col-span-3 flex items-center gap-2">
          <TeamBadge team={homeTeam} size="sm" />
          <div className="truncate">
            <span className="font-bold text-[#F0E9E7] text-xs sm:text-sm block truncate">
              {homeTeam.name}
            </span>
            <span className="text-[10px] text-[#A5A1A4] font-mono truncate block">
              {homeTeam.manager_name}
            </span>
          </div>
        </div>

        {/* Center Score or VS */}
        <div className="col-span-1 flex flex-col items-center justify-center text-center">
          {isCompleted ? (
            <div className="font-score font-extrabold text-sm sm:text-base text-[#F0E9E7] tracking-tight bg-[#21191D] px-2.5 py-0.5 rounded-lg border border-[#F02D50]/30">
              {match.home_score} — {match.away_score}
            </div>
          ) : isLive ? (
            <div className="font-score font-extrabold text-sm text-[#F02D50] bg-[#21191D] px-2.5 py-0.5 rounded-lg border border-[#F02D50]/50 animate-pulse">
              {match.home_score ?? 0} — {match.away_score ?? 0}
            </div>
          ) : (
            <span className="text-[11px] font-mono font-bold text-[#F02D50] bg-[#141418] border border-white/10 px-2 py-0.5 rounded">
              VS
            </span>
          )}
        </div>

        {/* Away team */}
        <div className="col-span-3 flex items-center justify-end gap-2 text-right">
          <div className="truncate">
            <span className="font-bold text-[#F0E9E7] text-xs sm:text-sm block truncate">
              {awayTeam.name}
            </span>
            <span className="text-[10px] text-[#A5A1A4] font-mono truncate block">
              {awayTeam.manager_name}
            </span>
          </div>
          <TeamBadge team={awayTeam} size="sm" />
        </div>
      </div>

      {/* Date, Time, Venue or TBA */}
      <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#A5A1A4] font-mono">
        <div className="truncate">
          <span>{match.scheduled_date || 'Date: TBA'}</span>
          <span className="mx-1.5 text-white/20">•</span>
          <span>{match.scheduled_time || 'Time: TBA'}</span>
          <span className="mx-1.5 text-white/20">•</span>
          <span>{match.venue || 'Venue: TBA'}</span>
        </div>

        {onClick && (
          <ChevronRight className="w-4 h-4 text-[#F02D50] shrink-0 ml-1" />
        )}
      </div>
    </div>
  );
};
