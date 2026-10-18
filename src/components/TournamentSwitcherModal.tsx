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
      setTournaments(localDataService.getAllTournaments());
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
    setDeletingId(tournamentToDelete.id);
    setDeleteModalError(null);
    try {
      await tournamentService.deleteTournament(tournamentToDelete.id);
      await loadTournaments();
      const currentActive = localDataService.getActiveTournamentId();
      onSelectTournament(currentActive);
      setTournamentToDelete(null);
    } catch (err: any) {
      setDeleteModalError(err.message || 'Failed to delete tournament');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col max-h-[85vh] text-slate-900 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase text-slate-900 tracking-wide">
              Select Tournament
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
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
                    ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {t.name}
                    </span>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-md">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>{t.season || '2026'}</span>
                    <span>•</span>
                    <span>{teams.length} Teams</span>
                    <span>•</span>
                    <span>{matches.length} Fixtures</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isActive ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelect(t)}
                      className="px-3 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      Switch
                    </button>
                  )}

                  {t.id !== DEMO_TOURNAMENT_ID && (
                    <button
                      onClick={e => handlePromptDelete(e, t)}
                      disabled={deletingId === t.id}
                      title="Delete tournament"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50 cursor-pointer"
                    >
                      {deletingId === t.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
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
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {tournaments.length} tournament{tournaments.length > 1 ? 's' : ''} available
          </span>
          <button
            onClick={() => {
              onClose();
              onOpenCreate();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Tournament</span>
          </button>
        </div>

        {/* IN-MODAL TOURNAMENT DELETION CONFIRMATION OVERLAY */}
        {tournamentToDelete && (
          <div className="absolute inset-0 z-20 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Delete Tournament?</h3>
                  <p className="text-[11px] text-slate-500">Permanent removal of tournament data</p>
                </div>
              </div>

              {deleteModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{deleteModalError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete <span className="font-bold text-slate-900">"{tournamentToDelete.name}"</span>?
                This will release any active organizer slot and cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={() => setTournamentToDelete(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {deletingId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Tournament</span>
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
