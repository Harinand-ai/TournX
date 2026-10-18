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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col max-h-[92vh] overflow-y-auto text-slate-900">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase text-slate-900 tracking-wide">
              Create New Tournament
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Tournament Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Summer Premier League"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            {name.trim() && (
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                URL Slug: /t/{slugify(name)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Season / Edition
              </label>
              <input
                type="text"
                placeholder="2026"
                value={season}
                onChange={e => setSeason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value as StageType)}
                className="w-full bg-slate-50 border border-slate-300 px-3.5 py-2 text-sm text-slate-900 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 cursor-pointer"
              >
                <option value="SINGLE_ROUND_ROBIN">Single Round-Robin</option>
                <option value="DOUBLE_ROUND_ROBIN">Double Round-Robin</option>
                <option value="SINGLE_ELIMINATION">Knockout (Bracket)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief overview or organizer notes"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none"
            />
          </div>

          {/* Scoring Rules Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase mb-2.5">
              <Settings2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Standings Points Rules</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Win Pts</label>
                <input
                  type="number"
                  min="0"
                  value={ptsWin}
                  onChange={e => setPtsWin(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs text-slate-900 rounded-lg text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Draw Pts</label>
                <input
                  type="number"
                  min="0"
                  value={ptsDraw}
                  onChange={e => setPtsDraw(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs text-slate-900 rounded-lg text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Loss Pts</label>
                <input
                  type="number"
                  min="0"
                  value={ptsLoss}
                  onChange={e => setPtsLoss(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 px-2 py-1 text-xs text-slate-900 rounded-lg text-center font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-xs transition cursor-pointer"
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
