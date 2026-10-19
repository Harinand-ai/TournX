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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md p-6 rounded-2xl bg-[#0f1411] border border-[#1f2e26] space-y-5 relative shadow-2xl text-[#f1f5f9]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-lime-400 hover:bg-[#151f19] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#141e17] text-lime-400 flex items-center justify-center mx-auto border border-[#273d2f] shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-mono font-bold uppercase tracking-wider text-[#f1f5f9]">
            VALIDATE MATCHDAY PASS
          </h3>
          <p className="text-xs text-slate-400 font-sans">
            Authorize credentials for <span className="text-lime-400 font-semibold">{tournament.name}</span>
          </p>
        </div>

        {grantedRole ? (
          <div className="p-5 rounded-xl bg-lime-950/40 border border-lime-800/60 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-lime-400 mx-auto animate-bounce" />
            <div className="text-sm font-mono font-bold text-lime-300 uppercase tracking-widest">
              Pass Verified: {grantedRole} Role
            </div>
            <div className="text-xs text-lime-400/80 font-sans">
              Applying matchday permissions...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                Access Code / Pass Key
              </label>
              <input
                type="text"
                maxLength={16}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. TX-VIEW-9876"
                autoFocus
                required
                className="w-full px-4 py-3 rounded-xl bg-[#080c09] border border-[#23352a] text-center font-mono text-lg tracking-widest font-bold text-lime-400 placeholder:text-slate-600 focus:bg-[#0b100d] focus:border-lime-500 focus:outline-none uppercase"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#121914] border border-[#1f2d24] text-[11px] text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
              <span>
                Enter a <strong className="text-lime-300">SCORE</strong> pass to edit match scores, or a <strong className="text-lime-300">VIEW</strong> pass to unlock private fixtures.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || code.trim().length < 4}
              className="w-full py-3 rounded-xl bg-lime-500 hover:bg-lime-400 disabled:opacity-40 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              {loading ? 'Verifying Pass...' : 'Unlock Matchday Access'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
