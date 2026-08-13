'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/auth-provider';
import FileUploader from '../components/file-uploader';

export default function SceneBuilderPage() {
  const { user } = useAuth();

  // Multi-Scene Timeline Deck
  const [scenes, setScenes] = useState([
    {
      id: 'sc-1',
      title: 'Scene 1: Introduction',
      script: 'Welcome to our product showcase! Today we demonstrate our generative AI studio capabilities.',
      avatarId: 'ast-1',
      voiceId: 'vo-1',
      duration: '5',
      transition: 'fade',
      backgroundUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 'sc-2',
      title: 'Scene 2: Core Features',
      script: 'Our platform supports native dialogue synthesis, high quality 4K video rendering, and multi-model API key pools.',
      avatarId: 'ast-2',
      voiceId: 'vo-1',
      duration: '8',
      transition: 'dissolve',
      backgroundUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&auto=format&fit=crop&q=80',
    },
  ]);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);

  // Live assets from avatar-service
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [rendering, setRendering] = useState(false);
  const [renderedMovieUrl, setRenderedMovieUrl] = useState(null);

  useEffect(() => {
    // Fetch live avatars & voices from avatar-service
    Promise.all([
      fetch('http://localhost:3014/v1/avatars').then((r) => r.json()).catch(() => ({ avatars: [] })),
      fetch('http://localhost:3014/v1/voices').then((r) => r.json()).catch(() => ({ voices: [] })),
    ]).then(([avData, voData]) => {
      if (avData.avatars) setAvatars(avData.avatars);
      if (voData.voices) setVoices(voData.voices);
    });
  }, []);

  const handleAddScene = () => {
    const newScene = {
      id: `sc-${Date.now()}`,
      title: `Scene ${scenes.length + 1}`,
      script: 'New scene script content...',
      avatarId: avatars[0]?.id || 'ast-1',
      voiceId: voices[0]?.id || 'vo-1',
      duration: '5',
      transition: 'fade',
      backgroundUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop&q=80',
    };
    setScenes((prev) => [...prev, newScene]);
    setActiveSceneIdx(scenes.length);
  };

  const handleRemoveScene = (idx) => {
    if (scenes.length <= 1) return;
    setScenes((prev) => prev.filter((_, i) => i !== idx));
    setActiveSceneIdx((prev) => Math.max(0, prev - 1));
  };

  const currentScene = scenes[activeSceneIdx] || scenes[0];

  const updateCurrentScene = (field, value) => {
    setScenes((prev) =>
      prev.map((sc, i) => (i === activeSceneIdx ? { ...sc, [field]: value } : sc))
    );
  };

  const handleRenderFullVideo = async () => {
    setRendering(true);
    setRenderedMovieUrl(null);

    try {
      const userId = user?.id || 'usr-guest-1';
      // Reserve credits for scene timeline build
      await fetch('http://localhost:3008/v1/credits/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, modelId: 'video-editor-stitch', units: scenes.length }),
      }).catch(() => {});

      setTimeout(() => {
        setRendering(false);
        setRenderedMovieUrl('https://assets.mixkit.co/videos/preview/mixkit-flying-over-a-city-at-night-41584-large.mp4');
      }, 2500);
    } catch {
      setRendering(false);
    }
  };

  return (
    <div className="flex-1 bg-[#090a0c] text-zinc-100 font-sans flex flex-col h-[calc(100vh-36px)] overflow-hidden select-none">
      
      {/* Top Banner */}
      <div className="h-10 border-b border-white/10 bg-[#111318] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white font-grotesk flex items-center gap-1.5">
            <span>🎬</span> AI Scene Builder & Video Timeline Editor
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {scenes.length} SCENES DECK
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ai/video"
            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 transition"
          >
            🗣️ Avatar Creator
          </Link>
          <button
            onClick={handleRenderFullVideo}
            disabled={rendering}
            className="px-4 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
          >
            {rendering ? 'Stitching Scenes...' : '⚡ Export Full Video'}
          </button>
        </div>
      </div>

      {/* Main 3-Column Studio Workspace */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        
        {/* Left Sidebar: Scene List (3 Cols) */}
        <div className="col-span-3 border-r border-white/10 bg-[#0f1113] p-4 flex flex-col justify-between overflow-y-auto space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider font-grotesk">
              <span>SCENE TIMELINE DECK</span>
              <button
                onClick={handleAddScene}
                className="text-xs text-purple-400 hover:text-purple-300 font-mono font-bold"
              >
                + Add Scene
              </button>
            </div>

            <div className="space-y-2">
              {scenes.map((sc, idx) => (
                <div
                  key={sc.id}
                  onClick={() => setActiveSceneIdx(idx)}
                  className={`p-3 rounded-xl border cursor-pointer transition space-y-1.5 ${
                    activeSceneIdx === idx
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                      : 'bg-[#16181c] border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold font-grotesk">
                    <span>Scene #{idx + 1} — {sc.duration}s</span>
                    {scenes.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveScene(idx); }}
                        className="text-rose-400 hover:text-rose-300 font-mono text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-2">{sc.script}</p>
                  <div className="text-[10px] text-purple-400 font-mono">Transition: {sc.transition}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] space-y-1 font-mono">
            <div className="text-zinc-300 font-bold">Total Duration</div>
            <div className="text-purple-400 font-bold text-sm">
              {scenes.reduce((acc, s) => acc + parseInt(s.duration || '5', 10), 0)} Seconds
            </div>
          </div>
        </div>

        {/* Center Canvas Preview (6 Cols) */}
        <div className="col-span-6 bg-[#08090b] p-6 flex flex-col items-center justify-between space-y-4">
          <div className="w-full flex items-center justify-between text-xs font-mono text-zinc-400 border-b border-white/5 pb-2">
            <span>PREVIEW CANVAS — SCENE #{activeSceneIdx + 1}</span>
            <span className="text-emerald-400 font-bold">16:9 4K CANVAS</span>
          </div>

          {/* Player Display */}
          <div className="w-full aspect-video rounded-2xl bg-black border border-white/10 overflow-hidden relative shadow-2xl flex items-center justify-center">
            {rendering ? (
              <div className="flex flex-col items-center gap-3 text-center p-6">
                <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-xs font-bold text-white">Stitching & Rendering Full Scene Timeline...</div>
              </div>
            ) : renderedMovieUrl ? (
              <video src={renderedMovieUrl} controls autoPlay loop className="w-full h-full object-cover" />
            ) : (
              <div className="relative w-full h-full">
                {currentScene.backgroundUrl && (
                  <img src={currentScene.backgroundUrl} alt="Background" className="w-full h-full object-cover opacity-60" />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/30 backdrop-blur-[1px]">
                  <div className="w-16 h-16 rounded-full bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-3xl mb-2">
                    👤
                  </div>
                  <div className="text-xs font-bold text-white max-w-md bg-black/60 px-4 py-2 rounded-xl border border-white/10">
                    "{currentScene.script}"
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Bottom Bar */}
          <div className="w-full p-3 rounded-xl bg-[#111318] border border-white/10 flex items-center gap-2 overflow-x-auto">
            {scenes.map((sc, idx) => (
              <div
                key={sc.id}
                onClick={() => setActiveSceneIdx(idx)}
                className={`h-12 flex-1 rounded-lg border flex items-center justify-center text-xs font-bold cursor-pointer transition ${
                  activeSceneIdx === idx
                    ? 'bg-purple-600/30 border-purple-500 text-white'
                    : 'bg-black/40 border-white/5 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                #{idx + 1} ({sc.duration}s)
              </div>
            ))}
          </div>
        </div>

        {/* Right Properties Panel (3 Cols) */}
        <div className="col-span-3 border-l border-white/10 bg-[#0f1113] p-4 space-y-5 overflow-y-auto">
          <div className="text-xs font-bold text-white uppercase tracking-wider font-grotesk border-b border-white/5 pb-2">
            SCENE #{activeSceneIdx + 1} PROPERTIES
          </div>

          {/* Script Text */}
          <div className="space-y-1 text-xs">
            <label className="text-zinc-400 font-bold">Dialogue / Voiceover Script</label>
            <textarea
              value={currentScene.script}
              onChange={(e) => updateCurrentScene('script', e.target.value)}
              rows={4}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none font-sans"
            />
          </div>

          {/* Avatar Selector */}
          <div className="space-y-1 text-xs">
            <label className="text-zinc-400 font-bold">Scene Avatar</label>
            <select
              value={currentScene.avatarId}
              onChange={(e) => updateCurrentScene('avatarId', e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-purple-300 focus:outline-none focus:border-purple-500 font-bold"
            >
              {avatars.length > 0 ? (
                avatars.map((ast) => (
                  <option key={ast.id} value={ast.id} className="bg-[#111318] text-white">
                    👤 {ast.name}
                  </option>
                ))
              ) : (
                <option value="ast-1" className="bg-[#111318]">👤 Cyberpunk Gloria</option>
              )}
            </select>
          </div>

          {/* Voice Selector */}
          <div className="space-y-1 text-xs">
            <label className="text-zinc-400 font-bold">Voice Synthesis</label>
            <select
              value={currentScene.voiceId}
              onChange={(e) => updateCurrentScene('voiceId', e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 font-bold"
            >
              {voices.length > 0 ? (
                voices.map((vo) => (
                  <option key={vo.id} value={vo.id} className="bg-[#111318] text-white">
                    🎙️ {vo.name}
                  </option>
                ))
              ) : (
                <option value="vo-1" className="bg-[#111318]">🎙️ English US Studio</option>
              )}
            </select>
          </div>

          {/* Duration & Transition */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <label className="text-zinc-400 font-bold">Duration (Sec)</label>
              <select
                value={currentScene.duration}
                onChange={(e) => updateCurrentScene('duration', e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
              >
                <option value="3" className="bg-[#111318]">3 Seconds</option>
                <option value="5" className="bg-[#111318]">5 Seconds</option>
                <option value="8" className="bg-[#111318]">8 Seconds</option>
                <option value="12" className="bg-[#111318]">12 Seconds</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400 font-bold">Transition Effect</label>
              <select
                value={currentScene.transition}
                onChange={(e) => updateCurrentScene('transition', e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
              >
                <option value="cut" className="bg-[#111318]">Hard Cut</option>
                <option value="fade" className="bg-[#111318]">Cross Fade</option>
                <option value="dissolve" className="bg-[#111318]">Dissolve</option>
                <option value="wipe" className="bg-[#111318]">Wipe Right</option>
              </select>
            </div>
          </div>

          {/* Background Media Dropzone */}
          <div className="pt-2">
            <FileUploader
              value={currentScene.backgroundUrl}
              onChange={(url) => updateCurrentScene('backgroundUrl', url)}
              label="Scene Background Media"
              accept="image/*,video/*"
              hint="Drop background image/video or paste URL link"
            />
          </div>

        </div>

      </div>

    </div>
  );
}
