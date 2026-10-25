import React, { useState } from 'react';
import { Trophy, Lock, Mail, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { localDataService } from '../services/localDataService';
import { isSupabaseConfigured, supabase, resendConfirmationEmail, sendPasswordResetEmail } from '../lib/supabase';
import { TournXLogo } from '../components/TournXLogo';

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

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const isReservedDemoAddress = (addr: string) => {
    const lower = addr.toLowerCase().trim();
    return (
      lower === 'admin@ftm.local' ||
      lower.endsWith('.local') ||
      lower === 'admin@demo.com' ||
      lower === 'admin'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg('');
    setInfoMsg('');
    setIsUnconfirmedError(false);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMsg('Please enter an email address.');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setErrorMsg('Please enter a valid, deliverable email address (e.g., organizer@domain.com).');
      return;
    }

    if (authView === 'SIGN_UP' && isReservedDemoAddress(cleanEmail)) {
      setErrorMsg(
        `"${cleanEmail}" is a reserved demo identity and cannot be registered as a cloud organizer account. Please use your genuine, deliverable email address.`
      );
      return;
    }

    if (authView === 'SIGN_IN' && isReservedDemoAddress(cleanEmail) && !import.meta.env.DEV) {
      setErrorMsg(
        'Demo credentials (such as admin@ftm.local) are restricted to local development environments and cannot authenticate against cloud tournaments.'
      );
      return;
    }

    setLoading(true);

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

      if (
        import.meta.env.DEV &&
        authView === 'SIGN_IN' &&
        ((cleanEmail === 'admin@ftm.local' && password === 'DemoAdmin@2026') ||
         cleanEmail === 'admin' ||
         cleanEmail.includes('admin'))
      ) {
        localDataService.setDevAdminLoggedIn(true);
        onLoginSuccess();
        return;
      }

      if (isSupabaseConfigured && supabase) {
        if (authView === 'SIGN_UP') {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
          });
          if (error) {
            const isRateLimit =
              error.status === 429 ||
              (error as any).code === 'over_email_send_rate_limit' ||
              error.message.toLowerCase().includes('rate limit') ||
              error.message.toLowerCase().includes('email rate limit exceeded');

            if (isRateLimit) {
              setErrorMsg(
                'Supabase email sending rate limit reached. The free tier limits verification emails (typically 3–4 per hour) to prevent abuse. If you already registered, please sign in. Otherwise, please wait 15–30 minutes before trying again.'
              );
              return;
            }
            throw error;
          }

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
              setErrorMsg('Invalid email or password. Please verify your credentials or register a new account.');
              return;
            }

            const isRateLimit =
              error.status === 429 ||
              (error as any).code === 'over_email_send_rate_limit' ||
              error.message.toLowerCase().includes('rate limit');

            if (isRateLimit) {
              setErrorMsg('Sign-in attempts temporarily rate limited. Please wait a few minutes before retrying.');
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
    <div className="max-w-md mx-auto my-10 p-6 sm:p-8 bg-[#19191F] rounded-2xl border border-white/10 shadow-2xl text-[#F0E9E7] relative">
      
      {/* Return Navigation */}
      <button
        onClick={onNavigateHome}
        className="inline-flex items-center gap-1.5 text-xs font-mono text-[#A5A1A4] hover:text-[#F0E9E7] transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Tournament</span>
      </button>

      {/* Brand Header */}
      <div className="text-center mb-8 flex flex-col items-center">
        <TournXLogo size="md" showTagline={true} />
        
        <p className="text-xs text-[#A5A1A4] mt-3 font-sans">
          {authView === 'FORGOT_PASSWORD'
            ? 'Reset your organizer account password'
            : authView === 'SIGN_UP'
            ? 'Create an organizer account to manage tournaments'
            : 'Sign in to access your organizer workspace'}
        </p>
      </div>

      {/* Notifications */}
      {infoMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-[#21191D] border border-[#F02D50]/40 text-[#F0E9E7] text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#F02D50]" />
          <span>{infoMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex flex-col gap-2">
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
                className="px-2.5 py-1 rounded bg-[#F02D50] hover:bg-[#b01e37] text-white font-semibold text-[11px] transition cursor-pointer disabled:opacity-50"
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
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A5A1A4] mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#A5A1A4]" />
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="organizer@club.com"
              className="w-full pl-10 pr-3.5 py-2.5 bg-[#101013] border border-white/10 rounded-xl text-sm text-[#F0E9E7] focus:border-[#F02D50] focus:outline-none font-sans placeholder:text-[#A5A1A4]/50 transition"
            />
          </div>
        </div>

        {authView !== 'FORGOT_PASSWORD' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A5A1A4]">
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
                  className="text-xs text-[#A5A1A4] hover:text-[#F02D50] transition cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#A5A1A4]" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#101013] border border-white/10 rounded-xl text-sm text-[#F0E9E7] focus:border-[#F02D50] focus:outline-none font-sans placeholder:text-[#A5A1A4]/50 transition"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 bg-[#F02D50] hover:bg-[#b01e37] disabled:opacity-50 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg shadow-[#F02D50]/20"
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
              className="text-xs text-[#A5A1A4] hover:text-[#F0E9E7] transition cursor-pointer"
            >
              Don't have an account? <span className="font-semibold text-[#F02D50]">Sign Up</span>
            </button>
          ) : authView === 'SIGN_UP' ? (
            <button
              type="button"
              onClick={() => {
                setAuthView('SIGN_IN');
                setErrorMsg('');
                setInfoMsg('');
              }}
              className="text-xs text-[#A5A1A4] hover:text-[#F0E9E7] transition cursor-pointer"
            >
              Already have an account? <span className="font-semibold text-[#F02D50]">Sign In</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthView('SIGN_IN');
                setErrorMsg('');
                setInfoMsg('');
              }}
              className="text-xs text-[#A5A1A4] hover:text-[#F0E9E7] transition cursor-pointer"
            >
              Return to <span className="font-semibold text-[#F02D50]">Sign In</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

