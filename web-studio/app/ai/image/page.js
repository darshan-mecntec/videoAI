'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../components/auth-provider';
import AuthGuard from '../../components/auth-guard';

const DEFAULT_IMAGE_MODELS = [
  { id: 'imagen-3-ultra', name: 'Google Imagen 3 Ultra', tag: 'Fastest 4K (Gemini)' },
  { id: 'dall-e-3-hd', name: 'OpenAI DALL-E 3 HD', tag: 'High-Definition' },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9 Landscape' },
  { id: '9:16', label: '9:16 Portrait' },
  { id: '1:1', label: '1:1 Square' },
  { id: '4:3', label: '4:3 Standard' },
  { id: '21:9', label: '21:9 Ultra-Wide' },
];

const STYLE_PRESETS = [
  { id: 'photo', label: '📸 Photorealistic DSLR' },
  { id: 'cinematic', label: '🎬 Cinematic Lighting' },
  { id: 'portrait', label: '🎭 Studio Portrait' },
  { id: 'arch', label: '🏛️ Architectural Render' },
  { id: 'cyberpunk', label: '👾 Cyberpunk Neon' },
  { id: 'product', label: '🛍️ Commercial Product' },
];

export default function AIImageStudioPage() {
  const { user } = useAuth();

  const [models, setModels] = useState(DEFAULT_IMAGE_MODELS);
  const [prompt, setPrompt] = useState('Editorial fashion portrait in a neon rain-slicked Cyberpunk Tokyo street, 8k resolution');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('imagen-3-ultra');
  const [selectedStyle, setSelectedStyle] = useState('photo');

  useEffect(() => {
    fetch('http://localhost:3001/v1/models?modality=text-to-image')
      .then((r) => r.json())
      .then((data) => {
        if (data.models && data.models.length > 0) {
          const mapped = data.models.map((m) => ({
            id: m.id,
            name: m.display_name,
            tag: `${m.credits_per_unit} cr / img`,
          }));
          setModels(mapped);
          setSelectedModel(mapped[0].id);
        }
      })
      .catch(() => {});
  }, []);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [qualityTier, setQualityTier] = useState('standard');
  const [variationsCount, setVariationsCount] = useState(1);
  const [seed, setSeed] = useState('-1');

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [referenceImages, setReferenceImages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [galleryResults, setGalleryResults] = useState([]);

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
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          aspectRatio,
          qualityTier,
          variationsCount,
          userId: user?.id || 'usr-admin-1',
          style: selectedStyle,
        }),
      });

      const data = await res.json();
      setGenerating(false);

      if (data.success && data.images) {
        setGalleryResults((prev) => [...data.images, ...prev]);

        // Register generated image to asset-service
        fetch('http://localhost:3006/v1/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `AI Image - ${prompt.slice(0, 30)}...`,
            type: 'image',
            url: data.images[0].url,
            metadata: { prompt, provider: selectedModel },
          }),
        }).catch(() => {});
      } else {
        alert(data.error || 'Failed to generate image');
      }
    } catch (err) {
      setGenerating(false);
      alert(err.message || 'Error communicating with AI image generator server');
    }
  };

  const calculatedCost = (qualityTier === 'ultra' ? 50 : qualityTier === 'hd' ? 25 : 15) * variationsCount;

  return (
    <AuthGuard>
      <div className="flex-1 bg-[#090a0d] text-zinc-100 flex flex-col font-sans min-h-screen">
      
      {/* Sleek Minimal Header */}
      <header className="border-b border-white/[0.06] bg-[#0e0f13]/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold shadow-md shadow-cyan-900/20">
            🖼️
          </div>
          <div>
            <h1 className="text-sm font-bold font-grotesk tracking-tight text-white flex items-center gap-2">
              AI Image Creation Studio
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                Midjourney & FLUX 2.0
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-bold text-cyan-400">
            ⚡ {calculatedCost} Credits
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Rendering Image...</span>
              </>
            ) : (
              <>
                <span>🎨 Generate Renders</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Studio Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Compact Controls Drawer (400px) */}
        <aside className="w-full lg:w-[400px] border-r border-white/[0.06] bg-[#0c0d11] p-5 flex flex-col justify-between overflow-y-auto space-y-5">
          <div className="space-y-4">
            
            {/* Prompt Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  Prompt
                </label>
                <span className="text-[10px] text-cyan-400 font-mono">{prompt.length} chars</span>
              </div>

              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe subject, mood, composition, lighting, camera lens..."
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 font-mono resize-none leading-relaxed"
              />
            </div>

            {/* Model Engine Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">AI Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold focus:outline-none"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#14161b]">
                    {m.name} ({m.tag})
                  </option>
                ))}
              </select>
            </div>

            {/* Style Presets Select Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Style Preset
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500 font-grotesk"
              >
                {STYLE_PRESETS.map((st) => (
                  <option key={st.id} value={st.id} className="bg-[#14161b]">
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Aspect Ratio & Variations */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white font-mono"
                >
                  {ASPECT_RATIOS.map((ar) => (
                    <option key={ar.id} value={ar.id} className="bg-[#14161b]">
                      {ar.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Batch Size</label>
                <select
                  value={variationsCount}
                  onChange={(e) => setVariationsCount(parseInt(e.target.value, 10))}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white font-mono"
                >
                  <option value={1} className="bg-[#14161b]">1 Image</option>
                  <option value={2} className="bg-[#14161b]">2 Images</option>
                  <option value={4} className="bg-[#14161b]">4 Batch Images</option>
                </select>
              </div>
            </div>

            {/* Collapsible Advanced Settings Drawer */}
            <div className="border-t border-white/[0.06] pt-2">
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-zinc-300 font-grotesk hover:text-white transition"
              >
                <span className="flex items-center gap-1.5">
                  <span>⚙️</span> Advanced Options & References
                </span>
                <span className="text-[10px] text-zinc-500">{advancedOpen ? '▲ Hide' : '▼ Expand'}</span>
              </button>

              {advancedOpen && (
                <div className="space-y-3 pt-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-mono">Negative Prompt</label>
                    <input
                      type="text"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="blurry, distorted, low quality, artifacts..."
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                      <span>Style Reference Image</span>
                      <label className="text-cyan-400 hover:underline cursor-pointer">
                        + Upload
                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadRefImage} />
                      </label>
                    </div>

                    {referenceImages.length > 0 && (
                      <div className="flex gap-2 pb-1">
                        {referenceImages.map((url, idx) => (
                          <div key={idx} className="w-12 h-12 rounded-lg overflow-hidden border border-white/20 relative">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="pt-3 border-t border-white/[0.06] text-[10px] text-zinc-500 font-mono flex items-center justify-between">
            <span>Engine: Midjourney / FLUX</span>
            <span>Ultra 8K Render</span>
          </div>
        </aside>

        {/* Right Side: Main Expansive Output Viewport Stage */}
        <main className="flex-1 bg-[#060709] p-6 flex flex-col justify-between overflow-y-auto min-h-[500px]">
          <div className="space-y-4 max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
                <span>🖼️</span> Generated Image Renders
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">{galleryResults.length} Items</span>
            </div>

            {galleryResults.length === 0 ? (
              <div className="p-16 border border-dashed border-white/10 rounded-3xl text-center space-y-3 bg-black/20 my-12">
                <div className="w-16 h-16 rounded-3xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-3xl mx-auto">
                  🎨
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white font-grotesk">Ready to Render Photorealistic Images</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                    Enter your prompt on the left panel and click <strong className="text-cyan-400">Generate Renders</strong> to synthesize with FLUX 2.0 or Midjourney.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {galleryResults.map((item) => (
                  <div key={item.id} className="group relative rounded-2xl bg-zinc-900/60 border border-white/[0.08] hover:border-cyan-500/50 transition duration-300 overflow-hidden flex flex-col justify-between shadow-lg">
                    <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                      <img src={item.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition p-3 flex flex-col justify-between">
                        <span className="text-[10px] font-mono bg-black/80 px-2 py-0.5 rounded text-cyan-300 w-fit">
                          {item.model}
                        </span>

                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white text-[10px] font-bold shadow"
                          >
                            Download 4K 📥
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 space-y-1">
                      <p className="text-xs text-zinc-300 font-mono line-clamp-1 italic">"{item.prompt}"</p>
                      <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                        <span>{item.style}</span>
                        <span className="text-cyan-400 font-bold">⚡ {item.cost} cr</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

      </div>
      </div>
    </AuthGuard>
  );
}
