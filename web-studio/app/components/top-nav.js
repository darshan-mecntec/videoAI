'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from './auth-provider';

export default function TopNav({ onToggleSidebar, sidebarCollapsed }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState('Personal Workspace');

  const workspaces = [
    { id: 'personal', name: 'Personal Workspace', type: 'Personal', icon: '👤', credits: 1250 },
    { id: 'team-ent', name: 'Aether Enterprise Team', type: 'Team Space', icon: '🏢', credits: 50000 },
    { id: 'client-agency', name: 'Agency Client Hub', type: 'Client Space', icon: '🎨', credits: 8400 },
  ];

  const activeWsObj = workspaces.find((w) => w.name === currentWorkspace) || workspaces[0];

  return (
    <div
      id="header"
      className="sticky top-0 z-50 bg-[#0f1113] border-b border-white/[0.06] backdrop-blur-md px-4 font-sans select-none h-12 flex items-center"
    >
      <header id="header-visual" className="h-full w-full flex items-center justify-between gap-3 mx-auto">
        
        {/* Left: Sidebar Toggle + Brand Logo + Workspace Switcher */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            title={sidebarCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition flex items-center gap-1 text-xs"
          >
            <span>☰</span>
          </button>

          <Link href="/" className="inline-flex items-center gap-2 shrink-0 group">
            <span role="img" aria-label="Aether Studio" className="text-white flex items-center gap-1.5">
              <svg className="w-5 h-5 text-purple-400" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
                <path d="M10 2L13 8L19 9L14.5 13.5L16 19.5L10 16L4 19.5L5.5 13.5L1 9L7 8L10 2Z" fill="currentColor"></path>
              </svg>
            </span>
            <span className="font-grotesk font-extrabold text-sm tracking-tight text-white hidden sm:inline">
              Aether Studio
            </span>
          </Link>

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          {/* Workspace Switcher (HeyGen/Canva/Runway Industry Standard) */}
          <div className="relative">
            <button
              onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white transition font-medium"
            >
              <span>{activeWsObj.icon}</span>
              <span className="truncate max-w-[140px] font-grotesk">{activeWsObj.name}</span>
              <span className="text-[10px] text-zinc-400">▼</span>
            </button>

            {workspaceMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-[#16181c] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider font-mono">
                  Switch Workspace
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setCurrentWorkspace(ws.name);
                      setWorkspaceMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition ${
                      ws.name === currentWorkspace
                        ? 'bg-purple-600/20 border border-purple-500/30 text-white font-bold'
                        : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{ws.icon}</span>
                      <div className="truncate">
                        <div className="truncate font-medium">{ws.name}</div>
                        <div className="text-[9px] text-zinc-500 font-mono">{ws.type}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-purple-400 font-mono font-bold shrink-0">
                      ⚡ {ws.credits}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Credit Badge, Admin, User Profile */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Live Credit Badge */}
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 transition text-xs font-bold font-mono"
          >
            <span>⚡</span>
            <span>{user?.credits || activeWsObj.credits} Credits</span>
          </Link>

          {(user?.role === 'super_admin' || user?.permissions?.includes('platform:admin')) && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 transition text-xs font-bold font-grotesk hidden md:flex"
            >
              <span>🛡️ Admin</span>
            </Link>
          )}

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                  {user.name ? user.name[0] : 'U'}
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#16181c] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1">
                  <div className="px-3 py-2 border-b border-white/5 space-y-0.5">
                    <div className="font-bold text-white font-grotesk">{user.name || 'User'}</div>
                    <div className="text-[10px] text-zinc-400 font-mono truncate">{user.email}</div>
                    <div className="text-[10px] text-purple-400 font-mono font-bold">⚡ {user.credits || 1250} Credits</div>
                  </div>

                  <Link href="/workspace" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-white/5 text-zinc-300 font-medium">
                    📁 Workspace Hub
                  </Link>
                  <Link href="/avatars" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-white/5 text-zinc-300 font-medium">
                    👤 Manage Avatars
                  </Link>
                  <Link href="/pricing" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-white/5 text-zinc-300 font-medium">
                    💎 Pricing & Subscriptions
                  </Link>
                  {(user?.role === 'super_admin' || user?.permissions?.includes('platform:admin')) && (
                    <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-purple-500/10 text-purple-300 font-medium">
                      🛡️ Admin Operations
                    </Link>
                  )}
                  <button onClick={() => { setUserMenuOpen(false); logout(); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 font-medium transition">
                    🚪 Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-xs text-zinc-300 hover:text-white px-2.5 py-1 rounded-xl hover:bg-white/5 transition font-medium">
                Login
              </Link>
              <Link href="/signup" className="text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold px-3.5 py-1.5 rounded-xl shadow-md transition">
                Sign up
              </Link>
            </div>
          )}
        </div>

      </header>
    </div>
  );
}
