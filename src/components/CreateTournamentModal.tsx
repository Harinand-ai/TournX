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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#19191F] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto text-[#F0E9E7]">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#101013] border-b border-white/10">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#F02D50]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F0E9E7]">
              Create New Tournament
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A5A1A4] hover:text-[#F0E9E7] hover:bg-white/5 transition cursor-pointer"
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
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A5A1A4] mb-1">
              Tournament Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Summer Premier League"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#101013] border border-white/10 px-3.5 py-2.5 text-xs text-[#F0E9E7] placeholder-[#A5A1A4]/50 rounded-xl focus:border-[#F02D50] focus:outline-none font-sans"
            />
            {name.trim() && (
              <span className="text-[11px] text-[#F02D50] font-mono mt-1 block">
                URL Slug: /t/{slugify(name)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A5A1A4] mb-1">
                Season / Year
              </label>
              <input
                type="text"
                placeholder="2026"
                value={season}
                onChange={e => setSeason(e.target.value)}
                className="w-full bg-[#101013] border border-white/10 px-3.5 py-2.5 text-xs text-[#F0E9E7] placeholder-[#A5A1A4]/50 rounded-xl focus:border-[#F02D50] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A5A1A4] mb-1">
                Competition Format
              </label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value as StageType)}
                className="w-full bg-[#101013] border border-white/10 px-3 py-2.5 text-xs text-[#F0E9E7] rounded-xl focus:border-[#F02D50] focus:outline-none font-mono cursor-pointer"
              >
                <option value="SINGLE_ROUND_ROBIN" className="bg-[#19191F]">Single Round-Robin (All-play-all)</option>
                <option value="DOUBLE_ROUND_ROBIN" className="bg-[#19191F]">Double Round-Robin (Home & Away)</option>
                <option value="SINGLE_ELIMINATION" className="bg-[#19191F]">Knockout (Single Elimination)</option>
                <option value="LEAGUE_WITH_PLAYOFFS" className="bg-[#19191F]">League + Semifinals Playoff</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A5A1A4] mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 5-a-side college invitational tournament"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-[#101013] border border-white/10 px-3.5 py-2 text-xs text-[#F0E9E7] placeholder-[#A5A1A4]/50 rounded-xl focus:border-[#F02D50] focus:outline-none font-sans resize-none"
            />
          </div>

          {/* Points Rules */}
          <div className="p-3.5 bg-[#101013] border border-white/10 rounded-xl space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#A5A1A4] block">
              Scoring Points Configuration
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-[#A5A1A4] mb-0.5">Win Pts</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={ptsWin}
                  onChange={e => setPtsWin(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#19191F] border border-white/10 text-center text-xs font-mono font-bold text-[#F02D50] py-1.5 rounded-lg focus:outline-none focus:border-[#F02D50]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#A5A1A4] mb-0.5">Draw Pts</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={ptsDraw}
                  onChange={e => setPtsDraw(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#19191F] border border-white/10 text-center text-xs font-mono font-bold text-[#F02D50] py-1.5 rounded-lg focus:outline-none focus:border-[#F02D50]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#A5A1A4] mb-0.5">Loss Pts</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={ptsLoss}
                  onChange={e => setPtsLoss(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#19191F] border border-white/10 text-center text-xs font-mono font-bold text-[#F02D50] py-1.5 rounded-lg focus:outline-none focus:border-[#F02D50]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-white/10 hover:bg-white/5 text-xs font-mono font-semibold text-[#A5A1A4] hover:text-[#F0E9E7] rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-5 py-2 bg-[#F02D50] hover:bg-[#b01e37] text-white text-xs font-mono font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shadow-lg shadow-[#F02D50]/20 flex items-center gap-1.5"
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
