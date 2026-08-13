'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';

export default function Sidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navSections = [
    {
      title: 'CREATE',
      items: [
        { href: '/ai/image', label: 'AI Image', icon: '🖼️', tag: 'Midjourney' },
        { href: '/video', label: 'AI Video', icon: '🎥', tag: 'Runway/Kling' },
        { href: '/editor', label: 'AI Editor', icon: '✏️', tag: 'Firefly/Pika' },
      ],
    },
    {
      title: 'TOOLS',
      items: [
        { href: '/cinema-studio', label: 'Scene Builder', icon: '🎬', tag: 'Timeline' },
        { href: '/real-estate', label: 'Real Estate Studio', icon: '🏡', tag: 'Walkthroughs' },
        { href: '/canvas', label: 'AI Canvas', icon: '⚡', tag: 'Nodes' },
      ],
    },
    {
      title: 'ASSETS & CONTENT',
      items: [
        { href: '/workspace', label: 'Workspace Hub', icon: '📁', tag: 'All Content' },
        { href: '/avatars', label: 'Avatars', icon: '👤', tag: 'Voice/Face' },
      ],
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-12 bottom-0 z-40 bg-[#121418] border-r border-white/[0.06] flex flex-col transition-all duration-300 font-sans select-none ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Collapse/Expand Toggle Header */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-white/[0.04]">
        {!collapsed && (
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 font-mono">
            Studio Suite
          </span>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition mx-auto text-xs"
        >
          {collapsed ? '⏩' : '⏪'}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 hide-scrollbar">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-2 text-[10px] font-extrabold tracking-wider text-zinc-500 uppercase font-mono">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition font-medium group ${
                      isActive
                        ? 'bg-purple-600/20 text-white border border-purple-500/30 font-semibold shadow-inner'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">{item.icon}</span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!collapsed && item.tag && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-500 group-hover:text-zinc-300">
                        {item.tag}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Section in Sidebar */}
      <div className="p-2 border-t border-white/[0.06] space-y-1">
        <Link
          href="/pricing"
          className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-amber-300 hover:bg-amber-500/10 font-bold transition"
        >
          <span className="text-base">💎</span>
          {!collapsed && <span>Pricing & Credits</span>}
        </Link>

        {(user?.role === 'super_admin' || user?.permissions?.includes('platform:admin')) && (
          <Link
            href="/admin"
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-purple-300 hover:bg-purple-500/10 font-bold transition"
          >
            <span className="text-base">🛡️</span>
            {!collapsed && <span>Admin Ops</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}
