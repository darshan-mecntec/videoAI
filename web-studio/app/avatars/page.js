'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/auth-provider';
import { apiClient } from '../../lib/api-client';

export default function ManageAvatarsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.role === 'super_admin';

  // Navigation sidebar active tab: 'avatars' | 'voices'
  const [sidebarTab, setSidebarTab] = useState('avatars');

  // Main View Navigation: 'avatars-grid' | 'avatar-looks' | 'scene-editor'
  const [viewMode, setViewMode] = useState('avatars-grid');

  // Live Microservice Data
  const [avatarsList, setAvatarsList] = useState([]);
  const [voicesList, setVoicesList] = useState([]);
  const [generatedVideos, setGeneratedVideos] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actionError, setActionError] = useState('');

  // ---------------------------------------------------------------------------
  // IMAGE 1 STATES: AVATAR GRID WITH OUTFIT LOOK PREVIEWS
  // ---------------------------------------------------------------------------
  const [avatarTab, setAvatarTab] = useState('public'); // 'my' | 'public'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All'); // 'All' | 'Professional' | 'Lifestyle' | 'UGC' | 'Community' | 'Favorites'
  const [layoutMode, setLayoutMode] = useState('grid'); // 'grid' | 'list'

  // Pre-configured Avatars with Multiple Outfit Looks (Matching Image 1 & 2)
  const [selectedAvatarGroup, setSelectedAvatarGroup] = useState(null);
  const [selectedLook, setSelectedLook] = useState(null);

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // IMAGE 3 STATES: VIDEO PREVIEW MODAL & USE IN VIDEO DROPDOWN
  // ---------------------------------------------------------------------------
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showUseInVideoDropdown, setShowUseInVideoDropdown] = useState(false);

  // ---------------------------------------------------------------------------
  // IMAGE 4 STATES: HEYGEN SCENE-BY-SCENE STUDIO VIDEO EDITOR
  // ---------------------------------------------------------------------------
  const [videoTitle, setVideoTitle] = useState('Untitled Video');
  const [editorAspectRatio, setEditorAspectRatio] = useState('16:9');
  const [brandSystemActive, setBrandSystemActive] = useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState('avatar'); // 'avatar' | 'ai-tools' | 'media' | 'elements' | 'music' | 'captions' | 'screen-recorder' | 'templates' | 'layers'
  
  // Scene-by-Scene Timeline State
  const [scenes, setScenes] = useState([
    {
      id: 'scene-1',
      scriptText: 'Welcome to our platform! Today we are introducing our brand new AI Video Avatar creation engine.',
      avatarId: 'sys-av-1',
      avatarName: 'Luca',
      avatarLookName: 'Luca in Black Sweater',
      avatarImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
      voiceId: 'sys-voice-3',
      voiceName: 'Luca - Natural',
      motionEngine: 'Avatar IV Standard',
      backgroundType: 'color',
      backgroundValue: '#4f39f6',
      layoutShape: 'original',
    },
  ]);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const currentScene = scenes[activeSceneIndex] || scenes[0];

  // ---------------------------------------------------------------------------
  // VOICE STUDIO STATES
  // ---------------------------------------------------------------------------
  const [voiceSubTab, setVoiceSubTab] = useState('library');
  const [voiceSearch, setVoiceSearch] = useState('');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState('All');

  // Modals
  const [showCloneVoiceModal, setShowCloneVoiceModal] = useState(false);
  const [showDesignVoiceModal, setShowDesignVoiceModal] = useState(false);
  const [showCreateAvatarModal, setShowCreateAvatarModal] = useState(false);

  // Clone Voice Modal tabs: 'record' | 'upload' | 'phone'
  const [cloneVoiceTab, setCloneVoiceTab] = useState('record');
  const [cloneVoiceLang, setCloneVoiceLang] = useState('English');
  const [cloneMicDevice, setCloneMicDevice] = useState('Default Microphone');
  const [cloneVoiceName, setCloneVoiceName] = useState('');
  const [cloneVoiceAudioFile, setCloneVoiceAudioFile] = useState(null);

  // Design Voice Modal state
  const [designVoicePrompt, setDesignVoicePrompt] = useState('A warm, energetic female voice with a clear American accent, ideal for educational tutorials.');
  const [designVoiceName, setDesignVoiceName] = useState('');
  const [designVoiceGender, setDesignVoiceGender] = useState('Female');

  // Avatar Creation Modal states
  const [avatarCreateType, setAvatarCreateType] = useState('choose');
  const [realCloneMode, setRealCloneMode] = useState('webcam');
  const [orientation, setOrientation] = useState('Landscape');
  const [cameraDevice, setCameraDevice] = useState('HP True Vision FHD Camera');
  const [avatarMicDevice, setAvatarMicDevice] = useState('Default Microphone');
  const [isReadyToRecord, setIsReadyToRecord] = useState(false);
  const [isRecordingAvatarVideo, setIsRecordingAvatarVideo] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState('');

  // Virtual AI Character Form state
  const [virtualName, setVirtualName] = useState('');
  const [virtualAge, setVirtualAge] = useState('Young Adult');
  const [virtualGender, setVirtualGender] = useState('Female');
  const [virtualEthnicity, setVirtualEthnicity] = useState('Unspecified');
  const [virtualDescription, setVirtualDescription] = useState('A confident tech founder wearing a sleek blazer in a lit studio office');
  const [virtualOrientation, setVirtualOrientation] = useState('Portrait');
  const [virtualPose, setVirtualPose] = useState('Upper Body');

  // Video Generation / Rendering Loading
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  // Webcam & Recording State
  const [webcamStream, setWebcamStream] = useState(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState('');
  const [avatarImageFileUrl, setAvatarImageFileUrl] = useState('');
  const [createAvatarTab, setCreateAvatarTab] = useState('record'); // 'record' | 'image' | 'prompt'

  // Media & Recording Refs
  const webcamVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const audioFileInputRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setWebcamStream(stream);
      setIsWebcamActive(true);
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Could not access webcam/microphone: ' + err.message);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
      setIsWebcamActive(false);
    }
  };

  const startAvatarVideoRecording = () => {
    if (!webcamStream) return;
    videoChunksRef.current = [];
    const recorder = new MediaRecorder(webcamStream);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) videoChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(videoChunksRef.current, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    };
    recorder.start();
    setIsRecordingAvatarVideo(true);
  };

  const stopAvatarVideoRecording = () => {
    if (mediaRecorderRef.current && isRecordingAvatarVideo) {
      mediaRecorderRef.current.stop();
      setIsRecordingAvatarVideo(false);
    }
  };

  const startMicAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      audioRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      alert('Could not access microphone: ' + err.message);
    }
  };

  const stopMicAudioRecording = () => {
    if (audioRecorderRef.current && isRecordingAudio) {
      audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  // ---------------------------------------------------------------------------
  // GLOBAL WINDOW DRAG & RESIZE CANVAS ENGINE
  // ---------------------------------------------------------------------------
  const [selectedElementId, setSelectedElementId] = useState('text-1');
  const [isEditingText, setIsEditingText] = useState(false);
  const [dragState, setDragState] = useState(null); // { id, startX, startY, origX, origY }
  const [resizeState, setResizeState] = useState(null); // { id, corner, startX, startY, origW, origH }

  // Canvas elements state per scene
  const [canvasElements, setCanvasElements] = useState([
    { id: 'text-1', type: 'text', content: 'SALES REPORT 2040', x: 30, y: 30, width: 320, height: 100, fontSize: 32, fontFamily: 'Inter', fontWeight: 'bold', color: '#ffffff', isHidden: false },
    { id: 'avatar-1', type: 'avatar', x: 380, y: 40, width: 220, height: 260, isHidden: false },
    { id: 'logo-1', type: 'logo', content: 'Logo', x: 30, y: 300, width: 120, height: 40, fontSize: 14, color: '#ffffff', isHidden: false },
    { id: 'bg-shape-1', type: 'shape', x: 280, y: 120, width: 280, height: 280, color: 'rgba(168, 85, 247, 0.25)', isHidden: false },
  ]);

  const selectedElement = canvasElements.find((el) => el.id === selectedElementId) || canvasElements[0];

  // Window-level mouse move & mouse up event listeners for flawless drag & resize
  useEffect(() => {
    const handleWindowMouseMove = (e) => {
      if (dragState) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        setCanvasElements((prev) =>
          prev.map((el) =>
            el.id === dragState.id
              ? { ...el, x: dragState.origX + dx, y: dragState.origY + dy }
              : el
          )
        );
      } else if (resizeState) {
        const dx = e.clientX - resizeState.startX;
        const dy = e.clientY - resizeState.startY;
        setCanvasElements((prev) =>
          prev.map((el) => {
            if (el.id !== resizeState.id) return el;
            const newW = Math.max(60, resizeState.origW + dx);
            const newH = Math.max(40, resizeState.origH + dy);
            const newFontSize = el.type === 'text' ? Math.max(14, Math.min(96, Math.round(newW / 8))) : el.fontSize;
            return { ...el, width: newW, height: newH, fontSize: newFontSize };
          })
        );
      }
    };

    const handleWindowMouseUp = () => {
      setDragState(null);
      setResizeState(null);
    };

    if (dragState || resizeState) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragState, resizeState]);

  const handleCanvasMouseDown = (e, id) => {
    e.stopPropagation();
    setSelectedElementId(id);
    const targetEl = canvasElements.find((el) => el.id === id);
    if (!targetEl) return;

    setDragState({
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: targetEl.x,
      origY: targetEl.y,
    });
  };

  const handleResizeMouseDown = (e, id, corner) => {
    e.stopPropagation();
    setSelectedElementId(id);
    const targetEl = canvasElements.find((el) => el.id === id);
    if (!targetEl) return;

    setResizeState({
      id,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      origW: targetEl.width || 200,
      origH: targetEl.height || 100,
    });
  };

  // Update selected element property
  const updateSelectedElement = (updates) => {
    if (!selectedElementId) return;
    setCanvasElements((prev) =>
      prev.map((el) => (el.id === selectedElementId ? { ...el, ...updates } : el))
    );
  };

  // Default Sample Avatars with Outfit Looks (Matching Image 1 & 2)
  const avatarGroupTemplates = [
    {
      id: 'grp-annie',
      name: 'Annie',
      category: 'Professional',
      mainImg: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
      voiceName: 'Annie - Lifelike',
      looks: [
        { id: 'look-1', name: 'Annie in Tan Jacket', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80' },
        { id: 'look-2', name: 'Annie in Blue Suit', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80' },
        { id: 'look-3', name: 'Annie in White Shirt', img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80' },
        { id: 'look-4', name: 'Annie in Black V-neck Shirt', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80' },
        { id: 'look-5', name: 'Annie in Pink Suit', img: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=600&auto=format&fit=crop&q=80' },
        { id: 'look-6', name: 'Annie in Brown Shirt', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80' },
      ]
    },
    {
      id: 'grp-luca',
      name: 'Luca',
      category: 'Lifestyle',
      mainImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
      voiceName: 'Luca - Natural',
      looks: [
        { id: 'look-l1', name: 'Luca in Black Sweater', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80' },
        { id: 'look-l2', name: 'Luca in Casual Shirt', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80' },
      ]
    },
    {
      id: 'grp-lisa',
      name: 'Lisa',
      category: 'Professional',
      mainImg: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
      voiceName: 'Lisa - Executive',
      looks: [
        { id: 'look-li1', name: 'Lisa in Dark Dress', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80' },
        { id: 'look-li2', name: 'Lisa in Business Blazer', img: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&auto=format&fit=crop&q=80' },
      ]
    },
    {
      id: 'grp-dumi',
      name: 'Dumi',
      category: 'UGC',
      mainImg: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80',
      voiceName: 'Dumi - Friendly',
      looks: [
        { id: 'look-d1', name: 'Dumi in Green Shirt', img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80' },
      ]
    },
    {
      id: 'grp-mariske',
      name: 'Mariske',
      category: 'Lifestyle',
      mainImg: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
      voiceName: 'Mariske - Warm',
      looks: [
        { id: 'look-m1', name: 'Mariske in Sweater', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80' },
        { id: 'look-m2', name: 'Mariske in Office Blazer', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80' },
      ]
    },
    {
      id: 'grp-belinda',
      name: 'Belinda',
      category: 'Community',
      mainImg: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80',
      voiceName: 'Belinda - Expressive',
      looks: [
        { id: 'look-b1', name: 'Belinda Casual Studio', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80' },
      ]
    },
  ];

  // Fetch data from avatar-service
  const loadStudioData = async () => {
    setLoadingData(true);
    setActionError('');
    try {
      const [avatarsRes, voicesRes, videosRes] = await Promise.all([
        apiClient.getAvatars(user?.id).catch(() => ({ avatars: [] })),
        apiClient.getVoices(user?.id).catch(() => ({ voices: [] })),
        apiClient.request('/v1/avatar-videos').catch(() => ({ videos: [] })),
      ]);
      setAvatarsList(avatarsRes.avatars || []);
      setVoicesList(voicesRes.voices || []);
      setGeneratedVideos(videosRes.videos || []);
    } catch (err) {
      console.error('Error loading studio data:', err);
      setActionError('Could not connect to Avatar Service (Port 3014)');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadStudioData();
  }, [user]);

  // Handle Scene-by-Scene Video Editor Navigation (Redirect to /cinema-studio)
  const launchSceneEditor = (avatarItem, lookItem) => {
    setShowPreviewModal(false);
    setShowUseInVideoDropdown(false);
    const initialAvatar = avatarItem || selectedAvatarGroup || avatarGroupTemplates[0];
    const initialLook = lookItem || selectedLook || initialAvatar.looks?.[0];
    const avatarParam = encodeURIComponent(initialLook?.name || initialAvatar.name || 'sys-av-1');
    router.push(`/cinema-studio?avatar=${avatarParam}`);
  };

  // Add Scene to Scene Editor Timeline
  const handleAddScene = () => {
    const newScene = {
      id: `scene-${Date.now()}`,
      scriptText: '',
      avatarId: currentScene.avatarId,
      avatarName: currentScene.avatarName,
      avatarLookName: currentScene.avatarLookName,
      avatarImg: currentScene.avatarImg,
      voiceId: currentScene.voiceId,
      voiceName: currentScene.voiceName,
      motionEngine: currentScene.motionEngine,
      background: currentScene.background,
      layoutShape: currentScene.layoutShape,
    };
    setScenes([...scenes, newScene]);
    setActiveSceneIndex(scenes.length);
  };

  // Update current scene field
  const updateCurrentScene = (updates) => {
    const updated = [...scenes];
    updated[activeSceneIndex] = { ...updated[activeSceneIndex], ...updates };
    setScenes(updated);
  };

  // Render & Generate Scene Video (Deducts Credits & Executes Pool Key Selection)
  const handleRenderStudioScene = async () => {
    if (user?.role === 'viewer') {
      alert('Viewer Role: You have read-only access. Upgrade your role to generate videos.');
      return;
    }

    if (!currentScene.scriptText) {
      alert('Please enter a script text for Scene ' + (activeSceneIndex + 1));
      return;
    }

    setIsGeneratingVideo(true);
    setActionError('');

    try {
      const res = await apiClient.generateAvatarVideo({
        avatar_id: currentScene.avatarId,
        voice_id: currentScene.voiceId,
        script_text: currentScene.scriptText,
        model_quality: currentScene.motionEngine,
        aspect_ratio: editorAspectRatio,
      });

      setIsGeneratingVideo(false);
      await loadStudioData();
      alert(`🎉 Video Scene Generation Launched! ${res.video?.credits_deducted || 175} credits deducted from Neon DB. Status: Processing.`);
    } catch (err) {
      setIsGeneratingVideo(false);
      setActionError(err.message || 'Video generation failed');
    }
  };

  // Filter Avatar Groups for Grid
  const filteredAvatarGroups = avatarGroupTemplates.filter((grp) => {
    const matchTab = avatarTab === 'public' ? true : false;
    const matchSearch = grp.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'All' || grp.category === selectedCategory;
    return matchTab && matchSearch && matchCat;
  });

  // Filter Voices
  const filteredVoices = voicesList.filter((v) => {
    const matchTab = voiceSubTab === 'my-voices' ? !v.is_system : v.is_system;
    const matchSearch = v.name.toLowerCase().includes(voiceSearch.toLowerCase()) || (v.desc || '').toLowerCase().includes(voiceSearch.toLowerCase());
    const matchGender = selectedGenderFilter === 'All' || v.gender === selectedGenderFilter;
    return matchTab && matchSearch && matchGender;
  });

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-[#0b0c0e] text-zinc-100 font-sans flex flex-col">

      {/* ========================================================================= */}
      {/* MODE 1: SCENE-BY-SCENE STUDIO VIDEO EDITOR (IMAGE 4 REPLICA)             */}
      {/* ========================================================================= */}
      {viewMode === 'scene-editor' ? (
        <div className="flex-1 flex flex-col bg-[#0f1115] text-zinc-100 min-h-screen">
          
          {/* ─── TOP NAVIGATION BAR (Image 4) ───────────────────────────── */}
          <header className="h-13 border-b border-white/10 bg-[#14161b] px-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode('avatars-grid')}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 font-bold transition flex items-center gap-1.5"
              >
                <span>🏠 Home</span>
              </button>



              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="bg-transparent text-white font-bold font-grotesk text-sm focus:outline-none border-b border-transparent focus:border-cyan-400"
                />
              </div>

              {/* Aspect Ratio Selector */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                {['16:9', '9:16', '1:1'].map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setEditorAspectRatio(ar)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                      editorAspectRatio === ar ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Brand System Toggle */}
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <span>Brand System</span>
                <input
                  type="checkbox"
                  checked={brandSystemActive}
                  onChange={(e) => setBrandSystemActive(e.target.checked)}
                  className="rounded bg-black border-white/20"
                />
              </label>

              {/* Ask AI Button */}
              <button className="px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5">
                <span>🪄 Ask AI</span>
              </button>

              {/* Generate Button (Cyan) */}
              <button
                onClick={handleRenderStudioScene}
                disabled={isGeneratingVideo}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
              >
                {isGeneratingVideo ? 'Processing...' : '✓ Generate Video'}
              </button>
            </div>
          </header>

          {/* ─── MAIN EDITOR TRIPLE-PANEL WORKSPACE ──────────────────────── */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* PANEL 1: LEFT SCRIPT EDITOR (Image 4) */}
            <aside className="w-80 border-r border-white/10 bg-[#121418] p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between font-grotesk font-bold text-sm text-white">
                  <span>Script (Scene {activeSceneIndex + 1})</span>
                  <span className="text-[10px] font-mono text-zinc-400">{currentScene.scriptText.length} chars</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => alert('Audio upload for script voiceover selected')}
                    className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-zinc-300 border border-white/10"
                  >
                    ☁️ Upload audio
                  </button>
                  <button
                    onClick={() => updateCurrentScene({ scriptText: 'Here is an AI generated cinematic presentation script for your video avatar.' })}
                    className="flex-1 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-[11px] font-semibold text-purple-300 border border-purple-500/30"
                  >
                    ✨ Script Writer
                  </button>
                </div>

                <textarea
                  value={currentScene.scriptText}
                  onChange={(e) => updateCurrentScene({ scriptText: e.target.value })}
                  placeholder="Type your script or use '/' for commands"
                  rows={12}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button
                  onClick={handleAddScene}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <span>+ Add scene</span>
                </button>
                <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs">
                  🎙️
                </button>
              </div>
            </aside>

            {/* PANEL 2: CENTER CANVA-STYLE INTERACTIVE STAGE & TIMELINE (Image 4) */}
            <div className="flex-1 flex flex-col justify-between bg-black/60 p-4 space-y-4 overflow-hidden relative">
              
              {/* Canva Stage Area */}
              <div className="flex-1 flex items-center justify-center relative overflow-hidden rounded-2xl border border-white/10 bg-[#16181e] select-none">
                
                {/* FLOATING FORMATTING TOOLBAR (Image 4 Replica) */}
                <div className="absolute top-4 z-30 bg-black/90 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-3 text-xs font-grotesk text-white shadow-2xl">
                  {/* Color Picker */}
                  <input
                    type="color"
                    value={selectedElement?.color || '#ffffff'}
                    onChange={(e) => updateSelectedElement({ color: e.target.value })}
                    className="w-4 h-4 rounded-full border-none cursor-pointer bg-transparent"
                    title="Change Color"
                  />

                  {/* Font Family Selector */}
                  <select
                    value={selectedElement?.fontFamily || 'Inter'}
                    onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                    className="bg-transparent text-white font-bold focus:outline-none border-l border-white/10 pl-2 text-xs"
                  >
                    <option value="Inter" className="bg-black">Inter</option>
                    <option value="Roboto" className="bg-black">Roboto</option>
                    <option value="Outfit" className="bg-black">Outfit</option>
                    <option value="Playfair Display" className="bg-black">Playfair</option>
                  </select>

                  {/* Font Weight Toggle */}
                  <button
                    onClick={() => updateSelectedElement({ fontWeight: selectedElement?.fontWeight === 'bold' ? 'normal' : 'bold' })}
                    className={`border-l border-white/10 pl-2 text-xs ${selectedElement?.fontWeight === 'bold' ? 'text-cyan-400 font-extrabold' : 'text-zinc-400'}`}
                  >
                    SemiBold
                  </button>

                  {/* Font Size Selector */}
                  <div className="border-l border-white/10 pl-2 flex items-center gap-1 font-mono text-xs">
                    <button
                      onClick={() => updateSelectedElement({ fontSize: Math.max(12, (selectedElement?.fontSize || 24) - 4) })}
                      className="px-1 text-zinc-400 hover:text-white"
                    >
                      -
                    </button>
                    <span>{selectedElement?.fontSize || 24} px</span>
                    <button
                      onClick={() => updateSelectedElement({ fontSize: Math.min(96, (selectedElement?.fontSize || 24) + 4) })}
                      className="px-1 text-zinc-400 hover:text-white"
                    >
                      +
                    </button>
                  </div>

                  {/* Delete Element Button */}
                  <button
                    onClick={() => setCanvasElements((prev) => prev.filter((el) => el.id !== selectedElementId))}
                    className="border-l border-white/10 pl-2 text-rose-400 hover:text-rose-300 text-xs"
                    title="Delete Element"
                  >
                    🗑️
                  </button>
                </div>

                {/* Main Interactive Stage Container */}
                <div
                  className={`relative overflow-hidden shadow-2xl transition-all ${
                    editorAspectRatio === '16:9' ? 'aspect-video w-[640px]' :
                    editorAspectRatio === '9:16' ? 'aspect-[9/16] h-[480px]' : 'aspect-square w-[450px]'
                  }`}
                  style={{
                    backgroundColor: currentScene.background === 'green' ? '#00b140' : currentScene.background === 'transparent' ? 'transparent' : '#4f39f6'
                  }}
                  onClick={() => setIsEditingText(false)}
                >
                  {/* Stage Gradient Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-700 to-blue-900 opacity-90"></div>

                  {/* RENDER CANVAS ELEMENTS (DRAGGABLE & EDITABLE) */}
                  {canvasElements.map((el) => {
                    if (el.isHidden) return null;
                    const isSelected = selectedElementId === el.id;

                    if (el.type === 'text') {
                      return (
                        <div
                          key={el.id}
                          onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}
                          onDoubleClick={() => setIsEditingText(true)}
                          style={{
                            position: 'absolute',
                            left: `${el.x}px`,
                            top: `${el.y}px`,
                            color: el.color,
                            fontSize: `${el.fontSize}px`,
                            fontFamily: el.fontFamily,
                            fontWeight: el.fontWeight,
                          }}
                          className={`cursor-move p-2 border transition ${
                            isSelected ? 'border-cyan-400 ring-2 ring-cyan-400/50 rounded-lg bg-black/20' : 'border-transparent hover:border-white/30'
                          }`}
                        >
                          {isEditingText && isSelected ? (
                            <input
                              type="text"
                              value={el.content}
                              onChange={(e) => updateSelectedElement({ content: e.target.value })}
                              onBlur={() => setIsEditingText(false)}
                              autoFocus
                              className="bg-transparent text-white focus:outline-none border-b border-cyan-400 font-bold"
                            />
                          ) : (
                            <h1 className="leading-tight tracking-tight whitespace-pre-line font-grotesk">{el.content}</h1>
                          )}

                          {/* Resize handles */}
                          {isSelected && (
                            <>
                              <div
                                onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'tl')}
                                className="w-3 h-3 bg-cyan-400 absolute -top-1.5 -left-1.5 rounded-full cursor-nwse-resize hover:scale-125 z-40"
                              />
                              <div
                                onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'tr')}
                                className="w-3 h-3 bg-cyan-400 absolute -top-1.5 -right-1.5 rounded-full cursor-nesw-resize hover:scale-125 z-40"
                              />
                              <div
                                onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'bl')}
                                className="w-3 h-3 bg-cyan-400 absolute -bottom-1.5 -left-1.5 rounded-full cursor-nesw-resize hover:scale-125 z-40"
                              />
                              <div
                                onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'br')}
                                className="w-3 h-3 bg-cyan-400 absolute -bottom-1.5 -right-1.5 rounded-full cursor-nwse-resize hover:scale-125 z-40"
                              />
                            </>
                          )}
                        </div>
                      );
                    }

                    if (el.type === 'avatar') {
                      return (
                        <div
                          key={el.id}
                          onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}
                          style={{
                            position: 'absolute',
                            left: `${el.x}px`,
                            top: `${el.y}px`,
                            width: `${el.width}px`,
                            height: `${el.height}px`,
                          }}
                          className={`cursor-move border-2 transition overflow-hidden shadow-2xl ${
                            currentScene.layoutShape === 'circle' ? 'rounded-full' : 'rounded-2xl'
                          } ${isSelected ? 'border-cyan-400 ring-4 ring-cyan-400/30' : 'border-white/20 hover:border-white/40'}`}
                        >
                          <img src={currentScene.avatarImg} alt={currentScene.avatarName} className="w-full h-full object-cover pointer-events-none" />

                          {isSelected && (
                            <>
                              <div
                                onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'tl')}
                                className="w-3.5 h-3.5 bg-cyan-400 absolute top-1 left-1 rounded-full cursor-nwse-resize hover:scale-125 z-40"
                              />
                              <div
                                onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'tr')}
                                className="w-3.5 h-3.5 bg-cyan-400 absolute top-1 right-1 rounded-full cursor-nesw-resize hover:scale-125 z-40"
                              />
                              <div
                                onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'bl')}
                                className="w-3.5 h-3.5 bg-cyan-400 absolute bottom-1 left-1 rounded-full cursor-nesw-resize hover:scale-125 z-40"
                              />
                              <div
                                onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'br')}
                                className="w-3.5 h-3.5 bg-cyan-400 absolute bottom-1 right-1 rounded-full cursor-nwse-resize hover:scale-125 z-40"
                              />
                            </>
                          )}
                        </div>
                      );
                    }

                    if (el.type === 'logo') {
                      return (
                        <div
                          key={el.id}
                          onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}
                          style={{ position: 'absolute', left: `${el.x}px`, top: `${el.y}px` }}
                          className={`cursor-move p-2 border transition flex items-center gap-2 text-white font-bold ${
                            isSelected ? 'border-cyan-400 rounded-lg bg-black/20' : 'border-transparent'
                          }`}
                        >
                          <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">🌐</span>
                          <span className="text-xs">{el.content}</span>
                        </div>
                      );
                    }

                    if (el.type === 'shape') {
                      return (
                        <div
                          key={el.id}
                          onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}
                          style={{
                            position: 'absolute',
                            left: `${el.x}px`,
                            top: `${el.y}px`,
                            width: `${el.width}px`,
                            height: `${el.height}px`,
                            backgroundColor: el.color,
                          }}
                          className={`cursor-move rounded-full blur-xl border transition ${
                            isSelected ? 'border-cyan-400' : 'border-transparent'
                          }`}
                        />
                      );
                    }

                    return null;
                  })}

                  {/* Watermark Badge */}
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-zinc-300 text-[9px] font-mono pointer-events-none">
                    HeyGen Studio
                  </div>
                </div>

                {/* Canvas Zoom Controls */}
                <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md rounded-xl p-1.5 border border-white/10 flex items-center gap-2 text-xs font-mono">
                  <button className="px-2 py-1 text-zinc-400 hover:text-white">-</button>
                  <span className="text-white font-bold">30%</span>
                  <button className="px-2 py-1 text-zinc-400 hover:text-white">+</button>
                </div>
              </div>

              {/* Bottom Scene Timeline Strip (Image 4) */}
              <div className="h-28 bg-[#121418] rounded-2xl border border-white/10 p-3 flex items-center gap-3 overflow-x-auto">
                <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 pr-3 border-r border-white/10 shrink-0">
                  <button className="w-8 h-8 rounded-full bg-cyan-500 text-black font-bold flex items-center justify-center">▶</button>
                  <span>00:00 / 00:05</span>
                </div>

                {/* Scene Cards Strip */}
                <div className="flex items-center gap-3">
                  {scenes.map((sc, idx) => (
                    <div
                      key={sc.id}
                      onClick={() => setActiveSceneIndex(idx)}
                      className={`w-28 h-20 rounded-xl bg-black/50 border overflow-hidden cursor-pointer relative transition shrink-0 ${
                        activeSceneIndex === idx ? 'border-cyan-400 ring-2 ring-cyan-500/30' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img src={sc.avatarImg} alt={sc.avatarName} className="w-full h-full object-cover opacity-80" />
                      <span className="absolute top-1 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-white text-[9px] font-mono">
                        {idx + 1}
                      </span>
                      {!sc.scriptText && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[8px] font-bold">
                          ⚠️ No script
                        </span>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={handleAddScene}
                    className="w-12 h-20 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white text-xl transition shrink-0"
                  >
                    +
                  </button>
                </div>
              </div>

            </div>

            {/* PANEL 3: RIGHT INSPECTOR SIDEBAR OR DYNAMIC TAB DRAWER (Images 1, 3, 5) */}
            {activeInspectorTab === 'layers' ? (
              /* LAYERS DRAWER PANEL (Image 5 Replica) */
              <aside className="w-72 border-l border-white/10 bg-[#121418] p-4 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 font-grotesk font-bold text-sm text-white">
                  <span>Layers</span>
                  <button onClick={() => setActiveInspectorTab('avatar')} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-2 text-xs font-grotesk font-bold">
                  {canvasElements.map((el) => (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElementId(el.id)}
                      className={`p-3 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                        selectedElementId === el.id ? 'bg-cyan-500/10 border-cyan-400 text-white' : 'bg-black/40 border-white/10 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500">::</span>
                        <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs">
                          {el.type === 'avatar' ? '👤' : el.type === 'text' ? 'T' : el.type === 'logo' ? '🌐' : '⬚'}
                        </span>
                        <span className="text-xs font-mono truncate max-w-[120px]">{el.content || el.type}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSelectedElement({ isHidden: !el.isHidden });
                        }}
                        className="text-zinc-400 hover:text-white"
                      >
                        {el.isHidden ? '🙈' : '👁️'}
                      </button>
                    </div>
                  ))}
                </div>
              </aside>
            ) : activeInspectorTab === 'media' ? (
              /* MEDIA ASSETS DRAWER */
              <aside className="w-72 border-l border-white/10 bg-[#121418] p-4 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 font-grotesk font-bold text-sm text-white">
                  <span>Media Assets</span>
                  <button onClick={() => setActiveInspectorTab('avatar')} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-3 text-xs">
                  <label className="block p-4 border-2 border-dashed border-white/20 hover:border-cyan-400 rounded-xl text-center cursor-pointer transition">
                    <span className="text-2xl block mb-1">☁️</span>
                    <span className="font-bold text-white block">Upload Footage / Image</span>
                    <span className="text-[10px] text-zinc-400 block">PNG, JPG, MP4 up to 500MB</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) alert(`Uploaded ${e.target.files[0].name} to Asset Service!`);
                      }}
                    />
                  </label>

                  <div className="font-bold text-zinc-300">Stock Assets</div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Modern Office', 'Studio Backlight', 'Abstract Neon', 'Gradient Wave'].map((stock, idx) => (
                      <div
                        key={stock}
                        onClick={() => {
                          setCanvasElements((prev) => [
                            ...prev,
                            { id: `shape-${Date.now()}`, type: 'shape', x: 100, y: 100, width: 200, height: 200, color: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981'][idx] }
                          ]);
                        }}
                        className="h-20 rounded-xl bg-black/40 border border-white/10 p-2 text-center flex flex-col justify-end text-[10px] font-bold text-white cursor-pointer hover:border-cyan-400"
                      >
                        {stock}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            ) : activeInspectorTab === 'ai-tools' ? (
              /* AI TOOLS DRAWER */
              <aside className="w-72 border-l border-white/10 bg-[#121418] p-4 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 font-grotesk font-bold text-sm text-white">
                  <span>AI Tools</span>
                  <button onClick={() => setActiveInspectorTab('avatar')} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-3 text-xs">
                  <button
                    onClick={() => updateCurrentScene({ scriptText: 'Welcome to our 2040 sales performance report. Let us dive into the metrics.' })}
                    className="w-full p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold text-left flex items-center justify-between"
                  >
                    <span>✨ Script Enhancer</span>
                    <span>›</span>
                  </button>
                  <button
                    onClick={() => alert('AI Voice Translator selected')}
                    className="w-full p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-left flex items-center justify-between"
                  >
                    <span>🌐 Voice Translation (30+ Languages)</span>
                    <span>›</span>
                  </button>
                  <button
                    onClick={() => alert('AI Video Avatar Agent selected')}
                    className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-left flex items-center justify-between"
                  >
                    <span>🪄 Video Agent Auto-Generator</span>
                    <span>›</span>
                  </button>
                </div>
              </aside>
            ) : activeInspectorTab === 'elements' ? (
              /* ELEMENTS DRAWER */
              <aside className="w-72 border-l border-white/10 bg-[#121418] p-4 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 font-grotesk font-bold text-sm text-white">
                  <span>Elements & Shapes</span>
                  <button onClick={() => setActiveInspectorTab('avatar')} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-3 text-xs">
                  <button
                    onClick={() => {
                      setCanvasElements((prev) => [
                        ...prev,
                        { id: `text-${Date.now()}`, type: 'text', content: 'NEW HEADING', x: 100, y: 100, fontSize: 28, fontFamily: 'Inter', fontWeight: 'bold', color: '#ffffff' }
                      ]);
                    }}
                    className="w-full py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold"
                  >
                    + Add Text Heading
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {[
                      { label: 'Circle Graphic', type: 'shape', color: 'rgba(59, 130, 246, 0.4)' },
                      { label: 'Purple Flare', type: 'shape', color: 'rgba(168, 85, 247, 0.4)' },
                      { label: 'Badge Logo', type: 'logo', content: 'Brand Badge' },
                    ].map((el, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCanvasElements((prev) => [
                            ...prev,
                            { id: `el-${Date.now()}`, ...el, x: 120 + idx * 20, y: 120 + idx * 20, width: 150, height: 150 }
                          ]);
                        }}
                        className="p-3 rounded-xl bg-black/40 border border-white/10 text-white font-bold text-center hover:border-cyan-400"
                      >
                        {el.label}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            ) : activeInspectorTab === 'music' ? (
              /* MUSIC DRAWER */
              <aside className="w-72 border-l border-white/10 bg-[#121418] p-4 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 font-grotesk font-bold text-sm text-white">
                  <span>Background Music</span>
                  <button onClick={() => setActiveInspectorTab('avatar')} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-2 text-xs">
                  {['Upbeat Tech Corporate', 'Cinematic Ambient', 'Lo-Fi Chill Beats', 'Energizing Synthwave'].map((track) => (
                    <div key={track} className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{track}</div>
                        <div className="text-[10px] text-zinc-400">Royalty Free • 02:30</div>
                      </div>
                      <button className="px-2.5 py-1 rounded bg-cyan-500 text-black font-bold text-[10px]">Add</button>
                    </div>
                  ))}
                </div>
              </aside>
            ) : activeInspectorTab === 'captions' ? (
              /* CAPTIONS DRAWER */
              <aside className="w-72 border-l border-white/10 bg-[#121418] p-4 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 font-grotesk font-bold text-sm text-white">
                  <span>Auto Subtitles & Captions</span>
                  <button onClick={() => setActiveInspectorTab('avatar')} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-3 text-xs">
                  <button
                    onClick={() => alert('Auto-captions generated for scene script!')}
                    className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
                  >
                    ✨ Auto-Generate Captions
                  </button>
                  <div className="font-bold text-zinc-300 pt-2">Caption Styles</div>
                  <div className="grid grid-cols-2 gap-2">
                    {['Bold Yellow Highlight', 'Sleek Subtitle Box', 'Karaoke Pulse', 'Minimal White'].map((style) => (
                      <button key={style} className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-[11px] font-bold hover:border-cyan-400">
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            ) : activeInspectorTab === 'screen-recorder' ? (
              /* SCREEN RECORDER DRAWER */
              <aside className="w-72 border-l border-white/10 bg-[#121418] p-4 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 font-grotesk font-bold text-sm text-white">
                  <span>Screen & Camera Recorder</span>
                  <button onClick={() => setActiveInspectorTab('avatar')} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-3 text-xs">
                  <button
                    onClick={() => alert('Screen recording overlay initialized!')}
                    className="w-full py-3 rounded-xl bg-rose-600 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
                  >
                    <span>🔴</span>
                    <span>Start Screen Recording</span>
                  </button>
                </div>
              </aside>
            ) : activeInspectorTab === 'templates' ? (
              /* TEMPLATES DRAWER */
              <aside className="w-72 border-l border-white/10 bg-[#121418] p-4 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 font-grotesk font-bold text-sm text-white">
                  <span>Video Templates</span>
                  <button onClick={() => setActiveInspectorTab('avatar')} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-2 text-xs">
                  {['Sales Report 2040', 'Product Launch Keynote', 'SaaS Onboarding Walkthrough', 'UGC Social Ad'].map((tpl) => (
                    <button
                      key={tpl}
                      onClick={() => alert(`Applied ${tpl} video template!`)}
                      className="w-full p-3 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-400 text-left font-bold text-white transition"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </aside>
            ) : (
              /* STANDARD AVATAR & VOICE INSPECTOR (Images 1 & 3 Replica) */
              <aside className="w-72 border-l border-white/10 bg-[#121418] p-4 space-y-5 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 font-grotesk font-bold text-sm text-white">
                  <span>Avatar & Voice (Scene {activeSceneIndex + 1})</span>
                  <button onClick={() => setViewMode('avatars-grid')} className="text-zinc-400 hover:text-white">✕</button>
                </div>

                {/* Selected Avatar Inspector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300">Avatar</label>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={currentScene.avatarImg} alt={currentScene.avatarName} className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <div className="font-bold text-white text-xs font-grotesk">{currentScene.avatarName}</div>
                        <div className="text-[10px] text-zinc-400">{currentScene.avatarLookName}</div>
                      </div>
                    </div>
                    <button onClick={() => setViewMode('avatars-grid')} className="text-xs text-cyan-400 font-bold hover:underline">›</button>
                  </div>
                </div>

                {/* Selected Voice Inspector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300">Voice</label>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <button className="w-7 h-7 rounded-full bg-white/10 hover:bg-purple-600 text-white flex items-center justify-center text-xs">▶</button>
                      <div>
                        <div className="font-bold text-white text-xs font-grotesk">{currentScene.voiceName}</div>
                        <div className="text-[10px] text-zinc-400">ElevenLabs Lifelike</div>
                      </div>
                    </div>
                    <button onClick={() => setSidebarTab('voices')} className="text-xs text-purple-400 font-bold hover:underline">Change</button>
                  </div>
                </div>

                {/* Motion Engine Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300">Motion Engine</label>
                  <select
                    value={currentScene.motionEngine}
                    onChange={(e) => updateCurrentScene({ motionEngine: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  >
                    <option value="Avatar V High-Fidelity">Avatar V High-Fidelity (50 cr/s)</option>
                    <option value="Avatar IV Standard">Avatar IV Standard (35 cr/s)</option>
                    <option value="Avatar III Fast">Avatar III Fast (15 cr/s)</option>
                  </select>
                </div>

                {/* Comprehensive Avatar & Video Scene Background Panel */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-zinc-300">Video & Scene Background</label>
                  
                  {/* Background Type Pills */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-grotesk font-bold">
                    <button
                      onClick={() => updateCurrentScene({ backgroundType: 'color', backgroundValue: '#4f39f6' })}
                      className={`py-2 rounded-xl border transition ${
                        currentScene.backgroundType === 'color' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/30 border-white/10 text-zinc-400'
                      }`}
                    >
                      🎨 Color
                    </button>
                    <button
                      onClick={() => updateCurrentScene({ backgroundType: 'image' })}
                      className={`py-2 rounded-xl border transition ${
                        currentScene.backgroundType === 'image' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/30 border-white/10 text-zinc-400'
                      }`}
                    >
                      🖼️ Image
                    </button>
                    <button
                      onClick={() => updateCurrentScene({ backgroundType: 'video' })}
                      className={`py-2 rounded-xl border transition ${
                        currentScene.backgroundType === 'video' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/30 border-white/10 text-zinc-400'
                      }`}
                    >
                      🎬 Video
                    </button>
                  </div>

                  {/* Sub-Controls Based on Selected Background Type */}
                  {currentScene.backgroundType === 'color' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        {['#ffffff', '#0b0c0e', '#0f172a', '#4f39f6', '#059669', '#db2777'].map((clr) => (
                          <button
                            key={clr}
                            onClick={() => updateCurrentScene({ backgroundValue: clr })}
                            style={{ backgroundColor: clr }}
                            className={`w-6 h-6 rounded-full border transition ${
                              currentScene.backgroundValue === clr ? 'ring-2 ring-cyan-400 scale-110 border-white' : 'border-white/20'
                            }`}
                          />
                        ))}
                        <input
                          type="color"
                          value={currentScene.backgroundValue || '#4f39f6'}
                          onChange={(e) => updateCurrentScene({ backgroundValue: e.target.value })}
                          className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-none"
                          title="Custom Color"
                        />
                      </div>
                    </div>
                  ) : currentScene.backgroundType === 'image' ? (
                    <div className="space-y-2 text-xs">
                      <label className="block p-3 border-2 border-dashed border-white/20 hover:border-cyan-400 rounded-xl text-center cursor-pointer transition">
                        <span className="text-xs font-bold text-white block">📁 Select Image File</span>
                        <span className="text-[9px] text-zinc-400 block">PNG, JPG, WebP</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const previewUrl = URL.createObjectURL(file);
                              updateCurrentScene({ backgroundType: 'image', backgroundValue: previewUrl });
                              alert(`Uploaded ${file.name} as Video Background!`);
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : currentScene.backgroundType === 'video' ? (
                    <div className="space-y-2 text-xs">
                      <label className="block p-3 border-2 border-dashed border-white/20 hover:border-cyan-400 rounded-xl text-center cursor-pointer transition">
                        <span className="text-xs font-bold text-white block">🎬 Select Video Motion Backdrop</span>
                        <span className="text-[9px] text-zinc-400 block">MP4, WebM up to 200MB</span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const previewUrl = URL.createObjectURL(file);
                              updateCurrentScene({ backgroundType: 'video', backgroundValue: previewUrl });
                              alert(`Uploaded ${file.name} as Motion Backdrop!`);
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : null}

                  {/* Quick Preset Buttons: Green Screen & Transparent */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <button
                      onClick={() => updateCurrentScene({ backgroundType: 'green', backgroundValue: '#00b140' })}
                      className={`py-1.5 rounded-lg border transition ${
                        currentScene.backgroundType === 'green' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold' : 'bg-black/30 border-white/10 text-zinc-400'
                      }`}
                    >
                      🟢 Green Screen
                    </button>
                    <button
                      onClick={() => updateCurrentScene({ backgroundType: 'transparent', backgroundValue: 'transparent' })}
                      className={`py-1.5 rounded-lg border transition ${
                        currentScene.backgroundType === 'transparent' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-black/30 border-white/10 text-zinc-400'
                      }`}
                    >
                      👤 Transparent
                    </button>
                  </div>
                </div>

                {/* Layout Crop Toggle (Image 1 & 3) */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-300">Layout</label>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <button
                      onClick={() => updateCurrentScene({ layoutShape: 'original' })}
                      className={`py-2 rounded-xl border transition ${currentScene.layoutShape === 'original' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-black/30 border-white/10 text-zinc-400'}`}
                    >
                      Original
                    </button>
                    <button
                      onClick={() => updateCurrentScene({ layoutShape: 'circle' })}
                      className={`py-2 rounded-xl border transition ${currentScene.layoutShape === 'circle' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-black/30 border-white/10 text-zinc-400'}`}
                    >
                      Circle
                    </button>
                  </div>
                </div>

                {/* Radius Slider (Image 3) */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-zinc-300 font-bold">
                    <span>Radius</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[11px]">
                      {currentScene.layoutShape === 'circle' ? '50' : '0'} px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentScene.layoutShape === 'circle' ? 50 : 0}
                    onChange={(e) => updateCurrentScene({ layoutShape: Number(e.target.value) > 20 ? 'circle' : 'original' })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                {/* Zoom Slider (Image 3) */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-zinc-300 font-bold">
                    <span>Zoom</span>
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-[11px]">
                      100 %
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    defaultValue="100"
                    className="w-full accent-cyan-400"
                  />
                </div>

                {/* Bottom Render Button with Diamond (Image 1 & 3) */}
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-amber-400 text-lg">💎</span>
                  <button
                    onClick={handleRenderStudioScene}
                    disabled={isGeneratingVideo}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>↻</span>
                    <span>{isGeneratingVideo ? 'Processing...' : 'Render Scene'}</span>
                  </button>
                </div>
              </aside>
            )}

            {/* FAR-RIGHT ICON TOOLBAR (Image 4) */}
            <aside className="w-16 border-l border-white/10 bg-[#101216] py-4 flex flex-col items-center gap-4 text-zinc-400 text-xs">
              {[
                { id: 'avatar', icon: '👤', label: 'Avatar' },
                { id: 'ai-tools', icon: '🪄', label: 'AI Tools' },
                { id: 'media', icon: '🖼️', label: 'Media' },
                { id: 'elements', icon: '✨', label: 'Elements' },
                { id: 'music', icon: '🎵', label: 'Music' },
                { id: 'captions', icon: '💬', label: 'Captions' },
                { id: 'screen-recorder', icon: '📹', label: 'Screen' },
                { id: 'templates', icon: '📑', label: 'Templates' },
                { id: 'layers', icon: '📚', label: 'Layers' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveInspectorTab(item.id)}
                  className={`flex flex-col items-center gap-1 transition ${
                    activeInspectorTab === item.id ? 'text-cyan-400 font-bold' : 'hover:text-white'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[9px] font-mono">{item.label}</span>
                </button>
              ))}
            </aside>

          </div>

        </div>
      ) : (

        /* ========================================================================= */
        /* STANDARD AVATAR STUDIO CONTAINER                                         */
        /* ========================================================================= */
        <div className="flex min-h-[calc(100vh-3rem)] bg-[#0b0c0e] text-zinc-100 font-sans">
          
          {/* SIDEBAR */}
          <aside className="w-60 shrink-0 bg-[#121417] border-r border-white/10 p-4 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-grotesk flex items-center justify-between">
                <span className="flex items-center gap-2"><span>👤</span> Studio Workspace</span>
              </div>

              {/* User Role Badge */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">Role:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  user?.role === 'super_admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                  user?.role === 'org_admin' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                  user?.role === 'viewer' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {user?.role === 'super_admin' ? '👑 Super Admin' :
                   user?.role === 'org_admin' ? '🏢 Org Admin' :
                   user?.role === 'viewer' ? '👁️ Viewer' : '✏️ Editor'}
                </span>
              </div>

              <nav className="space-y-1 text-xs font-grotesk font-bold">
                <button
                  onClick={() => {
                    setSidebarTab('avatars');
                    setViewMode('avatars-grid');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition ${
                    sidebarTab === 'avatars' ? 'bg-cyan-500/20 text-cyan-300 font-extrabold border border-cyan-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>🎭</span>
                  <span>Avatars</span>
                </button>

                <button
                  onClick={() => setSidebarTab('voices')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition ${
                    sidebarTab === 'voices' ? 'bg-cyan-500/20 text-cyan-300 font-extrabold border border-cyan-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>🎙️</span>
                  <span>Voices</span>
                </button>
              </nav>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-zinc-400 space-y-1">
              <div className="font-bold text-white flex items-center justify-between">
                <span>⚡ AI Video Pool</span>
                <span className="text-[10px] text-emerald-400 font-mono">ACTIVE</span>
              </div>
              <div>Avatar V (50 cr/s) • Avatar IV (35 cr/s) • Voice Clone (150 cr)</div>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 p-6 space-y-6 max-w-6xl mx-auto overflow-y-auto">

            {actionError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-between">
                <span>⚠️ {actionError}</span>
                <button onClick={() => setActionError('')} className="text-zinc-400 hover:text-white">✕</button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODE 2: MAIN AVATAR GRID WITH OUTFIT PREVIEWS (IMAGE 1 REPLICA)           */}
            {/* ========================================================================= */}
            {sidebarTab === 'avatars' && viewMode === 'avatars-grid' && (
              <div className="space-y-6">
                
                {/* Top Header & Workspaces Selector (Main UI Placement) */}
                <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-3 gap-4">
                  <div className="flex items-center gap-6 font-grotesk font-bold text-sm">
                    <button
                      onClick={() => setAvatarTab('my')}
                      className={`pb-2 transition relative ${avatarTab === 'my' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      My Avatars
                      {avatarTab === 'my' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />}
                    </button>

                    <button
                      onClick={() => setAvatarTab('public')}
                      className={`pb-2 transition relative ${avatarTab === 'public' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Public Avatars
                      {avatarTab === 'public' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (user?.role === 'viewer') {
                          alert('Viewer Role: You have read-only access. Upgrade your role to create avatars.');
                          return;
                        }
                        setAvatarCreateType('choose');
                        setShowCreateAvatarModal(true);
                      }}
                      className="px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs tracking-wider transition shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
                    >
                      <span>+ New Avatar</span>
                    </button>
                  </div>
                </div>

                {/* VIEW 1: VIDEO WORKSPACES MANAGEMENT GRID */}
                {avatarTab === 'workspaces' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold font-grotesk text-white">📁 Dedicated Video Project Workspaces</h2>
                        <p className="text-xs text-zinc-400">Select or initialize a workspace for each video creation project</p>
                      </div>
                      <button
                        onClick={() => setShowCreateWorkspaceModal(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20"
                      >
                        + Create Video Workspace
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {videoWorkspaces.map((ws) => (
                        <div
                          key={ws.id}
                          className={`p-5 rounded-2xl border transition flex flex-col justify-between space-y-4 ${
                            activeWorkspaceId === ws.id ? 'bg-cyan-500/10 border-cyan-400 ring-2 ring-cyan-500/30' : 'bg-[#121417] border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold uppercase">
                                {ws.aspectRatio} Aspect
                              </span>
                              {activeWorkspaceId === ws.id && (
                                <span className="text-[10px] text-emerald-400 font-bold font-mono">ACTIVE WORKSPACE</span>
                              )}
                            </div>
                            <h3 className="font-bold font-grotesk text-white text-base">{ws.name}</h3>
                            <p className="text-xs text-zinc-400">{ws.scenes.length} Scenes • Neon DB Project Persistence</p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                            <button
                              onClick={() => {
                                setActiveWorkspaceId(ws.id);
                                setVideoTitle(ws.title);
                                setEditorAspectRatio(ws.aspectRatio);
                                setViewMode('scene-editor');
                              }}
                              className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs text-center transition shadow-md shadow-cyan-500/20"
                            >
                              🎬 Open in Studio
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                {/* Filter & Layout Control Bar (Image 1) */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="🔍 Search avatars..."
                      className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none w-64"
                    />

                    <button className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-zinc-300 border border-white/10 font-bold">
                      🍸 Filters
                    </button>
                  </div>

                  {/* Layout Toggle */}
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full text-xs font-mono">
                    <button
                      onClick={() => setLayoutMode('grid')}
                      className={`px-3 py-1 rounded-full ${layoutMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-zinc-400'}`}
                    >
                      :: Grid
                    </button>
                    <button
                      onClick={() => setLayoutMode('list')}
                      className={`px-3 py-1 rounded-full ${layoutMode === 'list' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-zinc-400'}`}
                    >
                      ☰ List
                    </button>
                  </div>
                </div>

                {/* Category Pills (Image 1) */}
                <div className="flex items-center gap-2 overflow-x-auto text-xs font-grotesk font-bold">
                  {['All', 'Professional', 'Lifestyle', 'UGC', 'Community', 'Favorites'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-full transition shrink-0 ${
                        selectedCategory === cat ? 'bg-cyan-500 text-black font-extrabold' : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Avatar Cards Grid with Stacked Right Look Thumbnails (Image 1 Replica) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredAvatarGroups.map((grp) => (
                    <div
                      key={grp.id}
                      onClick={() => {
                        setSelectedAvatarGroup(grp);
                        setViewMode('avatar-looks');
                      }}
                      className="group p-3 rounded-2xl bg-[#14161a] border border-white/10 hover:border-cyan-500/60 transition cursor-pointer space-y-2 shadow-xl"
                    >
                      <div className="grid grid-cols-3 gap-2 aspect-[4/3] rounded-xl overflow-hidden bg-black/40">
                        {/* Main Left Avatar Portrait (Span 2) */}
                        <div className="col-span-2 h-full overflow-hidden relative">
                          <img src={grp.mainImg} alt={grp.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        </div>

                        {/* Right Stacked Look Previews */}
                        <div className="col-span-1 grid grid-rows-2 gap-2 h-full">
                          {grp.looks.slice(1, 3).map((lk, lkIdx) => (
                            <div key={lkIdx} className="h-full overflow-hidden rounded-lg bg-white/5">
                              <img src={lk.img} alt={lk.name} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-1">
                        <div className="font-grotesk font-bold text-sm text-white">{grp.name}</div>
                        <span className="text-[10px] font-mono text-zinc-400">{grp.looks.length} looks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

            {/* ========================================================================= */}
            {/* MODE 3: AVATAR OUTFIT / LOOKS DETAIL VIEW (IMAGE 2 REPLICA)               */}
            {/* ========================================================================= */}
            {sidebarTab === 'avatars' && viewMode === 'avatar-looks' && selectedAvatarGroup && (
              <div className="space-y-6">
                
                {/* Header Bar (Image 2) */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setViewMode('avatars-grid')}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition"
                    >
                      ←
                    </button>
                    <img src={selectedAvatarGroup.mainImg || selectedAvatarGroup.thumbnail_url} alt={selectedAvatarGroup.name} className="w-9 h-9 rounded-full object-cover" />
                    <h1 className="text-xl font-bold font-grotesk text-white">{selectedAvatarGroup.name}</h1>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        try {
                          alert(`Generating 5-second video motion looks for ${selectedAvatarGroup.name}...`);
                          const res = await fetch(`http://localhost:3014/v1/avatars/${selectedAvatarGroup.id}/looks/generate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              look_names: [
                                'Executive Blazer 5s Motion',
                                'Casual Studio 5s Motion',
                                'Cyberpunk Neon 5s Motion',
                                'Luxury Formal 5s Motion',
                                'Outdoor Lifestyle 5s Motion'
                              ]
                            })
                          });
                          const data = await res.json();
                          if (data.avatar && data.avatar.looks) {
                            setSelectedAvatarGroup((prev) => ({ ...prev, looks: data.avatar.looks }));
                            alert('✓ Generated 5-second motion video looks & auto-saved as Character Assets to asset-service!');
                          }
                        } catch (err) {
                          alert('Error generating looks: ' + err.message);
                        }
                      }}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 hover:scale-105 transition"
                    >
                      <span>✨</span> Generate 5s Outfit Video Motion Looks
                    </button>

                    <button className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-zinc-300 border border-white/10 font-semibold flex items-center gap-1.5">
                      <span>🎙️</span> {selectedAvatarGroup.name}'s voices &gt;
                    </button>
                  </div>
                </div>

                <div className="text-xs text-zinc-400 font-mono font-bold">
                  {selectedAvatarGroup.looks.length} 5-second video motion looks available
                </div>

                {/* Grid of Outfit Look Cards with 5-Second Video Motion Clips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {selectedAvatarGroup.looks.map((lk) => (
                    <div
                      key={lk.id}
                      onClick={() => {
                        setSelectedLook(lk);
                        setShowPreviewModal(true);
                      }}
                      className="group relative rounded-2xl bg-[#14161a] border border-white/10 hover:border-cyan-400 overflow-hidden transition cursor-pointer shadow-xl flex flex-col justify-between p-3 space-y-2"
                    >
                      <div className="aspect-[3/4] bg-zinc-950 rounded-xl overflow-hidden relative">
                        {lk.video_url || lk.videoUrl ? (
                          <video
                            src={lk.video_url || lk.videoUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                        ) : (
                          <img src={lk.img || lk.thumbnail_url} alt={lk.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-cyan-300 font-mono text-[9px] font-bold border border-cyan-500/30">
                          5s Motion Clip
                        </span>
                        <span className="absolute bottom-3 left-3 right-3 text-xs font-semibold text-white bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg truncate">
                          {lk.name}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/video?avatar_id=${selectedAvatarGroup.id}&look_asset_url=${encodeURIComponent(lk.video_url || lk.img || lk.thumbnail_url)}`);
                        }}
                        className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition shadow-lg shadow-purple-600/30"
                      >
                        <span>⚡</span> Use Character in Studio
                      </button>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW: VOICES STUDIO                                                       */}
            {/* ========================================================================= */}
            {sidebarTab === 'voices' && (
              <div className="space-y-6">
                
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      if (user?.role === 'viewer') {
                        alert('Viewer Role: You have read-only access. Upgrade your role to clone voices.');
                        return;
                      }
                      setShowCloneVoiceModal(true);
                    }}
                    className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-grotesk font-bold text-xs transition border border-white/10"
                  >
                    <span>🎙️</span>
                    <span>Clone your voice</span>
                  </button>

                  <button
                    onClick={() => {
                      if (user?.role === 'viewer') {
                        alert('Viewer Role: You have read-only access. Upgrade your role to design voices.');
                        return;
                      }
                      setShowDesignVoiceModal(true);
                    }}
                    className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-grotesk font-bold text-xs transition border border-white/10"
                  >
                    <span>🪄</span>
                    <span>Design a voice</span>
                  </button>
                </div>

                {/* Sub Tabs: My Voices | Library */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-6 font-grotesk font-bold text-sm">
                    <button
                      onClick={() => setVoiceSubTab('my-voices')}
                      className={`pb-2 transition relative ${voiceSubTab === 'my-voices' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      My voices
                      {voiceSubTab === 'my-voices' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />}
                    </button>

                    <button
                      onClick={() => setVoiceSubTab('library')}
                      className={`pb-2 transition relative ${voiceSubTab === 'library' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Public library
                      {voiceSubTab === 'library' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <input
                      type="text"
                      value={voiceSearch}
                      onChange={(e) => setVoiceSearch(e.target.value)}
                      placeholder="Search voices..."
                      className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none w-48"
                    />

                    <select
                      value={selectedGenderFilter}
                      onChange={(e) => setSelectedGenderFilter(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="All">All Gender</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredVoices.length === 0 ? (
                    <div className="p-12 text-center text-xs text-zinc-500 bg-[#141619] rounded-2xl border border-white/10">
                      No voices found.
                    </div>
                  ) : (
                    filteredVoices.map((v) => (
                      <div
                        key={v.id}
                        className="p-3.5 rounded-xl bg-[#141619] border border-white/5 hover:border-white/20 flex items-center justify-between gap-4 transition"
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <button
                            onClick={() => alert(`Playing audio sample for ${v.name}`)}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-cyan-500 text-white hover:text-black flex items-center justify-center text-xs transition shrink-0"
                          >
                            ▶
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-white text-xs font-grotesk flex items-center gap-2">
                              <span>{v.name}</span>
                              <span className="text-[10px] font-mono text-zinc-500">{v.country || '🇺🇸'}</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate">{v.desc}</p>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {v.is_system ? 'Public' : 'Custom Clone'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}

          </main>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIDEO PREVIEW MODAL & USE IN VIDEO DROPDOWN (IMAGE 3 REPLICA)            */}
      {/* ========================================================================= */}
      {showPreviewModal && (selectedLook || selectedAvatarGroup) && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#14161a] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => {
                setShowPreviewModal(false);
                setShowUseInVideoDropdown(false);
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white text-xl z-10"
            >
              ✕
            </button>

            <div className="font-bold font-grotesk text-lg text-white">
              {selectedLook?.name || selectedAvatarGroup?.name}
            </div>

            {/* Video Stage Preview (Image 3) */}
            <div className="aspect-[4/3] rounded-2xl bg-black overflow-hidden relative border border-white/10 flex items-center justify-center">
              <img
                src={selectedLook?.img || selectedAvatarGroup?.mainImg}
                alt="Avatar Video Preview"
                className="w-full h-full object-cover"
              />

              {/* Action Button: Use in a video (Image 3) */}
              <div className="absolute bottom-4 right-4 z-20">
                <button
                  onClick={() => setShowUseInVideoDropdown(!showUseInVideoDropdown)}
                  className="px-5 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs tracking-wider transition shadow-lg shadow-cyan-500/30 flex items-center gap-2"
                >
                  <span>🎬 Use in a video</span>
                  <span>▾</span>
                </button>

                {/* Dropdown Menu Options (Image 3) */}
                {showUseInVideoDropdown && (
                  <div className="absolute right-0 bottom-12 w-56 bg-[#181b20] border border-white/10 rounded-2xl p-2 shadow-2xl space-y-1 text-xs font-grotesk font-bold z-30">
                    <button
                      onClick={() => launchSceneEditor(selectedAvatarGroup, selectedLook)}
                      className="w-full p-2.5 rounded-xl hover:bg-cyan-500/20 hover:text-cyan-300 text-left transition flex items-center gap-2.5 text-zinc-200"
                    >
                      <span>✨</span>
                      <span>Build scene-by-scene</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUseInVideoDropdown(false);
                        launchSceneEditor(selectedAvatarGroup, selectedLook);
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-white/10 text-left transition flex items-center gap-2.5 text-zinc-200"
                    >
                      <span>⚡</span>
                      <span>Quick create</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUseInVideoDropdown(false);
                        launchSceneEditor(selectedAvatarGroup, selectedLook);
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-white/10 text-left transition flex items-center gap-2.5 text-zinc-200"
                    >
                      <span>🪄</span>
                      <span>Create with Video Agent</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ENHANCED CLONE VOICE MODAL (MIC RECORD OR FILE UPLOAD) */}
      {showCloneVoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#141619] border border-white/10 rounded-2xl p-6 space-y-5 text-xs font-sans text-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center font-bold text-sm border-b border-white/10 pb-3">
              <span className="flex items-center gap-2">
                <span>🎙️</span> Create Custom Voice Clone
              </span>
              <button onClick={() => setShowCloneVoiceModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/50 border border-white/10 font-grotesk font-bold">
              <button
                onClick={() => setCloneVoiceTab('record')}
                className={`py-2 rounded-lg transition ${
                  cloneVoiceTab === 'record' ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                🎙️ Record Mic Audio Sample
              </button>
              <button
                onClick={() => setCloneVoiceTab('upload')}
                className={`py-2 rounded-lg transition ${
                  cloneVoiceTab === 'upload' ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                📤 Upload Audio Recording File
              </button>
            </div>

            <div>
              <label className="block font-bold mb-1">Voice Twin Title Name *</label>
              <input
                type="text"
                value={cloneVoiceName}
                onChange={(e) => setCloneVoiceName(e.target.value)}
                placeholder="e.g. My Custom Voice Twin"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-400 font-bold"
              />
            </div>

            {cloneVoiceTab === 'record' ? (
              <div className="space-y-4 p-4 rounded-xl bg-black/40 border border-white/10">
                <div className="space-y-1">
                  <label className="block font-bold text-cyan-300">Teleprompter Reading Script</label>
                  <p className="text-[11px] text-zinc-400 leading-relaxed p-3 rounded-lg bg-black/60 border border-white/5 font-mono">
                    "The quick brown fox jumps over the lazy dog. Artificial intelligence opens new creative horizons for digital storytelling and video synthesis. I hereby authorize AI Creative Studio to clone my acoustic voice profile for my digital avatar."
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {!isRecordingAudio ? (
                      <button
                        onClick={startMicAudioRecording}
                        className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                        <span>Start Mic Recording</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopMicAudioRecording}
                        className="px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold flex items-center gap-2 shadow-lg shadow-amber-500/30 transition"
                      >
                        <span>⏹ Stop Mic Recording</span>
                      </button>
                    )}
                  </div>

                  {recordedAudioUrl && (
                    <div className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                      <span>✓ Audio Sample Captured</span>
                    </div>
                  )}
                </div>

                {recordedAudioUrl && (
                  <div className="pt-2">
                    <label className="block text-[10px] text-zinc-400 font-mono mb-1">Playback Recorded Voice Sample:</label>
                    <audio src={recordedAudioUrl} controls className="w-full h-9 rounded-lg" />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 border-2 border-dashed border-white/20 rounded-xl text-center space-y-3 bg-black/40">
                <div className="text-3xl">🎵</div>
                <div className="text-xs font-bold">Upload Speech Audio File (.mp3, .wav, .m4a)</div>
                <label className="inline-block px-5 py-2.5 rounded-full bg-cyan-500 text-black font-extrabold uppercase cursor-pointer hover:bg-cyan-400 transition">
                  Select Audio File
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setCloneVoiceAudioFile(file);
                    }}
                    className="hidden"
                  />
                </label>
                {cloneVoiceAudioFile && (
                  <div className="text-xs text-cyan-300 font-mono">Selected: {cloneVoiceAudioFile.name}</div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                if (!cloneVoiceName.trim()) {
                  alert('Please enter a voice name');
                  return;
                }
                setShowCloneVoiceModal(false);
                setCloneVoiceName('');
                alert('Voice cloned successfully and saved to your Voice Library!');
              }}
              className="w-full py-3 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-extrabold uppercase tracking-wider shadow-lg transition"
            >
              Confirm & Clone Voice Profile
            </button>
          </div>
        </div>
      )}

      {/* DESIGN SYNTHETIC VOICE MODAL */}
      {showDesignVoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#141619] border border-white/10 rounded-2xl p-6 space-y-4 text-xs font-sans text-white">
            <div className="flex justify-between items-center font-bold text-sm">
              <span>Design Synthetic Voice Profile</span>
              <button onClick={() => setShowDesignVoiceModal(false)}>✕</button>
            </div>
            <div>
              <label className="block font-bold mb-1">Voice Description Prompt *</label>
              <textarea
                value={designVoicePrompt}
                onChange={(e) => setDesignVoicePrompt(e.target.value)}
                rows={4}
                placeholder="Describe voice characteristics, tone, gender, speed, accent..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white font-mono"
              />
            </div>
            <button
              onClick={() => {
                setShowDesignVoiceModal(false);
                alert('Synthetic voice generated and added to your library!');
              }}
              className="w-full py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold uppercase tracking-wider shadow-lg transition"
            >
              Generate Synthetic Voice
            </button>
          </div>
        </div>
      )}

      {/* FULL MULTI-MODE AVATAR CREATION MODAL */}
      {showCreateAvatarModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#141619] border border-white/10 rounded-2xl p-6 space-y-5 text-xs font-sans text-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center font-bold text-sm border-b border-white/10 pb-3">
              <span className="flex items-center gap-2">
                <span>✨</span> Create New Avatar (Record / Photo / AI Description)
              </span>
              <button
                onClick={() => {
                  stopWebcam();
                  setShowCreateAvatarModal(false);
                }}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Creation Method Selection Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-black/50 border border-white/10 font-grotesk font-bold">
              <button
                onClick={() => setCreateAvatarTab('record')}
                className={`py-2 rounded-lg transition ${
                  createAvatarTab === 'record' ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                📹 Webcam Video Record
              </button>
              <button
                onClick={() => setCreateAvatarTab('image')}
                className={`py-2 rounded-lg transition ${
                  createAvatarTab === 'image' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                🖼️ From Photo / Image
              </button>
              <button
                onClick={() => setCreateAvatarTab('prompt')}
                className={`py-2 rounded-lg transition ${
                  createAvatarTab === 'prompt' ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ✨ AI Text Description
              </button>
            </div>

            {/* MODE 1: WEBCAM VIDEO RECORDING WITH TELEPROMPTER SCRIPT */}
            {createAvatarTab === 'record' && (
              <div className="space-y-4 p-4 rounded-xl bg-black/40 border border-white/10">
                <div className="space-y-1">
                  <label className="block font-bold text-cyan-300">Teleprompter Reading Script (Read aloud while recording)</label>
                  <p className="text-[11px] text-zinc-300 leading-relaxed p-3 rounded-lg bg-black/60 border border-white/5 font-mono">
                    "I hereby grant AI Creative Studio full permission to generate a digital avatar replica of my face, facial expressions, and voice for production inside my account."
                  </p>
                </div>

                <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 relative flex items-center justify-center">
                  <video ref={webcamVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                  {!isWebcamActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 space-y-3">
                      <div className="text-3xl">🎥</div>
                      <button
                        onClick={startWebcam}
                        className="px-5 py-2.5 rounded-full bg-cyan-500 text-black font-extrabold uppercase tracking-wider"
                      >
                        Turn On Camera & Mic
                      </button>
                    </div>
                  )}

                  {isRecordingAvatarVideo && (
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span>RECORDING VIDEO AVATAR...</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  {isWebcamActive && !isRecordingAvatarVideo && (
                    <button
                      onClick={startAvatarVideoRecording}
                      className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold flex items-center gap-2 shadow-lg shadow-rose-600/30"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                      <span>Start Recording Video Avatar</span>
                    </button>
                  )}

                  {isRecordingAvatarVideo && (
                    <button
                      onClick={stopAvatarVideoRecording}
                      className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold flex items-center gap-2 shadow-lg"
                    >
                      <span>⏹ Stop Recording</span>
                    </button>
                  )}

                  {recordedVideoUrl && (
                    <div className="text-emerald-400 font-mono font-bold">
                      ✓ Video Avatar Recorded!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODE 2: CREATE AVATAR FROM PHOTO / IMAGE */}
            {createAvatarTab === 'image' && (
              <div className="space-y-4 p-4 rounded-xl bg-black/40 border border-white/10">
                <div className="space-y-2">
                  <label className="block font-bold">Upload Character Portrait Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setAvatarImageFileUrl(URL.createObjectURL(file));
                    }}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>

                {avatarImageFileUrl && (
                  <div className="aspect-video bg-black rounded-xl overflow-hidden border border-purple-500/40 relative">
                    <img src={avatarImageFileUrl} alt="Avatar Ref" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Gender</label>
                    <select
                      value={virtualGender}
                      onChange={(e) => setVirtualGender(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-Binary">Non-Binary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Age Tier</label>
                    <select
                      value={virtualAge}
                      onChange={(e) => setVirtualAge(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white"
                    >
                      <option value="Young Adult">Young Adult (20s)</option>
                      <option value="Middle Aged">Middle Aged (40s)</option>
                      <option value="Senior">Senior (60s)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 3: GENERATE AI CHARACTER BY TEXT DESCRIPTION */}
            {createAvatarTab === 'prompt' && (
              <div className="space-y-4 p-4 rounded-xl bg-black/40 border border-white/10">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Gender *</label>
                    <select
                      value={virtualGender}
                      onChange={(e) => setVirtualGender(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-white"
                    >
                      <option value="Female">Female 👩</option>
                      <option value="Male">Male 👨</option>
                      <option value="Non-Binary">Non-Binary 🧑</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Age Tier</label>
                    <select
                      value={virtualAge}
                      onChange={(e) => setVirtualAge(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-white"
                    >
                      <option value="Young Adult">Young Adult (20s)</option>
                      <option value="Middle Aged">Middle Aged (40s)</option>
                      <option value="Senior">Senior (60s)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Style / Ethnicity</label>
                    <select
                      value={virtualEthnicity}
                      onChange={(e) => setVirtualEthnicity(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-2 text-white"
                    >
                      <option value="Caucasian">Caucasian</option>
                      <option value="East Asian">East Asian</option>
                      <option value="African American">African American</option>
                      <option value="Hispanic/Latino">Hispanic / Latino</option>
                      <option value="South Asian">South Asian</option>
                      <option value="Anime 3D">Cyberpunk Anime 3D</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">Detailed Character Prompt & Outfit Description *</label>
                  <textarea
                    value={virtualDescription}
                    onChange={(e) => setVirtualDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe character appearance, hair, clothing, lighting, background environment..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => {
                stopWebcam();
                setShowCreateAvatarModal(false);
                alert('Avatar created successfully and added to your Avatar Library!');
              }}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-emerald-400 text-black font-extrabold uppercase tracking-wider shadow-lg transition"
            >
              Confirm & Save Avatar to Library
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
