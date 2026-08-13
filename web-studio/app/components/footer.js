'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  const isHomeOrPricing = pathname === '/' || pathname === '/pricing';
  if (!isHomeOrPricing) return null;

  return (
    <footer id="footer" className="w-full bg-[#0d0e10] border-t border-white/10 text-zinc-400 font-sans text-xs py-10 px-6 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand Col */}
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2">
            <span role="img" aria-label="Aether Studio" className="text-white flex items-center gap-1.5">
              <svg className="w-5 h-5 text-purple-400" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L13 8L19 9L14.5 13.5L16 19.5L10 16L4 19.5L5.5 13.5L1 9L7 8L10 2Z" fill="currentColor" />
              </svg>
            </span>
            <span className="font-grotesk font-extrabold text-sm text-white tracking-tight">
              Aether Studio
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
            Create photorealistic images, 1080p videos with native audio, and custom voice narration with Aether Studio AI.
          </p>
        </div>

        {/* Product Links */}
        <div className="space-y-2">
          <div className="font-grotesk font-bold text-white text-xs uppercase tracking-wider">Creation Suites</div>
          <ul className="space-y-1.5">
            <li><Link href="/ai/image" className="hover:text-white transition">Image Generator</Link></li>
            <li><Link href="/ai/video" className="hover:text-white transition">Video Studio</Link></li>
            <li><Link href="/avatars" className="hover:text-white transition">Avatar Studio</Link></li>
            <li><Link href="/cinema-studio" className="hover:text-white transition">Cinema Studio 3.5</Link></li>
            <li><Link href="/canvas" className="hover:text-white transition">Media Canvas</Link></li>
          </ul>
        </div>

        {/* Company Links */}
        <div className="space-y-2">
          <div className="font-grotesk font-bold text-white text-xs uppercase tracking-wider">Company & Account</div>
          <ul className="space-y-1.5">
            <li><Link href="/pricing" className="hover:text-white transition">Pricing Plans</Link></li>
            <li><Link href="/enterprise" className="hover:text-white transition">Enterprise</Link></li>
            <li><Link href="/library/image" className="hover:text-white transition">My Asset Library</Link></li>
            <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-[11px] text-zinc-500">
        <div>© 2026 Aether Studio, Inc. All rights reserved.</div>
        <div className="flex gap-4 mt-2 md:mt-0">
          <Link href="/terms" className="hover:text-zinc-300 transition">Terms</Link>
          <Link href="/privacy" className="hover:text-zinc-300 transition">Privacy</Link>
          <Link href="/cookies" className="hover:text-zinc-300 transition">Cookie Notice</Link>
        </div>
      </div>
    </footer>
  );
}
