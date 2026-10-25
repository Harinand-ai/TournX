import React from 'react';
import { Match, Team, Goal, ManOfTheMatch, Player } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { Award, ChevronRight } from 'lucide-react';

interface ResultCardProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  goals?: Goal[];
  motm?: ManOfTheMatch;
  players?: Player[];
  onClick?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  match,
  homeTeam,
  awayTeam,
  goals = [],
  motm,
  players = [],
  onClick,
}) => {
  const homeGoals = goals.filter(g => g.team_id === homeTeam.id);
  const awayGoals = goals.filter(g => g.team_id === awayTeam.id);

  const playersMap = new Map(players.map(p => [p.id, p]));
  const motmPlayer = motm ? playersMap.get(motm.player_id) : null;

  return (
    <div
      onClick={onClick}
      className="group rounded-2xl bg-[#19191F] border border-white/10 hover:border-[#F02D50]/40 hover:bg-[#1E1E26] transition-all shadow-md cursor-pointer overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#141418] border-b border-white/[0.08] text-xs font-mono">
        <span className="font-bold text-[#A5A1A4]">
          ROUND {match.round_number} • MATCH {String(match.match_number).padStart(2, '0')}
        </span>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#101013] text-[#A5A1A4] border border-white/10">
          COMPLETED
        </span>
      </div>

      {/* Main Score Area */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-7 items-center gap-2">
          {/* Home team */}
          <div className="col-span-3 flex items-center gap-2.5">
            <TeamBadge team={homeTeam} size="md" />
            <div className="min-w-0">
              <span className="font-bold text-sm sm:text-base text-[#F0E9E7] block truncate font-display">
                {homeTeam.name}
              </span>
              <span className="text-[11px] text-[#A5A1A4] font-mono truncate block">
                Mgr: {homeTeam.manager_name}
              </span>
            </div>
          </div>

          {/* Scores */}
          <div className="col-span-1 flex items-center justify-center">
            <div className="px-3.5 py-1 rounded-xl bg-[#21191D] border border-[#F02D50]/30 font-score font-black text-base sm:text-xl text-[#F0E9E7] flex items-center gap-1.5 shadow-inner">
              <span>{match.home_score ?? 0}</span>
              <span className="text-[#A5A1A4] font-normal">-</span>
              <span>{match.away_score ?? 0}</span>
            </div>
          </div>

          {/* Away team */}
          <div className="col-span-3 flex flex-row-reverse items-center gap-2.5 text-right">
            <TeamBadge team={awayTeam} size="md" />
            <div className="min-w-0">
              <span className="font-bold text-sm sm:text-base text-[#F0E9E7] block truncate font-display">
                {awayTeam.name}
              </span>
              <span className="text-[11px] text-[#A5A1A4] font-mono truncate block">
                Mgr: {awayTeam.manager_name}
              </span>
            </div>
          </div>
        </div>

        {/* Goalscorers strip if any */}
        {(homeGoals.length > 0 || awayGoals.length > 0) && (
          <div className="mt-3.5 pt-3 border-t border-white/[0.08] grid grid-cols-2 gap-4 text-xs text-[#A5A1A4] font-mono">
            <div>
              {homeGoals.map(g => {
                const player = playersMap.get(g.player_id);
                return (
                  <div key={g.id} className="flex items-center gap-1.5">
                    <span className="text-[#F02D50]">⚽</span>
                    <span className="font-semibold text-[#F0E9E7]">{player?.name || 'Goal'}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-right">
              {awayGoals.map(g => {
                const player = playersMap.get(g.player_id);
                return (
                  <div key={g.id} className="flex items-center justify-end gap-1.5">
                    <span className="font-semibold text-[#F0E9E7]">{player?.name || 'Goal'}</span>
                    <span className="text-[#F02D50]">⚽</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Man of the match highlight */}
        {motmPlayer && (
          <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-amber-300 font-mono font-medium">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>POTM: <strong className="text-[#F0E9E7]">{motmPlayer.name}</strong></span>
            </div>
            <div className="flex items-center gap-1 text-[#F02D50] font-semibold group-hover:translate-x-0.5 transition-transform font-mono text-xs">
              <span>View Match</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
