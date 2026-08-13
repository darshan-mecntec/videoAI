'use client';

import { useState, useEffect } from 'react';

export default function AssetSelectorModal({ isOpen, onClose, onSelectAsset, acceptedType = 'all' }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'upload'
  const [selectedUrl, setSelectedUrl] = useState('');

  // Fallback demo assets if asset-service is empty
  const DEMO_ASSETS = [
    { id: 'ast-1', name: 'Tokyo Street Lighting Ref.jpg', type: 'image', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&auto=format&fit=crop&q=80', date: 'Just now' },
    { id: 'ast-2', name: 'Cyberpunk Car Render.jpg', type: 'image', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600', date: '10m ago' },
    { id: 'ast-3', name: 'Luxury Villa Architectural Model.jpg', type: 'image', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600', date: '1h ago' },
    { id: 'ast-4', name: 'Sample Ad Commercial.mp4', type: 'video', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', date: '2h ago' },
  ];

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('http://localhost:3006/v1/assets')
        .then((r) => r.json())
        .then((data) => {
          if (data.assets && data.assets.length > 0) {
            setAssets(data.assets);
          } else {
            setAssets(DEMO_ASSETS);
          }
        })
        .catch(() => setAssets(DEMO_ASSETS))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredAssets = assets.filter((ast) => {
    if (acceptedType === 'image') return ast.type === 'image' || ast.url.match(/\.(jpg|png|webp|jpeg)/i);
    if (acceptedType === 'video') return ast.type === 'video' || ast.url.match(/\.(mp4|webm|mov)/i);
    return true;
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    onSelectAsset(objectUrl, file.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans select-none">
      <div className="w-full max-w-2xl bg-[#0e1118] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl relative text-zinc-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-extrabold font-grotesk text-white flex items-center gap-2">
              <span>🖼️</span> Select Asset from Library
            </h2>
            <p className="text-xs text-zinc-400">Choose previously uploaded media or upload a new file from your device</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 border-b border-white/10 pb-3">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-grotesk transition ${
              activeTab === 'library'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            📁 My Asset Library ({filteredAssets.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-grotesk transition ${
              activeTab === 'upload'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            📤 Upload New Asset
          </button>
        </div>

        {/* Library Tab View */}
        {activeTab === 'library' && (
          <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-zinc-500 font-mono">Loading assets...</div>
            ) : filteredAssets.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500 font-mono">No matching assets found in library.</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filteredAssets.map((ast) => {
                  const isSelected = selectedUrl === ast.url;
                  return (
                    <div
                      key={ast.id}
                      onClick={() => setSelectedUrl(ast.url)}
                      className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-[1.02]'
                          : 'border-white/10 hover:border-cyan-400/50'
                      }`}
                    >
                      <div className="aspect-video bg-black relative">
                        {ast.type === 'video' || ast.url.match(/\.mp4/i) ? (
                          <video src={ast.url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={ast.url} alt={ast.name} className="w-full h-full object-cover" />
                        )}
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[9px] font-mono text-cyan-300 uppercase font-bold">
                          {ast.type || 'media'}
                        </span>
                      </div>
                      <div className="p-2 bg-[#121622] text-[10px] font-bold text-zinc-300 truncate font-grotesk">
                        {ast.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Upload Tab View */}
        {activeTab === 'upload' && (
          <div className="p-8 border-2 border-dashed border-white/20 rounded-2xl text-center space-y-3 bg-black/40">
            <div className="text-3xl">📤</div>
            <div>
              <div className="text-sm font-bold text-white font-grotesk">Drag & drop files here</div>
              <div className="text-xs text-zinc-400">Supports JPG, PNG, WEBP, MP4, MOV up to 100MB</div>
            </div>
            <label className="inline-block px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs uppercase cursor-pointer transition shadow-lg shadow-cyan-500/20">
              Browse Files
              <input type="file" onChange={handleFileUpload} className="hidden" accept={acceptedType === 'image' ? 'image/*' : acceptedType === 'video' ? 'video/*' : '*'} />
            </label>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold text-xs transition"
          >
            Cancel
          </button>
          {activeTab === 'library' && (
            <button
              onClick={() => {
                if (selectedUrl) {
                  onSelectAsset(selectedUrl);
                  onClose();
                }
              }}
              disabled={!selectedUrl}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400 text-black font-extrabold text-xs uppercase tracking-wider transition disabled:opacity-40"
            >
              Confirm Selection
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
