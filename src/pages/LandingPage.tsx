import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Key, 
  LogIn, 
  BookOpen,
  FileText,
  Save,
  Shield
} from 'lucide-react';
import { supabase, isSupabaseConfigured, resendConfirmationEmail, sendPasswordResetEmail } from '../lib/supabase';
import { localDataService, FTM_STORAGE_KEYS } from '../services/localDataService';
import { tournamentService } from '../services/tournamentService';
import { Tournament } from '../types/multiTenant';
import { DraftsModal } from '../components/admin/DraftsModal';
import { PageTransition3D } from '../components/PageTransition3D';

interface LandingPageProps {
  onOrganizeClick: (initialTournamentData?: { name?: string; description?: string; visibility?: 'PUBLIC' | 'PRIVATE'; prompt?: string }) => void;
  onJoinTournament: (tourneySlug: string) => void;
  onOpenPublicDemo: () => void;
  activeTournament?: Tournament;
  noticeMessage?: string;
  onOpenTutorial?: () => void;
  isAdminLoggedIn?: boolean;
}

const EXAMPLE_PROMPTS = [
  {
    title: 'Kerala Champions Cup',
    prompt: "I'm organising a five-a-side football tournament called Kerala Champions Cup on November 15, 2026, at Kannur Municipal Stadium. Six teams will participate: Kerala Blasters, Bengaluru FC, Chennaiyin FC, Mumbai City FC, FC Goa and Hyderabad FC. We want a single round-robin format. Each team can have five starting players and two substitutes. A win gives three points, a draw gives one point and a loss gives zero points. Enable goalscorer tracking and Player of the Match, and make the tournament public to people with the tournament access code."
  },
  {
    title: 'Premier 4-Team League',
    prompt: 'Create a 4-team football tournament with Arsenal, Chelsea, Liverpool and Tottenham. Single round-robin league starting tomorrow at 4 PM at Wembley Arena.'
  },
  {
    title: '8-Team Knockout Cup',
    prompt: '8-team single elimination football knockout cup called Metro Super Cup this Saturday 5 PM with 50 minute matches.'
  }
];

