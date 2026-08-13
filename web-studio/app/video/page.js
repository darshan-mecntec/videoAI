'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/auth-provider';
import FileUploader from '../components/file-uploader';
import AssetSelectorModal from '../components/asset-selector-modal';

const INPUT_MODES = [
  { id: 'text-to-video', name: 'Text to Video', icon: '✍️', desc: 'Synthesize 4K motion video from text prompt' },
  { id: 'image-to-video', name: 'Image to Video', icon: '🖼️', desc: 'Animate single photo or style reference' },
  { id: 'avatar-clone', name: 'Virtual AI Character & Video Clone', icon: '👤', desc: 'Custom face clone, AI character presenter & voice clone' },
  { id: 'property-orbit', name: '360° Orbit Shot', icon: '🏛️', desc: 'Drone orbit around architectural property' },
  { id: 'property-tour', name: 'Virtual Property Tour', icon: '🗣️', desc: 'Property tour with Avatar presenter & voiceover' },
  { id: 'timelapse', name: 'Cinematic Timelapse', icon: '⏳', desc: 'Fast sky & lighting environment timelapse' },
];

const CAMERA_PRESETS = [
  { id: 'static', label: 'Static', icon: '🎥', promptText: 'static locked camera shot' },
  { id: 'pan', label: 'Slow Pan ←→', icon: '↔️', promptText: 'slow horizontal camera pan' },
  { id: 'orbit', label: '360° Orbit', icon: '🔄', promptText: '360-degree orbital camera shot around the subject' },
  { id: 'drone', label: 'Drone Fly-in', icon: '🚁', promptText: 'aerial drone fly-in shot descending from above' },
  { id: 'dolly', label: 'Dolly Forward', icon: '🎬', promptText: 'smooth dolly forward movement toward the subject' },
  { id: 'tilt', label: 'Tilt Up', icon: '⬆️', promptText: 'cinematic vertical tilt up camera shot' },
  { id: 'zoom', label: 'Zoom In', icon: '🔍', promptText: 'slow optical zoom in on key detail' },
  { id: 'reveal', label: 'Pull Back Reveal', icon: '🔙', promptText: 'pull back camera shot revealing expansive background' },
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
  const [selectedModel, setSelectedModel] = useState('veo-3-1');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState('8');
  const [seed, setSeed] = useState('-1');

  // Active Camera Preset
  const [activeCameraPreset, setActiveCameraPreset] = useState('orbit');

  // Reference Image (for Image to Video / Property Orbit)
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [assetModalOpen, setAssetModalOpen] = useState(false);

  // Kling-Style Camera Sliders (-5 to +5)
  const [pan, setPan] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [zoom, setZoom] = useState(0);
  const [roll, setRoll] = useState(0);
  const [dolly, setDolly] = useState(0);

  // Avatar Presenter & Video Face Clone Options
  const [enableAvatar, setEnableAvatar] = useState(false);
  const [avatarSourceType, setAvatarSourceType] = useState('preset'); // 'preset' | 'custom'
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [voiceCloneUrl, setVoiceCloneUrl] = useState('');
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [avatarScript, setAvatarScript] = useState('Welcome to this cinematic property tour presentation!');

  // Job status & History
  const [generating, setGenerating] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch live avatars & voices from avatar-service
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

  // Sync mode changes to active settings
  const handleModeChange = (modeId) => {
    setActiveMode(modeId);
    if (modeId === 'avatar-clone' || modeId === 'property-tour') {
      setEnableAvatar(true);
      if (modeId === 'avatar-clone') {
        setAvatarSourceType('custom');
        setPrompt('Cinematic portrait shot of custom AI Virtual Character presenting to camera');
      } else {
        setAvatarSourceType('preset');
        setActiveCameraPreset('orbit');
        setPrompt('Cinematic property tour of a luxury villa with manicured gardens');
      }
    } else if (modeId === 'property-orbit') {
      setActiveCameraPreset('orbit');
      setPrompt('360-degree drone orbit around luxury contemporary residence, sunset lighting');
    } else if (modeId === 'timelapse') {
      setActiveCameraPreset('reveal');
      setPrompt('Cinematic hyper-lapse of cloud movement over modern skyscraper skyline');
    }
  };

  // Fetch recent jobs from video-service
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3011/v1/video/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {
      // Quiet fail if service unready
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // Build camera motion string
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

  // Submit Video Generation Job
  const handleGenerate = async () => {
    if (!prompt.trim() && activeMode === 'text-to-video' && !enableAvatar) {
      setErrorMsg('Please enter a descriptive prompt');
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

      // 1. Reserve credits via auth-service
      const requiredCredits = parseInt(duration, 10) * 12 + (enableAvatar ? 50 : 0);
      await fetch('http://localhost:3008/v1/credits/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, modelId: selectedModel, units: requiredCredits }),
      }).catch(() => {});

      // 2. Build full prompt with camera motion
      const cameraMotion = buildCameraMotionString();
      const fullPrompt = `${prompt} [Camera: ${cameraMotion}]`;

      // 3. Submit payload
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

      // 4. Register to asset-service
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

      fetchJobs();
    } catch (err) {
      setErrorMsg(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const calculatedCredits = parseInt(duration, 10) * 12 + (enableAvatar ? 50 : 0);

  return (
    <div className="flex-1 bg-[#0f1113] text-zinc-100 flex flex-col font-sans">
      
      {/* Top Header Banner */}
      <div className="border-b border-white/[0.06] bg-[#121418] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold font-grotesk tracking-tight text-white flex items-center gap-2">
            <span>🎥</span> AI Video Creation Studio
          </h1>
          <p className="text-xs text-zinc-400">
            Multi-Provider Production Engine • Veo 3.1, Kling 3.0, Luma Dream Machine, Sora 2, Wan 2.6
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-purple-400">
              ⚡ {calculatedCredits} Credits
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">~${(calculatedCredits * 0.02).toFixed(2)} USD</div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition disabled:opacity-50 flex items-center gap-2"
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
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 min-h-0">
        
        {/* Left Form: Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5 overflow-y-auto pr-2">
          
          {/* 1. Production Mode Cards (6 Selection Modes per Research) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 font-grotesk uppercase tracking-wider block">
              Creation Mode & Production Template
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {INPUT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  className={`p-3 rounded-2xl border text-left space-y-1 transition ${
                    activeMode === mode.id
                      ? 'bg-gradient-to-br from-purple-600/30 to-blue-600/30 border-purple-400 text-white shadow-lg shadow-purple-500/10'
                      : 'bg-black/30 border-white/10 text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  <div className="font-extrabold font-grotesk flex items-center gap-1.5 text-white">
                    <span>{mode.icon}</span>
                    <span>{mode.name}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 leading-tight">
                    {mode.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Image / Style Reference Upload & Asset Library Picker */}
          {(activeMode === 'image-to-video' || activeMode === 'property-orbit' || activeMode === 'multi-ad') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 font-grotesk">
                  Reference Asset Keyframe
                </label>
                <button
                  onClick={() => setAssetModalOpen(true)}
                  className="text-xs font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-3 py-1 rounded-xl transition flex items-center gap-1.5"
                >
                  <span>📁 Choose from Asset Library</span>
                </button>
              </div>

              {referenceImageUrl ? (
                <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/20 relative group">
                  <img src={referenceImageUrl} alt="Ref" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setReferenceImageUrl('')}
                    className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/80 text-rose-400 text-xs font-bold hover:bg-rose-500 hover:text-white transition"
                  >
                    ✕ Remove Asset
                  </button>
                </div>
              ) : (
                <FileUploader
                  value={referenceImageUrl}
                  onChange={setReferenceImageUrl}
                  label="Reference Keyframe Image"
                  accept="image/*"
                  hint="Upload photo or select existing image asset from your library"
                />
              )}
            </div>
          )}

          {/* 3. Text Prompt Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 font-mono">
                {activeMode === 'image-to-video' ? 'Animation Instructions (Optional)' : 'Video Scene Prompt'}
              </label>
              <span className="text-[10px] text-purple-400 font-mono font-bold">
                {prompt.length} chars
              </span>
            </div>

            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe scene composition, motion, atmosphere, physical details..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 font-mono resize-none leading-relaxed"
            />

            {/* Prompt Style Chips */}
            <div className="flex flex-wrap gap-1.5">
              {STYLE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setPrompt((prev) => `${prev}, ${chip.replace(/^[^\s]+\s/, '')}`)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 text-zinc-400 hover:text-purple-300 text-[11px] font-mono border border-white/5 transition"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* 4. One-Click Camera Presets (Augments Prompt — Industry Standard) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                <span>📹</span> Camera Presets & Movement
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">One-click preset buttons</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
              {CAMERA_PRESETS.map((preset) => {
                const isSelected = activeCameraPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setActiveCameraPreset(preset.id)}
                    className={`p-2.5 rounded-xl text-left border transition flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-inner font-bold'
                        : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="text-base">{preset.icon}</span>
                    <span className="text-[10px] truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Kling-Style Fine Camera Sliders (-5 to +5) */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
            <div className="text-[11px] font-extrabold text-zinc-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>🎛️ Kling Fine Motion Tuning</span>
              <button
                onClick={() => {
                  setPan(0);
                  setTilt(0);
                  setZoom(0);
                  setRoll(0);
                  setDolly(0);
                }}
                className="text-[10px] text-purple-400 hover:underline"
              >
                Reset Sliders
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              {[
                { name: 'Pan', val: pan, set: setPan },
                { name: 'Tilt', val: tilt, set: setTilt },
                { name: 'Zoom', val: zoom, set: setZoom },
                { name: 'Roll', val: roll, set: setRoll },
                { name: 'Dolly', val: dolly, set: setDolly },
              ].map((s) => (
                <div key={s.name} className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                    <span>{s.name}</span>
                    <span className="font-bold text-purple-400">{s.val}</span>
                  </div>
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

          {/* 6. Avatar Presenter & Real Video Face Clone Panel */}
          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                <span>👤</span> Virtual AI Character & Video Face/Voice Clone
              </label>
              <button
                type="button"
                onClick={() => setEnableAvatar(!enableAvatar)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  enableAvatar
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {enableAvatar ? 'Enabled ✓' : 'Disabled +'}
              </button>
            </div>

            {enableAvatar && (
              <div className="space-y-3 pt-2 border-t border-purple-500/20 text-xs">
                {/* Mode Selector Toggle: Preset vs Custom Upload */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10 text-[11px] font-bold font-grotesk">
                  <button
                    type="button"
                    onClick={() => setAvatarSourceType('preset')}
                    className={`py-1.5 rounded-lg transition ${
                      avatarSourceType === 'preset'
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    🎭 Preset AI Presenter
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarSourceType('custom')}
                    className={`py-1.5 rounded-lg transition ${
                      avatarSourceType === 'custom'
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    📸 Upload Face/Actor Clone
                  </button>
                </div>

                {avatarSourceType === 'preset' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-bold">Select AI Avatar Model</label>
                      <select
                        value={selectedAvatarId}
                        onChange={(e) => setSelectedAvatarId(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white"
                      >
                        {avatars.map((ast) => (
                          <option key={ast.id} value={ast.id} className="bg-[#16181c]">
                            👤 {ast.name} ({ast.id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-zinc-400 font-bold">Voice Synthesis</label>
                      <select
                        value={selectedVoiceId}
                        onChange={(e) => setSelectedVoiceId(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-xs text-white"
                      >
                        {voices.map((v) => (
                          <option key={v.id} value={v.id} className="bg-[#16181c]">
                            🎙️ {v.name} ({v.language})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Custom Face / Actor Upload Dropzone */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-zinc-300 font-bold">Custom Character Photo / Actor Video to Clone</label>
                        <button
                          type="button"
                          onClick={() => setAssetModalOpen(true)}
                          className="text-[10px] font-bold text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-lg"
                        >
                          📁 Asset Library
                        </button>
                      </div>

                      {customAvatarUrl ? (
                        <div className="aspect-video bg-black rounded-xl overflow-hidden border border-purple-500/40 relative group">
                          {customAvatarUrl.match(/\.mp4/i) ? (
                            <video src={customAvatarUrl} className="w-full h-full object-cover" />
                          ) : (
                            <img src={customAvatarUrl} alt="Custom Face Clone" className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => setCustomAvatarUrl('')}
                            className="absolute top-2 right-2 px-2 py-1 rounded bg-black/80 text-rose-400 text-[10px] font-bold"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ) : (
                        <FileUploader
                          value={customAvatarUrl}
                          onChange={setCustomAvatarUrl}
                          label="Upload Character Photo or Presenter Video"
                          accept="image/*,video/*"
                          hint="Upload face portrait or actor video clip to clone facial motion & lipsync"
                        />
                      )}
                    </div>

                    {/* Custom Voice Sample Upload */}
                    <div className="space-y-1">
                      <label className="text-zinc-300 font-bold">Voice Clone Audio Sample (Optional)</label>
                      <FileUploader
                        value={voiceCloneUrl}
                        onChange={setVoiceCloneUrl}
                        label="Upload Audio Voice Clone Sample (MP3/WAV)"
                        accept="audio/*"
                        hint="Provide a 10-second speech sample to clone voice acoustic profile"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Dialogue Script & Speech Content</label>
                  <textarea
                    rows={2}
                    value={avatarScript}
                    onChange={(e) => setAvatarScript(e.target.value)}
                    placeholder="Enter dialogue for the virtual character to speak with AI lipsync..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-purple-500"
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

        {/* Right Settings & Preview Column (5 cols) */}
        <div className="lg:col-span-5 space-y-5 overflow-y-auto pr-1">
          
          {/* Engine Parameters */}
          <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 font-mono">
              ⚙️ Generation Parameters
            </h3>

            {/* Model Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300">AI Model Engine</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#16181c]">
                    {m.name} — {m.provider} ({m.tag})
                  </option>
                ))}
              </select>
            </div>

            {/* Aspect Ratio & Duration */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                >
                  <option value="16:9" className="bg-[#16181c]">16:9 Widescreen</option>
                  <option value="9:16" className="bg-[#16181c]">9:16 Portrait</option>
                  <option value="1:1" className="bg-[#16181c]">1:1 Square</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                >
                  <option value="4" className="bg-[#16181c]">4 Seconds</option>
                  <option value="8" className="bg-[#16181c]">8 Seconds</option>
                  <option value="12" className="bg-[#16181c]">12 Seconds</option>
                </select>
              </div>
            </div>

            {/* Negative Prompt */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400">Negative Prompt</label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blur, distortion, low quality, artifacts..."
                className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          {/* Live Generation Queue / Recent Renders */}
          <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 font-mono">
                🎬 Generation History
              </h3>
              <button onClick={fetchJobs} className="text-[10px] text-purple-400 hover:underline font-mono">
                🔄 Refresh
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="p-8 border border-dashed border-white/10 rounded-xl text-center space-y-2">
                <div className="text-2xl">📽️</div>
                <div className="text-xs font-bold text-zinc-400">No Video Jobs Submitted Yet</div>
                <div className="text-[10px] text-zinc-600">Your generated video clips will appear here automatically</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {jobs.map((job) => (
                  <div key={job.job_id} className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-300 font-mono truncate max-w-[180px]">
                        Job #{job.job_id.substring(0, 8)}
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

                    <div className="text-[11px] text-zinc-300 font-mono truncate">
                      {job.prompt}
                    </div>

                    {job.output_url ? (
                      <div className="space-y-2">
                        <video
                          src={job.output_url}
                          controls
                          className="w-full rounded-lg border border-white/10 max-h-48 object-cover"
                        />
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={() => router.push(`/editor?url=${encodeURIComponent(job.output_url)}`)}
                            className="flex-1 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 transition text-center"
                          >
                            ✏️ Edit in Timeline
                          </button>
                          <button
                            onClick={() => router.push(`/canvas`)}
                            className="flex-1 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-bold border border-purple-500/30 transition text-center"
                          >
                            ⚡ Send to Canvas
                          </button>
                          <a
                            href={job.output_url}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold border border-white/10 transition"
                          >
                            ⬇ 4K
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-lg text-center text-xs text-purple-300 font-mono animate-pulse">
                        ⏳ Rendering Video Frames with {job.preferred_provider || 'Google Veo'}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Asset Selector Modal for Media Library Picking */}
      <AssetSelectorModal
        isOpen={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        onSelectAsset={(url) => setReferenceImageUrl(url)}
        acceptedType="image"
      />

    </div>
  );
}
