import React, { useEffect, useState } from 'react';
import { LockKeyhole, Mail, MailCheck, UserPlus } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthGateProps {
  children: React.ReactNode;
}

const configuredAuthRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined;

function getAuthRedirectUrl() {
  if (configuredAuthRedirectUrl) {
    return configuredAuthRedirectUrl;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.location.origin;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-xs font-mono tracking-widest">
        Checking session...
      </div>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setMessage('');

    const result =
      mode === 'signup'
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: getAuthRedirectUrl(),
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setMessage(result.error.message);
      setLoading(false);
      return;
    }

    if (mode === 'signup' && !result.data.session) {
      setMessage('Account created. Check your email to verify it, then sign in to create or join your organization.');
    }

    setLoading(false);
  };

  const handleResendVerification = async () => {
    if (!supabase || !email) return;

    setLoading(true);
    setMessage('');

    const result = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });

    if (result.error) {
      setMessage(result.error.message);
      setLoading(false);
      return;
    }

    setMessage('Verification email sent. Check your inbox and spam folder.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
        <div className="space-y-2">
          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <LockKeyhole size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              {mode === 'signup' ? 'Create your Catalyser account' : 'Sign in to Catalyser'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Access your organization workspace, projects, contacts, ledgers, and documents.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs font-bold text-slate-600">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
          </label>

          {message && (
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            {mode === 'signup' ? <UserPlus size={16} /> : <Mail size={16} />}
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>

          {mode === 'signup' && (
            <button
              type="button"
              disabled={loading || !email}
              onClick={() => void handleResendVerification()}
              className="w-full bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 border border-slate-200 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <MailCheck size={16} />
              Resend verification email
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setMessage('');
          }}
          className="text-xs font-bold text-blue-700 hover:text-blue-800 bg-transparent border-none cursor-pointer"
        >
          {mode === 'signin' ? 'New organization or invited user? Create an account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
