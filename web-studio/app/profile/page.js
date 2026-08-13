'use client';

import { useAuth } from '../components/auth-provider';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 bg-[#0f1113] p-4 sm:p-8 text-zinc-100 font-sans max-w-7xl mx-auto w-full space-y-6">
      <h1 className="text-3xl font-extrabold text-white font-grotesk tracking-tight uppercase">User Profile & Account Settings</h1>
      
      {user && (
        <div className="bg-[#16181c] border border-white/10 rounded-2xl p-6 space-y-3 max-w-lg shadow-xl">
          <div className="text-lg font-bold text-white font-grotesk">{user.name}</div>
          <div className="text-xs font-mono text-zinc-400">{user.email}</div>
          <div className="text-xs font-mono text-purple-400">⚡ 1,250 Credits Remaining</div>
        </div>
      )}
    </div>
  );
}
