'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/auth-provider';

const CATEGORIES = [
  { id: 'all', name: 'All Content', icon: '📁' },
  { id: 'image', name: 'Images', icon: '🖼️' },
  { id: 'video', name: 'Videos', icon: '🎥' },
  { id: 'real-estate', name: 'Real Estate Tours', icon: '🏡' },
  { id: 'avatar', name: 'Avatars & Voices', icon: '👤' },
  { id: 'canvas', name: 'Canvas Workflows', icon: '⚡' },
];

export default function WorkspaceHubPage() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch unified workspace assets from asset-service, video-service, and avatar-service
    Promise.all([
      fetch('http://localhost:3006/v1/assets').then((r) => r.json()).catch(() => ({ assets: [] })),
      fetch('http://localhost:3011/v1/video/jobs').then((r) => r.json()).catch(() => ({ jobs: [] })),
      fetch('http://localhost:3014/v1/avatars').then((r) => r.json()).catch(() => ({ avatars: [] })),
    ]).then(([astData, vidData, avData]) => {
      const combined = [];

      // Add asset-service items
      if (astData.assets) {
        astData.assets.forEach((a) => {
          combined.push({
            id: a.id || a.asset_id,
            title: a.filename || a.name || 'Generated Asset',
            type: a.type || 'image',
            url: a.url,
            createdAt: a.createdAt || new Date().toISOString(),
            credits: a.credits || 15,
          });
        });
      }

      // Add video jobs
      if (vidData.jobs) {
        vidData.jobs.forEach((v) => {
          if (v.output_url) {
            combined.push({
              id: v.job_id,
              title: v.prompt || 'Generated Video Clip',
              type: v.stage === 'virtual-tour' ? 'real-estate' : 'video',
              url: v.output_url,
              createdAt: v.created_at || new Date().toISOString(),
              credits: 100,
            });
          }
        });
      }

      // Add avatars
      if (avData.avatars) {
        avData.avatars.forEach((av) => {
          combined.push({
            id: av.id,
            title: av.name,
            type: 'avatar',
            url: av.preview_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
            createdAt: new Date().toISOString(),
            credits: 50,
          });
        });
      }

      setAssets(combined);
      setLoading(false);
    });
  }, []);

  const filteredAssets = assets.filter((ast) => {
    const matchesCategory = activeCategory === 'all' || ast.type === activeCategory;
    const matchesSearch =
      !searchQuery || ast.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 bg-[#0f1113] text-zinc-100 flex flex-col font-sans">
      
      {/* Top Banner */}
      <div className="border-b border-white/[0.06] bg-[#121418] px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold font-grotesk tracking-tight text-white flex items-center gap-2">
            <span>📁</span> Workspace Content Hub
          </h1>
          <p className="text-xs text-zinc-400">
            Central repository for all generated images, videos, avatar presenter clips, and project assets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/video"
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            <span>+ Create New</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-6 space-y-4 border-b border-white/[0.04]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/10 overflow-x-auto hide-scrollbar w-full sm:w-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-64 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content by title..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 p-6 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500 font-mono animate-pulse">
            ⏳ Loading workspace assets...
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-16 border border-dashed border-white/10 rounded-2xl text-center space-y-3">
            <div className="text-4xl">📂</div>
            <div className="text-sm font-bold text-zinc-300">No Content Found in Workspace</div>
            <div className="text-xs text-zinc-500 max-w-sm mx-auto">
              Generations created in AI Image, AI Video, Real Estate Studio, or Scene Builder will automatically sync here.
            </div>
            <div className="pt-2">
              <Link
                href="/video"
                className="inline-block px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
              >
                Generate First Video Clip →
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAssets.map((item) => (
              <div
                key={item.id}
                className="group rounded-2xl bg-black/40 border border-white/10 overflow-hidden hover:border-purple-500/50 transition flex flex-col justify-between"
              >
                {/* Media Container */}
                <div className="relative aspect-video bg-black/60 overflow-hidden flex items-center justify-center">
                  {item.type === 'video' || item.type === 'real-estate' ? (
                    <video
                      src={item.url}
                      controls
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  )}

                  <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold text-purple-300 border border-white/10 uppercase">
                    {item.type}
                  </span>
                </div>

                {/* Info Bar */}
                <div className="p-3.5 space-y-2">
                  <div className="font-bold text-xs text-white truncate font-grotesk">{item.title}</div>
                  
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span>⚡ {item.credits} cr</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-purple-400 font-mono font-bold hover:underline"
                    >
                      Download 📥
                    </a>
                    <button
                      onClick={() => navigator.clipboard.writeText(item.url)}
                      className="text-[11px] text-zinc-400 hover:text-white font-mono"
                    >
                      Copy Link 🔗
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
