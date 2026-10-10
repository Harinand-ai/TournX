import React, { useState } from 'react';
import { X, Trophy, Plus, Settings2 } from 'lucide-react';
import { localDataService, slugify } from '../services/localDataService';
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
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState<StageType>('SINGLE_ROUND_ROBIN');
  const [ptsWin, setPtsWin] = useState(3);
  const [ptsDraw, setPtsDraw] = useState(1);
  const [ptsLoss, setPtsLoss] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newTourney = localDataService.createTournament({
      name: name.trim(),
      season: season.trim(),
      description: description.trim(),
      rules_config: {
        points_for_win: Number(ptsWin),
        points_for_draw: Number(ptsDraw),
        points_for_loss: Number(ptsLoss),
      },
    });

    onTournamentCreated(newTourney.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[#241a12] border-4 border-[#120d08] shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto text-slate-100">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e150e] border-b-3 border-[#120d08]">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#ffff55]" />
            <h2 className="text-sm font-black uppercase text-[#ffff55] tracking-wide font-display">
              CREATE NEW TOURNAMENT
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 mc-btn-red text-white text-xs font-black cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#d8c7b3] mb-1">
              Tournament Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Summer Premier League"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#18110a] border-2 border-[#3d2c1e] px-3 py-2 text-sm text-white placeholder-slate-500 rounded focus:outline-none focus:border-[#4a7227]"
            />
            {name.trim() && (
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                URL Slug: /t/{slugify(name)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#d8c7b3] mb-1">
                Season / Edition
              </label>
              <input
                type="text"
                placeholder="2026"
                value={season}
                onChange={e => setSeason(e.target.value)}
                className="w-full bg-[#18110a] border-2 border-[#3d2c1e] px-3 py-2 text-sm text-white placeholder-slate-500 rounded focus:outline-none focus:border-[#4a7227]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#d8c7b3] mb-1">
                Format
              </label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value as StageType)}
                className="w-full bg-[#18110a] border-2 border-[#3d2c1e] px-3 py-2 text-sm text-white rounded focus:outline-none focus:border-[#4a7227]"
              >
                <option value="SINGLE_ROUND_ROBIN">Single Round-Robin</option>
                <option value="DOUBLE_ROUND_ROBIN">Double Round-Robin (Home/Away)</option>
                <option value="SINGLE_ELIMINATION">Knockout (Bracket)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#d8c7b3] mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief overview or organizer notes"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-[#18110a] border-2 border-[#3d2c1e] px-3 py-2 text-sm text-white placeholder-slate-500 rounded focus:outline-none focus:border-[#4a7227]"
            />
          </div>

          {/* Scoring Rules Section */}
          <div className="p-3 bg-[#1c140d] border border-[#3d2c1e] rounded">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase mb-2">
              <Settings2 className="w-3.5 h-3.5" />
              <span>Standings Points Rules</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400">Win Pts</label>
                <input
                  type="number"
                  min="0"
                  value={ptsWin}
                  onChange={e => setPtsWin(Number(e.target.value))}
                  className="w-full bg-[#18110a] border border-[#3d2c1e] px-2 py-1 text-xs text-white rounded"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400">Draw Pts</label>
                <input
                  type="number"
                  min="0"
                  value={ptsDraw}
                  onChange={e => setPtsDraw(Number(e.target.value))}
                  className="w-full bg-[#18110a] border border-[#3d2c1e] px-2 py-1 text-xs text-white rounded"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400">Loss Pts</label>
                <input
                  type="number"
                  min="0"
                  value={ptsLoss}
                  onChange={e => setPtsLoss(Number(e.target.value))}
                  className="w-full bg-[#18110a] border border-[#3d2c1e] px-2 py-1 text-xs text-white rounded"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 mc-btn text-xs font-bold text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#4a7227] hover:bg-[#5b8c30] text-[#ffff55] border-2 border-[#120d08] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Tournament</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
