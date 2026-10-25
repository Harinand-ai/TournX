import React, { useEffect } from 'react';
import { Player, Team, Match, Goal, ManOfTheMatch, TeamStanding } from '../types/tournament';
import { PlayerAvatar } from './PlayerAvatar';
import { TeamBadge } from './TeamBadge';
import { X, Shield, Trophy } from 'lucide-react';

interface PlayerProfileModalProps {
  player: Player | null;
  team?: Team;
  matches: Match[];
  goals: Goal[];
  assists?: any[];
  motms: ManOfTheMatch[];
  standings: TeamStanding[];
  allPlayers: Player[];
  allTeams: Team[];
  onClose: () => void;
  onNavigateToTeam?: (teamId: string) => void;
  onNavigateToMatch?: (matchId: string) => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  player,
  team,
  matches,
  goals,
  motms,
  standings,
  onClose,
  onNavigateToTeam,
}) => {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Lock scroll while modal open
  useEffect(() => {
    if (player) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [player]);

  if (!player) return null;

  // Real statistics computation
  const teamMatches = matches.filter(
    m => m.home_team_id === player.team_id || m.away_team_id === player.team_id
  );
  const completedMatches = teamMatches.filter(m => m.status === 'COMPLETED');
  const matchesPlayed = completedMatches.length;

  const playerGoals = goals.filter(g => g.player_id === player.id);
  const playerMotms = motms.filter(m => m.player_id === player.id);

  const isDefensive = player.position === 'GK' || player.position === 'CB';
  const cleanSheetsCount = completedMatches.filter(m => {
    const isHome = m.home_team_id === player.team_id;
    return isHome ? m.away_score === 0 : m.home_score === 0;
  }).length;

  const standing = standings.find(s => s.team.id === player.team_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="relative w-full max-w-sm bg-[#19191F] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#F0E9E7]">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[#141418] hover:bg-[#202028] text-[#A5A1A4] hover:text-[#F0E9E7] transition-colors cursor-pointer border border-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="p-6 text-center bg-[#141418] border-b border-white/[0.08]">
          <div className="flex justify-center mb-3">
            <PlayerAvatar
              player={player}
              team={team}
              size="xl"
            />
          </div>

          <div className="flex items-center justify-center gap-2">
            <h2 className="text-lg font-display font-bold text-[#F0E9E7] tracking-tight">
              {player.name}
            </h2>
            {player.is_captain && (
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#F02D50] text-white">
                CAPTAIN
              </span>
            )}
          </div>

          {team && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateToTeam?.(team.id);
              }}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-mono text-[#A5A1A4] hover:text-[#F02D50] transition-colors cursor-pointer"
            >
              <TeamBadge team={team} size="xs" />
              <span>{team.name}</span>
              <span className="text-[#6E6A6D]">• {player.position}</span>
            </button>
          )}
        </div>

        {/* Official Stats Grid */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-3 bg-[#101013] rounded-xl border border-white/10">
              <span className="text-[10px] text-[#A5A1A4] font-mono font-bold block uppercase">Matches</span>
              <span className="text-lg font-score font-black text-[#F0E9E7]">{matchesPlayed}</span>
            </div>

            <div className="p-3 bg-[#21191D] rounded-xl border border-[#F02D50]/40">
              <span className="text-[10px] text-[#F02D50] font-mono font-bold block uppercase">Goals</span>
              <span className="text-lg font-score font-black text-[#F02D50]">{playerGoals.length}</span>
            </div>

            <div className="p-3 bg-[#21191D] rounded-xl border border-amber-800/40">
              <span className="text-[10px] text-amber-400 font-mono font-bold block uppercase">POTM</span>
              <span className="text-lg font-score font-black text-amber-300">{playerMotms.length}</span>
            </div>
          </div>

          {/* Clean sheets stat if goalkeeper or defender */}
          {isDefensive && (
            <div className="p-2.5 bg-[#101013] rounded-xl border border-white/10 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#F02D50]" />
                <span className="text-[#A5A1A4]">Clean Sheets Kept</span>
              </div>
              <span className="text-sm font-bold text-[#F0E9E7]">{cleanSheetsCount}</span>
            </div>
          )}

          {/* Team Standing Context */}
          {standing && team && (
            <div className="p-2.5 bg-[#101013] rounded-xl border border-white/10 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#F02D50]" />
                <span className="text-[#A5A1A4]">{team.name} Standing</span>
              </div>
              <span className="text-xs font-bold text-[#F0E9E7]">
                Rank #{standing.position} ({standing.points} pts)
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#141418] border-t border-white/[0.08] text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-[#19191F] hover:bg-[#202028] border border-white/10 rounded-lg text-xs font-mono font-bold text-[#F0E9E7] uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
