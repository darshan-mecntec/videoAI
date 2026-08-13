'use client';

import { useAuth } from './auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0d] flex items-center justify-center font-sans text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-xs text-zinc-400 font-mono font-medium">Authenticating Aether Studio Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#090a0d] flex items-center justify-center font-sans text-zinc-100 p-4">
        <div className="max-w-md w-full bg-[#12141a] border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center text-2xl mx-auto">
            🔐
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-grotesk text-white">Authentication Required</h2>
            <p className="text-xs text-zinc-400">
              You must be logged in to access AI image & video generation tools and consume your credit balance.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