export function LandingPage({
  onOrganizeClick,
  onJoinTournament,
  activeTournament,
  noticeMessage,
  onOpenTutorial,
  isAdminLoggedIn = false
}: LandingPageProps) {
  // Master Prompt Text
  const [masterPromptText, setMasterPromptText] = useState(() => {
    try {
      return localStorage.getItem(FTM_STORAGE_KEYS.PROMPT_DRAFT) || '';
    } catch {
      return '';
    }
  });

  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [draftsCount, setDraftsCount] = useState<number>(0);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  // Clean stale frontend demo keys on mount safely
  useEffect(() => {
    localDataService.cleanFrontendDemoState();
    try {
      setDraftsCount(tournamentService.getDrafts().length);
    } catch {}
  }, []);

  const refreshDraftsCount = () => {
    try {
      setDraftsCount(tournamentService.getDrafts().length);
    } catch {}
  };

  // Participant Access Code state
  const [joinCodeOrLink, setJoinCodeOrLink] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  // Organizer Auth Modal / Form state
  const [showAuthSection, setShowAuthSection] = useState(false);
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD'>('SIGN_IN');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPassword, setOrganizerPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);
  const [isUnconfirmedError, setIsUnconfirmedError] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleLaunchPrompt = () => {
    if (!masterPromptText.trim()) return;
    try {
      localStorage.setItem(FTM_STORAGE_KEYS.PROMPT_DRAFT, masterPromptText.trim());
    } catch {}
    onOrganizeClick({ prompt: masterPromptText.trim() });
  };

  const handleSavePromptDraft = () => {
    if (!masterPromptText.trim()) return;
    try {
      const now = new Date().toISOString();
      tournamentService.saveDraft({
        id: `draft-${Date.now()}`,
        name: masterPromptText.slice(0, 32).trim() + (masterPromptText.length > 32 ? '...' : ''),
        prompt: masterPromptText.trim(),
        teamsCount: 0,
        format: 'Single Round-Robin',
        status: 'DRAFT',
        updated_at: now,
      });
      refreshDraftsCount();
      setDraftNotice('Prompt draft saved.');
      setTimeout(() => setDraftNotice(null), 3000);
    } catch {
      setDraftNotice('Failed to save draft.');
    }
  };

  // Handle Join Tournament via Access Code or Direct Link
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoinSuccess(null);

    const input = joinCodeOrLink.trim();
    if (!input) {
      setJoinError('Please enter a tournament access code or link.');
      return;
    }

    // 1. Direct URL paste: /t/:slug
    const urlMatch = input.match(/(?:^|\/)t\/([a-zA-Z0-9_-]+)/);
    if (urlMatch && urlMatch[1]) {
      const slug = urlMatch[1];
      onJoinTournament(slug);
      return;
    }

    // 2. Strict Access Code Resolution via tournamentService
    setIsVerifyingCode(true);
    try {
      const result = await tournamentService.resolveAccessCode(input);
      if (result.success && result.tournament) {
        setJoinSuccess(`Pass verified! Loading ${result.tournament.name}...`);
        setTimeout(() => {
          onJoinTournament(result.tournament!.slug || result.tournament!.id);
        }, 500);
        return;
      }

      // 3. Fallback: Check if it's a direct known slug
      const allTournaments = localDataService.getAllTournaments();
      const matched = allTournaments.find(
        t => (t.slug && t.slug.toLowerCase() === input.toLowerCase()) || t.id === input
      );
      if (matched) {
        onJoinTournament(matched.slug || matched.id);
        return;
      }

      setJoinError(result.error || 'Invalid or revoked access code. Please verify your code and try again.');
    } catch (err: any) {
      setJoinError(err.message || 'Access code verification failed.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Organizer Sign-in
  const handleOrganizerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setConfirmationNotice(null);
    setIsUnconfirmedError(false);

    try {
      if (!isSupabaseConfigured || !supabase) {
        localDataService.setDevAdminLoggedIn(true);
        onOrganizeClick();
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: organizerEmail.trim(),
        password: organizerPassword,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setIsUnconfirmedError(true);
          throw new Error('Your email address has not been confirmed yet.');
        }
        throw error;
      }

      if (data?.user) {
        onOrganizeClick();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  // Organizer Sign-up
  const handleOrganizerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setConfirmationNotice(null);

    try {
      if (!isSupabaseConfigured || !supabase) {
        localDataService.setDevAdminLoggedIn(true);
        onOrganizeClick();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: organizerEmail.trim(),
        password: organizerPassword,
      });

      if (error) throw error;

      if (data?.user?.identities?.length === 0) {
        throw new Error('An account with this email already exists.');
      }

      setConfirmationNotice('Confirmation email sent! Please check your inbox.');
      setAuthMode('SIGN_IN');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  // Password recovery
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setConfirmationNotice(null);

    try {
      const res = await sendPasswordResetEmail(organizerEmail.trim());
      if (!res.success) {
        throw new Error(res.error || 'Failed to send recovery email.');
      }
      setConfirmationNotice('Password recovery email dispatched.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Password recovery failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!organizerEmail.trim() || isResending) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await resendConfirmationEmail(organizerEmail.trim());
      if (res.success) {
        setResendStatus('Verification link dispatched.');
      } else {
        setErrorMessage(res.error || 'Failed to resend confirmation.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <PageTransition3D transitionKey="landing" type="fade">
      <div className="w-full min-h-[85vh] flex flex-col justify-center items-center py-8 px-4 sm:px-6 bg-[#faf9f5] text-[#0f1712]">
        
        {/* Editorial Header Composition */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4f2ea] border border-[#e5e3d8] text-emerald-800 text-[11px] font-semibold tracking-wider uppercase mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>NATURAL LANGUAGE FOOTBALL MANAGEMENT</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0f1712] mb-3 font-sans">
            Tourn<span className="text-emerald-700">X</span>
          </h1>
          <p className="text-sm sm:text-base text-[#57635a] max-w-lg mx-auto font-sans leading-relaxed">
            From a single sentence in plain English to official fixtures, live scoreboards, and squad rosters.
          </p>
        </div>

        {/* Global Notice Message if present */}
        {noticeMessage && (
          <div className="w-full max-w-2xl mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{noticeMessage}</div>
          </div>
        )}

        {/* THE SINGLE DOMINANT VISUAL ELEMENT: Editorial Master Prompt Composer */}
        <div className="w-full max-w-3xl mb-8">
          <div className="relative p-6 sm:p-8 rounded-2xl bg-white border border-[#e5e3d8] shadow-sm overflow-hidden">
            
            {/* Header row: Status badge + Contextual Tutorial Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="text-xs font-semibold text-[#0f1712] uppercase tracking-wider">
                  Tournament Creator
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Contextual Tutorial Discovery Point */}
                {onOpenTutorial && (
                  <button
                    type="button"
                    onClick={onOpenTutorial}
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium shadow-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                    <span>6-Step Tutorial</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsDraftsModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#f4f2ea] hover:bg-[#eae7dc] border border-[#e5e3d8] text-[#57635a] hover:text-[#0f1712] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Drafts</span>
                  {draftsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {draftsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0f1712] tracking-tight">
                Describe your tournament. Generate it. Review it. Confirm it.
              </h2>
              <p className="text-xs sm:text-sm text-[#57635a] mt-1 font-sans leading-relaxed">
                Type your tournament setup in natural English. TournX extracts clubs, formats, squad sizes, and venues instantly.
              </p>
            </div>

            {/* Prompt Composer Box */}
            <div className="space-y-4">
              <textarea
                value={masterPromptText}
                onChange={(e) => setMasterPromptText(e.target.value)}
                placeholder="e.g. Create an 8-team tournament with Arsenal, Chelsea, Liverpool, Spurs, Man City, Man United, Everton and Aston Villa at college ground tomorrow 5 pm"
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-[#faf9f5] border border-[#e5e3d8] text-[#0f1712] text-sm focus:outline-none focus:border-emerald-600 focus:bg-white font-sans placeholder:text-[#8a968d] transition resize-none leading-relaxed"
              />

              {/* Curated Prompt Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[#57635a] font-medium">Examples:</span>
                {EXAMPLE_PROMPTS.map((ex) => (
                  <button
                    key={ex.title}
                    type="button"
                    onClick={() => setMasterPromptText(ex.prompt)}
                    className="px-2.5 py-1 rounded-lg bg-[#f4f2ea] hover:bg-[#eae7dc] border border-[#e5e3d8] text-[#0f1712] text-[11px] transition cursor-pointer"
                  >
                    "{ex.title}"
                  </button>
                ))}
              </div>

              {/* Actions row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSavePromptDraft}
                  disabled={!masterPromptText.trim()}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#f4f2ea] hover:bg-[#eae7dc] border border-[#e5e3d8] text-[#57635a] hover:text-[#0f1712] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  <Save className="w-3.5 h-3.5 text-[#57635a]" />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  onClick={handleLaunchPrompt}
                  disabled={!masterPromptText.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#0f1712] hover:bg-[#1f2e24] text-white font-semibold text-sm shadow-xs transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 group"
                >
                  <span>Generate Preview</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              {draftNotice && (
                <p className="text-xs text-emerald-800 text-center pt-1 font-medium">
                  {draftNotice}
                </p>
              )}
            </div>

            {/* Active tournament quick link if organizer is signed in */}
            {activeTournament && (
              <div className="mt-6 pt-4 border-t border-[#e5e3d8] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0f1712]">
                    Current Workspace: {activeTournament.name}
                  </div>
                  <div className="text-[11px] text-[#57635a]">
                    {activeTournament.season || '2026'} • {activeTournament.visibility}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOrganizeClick()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0f1712] hover:bg-[#1f2e24] text-xs font-semibold text-white transition cursor-pointer"
                >
                  Open Workspace
                </button>
              </div>
            )}

          </div>
        </div>

        {/* RESTRAINED ACCESS CODE ENTRY FOR PARTICIPANTS */}
        <div className="w-full max-w-3xl mb-8">
          <div className="p-6 rounded-2xl bg-white border border-[#e5e3d8] shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-[#0f1712] uppercase tracking-wider">
                Enter with Access Code or Tournament Link
              </h2>
            </div>
            <p className="text-xs text-[#57635a] mb-4 leading-relaxed">
              Have an access pass or participant code? Enter it below to open the tournament scoreboard, fixtures, and standings.
            </p>

            {joinSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{joinSuccess}</span>
              </div>
            )}

            {joinError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            <form onSubmit={handleJoinSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={joinCodeOrLink}
                  onChange={(e) => setJoinCodeOrLink(e.target.value)}
                  placeholder="e.g. TX-VIEW-... or tournament link"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#faf9f5] border border-[#e5e3d8] text-[#0f1712] text-sm focus:outline-none focus:border-emerald-600 focus:bg-white font-mono placeholder:text-[#8a968d] transition"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingCode}
                className="px-6 py-2.5 rounded-lg bg-[#0f1712] hover:bg-[#1f2e24] text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifyingCode ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Enter Tournament</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ORGANIZER SIGN-IN SECTION */}
        <div className="w-full max-w-3xl">
          <div className="p-5 rounded-xl border border-[#e5e3d8] bg-[#f7f6f1] text-center">
            {!showAuthSection ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#57635a]">
                  Organizing a league or managing clubs?
                </span>
                <button
                  type="button"
                  onClick={() => setShowAuthSection(true)}
                  className="text-xs font-semibold text-[#0f1712] hover:text-emerald-800 transition cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Organizer Sign In</span>
                </button>
              </div>
            ) : (
              <div className="text-left space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#e5e3d8]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0f1712]">
                    {authMode === 'SIGN_UP' ? 'Create Organizer Account' : authMode === 'FORGOT_PASSWORD' ? 'Reset Password' : 'Organizer Sign In'}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('SIGN_IN');
                        setErrorMessage(null);
                        setConfirmationNotice(null);
                      }}
                      className={`font-semibold cursor-pointer ${authMode === 'SIGN_IN' ? 'text-emerald-800 underline' : 'text-[#57635a]'}`}
                    >
                      Sign In
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('SIGN_UP');
                        setErrorMessage(null);
                        setConfirmationNotice(null);
                      }}
                      className={`font-semibold cursor-pointer ${authMode === 'SIGN_UP' ? 'text-emerald-800 underline' : 'text-[#57635a]'}`}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {confirmationNotice && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{confirmationNotice}</span>
                  </div>
                )}

                {authMode === 'SIGN_IN' && (
                  <form onSubmit={handleOrganizerSignIn} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f1712] mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={organizerEmail}
                        onChange={(e) => setOrganizerEmail(e.target.value)}
                        placeholder="organizer@club.com"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#e5e3d8] text-[#0f1712] text-sm focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-[#0f1712]">Password</label>
                        <button
                          type="button"
                          onClick={() => setAuthMode('FORGOT_PASSWORD')}
                          className="text-[11px] text-[#57635a] hover:text-[#0f1712]"
                        >
                          Forgot?
                        </button>
                      </div>
                      <input
                        type="password"
                        required
                        value={organizerPassword}
                        onChange={(e) => setOrganizerPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#e5e3d8] text-[#0f1712] text-sm focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 rounded-lg bg-[#0f1712] hover:bg-[#1f2e24] text-white font-semibold text-xs cursor-pointer transition disabled:opacity-50"
                    >
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                  </form>
                )}

                {authMode === 'SIGN_UP' && (
                  <form onSubmit={handleOrganizerSignUp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f1712] mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={organizerEmail}
                        onChange={(e) => setOrganizerEmail(e.target.value)}
                        placeholder="organizer@club.com"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#e5e3d8] text-[#0f1712] text-sm focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0f1712] mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={organizerPassword}
                        onChange={(e) => setOrganizerPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#e5e3d8] text-[#0f1712] text-sm focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs cursor-pointer transition disabled:opacity-50"
                    >
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </form>
                )}

                {authMode === 'FORGOT_PASSWORD' && (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f1712] mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={organizerEmail}
                        onChange={(e) => setOrganizerEmail(e.target.value)}
                        placeholder="organizer@club.com"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-[#e5e3d8] text-[#0f1712] text-sm focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 rounded-lg bg-[#0f1712] hover:bg-[#1f2e24] text-white font-semibold text-xs cursor-pointer transition disabled:opacity-50"
                    >
                      {isLoading ? 'Sending...' : 'Send Recovery Link'}
                    </button>
                  </form>
                )}

                {isUnconfirmedError && (
                  <div className="pt-2 border-t border-[#e5e3d8] flex items-center justify-between text-xs">
                    <span className="text-[#57635a]">Need a new confirmation email?</span>
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={isResending}
                      className="font-semibold text-emerald-800 hover:underline"
                    >
                      {isResending ? 'Sending...' : 'Resend Email'}
                    </button>
                  </div>
                )}
                {resendStatus && (
                  <p className="text-xs text-emerald-800">{resendStatus}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* DRAFTS VAULT MODAL */}
        <DraftsModal
          isOpen={isDraftsModalOpen}
          onClose={() => setIsDraftsModalOpen(false)}
          onSelectDraft={(draft) => {
            if (draft.prompt) {
              setMasterPromptText(draft.prompt);
            }
          }}
          onDraftsChanged={refreshDraftsCount}
        />

      </div>
    </PageTransition3D>
  );
}
