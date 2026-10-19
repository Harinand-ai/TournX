import React, { useState, useEffect } from 'react';
import { X, Trophy, Check, Plus, Trash2, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import { localDataService, DEMO_TOURNAMENT_ID } from '../services/localDataService';
import { tournamentService } from '../services/tournamentService';
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
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const activeId = localDataService.getActiveTournamentId();

  const loadTournaments = async () => {
    try {
      const list = await tournamentService.getTournaments();
      const valid = list.filter(t => !t.deleted_at && t.status !== 'ARCHIVED');
      setTournaments(valid);
    } catch {
      if (import.meta.env.DEV) {
        setTournaments(localDataService.getAllTournaments());
      } else {
        setTournaments([]);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTournaments();
      setTournamentToDelete(null);
      setDeleteModalError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (t: Tournament) => {
    localDataService.setActiveTournamentId(t.id);
    onSelectTournament(t.id);
    onClose();
  };

  const handlePromptDelete = (e: React.MouseEvent, t: Tournament) => {
    e.stopPropagation();
    if (t.id === DEMO_TOURNAMENT_ID) {
      alert('The default TournX demo tournament cannot be deleted.');
      return;
    }
    setTournamentToDelete(t);
    setDeleteModalError(null);
  };

  const handleConfirmDelete = async () => {
    if (!tournamentToDelete) return;
    const targetId = tournamentToDelete.id;
    setDeletingId(targetId);
    setDeleteModalError(null);

    try {
      const success = await tournamentService.deleteTournament(targetId);
      if (!success) {
        throw new Error('Failed to delete tournament');
      }

      setTournamentToDelete(null);
      await loadTournaments();

      // If active tournament was deleted, switch to another valid tournament
      if (activeId === targetId) {
        const remaining = tournaments.filter(t => t.id !== targetId);
        const nextId = remaining.find(t => t.id !== DEMO_TOURNAMENT_ID)?.id || DEMO_TOURNAMENT_ID;
        localDataService.setActiveTournamentId(nextId);
        onSelectTournament(nextId);
      }
    } catch (err: any) {
      setDeleteModalError(err.message || 'Failed to delete tournament. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0f1411] border border-[#1f2e26] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-[#f1f5f9]">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#141d18] border-b border-[#1f2e26]">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-lime-400" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-lime-400">
              Tournament Switcher & Vault
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a261f] transition cursor-pointer"
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
                className={`p-3.5 border rounded-xl transition cursor-pointer flex items-center justify-between ${
                  isActive
                    ? 'bg-lime-950/40 border-lime-500 shadow-xs'
                    : 'bg-[#141d18] border-[#24352b] hover:border-[#385141] hover:bg-[#19241e]'
                }`}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#f1f5f9] truncate">
                      {t.name}
                    </span>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-lime-500 text-black text-[10px] font-mono font-extrabold uppercase rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                    <span>{t.season || '2026'}</span>
                    <span>•</span>
                    <span>{teams.length} Teams</span>
                    <span>•</span>
                    <span>{matches.length} Fixtures</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isActive ? (
                    <div className="w-6 h-6 rounded-full bg-lime-500 text-black flex items-center justify-center font-bold">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelect(t)}
                      className="px-3 py-1 text-xs font-mono font-semibold text-lime-400 hover:text-white bg-[#101712] hover:bg-[#1f2e26] border border-[#273a2f] rounded-lg transition"
                    >
                      Switch
                    </button>
                  )}

                  {t.id !== DEMO_TOURNAMENT_ID && (
                    <button
                      type="button"
                      onClick={e => handlePromptDelete(e, t)}
                      disabled={deletingId === t.id}
                      title="Delete tournament"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition disabled:opacity-50 cursor-pointer"
                    >
                      {deletingId === t.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#141d18] border-t border-[#1f2e26] flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400">
            {tournaments.length} tournament{tournaments.length > 1 ? 's' : ''} available
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreate();
            }}
            className="px-4 py-2 bg-lime-500 hover:bg-lime-400 text-black rounded-xl text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Tournament</span>
          </button>
        </div>

        {/* IN-MODAL TOURNAMENT DELETION CONFIRMATION OVERLAY */}
        {tournamentToDelete && (
          <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#0f1411] rounded-2xl border border-rose-800 shadow-2xl p-5 space-y-4 text-[#f1f5f9]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold text-[#f1f5f9]">Delete Tournament?</h3>
                  <p className="text-[11px] font-mono text-slate-400">Permanent and irreversible action</p>
                </div>
              </div>

              {deleteModalError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{deleteModalError}</span>
                </div>
              )}

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Are you sure you want to delete <span className="font-bold text-lime-400 font-mono">"{tournamentToDelete.name}"</span>?
                This frees your account slot to create a new tournament.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1f2e26]">
                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={() => setTournamentToDelete(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#273a2f] hover:bg-[#141d18] text-xs font-mono font-semibold text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-md"
                >
                  {deletingId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Permanently</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
