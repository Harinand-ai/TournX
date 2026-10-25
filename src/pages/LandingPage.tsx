import React, { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Key, 
  LogIn, 
  UserPlus,
  Shield, 
  Users, 
  Globe, 
  FileEdit,
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { supabase, isSupabaseConfigured, resendConfirmationEmail, sendPasswordResetEmail } from '../lib/supabase';
import { localDataService } from '../services/localDataService';
import { tournamentService } from '../services/tournamentService';
import { Tournament } from '../types/multiTenant';

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
  onOpenPublicDemo,
  activeTournament,
  noticeMessage,
  isAdminLoggedIn = false,
}: LandingPageProps) {
  // Organizer Portal State (Section A)
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD'>('SIGN_IN');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPassword, setOrganizerPassword] = useState('');
  const [organizerConfirmPassword, setOrganizerConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Section B, Option 1: Participant Access State
  const [participantInput, setParticipantInput] = useState('');
  const [participantLoading, setParticipantLoading] = useState(false);
  const [participantError, setParticipantError] = useState<string | null>(null);
  const [participantSuccess, setParticipantSuccess] = useState<string | null>(null);

  // Section B, Option 2: Public Viewer State
  const [publicInput, setPublicInput] = useState('');
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState<string | null>(null);

  // Section B, Option 3: Invited Modifier Access State
  const [modifierInput, setModifierInput] = useState('');
  const [modifierLoading, setModifierLoading] = useState(false);
  const [modifierError, setModifierError] = useState<string | null>(null);
  const [modifierSuccess, setModifierSuccess] = useState<string | null>(null);

  // ================= ORGANIZER AUTH HANDLERS =================
  const handleOrganizerAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsUnconfirmed(false);
    setResendStatus(null);

    const email = organizerEmail.trim().toLowerCase();
    const password = organizerPassword;

    if (!email || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }

    if (authMode === 'SIGN_UP') {
      if (password.length < 8) {
        setAuthError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== organizerConfirmPassword) {
        setAuthError('Passwords do not match. Please re-enter.');
        return;
      }
    }

    setAuthLoading(true);

    try {
      if (authMode === 'SIGN_IN') {
        if (!isSupabaseConfigured || !supabase) {
          // Local fallback only when cloud is not configured
          if (import.meta.env.DEV) {
            localDataService.setDevAdminLoggedIn(true);
            setAuthSuccess('Local developer admin authenticated.');
            setTimeout(() => {
              onOrganizeClick();
            }, 500);
            return;
          }
          throw new Error('Supabase authentication client is not available.');
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setIsUnconfirmed(true);
            setAuthError('Your email address has not been confirmed yet. Please verify your email or resend confirmation.');
          } else if (error.message.toLowerCase().includes('invalid login credentials')) {
            setAuthError('Invalid email or password. Please verify your credentials.');
          } else {
            setAuthError(error.message);
          }
          return;
        }

        if (data?.user) {
          setAuthSuccess('Sign in successful! Entering organizer dashboard...');
          setTimeout(() => {
            onOrganizeClick();
          }, 400);
        }
      } else if (authMode === 'SIGN_UP') {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error('Supabase authentication is required for organizer registration.');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/#workspace` : undefined,
          },
        });

        if (error) {
          setAuthError(error.message);
          return;
        }

        if (data?.session) {
          setAuthSuccess('Organizer account registered and authenticated! Entering dashboard...');
          setTimeout(() => {
            onOrganizeClick();
          }, 500);
        } else {
          setAuthSuccess(
            'Organizer account registered successfully! A confirmation link has been sent to your email. Please confirm your email and then sign in.'
          );
          setAuthMode('SIGN_IN');
          setOrganizerPassword('');
          setOrganizerConfirmPassword('');
        }
      } else if (authMode === 'FORGOT_PASSWORD') {
        const { success, error } = await sendPasswordResetEmail(email);
        if (success) {
          setAuthSuccess('Password reset link sent to your email address.');
        } else {
          setAuthError(error || 'Failed to send password reset email.');
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!organizerEmail.trim()) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      const { success, error } = await resendConfirmationEmail(organizerEmail.trim());
      if (success) {
        setResendStatus('Confirmation email resent. Please check your inbox and spam folder.');
      } else {
        setResendStatus(error || 'Failed to resend confirmation email.');
      }
    } catch (e: any) {
      setResendStatus(e.message || 'Failed to resend confirmation email.');
    } finally {
      setIsResending(false);
    }
  };

  // ================= OPTION 1: PARTICIPANT ACCESS HANDLER =================
  const handleParticipantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParticipantError(null);
    setParticipantSuccess(null);

    const input = participantInput.trim();
    if (!input) {
      setParticipantError('Please enter a participant access code (e.g. TX-VIEW-XXXXXX) or tournament link.');
      return;
    }

    setParticipantLoading(true);
    try {
      const res = await tournamentService.resolveParticipantAccess(input);
      if (res.success && res.tournament) {
        setParticipantSuccess(`Pass verified! Loading ${res.tournament.name}...`);
        setTimeout(() => {
          onJoinTournament(res.tournament!.slug || res.tournament!.id);
        }, 450);
      } else {
        setParticipantError(res.error || 'Participant code not found or has expired. Please check your code and try again.');
      }
    } catch (err: any) {
      setParticipantError(err.message || 'Failed to resolve participant access code.');
    } finally {
      setParticipantLoading(false);
    }
  };

  // ================= OPTION 2: PUBLIC VIEWER HANDLER =================
  const handlePublicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublicError(null);

    const rawInput = publicInput.trim();
    const input = (rawInput && rawInput.toLowerCase() !== 'hub' && rawInput.toLowerCase() !== 'public') 
      ? rawInput 
      : (activeTournament?.slug || 'tournx-championship');

    setPublicLoading(true);
    try {
      const res = await tournamentService.resolvePublicTournament(input);
      if (res.success && res.tournament) {
        onJoinTournament(res.tournament.slug || res.tournament.id);
      } else if (onOpenPublicDemo) {
        onOpenPublicDemo();
      } else {
        setPublicError(res.error || 'Tournament not found or is set to private access.');
      }
    } catch (err: any) {
      setPublicError(err.message || 'Failed to load public tournament.');
    } finally {
      setPublicLoading(false);
    }
  };

  // ================= OPTION 3: INVITED MODIFIER ACCESS HANDLER =================
  const handleModifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModifierError(null);
    setModifierSuccess(null);

    const input = modifierInput.trim();
    if (!input) {
      setModifierError('Please enter a modifier passcode (e.g. TX-SCORE-XXXXXX) or invitation link.');
      return;
    }

    setModifierLoading(true);
    try {
      // Get current authenticated user if any
      let currentUser = null;
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getUser();
        currentUser = data?.user || null;
      }

      const res = await tournamentService.resolveModifierAccess(input, currentUser);
      if (res.success && res.tournament) {
        setModifierSuccess(`Modifier privileges authorized for ${res.tournament.name}! Loading tournament editor...`);
        setTimeout(() => {
          onJoinTournament(res.tournament!.slug || res.tournament!.id);
        }, 500);
      } else {
        if (res.requiresAuth) {
          setModifierError(res.error || 'Modifier privileges require an authenticated account. Please sign in on the left first.');
        } else {
          setModifierError(res.error || 'Invalid or revoked collaborator modifier pass.');
        }
      }
    } catch (err: any) {
      setModifierError(err.message || 'Failed to verify modifier invitation.');
    } finally {
      setModifierLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101013] text-[#F0E9E7] flex flex-col justify-between selection:bg-[#D72645]/30 selection:text-[#F0E9E7]">
      {/* Background Stadium Glow Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-[radial-gradient(ellipse_at_top,_rgba(215,38,69,0.12)_0%,_rgba(33,25,29,0.3)_40%,_transparent_70%)] blur-2xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-[radial-gradient(ellipse_at_bottom_right,_rgba(33,25,29,0.4)_0%,_transparent_70%)] blur-2xl" />
      </div>

      {/* Top Brand Banner */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#141418]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#21191D] border border-[#D72645]/40 flex items-center justify-center text-[#D72645] font-black text-sm italic shadow-sm">
              TX
            </div>
            <div>
              <span className="font-display font-black text-xl italic tracking-tight text-[#F0E9E7]">
                Tourn<span className="text-[#D72645]">X</span>
              </span>
              <span className="hidden sm:inline-block ml-3 px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-widest text-[#A5A1A4] bg-white/[0.04] border border-white/[0.06]">
                Tournament Operating System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#A5A1A4]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D72645] animate-pulse" />
            <span className="hidden sm:inline">Engine Active</span>
          </div>
        </div>
      </header>

      {/* Main Role-Specific Entry Area */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">
        {/* Notice Banner (if redirected e.g. after expiry or invalid route) */}
        {noticeMessage && (
          <div className="mb-8 p-4 rounded-xl bg-[#21191D] border border-[#D72645]/30 text-xs text-[#F0E9E7] flex items-center gap-3 shadow-lg">
            <AlertCircle className="w-4 h-4 text-[#D72645] shrink-0" />
            <span>{noticeMessage}</span>
          </div>
        )}

        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-[#F0E9E7]">
            Select Your Role &amp; Enter
          </h1>
          <p className="mt-2 text-sm text-[#A5A1A4] max-w-2xl leading-relaxed">
            Welcome to TournX. Access your competition as an authenticated organizer, verified matchday modifier, participant, or public viewer below.
          </p>
        </div>

        {/* Two-Column Responsive Grid: Section A (Organizer) | Section B (Tournament Entry Options) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ========================================================
              SECTION A: ORGANIZER ACCESS (SIGN UP / SIGN IN)
              ======================================================== */}
          <section className="lg:col-span-5 bg-[#19191F] border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D72645] via-[#991B35] to-[#21191D]" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#D72645]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#F0E9E7]">
                  Organizer Portal
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#A5A1A4] bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                Auth Tier
              </span>
            </div>

            {/* Auth Mode Toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#101013] rounded-xl border border-white/[0.06] mb-5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('SIGN_IN');
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === 'SIGN_IN'
                    ? 'bg-[#19191F] text-[#F0E9E7] shadow-sm border border-white/[0.08]'
                    : 'text-[#A5A1A4] hover:text-[#F0E9E7]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('SIGN_UP');
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === 'SIGN_UP'
                    ? 'bg-[#19191F] text-[#F0E9E7] shadow-sm border border-white/[0.08]'
                    : 'text-[#A5A1A4] hover:text-[#F0E9E7]'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleOrganizerAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A1A4] mb-1.5">
                  Organizer Email
                </label>
                <input
                  type="email"
                  value={organizerEmail}
                  onChange={e => setOrganizerEmail(e.target.value)}
                  placeholder="name@organization.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#101013] border border-white/[0.1] text-sm text-[#F0E9E7] placeholder:text-[#736F72] focus:border-[#D72645] focus:outline-none transition-colors"
                />
              </div>

              {authMode !== 'FORGOT_PASSWORD' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A1A4]">
                      Password
                    </label>
                    {authMode === 'SIGN_IN' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('FORGOT_PASSWORD');
                          setAuthError(null);
                          setAuthSuccess(null);
                        }}
                        className="text-[11px] text-[#A5A1A4] hover:text-[#D72645] transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    value={organizerPassword}
                    onChange={e => setOrganizerPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#101013] border border-white/[0.1] text-sm text-[#F0E9E7] placeholder:text-[#736F72] focus:border-[#D72645] focus:outline-none transition-colors"
                  />
                </div>
              )}

              {authMode === 'SIGN_UP' && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A1A4] mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={organizerConfirmPassword}
                    onChange={e => setOrganizerConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#101013] border border-white/[0.1] text-sm text-[#F0E9E7] placeholder:text-[#736F72] focus:border-[#D72645] focus:outline-none transition-colors"
                  />
                  <p className="text-[11px] text-[#A5A1A4] mt-1.5">
                    Must be at least 8 characters. Email verification required.
                  </p>
                </div>
              )}

              {/* Status / Error Displays */}
              {authError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="p-3 rounded-xl bg-[#21191D] border border-[#D72645]/40 text-xs text-[#F0E9E7] flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#D72645] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{authSuccess}</span>
                </div>
              )}

              {isUnconfirmed && (
                <div className="p-3 rounded-xl bg-[#21191D] border border-white/[0.1] space-y-2">
                  <p className="text-xs text-[#A5A1A4]">
                    Did not receive confirmation email? Check your spam or click below to resend.
                  </p>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isResending}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#D72645] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Resend Confirmation Email</span>
                  </button>
                  {resendStatus && (
                    <p className="text-[11px] text-[#F0E9E7] font-mono">{resendStatus}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#D72645] hover:bg-[#C21D3A] text-[#F0E9E7] text-xs font-bold uppercase tracking-wider transition-all shadow-[0_2px_12px_rgba(215,38,69,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : authMode === 'SIGN_IN' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Organizer Dashboard</span>
                  </>
                ) : authMode === 'SIGN_UP' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Organizer Account</span>
                  </>
                ) : (
                  <span>Send Password Reset Link</span>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-white/[0.06] text-[11px] text-[#A5A1A4] leading-relaxed">
              <strong className="text-[#F0E9E7]">Organizer Isolation:</strong> Authenticated organizers access strictly their own private dashboard and tournaments.
            </div>
          </section>

          {/* ========================================================
              SECTION B: SEPARATE TOURNAMENT ACCESS OPTIONS
              ======================================================== */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* OPTION 1: PARTICIPANT ACCESS */}
            <section className="bg-[#19191F] border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-5 sm:p-6 transition-all shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#21191D] border border-[#D72645]/40 text-[#D72645] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-display font-bold text-[#F0E9E7] uppercase tracking-wide">
                      Option 1: Participant Access
                    </h3>
                    <span className="text-[10px] font-mono uppercase text-[#A5A1A4] bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                      Read-Only
                    </span>
                  </div>
                  <p className="text-xs text-[#A5A1A4] mb-3 leading-relaxed">
                    Enter with a participant code or shared spectator link to view fixtures, scores, squads, and standings without organizer privileges.
                  </p>

                  <form onSubmit={handleParticipantSubmit} className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={participantInput}
                        onChange={e => setParticipantInput(e.target.value)}
                        placeholder="e.g. TX-VIEW-XXXXXX or /t/slug"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-[#101013] border border-white/[0.1] text-xs font-mono uppercase tracking-wider text-[#F0E9E7] placeholder:text-[#736F72] focus:border-[#D72645] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={participantLoading || !participantInput.trim()}
                        className="px-4 py-2 rounded-xl bg-[#21191D] hover:bg-[#D72645] border border-[#D72645]/40 text-xs font-bold text-[#F0E9E7] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {participantLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        <span>Enter Tournament</span>
                      </button>
                    </div>

                    {participantError && (
                      <p className="text-xs text-rose-300 flex items-center gap-1.5 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{participantError}</span>
                      </p>
                    )}
                    {participantSuccess && (
                      <p className="text-xs text-[#F0E9E7] flex items-center gap-1.5 mt-1">
                        <CheckCircle className="w-3.5 h-3.5 text-[#D72645] shrink-0" />
                        <span>{participantSuccess}</span>
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </section>

            {/* OPTION 2: PUBLIC VIEWER / PUBLIC HUB */}
            <section className="bg-[#19191F] border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-5 sm:p-6 transition-all shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#141418] border border-white/[0.1] text-[#F0E9E7] flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-display font-bold text-[#F0E9E7] uppercase tracking-wide">
                      Option 2: Public Viewer / Public Hub
                    </h3>
                    <span className="text-[10px] font-mono uppercase text-[#A5A1A4] bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                      Open Access
                    </span>
                  </div>
                  <p className="text-xs text-[#A5A1A4] mb-3 leading-relaxed">
                    View tournaments that have been designated public by their creators. No access codes or spectator passkeys required.
                  </p>

                  <form onSubmit={handlePublicSubmit} className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={publicInput}
                        onChange={e => setPublicInput(e.target.value)}
                        placeholder="e.g. tournx-championship or public URL"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-[#101013] border border-white/[0.1] text-xs font-mono text-[#F0E9E7] placeholder:text-[#736F72] focus:border-[#D72645] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={publicLoading || !publicInput.trim()}
                        className="px-4 py-2 rounded-xl bg-[#141418] hover:bg-[#202028] border border-white/[0.14] text-xs font-bold text-[#F0E9E7] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {publicLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        <span>Open Public View</span>
                      </button>
                    </div>

                    {publicError && (
                      <p className="text-xs text-rose-300 flex items-center gap-1.5 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{publicError}</span>
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </section>

            {/* OPTION 3: INVITED MODIFIER ACCESS */}
            <section className="bg-[#19191F] border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-5 sm:p-6 transition-all shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#21191D] border border-[#991B35]/50 text-[#D72645] flex items-center justify-center shrink-0">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-display font-bold text-[#F0E9E7] uppercase tracking-wide">
                      Option 3: Invited Modifier Access
                    </h3>
                    <span className="text-[10px] font-mono uppercase text-[#D72645] bg-[#21191D] px-2 py-0.5 rounded border border-[#D72645]/30">
                      Collaborator
                    </span>
                  </div>
                  <p className="text-xs text-[#A5A1A4] mb-3 leading-relaxed">
                    Collaborators authorized by the tournament organizer to update match scores, schedules, and in-game statuses. Identity verified server-side.
                  </p>

                  <form onSubmit={handleModifierSubmit} className="space-y-2.5">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={modifierInput}
                        onChange={e => setModifierInput(e.target.value)}
                        placeholder="e.g. TX-SCORE-XXXXXX or modifier invite"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-[#101013] border border-white/[0.1] text-xs font-mono uppercase tracking-wider text-[#D72645] placeholder:text-[#736F72] focus:border-[#D72645] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={modifierLoading || !modifierInput.trim()}
                        className="px-4 py-2 rounded-xl bg-[#21191D] hover:bg-[#991B35] border border-[#D72645]/40 text-xs font-bold text-[#F0E9E7] transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        {modifierLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5 text-[#D72645]" />}
                        <span>Verify Modifier Pass</span>
                      </button>
                    </div>

                    {modifierError && (
                      <p className="text-xs text-rose-300 flex items-center gap-1.5 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{modifierError}</span>
                      </p>
                    )}
                    {modifierSuccess && (
                      <p className="text-xs text-[#F0E9E7] flex items-center gap-1.5 mt-1">
                        <CheckCircle className="w-3.5 h-3.5 text-[#D72645] shrink-0" />
                        <span>{modifierSuccess}</span>
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#101013] py-5 px-4 text-center">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#A5A1A4]">
          <div className="flex items-center gap-2 font-mono">
            <span>TournX</span>
            <span>•</span>
            <span className="italic">think • prompt • organise</span>
          </div>
          <div>
            Obsidian &amp; Crimson Visual Identity • Multi-Tenant Privacy Isolation
          </div>
        </div>
      </footer>
    </div>
  );
}
