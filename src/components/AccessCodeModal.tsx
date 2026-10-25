import React, { useState } from 'react';
import { Tournament } from '../types/multiTenant';
import { tournamentService } from '../services/tournamentService';
import { KeyRound, CheckCircle, AlertCircle, X, ShieldCheck } from 'lucide-react';

interface AccessCodeModalProps {
  tournament: Tournament;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role: 'VIEW' | 'SCORE') => void;
}

export const AccessCodeModal: React.FC<AccessCodeModalProps> = ({
  tournament,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grantedRole, setGrantedRole] = useState<'VIEW' | 'SCORE' | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await tournamentService.verifyAccessCode(tournament.id, code.trim());
      if (result.success && result.role) {
        setGrantedRole(result.role);
        setTimeout(() => {
          onSuccess(result.role!);
          onClose();
        }, 1000);
      } else {
        setError(result.error || 'Invalid or revoked access code.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#19191F] border border-white/10 space-y-5 relative shadow-2xl text-[#F0E9E7]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-[#A5A1A4] hover:text-[#F0E9E7] hover:bg-[#202028] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#21191D] text-[#D72645] flex items-center justify-center mx-auto border border-[#D72645]/40 shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-display font-bold uppercase tracking-wider text-[#F0E9E7]">
            VALIDATE MATCHDAY PASS
          </h3>
          <p className="text-xs text-[#A5A1A4] font-sans">
            Authorize credentials for <span className="text-[#F0E9E7] font-semibold">{tournament.name}</span>
          </p>
        </div>

        {grantedRole ? (
          <div className="p-5 rounded-xl bg-[#21191D] border border-[#D72645]/50 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-[#D72645] mx-auto animate-bounce" />
            <div className="text-sm font-mono font-bold text-[#F0E9E7] uppercase tracking-widest">
              Pass Verified: {grantedRole} Role
            </div>
            <div className="text-xs text-[#A5A1A4] font-sans">
              Applying matchday permissions...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A1A4] mb-1.5">
                Access Code / Pass Key
              </label>
              <input
                type="text"
                maxLength={24}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. TX-VIEW-XXXXXX"
                autoFocus
                required
                className="w-full px-4 py-3 rounded-xl bg-[#101013] border border-white/10 text-center font-mono text-lg tracking-widest font-bold text-[#D72645] placeholder:text-[#736F72] focus:border-[#D72645] focus:outline-none uppercase"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#141418] border border-white/10 text-[11px] text-[#A5A1A4] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#D72645] shrink-0 mt-0.5" />
              <span>
                Enter a <strong className="text-[#F0E9E7]">SCORE</strong> pass to edit match scores, or a <strong className="text-[#F0E9E7]">VIEW</strong> pass to unlock private fixtures.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || code.trim().length < 4}
              className="w-full py-3 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_2px_10px_rgba(215,38,69,0.3)] cursor-pointer"
            >
              {loading ? 'Verifying Pass...' : 'Unlock Matchday Access'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
