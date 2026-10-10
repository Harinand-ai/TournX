import React, { useState } from 'react';
import { Tournament, AccessCode } from '../../types/multiTenant';
import { localDataService } from '../../services/localDataService';
import { 
  KeyRound, 
  Plus, 
  Copy, 
  Check, 
  ShieldAlert, 
  Ban, 
  Clock, 
  Eye, 
  Edit3, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface AccessCodesSectionProps {
  tournament: Tournament;
}

export const AccessCodesSection: React.FC<AccessCodesSectionProps> = ({ tournament }) => {
  const [codes, setCodes] = useState<AccessCode[]>(() =>
    localDataService.getAccessCodes(tournament.id)
  );

  // Modal State for Generating Code
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [genRole, setGenRole] = useState<'VIEW' | 'SCORE'>('SCORE');
  const [genLabel, setGenLabel] = useState('');
  const [genExpiryDays, setGenExpiryDays] = useState<number>(0);

  // One-time Reveal State
  const [revealedCode, setRevealedCode] = useState<{ raw: string; code: AccessCode } | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshCodes = () => {
    setCodes(localDataService.getAccessCodes(tournament.id));
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const result = localDataService.generateAccessCode(
      tournament.id,
      genRole,
      genLabel.trim() || undefined,
      genExpiryDays > 0 ? genExpiryDays : undefined
    );
    setRevealedCode({ raw: result.rawCode, code: result.code });
    setIsGenerateOpen(false);
    setGenLabel('');
    setGenExpiryDays(0);
    refreshCodes();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = (codeId: string) => {
    if (window.confirm('Are you sure you want to revoke this access code? Any active session authorized with this code will lose its privileges immediately.')) {
      localDataService.revokeAccessCode(tournament.id, codeId);
      refreshCodes();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <KeyRound className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">Access Codes & Authorization</h2>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Issue cryptographically salted 8-character codes to grant scoped <span className="text-amber-400 font-semibold">VIEW</span> or <span className="text-emerald-400 font-semibold">SCORE</span> roles without sharing master organizer credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsGenerateOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Generate New Code
        </button>
      </div>

      {/* Security Banner */}
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-400 space-y-1">
          <div className="font-semibold text-zinc-200">Zero-Knowledge Cryptographic Storage</div>
          <div>
            TournX stores only irreversible SHA-256 hashes of generated access codes. Plaintext codes cannot be recovered once the creation window is closed. Rate limiting is enforced against brute-force attempts.
          </div>
        </div>
      </div>

      {/* Access Codes Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        {codes.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <KeyRound className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div className="font-medium text-zinc-400">No access codes created yet</div>
            <p className="text-xs text-zinc-500 mt-1">
              Generate a VIEW or SCORE code to grant delegated access to match scorers or viewers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Label / Purpose</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Uses</th>
                  <th className="py-3 px-4">Expires</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {codes.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] ${
                          c.role === 'SCORE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {c.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {c.label || '—'}
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        ID: {c.id}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {c.use_count} times
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.is_active ? (
                        <button
                          type="button"
                          onClick={() => handleRevoke(c.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors"
                        >
                          Revoke
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-600">Revoked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Code Modal */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white">Generate Tournament Access Code</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Creates an unambiguous 8-character cryptographic token for this tournament.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">
                  Select Role & Permission Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGenRole('SCORE')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      genRole === 'SCORE'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
                      <Edit3 className="w-3.5 h-3.5" />
                      SCORE
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Can record live match scores & events. Cannot edit tournament rules.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGenRole('VIEW')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      genRole === 'VIEW'
                        ? 'bg-amber-500/10 border-amber-500 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-semibold text-amber-400 flex items-center gap-1.5 mb-1">
                      <Eye className="w-3.5 h-3.5" />
                      VIEW
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Read-only viewer access to private tournament details.
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Label / Memo (Optional)
                </label>
                <input
                  type="text"
                  value={genLabel}
                  onChange={e => setGenLabel(e.target.value)}
                  placeholder="e.g. Field Referee 1 or Official Streamer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Expiration
                </label>
                <select
                  value={genExpiryDays}
                  onChange={e => setGenExpiryDays(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:border-amber-500 focus:outline-none"
                >
                  <option value={0}>Never (Active until manually revoked)</option>
                  <option value={1}>1 Day (24 hours)</option>
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsGenerateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all"
                >
                  Generate Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-time Plaintext Reveal Modal */}
      {revealedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900 border border-emerald-500/40 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Your Access Code Has Been Generated</h3>
              <p className="text-xs text-amber-300/90 font-medium">
                Copy this code now. It will only be displayed once in plaintext!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-center space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                {revealedCode.code.role} Token
              </div>
              <div className="text-3xl font-mono font-black tracking-widest text-emerald-400 select-all">
                {revealedCode.raw}
              </div>
              <div className="text-xs text-zinc-400">
                Label: {revealedCode.code.label}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-[11px] text-zinc-400 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                TournX stores only the SHA-256 hash. If lost, you must revoke this code and generate a new one.
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleCopy(revealedCode.raw)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Code'}
              </button>
              <button
                type="button"
                onClick={() => setRevealedCode(null)}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
