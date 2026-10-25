import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Key, 
  ExternalLink, 
  Shield, 
  Users, 
  Sliders, 
  Info 
} from 'lucide-react';
import { Tournament } from '../types/multiTenant';
import { localDataService } from '../services/localDataService';

interface ShareTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
}

export const ShareTournamentModal: React.FC<ShareTournamentModalProps> = ({
  isOpen,
  onClose,
  tournament,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedViewCode, setCopiedViewCode] = useState(false);
  const [copiedScoreCode, setCopiedScoreCode] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  if (!isOpen || !tournament) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareableUrl = `${origin}/t/${tournament.slug || tournament.id}`;

  // Retrieve or generate access codes for this tournament
  const accessCodes = localDataService.getAccessCodes(tournament.id);
  let viewCode = accessCodes.find(c => c.role === 'VIEW' && c.is_active && c.rawCode);
  let scoreCode = accessCodes.find(c => c.role === 'SCORE' && c.is_active && c.rawCode);

  if (!viewCode) {
    const gen = localDataService.generateAccessCode(tournament.id, 'VIEW', 'Participant Spectator Pass');
    viewCode = gen.code;
  }
  if (!scoreCode) {
    const gen = localDataService.generateAccessCode(tournament.id, 'SCORE', 'Collaborator Modifier Pass');
    scoreCode = gen.code;
  }

  const rawViewCode = viewCode?.rawCode || '';
  const rawScoreCode = scoreCode?.rawCode || '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyViewCode = () => {
    navigator.clipboard.writeText(rawViewCode);
    setCopiedViewCode(true);
    setTimeout(() => setCopiedViewCode(false), 2000);
  };

  const handleCopyScoreCode = () => {
    navigator.clipboard.writeText(rawScoreCode);
    setCopiedScoreCode(true);
    setTimeout(() => setCopiedScoreCode(false), 2000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: tournament.name,
          text: `Follow "${tournament.name}" live fixtures and standings on TournX with code ${rawViewCode}:`,
          url: shareableUrl,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#19191F] text-[#F0E9E7] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#141418]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#21191D] text-[#F02D50] border border-[#F02D50]/40 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display tracking-tight text-[#F0E9E7]">
                Share Tournament
              </h2>
              <p className="text-[11px] text-[#A5A1A4] font-mono">
                {tournament.name} • {tournament.visibility}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A5A1A4] hover:text-[#F0E9E7] hover:bg-[#202028] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* Shareable Link Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#F0E9E7] flex items-center justify-between">
              <span>Direct Public Link</span>
              <span className="text-[10px] text-[#F02D50] font-mono">No account required to view</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#101013] border border-white/10 text-xs font-mono text-[#F0E9E7] focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2.5 rounded-xl bg-[#F02D50] hover:bg-[#FF3358] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Access Codes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            
            {/* Spectator / Viewer Code */}
            <div className="p-4 rounded-xl bg-[#141418] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#A5A1A4] uppercase tracking-wider flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#F02D50]" /> Spectator Pass
                </span>
                <span className="text-[10px] font-mono bg-[#21191D] text-[#F02D50] border border-[#F02D50]/40 px-2 py-0.5 rounded-full font-medium">
                  Read Only
                </span>
              </div>
              <div className="text-base font-mono font-bold tracking-wider text-[#F0E9E7]">
                {rawViewCode}
              </div>
              <button
                type="button"
                onClick={handleCopyViewCode}
                className="w-full py-1.5 px-3 rounded-lg bg-[#19191F] hover:bg-[#202028] text-xs font-mono font-medium text-[#F0E9E7] border border-white/10 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedViewCode ? <Check className="w-3 h-3 text-[#F02D50]" /> : <Copy className="w-3 h-3 text-[#A5A1A4]" />}
                <span>{copiedViewCode ? 'Copied' : 'Copy Spectator Code'}</span>
              </button>
            </div>

            {/* Scorekeeper / Modifier Code */}
            <div className="p-4 rounded-xl bg-[#141418] border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-[#A5A1A4] uppercase tracking-wider flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-amber-400" /> Scorekeeper Pass
                </span>
                <span className="text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-800/40 px-2 py-0.5 rounded-full font-medium">
                  Match Scoring
                </span>
              </div>
              <div className="text-base font-mono font-bold tracking-wider text-[#F0E9E7]">
                {rawScoreCode}
              </div>
              <button
                type="button"
                onClick={handleCopyScoreCode}
                className="w-full py-1.5 px-3 rounded-lg bg-[#19191F] hover:bg-[#202028] text-xs font-mono font-medium text-[#F0E9E7] border border-white/10 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedScoreCode ? <Check className="w-3 h-3 text-[#F02D50]" /> : <Copy className="w-3 h-3 text-[#A5A1A4]" />}
                <span>{copiedScoreCode ? 'Copied' : 'Copy Scorekeeper Code'}</span>
              </button>
            </div>

          </div>

          {/* Participant Instructions Note */}
          <div className="p-3.5 rounded-xl bg-[#141418] border border-white/10 flex items-start gap-2.5 text-xs text-[#A5A1A4] leading-relaxed">
            <Info className="w-4 h-4 text-[#F02D50] shrink-0 mt-0.5" />
            <p>
              Participants and spectators can open the direct link or enter the <strong className="text-[#F0E9E7]">Spectator Pass</strong> on the TournX home page to view live scoreboards, match fixtures, and squad statistics without needing an account.
            </p>
          </div>

          {/* Native Share Trigger */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-3 px-4 rounded-xl bg-[#F02D50] hover:bg-[#FF3358] text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_2px_12px_rgba(240, 45, 80,0.35)]"
            >
              <Share2 className="w-4 h-4" />
              <span>{shareSuccess ? 'Shared Successfully!' : 'Share via Android / Apps'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
