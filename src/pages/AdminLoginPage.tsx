import React, { useState } from 'react';
import { Shield, Lock, Mail, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { localDataService } from '../services/localDataService';

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
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // Local development authentication
      const cleanEmail = email.trim().toLowerCase();
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
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
          ADMIN PORTAL
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Local Development Demo • Football Tournament Manager
        </p>
      </div>

      {/* Demo Credentials Info Banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
        <p className="font-bold">Development Mode Active</p>
        <p className="mt-0.5 text-blue-700">
          Demo login: <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">admin@ftm.local</code> / <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">DemoAdmin@2026</code>
        </p>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Admin Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ftm.local"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
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
              placeholder="DemoAdmin@2026"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold uppercase tracking-wider transition-colors shadow-xs text-sm cursor-pointer"
        >
          {loading ? 'Authenticating...' : 'Sign In as Demo Admin'}
        </button>

        <button
          type="button"
          onClick={handleQuickDemoLogin}
          className="w-full py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs tracking-wider transition-colors border border-slate-300 cursor-pointer flex items-center justify-center gap-2"
        >
          <KeyRound className="w-3.5 h-3.5" />
          One-Click Demo Admin Sign-In
        </button>
      </form>

    </div>
  );
};
