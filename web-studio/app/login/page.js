'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/auth-provider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await login(email, password);
      if (res.success) {
        const userRole = res.user?.role;
        router.push(userRole === 'super_admin' || userRole === 'org_admin' ? '/admin' : '/');
      } else {
        setErrorMessage(res.error || 'Invalid credentials');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-[#0f1113] flex items-center justify-center p-4 font-sans text-zinc-100">
      <div className="w-full max-w-md bg-[#16181c] border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 items-center justify-center shadow-lg shadow-purple-500/20 mx-auto">
            <div className="w-full h-full bg-[#0f1113] rounded-[10px] flex items-center justify-center font-bold text-base text-white">
              ✦
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white font-grotesk tracking-tight">
            Sign In to Aether Studio
          </h1>
          <p className="text-xs text-zinc-400">
            Access your AI Video, Image & Audio creation workspace
          </p>
        </div>

        {/* First Time Setup Hint */}
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
          <div className="font-bold text-purple-300 font-grotesk flex items-center gap-1.5">
            <span>🛡️</span> First-Time Platform Setup?
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            If you haven't created an account yet, visit the{' '}
            <Link href="/signup" className="text-purple-400 font-bold underline">
              Signup Page
            </Link>. The very first account registered automatically receives <strong>Super Administrator</strong> rights.
          </p>
        </div>

        {/* Error Callout */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
            <span>⚠️</span> {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition font-sans"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300">Password</label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-purple-600/25 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In to Studio'}
          </button>
        </form>

        <div className="text-center text-xs text-zinc-400 pt-2 border-t border-white/5">
          Don't have an account yet?{' '}
          <Link href="/signup" className="text-purple-400 font-bold hover:underline">
            Create account
          </Link>
        </div>

      </div>
    </div>
  );
}
