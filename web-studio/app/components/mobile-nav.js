'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNav() {
  const pathname = usePathname();

  // Hide mobile nav on studio & canvas workspaces to preserve 100% full-screen workspace viewports
  const isStudioWorkspace = pathname.startsWith('/cinema-studio') || pathname.startsWith('/canvas');
  if (isStudioWorkspace) return null;

  const tabs = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/community', label: 'Community', icon: '🌐' },
    { href: '/ai/video', label: 'Generate', icon: '⚡', isMain: true },
    { href: '/library/image', label: 'Library', icon: '📁' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0f1113]/95 border-t border-white/10 backdrop-blur-md px-2 py-1.5 flex items-center justify-around text-zinc-400">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;

        if (tab.isMain) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center -mt-5"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-violet-600/40">
                <div className="w-full h-full bg-[#0f1113] rounded-full flex items-center justify-center text-lg text-white font-bold">
                  {tab.icon}
                </div>
              </div>
              <span className="text-[10px] font-bold text-violet-400 mt-0.5">{tab.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center py-1 px-3 transition ${
              isActive ? 'text-white font-bold' : 'hover:text-zinc-200'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
