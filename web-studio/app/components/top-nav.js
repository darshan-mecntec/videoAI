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
  const [workspaces, setWorkspaces] = useState([
    { id: 'personal', name: 'Personal Workspace', type: 'Personal', icon: '👤', credits: user?.credits || 1250 },
  ]);

  useEffect(() => {
    fetch('http://localhost:3009/v1/projects')
      .then((res) => res.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          const mapped = data.projects.map((p) => ({
            id: p.id,
            name: p.name,
            type: p.description || 'Project Workspace',
            icon: '📁',
            credits: user?.credits || 1250,
          }));
          setWorkspaces([
            { id: 'personal', name: 'Personal Workspace', type: 'Personal', icon: '👤', credits: user?.credits || 1250 },
            ...mapped,
          ]);
        }
      })
      .catch(() => {});
  }, [user]);

  const activeWsObj = workspaces.find((w) => w.name === currentWorkspace) || workspaces[0];

  const [createWsModalOpen, setCreateWsModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setCreatingWs(true);
    try {
      const res = await fetch('http://localhost:3009/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWsName.trim(),
          description: newWsDesc.trim() || 'Custom Workspace',
          org_id: 'org-cybertech-1',
        }),
      });
      const data = await res.json();
      if (res.ok && data.project) {
        const newWs = {
          id: data.project.id,
          name: data.project.name,
          type: data.project.description || 'Custom Workspace',
          icon: '📁',
          credits: user?.credits || 1250,
        };
        setWorkspaces((prev) => [...prev, newWs]);
        setCurrentWorkspace(newWs.name);
        setNewWsName('');
        setNewWsDesc('');
        setCreateWsModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to create workspace:', err);
    } finally {
      setCreatingWs(false);
    }
  };

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

          {/* Workspace Switcher */}
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
                  </button>
                ))}

                <div className="pt-1 border-t border-white/10">
                  <button
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      setCreateWsModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold transition flex items-center gap-2 text-xs"
                  >
                    <span>➕</span>
                    <span>Create New Workspace</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Workspace Modal */}
        {createWsModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#14161b] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-extrabold text-sm text-white font-grotesk">🏢 Create New Workspace</h3>
                <button onClick={() => setCreateWsModalOpen(false)} className="text-zinc-500 hover:text-white text-xs">✕</button>
              </div>

              <form onSubmit={handleCreateWorkspace} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-300 font-grotesk">Workspace Name</label>
                  <input
                    type="text"
                    required
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="e.g. Acme Marketing Studio"
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-300 font-grotesk">Workspace Description</label>
                  <input
                    type="text"
                    value={newWsDesc}
                    onChange={(e) => setNewWsDesc(e.target.value)}
                    placeholder="e.g. Dedicated video AI campaign workspace"
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateWsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingWs}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow"
                  >
                    {creatingWs ? 'Creating...' : 'Create Workspace'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Right Actions: Credit Badge, Admin, User Profile */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Live Credit Badge */}
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 transition text-xs font-bold font-mono"
          >
            <span>⚡</span>
            <span>{user?.credits !== undefined ? user.credits : 1250} Credits</span>
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
