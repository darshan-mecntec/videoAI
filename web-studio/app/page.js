'use client';

import Link from 'next/link';

const HERO_ANNOUNCEMENTS = [
  {
    id: 'a1',
    title: 'Wan 2.6 Native Audio & Lip-Sync',
    desc: 'Generate 1080p native audio videos with full dialogue lip-syncing',
    poster: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    href: '/ai/video?model=wan-2-6',
  },
  {
    id: 'a2',
    title: 'Google Veo 3.1 Flow Extend',
    desc: 'Seamlessly extend video scenes with last-frame continuity',
    poster: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop&q=80',
    href: '/ai/video?model=veo-3-1',
  },
  {
    id: 'a3',
    title: 'Nano Banana Pro & Soul 2.0',
    desc: 'Photorealistic character face locking and 4K image rendering',
    poster: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    href: '/ai/image?model=nano-banana-pro',
  },
  {
    id: 'a4',
    title: 'Cinema Studio 3.5 — AI Director',
    desc: 'Direct camera rigs, lens optics, and lighting LUT presets',
    poster: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80',
    href: '/cinema-studio',
  },
];

const PROMO_TILES = [
  { name: 'Wan 2.6 Native Audio', desc: 'Lip-sync dialogue generation', badge: 'New', status: 'Video', href: '/ai/video?model=wan-2-6' },
  { name: 'Google Veo 3.1 Flow', desc: 'Long video scene continuation', status: 'Flow', href: '/ai/video?model=veo-3-1' },
  { name: 'Nano Banana Pro', desc: 'Precision image editing & optics', status: 'Image', href: '/ai/image?model=nano-banana-pro' },
  { name: 'Soul 2.0 Identity Lock', desc: 'Lock character face across scenes', status: 'Soul ID', href: '/character' },
  { name: 'Cinema Studio 3.5', desc: 'Create cinematic scenes effortlessly', status: 'Studio', href: '/cinema-studio' },
  { name: 'Media Canvas', desc: 'Drag-and-drop node workflow stage', status: 'Canvas', href: '/canvas' },
];

const VIRAL_PRESETS = [
  'EARTH ZOOM', 'MIGHTY FIGHTER', 'FAIRYTALE CASTLE', 'MOONWALK', 'SKETCH TO FABRIC', 'FLOAT SPIN', 'STICKER PEEL', 'SELFIE TWIN', 'CARDBOARD CUTOUT', 'ORBIT 360', 'ELEVATE'
];

export default function ExploreHomePage() {
  return (
    <div className="flex-1 bg-[#0f1113] p-4 sm:p-6 space-y-8 max-w-[1400px] mx-auto w-full text-zinc-100 font-sans">
      
      {/* Top Section Horizontal Carousel */}
      <section className="relative overflow-x-auto hide-scrollbar">
        <div className="flex gap-4 min-w-max pb-2">
          {HERO_ANNOUNCEMENTS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group w-[320px] sm:w-[380px] shrink-0 rounded-2xl bg-[#1c1e21] border border-white/10 overflow-hidden shadow-xl hover:border-purple-500/50 transition duration-300 flex flex-col justify-between"
            >
              <div className="relative aspect-[16/9] bg-zinc-950 overflow-hidden">
                <img
                  src={item.poster}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c1e21] via-transparent to-transparent opacity-80" />
              </div>
              <div className="p-4 space-y-1">
                <h3 className="font-grotesk font-bold text-sm text-white group-hover:text-purple-300 transition">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Grid Section: Creation Suites & Models */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-grotesk text-white uppercase tracking-wider flex items-center gap-2">
            <span>🚀</span> Creation Suites & AI Engines
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROMO_TILES.map((tile, i) => (
            <Link
              key={i}
              href={tile.href}
              className="group p-4 rounded-2xl bg-[#16181c] border border-white/10 hover:border-purple-500/50 transition duration-200 flex flex-col justify-between space-y-3 shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-grotesk font-bold text-sm text-white group-hover:text-purple-300 transition">
                    {tile.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{tile.desc}</p>
                </div>
                {tile.badge && (
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                    {tile.badge}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono text-zinc-400">
                <span>{tile.status}</span>
                <span className="text-purple-400 font-bold group-hover:translate-x-1 transition">Launch →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Camera Motion & Viral Presets */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold font-grotesk text-white uppercase tracking-wider flex items-center gap-2">
          <span>🎬</span> Camera Motion & Preset FX
        </h2>

        <div className="flex flex-wrap gap-2">
          {VIRAL_PRESETS.map((preset, idx) => (
            <Link
              key={idx}
              href={`/ai/video?preset=${encodeURIComponent(preset)}`}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold font-grotesk text-zinc-300 hover:text-white transition"
            >
              🔥 {preset}
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
