'use client';

import { useState, useRef } from 'react';

export default function FileUploader({
  value,
  onChange,
  label = 'Upload Asset',
  accept = 'image/*,video/*',
  hint = 'Supports PNG, JPG, MP4 (Max 100MB)',
}) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = e.target.result;
        onChange(fileData);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert(err.message || 'File upload failed');
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
    }
  };

  return (
    <div className="space-y-1.5 font-sans">
      <div className="flex items-center justify-between">
        {label && <label className="text-xs font-bold uppercase text-zinc-400">{label}</label>}
        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5 text-[10px]">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2 py-0.5 rounded-md font-medium transition ${
              activeTab === 'upload' ? 'bg-purple-600/30 text-purple-300 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            📁 File Upload
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-2 py-0.5 rounded-md font-medium transition ${
              activeTab === 'url' ? 'bg-purple-600/30 text-purple-300 font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🔗 URL Link
          </button>
        </div>
      </div>

      {activeTab === 'upload' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => !value && fileInputRef.current?.click()}
          className={`p-4 rounded-2xl border-2 border-dashed transition cursor-pointer flex flex-col items-center justify-center gap-2 ${
            dragActive
              ? 'bg-purple-600/10 border-purple-500 scale-[0.99]'
              : value
              ? 'bg-[#16181c] border-purple-500/40'
              : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-black/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            className="hidden"
          />

          {value ? (
            <div className="w-full flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {value.startsWith('data:image') || value.includes('unsplash') || value.endsWith('.png') || value.endsWith('.jpg') ? (
                  <img src={value} alt="Preview" className="w-12 h-12 object-cover rounded-xl border border-white/10 shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-xl shrink-0">🎬</div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">Uploaded Media Ready</div>
                  <div className="text-[10px] text-zinc-400 font-mono truncate">{value.substring(0, 40)}...</div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition shrink-0"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="text-center space-y-1 py-1">
              <div className="text-2xl">📤</div>
              <div className="text-xs font-bold text-zinc-200">
                {uploading ? 'Uploading Asset...' : 'Drag & drop file here, or click to browse'}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">{hint}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://images.unsplash.com/... or media URL"
            className="flex-1 bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
