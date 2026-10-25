import React from 'react';
import { Match, Team } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';

interface BroadcastMatchHeroProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  onClick: () => void;
}

export const BroadcastMatchHero: React.FC<BroadcastMatchHeroProps> = ({
  match,
  homeTeam,
  awayTeam,
  onClick,
}) => {
  const isCompleted = match.status === 'COMPLETED';
  const isLive = match.status === 'LIVE';

  return (
    <div
      onClick={onClick}
      className={`group w-full overflow-hidden rounded-2xl bg-[#19191F] border transition-all cursor-pointer shadow-xl ${
        isLive
          ? 'border-[#F02D50]/60 hover:border-[#F02D50] bg-gradient-to-b from-[#1E1418] to-[#141419]'
          : 'border-white/10 hover:border-white/25 hover:bg-[#1E1E26]'
      }`}
    >
      {/* Top Match Header Strip */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#141418] border-b border-white/[0.08] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold tracking-wider text-[#A5A1A4]">
            ROUND {match.round_number} • MATCH {String(match.match_number).padStart(2, '0')}
          </span>
        </div>

        <div>
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#21191D] text-[#F02D50] border border-[#F02D50]/40 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F02D50] animate-ping" />
              LIVE MATCH
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#141418] text-[#A5A1A4] border border-white/10">
              FULL TIME
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#141418] text-[#F0E9E7] border border-white/10">
              UPCOMING
            </span>
          )}
        </div>
      </div>

      {/* Main Fixture Presentation */}
      <div className="p-5 sm:p-7">
        <div className="grid grid-cols-11 items-center gap-3">
          
          {/* HOME TEAM */}
          <div className="col-span-5 flex flex-col items-center text-center">
            <TeamBadge team={homeTeam} size="lg" />
            <h3 className="font-display font-extrabold text-base sm:text-lg text-[#F0E9E7] mt-2 line-clamp-1">
              {homeTeam.name}
            </h3>
            <span className="text-[11px] text-[#A5A1A4] font-mono mt-0.5">
              Mgr: {homeTeam.manager_name || 'Coach'}
            </span>
          </div>

          {/* VS / SCORE BADGE */}
          <div className="col-span-1 flex flex-col items-center justify-center">
            {isCompleted ? (
              <div className="px-3.5 py-1.5 rounded-xl bg-[#21191D] border border-[#F02D50]/30 font-score font-extrabold text-xl sm:text-2xl text-[#F0E9E7] shadow-inner">
                <span>{match.home_score}</span>
                <span className="mx-1.5 text-[#A5A1A4]">-</span>
                <span>{match.away_score}</span>
              </div>
            ) : isLive ? (
              <div className="px-3.5 py-1.5 rounded-xl bg-[#21191D] border border-[#F02D50]/60 font-score font-extrabold text-xl sm:text-2xl text-[#F02D50] shadow-[0_0_15px_rgba(240, 45, 80,0.3)] animate-pulse">
                <span>{match.home_score ?? 0}</span>
                <span className="mx-1 text-[#F0E9E7]">-</span>
                <span>{match.away_score ?? 0}</span>
              </div>
            ) : (
              <span className="w-8 h-8 rounded-full bg-[#141418] border border-white/10 text-[#F02D50] flex items-center justify-center text-xs font-mono font-bold">
                VS
              </span>
            )}
          </div>

          {/* AWAY TEAM */}
          <div className="col-span-5 flex flex-col items-center text-center">
            <TeamBadge team={awayTeam} size="lg" />
            <h3 className="font-display font-extrabold text-base sm:text-lg text-[#F0E9E7] mt-2 line-clamp-1">
              {awayTeam.name}
            </h3>
            <span className="text-[11px] text-[#A5A1A4] font-mono mt-0.5">
              Mgr: {awayTeam.manager_name || 'Coach'}
            </span>
          </div>

        </div>

        {/* Match Logistics Footnote */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs text-[#A5A1A4]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#F02D50]" />
              <span>{match.scheduled_date || 'Date TBA'}</span>
            </span>

            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#F02D50]" />
              <span>{match.scheduled_time || 'Time TBA'}</span>
            </span>

            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#F02D50]" />
              <span>{match.venue || 'Venue TBA'}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-[#F02D50] font-semibold text-xs group-hover:translate-x-0.5 transition-transform font-mono">
            <span>Match Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

      </div>
    </div>
  );
};
