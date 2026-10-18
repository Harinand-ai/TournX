import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  Key, 
  LogIn, 
  UserPlus,
  Play
} from 'lucide-react';
import { supabase, isSupabaseConfigured, getSupabaseProjectHost, resendConfirmationEmail } from '../lib/supabase';
import { localDataService } from '../services/localDataService';
import { Tournament } from '../types/multiTenant';

interface LandingPageProps {
  onOrganizeClick: (initialTournamentData?: { name: string; description: string; visibility: 'PUBLIC' | 'PRIVATE' }) => void;
  onJoinTournament: (tourneySlug: string) => void;
  onOpenPublicDemo: () => void;
  activeTournament?: Tournament;
  noticeMessage?: string;
}

export function LandingPage({
  onOrganizeClick,
  onJoinTournament,
  onOpenPublicDemo,
  activeTournament,
  noticeMessage
}: LandingPageProps) {
  // Main Tab: 'ORGANIZE' | 'JOIN'
  const [activeAction, setActiveAction] = useState<'ORGANIZE' | 'JOIN'>('ORGANIZE');

  // Organizer Auth Mode: Default to 'SIGN_IN' for existing organizers
  const [authMode, setAuthMode] = useState<'SIGN_IN' | 'SIGN_UP'>('SIGN_IN');

  // Sign up / Sign in fields
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerPassword, setOrganizerPassword] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentDescription, setTournamentDescription] = useState('');
  const [tournamentVisibility, setTournamentVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');

  // Join fields
  const [joinCodeOrLink, setJoinCodeOrLink] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  // Status & Error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);
  const [isUnconfirmedError, setIsUnconfirmedError] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

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

    if (!tournamentName.trim()) {
      setErrorMessage('Please provide a name for your first tournament.');
      return;
    }

    setIsLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        // Real Supabase Auth registration
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
          console.error('[TournX Organizer SignUp Error]', {
            code: (error as any).code,
            status: (error as any).status,
            message: error.message
          });
          throw new Error(error.message);
        }

        if (data.session) {
          // Immediately authenticated
          if (!isSupabaseConfigured) {
            localDataService.setDevAdminLoggedIn(true);
          }
          onOrganizeClick({
            name: tournamentName.trim(),
            description: tournamentDescription.trim(),
            visibility: tournamentVisibility,
          });
          return;
        } else if (data.user && !data.session) {
          // Check if this email already exists in Supabase (identities array is empty)
          if (data.user.identities && data.user.identities.length === 0) {
            setConfirmationNotice(
              `An account with ${cleanEmail} already exists. Please sign in below with your password.`
            );
            setAuthMode('SIGN_IN');
            return;
          }

          // New account with email confirmation required by Supabase project settings
          setConfirmationNotice(
            `Registration successful! A verification email has been sent to ${cleanEmail}. Please verify your email to activate your account, then sign in below.`
          );
          setAuthMode('SIGN_IN');
          return;
        }
        throw new Error('Registration failed. Please try again.');
      }

      // Offline / Local synthetic mode fallback
      localDataService.setDevAdminLoggedIn(true);
      onOrganizeClick({
        name: tournamentName.trim(),
        description: tournamentDescription.trim(),
        visibility: tournamentVisibility,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your details.');
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
          console.error('[TournX Organizer SignIn Error]', {
            code: (error as any).code,
            status: (error as any).status,
            message: error.message,
            targetHost: getSupabaseProjectHost()
          });

          const isUnconfirmed = 
            (error as any).code === 'email_not_confirmed' ||
            error.message.toLowerCase().includes('email not confirmed');

          if (isUnconfirmed) {
            setIsUnconfirmedError(true);
            const projectHost = getSupabaseProjectHost();
            setErrorMessage(
              `Email not confirmed for ${cleanEmail} on ${projectHost || 'Supabase'}. If you confirmed this account previously or signed in earlier, ensure you are using the correct credentials and project. If you need a new confirmation email, click below.`
            );
            return;
          }

          if ((error as any).code === 'invalid_credentials' || error.message.toLowerCase().includes('invalid login credentials')) {
            setErrorMessage('Invalid email or password. Please verify your credentials and check caps lock.');
            return;
          }

          throw new Error(error.message);
        }

        if (data.user) {
          if (!isSupabaseConfigured) {
            localDataService.setDevAdminLoggedIn(true);
          }
          onOrganizeClick();
          return;
        }
        throw new Error('Sign in failed. No user session returned.');
      }

      // Offline fallback login check
      localDataService.setDevAdminLoggedIn(true);
      onOrganizeClick();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
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
  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoinSuccess(null);

    const input = joinCodeOrLink.trim();
    if (!input) {
      setJoinError('Please enter a tournament link, slug, or access code.');
      return;
    }

    // 1. Check if user pasted a full URL or path (e.g. http://.../t/slug or /t/slug)
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

    // 3. Check if it's an Access Code for the active or any tournament
    const activeTourney = activeTournament || localDataService.getActiveTournament();
    const verifyResult = localDataService.verifyAccessCode(activeTourney.id, input);
    if (verifyResult.success) {
      setJoinSuccess(`Access code verified! Unlocked ${verifyResult.role} access.`);
      setTimeout(() => {
        onJoinTournament(activeTourney.slug || 'tournx-championship');
      }, 800);
      return;
    }

    // 4. Try checking access code across all tournaments
    for (const t of allTournaments) {
      const res = localDataService.verifyAccessCode(t.id, input);
      if (res.success) {
        setJoinSuccess(`Access code verified for "${t.name}"! Unlocked ${res.role} access.`);
        setTimeout(() => {
          onJoinTournament(t.slug || 'tournx-championship');
        }, 800);
        return;
      }
    }

    // 5. If not an access code, treat as direct tournament slug
    const cleanSlug = input.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    onJoinTournament(cleanSlug);
  };

  return (
    <div className="w-full min-h-[85vh] flex flex-col justify-center items-center py-8 px-4 sm:px-6 bg-slate-50">
      
      {/* Brand Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide uppercase mb-4 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          <span>think.prompt.organise</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
          Tourn<span className="text-emerald-700">X</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-lg mx-auto">
          Describe your tournament. Preview it. Add your squads. Publish it. Share the link.
        </p>
      </div>

      {/* Notice Message (e.g. expired or deleted tournament notice) */}
      {noticeMessage && (
        <div className="w-full max-w-lg mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Main Two-Action Card */}
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Primary Action Selector: Only 2 Primary Actions */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveAction('ORGANIZE');
              setErrorMessage(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeAction === 'ORGANIZE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Trophy className="w-4 h-4 text-emerald-700" />
            <span>Organize tournament</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveAction('JOIN');
              setErrorMessage(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeAction === 'JOIN'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-700" />
            <span>Join tournament</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8">
          
          {/* Notifications */}
          {confirmationNotice && (
            <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{confirmationNotice}</span>
            </div>
          )}

          {resendStatus && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{resendStatus}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMessage}</span>
              </div>
              {isUnconfirmedError && (
                <div className="pt-2 border-t border-rose-200 flex items-center justify-between">
                  <span className="text-[11px] text-rose-700">Need a verification link?</span>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isResending}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] transition cursor-pointer disabled:opacity-50"
                  >
                    {isResending ? 'Sending...' : 'Resend Confirmation Email'}
                  </button>
                </div>
              )}
            </div>
          )}

          <AnimatePresence mode="wait">
            
            {/* ACTION 1: ORGANIZE A TOURNAMENT */}
            {activeAction === 'ORGANIZE' && (
              <motion.div
                key="organize-pane"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {/* Sign up / Sign in Toggle */}
                <div className="flex items-center justify-between mb-5 border-b border-slate-200 pb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {authMode === 'SIGN_UP' ? 'New Organizer Registration' : 'Organizer Sign In'}
                  </span>
                  
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('SIGN_UP');
                        setErrorMessage(null);
                      }}
                      className={`font-semibold cursor-pointer ${
                        authMode === 'SIGN_UP' ? 'text-emerald-700 underline underline-offset-4' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Sign up
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('SIGN_IN');
                        setErrorMessage(null);
                      }}
                      className={`font-semibold cursor-pointer ${
                        authMode === 'SIGN_IN' ? 'text-emerald-700 underline underline-offset-4' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Sign in
                    </button>
                  </div>
                </div>

                {/* SIGN UP FORM */}
                {authMode === 'SIGN_UP' ? (
                  <form onSubmit={handleOrganizerSignUp} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Your Name</label>
                      <input
                        type="text"
                        value={organizerName}
                        onChange={(e) => setOrganizerName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder-slate-400 transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={organizerEmail}
                          onChange={(e) => setOrganizerEmail(e.target.value)}
                          placeholder="organizer@tournx.io"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder-slate-400 transition"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Password *</label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={organizerPassword}
                          onChange={(e) => setOrganizerPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder-slate-400 transition"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <label className="text-xs font-semibold text-emerald-800">Tournament Name *</label>
                      <input
                        type="text"
                        required
                        value={tournamentName}
                        onChange={(e) => setTournamentName(e.target.value)}
                        placeholder="e.g. Kerala Champions Cup"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder-slate-400 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Tournament Description</label>
                      <input
                        type="text"
                        value={tournamentDescription}
                        onChange={(e) => setTournamentDescription(e.target.value)}
                        placeholder="Brief summary or league subtitle"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder-slate-400 transition"
                      />
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-semibold text-slate-700">Visibility</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTournamentVisibility('PUBLIC')}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            tournamentVisibility === 'PUBLIC'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Public</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTournamentVisibility('PRIVATE')}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            tournamentVisibility === 'PRIVATE'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Private</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-3 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Sign up & Create Tournament</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* SIGN IN FORM */
                  <form onSubmit={handleOrganizerSignIn} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Email Address</label>
                      <input
                        type="email"
                        required
                        value={organizerEmail}
                        onChange={(e) => setOrganizerEmail(e.target.value)}
                        placeholder="organizer@tournx.io"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder-slate-400 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Password</label>
                      <input
                        type="password"
                        required
                        value={organizerPassword}
                        onChange={(e) => setOrganizerPassword(e.target.value)}
                        placeholder="Your account password"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder-slate-400 transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-3 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Sign in to Workspace</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Instant Demo Sandbox Shortcut (local development only) */}
                {!isSupabaseConfigured && (
                  <div className="mt-6 pt-4 border-t border-slate-200 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        localDataService.setDevAdminLoggedIn(true);
                        onOrganizeClick();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Open local organizer demo without creating an account</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ACTION 2: JOIN A TOURNAMENT */}
            {activeAction === 'JOIN' && (
              <motion.div
                key="join-pane"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 mb-3">
                    Enter a tournament link, slug, or access code to view fixtures, enter scores, or access your squad.
                  </p>
                </div>

                {joinSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{joinSuccess}</span>
                  </div>
                )}

                {joinError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}

                <form onSubmit={handleJoinSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Tournament Link, Code, or Slug
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={joinCodeOrLink}
                        onChange={(e) => setJoinCodeOrLink(e.target.value)}
                        placeholder="e.g. tournx-championship or TX-VIEW-9876"
                        className="w-full px-3.5 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 placeholder-slate-400 transition pl-10"
                      />
                      <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>Join tournament</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Instant Public Viewer Link */}
                <div className="mt-6 pt-5 border-t border-slate-200">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {activeTournament?.name || 'TournX Championship'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Public Showcase Tournament
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenPublicDemo}
                      className="shrink-0 py-1.5 px-3 rounded-lg bg-white border border-slate-300 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
                    >
                      View Public Link
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </div>

      {/* Football-Oriented Subtle Footer */}
      <div className="mt-8 text-center text-xs text-slate-500">
        TournX • Sports Tournament Management Engine • Deterministic & Isolated
      </div>

    </div>
  );
}
