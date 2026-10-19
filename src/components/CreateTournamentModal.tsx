import React, { useState } from 'react';
import { X, Trophy, Plus, Settings2, AlertCircle } from 'lucide-react';
import { slugify } from '../services/localDataService';
import { tournamentService } from '../services/tournamentService';
import { StageType } from '../types/multiTenant';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTournamentCreated: (tourneyId: string) => void;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  onTournamentCreated,
}) => {
  const [name, setName] = useState('');
  const [season, setSeason] = useState(() => new Date().getFullYear().toString());
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<StageType>('SINGLE_ROUND_ROBIN');
  const [ptsWin, setPtsWin] = useState(3);
  const [ptsDraw, setPtsDraw] = useState(1);
  const [ptsLoss, setPtsLoss] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSubmitting(true);

    try {
      const newTourney = await tournamentService.createTournament({
        name: name.trim(),
        season: season.trim(),
        description: description.trim(),
        rules_config: {
          points_for_win: Number(ptsWin),
          points_for_draw: Number(ptsDraw),
          points_for_loss: Number(ptsLoss),
          tie_breaker_order: ['POINTS', 'GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'],
          match_duration_minutes: 50,
          half_time_duration_minutes: 5,
          match_type: format,
          format: format,
        },
      });

      onTournamentCreated(newTourney.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create tournament.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0f1411] border border-[#1f2e26] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto text-[#f1f5f9]">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#141d18] border-b border-[#1f2e26]">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-lime-400" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-lime-400">
              Create New Tournament
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a261f] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
              Tournament Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Summer Premier League"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#0b100d] border border-[#23352a] px-3.5 py-2.5 text-xs text-[#f1f5f9] placeholder-slate-600 rounded-xl focus:border-lime-500 focus:outline-none font-sans"
            />
            {name.trim() && (
              <span className="text-[11px] text-lime-400 font-mono mt-1 block">
                URL Slug: /t/{slugify(name)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                Season / Year
              </label>
              <input
                type="text"
                placeholder="2026"
                value={season}
                onChange={e => setSeason(e.target.value)}
                className="w-full bg-[#0b100d] border border-[#23352a] px-3.5 py-2.5 text-xs text-[#f1f5f9] placeholder-slate-600 rounded-xl focus:border-lime-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
                Competition Format
              </label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value as StageType)}
                className="w-full bg-[#0b100d] border border-[#23352a] px-3 py-2.5 text-xs text-[#f1f5f9] rounded-xl focus:border-lime-500 focus:outline-none font-mono cursor-pointer"
              >
                <option value="SINGLE_ROUND_ROBIN">Single Round-Robin (All-play-all)</option>
                <option value="DOUBLE_ROUND_ROBIN">Double Round-Robin (Home & Away)</option>
                <option value="SINGLE_ELIMINATION">Knockout (Single Elimination)</option>
                <option value="LEAGUE_WITH_PLAYOFFS">League + Semifinals Playoff</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 5-a-side college invitational tournament"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-[#0b100d] border border-[#23352a] px-3.5 py-2 text-xs text-[#f1f5f9] placeholder-slate-600 rounded-xl focus:border-lime-500 focus:outline-none font-sans resize-none"
            />
          </div>

          {/* Points Rules */}
          <div className="p-3.5 bg-[#0b100d] border border-[#23352a] rounded-xl space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              Scoring Points Configuration
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Win Pts</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={ptsWin}
                  onChange={e => setPtsWin(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#131b16] border border-[#25392d] text-center text-xs font-mono font-bold text-lime-400 py-1.5 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Draw Pts</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={ptsDraw}
                  onChange={e => setPtsDraw(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#131b16] border border-[#25392d] text-center text-xs font-mono font-bold text-lime-400 py-1.5 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-0.5">Loss Pts</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={ptsLoss}
                  onChange={e => setPtsLoss(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#131b16] border border-[#25392d] text-center text-xs font-mono font-bold text-lime-400 py-1.5 rounded-lg focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1f2e26]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#273a2f] hover:bg-[#141d18] text-xs font-mono font-semibold text-slate-300 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-5 py-2 bg-lime-500 hover:bg-lime-400 text-black text-xs font-mono font-extrabold rounded-xl transition cursor-pointer disabled:opacity-50 shadow-md flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Creating...' : 'Create Tournament'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
