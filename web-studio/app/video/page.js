'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/auth-provider';
import FileUploader from '../components/file-uploader';
import AssetSelectorModal from '../components/asset-selector-modal';
import AuthGuard from '../components/auth-guard';

const INPUT_MODES = [
  { id: 'text-to-video', name: 'Text to Video', icon: '✍️' },
  { id: 'image-to-video', name: 'Image to Video', icon: '🖼️' },
  { id: 'avatar-clone', name: 'AI Avatar & Lipsync', icon: '👤' },
  { id: 'property-orbit', name: '360° Orbit', icon: '🏛️' },
  { id: 'timelapse', name: 'Timelapse', icon: '⏳' },
];

const CAMERA_PRESETS = [
  { id: 'static', label: 'Static', icon: '🎥', promptText: 'static locked camera shot' },
  { id: 'pan', label: 'Slow Pan', icon: '↔️', promptText: 'slow horizontal camera pan' },
  { id: 'orbit', label: '360° Orbit', icon: '🔄', promptText: '360-degree orbital camera shot' },
  { id: 'drone', label: 'Drone Fly-in', icon: '🚁', promptText: 'aerial drone fly-in shot' },
  { id: 'dolly', label: 'Dolly Forward', icon: '🎬', promptText: 'smooth dolly forward movement' },
  { id: 'tilt', label: 'Tilt Up', icon: '⬆️', promptText: 'cinematic vertical tilt up' },
  { id: 'zoom', label: 'Zoom In', icon: '🔍', promptText: 'slow optical zoom in' },
  { id: 'reveal', label: 'Pull Back', icon: '🔙', promptText: 'pull back camera shot reveal' },
];

const AI_MODELS = [
  { id: 'veo-3-1', name: 'Google Veo 3.1', provider: 'Google AI', tag: 'Fast 4K Engine' },
  { id: 'kling-3-0', name: 'Kling 3.0', provider: 'Kuaishou', tag: 'Multi-Shot Motion' },
  { id: 'luma-dream', name: 'Luma Dream Machine', provider: 'Luma Labs', tag: 'Keyframe Motion' },
  { id: 'sora-2', name: 'OpenAI Sora 2', provider: 'OpenAI', tag: 'Physical Simulator' },
  { id: 'wan-2-6', name: 'WAN 2.6', provider: 'Alibaba', tag: 'Native Audio' },
];

const STYLE_CHIPS = [
  '🎬 Cinematic 35mm',
  '📸 Photorealistic 8K',
  '📺 Commercial Ad',
  '🛸 Cyberpunk Sci-Fi',
  '🚁 Drone Overhead',
  '🏆 Luxury Editorial',
];

