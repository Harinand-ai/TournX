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
  currentUserId?: string | null;
}

export const TournamentSwitcherModal: React.FC<TournamentSwitcherModalProps> = ({
  isOpen,
  onClose,
  onSelectTournament,
  onOpenCreate,
  currentUserId,
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const activeId = localDataService.getActiveTournamentId();

  const loadTournaments = async () => {
    setLoading(true);
    try {
      if (currentUserId) {
        const list = await tournamentService.getOrganizerTournaments(currentUserId);
        const valid = list.filter(t => !t.deleted_at && t.status !== 'ARCHIVED');
        setTournaments(valid);
      } else {
        const list = await tournamentService.getTournaments();
        const valid = list.filter(t => !t.deleted_at && t.status !== 'ARCHIVED');
        setTournaments(valid);
      }
    } catch {
      if (import.meta.env.DEV) {
        const localList = currentUserId 
          ? localDataService.getOrganizerTournaments(currentUserId)
          : localDataService.getAllTournaments();
        setTournaments(localList);
      } else {
        setTournaments([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTournaments();
      setTournamentToDelete(null);
      setDeleteModalError(null);
    }
  }, [isOpen, currentUserId]);

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
        const nextId = remaining[0]?.id || '';
        if (nextId) {
          localDataService.setActiveTournamentId(nextId);
          onSelectTournament(nextId);
        } else {
          localDataService.clearActiveTournament();
        }
      }
    } catch (err: any) {
      setDeleteModalError(err.message || 'Failed to delete tournament. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#19191F] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-[#F0E9E7]">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#141418] border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#D72645]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#D72645]">
              Organizer Tournaments
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A5A1A4] hover:text-[#F0E9E7] hover:bg-[#202028] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tournament List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#A5A1A4]">
              <Loader2 className="w-5 h-5 animate-spin text-[#D72645]" />
              <span>Loading your tournaments...</span>
            </div>
          ) : tournaments.length === 0 ? (
            /* Explicit Empty State Required by Section 5 */
            <div className="py-10 px-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#21191D] border border-[#D72645]/40 text-[#D72645] flex items-center justify-center mx-auto">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-[#F0E9E7]">
                  No tournaments yet.
                </h3>
                <p className="text-xs text-[#A5A1A4] mt-1 max-w-xs mx-auto leading-relaxed">
                  Create your first tournament to get started organizing fixtures and squads.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreate();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Tournament</span>
              </button>
            </div>
          ) : (
            tournaments.map(t => {
              const isActive = t.id === activeId;
              const teams = localDataService.getTeams(t.id);
              const matches = localDataService.getMatches(t.id);

              return (
                <div
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  className={`p-3.5 border rounded-xl transition cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'bg-[#21191D] border-[#D72645]/50 shadow-sm'
                      : 'bg-[#141418] border-white/10 hover:border-white/20 hover:bg-[#1A1A22]'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#F0E9E7] truncate font-display">
                        {t.name}
                      </span>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-[#D72645] text-white text-[10px] font-mono font-bold uppercase rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#A5A1A4] mt-1 font-mono">
                      <span>{t.season || '2026'}</span>
                      <span className="text-white/20">•</span>
                      <span>{teams.length} Teams</span>
                      <span className="text-white/20">•</span>
                      <span>{matches.length} Fixtures</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isActive ? (
                      <div className="w-6 h-6 rounded-full bg-[#D72645] text-white flex items-center justify-center font-bold">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handlePromptDelete(e, t)}
                        disabled={deletingId === t.id}
                        title="Delete Tournament"
                        className="p-1.5 rounded-lg text-[#A5A1A4] hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                      >
                        {deletingId === t.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#D72645]" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {tournaments.length > 0 && (
          <div className="p-4 bg-[#141418] border-t border-white/[0.08] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCreate();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Tournament</span>
            </button>
          </div>
        )}

        {/* Delete Confirmation Sub-Modal */}
        {tournamentToDelete && (
          <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#19191F] border border-rose-800/60 rounded-2xl p-5 shadow-2xl text-center space-y-4">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 text-rose-400 flex items-center justify-center mx-auto border border-rose-800/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Delete Tournament?
                </h3>
                <p className="text-xs text-[#A5A1A4] mt-1 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-white">"{tournamentToDelete.name}"</strong>? All fixtures and squads will be purged.
                </p>
              </div>

              {deleteModalError && (
                <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteModalError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTournamentToDelete(null)}
                  disabled={Boolean(deletingId)}
                  className="flex-1 py-2 rounded-xl bg-[#141418] hover:bg-[#202028] text-xs font-semibold text-[#F0E9E7] border border-white/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={Boolean(deletingId)}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {deletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
