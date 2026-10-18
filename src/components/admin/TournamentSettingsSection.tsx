import React, { useState } from 'react';
import { Tournament } from '../../types/multiTenant';
import { localDataService, DEMO_TOURNAMENT_ID } from '../../services/localDataService';
import { tournamentService } from '../../services/tournamentService';
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
  Shield,
  Loader2,
  X
} from 'lucide-react';

interface TournamentSettingsSectionProps {
  tournament: Tournament;
  onTournamentUpdated: () => void;
  onTournamentDeleted?: (nextTournamentId: string) => void;
}

export const TournamentSettingsSection: React.FC<TournamentSettingsSectionProps> = ({
  tournament,
  onTournamentUpdated,
  onTournamentDeleted,
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

  // Features config
  const [features, setFeatures] = useState({
    potmVoting: tournament.rules_config?.features?.potmVoting ?? true,
    goalscorersAndEvents: tournament.rules_config?.features?.goalscorersAndEvents ?? true,
    cardsAndSubs: tournament.rules_config?.features?.cardsAndSubs ?? true,
    referees: tournament.rules_config?.features?.referees ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const updates = {
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
          features: {
            ...(tournament.rules_config?.features || {}),
            ...features,
          },
        },
      };

      await tournamentService.updateTournament(tournament.id, updates);
      localDataService.updateTournament(tournament.id, updates);

      setFeedback({ type: 'success', message: 'Tournament settings saved successfully.' });
      onTournamentUpdated();

    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const [showResetDemoModal, setShowResetDemoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmResetDemo = () => {
    localDataService.resetDemoData();
    setShowResetDemoModal(false);
    window.location.reload();
  };

  const confirmDelete = async () => {
    if (tournament.id === DEMO_TOURNAMENT_ID) {
      setDeleteError('The default TournX demo tournament cannot be deleted.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await tournamentService.deleteTournament(tournament.id);
      localDataService.deleteTournament(tournament.id);
      localDataService.clearLastJoinedTournament();

      if (onTournamentDeleted) {
        onTournamentDeleted(DEMO_TOURNAMENT_ID);
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete tournament');
      setIsDeleting(false);
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

          {/* Optional Features Card */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" />
              Tournament Feature Switches
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {[
                { id: 'potmVoting' as const, label: 'Player of the Match (POTM)', desc: 'Voting & nominations' },
                { id: 'goalscorersAndEvents' as const, label: 'Goalscorer Tracking', desc: 'Golden boot & events' },
                { id: 'cardsAndSubs' as const, label: 'Cards & Disciplinary', desc: 'Yellow/red cards tracking' },
                { id: 'referees' as const, label: 'Match Officials', desc: 'Referee assignments' },
              ].map((item) => {
                const isEnabled = features[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => setFeatures(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isEnabled
                        ? 'bg-purple-950/20 border-purple-500/40 text-purple-200'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[10px] text-zinc-500">{item.desc}</div>
                    </div>
                    <div
                      className={`w-9 h-5 rounded-full transition-colors p-0.5 shrink-0 flex items-center ${
                        isEnabled ? 'bg-purple-600 justify-end' : 'bg-zinc-800 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </div>
                  </div>
                );
              })}
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
                onClick={() => setShowResetDemoModal(true)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold shrink-0 flex items-center gap-1.5 cursor-pointer"
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
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Tournament
                </button>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-zinc-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-rose-400">
                <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </span>
                <div>
                  <h3 className="font-bold text-white text-base">Delete Tournament?</h3>
                  <p className="text-xs text-zinc-400">This action cannot be undone.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) {
                    setShowDeleteModal(false);
                    setDeleteError(null);
                  }
                }}
                disabled={isDeleting}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
              <div className="text-zinc-300">
                You are about to permanently delete tournament:
              </div>
              <div className="font-bold text-sm text-white font-mono bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                {tournament.name}
              </div>
              <div className="text-[11px] text-zinc-400">
                Tournament ID: <span className="font-mono text-zinc-300">{tournament.id}</span>
              </div>
              <div className="text-rose-400 text-[11px] font-semibold pt-1 border-t border-zinc-800/80">
                All associated matches, squads, player statistics, and access codes will be wiped.
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Demo Confirmation Modal */}
      {showResetDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-2.5 text-zinc-200">
              <span className="p-2 rounded-xl bg-zinc-800">
                <RotateCcw className="w-5 h-5 text-amber-400" />
              </span>
              <div>
                <h3 className="font-bold text-white text-base">Reset Demo Data?</h3>
                <p className="text-xs text-zinc-400">Restore default demo matches and teams.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300">
              Custom tournaments will <span className="font-bold text-white">not</span> be deleted. Only the default demo tournament state will be reset.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetDemoModal(false)}
                className="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetDemo}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
