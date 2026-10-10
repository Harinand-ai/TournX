import React, { useState } from 'react';
import { Tournament } from '../types/multiTenant';
import { localDataService } from '../services/localDataService';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = localDataService.verifyAccessCode(tournament.id, code.trim());
      if (result.success && result.role) {
        setGrantedRole(result.role);
        setTimeout(() => {
          onSuccess(result.role!);
          onClose();
        }, 1200);
      } else {
        setError(result.error || 'Invalid access code.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5 relative shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Enter Access Code</h3>
          <p className="text-xs text-zinc-400">
            Authorize your session for <span className="text-amber-400 font-semibold">{tournament.name}</span>
          </p>
        </div>

        {grantedRole ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-bold text-emerald-300">
              Access Granted: {grantedRole} Role
            </div>
            <div className="text-xs text-zinc-400">
              Refreshing permissions...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                8-Character Access Code
              </label>
              <input
                type="text"
                maxLength={10}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 2K8M9XYZ"
                autoFocus
                required
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center font-mono text-xl tracking-widest font-bold text-amber-400 placeholder:text-zinc-700 focus:border-amber-500 focus:outline-none uppercase"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-[11px] text-zinc-500 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Enter a <strong>SCORE</strong> code to input match results, or a <strong>VIEW</strong> code to unlock private tournament brackets.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || code.trim().length < 6}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
            >
              {loading ? 'Verifying...' : 'Unlock Access'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
