import React, { useState, useEffect } from 'react';
import { X, FileText, Trash2, ArrowRight, AlertTriangle, AlertCircle, Clock, Users, Check } from 'lucide-react';
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
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadDrafts = async () => {
    setIsLoading(true);
    try {
      const list = await tournamentService.getDraftsAsync();
      setDrafts(list);
    } catch {
      setDrafts(tournamentService.getDrafts());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDrafts();
      setDraftToDelete(null);
      setShowDeleteAllConfirm(false);
      setNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmDeleteIndividual = async () => {
    if (!draftToDelete) return;
    setIsDeleting(true);
    try {
      await tournamentService.deleteDraft(draftToDelete.id);
      setNotice(`Deleted draft "${draftToDelete.name || 'Draft'}".`);
      setDraftToDelete(null);
      loadDrafts();
      if (onDraftsChanged) onDraftsChanged();
    } catch (err: any) {
      setNotice(`Failed to delete draft: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const res = await tournamentService.deleteAllDrafts();
      setShowDeleteAllConfirm(false);
      loadDrafts();
      setNotice(`Successfully deleted all ${res.localCount + res.cloudCount} saved drafts.`);
      if (onDraftsChanged) onDraftsChanged();
    } catch (err: any) {
      setNotice(`Failed to delete drafts: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setTimeout(() => setNotice(null), 3500);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#15151B] border-2 border-[#262633] shadow-[4px_4px_0px_#070709] flex flex-col max-h-[85vh] overflow-hidden text-[#F0E9E7]">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#121217] border-b-2 border-[#262633]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-[#F02D50]/40 bg-[#22161A] text-[#F02D50]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-pixel font-bold text-[#F0E9E7]">
                  SAVED TOURNAMENT DRAFTS
                </h2>
                {drafts.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#F02D50]/20 text-[#F02D50] text-[10px] font-pixel font-bold border border-[#F02D50]/40">
                    [{drafts.length}]
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#A5A1A4] font-sans">
                Resume editing or manage previously drafted tournaments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {drafts.length > 0 && !showDeleteAllConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteAllConfirm(true)}
                className="px-2.5 py-1.5 border border-rose-800 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-pixel transition cursor-pointer flex items-center gap-1.5 shadow-[1px_1px_0px_#070709]"
                title="Delete all drafts"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">DELETE ALL</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#A5A1A4] hover:text-[#F0E9E7] hover:bg-[#202028] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        {notice && (
          <div className="p-3 bg-[#22161A] border-b-2 border-[#F02D50]/40 text-[#F02D50] text-xs font-pixel flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Delete All Drafts Confirmation Banner */}
        {showDeleteAllConfirm && (
          <div className="p-4 bg-rose-950/80 border-b-2 border-rose-800 text-xs space-y-2.5 animate-in slide-in-from-top-2">
            <div className="flex items-start gap-2.5 text-rose-200">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-pixel font-bold text-rose-100">
                  Delete all {drafts.length} saved tournament drafts?
                </p>
                <p className="text-[11px] text-rose-300 font-sans mt-0.5 leading-relaxed">
                  This will permanently remove all local draft prompts and user-owned cloud drafts from your account. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteAllConfirm(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 border border-[#262633] hover:bg-[#1E1E26] text-slate-300 font-pixel text-xs cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={isDeleting}
                className="px-4 py-1.5 border border-rose-600 bg-rose-600 hover:bg-rose-500 text-white font-pixel font-bold text-xs cursor-pointer shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'DELETING...' : `CONFIRM DELETE ALL (${drafts.length})`}</span>
              </button>
            </div>
          </div>
        )}

        {/* Drafts List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {isLoading && drafts.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#F02D50] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-pixel text-[#A5A1A4]">Loading saved drafts from storage and cloud...</p>
            </div>
          ) : drafts.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 border-2 border-[#262633] bg-[#121217] mx-auto flex items-center justify-center text-[#A5A1A4]">
                <FileText className="w-6 h-6 text-[#A5A1A4]" />
              </div>
              <h3 className="text-sm font-pixel font-bold text-[#F0E9E7]">NO DRAFTS SAVED</h3>
              <p className="text-xs text-[#A5A1A4] max-w-xs mx-auto font-sans leading-relaxed">
                When you create or save a tournament prompt, it will appear here so you can resume editing anytime.
              </p>
            </div>
          ) : (
            drafts.map(draft => (
              <div
                key={draft.id}
                className="p-4 bg-[#101014] border-2 border-[#262633] hover:border-[#F02D50] transition space-y-2.5 shadow-[2px_2px_0px_#070709]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-pixel font-bold text-xs text-[#F0E9E7] truncate">
                        {draft.name || 'Untitled Tournament Draft'}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-pixel font-bold uppercase bg-[#22161A] border border-[#F02D50]/40 text-[#F02D50] shrink-0">
                        {(draft as any).isCloud ? 'Cloud Draft' : 'Draft'}
                      </span>
                    </div>

                    <p className="text-xs text-[#A5A1A4] line-clamp-2 mt-1.5 font-sans leading-relaxed">
                      "{draft.prompt}"
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDraftToDelete(draft)}
                    className="p-1.5 text-[#A5A1A4] hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer shrink-0"
                    title="Delete draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#1E1E28] text-xs text-[#A5A1A4] font-pixel">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-[#F02D50]" />
                      <span>{formatTimestamp(draft.updated_at)}</span>
                    </span>
                    {draft.teamsCount > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-[#F0E9E7] font-medium">
                        <Users className="w-3.5 h-3.5" />
                        <span>[{draft.teamsCount} TEAMS]</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectDraft(draft);
                      onClose();
                    }}
                    className="px-3 py-1.5 border-2 border-[#F02D50] bg-[#F02D50] hover:bg-[#FF385C] text-white text-xs font-pixel font-bold flex items-center gap-1.5 transition cursor-pointer shadow-[2px_2px_0px_#070709]"
                  >
                    <span>RESUME</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Delete Single Draft Confirmation Overlay */}
        {draftToDelete && (
          <div className="p-4 bg-[#21191D] border-t border-rose-900/50 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Delete "{draftToDelete.name || 'Draft'}"?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDraftToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1 rounded-lg border border-white/10 hover:bg-white/5 text-[#A5A1A4] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteIndividual}
                disabled={isDeleting}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
