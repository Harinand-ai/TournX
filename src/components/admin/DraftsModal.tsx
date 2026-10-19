import React, { useState, useEffect } from 'react';
import { X, FileText, Trash2, ArrowRight, AlertTriangle, AlertCircle, Clock, Users, Trophy } from 'lucide-react';
import { tournamentService } from '../../services/tournamentService';
import { TournamentDraftRecord } from '../../services/localDataService';

interface DraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDraft: (draft: TournamentDraftRecord) => void;
  onDraftsChanged?: () => void;
}

export const DraftsModal: React.FC<DraftsModalProps> = ({
  isOpen,
  onClose,
  onSelectDraft,
  onDraftsChanged,
}) => {
  const [drafts, setDrafts] = useState<TournamentDraftRecord[]>([]);
  const [draftToDelete, setDraftToDelete] = useState<TournamentDraftRecord | null>(null);

  const loadDrafts = () => {
    try {
      const list = tournamentService.getDrafts();
      setDrafts(list);
    } catch {
      setDrafts([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDrafts();
      setDraftToDelete(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmDelete = () => {
    if (!draftToDelete) return;
    tournamentService.deleteDraft(draftToDelete.id);
    setDraftToDelete(null);
    loadDrafts();
    if (onDraftsChanged) {
      onDraftsChanged();
    }
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#111827] border border-[#1f293d] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-[#f8fafc]">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0d1424] border-b border-[#1f293d]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#162032] border border-[#2b3a54] text-emerald-400">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#f8fafc]">
                Saved Tournament Drafts
              </h2>
              <p className="text-[11px] text-slate-400">
                Continue editing or manage previously drafted tournaments
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#162032] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drafts List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {drafts.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#162032] border border-[#2b3a54] mx-auto flex items-center justify-center text-slate-400">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">No Drafts Saved</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto font-sans leading-relaxed">
                When you create or save a tournament prompt, it will appear here so you can resume editing anytime.
              </p>
            </div>
          ) : (
            drafts.map(draft => (
              <div
                key={draft.id}
                className="p-4 bg-[#0d1424] border border-[#1f293d] hover:border-emerald-500/40 rounded-xl transition space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#f8fafc] truncate">
                        {draft.name || 'Untitled Tournament Draft'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-950/60 border border-amber-800/60 text-amber-300 shrink-0">
                        Draft
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 font-sans leading-relaxed">
                      "{draft.prompt}"
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDraftToDelete(draft)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer shrink-0"
                    title="Delete draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#1f293d] text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatTimestamp(draft.updated_at)}</span>
                    </span>
                    {draft.teamsCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <Users className="w-3.5 h-3.5" />
                        <span>{draft.teamsCount} Teams</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectDraft(draft);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Continue Editing</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0d1424] border-t border-[#1f293d] flex items-center justify-between text-xs text-slate-400">
          <span>{drafts.length} draft{drafts.length === 1 ? '' : 's'} stored locally</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-[#2b3a54] bg-[#162032] hover:bg-[#1e2c44] text-slate-300 hover:text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* IN-MODAL DRAFT DELETION CONFIRMATION */}
        {draftToDelete && (
          <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#111827] rounded-2xl border border-rose-800/80 shadow-2xl p-5 space-y-4 text-[#f8fafc]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#f8fafc]">Delete Draft?</h3>
                  <p className="text-[11px] text-slate-400">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Are you sure you want to permanently delete draft <span className="font-semibold text-emerald-400">"{draftToDelete.name || 'Untitled Draft'}"</span>?
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1f293d]">
                <button
                  type="button"
                  onClick={() => setDraftToDelete(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#2b3a54] bg-[#162032] hover:bg-[#1e2c44] text-xs font-medium text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Draft</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
