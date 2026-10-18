import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  X, 
  Trash2, 
  Users, 
  Shield, 
  ArrowRight,
  FileText
} from 'lucide-react';
import { Team, Player } from '../../types/tournament';
import { 
  matchMediaFiles, 
  ProposedMediaMatch, 
  fileToDataUrl,
  MediaTargetType 
} from '../../utils/mediaMatcher';
import { tournamentService } from '../../services/tournamentService';
import { localDataService } from '../../services/localDataService';

interface BulkMediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  teams: Team[];
  players: Player[];
  onUploadSuccess: () => void;
}

export function BulkMediaUploadModal({
  isOpen,
  onClose,
  tournamentId,
  teams,
  players,
  onUploadSuccess,
}: BulkMediaUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proposedMatches, setProposedMatches] = useState<ProposedMediaMatch[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const ext = f.name.toLowerCase().split('.').pop() || '';
      if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        if (f.size <= 10 * 1024 * 1024) { // 10MB max per file
          validFiles.push(f);
        } else {
          rejectedFiles.push(`${f.name} (exceeds 10MB limit)`);
        }
      } else {
        rejectedFiles.push(`${f.name} (unsupported format; please use PNG, JPEG, or WebP)`);
      }
    }

    if (rejectedFiles.length > 0) {
      setErrorMessage(`Some files were skipped: ${rejectedFiles.join(', ')}`);
    }

    const matches = matchMediaFiles(validFiles, teams, players);
    setProposedMatches(matches);
    setIsProcessing(false);
  };

  const handleUpdateAssignment = (index: number, targetType: MediaTargetType, targetId: string | null) => {
    setProposedMatches(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.targetType = targetType;
      item.targetId = targetId;

      if (targetType === 'TEAM_LOGO') {
        const team = teams.find(t => t.id === targetId);
        item.targetName = team ? team.name : null;
        item.status = 'EXACT';
        item.warning = undefined;
      } else if (targetType === 'PLAYER_PHOTO') {
        const player = players.find(p => p.id === targetId);
        if (player) {
          const team = teams.find(t => t.id === player.team_id);
          item.targetName = team ? `${player.name} (${team.short_name || team.name})` : player.name;
        } else {
          item.targetName = null;
        }
        item.status = 'EXACT';
        item.warning = undefined;
      } else {
        item.targetName = null;
        item.status = 'UNMATCHED';
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveFile = (index: number) => {
    setProposedMatches(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmUpload = async () => {
    const validAssignments = proposedMatches.filter(m => m.targetType !== 'UNASSIGNED' && m.targetId);
    if (validAssignments.length === 0) {
      setErrorMessage('No valid assignments to save. Please assign at least one file to a team or player.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage('Saving images and updating tournament records...');

    try {
      let savedCount = 0;
      for (const match of validAssignments) {
        const dataUrl = await fileToDataUrl(match.file);

        if (match.targetType === 'TEAM_LOGO' && match.targetId) {
          const targetTeam = teams.find(t => t.id === match.targetId);
          if (targetTeam) {
            await tournamentService.updateTeam(
              {
                ...targetTeam,
                logo_url: dataUrl,
              },
              tournamentId
            );
            savedCount++;
          }
        } else if (match.targetType === 'PLAYER_PHOTO' && match.targetId) {
          const targetPlayer = players.find(p => p.id === match.targetId);
          if (targetPlayer) {
            await tournamentService.updatePlayer(
              {
                ...targetPlayer,
                photo_url: dataUrl,
              },
              tournamentId
            );
            savedCount++;
          }
        }
      }

      // Update tournament activity timestamp
      localDataService.touchTournamentActivity(tournamentId);

      setStatusMessage(`Successfully updated ${savedCount} logos and player photos!`);
      setTimeout(() => {
        onUploadSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save photos. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Bulk Upload Logos & Photos
              </h3>
              <p className="text-xs text-slate-500">
                Match filenames automatically to teams and players
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visibility & Security Disclaimer */}
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>Public Visibility Notice:</strong> Uploaded team logos and player photos will be visible to participants who join with the tournament code or link. Avoid including sensitive personal documents.
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* File Picker Dropzone */}
          {proposedMatches.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-50 hover:bg-emerald-50/30 flex flex-col items-center justify-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center mb-3 text-emerald-700">
                <ImageIcon className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                Select Team Logos & Player Photos
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                Upload multiple PNG, JPEG, or WebP files at once. TournX matches names automatically (e.g. <span className="font-mono text-slate-700">Adwaith K.jpg</span> or <span className="font-mono text-slate-700">Kerala Blasters.png</span>).
              </p>
              <button
                type="button"
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
              >
                Choose Photos & Logos
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleFilesSelected}
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Matched Files ({proposedMatches.length})
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
                >
                  + Add more files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleFilesSelected}
                />
              </div>

              {/* Match List */}
              <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
                {proposedMatches.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      item.status === 'EXACT'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : item.status === 'AMBIGUOUS'
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {/* Thumbnail & File Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.previewUrl}
                        alt={item.fileName}
                        className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {item.fileName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {(item.fileSize / 1024).toFixed(0)} KB • Normalized: <span className="font-mono text-slate-700">{item.normalizedName}</span>
                        </div>
                        {item.warning && (
                          <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{item.warning}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Target Selector Dropdown */}
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={`${item.targetType}:${item.targetId || ''}`}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'UNASSIGNED:') {
                            handleUpdateAssignment(idx, 'UNASSIGNED', null);
                          } else {
                            const [type, id] = val.split(':');
                            handleUpdateAssignment(idx, type as MediaTargetType, id);
                          }
                        }}
                        className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none focus:border-emerald-600 max-w-[200px] truncate"
                      >
                        <option value="UNASSIGNED:">-- Unassigned --</option>
                        
                        <optgroup label="Team Logos">
                          {teams.map(t => (
                            <option key={`team-${t.id}`} value={`TEAM_LOGO:${t.id}`}>
                              🛡️ Logo: {t.name}
                            </option>
                          ))}
                        </optgroup>

                        <optgroup label="Player Photos">
                          {players.map(p => {
                            const team = teams.find(t => t.id === p.team_id);
                            const tLabel = team ? ` (${team.short_name || team.name})` : '';
                            return (
                              <option key={`player-${p.id}`} value={`PLAYER_PHOTO:${p.id}`}>
                                👤 {p.name}{tLabel}
                              </option>
                            );
                          })}
                        </optgroup>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving || isProcessing || proposedMatches.length === 0}
            onClick={handleConfirmUpload}
            className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span>Confirm & Apply Photos</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
