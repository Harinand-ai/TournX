import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Key, 
  LogIn, 
  BookOpen,
  FileText,
  Save,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';
import { supabase, isSupabaseConfigured, resendConfirmationEmail, sendPasswordResetEmail } from '../lib/supabase';
import { localDataService, FTM_STORAGE_KEYS } from '../services/localDataService';
import { tournamentService } from '../services/tournamentService';
import { Tournament } from '../types/multiTenant';
import { DraftsModal } from '../components/admin/DraftsModal';
import { PromptGuidanceSection } from '../components/PromptGuidanceSection';
import { PageTransition3D } from '../components/PageTransition3D';
import { TournXEmblemCanvas3D } from '../components/three/TournXEmblemCanvas3D';

interface LandingPageProps {
  onOrganizeClick: (initialTournamentData?: { name?: string; description?: string; visibility?: 'PUBLIC' | 'PRIVATE'; prompt?: string }) => void;
  onJoinTournament: (tourneySlug: string) => void;
  onOpenPublicDemo: () => void;
  activeTournament?: Tournament;
  noticeMessage?: string;
  onOpenTutorial?: () => void;
  isAdminLoggedIn?: boolean;
}

export function LandingPage({
  onOrganizeClick,
  onJoinTournament,
  activeTournament,
  noticeMessage,
  onOpenTutorial,
  isAdminLoggedIn = false
}: LandingPageProps) {
  // Master Prompt Text
  const [masterPromptText, setMasterPromptText] = useState('');

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
      setDraftNotice('Draft saved to vault.');
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
      if (
        import.meta.env.DEV &&
        ((organizerEmail.trim() === 'admin@ftm.local' && organizerPassword === 'DemoAdmin@2026') ||
         organizerEmail.trim() === 'admin' ||
         organizerEmail.trim().includes('admin'))
      ) {
        localDataService.setDevAdminLoggedIn(true);
        onOrganizeClick();
        return;
      }

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

      setConfirmationNotice('Confirmation email dispatched! Please check your inbox.');
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
      <div className="w-full min-h-[90vh] flex flex-col justify-start items-center py-6 sm:py-10 px-4 sm:px-6 bg-[#101013] text-[#F0E9E7] relative overflow-hidden">
        
        {/* Subtle Ambient Stadium Lighting (Crimson Atmosphere + Burgundy Depth) */}
        <div className="absolute top-0 inset-x-0 h-96 bg-[radial-gradient(ellipse_at_top,_rgba(240, 45, 80,0.12)_0%,_rgba(33,25,29,0.3)_40%,_transparent_75%)] pointer-events-none" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-[#991B35]/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Global Notice Message if present */}
        {noticeMessage && (
          <div className="w-full max-w-3xl mb-6 p-4 rounded-xl bg-[#21191D] border border-[#F02D50]/40 text-[#F0E9E7] text-xs flex items-start gap-2.5 shadow-lg relative z-20">
            <AlertCircle className="w-4 h-4 text-[#F02D50] shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{noticeMessage}</div>
          </div>
        )}

        {/* HERO SECTION: Distinctive TournX Identity & Dimensional 3D Centerpiece */}
        <div className="relative z-10 w-full max-w-4xl mx-auto text-center mb-8 sm:mb-10 pt-2 sm:pt-4">
          
          {/* Dimensional WebGL 3D Emblem Reveal */}
          <div className="flex justify-center mb-4 sm:mb-5">
            <TournXEmblemCanvas3D size={115} autoRotate={true} interactive={true} glowColor="#F02D50" rimColor="#F02D50" />
          </div>

          {/* Product Category Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#19191F] border border-white/10 text-xs font-mono font-medium tracking-wider uppercase mb-4 shadow-sm text-[#A5A1A4]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F02D50] animate-pulse" />
            <span>NATURAL LANGUAGE FOOTBALL MANAGEMENT</span>
          </div>

          {/* Italicized Headline Typography */}
          <h1 className="text-4xl sm:text-6xl font-black italic tracking-tight font-display text-[#F0E9E7] mb-3">
            Tourn<span className="text-[#F02D50]">X</span>
          </h1>

          <p className="text-sm sm:text-base text-[#A5A1A4] max-w-xl mx-auto font-sans leading-relaxed">
            From a single sentence in plain English to official fixtures, live scoreboards, and squad rosters.
          </p>
        </div>

        {/* Guidance: What to include in your prompt */}
        <div className="relative z-10 w-full max-w-3xl mb-4">
          <PromptGuidanceSection onApplySample={(sample) => setMasterPromptText(sample)} />
        </div>

        {/* THE CENTRAL PRODUCT FEATURE: Natural Language Tournament Prompt Composer */}
        <div className="relative z-10 w-full max-w-3xl mb-8">
          <div className="relative p-6 sm:p-8 rounded-2xl bg-[#19191F] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden">
            
            {/* Subtle Vivid Crimson Top Edge Rim */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#F02D50]/70 to-transparent" />

            {/* Header row: Status indicator + Tutorial discovery button + Drafts */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F02D50] animate-ping" />
                <span className="text-xs font-mono font-bold text-[#F0E9E7] uppercase tracking-wider">
                  Tournament Composer
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Visible 6-Step Interactive Tutorial */}
                {onOpenTutorial && (
                  <button
                    type="button"
                    onClick={onOpenTutorial}
                    className="inline-flex items-center gap-1.5 text-xs text-[#F0E9E7] hover:text-white bg-[#21191D] hover:bg-[#2C1E26] border border-[#F02D50]/30 hover:border-[#F02D50]/60 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium shadow-sm group"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#F02D50]" />
                    <span>6-Step Tutorial</span>
                    <ChevronRight className="w-3 h-3 text-[#A5A1A4] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsDraftsModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#141418] hover:bg-[#202028] border border-white/10 text-[#A5A1A4] hover:text-[#F0E9E7] text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#F02D50]" />
                  <span>Drafts</span>
                  {draftsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#F02D50]/20 text-[#F02D50] text-[10px] font-bold">
                      {draftsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Prompt Header */}
            <div className="mb-4">
              <h2 className="text-xl sm:text-2xl font-black italic font-display text-[#F0E9E7] tracking-tight">
                Describe your tournament. Generate it. Review it. Confirm it.
              </h2>
              <p className="text-xs sm:text-sm text-[#A5A1A4] mt-1 font-sans leading-relaxed">
                Type your tournament setup in natural English. TournX extracts clubs, formats, squad sizes, and venues instantly.
              </p>
            </div>

            {/* Prompt Textarea Console */}
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={masterPromptText}
                  onChange={(e) => setMasterPromptText(e.target.value)}
                  placeholder='e.g. "Create an 8-team 7-a-side weekend tournament called Monsoon Trophy at City Arena starting Saturday 9 AM. Single elimination with 30-minute matches and 3 substitutes per team."'
                  rows={5}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#101013] border border-white/10 text-[#F0E9E7] text-sm focus:outline-none focus:border-[#F02D50] focus:ring-1 focus:ring-[#F02D50]/40 font-sans placeholder:text-[#6E6A6D] transition resize-none leading-relaxed shadow-inner"
                />
              </div>

              {/* Primary Actions Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleSavePromptDraft}
                  disabled={!masterPromptText.trim()}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#141418] hover:bg-[#202028] border border-white/10 text-[#A5A1A4] hover:text-[#F0E9E7] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  onClick={handleLaunchPrompt}
                  disabled={!masterPromptText.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#F02D50] hover:bg-[#FF3358] text-white font-bold text-sm shadow-[0_4px_20px_rgba(240,45,80,0.4)] transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 group"
                >
                  <span>Generate Preview</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              {draftNotice && (
                <p className="text-xs text-[#F02D50] text-center pt-1 font-mono font-medium animate-pulse">
                  {draftNotice}
                </p>
              )}
            </div>

            {/* Active Workspace Quick Link if Organizer has a tournament loaded */}
            {activeTournament && (
              <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#F0E9E7] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F02D50]" />
                    <span>Current Workspace: {activeTournament.name}</span>
                  </div>
                  <div className="text-[11px] text-[#A5A1A4] font-mono mt-0.5">
                    {activeTournament.season || '2026'} • {activeTournament.visibility}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOrganizeClick()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#101013] hover:bg-[#21191D] border border-white/10 hover:border-[#F02D50]/40 text-xs font-semibold text-[#F0E9E7] transition cursor-pointer"
                >
                  Open Workspace
                </button>
              </div>
            )}

          </div>
        </div>

        {/* PARTICIPANT ACCESS PASS / CODE ENTRY */}
        <div className="relative z-10 w-full max-w-3xl mb-8">
          <div className="p-6 rounded-2xl bg-[#19191F] border border-white/10 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-[#F02D50]" />
              <h2 className="text-xs font-mono font-bold text-[#F0E9E7] uppercase tracking-wider">
                Enter with Access Code or Tournament Link
              </h2>
            </div>
            <p className="text-xs text-[#A5A1A4] mb-4 leading-relaxed font-sans">
              Have an access pass or participant code? Enter it below to open the tournament scoreboard, fixtures, and standings.
            </p>

            {joinSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-[#21191D] border border-[#F02D50]/50 text-[#F0E9E7] text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#F02D50] shrink-0" />
                <span>{joinSuccess}</span>
              </div>
            )}

            {joinError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
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
                  className="w-full px-4 py-2.5 rounded-lg bg-[#101013] border border-white/10 text-[#F0E9E7] text-sm focus:outline-none focus:border-[#F02D50] font-mono placeholder:text-[#6E6A6D] transition"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingCode}
                className="px-6 py-2.5 rounded-lg bg-[#141418] hover:bg-[#202028] border border-white/10 hover:border-white/20 text-[#F0E9E7] font-semibold text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifyingCode ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#F02D50] border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Enter Tournament</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#F02D50]" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ORGANIZER SIGN-IN SECTION */}
        <div className="relative z-10 w-full max-w-3xl">
          <div className="p-5 rounded-xl border border-white/10 bg-[#141418] text-center">
            {!showAuthSection ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A5A1A4]">
                  Organizing a league or managing clubs?
                </span>
                <button
                  type="button"
                  onClick={() => setShowAuthSection(true)}
                  className="text-xs font-semibold text-[#F0E9E7] hover:text-[#F02D50] transition cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#F02D50]" />
                  <span>Organizer Sign In</span>
                </button>
              </div>
            ) : (
              <div className="text-left space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F0E9E7]">
                    {authMode === 'SIGN_UP' ? 'Create Organizer Account' : authMode === 'FORGOT_PASSWORD' ? 'Reset Password' : 'Organizer Sign In'}
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('SIGN_IN');
                        setErrorMessage(null);
                        setConfirmationNotice(null);
                      }}
                      className={`font-semibold cursor-pointer ${authMode === 'SIGN_IN' ? 'text-[#F02D50] underline' : 'text-[#A5A1A4]'}`}
                    >
                      Sign In
                    </button>
                    <span className="text-white/20">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('SIGN_UP');
                        setErrorMessage(null);
                        setConfirmationNotice(null);
                      }}
                      className={`font-semibold cursor-pointer ${authMode === 'SIGN_UP' ? 'text-[#F02D50] underline' : 'text-[#A5A1A4]'}`}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {confirmationNotice && (
                  <div className="p-3 rounded-lg bg-[#21191D] border border-[#F02D50]/40 text-[#F0E9E7] text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#F02D50] shrink-0" />
                    <span>{confirmationNotice}</span>
                  </div>
                )}

                {authMode === 'SIGN_IN' && (
                  <form onSubmit={handleOrganizerSignIn} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#F0E9E7] mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={organizerEmail}
                        onChange={(e) => setOrganizerEmail(e.target.value)}
                        placeholder="organizer@club.com"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#101013] border border-white/10 text-[#F0E9E7] text-sm focus:outline-none focus:border-[#F02D50]"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-[#F0E9E7]">Password</label>
                        <button
                          type="button"
                          onClick={() => setAuthMode('FORGOT_PASSWORD')}
                          className="text-[11px] text-[#A5A1A4] hover:text-[#F0E9E7]"
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
                        className="w-full px-3.5 py-2 rounded-lg bg-[#101013] border border-white/10 text-[#F0E9E7] text-sm focus:outline-none focus:border-[#F02D50]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 rounded-lg bg-[#F02D50] hover:bg-[#FF3358] text-white font-semibold text-xs cursor-pointer transition disabled:opacity-50 shadow-[0_2px_10px_rgba(240, 45, 80,0.3)]"
                    >
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                  </form>
                )}

                {authMode === 'SIGN_UP' && (
                  <form onSubmit={handleOrganizerSignUp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#F0E9E7] mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={organizerEmail}
                        onChange={(e) => setOrganizerEmail(e.target.value)}
                        placeholder="organizer@club.com"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#101013] border border-white/10 text-[#F0E9E7] text-sm focus:outline-none focus:border-[#F02D50]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#F0E9E7] mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={organizerPassword}
                        onChange={(e) => setOrganizerPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#101013] border border-white/10 text-[#F0E9E7] text-sm focus:outline-none focus:border-[#F02D50]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 rounded-lg bg-[#F02D50] hover:bg-[#FF3358] text-white font-semibold text-xs cursor-pointer transition disabled:opacity-50 shadow-[0_2px_10px_rgba(240, 45, 80,0.3)]"
                    >
                      {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </form>
                )}

                {authMode === 'FORGOT_PASSWORD' && (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#F0E9E7] mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={organizerEmail}
                        onChange={(e) => setOrganizerEmail(e.target.value)}
                        placeholder="organizer@club.com"
                        className="w-full px-3.5 py-2 rounded-lg bg-[#101013] border border-white/10 text-[#F0E9E7] text-sm focus:outline-none focus:border-[#F02D50]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 rounded-lg bg-[#F02D50] hover:bg-[#FF3358] text-white font-semibold text-xs cursor-pointer transition disabled:opacity-50"
                    >
                      {isLoading ? 'Sending...' : 'Send Recovery Link'}
                    </button>
                  </form>
                )}

                {isUnconfirmedError && (
                  <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs">
                    <span className="text-[#A5A1A4]">Need a new confirmation email?</span>
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={isResending}
                      className="font-semibold text-[#F02D50] hover:underline"
                    >
                      {isResending ? 'Sending...' : 'Resend Email'}
                    </button>
                  </div>
                )}
                {resendStatus && (
                  <p className="text-xs text-[#F02D50]">{resendStatus}</p>
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
