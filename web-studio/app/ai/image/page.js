'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../components/auth-provider';

const AI_IMAGE_MODELS = [
  { id: 'nano-pro', name: 'Google Nano Banana Pro', tag: 'Fastest 4K', desc: 'Precision object placement & photorealistic lighting' },
  { id: 'flux-2', name: 'FLUX 2.0', tag: 'Photorealistic', desc: 'Black Forest Labs state-of-the-art realistic rendering' },
  { id: 'gpt-img-2', name: 'GPT Image 2.0', tag: 'Typography', desc: 'Near-perfect text rendering, logos & branding' },
  { id: 'seedream-5', name: 'Seedream 5.0', tag: 'Character Art', desc: 'Hyper-detailed environment & character design' },
  { id: 'midjourney-soul', name: 'Midjourney Soul Engine', tag: 'Filmic LUTs', desc: 'Cinematic 35mm lighting & color grading' },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9 Landscape' },
  { id: '9:16', label: '9:16 Portrait' },
  { id: '1:1', label: '1:1 Square' },
  { id: '4:3', label: '4:3 Standard' },
  { id: '3:2', label: '3:2 DSLR' },
  { id: '21:9', label: '21:9 Ultra-Wide' },
];

const STYLE_PRESETS = [
  { id: 'photo', label: '📸 Photorealistic 8K DSLR' },
  { id: 'cinematic', label: '🎬 Cinematic Volumetric Light' },
  { id: 'portrait', label: '🎭 Studio Portrait' },
  { id: 'arch', label: '🏛️ Architectural Render' },
  { id: 'cyberpunk', label: '👾 Cyberpunk Neon Glow' },
  { id: 'digital_art', label: '🎨 Digital Concept Art' },
  { id: 'anime', label: '🎌 Anime Studio Style' },
  { id: 'product', label: '🛍️ Commercial Product Shot' },
];