export default function AIVideoGeneratorPage() {
  const { user } = useAuth();
  const router = useRouter();

  // State
  const [activeMode, setActiveMode] = useState('text-to-video');
  const [prompt, setPrompt] = useState('Cinematic wide shot of a sleek futuristic sports car driving through a rain-slicked city at dusk, 8k');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [availableModels, setAvailableModels] = useState(AI_MODELS);
  const [selectedModel, setSelectedModel] = useState('veo-3-1-pro');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState('8');
  const [seed, setSeed] = useState('-1');

  // Collapsible drawers
  const [cameraDrawerOpen, setCameraDrawerOpen] = useState(false);
  const [avatarDrawerOpen, setAvatarDrawerOpen] = useState(false);

  // Active Camera Preset
  const [activeCameraPreset, setActiveCameraPreset] = useState('orbit');

  // Reference Image
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [assetModalOpen, setAssetModalOpen] = useState(false);

  // Fine Sliders
  const [pan, setPan] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [roll, setRoll] = useState(0);
  const [dolly, setDolly] = useState(0);

  // Avatar / Lipsync Options
  const [enableAvatar, setEnableAvatar] = useState(false);
  const [avatarSourceType, setAvatarSourceType] = useState('preset');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [voiceCloneUrl, setVoiceCloneUrl] = useState('');
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [avatarScript, setAvatarScript] = useState('Welcome to this AI video generation showcase!');

  // Status & Jobs
  const [generating, setGenerating] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch enabled models from AI Model Catalogue
  useEffect(() => {
    fetch('http://localhost:3001/v1/models?modality=text-to-video')
      .then((r) => r.json())
      .then((data) => {
        if (data.models && data.models.length > 0) {
          const mapped = data.models.map((m) => ({
            id: m.id,
            name: m.display_name,
            provider: m.provider_slug,
            tag: `${m.credits_per_unit} cr / sec`,
          }));
          setAvailableModels(mapped);
          setSelectedModel(mapped[0].id);
        }
      })
      .catch(() => {});

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

  const handleModeChange = (modeId) => {
    setActiveMode(modeId);
    if (modeId === 'avatar-clone') {
      setEnableAvatar(true);
      setAvatarDrawerOpen(true);
      setPrompt('Cinematic portrait shot of custom AI Virtual Character presenting to camera');
    } else if (modeId === 'property-orbit') {
      setActiveCameraPreset('orbit');
      setPrompt('360-degree drone orbit around luxury contemporary residence, sunset lighting');
    } else if (modeId === 'timelapse') {
      setActiveCameraPreset('reveal');
      setPrompt('Cinematic hyper-lapse of cloud movement over modern skyscraper skyline');
    }
  };

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3011/v1/video/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const buildCameraMotionString = () => {
    const preset = CAMERA_PRESETS.find((p) => p.id === activeCameraPreset);
    const presetText = preset ? preset.promptText : '';

    const parts = [];
    if (presetText) parts.push(presetText);
    if (pan !== 0) parts.push(`Pan ${pan > 0 ? 'Right' : 'Left'} (${Math.abs(pan)})`);
    if (tilt !== 0) parts.push(`Tilt ${tilt > 0 ? 'Up' : 'Down'} (${Math.abs(tilt)})`);
    if (zoom !== 0) parts.push(`Zoom ${zoom > 0 ? 'In' : 'Out'} (${Math.abs(zoom)})`);
    if (roll !== 0) parts.push(`Roll ${roll > 0 ? 'CW' : 'CCW'} (${Math.abs(roll)})`);
    if (dolly !== 0) parts.push(`Dolly ${dolly > 0 ? 'Forward' : 'Backward'} (${Math.abs(dolly)})`);
    return parts.length ? parts.join(', ') : 'static shot';
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && activeMode === 'text-to-video' && !enableAvatar) {
      setErrorMsg('Please enter a prompt');
      return;
    }

    if ((activeMode === 'image-to-video' || activeMode === 'property-orbit') && !referenceImageUrl) {
      setErrorMsg('Please select or upload a reference image');
      return;
    }

    setGenerating(true);
    setErrorMsg('');

    try {
      const userId = user?.id || 'usr-guest-1';
      const requiredCredits = parseInt(duration, 10) * 12 + (enableAvatar ? 50 : 0);
      
      await fetch('http://localhost:3008/v1/credits/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, modelId: selectedModel, units: requiredCredits }),
      }).catch(() => {});

      const cameraMotion = buildCameraMotionString();
      const fullPrompt = `${prompt} [Camera: ${cameraMotion}]`;

      const payload = {
        stage: activeMode,
        prompt: fullPrompt,
        negative_prompt: negativePrompt,
        image_url: referenceImageUrl || null,
        aspect_ratio: aspectRatio,
        duration_seconds: parseInt(duration, 10),
        preferred_provider: selectedModel,
        user_id: userId,
        seed: seed !== '-1' ? parseInt(seed, 10) : undefined,
        avatar_presenter: enableAvatar
          ? {
              source_type: avatarSourceType,
              avatar_id: selectedAvatarId,
              custom_avatar_url: customAvatarUrl || null,
              voice_id: selectedVoiceId,
              voice_clone_url: voiceCloneUrl || null,
              script: avatarScript,
            }
          : null,
      };

      const res = await fetch('http://localhost:3011/v1/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit generation job');

      fetch('http://localhost:3006/v1/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `AI Video - ${prompt.slice(0, 30)}...`,
          type: 'video',
          url: data.video_url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          metadata: { prompt, provider: selectedModel },
        }),
      }).catch(() => {});

      await fetchJobs();
    } catch (err) {
      console.error('Generation Error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred during generation.');
    } finally {
      setGenerating(false);
    }
  };

  const calculatedCredits = parseInt(duration, 10) * 12 + (enableAvatar ? 50 : 0);
  const isViewer = user?.role === 'viewer';

  return (
    <AuthGuard>
      <div className="min-h-[calc(100vh-3rem)] bg-[#07080a] text-zinc-100 flex flex-col font-sans overflow-hidden">
      
      {/* Top Bar Studio Control */}
      <header className="h-14 border-b border-white/[0.06] bg-[#0c0d11] px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-sm shadow-md">
            🎥
          </div>
          <div>
            <h1 className="text-sm font-bold font-grotesk tracking-tight text-white flex items-center gap-2">
              AI Video Production Studio
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                Runway & Veo 3.1
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-bold text-purple-400">
            ⚡ {calculatedCredits} Credits
          </div>

          {isViewer ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs font-mono">
                🔒 Viewer (Read-Only)
              </span>
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
              >
                Request Role Upgrade
              </Link>
            </div>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Generating Video...</span>
                </>
              ) : (
                <>
                  <span>🚀 Generate Video</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Compact Controls Drawer (420px) */}
        <aside className="w-full lg:w-[420px] border-r border-white/[0.06] bg-[#0c0d11] p-5 flex flex-col justify-between overflow-y-auto space-y-5">
          <div className="space-y-4">
            
            {/* Sleek Creation Mode Select Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Creation Mode
              </label>
              <select
                value={activeMode}
                onChange={(e) => handleModeChange(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold focus:outline-none focus:border-purple-500"
              >
                {INPUT_MODES.map((mode) => (
                  <option key={mode.id} value={mode.id} className="bg-[#14161b]">
                    {mode.icon} {mode.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference Image Keyframe Input (If mode requires) */}
            {(activeMode === 'image-to-video' || activeMode === 'property-orbit') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    Reference Keyframe
                  </label>
                  <button
                    onClick={() => setAssetModalOpen(true)}
                    className="text-[10px] text-cyan-400 hover:underline font-mono"
                  >
                    📁 Asset Library
                  </button>
                </div>

                {referenceImageUrl ? (
                  <div className="aspect-video bg-black rounded-xl overflow-hidden border border-white/20 relative group">
                    <img src={referenceImageUrl} alt="Ref" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setReferenceImageUrl('')}
                      className="absolute top-1 right-1 px-2 py-0.5 rounded bg-black/80 text-rose-400 text-[10px] font-bold"
                    >
                      ✕ Remove
                    </button>
                  </div>
                ) : (
                  <FileUploader
                    value={referenceImageUrl}
                    onChange={setReferenceImageUrl}
                    label="Upload Keyframe Image"
                    accept="image/*"
                    hint="Upload photo reference"
                  />
                )}
              </div>
            )}

            {/* Prompt Input Box & Style Select Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  Prompt
                </label>
                <span className="text-[10px] text-purple-400 font-mono">{prompt.length} chars</span>
              </div>

              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe scene composition, motion, lighting, atmosphere..."
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 font-mono resize-none leading-relaxed"
              />

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Visual Style Preset</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setPrompt((prev) => `${prev}, ${e.target.value.replace(/^[^\s]+\s/, '')}`);
                    }
                  }}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white font-mono"
                >
                  <option value="" className="bg-[#14161b]">-- Select Visual Style Preset --</option>
                  {STYLE_CHIPS.map((chip) => (
                    <option key={chip} value={chip} className="bg-[#14161b]">
                      {chip}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Model & Export Parameters */}
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Model Engine</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold focus:outline-none"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#14161b]">
                      {m.name} ({m.tag || m.provider})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white font-mono"
                  >
                    <option value="16:9" className="bg-[#14161b]">16:9 Widescreen</option>
                    <option value="9:16" className="bg-[#14161b]">9:16 Portrait</option>
                    <option value="1:1" className="bg-[#14161b]">1:1 Square</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white font-mono"
                  >
                    <option value="4" className="bg-[#14161b]">4 Seconds</option>
                    <option value="8" className="bg-[#14161b]">8 Seconds</option>
                    <option value="12" className="bg-[#14161b]">12 Seconds</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Collapsible Camera Motion Drawer */}
            <div className="border-t border-white/[0.06] pt-2">
              <button
                onClick={() => setCameraDrawerOpen(!cameraDrawerOpen)}
                className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-zinc-300 font-grotesk hover:text-white transition"
              >
                <span className="flex items-center gap-1.5">
                  <span>📹</span> Camera Controls & Sliders
                </span>
                <span className="text-[10px] text-zinc-500">{cameraDrawerOpen ? '▲ Hide' : '▼ Expand'}</span>
              </button>

              {cameraDrawerOpen && (
                <div className="space-y-3 pt-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Camera Preset Movement</label>
                    <select
                      value={activeCameraPreset}
                      onChange={(e) => setActiveCameraPreset(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white font-mono"
                    >
                      {CAMERA_PRESETS.map((preset) => (
                        <option key={preset.id} value={preset.id} className="bg-[#14161b]">
                          {preset.icon} {preset.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-5 gap-2 pt-1">
                    {[
                      { name: 'Pan', val: pan, set: setPan },
                      { name: 'Tilt', val: tilt, set: setTilt },
                      { name: 'Zoom', val: zoom, set: setZoom },
                      { name: 'Roll', val: roll, set: setRoll },
                      { name: 'Dolly', val: dolly, set: setDolly },
                    ].map((s) => (
                      <div key={s.name} className="space-y-1 text-center">
                        <div className="text-[9px] text-zinc-400 font-mono">{s.name} ({s.val})</div>
                        <input
                          type="range"
                          min="-5"
                          max="5"
                          value={s.val}
                          onChange={(e) => s.set(parseInt(e.target.value, 10))}
                          className="w-full accent-purple-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Avatar Presenter Drawer */}
            <div className="border-t border-white/[0.06] pt-2">
              <button
                onClick={() => setAvatarDrawerOpen(!avatarDrawerOpen)}
                className="w-full flex items-center justify-between py-1.5 text-xs font-bold text-zinc-300 font-grotesk hover:text-white transition"
              >
                <span className="flex items-center gap-1.5">
                  <span>👤</span> AI Avatar & Lipsync
                </span>
                <span className="text-[10px] text-zinc-500">{avatarDrawerOpen ? '▲ Hide' : '▼ Expand'}</span>
              </button>

              {avatarDrawerOpen && (
                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Enable Avatar Presenter</span>
                    <button
                      type="button"
                      onClick={() => setEnableAvatar(!enableAvatar)}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition ${
                        enableAvatar ? 'bg-purple-600 text-white' : 'bg-white/10 text-zinc-400'
                      }`}
                    >
                      {enableAvatar ? 'Enabled ✓' : 'Disabled'}
                    </button>
                  </div>

                  {enableAvatar && (
                    <div className="space-y-2 pt-1 border-t border-white/5">
                      <div className="grid grid-cols-2 gap-2">
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

                      <textarea
                        rows={2}
                        value={avatarScript}
                        onChange={(e) => setAvatarScript(e.target.value)}
                        placeholder="Avatar spoken dialogue..."
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                ⚠️ {errorMsg}
              </div>
            )}

          </div>
        </aside>

        {/* Right Side: Main Expansive Generation Stage & History Viewport */}
        <main className="flex-1 bg-[#060709] p-6 flex flex-col justify-between overflow-y-auto min-h-[500px]">
          <div className="space-y-4 max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-2">
                <span>🎬</span> Studio Output Viewport & Recent Renders
              </h3>
              <button onClick={fetchJobs} className="text-[10px] text-purple-400 hover:underline font-mono">
                🔄 Refresh Renders
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="p-16 border border-dashed border-white/10 rounded-3xl text-center space-y-3 bg-black/20 my-12">
                <div className="w-16 h-16 rounded-3xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-3xl mx-auto">
                  📽️
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white font-grotesk">Ready to Render AI Video</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                    Enter your scene prompt on the left panel and click <strong className="text-purple-400">Generate Video</strong> to render with Veo 3.1 or Kling.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {jobs.map((job) => (
                  <div key={job.job_id} className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] space-y-3 shadow-lg">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-300 font-mono truncate">
                        Render #{job.job_id.substring(0, 8)}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                          job.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        }`}
                      >
                        {job.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 font-mono line-clamp-2 italic">
                      "{job.prompt}"
                    </p>

                    {job.output_url ? (
                      <div className="space-y-2">
                        <div className="aspect-video bg-black rounded-xl overflow-hidden border border-white/10 relative">
                          <video
                            src={job.output_url}
                            controls
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => router.push(`/editor?url=${encodeURIComponent(job.output_url)}`)}
                            className="flex-1 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 transition text-center"
                          >
                            ✏️ Timeline Editor
                          </button>
                          <a
                            href={job.output_url}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold shadow transition"
                          >
                            ⬇ Download 4K
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 bg-purple-950/20 border border-purple-500/20 rounded-xl text-center text-xs text-purple-300 font-mono animate-pulse">
                        ⏳ Synthesizing Video Frames with {job.preferred_provider || 'Google Veo'}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

      </div>

      <AssetSelectorModal
        isOpen={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        onSelectAsset={(url) => setReferenceImageUrl(url)}
        acceptedType="image"
      />

    </div>
    </AuthGuard>
  );
}
