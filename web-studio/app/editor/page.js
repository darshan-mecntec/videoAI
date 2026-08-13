'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../components/auth-provider';
import FileUploader from '../components/file-uploader';

const IMAGE_TOOLS = [
  { id: 'inpaint', name: 'Inpainting', icon: '🖌️', desc: 'Select area to generate & replace content', credits: 10 },
  { id: 'outpaint', name: 'Outpainting / Expand', icon: '↔️', desc: 'Extend canvas beyond image boundaries', credits: 15 },
  { id: 'bg-remove', name: 'Remove Background', icon: '🪄', desc: '1-click AI background isolation', credits: 5 },
  { id: 'bg-replace', name: 'Replace Background', icon: '🔄', desc: 'Swap background with AI prompt scene', credits: 10 },
  { id: 'obj-remove', name: 'Erase Object', icon: '🧹', desc: 'Remove object & reconstruct background', credits: 10 },
  { id: 'upscale', name: 'Upscale 4K/8K', icon: '⬆️', desc: 'Enhance resolution & sharpening', credits: 20 },
];

const VIDEO_TOOLS = [
  { id: 'video-swap', name: 'Pika Video Object Swap', icon: '🔄', desc: 'Replace specific object inside moving video', credits: 30 },
  { id: 'video-bg-remove', name: 'Video Green Screen', icon: '🪄', desc: 'Isolate subject & remove video background', credits: 20 },
  { id: 'video-lipsync', name: 'Lip Sync Audio', icon: '🎙️', desc: 'Sync audio track speech to video mouth', credits: 25 },
  { id: 'video-outpaint', name: 'Expand Video Frame', icon: '↔️', desc: 'Outpaint video margins in 16:9 or 9:16', credits: 25 },
  { id: 'video-add-element', name: 'Add Character/Object', icon: '✨', desc: 'Insert new element into existing video clip', credits: 30 },
];

export default function AIEditorPage() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('image'); // 'image' | 'video'
  const [selectedTool, setSelectedTool] = useState('inpaint');
  const [sourceMediaUrl, setSourceMediaUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [replacementBgPrompt, setReplacementBgPrompt] = useState('Sun-drenched tropical beach with turquoise water');

  const [processing, setProcessing] = useState(false);
  const [outputResultUrl, setOutputResultUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const currentToolObj = (activeTab === 'image' ? IMAGE_TOOLS : VIDEO_TOOLS).find(
    (t) => t.id === selectedTool
  ) || IMAGE_TOOLS[0];

  const handleApplyEdit = async () => {
    if (!sourceMediaUrl) {
      setErrorMsg('Please upload a source file to edit');
      return;
    }

    setProcessing(true);
    setErrorMsg('');

    try {
      const userId = user?.id || 'usr-guest-1';

      // Reserve credits
      await fetch('http://localhost:3008/v1/credits/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, modelId: selectedTool, units: currentToolObj.credits }),
      }).catch(() => {});

      // Simulate edit processing call
      setTimeout(() => {
        setOutputResultUrl(sourceMediaUrl);
        setProcessing(false);
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message || 'Edit operation failed');
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0f1113] text-zinc-100 flex flex-col font-sans">
      
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#121418] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold font-grotesk tracking-tight text-white flex items-center gap-2">
            <span>✏️</span> AI Image & Video Editor
          </h1>
          <p className="text-xs text-zinc-400">
            Inpainting, Outpainting, Background Swap, Object Removal & Video Swaps (Adobe Firefly / Pika Engine)
          </p>
        </div>

        {/* Tab Switcher: Image vs Video */}
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-xl bg-black/40 border border-white/10 flex gap-1 text-xs font-bold">
            <button
              onClick={() => {
                setActiveTab('image');
                setSelectedTool('inpaint');
              }}
              className={`px-4 py-1.5 rounded-lg transition ${
                activeTab === 'image' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              🖼️ Image Editor
            </button>
            <button
              onClick={() => {
                setActiveTab('video');
                setSelectedTool('video-swap');
              }}
              className={`px-4 py-1.5 rounded-lg transition ${
                activeTab === 'video' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              🎥 Video Editor
            </button>
          </div>

          <button
            onClick={handleApplyEdit}
            disabled={processing}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition disabled:opacity-50 flex items-center gap-2"
          >
            {processing ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Processing AI Edit...</span>
              </>
            ) : (
              <>
                <span>✨ Apply Edit (⚡ {currentToolObj.credits} cr)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 min-h-0">
        
        {/* Left Tools Column (4 cols) */}
        <div className="lg:col-span-4 space-y-4 overflow-y-auto pr-1">
          <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 font-mono">
            Choose AI Editing Tool
          </label>

          <div className="space-y-2">
            {(activeTab === 'image' ? IMAGE_TOOLS : VIDEO_TOOLS).map((tool) => {
              const isSelected = selectedTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  className={`w-full p-3.5 rounded-2xl text-left border transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-purple-600/20 border-purple-500 text-white font-bold shadow-inner'
                      : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{tool.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{tool.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate">{tool.desc}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold shrink-0">
                    ⚡ {tool.credits} cr
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center / Right Canvas & Options (8 cols) */}
        <div className="lg:col-span-8 space-y-5 overflow-y-auto pr-1">
          
          {/* Source File Upload Dropzone */}
          <FileUploader
            value={sourceMediaUrl}
            onChange={setSourceMediaUrl}
            label={`Source ${activeTab === 'image' ? 'Image' : 'Video'} File`}
            accept={activeTab === 'image' ? 'image/*' : 'video/*'}
            hint={`Upload ${activeTab === 'image' ? 'PNG, JPG' : 'MP4, MOV'} file to perform AI editing`}
          />

          {/* Contextual Prompt Options based on active tool */}
          {(selectedTool === 'inpaint' || selectedTool === 'video-swap' || selectedTool === 'video-add-element') && (
            <div className="space-y-1.5 p-4 rounded-2xl bg-black/30 border border-white/5">
              <label className="text-xs font-bold text-zinc-300">
                Describe What To Add / Replace
              </label>
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Add a sleek silver futuristic helmet to person, or swap car with a vintage Mustang..."
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          )}

          {selectedTool === 'bg-replace' && (
            <div className="space-y-1.5 p-4 rounded-2xl bg-black/30 border border-white/5">
              <label className="text-xs font-bold text-zinc-300">
                New Background Scene Prompt
              </label>
              <input
                type="text"
                value={replacementBgPrompt}
                onChange={(e) => setReplacementBgPrompt(e.target.value)}
                placeholder="e.g. Modern penthouse luxury living room overlooking Tokyo skyline at night"
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Result Preview Box */}
          <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 font-mono">
                🖼️ Edited Result Preview
              </h3>
              {outputResultUrl && (
                <a
                  href={outputResultUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-purple-400 font-mono font-bold hover:underline"
                >
                  Export & Save 📥
                </a>
              )}
            </div>

            {outputResultUrl ? (
              activeTab === 'image' ? (
                <img
                  src={outputResultUrl}
                  alt="Edited Result"
                  className="w-full max-h-96 object-contain rounded-xl border border-white/10"
                />
              ) : (
                <video
                  src={outputResultUrl}
                  controls
                  className="w-full max-h-96 object-cover rounded-xl border border-white/10"
                />
              )
            ) : (
              <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center space-y-2">
                <div className="text-3xl">✨</div>
                <div className="text-xs font-bold text-zinc-400">Ready to Edit</div>
                <div className="text-[10px] text-zinc-600 font-mono">
                  Upload a media file, choose your AI tool, and click Apply Edit
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
