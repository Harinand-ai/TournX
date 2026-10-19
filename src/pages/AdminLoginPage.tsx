import React, { useState } from 'react';
import { Shield, Lock, Mail, AlertCircle, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { localDataService } from '../services/localDataService';
import { isSupabaseConfigured, supabase, getSupabaseProjectHost, resendConfirmationEmail } from '../lib/supabase';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onNavigateHome,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUnconfirmedError, setIsUnconfirmedError] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setIsUnconfirmedError(false);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (isSupabaseConfigured && supabase) {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
          });
          if (error) {
            console.error('[TournX Admin SignUp Error]', {
              code: (error as any).code,
              status: (error as any).status,
              message: error.message
            });
            throw error;
          }
          if (data.session) {
            onLoginSuccess();
          } else {
            if (data.user && data.user.identities && data.user.identities.length === 0) {
              setInfoMsg(`An account with ${cleanEmail} already exists. Please sign in below.`);
              setIsSignUp(false);
            } else {
              setInfoMsg(`Registration successful! A confirmation email has been sent to ${cleanEmail}. Please check your inbox.`);
              setIsSignUp(false);
            }
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (error) {
            console.error('[TournX Admin SignIn Error]', {
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
              setErrorMsg(
                `Email not confirmed for ${cleanEmail} on ${projectHost || 'Supabase'}. If you confirmed this account previously, check your credentials or resend the verification email below.`
              );
              return;
            }

            if ((error as any).code === 'invalid_credentials' || error.message.toLowerCase().includes('invalid login credentials')) {
              setErrorMsg('Invalid email or password. Please verify your credentials and check caps lock.');
              return;
            }

            throw error;
          }
          onLoginSuccess();
        }
      } else {
        // Local Synthetic Mode Demo Authentication (Development Only)
        if (!import.meta.env.DEV) {
          setErrorMsg('Supabase backend service is not configured. Organizer authentication requires an active Supabase backend.');
          return;
        }

        if (
          (cleanEmail === 'admin@ftm.local' && password === 'DemoAdmin@2026') ||
          cleanEmail === 'admin' ||
          cleanEmail.includes('admin')
        ) {
          localDataService.setDevAdminLoggedIn(true);
          onLoginSuccess();
        } else {
          setErrorMsg('Invalid demo credentials. Use "admin@ftm.local" / "DemoAdmin@2026" or click Quick Demo Sign-In.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address to resend confirmation.');
      return;
    }
    setIsResending(true);
    try {
      const res = await resendConfirmationEmail(cleanEmail);
      if (res.success) {
        setInfoMsg(`Confirmation email resent to ${cleanEmail}. Please check your inbox and spam folder.`);
        setErrorMsg('');
        setIsUnconfirmedError(false);
      } else {
        setErrorMsg(res.error || 'Failed to resend confirmation email.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error resending confirmation.');
    } finally {
      setIsResending(false);
    }
  };

  const handleQuickDemoLogin = () => {
    localDataService.setDevAdminLoggedIn(true);
    onLoginSuccess();
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-[#0f1411] rounded-2xl border border-[#1f2e26] shadow-2xl text-[#f1f5f9] relative">
      
      {/* Back button */}
      <button
        onClick={onNavigateHome}
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-lime-400 transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Tournament
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#141e17] border border-lime-700/60 mx-auto flex items-center justify-center text-lime-400 mb-2.5 shadow-[0_0_15px_rgba(132,204,22,0.2)]">
          <Shield className="w-6 h-6 text-lime-400" />
        </div>
        <div className="text-[10px] font-pixel text-lime-400 uppercase tracking-widest mb-1">
          TOURNX TERMINAL
        </div>
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#f1f5f9] font-mono">
          ORGANIZER AUTHENTICATION
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-sans">
          {isSupabaseConfigured
            ? 'Sign in to access tournament drafts, fixtures & settings'
            : import.meta.env.DEV
            ? 'Local Development Testing Terminal'
            : 'Organizer Account Sign-In'}
        </p>
      </div>

      {/* Mode Info Banner */}
      {!isSupabaseConfigured ? (
        import.meta.env.DEV ? (
          <div className="mb-4 p-3 bg-[#131b16] border border-[#23352a] rounded-xl text-xs text-slate-300">
            <p className="font-bold text-lime-400 font-mono">Local Development Mode Active</p>
            <p className="mt-0.5 text-slate-400">
              Demo login: <code className="bg-[#1c2921] px-1 py-0.5 rounded font-mono text-lime-300">admin@ftm.local</code> / <code className="bg-[#1c2921] px-1 py-0.5 rounded font-mono text-lime-300">DemoAdmin@2026</code>
            </p>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300">
            <p className="font-bold">Service Notice</p>
            <p className="mt-0.5 text-amber-400">
              Supabase authentication service is not configured. Organizer access requires a valid cloud backend.
            </p>
          </div>
        )
      ) : (
        <div className="mb-4 p-3 bg-[#131c16] border border-[#213527] rounded-xl text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <p className="font-bold text-lime-400 font-mono">Cloud Dev Connected</p>
            {getSupabaseProjectHost() && (
              <span className="font-mono text-[10px] text-lime-300 bg-lime-950/60 border border-lime-800/50 px-1.5 py-0.5 rounded">
                {getSupabaseProjectHost()}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-slate-400">
            Sign in with your organizer account to manage squads, fixtures & rules.
          </p>
        </div>
      )}

      {/* Info notification */}
      {infoMsg && (
        <div className="mb-4 p-3 rounded-lg bg-lime-950/40 border border-lime-800/60 text-lime-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-lime-400" />
          <span>{infoMsg}</span>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="flex-1">{errorMsg}</span>
          </div>
          {isUnconfirmedError && (
            <div className="pt-2 border-t border-rose-800/40 flex items-center justify-between">
              <span className="text-[11px] text-rose-400">Need a new verification link?</span>
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={isResending}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
              >
                {isResending ? 'Sending...' : 'Resend Email'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sign in / Sign up Tab Switcher */}
      {isSupabaseConfigured && (
        <div className="flex border-b border-[#1f2e26] mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`flex-1 pb-2.5 text-xs font-mono font-bold uppercase tracking-wider text-center cursor-pointer transition border-b-2 ${
              !isSignUp
                ? 'border-lime-500 text-lime-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`flex-1 pb-2.5 text-xs font-mono font-bold uppercase tracking-wider text-center cursor-pointer transition border-b-2 ${
              isSignUp
                ? 'border-lime-500 text-lime-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            Sign Up
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
            Manager Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={isSupabaseConfigured ? 'organizer@tournx.app' : 'admin@ftm.local'}
              className="w-full pl-9 pr-3 py-2.5 bg-[#0b100d] border border-[#23352a] rounded-lg text-xs text-[#f1f5f9] focus:border-lime-500 focus:outline-none font-sans placeholder:text-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-3 py-2.5 bg-[#0b100d] border border-[#23352a] rounded-lg text-xs text-[#f1f5f9] focus:border-lime-500 focus:outline-none font-sans placeholder:text-slate-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-black font-extrabold text-xs uppercase tracking-wider rounded-lg transition cursor-pointer shadow-md"
        >
          {loading
            ? 'Authenticating...'
            : isSupabaseConfigured
            ? isSignUp
              ? 'Create Organizer Account'
              : 'Sign In to Dashboard'
            : 'Sign In (Dev Demo)'}
        </button>

        {isSupabaseConfigured && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
                setInfoMsg('');
              }}
              className="text-xs text-lime-400 hover:underline font-mono"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up as Organizer"}
            </button>
          </div>
        )}

        {import.meta.env.DEV && !isSupabaseConfigured && (
          <div className="pt-2 border-t border-[#1f2e26]">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full py-2 px-4 bg-[#141d18] hover:bg-[#1a261f] text-lime-400 font-mono text-xs uppercase tracking-wider rounded-lg transition cursor-pointer border border-[#273a2f] flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Local Demo Admin Sign-In</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
