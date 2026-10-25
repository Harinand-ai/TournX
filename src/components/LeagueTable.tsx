import React from 'react';
import { TeamStanding } from '../types/tournament';
import { TeamBadge } from './TeamBadge';
import { ChevronRight, Trophy } from 'lucide-react';

interface LeagueTableProps {
  standings: TeamStanding[];
  onTeamClick?: (teamId: string) => void;
  isCompact?: boolean;
}

export const LeagueTable: React.FC<LeagueTableProps> = ({
  standings,
  onTeamClick,
  isCompact = false,
}) => {
  return (
    <div className="w-full overflow-hidden rounded-2xl bg-[#19191F] border border-white/10 shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-[#141418] border-b border-white/[0.08] text-[10px] font-mono font-bold uppercase tracking-wider text-[#A5A1A4]">
              <th className="py-3 px-3 text-center w-10">POS</th>
              <th className="py-3 px-3 font-bold">CLUB</th>
              <th className="py-3 px-2 text-center w-8">P</th>
              {!isCompact && (
                <>
                  <th className="py-3 px-2 text-center w-8 hidden sm:table-cell">W</th>
                  <th className="py-3 px-2 text-center w-8 hidden sm:table-cell">D</th>
                  <th className="py-3 px-2 text-center w-8 hidden sm:table-cell">L</th>
                  <th className="py-3 px-2 text-center w-9 hidden md:table-cell">GF</th>
                  <th className="py-3 px-2 text-center w-9 hidden md:table-cell">GA</th>
                </>
              )}
              <th className="py-3 px-2 text-center w-10">GD</th>
              <th className="py-3 px-3 text-center w-12 text-[#F02D50] font-black font-score text-xs sm:text-sm">PTS</th>
              {!isCompact && (
                <th className="py-3 px-3 text-center hidden lg:table-cell">FORM</th>
              )}
              {onTeamClick && <th className="py-3 px-2 w-6"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05] text-[#F0E9E7]">
            {standings.map((row) => {
              const isLeader = row.position === 1;

              return (
                <tr
                  key={row.team.id}
                  onClick={() => onTeamClick && onTeamClick(row.team.id)}
                  className={`transition-colors duration-150 ${
                    onTeamClick ? 'cursor-pointer hover:bg-[#202028]' : ''
                  } ${isLeader ? 'bg-[#21191D]/40' : ''}`}
                >
                  {/* Position */}
                  <td className="py-3.5 px-3 text-center font-bold">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-mono font-bold ${
                        isLeader
                          ? 'bg-[#21191D] border border-[#F02D50]/50 text-[#F02D50]'
                          : 'text-[#A5A1A4]'
                      }`}
                    >
                      {row.position}
                    </span>
                  </td>

                  {/* Team */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <TeamBadge team={row.team} size="sm" />
                      <div className="min-w-0">
                        <span className="font-bold text-[#F0E9E7] block text-xs sm:text-sm tracking-tight truncate font-display">
                          {row.team.name}
                        </span>
                        <span className="text-[10px] text-[#A5A1A4] font-mono block truncate">
                          {row.team.manager_name}
                        </span>
                      </div>
                      {isLeader && (
                        <Trophy className="w-3.5 h-3.5 text-[#F02D50] shrink-0 hidden sm:inline" />
                      )}
                    </div>
                  </td>

                  {/* Played */}
                  <td className="py-3.5 px-2 text-center font-mono font-semibold text-[#A5A1A4]">
                    {row.played}
                  </td>

                  {/* W / D / L / GF / GA */}
                  {!isCompact && (
                    <>
                      <td className="py-3.5 px-2 text-center text-[#F0E9E7] font-mono hidden sm:table-cell">
                        {row.won}
                      </td>
                      <td className="py-3.5 px-2 text-center text-[#A5A1A4] font-mono hidden sm:table-cell">
                        {row.drawn}
                      </td>
                      <td className="py-3.5 px-2 text-center text-[#A5A1A4] font-mono hidden sm:table-cell">
                        {row.lost}
                      </td>
                      <td className="py-3.5 px-2 text-center text-[#F0E9E7] font-mono hidden md:table-cell">
                        {row.goals_for}
                      </td>
                      <td className="py-3.5 px-2 text-center text-[#A5A1A4] font-mono hidden md:table-cell">
                        {row.goals_against}
                      </td>
                    </>
                  )}

                  {/* Goal Difference */}
                  <td className="py-3.5 px-2 text-center font-mono font-semibold">
                    <span
                      className={
                        row.goal_difference > 0
                          ? 'text-[#F0E9E7] font-bold'
                          : row.goal_difference < 0
                          ? 'text-rose-400'
                          : 'text-[#A5A1A4]'
                      }
                    >
                      {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                    </span>
                  </td>

                  {/* Points */}
                  <td className="py-3.5 px-3 text-center font-score font-black text-sm sm:text-base text-[#F02D50]">
                    {row.points}
                  </td>

                  {/* Form */}
                  {!isCompact && (
                    <td className="py-3.5 px-3 text-center hidden lg:table-cell">
                      <div className="flex items-center justify-center gap-1 font-mono">
                        {row.form.length === 0 ? (
                          <span className="text-[#A5A1A4] text-xs">-</span>
                        ) : (
                          row.form.slice(-5).map((res, i) => (
                            <span
                              key={i}
                              className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                                res === 'W'
                                  ? 'bg-[#F02D50] text-white'
                                  : res === 'D'
                                  ? 'bg-[#2E2E38] text-[#F0E9E7]'
                                  : 'bg-[#21191D] text-rose-300 border border-rose-900/50'
                              }`}
                            >
                              {res}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  )}

                  {/* Arrow Indicator */}
                  {onTeamClick && (
                    <td className="py-3.5 px-2 text-right">
                      <ChevronRight className="w-4 h-4 text-[#A5A1A4]" />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-5 py-2.5 bg-[#141418] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#A5A1A4] font-mono">
        <span>Win = 3 pts • Draw = 1 pt • Loss = 0 pts</span>
        <span>Points → GD → Goals For</span>
      </div>
    </div>
  );
};
