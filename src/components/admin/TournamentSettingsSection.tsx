import React, { useState } from 'react';
import { Tournament, TournamentRulesConfig } from '../../types/multiTenant';
import { localDataService, DEMO_TOURNAMENT_ID } from '../../services/localDataService';
import { 
  Settings, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Globe, 
  Lock, 
  RotateCcw, 
  Trash2,
  Sliders,
  Shield
} from 'lucide-react';

interface TournamentSettingsSectionProps {
  tournament: Tournament;
  onTournamentUpdated: () => void;
}

export const TournamentSettingsSection: React.FC<TournamentSettingsSectionProps> = ({
  tournament,
  onTournamentUpdated,
}) => {
  const [name, setName] = useState(tournament.name || '');
  const [slug, setSlug] = useState(tournament.slug || '');
  const [description, setDescription] = useState(tournament.description || '');
  const [season, setSeason] = useState(tournament.season || '');
  const [visibility, setVisibility] = useState(tournament.visibility || 'PRIVATE');
  const [status, setStatus] = useState(tournament.status || 'REGISTRATION');

  // Rules config
  const [winPoints, setWinPoints] = useState(tournament.rules_config?.points_for_win ?? 3);
  const [drawPoints, setDrawPoints] = useState(tournament.rules_config?.points_for_draw ?? 1);
  const [lossPoints, setLossPoints] = useState(tournament.rules_config?.points_for_loss ?? 0);
  const [matchDuration, setMatchDuration] = useState(tournament.rules_config?.match_duration_minutes ?? 50);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      localDataService.updateTournament(tournament.id, {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        season: season.trim(),
        visibility,
        status,
        rules_config: {
          ...(tournament.rules_config || {}),
          points_for_win: winPoints,
          points_for_draw: drawPoints,
          points_for_loss: lossPoints,
          match_duration_minutes: matchDuration,
        },
      });

      setFeedback({ type: 'success', message: 'Tournament settings saved successfully.' });
      onTournamentUpdated();

    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemo = () => {
    if (window.confirm('Reset demo tournament data to initial state? (User-created tournaments will NOT be deleted).')) {
      localDataService.resetDemoData();
      window.location.reload();
    }
  };

  const handleDelete = () => {
    if (tournament.id === DEMO_TOURNAMENT_ID) {
      alert('The default TournX demo tournament cannot be deleted.');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete "${tournament.name}"? This action cannot be undone.`)) {
      localDataService.deleteTournament(tournament.id);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Settings className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">Tournament Rules & Configuration</h2>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Configure metadata, public visibility, match duration, and points scoring rules for <span className="text-purple-400 font-semibold">{tournament.name}</span>.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-black font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          )}
          <div className="text-sm">{feedback.message}</div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Card: Core Details */}
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            Core Identification
          </h3>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Tournament Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              URL Slug (Route: /t/{slug})
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-white text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Season / Year
              </label>
              <input
                type="text"
                value={season}
                onChange={e => setSeason(e.target.value)}
                placeholder="2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value="REGISTRATION">Registration</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  visibility === 'PUBLIC'
                    ? 'bg-purple-500/10 border-purple-500 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <Globe className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-xs font-semibold">Public</div>
                  <div className="text-[10px] text-zinc-500">Accessible to all visitors</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                  visibility === 'PRIVATE'
                    ? 'bg-purple-500/10 border-purple-500 text-white'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold">Private</div>
                  <div className="text-[10px] text-zinc-500">Requires VIEW access code</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Right Card: Scoring & Rules */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              Points & Rules Configuration
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Points for Win
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={winPoints}
                  onChange={e => setWinPoints(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Points for Draw
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={drawPoints}
                  onChange={e => setDrawPoints(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Points for Loss
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={lossPoints}
                  onChange={e => setLossPoints(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                Match Duration (Minutes)
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={matchDuration}
                onChange={e => setMatchDuration(parseInt(e.target.value) || 50)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm font-mono focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Danger Zone Card */}
          <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Danger Zone
            </h3>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div>
                <div className="text-xs font-semibold text-zinc-200">Reset Demo Data</div>
                <div className="text-[11px] text-zinc-400">
                  Restore default demo matches and teams without deleting custom tournaments.
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetDemo}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold shrink-0 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Demo
              </button>
            </div>

            {tournament.id !== DEMO_TOURNAMENT_ID && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-rose-900/40">
                <div>
                  <div className="text-xs font-semibold text-rose-300">Delete This Tournament</div>
                  <div className="text-[11px] text-zinc-400">
                    Permanently delete all teams, matches, and access codes for this tournament.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-lg shadow-rose-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Tournament
                </button>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
