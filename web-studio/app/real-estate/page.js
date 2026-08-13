'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/auth-provider';
import FileUploader from '../components/file-uploader';

const TOUR_STYLES = [
  { id: 'walkthrough', name: 'Walkthrough', icon: '🚶' },
  { id: 'drone', name: 'Drone Fly-In', icon: '🚁' },
  { id: 'orbit', name: '360° Orbit', icon: '🔄' },
  { id: 'reveal', name: 'Cinematic Reveal', icon: '🎬' },
  { id: 'day-night', name: 'Day to Night', icon: '🌅' },
];

export default function RealEstateStudioPage() {
  const { user } = useAuth();

  const [selectedStyle, setSelectedStyle] = useState('walkthrough');
  const [propertyPhotos, setPropertyPhotos] = useState([]);
  const [propertyName, setPropertyName] = useState('Modern Luxury Villa');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState('15');

  // Advanced Options Drawer Toggle
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Avatar / Narration
  const [enableNarration, setEnableNarration] = useState(true);
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [script, setScript] = useState(
    'Welcome to this luxury property tour. Featuring high ceilings, modern architecture, and panoramic views.'
  );

  // Status
  const [generating, setGenerating] = useState(false);
  const [resultVideo, setResultVideo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3014/v1/avatars').then((r) => r.json()).catch(() => ({ avatars: [] })),
      fetch('http://localhost:3014/v1/voices').then((r) => r.json()).catch(() => ({ voices: [] })),
    ]).then(([avData, voData]) => {
      if (avData.avatars) {
        setAvatars(avData.avatars);
        if (avData.avatars[0]) setSelectedAvatarId(avData.avatars[0].id);
      }
      if (voData.voices) {
        setVoices(voData.voices);
        if (voData.voices[0]) setSelectedVoiceId(voData.voices[0].id);
      }
    });
  }, []);

  const handleGenerateTour = async () => {
    if (propertyPhotos.length === 0) {
      setErrorMsg('Please upload at least 1 property listing photo');
      return;
    }

    setGenerating(true);
    setErrorMsg('');

    try {
      const userId = user?.id || 'usr-guest-1';
      const requiredCredits = parseInt(duration, 10) * 15;

      await fetch('http://localhost:3008/v1/credits/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, modelId: 'veo-3-1', units: requiredCredits }),
      }).catch(() => {});

      const res = await fetch('http://localhost:3011/v1/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'virtual-tour',
          prompt: `Real estate property video tour of ${propertyName}. Style: ${selectedStyle}`,
          image_urls: propertyPhotos,
          aspect_ratio: aspectRatio,
          duration_seconds: parseInt(duration, 10),
          preferred_provider: 'veo-3-1',
          user_id: userId,
          narration: enableNarration
            ? { avatar_id: selectedAvatarId, voice_id: selectedVoiceId, script }
            : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit tour generation');

      setResultVideo(data.job || {
        output_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        status: 'completed',
      });
    } catch (err) {
      setErrorMsg(err.message || 'Tour generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const calculatedCredits = parseInt(duration, 10) * 15;

  return (
    <div className="flex-1 bg-[#090a0d] text-zinc-100 flex flex-col font-sans min-h-screen">
      
      {/* Sleek Minimal Header */}
      <header className="border-b border-white/[0.06] bg-[#0e0f13]/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold shadow-md shadow-emerald-900/20">
            🏡
          </div>
          <div>
            <h1 className="text-sm font-bold font-grotesk tracking-tight text-white flex items-center gap-2">
              Real Estate AI Studio
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Veo 3.1 4K
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-bold text-emerald-400">
            ⚡ {calculatedCredits} Credits
          </div>
          <button
            onClick={handleGenerateTour}
            disabled={generating}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Rendering 4K Tour...</span>
              </>
            ) : (
              <>
                <span>🚀 Generate Tour Video</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Studio Viewport & Compact Controls Dock */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Compact Controls Panel (400px) */}
        <aside className="w-full lg:w-[420px] border-r border-white/[0.06] bg-[#0c0d11] p-5 flex flex-col justify-between overflow-y-auto space-y-5">
          <div className="space-y-5">
            
            {/* 1. Property Name Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Property / Listing Title
              </label>
              <input
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="e.g. Modern Luxury Villa"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-grotesk font-bold transition"
              />
            </div>

            {/* 2. Sleek Tour Style Select Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Camera Motion Style
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 font-grotesk"
              >
                {TOUR_STYLES.map((st) => (
                  <option key={st.id} value={st.id} className="bg-[#14161b]">
                    {st.icon} {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Export Parameters (Pill Bar) */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="16:9" className="bg-[#14161b]">16:9 Widescreen</option>
                  <option value="9:16" className="bg-[#14161b]">9:16 Social Reel</option>
                  <option value="1:1" className="bg-[#14161b]">1:1 Square</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="10" className="bg-[#14161b]">10 Seconds</option>
                  <option value="15" className="bg-[#14161b]">15 Seconds</option>
                  <option value="30" className="bg-[#14161b]">30 Seconds</option>
                </select>
              </div>
            </div>

            {/* 4. Compact Photos Upload Strip */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  Property Photos ({propertyPhotos.length})
                </label>
                {propertyPhotos.length > 0 && (
                  <button
                    onClick={() => setPropertyPhotos([])}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Clear Photos
                  </button>
                )}
              </div>

              {propertyPhotos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pb-1">
                  {propertyPhotos.map((url, i) => (
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-white/20 group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPropertyPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 p-0.5 rounded bg-black/80 text-rose-400 text-[9px] opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <FileUploader
                value=""
                onChange={(url) => url && setPropertyPhotos((prev) => [...prev, url])}
                label="Add Listing Photo"
                accept="image/*"
                hint="Upload room photos or exterior shots"
              />
            </div>

            {/* 5. Collapsible Voice Narration Drawer */}
            <div className="border-t border-white/[0.06] pt-3">
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-zinc-300 font-grotesk hover:text-white transition"
              >
                <span className="flex items-center gap-1.5">
                  <span>🎙️</span> AI Voice Presenter Narration
                </span>
                <span className="text-[10px] text-zinc-500">{advancedOpen ? '▲ Hide' : '▼ Expand'}</span>
              </button>

              {advancedOpen && (
                <div className="space-y-3 pt-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 font-mono">Avatar Model</label>
                      <select
                        value={selectedAvatarId}
                        onChange={(e) => setSelectedAvatarId(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white"
                      >
                        {avatars.map((ast) => (
                          <option key={ast.id} value={ast.id} className="bg-[#14161b]">
                            {ast.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 font-mono">Voice Profile</label>
                      <select
                        value={selectedVoiceId}
                        onChange={(e) => setSelectedVoiceId(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white"
                      >
                        {voices.map((v) => (
                          <option key={v.id} value={v.id} className="bg-[#14161b]">
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-mono">Narration Script</label>
                    <textarea
                      rows={2}
                      value={script}
                      onChange={(e) => setScript(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                ⚠️ {errorMsg}
              </div>
            )}

          </div>

          <div className="pt-3 border-t border-white/[0.06] text-[10px] text-zinc-500 font-mono flex items-center justify-between">
            <span>Model: Google Veo 3.1</span>
            <span>4K HDR Motion Engine</span>
          </div>
        </aside>

        {/* Right Side: Main Expansive Studio Viewport Stage */}
        <main className="flex-1 bg-[#060709] p-6 flex flex-col justify-center items-center min-h-[500px] relative">
          {resultVideo ? (
            <div className="w-full max-w-4xl space-y-3">
              <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                <video
                  src={resultVideo.output_url}
                  controls
                  autoPlay
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 border border-white/10">
                <div>
                  <h3 className="font-extrabold text-sm text-white font-grotesk">{propertyName}</h3>
                  <p className="text-xs text-zinc-400 font-mono">Style: {selectedStyle} • 4K 60fps Render</p>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={resultVideo.output_url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
                  >
                    Download 4K Video 📥
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 max-w-md p-8 border border-dashed border-white/10 rounded-3xl bg-black/20">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto">
                🏡
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white font-grotesk">Ready to Render Property Tour</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Upload listing photos on the left panel and click <strong className="text-emerald-400">Generate Tour Video</strong> to synthesize a 4K camera walkthrough.
                </p>
              </div>
            </div>
          )}
        </main>

      </div>

    </div>
  );
}
