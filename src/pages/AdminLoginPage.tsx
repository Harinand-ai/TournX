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
        // Real Supabase Authentication (Phase Five)
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
              setInfoMsg(`An account with ${cleanEmail} already exists. Please sign in below with your password.`);
              setIsSignUp(false);
            } else {
              setInfoMsg(`Registration successful! A confirmation email has been sent to ${cleanEmail}. Please check your inbox, then sign in.`);
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
                `Email not confirmed for ${cleanEmail} on ${projectHost || 'Supabase'}. If you confirmed this account previously or signed in earlier, ensure you are using the correct credentials and project. If you need a new confirmation email, click below.`
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
    <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-900">
      
      {/* Back button */}
      <button
        onClick={onNavigateHome}
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Tournament
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 mx-auto flex items-center justify-center text-blue-700 mb-3">
          <Shield className="w-6 h-6 text-blue-700" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
          ORGANIZER PORTAL
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {isSupabaseConfigured
            ? 'Supabase Authentication • TournX'
            : import.meta.env.DEV
            ? 'Local Synthetic Mode • TournX (think.prompt.organise)'
            : 'Organizer Authentication • TournX'}
        </p>
      </div>

      {/* Mode Info Banner */}
      {!isSupabaseConfigured ? (
        import.meta.env.DEV ? (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
            <p className="font-bold">Local Development Mode Active</p>
            <p className="mt-0.5 text-blue-700">
              Demo login: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">admin@ftm.local</code> / <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">DemoAdmin@2026</code>
            </p>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <p className="font-bold">Service Notice</p>
            <p className="mt-0.5 text-amber-700">
              Supabase authentication service is not configured. Organizer access requires a valid cloud backend.
            </p>
          </div>
        )
      ) : (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
          <div className="flex items-center justify-between">
            <p className="font-bold">Cloud Dev Project Connected</p>
            {getSupabaseProjectHost() && (
              <span className="font-mono text-[10px] text-emerald-900 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                {getSupabaseProjectHost()}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-emerald-700">
            Authenticated via Supabase. Sign in with your organizer account.
          </p>
        </div>
      )}

      {/* Info notification */}
      {infoMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{infoMsg}</span>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{errorMsg}</span>
          </div>
          {isUnconfirmedError && (
            <div className="pt-2 border-t border-red-200 flex items-center justify-between">
              <span className="text-[11px] text-red-600">Need a new verification link?</span>
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={isResending}
                className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] transition cursor-pointer disabled:opacity-50"
              >
                {isResending ? 'Sending...' : 'Resend Confirmation Email'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sign in / Sign up Tab Switcher */}
      {isSupabaseConfigured && (
        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider text-center cursor-pointer transition border-b-2 ${
              !isSignUp
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
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
            className={`flex-1 pb-2.5 text-xs font-bold uppercase tracking-wider text-center cursor-pointer transition border-b-2 ${
              isSignUp
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign Up
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Organizer Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={isSupabaseConfigured ? 'organizer@tournx.app' : 'admin@ftm.local'}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-sm"
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
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up as Organizer"}
            </button>
          </div>
        )}

        {import.meta.env.DEV && !isSupabaseConfigured && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer border border-slate-200 flex items-center justify-center gap-1.5"
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
