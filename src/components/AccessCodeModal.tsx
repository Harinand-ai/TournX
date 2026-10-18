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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 space-y-5 relative shadow-xl text-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Enter Access Code</h3>
          <p className="text-xs text-slate-500">
            Authorize your session for <span className="text-emerald-700 font-semibold">{tournament.name}</span>
          </p>
        </div>

        {grantedRole ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="text-sm font-bold text-emerald-800">
              Access Granted: {grantedRole} Role
            </div>
            <div className="text-xs text-emerald-700">
              Refreshing permissions...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-center font-mono text-xl tracking-widest font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 uppercase"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Enter a <strong>SCORE</strong> code to input match results, or a <strong>VIEW</strong> code to unlock private tournament fixtures.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || code.trim().length < 6}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-sm transition-all shadow-xs cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Unlock Access'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
