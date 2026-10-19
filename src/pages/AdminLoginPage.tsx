import React, { useState } from 'react';
import { Trophy, Lock, Mail, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { localDataService } from '../services/localDataService';
import { isSupabaseConfigured, supabase, resendConfirmationEmail, sendPasswordResetEmail } from '../lib/supabase';

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
  const [authView, setAuthView] = useState<'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD'>('SIGN_IN');
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
      if (authView === 'FORGOT_PASSWORD') {
        const res = await sendPasswordResetEmail(cleanEmail);
        if (res.success) {
          setInfoMsg(`Password reset instructions sent to ${cleanEmail}. Please check your inbox.`);
        } else {
          setErrorMsg(res.error || 'Failed to send password reset email.');
        }
        return;
      }

      if (isSupabaseConfigured && supabase) {
        if (authView === 'SIGN_UP') {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
          });
          if (error) throw error;

          if (data.session) {
            onLoginSuccess();
          } else {
            if (data.user && data.user.identities && data.user.identities.length === 0) {
              setInfoMsg(`An account with ${cleanEmail} already exists. Please sign in below.`);
              setAuthView('SIGN_IN');
            } else {
              setInfoMsg(`Registration successful! A confirmation email has been sent to ${cleanEmail}. Please check your inbox.`);
              setAuthView('SIGN_IN');
            }
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (error) {
            const isUnconfirmed = 
              (error as any).code === 'email_not_confirmed' ||
              error.message.toLowerCase().includes('email not confirmed');

            if (isUnconfirmed) {
              setIsUnconfirmedError(true);
              setErrorMsg(
                `Email not confirmed for ${cleanEmail}. Please verify your email or click resend below.`
              );
              return;
            }

            if ((error as any).code === 'invalid_credentials' || error.message.toLowerCase().includes('invalid login credentials')) {
              setErrorMsg('Invalid email or password. Please verify your credentials.');
              return;
            }

            throw error;
          }
          onLoginSuccess();
        }
      } else {
        // Fallback for offline / synthetic environment
        if (!import.meta.env.DEV) {
          setErrorMsg('Authentication service is currently unavailable. Please verify your connection.');
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
          setErrorMsg('Invalid credentials.');
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
        setInfoMsg(`Confirmation email resent to ${cleanEmail}. Please check your inbox.`);
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

  return (
    <div className="max-w-md mx-auto my-10 p-6 sm:p-8 bg-[#111827] rounded-2xl border border-[#1f293d] shadow-xl text-[#f1f5f9] relative">
      
      {/* Return Navigation */}
      <button
        onClick={onNavigateHome}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Tournament</span>
      </button>

      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#162032] border border-[#2b3a54] mx-auto flex items-center justify-center text-emerald-400 mb-3 shadow-xs">
          <Trophy className="w-6 h-6 text-emerald-400" />
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight text-[#f8fafc]">
          Tourn<span className="text-emerald-400 font-pixel">X</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-sans">
          {authView === 'FORGOT_PASSWORD'
            ? 'Reset your organizer account password'
            : authView === 'SIGN_UP'
            ? 'Create an organizer account to manage tournaments'
            : 'Sign in to access your organizer workspace'}
        </p>
      </div>

      {/* Notifications */}
      {infoMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{infoMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex flex-col gap-2">
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
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] transition cursor-pointer disabled:opacity-50"
              >
                {isResending ? 'Sending...' : 'Resend Email'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Authentication Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="organizer@club.com"
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#0b1120] border border-[#222f46] rounded-xl text-sm text-[#f8fafc] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none font-sans placeholder:text-slate-500 transition"
            />
          </div>
        </div>

        {authView !== 'FORGOT_PASSWORD' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Password
              </label>
              {authView === 'SIGN_IN' && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('FORGOT_PASSWORD');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#0b1120] border border-[#222f46] rounded-xl text-sm text-[#f8fafc] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none font-sans placeholder:text-slate-500 transition"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition cursor-pointer shadow-xs"
        >
          {loading
            ? 'Processing...'
            : authView === 'FORGOT_PASSWORD'
            ? 'Send Reset Instructions'
            : authView === 'SIGN_UP'
            ? 'Create Account'
            : 'Sign In'}
        </button>

        {/* View Switching Links */}
        <div className="text-center pt-2">
          {authView === 'SIGN_IN' ? (
            <button
              type="button"
              onClick={() => {
                setAuthView('SIGN_UP');
                setErrorMsg('');
                setInfoMsg('');
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer"
            >
              Don't have an account? <span className="font-semibold text-emerald-400">Sign Up</span>
            </button>
          ) : authView === 'SIGN_UP' ? (
            <button
              type="button"
              onClick={() => {
                setAuthView('SIGN_IN');
                setErrorMsg('');
                setInfoMsg('');
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer"
            >
              Already have an account? <span className="font-semibold text-emerald-400">Sign In</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthView('SIGN_IN');
                setErrorMsg('');
                setInfoMsg('');
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 transition cursor-pointer"
            >
              Return to <span className="font-semibold text-emerald-400">Sign In</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

