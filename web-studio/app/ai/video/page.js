'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AvatarVideoRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Avatar Presenter feature has been unified into the main /video generator per industry standards
    router.replace('/video');
  }, [router]);

  return (
    <div className="flex-1 bg-[#0f1113] text-zinc-100 flex items-center justify-center p-8 font-sans">
      <div className="text-center space-y-3 font-mono text-xs text-purple-400 animate-pulse">
        <div className="text-3xl">🎥</div>
        <div>Redirecting to Unified AI Video Generator...</div>
      </div>
    </div>
  );
}
