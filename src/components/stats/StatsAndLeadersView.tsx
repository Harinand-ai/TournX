import React, { useMemo } from 'react';
import { Trophy, Award, Flame, Star, Shield, User } from 'lucide-react';
import { Goal, ManOfTheMatch, Player, Team, Match } from '../../types/tournament';
import { getTopScorers, getMotmLeaderboard } from '../../utils/leagueCalculations';
import { TeamBadge } from '../TeamBadge';

interface StatsAndLeadersViewProps {
  goals: Goal[];
  motms: ManOfTheMatch[];
  players: Player[];
  teams: Team[];
  matches: Match[];
  theme?: 'editorial' | 'minecraft';
}

export function StatsAndLeadersView({
  goals,
  motms,
  players,
  teams,
  matches,
  theme = 'editorial',
}: StatsAndLeadersViewProps) {
  const isMinecraft = theme === 'minecraft';

  const playersMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const matchesMap = useMemo(() => new Map(matches.map(m => [m.id, m])), [matches]);

  const topScorers = useMemo(() => {
    return getTopScorers(goals, players, teams);
  }, [goals, players, teams]);

  const motmLeaders = useMemo(() => {
    return getMotmLeaderboard(motms, players, teams);
  }, [motms, players, teams]);

  // Map of player_id to array of match numbers where they won POTM
  const playerMotmMatches = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const m of motms) {
      const matchObj = matchesMap.get(m.match_id);
      if (matchObj) {
        const list = map.get(m.player_id) || [];
        list.push(matchObj.match_number);
        map.set(m.player_id, list);
      }
    }
    return map;
  }, [motms, matchesMap]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. TOP GOALSCORERS */}
        <div className={`p-5 rounded-2xl ${
          isMinecraft
            ? 'stadium-card text-emerald-100'
            : 'bg-white border border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-200/50">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${
                isMinecraft ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-sm font-black uppercase tracking-wider ${
                  isMinecraft ? 'font-pixel text-emerald-300' : 'text-slate-900'
                }`}>
                  Top Goalscorers
                </h3>
                <span className="text-[11px] text-slate-500">
                  Golden Boot Race
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              isMinecraft ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/30' : 'bg-slate-100 text-slate-600'
            }`}>
              {goals.length} Goals Total
            </span>
          </div>

          {topScorers.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Flame className={`w-8 h-8 mx-auto stroke-[1.5] ${
                isMinecraft ? 'text-emerald-900/80' : 'text-slate-300'
              }`} />
              <p className={`text-xs font-semibold ${isMinecraft ? 'text-slate-400' : 'text-slate-500'}`}>
                No goals have been recorded yet.
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Goal events entered during completed or live matches will dynamically populate this leaderboard.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {topScorers.map((scorer, idx) => {
                const player = playersMap.get(scorer.player_id);
                const rank = idx + 1;
                const isLeader = rank === 1;

                return (
                  <div
                    key={scorer.player_id}
                    className={`flex items-center justify-between p-3 rounded-xl transition ${
                      isMinecraft
                        ? 'bg-slate-900/60 border border-emerald-950/80 hover:border-emerald-500/40'
                        : isLeader
                        ? 'bg-emerald-50/50 border border-emerald-200/80'
                        : 'bg-slate-50/70 border border-slate-100 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Badge */}
                      <span className={`w-6 text-center font-black text-xs ${
                        isLeader
                          ? 'text-amber-500 font-pixel'
                          : rank === 2
                          ? 'text-slate-400'
                          : rank === 3
                          ? 'text-amber-700'
                          : 'text-slate-400'
                      }`}>
                        #{rank}
                      </span>

                      {/* Player Avatar */}
                      <div className="relative shrink-0">
                        {player?.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={scorer.player_name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-300"
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isMinecraft
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {scorer.player_name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        {isLeader && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow-xs">
                            <Star className="w-2.5 h-2.5 fill-slate-900" />
                          </div>
                        )}
                      </div>

                      {/* Player Details */}
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate flex items-center gap-1.5">
                          <span className={isMinecraft ? 'text-slate-100' : 'text-slate-900'}>
                            {scorer.player_name}
                          </span>
                          {player?.position && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({player.position})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate mt-0.5">
                          {scorer.team && <TeamBadge team={scorer.team} size="xs" />}
                          <span className="truncate">{scorer.team?.name || 'Club'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Goals Count */}
                    <div className="text-right shrink-0 pl-3">
                      <span className={`text-base font-black ${
                        isMinecraft ? 'font-pixel text-emerald-400' : 'text-emerald-700'
                      }`}>
                        {scorer.value}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1 font-semibold uppercase">
                        {scorer.value === 1 ? 'Goal' : 'Goals'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. PLAYER OF THE MATCH (POTM) */}
        <div className={`p-5 rounded-2xl ${
          isMinecraft
            ? 'stadium-card text-emerald-100'
            : 'bg-white border border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-200/50">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${
                isMinecraft ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30' : 'bg-amber-50 text-amber-600'
              }`}>
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className={`text-sm font-black uppercase tracking-wider ${
                  isMinecraft ? 'font-pixel text-amber-300' : 'text-slate-900'
                }`}>
                  Player of the Match
                </h3>
                <span className="text-[11px] text-slate-500">
                  MVP Honors & Recognitions
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              isMinecraft ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30' : 'bg-slate-100 text-slate-600'
            }`}>
              {motms.length} Award{motms.length === 1 ? '' : 's'}
            </span>
          </div>

          {motmLeaders.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Award className={`w-8 h-8 mx-auto stroke-[1.5] ${
                isMinecraft ? 'text-amber-900/80' : 'text-slate-300'
              }`} />
              <p className={`text-xs font-semibold ${isMinecraft ? 'text-slate-400' : 'text-slate-500'}`}>
                No Player of the Match awards recorded yet.
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Organizers or modifiers select one standout player when saving match results.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {motmLeaders.map((leader, idx) => {
                const player = playersMap.get(leader.player_id);
                const matchNumbers = playerMotmMatches.get(leader.player_id) || [];
                const rank = idx + 1;
                const isLeader = rank === 1;

                return (
                  <div
                    key={leader.player_id}
                    className={`flex items-center justify-between p-3 rounded-xl transition ${
                      isMinecraft
                        ? 'bg-slate-900/60 border border-amber-950/80 hover:border-amber-500/40'
                        : isLeader
                        ? 'bg-amber-50/50 border border-amber-200/80'
                        : 'bg-slate-50/70 border border-slate-100 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Badge */}
                      <span className={`w-6 text-center font-black text-xs ${
                        isLeader
                          ? 'text-amber-500 font-pixel'
                          : rank === 2
                          ? 'text-slate-400'
                          : rank === 3
                          ? 'text-amber-700'
                          : 'text-slate-400'
                      }`}>
                        #{rank}
                      </span>

                      {/* Player Avatar */}
                      <div className="relative shrink-0">
                        {player?.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt={leader.player_name}
                            className="w-9 h-9 rounded-xl object-cover border border-amber-300/40"
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isMinecraft
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {leader.player_name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow-xs">
                          <Star className="w-2.5 h-2.5 fill-slate-900" />
                        </div>
                      </div>

                      {/* Player Details */}
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate flex items-center gap-1.5">
                          <span className={isMinecraft ? 'text-slate-100' : 'text-slate-900'}>
                            {leader.player_name}
                          </span>
                          {player?.position && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({player.position})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate mt-0.5">
                          {leader.team && <TeamBadge team={leader.team} size="xs" />}
                          <span className="truncate">{leader.team?.name || 'Club'}</span>
                          {matchNumbers.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-[10px] text-amber-600/80 font-medium">
                                Match {matchNumbers.map(n => `#${n}`).join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* POTM Count */}
                    <div className="text-right shrink-0 pl-3">
                      <span className={`text-base font-black ${
                        isMinecraft ? 'font-pixel text-amber-400' : 'text-amber-600'
                      }`}>
                        {leader.value}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1 font-semibold uppercase">
                        {leader.value === 1 ? 'POTM' : 'POTMs'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
