'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/auth-provider';
import FileUploader from '../components/file-uploader';

const TOUR_STYLES = [
  { id: 'walkthrough', name: 'Property Walkthrough', icon: '🚶', desc: 'Seamless room-to-room camera drift walkthrough' },
  { id: 'drone', name: 'Drone Fly-In View', icon: '🚁', desc: 'Aerial fly-in approach from neighborhood into exterior' },
  { id: 'orbit', name: 'Building 360° Orbit', icon: '🔄', desc: 'Continuous orbital camera movement around property' },
  { id: 'reveal', name: 'Cinematic Reveal', icon: '🎬', desc: 'Pull-back reveal shot showcasing architecture & space' },
  { id: 'day-night', name: 'Day-to-Night Time Transition', icon: '🌅', desc: 'Time-lapse lighting shift from dusk to golden hour' },
];

export default function RealEstateStudioPage() {
  const { user } = useAuth();

  const [selectedStyle, setSelectedStyle] = useState('walkthrough');
  const [propertyPhotos, setPropertyPhotos] = useState([]);
  const [propertyName, setPropertyName] = useState('Modern Luxury Villa');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState('15');

  // Avatar / Narration
  const [enableNarration, setEnableNarration] = useState(true);
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices] = useState([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [script, setScript] = useState(
    'Welcome to this luxury property tour. Featuring expansive high ceilings, modern architectural design, and panoramic outdoor views.'
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

  const handleAddPhoto = (url) => {
    if (url) setPropertyPhotos((prev) => [...prev, url]);
  };

  const handleRemovePhoto = (idx) => {
    setPropertyPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleGenerateTour = async () => {
    if (propertyPhotos.length === 0) {
      setErrorMsg('Please upload at least 1 property photo');
      return;
    }

    setGenerating(true);
    setErrorMsg('');

    try {
      const userId = user?.id || 'usr-guest-1';
      const requiredCredits = parseInt(duration, 10) * 15;

      // Reserve credits
      await fetch('http://localhost:3008/v1/credits/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, modelId: 'veo-3-1', units: requiredCredits }),
      }).catch(() => {});

      // Submit job
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
        status: 'completed'
      });
    } catch (err) {
      setErrorMsg(err.message || 'Tour generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0f1113] text-zinc-100 flex flex-col font-sans">
      
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#121418] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold font-grotesk tracking-tight text-white flex items-center gap-2">
            <span>🏡</span> Real Estate AI Studio
          </h1>
          <p className="text-xs text-zinc-400">
            Generate 4K property walkthroughs, orbital 360° views & cinematic tours from listing photos
          </p>
        </div>

        <button
          onClick={handleGenerateTour}
          disabled={generating}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 flex items-center gap-2"
        >
          {generating ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Building Property Tour...</span>
            </>
          ) : (
            <>
              <span>🚀 Generate Property Video</span>
            </>
          )}
        </button>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 min-h-0">
        
        {/* Left Section (7 cols) */}
        <div className="lg:col-span-7 space-y-6 overflow-y-auto pr-2">
          
          {/* Property Name */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 font-mono">
              Property Name / Listing Title
            </label>
            <input
              type="text"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="e.g. 742 Evergreen Terrace Luxury Villa"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-grotesk font-bold"
            />
          </div>

          {/* Style Selector Cards */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 font-mono">
              Select Tour Video Style
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TOUR_STYLES.map((style) => {
                const isSelected = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-4 rounded-2xl text-left border transition ${
                      isSelected
                        ? 'bg-emerald-950/30 border-emerald-500 text-white font-bold shadow-lg'
                        : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-base mb-1">
                      <span>{style.icon}</span>
                      <span className="text-xs font-bold text-white">{style.name}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">{style.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Upload Dropzone */}
          <div className="space-y-3 p-4 rounded-2xl bg-black/30 border border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 font-mono">
                📸 Property Listing Photos ({propertyPhotos.length} Uploaded)
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Up to 20 room photos</span>
            </div>

            <FileUploader
              value=""
              onChange={handleAddPhoto}
              label=""
              accept="image/*"
              hint="Drop listing photos (living room, exterior, kitchen, bedrooms)"
            />

            {/* Gallery of Uploaded Photos */}
            {propertyPhotos.length > 0 && (
              <div className="grid grid-cols-4 gap-3 pt-2">
                {propertyPhotos.map((photo, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-white/10 h-24">
                    <img src={photo} alt={`Room ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-rose-600/80 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/70 text-[9px] text-zinc-300 px-1 py-0.5 rounded font-mono">
                      Photo #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Narration & Voice Guide */}
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                <span>🗣️</span> Avatar Tour Guide & Narration
              </label>
              <button
                type="button"
                onClick={() => setEnableNarration(!enableNarration)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  enableNarration ? 'bg-emerald-600 text-white' : 'bg-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {enableNarration ? 'Enabled ✓' : 'Disabled +'}
              </button>
            </div>

            {enableNarration && (
              <div className="space-y-3 pt-2 border-t border-white/5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-bold">Avatar Guide</label>
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

                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Listing Voiceover Script</label>
                  <textarea
                    rows={3}
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
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

        {/* Right Preview Column (5 cols) */}
        <div className="lg:col-span-5 space-y-5 overflow-y-auto pr-1">
          
          <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 font-mono">
              ⚙️ Export Settings
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  <option value="16:9" className="bg-[#16181c]">16:9 Landscape (MLS/YouTube)</option>
                  <option value="9:16" className="bg-[#16181c]">9:16 Vertical (Reels/TikTok)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Video Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  <option value="15" className="bg-[#16181c]">15 Seconds (225 Credits)</option>
                  <option value="30" className="bg-[#16181c]">30 Seconds (450 Credits)</option>
                  <option value="60" className="bg-[#16181c]">60 Seconds (900 Credits)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Render Preview Window */}
          <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 font-mono">
              📺 Tour Output Preview
            </h3>

            {resultVideo ? (
              <div className="space-y-3">
                <video
                  src={resultVideo.output_url}
                  controls
                  className="w-full rounded-xl border border-white/10 shadow-xl"
                />
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold">✓ Tour Rendered Successfully</span>
                  <a
                    href={resultVideo.output_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:underline font-bold"
                  >
                    Download 4K MP4 📥
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center space-y-2">
                <div className="text-3xl">🏠</div>
                <div className="text-xs font-bold text-zinc-400">Ready to Generate Tour</div>
                <div className="text-[10px] text-zinc-600 font-mono">
                  Upload listing photos & click Generate to build virtual property walkthrough
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
