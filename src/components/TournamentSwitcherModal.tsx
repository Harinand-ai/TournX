import React from 'react';
import { X, Trophy, Check, Plus, Trash2, Calendar } from 'lucide-react';
import { localDataService, DEMO_TOURNAMENT_ID } from '../services/localDataService';
import { Tournament } from '../types/multiTenant';

interface TournamentSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTournament: (tourneyId: string) => void;
  onOpenCreate: () => void;
}

export const TournamentSwitcherModal: React.FC<TournamentSwitcherModalProps> = ({
  isOpen,
  onClose,
  onSelectTournament,
  onOpenCreate,
}) => {
  if (!isOpen) return null;

  const tournaments = localDataService.getAllTournaments();
  const activeId = localDataService.getActiveTournamentId();

  const handleSelect = (t: Tournament) => {
    localDataService.setActiveTournamentId(t.id);
    onSelectTournament(t.id);
    onClose();
  };

  const handleDelete = (e: React.MouseEvent, tId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      localDataService.deleteTournament(tId);
      onSelectTournament(localDataService.getActiveTournamentId());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[#241a12] border-4 border-[#120d08] shadow-2xl flex flex-col max-h-[85vh] text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e150e] border-b-3 border-[#120d08]">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#ffff55]" />
            <h2 className="text-sm font-black uppercase text-[#ffff55] tracking-wide font-display">
              SELECT TOURNAMENT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 mc-btn-red text-white text-xs font-black cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tournament List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {tournaments.map(t => {
            const isActive = t.id === activeId;
            const teams = localDataService.getTeams(t.id);
            const matches = localDataService.getMatches(t.id);

            return (
              <div
                key={t.id}
                onClick={() => handleSelect(t)}
                className={`p-3.5 border-2 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                  isActive
                    ? 'bg-[#2f2217] border-[#4a7227] shadow-sm'
                    : 'bg-[#1c140d] border-[#36271a] hover:border-[#4d3624]'
                }`}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-white truncate">
                      {t.name}
                    </span>
                    {isActive && (
                      <span className="px-1.5 py-0.5 bg-[#4a7227] text-[#ffff55] text-[9px] font-bold uppercase rounded font-mono">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#bda88e] mt-1 font-mono">
                    <span>{t.season || '2026'}</span>
                    <span>•</span>
                    <span>{teams.length} Teams</span>
                    <span>•</span>
                    <span>{matches.length} Fixtures</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isActive ? (
                    <div className="w-7 h-7 rounded-full bg-[#4a7227] text-[#ffff55] flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelect(t)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white bg-[#2b1e13] border border-[#3d2b1c] rounded"
                    >
                      Switch
                    </button>
                  )}

                  {t.id !== DEMO_TOURNAMENT_ID && (
                    <button
                      onClick={e => handleDelete(e, t.id)}
                      title="Delete tournament"
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-[#1e150e] border-t-2 border-[#120d08] flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {tournaments.length} tournament{tournaments.length > 1 ? 's' : ''} available
          </span>
          <button
            onClick={() => {
              onClose();
              onOpenCreate();
            }}
            className="px-3.5 py-1.5 bg-[#4a7227] hover:bg-[#5b8c30] text-[#ffff55] border-2 border-[#120d08] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Tournament</span>
          </button>
        </div>

      </div>
    </div>
  );
};