export default function AIImageStudioPage() {
  const { user } = useAuth();

  const [prompt, setPrompt] = useState('Editorial fashion portrait of Gloria in a neon rain-slicked Cyberpunk Tokyo street, 8k resolution');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('nano-pro');
  const [selectedStyle, setSelectedStyle] = useState('photo');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [qualityTier, setQualityTier] = useState('standard');
  const [variationsCount, setVariationsCount] = useState(1);
  const [seed, setSeed] = useState('-1');

  const [referenceImages, setReferenceImages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [galleryResults, setGalleryResults] = useState([]);

  // Upload reference image for style / face lock
  const handleUploadRefImage = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('http://localhost:3006/v1/assets/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        const url = data.asset?.url || URL.createObjectURL(file);
        setReferenceImages((prev) => [...prev, url]);
      } catch {
        setReferenceImages((prev) => [...prev, URL.createObjectURL(file)]);
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setGenerating(true);

    try {
      // 1. Credit cost calculation based on quality & variations
      const baseCost = qualityTier === 'ultra' ? 50 : qualityTier === 'hd' ? 25 : 15;
      const totalCost = baseCost * variationsCount;

      const userId = user?.id || 'usr-guest-1';
      await fetch('http://localhost:3008/v1/credits/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, modelId: selectedModel, units: totalCost }),
      }).catch(() => {});

      // Simulate AI generation pipeline latency
      setTimeout(() => {
        setGenerating(false);
        const newResults = Array.from({ length: variationsCount }).map((_, idx) => ({
          id: `img-${Date.now()}-${idx}`,
          url: `https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop&q=80`,
          prompt,
          model: AI_IMAGE_MODELS.find((m) => m.id === selectedModel)?.name || 'Google Nano Banana Pro',
          style: STYLE_PRESETS.find((s) => s.id === selectedStyle)?.label,
          aspectRatio,
          cost: totalCost / variationsCount,
        }));

        setGalleryResults((prev) => [...newResults, ...prev]);
      }, 1500);
    } catch {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full bg-[#08090b] py-6 px-4 sm:px-6 text-zinc-100 font-sans max-w-7xl mx-auto space-y-6">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
            🖼️
          </div>
          <div>
            <h1 className="text-xl font-bold font-grotesk text-white tracking-wide">
              AI Image Studio
            </h1>
            <p className="text-xs text-zinc-400">
              Photorealistic character & scene generator inspired by Midjourney v6 & Flux 1.0
            </p>
          </div>
        </div>

        <Link
          href="/cinema-studio"
          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 transition"
        >
          🎬 Scene Builder
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">

          {/* Reference Image Section */}
          <div className="bg-[#111318] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-300 uppercase tracking-wider font-grotesk">
              <span>STYLE / CHARACTER REFERENCE IMAGE</span>
              <label className="text-[10px] text-cyan-400 hover:underline cursor-pointer font-mono font-bold">
                + Upload Reference
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadRefImage} />
              </label>
            </div>

            {referenceImages.length > 0 ? (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {referenceImages.map((url, idx) => (
                  <div key={idx} className="w-16 h-16 rounded-xl bg-black border border-white/10 overflow-hidden relative shrink-0">
                    <img src={url} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setReferenceImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 text-rose-400 text-[10px] font-bold flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-zinc-500 font-mono">
                Optional: Upload reference image to guide character identity or art style.
              </div>
            )}
          </div>

          {/* Prompt Input Box */}
          <div className="bg-[#111318] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-300 uppercase tracking-wider font-grotesk">
              <span>PROMPT DEFINITION</span>
              <span className="text-[10px] text-cyan-400 font-mono">PROMPT ENHANCER ACTIVE</span>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 resize-none font-sans"
              placeholder="Describe your visual concept in detail..."
            />

            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Negative prompt (e.g. blur, bad proportions, distortion)..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 font-sans"
            />
          </div>

          {/* AI Model Selector */}
          <div className="bg-[#111318] border border-white/10 rounded-2xl p-4 space-y-2 shadow-xl">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block font-grotesk">
              AI MODEL ENGINE
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 font-grotesk font-bold"
            >
              {AI_IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#111318] text-white">
                  ✨ {m.name} — {m.tag} ({m.desc})
                </option>
              ))}
            </select>
          </div>

          {/* Style Presets Chips */}
          <div className="bg-[#111318] border border-white/10 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-grotesk">
              ART DIRECTION & STYLE PRESETS
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STYLE_PRESETS.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStyle(st.id)}
                  className={`p-2.5 rounded-xl border text-left text-[11px] font-bold transition ${
                    selectedStyle === st.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10'
                      : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parameters Grid (Aspect, Quality, Variations, Seed) */}
          <div className="bg-[#111318] border border-white/10 rounded-2xl p-4 space-y-4 shadow-xl">
            <div className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-grotesk">
              GENERATION PARAMETERS
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              
              <div className="space-y-1">
                <label className="text-zinc-400 text-[11px] font-bold">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-bold"
                >
                  {ASPECT_RATIOS.map((ar) => (
                    <option key={ar.id} value={ar.id} className="bg-[#111318] text-white">
                      📐 {ar.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 text-[11px] font-bold">Quality Tier</label>
                <select
                  value={qualityTier}
                  onChange={(e) => setQualityTier(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-bold"
                >
                  <option value="standard" className="bg-[#111318]">Standard (15 Cr)</option>
                  <option value="hd" className="bg-[#111318]">HD 4K (25 Cr)</option>
                  <option value="ultra" className="bg-[#111318]">Ultra 8K (50 Cr)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 text-[11px] font-bold">Variations</label>
                <select
                  value={variationsCount}
                  onChange={(e) => setVariationsCount(parseInt(e.target.value, 10))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-bold"
                >
                  <option value={1} className="bg-[#111318]">1 Image</option>
                  <option value={2} className="bg-[#111318]">2 Variations</option>
                  <option value={4} className="bg-[#111318]">4 Grid Batch</option>
                </select>
              </div>

            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 text-[11px] font-bold">Consistency Seed (-1 Random)</label>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          {/* Action CTA */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Synthesizing Image Canvas...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Generate Image ({qualityTier === 'ultra' ? 50 : qualityTier === 'hd' ? 25 : 15} Credits)</span>
              </>
            )}
          </button>

        </div>

        {/* Right Output Gallery (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">

          <div className="bg-[#111318] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-grotesk">
                Rendered Image Gallery
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                {generating ? 'PROCESSING' : `${galleryResults.length} OUTPUTS`}
              </span>
            </div>

            {generating ? (
              <div className="aspect-video rounded-xl bg-black/60 border border-white/10 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <div className="text-xs font-bold text-white">Rendering 8K Image...</div>
              </div>
            ) : galleryResults.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 max-h-[700px] overflow-y-auto pr-1">
                {galleryResults.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="aspect-video rounded-xl bg-black border border-white/10 overflow-hidden relative group">
                      <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black text-white text-[10px] font-bold border border-white/20 transition"
                      >
                        ⬇ Download 8K
                      </a>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] space-y-1 font-mono">
                      <div className="text-cyan-300 font-bold">{item.model} — {item.style}</div>
                      <div className="text-zinc-400 line-clamp-2">{item.prompt}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-black/60 border border-white/10 flex flex-col items-center justify-center gap-2 p-6 text-center text-zinc-500">
                <div className="text-3xl opacity-40">🖼️</div>
                <div className="text-xs font-medium">Rendered image outputs will appear here</div>
                <div className="text-[10px] font-mono opacity-60">Configure settings and click Generate Image.</div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
