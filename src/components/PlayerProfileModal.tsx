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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-sm bg-[#0f1411] rounded-2xl border border-[#1f2e26] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#f1f5f9]">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-[#18231c] hover:bg-[#203126] text-slate-400 hover:text-white transition-colors cursor-pointer border border-[#273a2f]"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="p-5 text-center bg-[#141d18] border-b border-[#1f2e26]">
          <div className="flex justify-center mb-3">
            <PlayerAvatar
              player={player}
              team={team}
              size="xl"
            />
          </div>

          <div className="flex items-center justify-center gap-2">
            <h2 className="text-lg font-mono font-bold text-[#f1f5f9] tracking-tight">
              {player.name}
            </h2>
            {player.is_captain && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-extrabold uppercase bg-amber-500 text-black">
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
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-mono text-slate-300 hover:text-lime-400 transition-colors cursor-pointer"
            >
              <TeamBadge team={team} size="xs" />
              <span>{team.name}</span>
              <span className="text-slate-500">• {player.position}</span>
            </button>
          )}
        </div>

        {/* Official Stats Grid */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-[#141d18] rounded-xl border border-[#24352b]">
              <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase">Matches</span>
              <span className="text-lg font-mono font-black text-[#f1f5f9]">{matchesPlayed}</span>
            </div>

            <div className="p-2.5 bg-lime-950/40 rounded-xl border border-lime-800/60">
              <span className="text-[10px] text-lime-400 font-mono font-bold block uppercase">Goals</span>
              <span className="text-lg font-mono font-black text-lime-300">{playerGoals.length}</span>
            </div>

            <div className="p-2.5 bg-amber-950/40 rounded-xl border border-amber-800/60">
              <span className="text-[10px] text-amber-400 font-mono font-bold block uppercase">POTM</span>
              <span className="text-lg font-mono font-black text-amber-300">{playerMotms.length}</span>
            </div>
          </div>

          {/* Clean sheets stat if goalkeeper or defender */}
          {isDefensive && (
            <div className="p-2.5 bg-[#141d18] rounded-xl border border-[#24352b] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-lime-400" />
                <span className="text-slate-300 font-semibold">Clean Sheets Kept</span>
              </div>
              <span className="text-sm font-bold text-lime-400">{cleanSheetsCount}</span>
            </div>
          )}

          {/* Team Standing Context */}
          {standing && team && (
            <div className="p-2.5 bg-[#141d18] rounded-xl border border-[#24352b] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 font-semibold">{team.name} Standing</span>
              </div>
              <span className="text-xs font-bold text-amber-300">
                Rank #{standing.position} ({standing.points} pts)
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#141d18] border-t border-[#1f2e26] text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-[#1a261f] hover:bg-[#203126] border border-[#273a2f] rounded-lg text-xs font-mono font-bold text-slate-300 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
