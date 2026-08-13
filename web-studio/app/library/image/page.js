'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AssetLibraryPage() {
  const [assets, setAssets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/assets')
      .then((res) => res.json())
      .then((data) => {
        setAssets(data.assets || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredAssets = assets.filter((ast) => filter === 'all' || ast.type === filter);

  return (
    <div className="flex-1 bg-[#0f1113] p-4 sm:p-8 text-zinc-100 font-sans max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-grotesk tracking-tight uppercase">
            My Asset Library
          </h1>
          <p className="text-xs text-zinc-400">
            All your generated images, videos, Soul ID characters, and audio files
          </p>
        </div>

        <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5 text-xs font-grotesk">
          {['all', 'image', 'video', 'audio'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg uppercase font-bold transition ${
                filter === f ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs text-zinc-400 font-mono">Loading your library assets...</div>
        </div>
      ) : filteredAssets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredAssets.map((ast) => (
            <div key={ast.id} className="bg-[#16181c] border border-white/10 rounded-2xl overflow-hidden shadow-xl p-4 space-y-3">
              <div className="aspect-video bg-zinc-950 rounded-xl overflow-hidden relative">
                {ast.type === 'video' ? (
                  <video src={ast.url} controls autoPlay loop className="w-full h-full object-cover" />
                ) : (
                  <img src={ast.url} alt={ast.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-purple-300 font-bold border border-white/10 uppercase">
                  {ast.model}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-white font-grotesk">{ast.title || ast.prompt}</div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {new Date(ast.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-zinc-500 space-y-3">
          <div className="text-4xl opacity-30">📁</div>
          <div className="text-xs font-medium">No assets found in this category</div>
          <Link
            href="/ai/video"
            className="inline-block px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold"
          >
            Generate Video Now →
          </Link>
        </div>
      )}
    </div>
  );
}
