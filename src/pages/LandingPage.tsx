import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Key, 
  LogIn, 
  UserPlus,
  Eye,
  Sliders,
  Mail,
  FileText,
  Save,
  BookOpen,
  Calendar,
  Shield
} from 'lucide-react';
import { supabase, isSupabaseConfigured, resendConfirmationEmail, sendPasswordResetEmail } from '../lib/supabase';
import { localDataService, FTM_STORAGE_KEYS } from '../services/localDataService';
import { tournamentService } from '../services/tournamentService';
import { Tournament } from '../types/multiTenant';
import { DraftsModal } from '../components/admin/DraftsModal';

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
    title: 'Kerala Champions Cup (Benchmark)',
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
  onOpenPublicDemo,
  activeTournament,
  noticeMessage,
  onOpenTutorial,
  isAdminLoggedIn = false
}: LandingPageProps) {
  // Main Tab: 'ORGANIZE' | 'JOIN'
  const [activeAction, setActiveAction] = useState<'ORGANIZE' | 'JOIN'>('ORGANIZE');

  // Master Prompt Text
  const [masterPromptText, setMasterPromptText] = useState(() => {
    try {
      return localStorage.getItem(FTM_STORAGE_KEYS.PROMPT_DRAFT) || '';
    } catch {
      return '';
    }
  });

  // Drafts Modal
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [draftsCount, setDraftsCount] = useState<number>(() => {
    try {
      return tournamentService.getDrafts().length;
    } catch {
      return 0;
    }
  });
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

  // Organizer Auth Mode: 'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD' | 'NONE'
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD'>('SIGN_IN');
  const [showAuthSection, setShowAuthSection] = useState(false);

  // Sign up / Sign in fields
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPassword, setOrganizerPassword] = useState('');

  // Join fields
  const [joinCodeOrLink, setJoinCodeOrLink] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // Status & Error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);
  const [isUnconfirmedError, setIsUnconfirmedError] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const refreshDraftsCount = () => {
    try {
      setDraftsCount(tournamentService.getDrafts().length);
    } catch {}
  };

  const handleSaveDraft = () => {
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
      setDraftNotice('Draft saved to vault successfully.');
      setTimeout(() => setDraftNotice(null), 3000);
    } catch {
      setDraftNotice('Failed to save draft.');
    }
  };

  const handleGeneratePreview = () => {
    const prompt = masterPromptText.trim();
    if (!prompt) return;

    try {
      localStorage.setItem(FTM_STORAGE_KEYS.PROMPT_DRAFT, prompt);
    } catch {}

    // Check if user is already authenticated
    const hasActiveSession = isAdminLoggedIn || (isSupabaseConfigured && supabase?.auth?.getUser());
    if (hasActiveSession || import.meta.env.DEV) {
      onOrganizeClick({ prompt });
    } else {
      setShowAuthSection(true);
      setConfirmationNotice('Prompt saved! Sign in or register to preview, generate fixtures, and publish your tournament.');
    }
  };

  // Handle Organizer Sign Up
  const handleOrganizerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setConfirmationNotice(null);
    setIsUnconfirmedError(false);
    setResendStatus(null);

    const cleanEmail = organizerEmail.trim().toLowerCase();

    if (!cleanEmail || !organizerPassword.trim()) {
      setErrorMessage('Please provide an email address and password.');
      return;
    }

    if (organizerPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: organizerPassword,
          options: {
            data: {
              full_name: organizerName.trim() || undefined,
            },
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.session) {
          onOrganizeClick({ prompt: masterPromptText.trim() || undefined });
          return;
        } else if (data.user && !data.session) {
          if (data.user.identities && data.user.identities.length === 0) {
            setConfirmationNotice(
              `An account with ${cleanEmail} already exists. Please sign in below with your password.`
            );
            setAuthMode('SIGN_IN');
            return;
          }

          setConfirmationNotice(
            `Registration successful! A verification email has been sent to ${cleanEmail}. Please verify your email to activate your account, then sign in below.`
          );
          setAuthMode('SIGN_IN');
          return;
        }
        throw new Error('Registration failed. Please try again.');
      }

      if (import.meta.env.DEV) {
        localDataService.setDevAdminLoggedIn(true);
        onOrganizeClick({ prompt: masterPromptText.trim() || undefined });
      } else {
        throw new Error('Authentication service is currently unavailable.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Password Reset Request
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setConfirmationNotice(null);

    const cleanEmail = organizerEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address to receive password reset instructions.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendPasswordResetEmail(cleanEmail);
      if (res.success) {
        setConfirmationNotice(`Password reset instructions sent to ${cleanEmail}. Please check your inbox.`);
      } else {
        setErrorMessage(res.error || 'Failed to send password reset email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error sending password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Organizer Sign In
  const handleOrganizerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setConfirmationNotice(null);
    setIsUnconfirmedError(false);
    setResendStatus(null);

    const cleanEmail = organizerEmail.trim().toLowerCase();

    if (!cleanEmail || !organizerPassword.trim()) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: organizerPassword,
        });

        if (error) {
          const isUnconfirmed = 
            (error as any).code === 'email_not_confirmed' ||
            error.message.toLowerCase().includes('email not confirmed');

          if (isUnconfirmed) {
            setIsUnconfirmedError(true);
            setErrorMessage(
              `Email not confirmed for ${cleanEmail}. Please verify your email or click resend below.`
            );
            return;
          }

          if ((error as any).code === 'invalid_credentials' || error.message.toLowerCase().includes('invalid login credentials')) {
            setErrorMessage('Invalid email or password. Please verify your credentials.');
            return;
          }

          throw new Error(error.message);
        }

        if (data.user) {
          onOrganizeClick({ prompt: masterPromptText.trim() || undefined });
          return;
        }
        throw new Error('Sign in failed. No user session returned.');
      }

      if (import.meta.env.DEV) {
        localDataService.setDevAdminLoggedIn(true);
        onOrganizeClick({ prompt: masterPromptText.trim() || undefined });
      } else {
        throw new Error('Authentication service is currently unavailable.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend Confirmation Email
  const handleResendConfirmation = async () => {
    const cleanEmail = organizerEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address to resend confirmation.');
      return;
    }
    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await resendConfirmationEmail(cleanEmail);
      if (res.success) {
        setResendStatus(`Confirmation email resent to ${cleanEmail}. Please check your inbox and spam folder.`);
      } else {
        setErrorMessage(res.error || 'Failed to resend confirmation email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error resending confirmation.');
    } finally {
      setIsResending(false);
    }
  };

  // Handle Join a Tournament (Code or Link or Slug)
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoinSuccess(null);

    const input = joinCodeOrLink.trim();
    if (!input) {
      setJoinError('Please enter a tournament link, slug, or access code.');
      return;
    }

    // 1. Check if user pasted a full URL or path
    const urlMatch = input.match(/(?:^|\/)t\/([a-zA-Z0-9_-]+)/);
    if (urlMatch && urlMatch[1]) {
      const slug = urlMatch[1];
      onJoinTournament(slug);
      return;
    }

    // 2. Check if it's a known tournament slug or name
    const allTournaments = localDataService.getAllTournaments();
    const matchedTourney = allTournaments.find(
      t => (t.slug && t.slug.toLowerCase() === input.toLowerCase()) || t.name.toLowerCase() === input.toLowerCase()
    );
    if (matchedTourney && matchedTourney.slug) {
      onJoinTournament(matchedTourney.slug);
      return;
    }

    // 3. Attempt Access Code Verification
    setIsVerifyingCode(true);
    try {
      const activeTourney = activeTournament || localDataService.getActiveTournament();
      const verifyResult = await tournamentService.verifyAccessCode(activeTourney.id, input);

      if (verifyResult.success) {
        setJoinSuccess(`Pass verified! Unlocked ${verifyResult.role} access to "${activeTourney.name}".`);
        setTimeout(() => {
          onJoinTournament(activeTourney.slug || 'tournx-championship');
        }, 700);
        return;
      }

      // Check remaining tournaments
      for (const t of allTournaments) {
        if (t.id === activeTourney.id) continue;
        const res = await tournamentService.verifyAccessCode(t.id, input);
        if (res.success) {
          setJoinSuccess(`Pass verified! Unlocked ${res.role} access to "${t.name}".`);
          setTimeout(() => {
            onJoinTournament(t.slug || 'tournx-championship');
          }, 700);
          return;
        }
      }

      const isPureSlugFormat = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.toLowerCase()) && 
        !input.toUpperCase().startsWith('TX-') && 
        !input.toUpperCase().includes('VIEW') && 
        !input.toUpperCase().includes('SCORE');

      if (isPureSlugFormat && !verifyResult.error?.includes('Rate limit')) {
        const cleanSlug = input.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        onJoinTournament(cleanSlug);
        return;
      }

      setJoinError(verifyResult.error || 'Invalid or revoked access code. Please verify your code or link.');
    } catch (err: any) {
      setJoinError(err.message || 'Access code verification failed.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  return (
    <div className="w-full min-h-[90vh] flex flex-col justify-center items-center py-6 px-4 sm:px-6 bg-[#0c120e] text-[#faf9f5] relative">
      
      {/* Brand Header */}
      <div className="text-center max-w-2xl mx-auto mb-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111f16] border border-[#1e3425] text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>NATURAL LANGUAGE FOOTBALL MANAGEMENT</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#faf9f5] mb-2 font-sans">
          Tourn<span className="text-emerald-400">X</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto font-sans leading-relaxed">
          From a single sentence in plain English to official fixtures, live scoreboards, and squad management.
        </p>

        {/* Tutorial Quick Access */}
        {onOpenTutorial && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onOpenTutorial}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-[#132219] hover:bg-[#182b20] border border-[#203a29] px-3 py-1.5 rounded-xl transition cursor-pointer font-medium shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Interactive 6-Step Tutorial</span>
            </button>
          </div>
        )}
      </div>

      {/* Notice Message */}
      {noticeMessage && (
        <div className="w-full max-w-2xl mb-5 p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Main Console Container */}
      <div className="w-full max-w-3xl bg-[#0f1712] border border-[#1e3425] rounded-2xl shadow-2xl overflow-hidden relative z-10">
        
        {/* Navigation Tabs Strip */}
        <div className="grid grid-cols-2 p-1.5 bg-[#0a110d] border-b border-[#1e3425]">
          <button
            type="button"
            onClick={() => {
              setActiveAction('ORGANIZE');
              setErrorMessage(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer ${
              activeAction === 'ORGANIZE'
                ? 'bg-[#16271c] text-emerald-400 border border-[#2b4c35] shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#111d15]'
            }`}
          >
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span>Organize Tournament</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveAction('JOIN');
              setErrorMessage(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer ${
              activeAction === 'JOIN'
                ? 'bg-[#16271c] text-emerald-400 border border-[#2b4c35] shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#111d15]'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Join with Pass or Code</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          <AnimatePresence mode="wait">
            
            {/* ACTION 1: ORGANIZE A TOURNAMENT (CENTRAL MASTER PROMPT CREATOR) */}
            {activeAction === 'ORGANIZE' && (
              <motion.div
                key="organize-pane"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Central Master Prompt Creator */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#faf9f5] tracking-tight">
                        Describe your tournament in natural English
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                        Type teams, dates, venue, format, and rules. TournX extracts everything and generates your preview instantly.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDraftsModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#132219] hover:bg-[#182b20] border border-[#203a29] text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saved Drafts</span>
                      {draftsCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          {draftsCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Large Prompt Textarea */}
                  <div className="relative">
                    <textarea
                      rows={5}
                      value={masterPromptText}
                      onChange={(e) => setMasterPromptText(e.target.value)}
                      placeholder="e.g. I'm organising a five-a-side football tournament called Kerala Champions Cup on November 15 at Kannur Municipal Stadium. Six teams: Kerala Blasters, Bengaluru FC, Chennaiyin FC, Mumbai City FC, FC Goa and Hyderabad FC. Single round-robin format with three points for a win, one for a draw..."
                      className="w-full px-4 py-3 rounded-xl bg-[#0a110d] border border-[#1e3425] text-[#faf9f5] text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition placeholder:text-slate-500 resize-none font-sans leading-relaxed"
                    />
                  </div>

                  {/* Example prompt chips */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 font-medium">Click to try an example:</span>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_PROMPTS.map((ex, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setMasterPromptText(ex.prompt)}
                          className="px-2.5 py-1 rounded-lg bg-[#111f16] hover:bg-[#16271c] border border-[#1e3425] text-slate-300 hover:text-white text-xs transition cursor-pointer text-left"
                        >
                          {ex.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prompt Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={!masterPromptText.trim()}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#132219] hover:bg-[#182b20] border border-[#203a29] text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                    >
                      <Save className="w-3.5 h-3.5 text-slate-400" />
                      <span>Save as Draft</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGeneratePreview}
                      disabled={!masterPromptText.trim()}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2 group"
                    >
                      <span>Generate Preview</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>

                  {draftNotice && (
                    <p className="text-xs text-emerald-400 text-center pt-1 animate-pulse">
                      {draftNotice}
                    </p>
                  )}
                </div>

                {/* Organizer Current Tournament / Direct Dashboard Link */}
                {activeTournament && (
                  <div className="p-4 rounded-xl bg-[#0a110d] border border-[#1e3425] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#faf9f5]">
                        Active Tournament: {activeTournament.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {activeTournament.season || '2026'} • {activeTournament.visibility}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOrganizeClick()}
                      className="px-3.5 py-1.5 rounded-lg bg-[#16271c] hover:bg-[#1c3224] border border-[#2b4c35] text-xs font-semibold text-emerald-400 transition cursor-pointer"
                    >
                      Open Dashboard
                    </button>
                  </div>
                )}

                {/* Notifications */}
                {confirmationNotice && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{confirmationNotice}</span>
                  </div>
                )}

                {resendStatus && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{resendStatus}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex flex-col gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="flex-1">{errorMessage}</span>
                    </div>
                    {isUnconfirmedError && (
                      <div className="pt-2 border-t border-rose-800/40 flex items-center justify-between">
                        <span className="text-[11px] text-rose-400">Need a verification link?</span>
                        <button
                          type="button"
                          onClick={handleResendConfirmation}
                          disabled={isResending}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] transition cursor-pointer disabled:opacity-50"
                        >
                          {isResending ? 'Sending...' : 'Resend Email'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Optional Sign In / Registration Panel */}
                <div className="pt-4 border-t border-[#1e3425]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                      {showAuthSection ? (authMode === 'SIGN_UP' ? 'Organizer Registration' : authMode === 'FORGOT_PASSWORD' ? 'Password Recovery' : 'Organizer Sign In') : 'Organizer Account'}
                    </span>
                    
                    {!showAuthSection ? (
                      <button
                        type="button"
                        onClick={() => setShowAuthSection(true)}
                        className="text-xs text-emerald-400 hover:underline cursor-pointer font-medium"
                      >
                        Sign in to manage tournament →
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('SIGN_IN');
                            setErrorMessage(null);
                            setConfirmationNotice(null);
                          }}
                          className={`font-semibold cursor-pointer transition ${
                            authMode === 'SIGN_IN' ? 'text-emerald-400 underline underline-offset-4' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Sign In
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('SIGN_UP');
                            setErrorMessage(null);
                            setConfirmationNotice(null);
                          }}
                          className={`font-semibold cursor-pointer transition ${
                            authMode === 'SIGN_UP' ? 'text-emerald-400 underline underline-offset-4' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Sign Up
                        </button>
                      </div>
                    )}
                  </div>

                  {showAuthSection && (
                    <div className="bg-[#0a110d] p-5 rounded-xl border border-[#1e3425]">
                      {/* Form: SIGN IN */}
                      {authMode === 'SIGN_IN' && (
                        <form onSubmit={handleOrganizerSignIn} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-300">Email Address</label>
                            <input
                              type="email"
                              required
                              value={organizerEmail}
                              onChange={(e) => setOrganizerEmail(e.target.value)}
                              placeholder="organizer@club.com"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1712] border border-[#1e3425] text-[#faf9f5] text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition placeholder:text-slate-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-semibold text-slate-300">Password</label>
                              <button
                                type="button"
                                onClick={() => {
                                  setAuthMode('FORGOT_PASSWORD');
                                  setErrorMessage(null);
                                  setConfirmationNotice(null);
                                }}
                                className="text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                              >
                                Forgot password?
                              </button>
                            </div>
                            <input
                              type="password"
                              required
                              value={organizerPassword}
                              onChange={(e) => setOrganizerPassword(e.target.value)}
                              placeholder="••••••••••••"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1712] border border-[#1e3425] text-[#faf9f5] text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition placeholder:text-slate-500"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-3 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                          >
                            {isLoading ? (
                              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                              <>
                                <LogIn className="w-4 h-4" />
                                <span>Sign In & Continue</span>
                                <ArrowRight className="w-4 h-4 ml-1" />
                              </>
                            )}
                          </button>
                        </form>
                      )}

                      {/* Form: SIGN UP */}
                      {authMode === 'SIGN_UP' && (
                        <form onSubmit={handleOrganizerSignUp} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-300">Organizer Name (Optional)</label>
                            <input
                              type="text"
                              value={organizerName}
                              onChange={(e) => setOrganizerName(e.target.value)}
                              placeholder="e.g. Alex Ferguson"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1712] border border-[#1e3425] text-[#faf9f5] text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition placeholder:text-slate-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-300">Email Address *</label>
                            <input
                              type="email"
                              required
                              value={organizerEmail}
                              onChange={(e) => setOrganizerEmail(e.target.value)}
                              placeholder="organizer@club.com"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1712] border border-[#1e3425] text-[#faf9f5] text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition placeholder:text-slate-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-300">Password *</label>
                            <input
                              type="password"
                              required
                              value={organizerPassword}
                              onChange={(e) => setOrganizerPassword(e.target.value)}
                              placeholder="At least 6 characters"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1712] border border-[#1e3425] text-[#faf9f5] text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition placeholder:text-slate-500"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-3 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                          >
                            {isLoading ? (
                              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4" />
                                <span>Create Organizer Account</span>
                                <ArrowRight className="w-4 h-4 ml-1" />
                              </>
                            )}
                          </button>
                        </form>
                      )}

                      {/* Form: FORGOT PASSWORD */}
                      {authMode === 'FORGOT_PASSWORD' && (
                        <form onSubmit={handlePasswordReset} className="space-y-4">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Enter the email address associated with your organizer account to receive a reset link.
                          </p>

                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-300">Email Address</label>
                            <input
                              type="email"
                              required
                              value={organizerEmail}
                              onChange={(e) => setOrganizerEmail(e.target.value)}
                              placeholder="organizer@club.com"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1712] border border-[#1e3425] text-[#faf9f5] text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition placeholder:text-slate-500"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-3 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                          >
                            {isLoading ? (
                              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            ) : (
                              <>
                                <Mail className="w-4 h-4" />
                                <span>Send Reset Link</span>
                                <ArrowRight className="w-4 h-4 ml-1" />
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ACTION 2: JOIN A TOURNAMENT */}
            {activeAction === 'JOIN' && (
              <motion.div
                key="join-pane"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-[#faf9f5]">Enter Tournament Access Code</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enter an access code, matchday pass, or tournament link to view live fixtures and standings.
                  </p>
                </div>

                {joinSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{joinSuccess}</span>
                  </div>
                )}

                {joinError && (
                  <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}

                <form onSubmit={handleJoinSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Matchday Pass / Access Code / Slug
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={joinCodeOrLink}
                        onChange={(e) => setJoinCodeOrLink(e.target.value)}
                        placeholder="e.g. TX-VIEW-9876 or tournx-championship"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a110d] border border-[#1e3425] text-[#faf9f5] text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition pl-10 font-mono placeholder:text-slate-500"
                      />
                      <Key className="w-4 h-4 text-emerald-400/80 absolute left-3.5 top-3" />
                    </div>
                  </div>

                  {/* Built-in Demo Passes Helper */}
                  <div className="p-3.5 rounded-xl bg-[#0a110d] border border-[#1e3425] space-y-2">
                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                      Demo Tournament Passes:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setJoinCodeOrLink('TX-VIEW-9876');
                          setJoinError(null);
                        }}
                        className="py-2 px-3 rounded-lg bg-[#111f16] hover:bg-[#16271c] border border-[#1e3425] text-left transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-bold">
                          <Eye className="w-3.5 h-3.5" />
                          <span>TX-VIEW-9876</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Spectator Pass</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setJoinCodeOrLink('TX-SCORE-9876');
                          setJoinError(null);
                        }}
                        className="py-2 px-3 rounded-lg bg-[#111f16] hover:bg-[#16271c] border border-[#1e3425] text-left transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-bold">
                          <Sliders className="w-3.5 h-3.5" />
                          <span>TX-SCORE-9876</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Scorekeeper Pass</div>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingCode}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isVerifyingCode ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <span>Enter Tournament</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Instant Public Showcase Card */}
                <div className="mt-6 pt-5 border-t border-[#1e3425]">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0a110d] border border-[#1e3425]">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-slate-200 truncate">
                        {activeTournament?.name || 'TournX Championship'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                        Live Public Showcase
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenPublicDemo}
                      className="shrink-0 py-1.5 px-3 rounded-lg bg-[#132219] hover:bg-[#182b20] border border-[#203a29] text-xs font-semibold text-emerald-400 transition cursor-pointer"
                    >
                      View Live Scoreboard
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </div>

      {/* Drafts Modal */}
      <DraftsModal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        onSelectDraft={(draft) => {
          setMasterPromptText(draft.prompt);
          setIsDraftsModalOpen(false);
        }}
        onDraftsChanged={refreshDraftsCount}
      />

      {/* Clean Professional Footer */}
      <div className="mt-8 text-center text-xs text-slate-400 tracking-wide font-sans">
        TournX • Professional Sports Management • Real-time Sync & Isolated Tenancy
      </div>

    </div>
  );
}
