'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/auth-provider';

const NAV_TABS = [
  { id: 'all', name: 'All Generations', icon: '📁', countKey: 'all' },
  { id: 'starred', name: 'Starred & Favorites', icon: '⭐', countKey: 'starred' },
  { id: 'video', name: 'AI Videos', icon: '🎥', countKey: 'video' },
  { id: 'image', name: 'AI Images', icon: '🖼️', countKey: 'image' },
  { id: 'audio', name: 'Audio & Voices', icon: '🎵', countKey: 'audio' },
];

export default function WorkspaceHubPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Top Level View Switcher: 'projects' vs 'assets'
  const [topView, setTopView] = useState('projects'); // 'projects' | 'assets'

  // Projects State
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [createProjModalOpen, setCreateProjModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjType, setNewProjType] = useState('video'); // 'video' | 'image' | 'timeline' | 'canvas'
  const [creatingProj, setCreatingProj] = useState(false);

  // Assets State
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'credits-high' | 'credits-low'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitleText, setEditTitleText] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Fetch Projects from project-service
  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch('http://localhost:3009/v1/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.warn('[Workspace] Could not fetch projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Fetch unified workspace assets from asset-service
  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3006/v1/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      } else {
        setAssets([]);
      }
    } catch (err) {
      console.warn('[Workspace] Could not fetch assets:', err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    loadAssets();
  }, []);

  // Create Project Submission
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    setCreatingProj(true);
    try {
      const res = await fetch('http://localhost:3009/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjName.trim(),
          description: newProjDesc.trim() || `${newProjType.toUpperCase()} Studio Session`,
          org_id: 'org-cybertech-1',
        }),
      });
      const data = await res.json();
      if (res.ok && data.project) {
        setProjects((prev) => [data.project, ...prev]);
        setCreateProjModalOpen(false);
        setNewProjName('');
        setNewProjDesc('');
        // Redirect to target studio route
        if (newProjType === 'video') router.push(`/video?project_id=${data.project.id}`);
        else if (newProjType === 'image') router.push(`/ai/image?project_id=${data.project.id}`);
        else if (newProjType === 'timeline') router.push(`/editor?project_id=${data.project.id}`);
        else if (newProjType === 'canvas') router.push(`/canvas?project_id=${data.project.id}`);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setCreatingProj(false);
    }
  };

  // Toggle Star / Favorite
  const handleToggleStar = async (e, asset) => {
    e.stopPropagation();
    const newStarred = !asset.starred;

    setAssets((prev) =>
      prev.map((a) => (a.id === asset.id ? { ...a, starred: newStarred } : a))
    );

    try {
      await fetch(`http://localhost:3006/v1/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: newStarred }),
      });
    } catch (err) {
      console.error('Failed to update star state:', err);
      loadAssets();
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (id) => {
    try {
      setAssets((prev) => prev.filter((a) => a.id !== id));
      await fetch(`http://localhost:3006/v1/assets/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete asset:', err);
      loadAssets();
    } finally {
      setDeletingId(null);
    }
  };

  // Save Title Rename
  const handleSaveRename = async (id) => {
    if (!editTitleText.trim()) {
      setEditingId(null);
      return;
    }

    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, name: editTitleText.trim() } : a))
    );
    setEditingId(null);

    try {
      await fetch(`http://localhost:3006/v1/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editTitleText.trim() }),
      });
    } catch (err) {
      console.error('Failed to rename asset:', err);
    }
  };

  // Re-generate trigger
  const handleRegenerate = (asset) => {
    const promptParam = encodeURIComponent(asset.prompt || asset.name);
    if (asset.type === 'video') {
      router.push(`/video?prompt=${promptParam}`);
    } else {
      router.push(`/ai/image?prompt=${promptParam}`);
    }
  };

  // Filtering & Sorting Logic for Assets
  const filteredAssets = assets
    .filter((a) => {
      if (activeTab === 'starred') return Boolean(a.starred);
      if (activeTab === 'video') return a.type === 'video';
      if (activeTab === 'image') return a.type === 'image';
      if (activeTab === 'audio') return a.type === 'audio';
      return true;
    })
    .filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.prompt && a.prompt.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'credits-high') return (b.credits || 0) - (a.credits || 0);
      if (sortBy === 'credits-low') return (a.credits || 0) - (b.credits || 0);
      return 0;
    });

  const counts = {
    all: assets.length,
    starred: assets.filter((a) => a.starred).length,
    video: assets.filter((a) => a.type === 'video').length,
    image: assets.filter((a) => a.type === 'image').length,
    audio: assets.filter((a) => a.type === 'audio').length,
  };

  return (
    <div className="flex-1 bg-[#0b0c0e] text-zinc-100 flex flex-col font-sans min-h-screen">
      
      {/* Top Banner Header */}
      <div className="border-b border-white/[0.08] bg-[#101216]/90 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-purple-900/30">
            🏢
          </div>
          <div>
            <h1 className="text-lg font-black font-grotesk tracking-tight text-white flex items-center gap-2">
              Workspace & Creation Studio Hub
            </h1>
            <p className="text-xs text-zinc-400">
              Manage AI video production sessions, image generation sets, timeline projects, and asset library
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Projects vs Assets) */}
        <div className="flex items-center gap-2 bg-black/50 border border-white/10 p-1 rounded-2xl">
          <button
            onClick={() => setTopView('projects')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold font-grotesk transition flex items-center gap-2 ${
              topView === 'projects'
                ? 'bg-purple-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>📁 Projects & Sessions</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 rounded-md">
              {projects.length}
            </span>
          </button>

          <button
            onClick={() => setTopView('assets')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold font-grotesk transition flex items-center gap-2 ${
              topView === 'assets'
                ? 'bg-purple-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>🖼️ Media & Assets</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/40 rounded-md">
              {assets.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {topView === 'projects' ? (
            <button
              onClick={() => setCreateProjModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5"
            >
              <span>➕ New Project Session</span>
            </button>
          ) : (
            <>
              <Link
                href="/video"
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <span>✨ New Video</span>
              </Link>
              <Link
                href="/ai/image"
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-white/10 transition flex items-center gap-1.5"
              >
                <span>🖼️ New Image</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {topView === 'projects' ? (
        
        /* 📁 PROJECTS & SESSIONS HUB VIEW */
        <div className="flex-1 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white font-grotesk">Active Studio Projects</h2>
              <p className="text-xs text-zinc-400">Dedicated creative sessions for video generation, timeline edits, and canvas graphs</p>
            </div>
            <button
              onClick={() => setCreateProjModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>➕ Create Session</span>
            </button>
          </div>

          {projectsLoading ? (
            <div className="p-16 text-center space-y-3">
              <div className="text-3xl animate-bounce">📁</div>
              <div className="text-xs text-zinc-400 font-mono">Loading studio projects from workspace database...</div>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-16 border border-dashed border-white/10 rounded-3xl text-center space-y-4 max-w-md mx-auto my-12 bg-black/20">
              <div className="text-5xl">🎬</div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-grotesk">No Studio Projects Created Yet</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Create a dedicated Video AI Session, Image Studio Project, or Cinema Timeline to organize your prompts and renders.
                </p>
              </div>
              <button
                onClick={() => setCreateProjModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition"
              >
                Create First Project Session →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="rounded-2xl bg-zinc-900/60 border border-white/[0.08] hover:border-purple-500/50 p-5 space-y-4 transition duration-300 flex flex-col justify-between hover:shadow-xl hover:shadow-purple-900/10 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold uppercase border border-purple-500/30">
                        {proj.description?.includes('Video') ? '🎥 Video AI Project' : '📁 Studio Session'}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(proj.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-white font-grotesk group-hover:text-purple-300 transition">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                      <span>👥 {proj.member_count || 1} Members</span>
                      <span>⚡ Neon Synced</span>
                    </div>

                    <Link
                      href={`/video?project_id=${proj.id}`}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition"
                    >
                      Open Session →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      ) : (

        /* 🖼️ MEDIA & ASSETS LIBRARY VIEW */
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Workspace Panel */}
          <aside className="w-64 border-r border-white/[0.06] bg-[#0f1115] p-4 flex flex-col justify-between hidden md:flex">
            <div className="space-y-6">
              
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-3 mb-2 font-bold">
                  Asset Library
                </div>
                <nav className="space-y-1">
                  {NAV_TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const count = counts[tab.countKey] || 0;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                          isActive
                            ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-base">{tab.icon}</span>
                          <span>{tab.name}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                            isActive ? 'bg-purple-500/30 text-purple-200' : 'bg-black/40 text-zinc-500'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Quick Metrics Widget */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
                <div className="text-[11px] font-bold text-zinc-300 font-grotesk flex items-center justify-between">
                  <span>⚡ Total Usage</span>
                  <span className="text-purple-400 font-mono">
                    {assets.reduce((sum, a) => sum + (a.credits || 15), 0)} cr
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full w-[65%]" />
                </div>
                <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                  <span>Total Items: {assets.length}</span>
                  <span>Cloud Library: Active</span>
                </div>
              </div>

            </div>
          </aside>

          {/* Main Asset Grid */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#0b0c0e]">
            
            {/* Controls Bar: Search + Sort + View Toggle */}
            <div className="p-4 border-b border-white/[0.05] bg-[#111317]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Search Input */}
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search generations by title or prompt..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-xs text-zinc-500 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort & View Controls */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5">
                  <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-xs text-zinc-200 font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="newest" className="bg-zinc-900 text-white">Newest First</option>
                    <option value="oldest" className="bg-zinc-900 text-white">Oldest First</option>
                    <option value="credits-high" className="bg-zinc-900 text-white">Highest Credits</option>
                    <option value="credits-low" className="bg-zinc-900 text-white">Lowest Credits</option>
                  </select>
                </div>

                <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs transition ${
                      viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Grid View"
                  >
                    ▦
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg text-xs transition ${
                      viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                    title="List View"
                  >
                    ☰
                  </button>
                </div>
              </div>
            </div>

            {/* Grid / List View */}
            <div className="flex-1 p-6 overflow-y-auto min-h-0">
              {loading ? (
                <div className="p-16 text-center space-y-3">
                  <div className="text-3xl animate-bounce">⚡</div>
                  <div className="text-xs text-zinc-400 font-mono">Loading your workspace media library...</div>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="p-16 border border-dashed border-white/10 rounded-3xl text-center space-y-4 max-w-md mx-auto my-12 bg-black/20">
                  <div className="text-5xl">📂</div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white font-grotesk">
                      {activeTab === 'starred' ? 'No Starred Assets Yet' : 'No Content in Workspace'}
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {activeTab === 'starred'
                        ? 'Click the star icon on any asset card to save it to your favorites.'
                        : 'All generations created in AI Video or AI Image Studio will automatically persist here.'}
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <Link
                      href="/video"
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition"
                    >
                      Generate Video Clip →
                    </Link>
                  </div>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredAssets.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedAsset(item)}
                      className="group relative rounded-2xl bg-zinc-900/60 border border-white/[0.08] hover:border-purple-500/50 transition duration-300 overflow-hidden flex flex-col justify-between cursor-pointer hover:shadow-xl hover:shadow-purple-900/10"
                    >
                      {/* Media Thumbnail Container with Safe onError Handler */}
                      <div className="relative aspect-video bg-black/80 overflow-hidden flex items-center justify-center">
                        {item.type === 'video' ? (
                          <video
                            src={item.url}
                            muted
                            loop
                            onMouseOver={(e) => e.target.play().catch(() => {})}
                            onMouseOut={(e) => e.target.pause()}
                            onError={(e) => {
                              // Hide broken video player gracefully
                              e.currentTarget.style.display = 'none';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <img
                            src={item.url}
                            alt={item.name}
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        )}

                        <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-mono font-bold text-purple-300 border border-white/10 uppercase tracking-wide">
                          {item.type}
                        </span>

                        <button
                          onClick={(e) => handleToggleStar(e, item)}
                          className={`absolute top-2.5 right-2.5 p-1.5 rounded-xl backdrop-blur-md transition ${
                            item.starred
                              ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                              : 'bg-black/60 text-zinc-400 hover:text-white border border-white/10 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {item.starred ? '⭐' : '☆'}
                        </button>

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-between">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegenerate(item);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] shadow transition"
                          >
                            ⚡ Re-generate
                          </button>

                          <div className="flex items-center gap-1.5">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px]"
                            >
                              📥
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(item.id);
                              }}
                              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 text-[11px]"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-white truncate font-grotesk">{item.name}</h4>
                        </div>
                        {item.prompt && (
                          <p className="text-[10px] text-zinc-400 line-clamp-1 font-mono italic">
                            "{item.prompt}"
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-white/[0.04]">
                          <span className="text-purple-400 font-bold">⚡ {item.credits || 15} cr</span>
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/40 overflow-hidden">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-black/60 text-zinc-400 border-b border-white/[0.06] font-mono text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Asset</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Prompt</th>
                        <th className="py-3 px-4">Credits</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredAssets.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-4 flex items-center gap-3">
                            <span className="font-bold text-white font-grotesk truncate max-w-xs">{item.name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-400 truncate max-w-xs">{item.prompt || '—'}</td>
                          <td className="py-3 px-4 font-mono text-purple-400 font-bold">⚡ {item.credits || 15}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleRegenerate(item)}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold"
                            >
                              Re-generate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* Create Project Modal */}
      {createProjModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14161b] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-sm text-white font-grotesk">➕ Create New Project Session</h3>
              <button onClick={() => setCreateProjModalOpen(false)} className="text-zinc-500 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300 font-grotesk">Project Title</label>
                <input
                  type="text"
                  required
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Cyberpunk Commercial 4K"
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300 font-grotesk">Session Type</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'video', name: '🎥 Video AI Session', desc: 'Veo 3.1 & Kling generation' },
                    { id: 'image', name: '🖼️ Image Studio Set', desc: 'Photorealistic AI images' },
                    { id: 'timeline', name: '🎬 Cinema Timeline', desc: 'Multi-track video editing' },
                    { id: 'canvas', name: '⚡ Node Canvas Graph', desc: 'Visual model workflow' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewProjType(t.id)}
                      className={`p-2.5 rounded-xl border text-left space-y-0.5 transition ${
                        newProjType === t.id
                          ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                          : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px]">{t.name}</div>
                      <div className="text-[9px] text-zinc-500 font-mono">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300 font-grotesk">Description / Objectives</label>
                <textarea
                  rows={2}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Project goal, target specs, references..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCreateProjModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProj}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow"
                >
                  {creatingProj ? 'Creating Project...' : 'Create & Open Session →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14161b] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-xl">⚠️ Confirm Deletion</div>
            <p className="text-xs text-zinc-400">
              Are you sure you want to permanently delete this asset from your workspace library?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAsset(deletingId)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow"
              >
                Delete Asset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
