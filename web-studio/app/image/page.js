'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ImageRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ai/image');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#08090b] flex items-center justify-center text-zinc-400 text-xs font-mono">
      Redirecting to AI Image Studio...
    </div>
  );
}
