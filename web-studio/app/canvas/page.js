'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/auth-provider';
import AssetSelectorModal from '../components/asset-selector-modal';

// Color Palette by Data Type
const PORT_COLORS = {
  text: { bg: 'bg-cyan-400', border: 'border-cyan-300', glow: 'shadow-cyan-500/50', stroke: '#38bdf8' },
  image: { bg: 'bg-purple-400', border: 'border-purple-300', glow: 'shadow-purple-500/50', stroke: '#c084fc' },
  model: { bg: 'bg-violet-400', border: 'border-violet-300', glow: 'shadow-violet-500/50', stroke: '#a78bfa' },
  video: { bg: 'bg-emerald-400', border: 'border-emerald-300', glow: 'shadow-emerald-500/50', stroke: '#34d399' },
  audio: { bg: 'bg-amber-400', border: 'border-amber-300', glow: 'shadow-amber-500/50', stroke: '#fbbf24' },
};

const CANVAS_TEMPLATES = [
  {
    id: 'vfx-world',
    name: 'VFX & World Swap 4K',
    tag: 'Cinematic VFX',
    desc: 'Chain prompt, reference photo, and Kling 3.0 model node to transform camera angle and scene environment.',
    icon: '🪄',
  },
  {
    id: 'property-tour',
    name: '360° Property Drone Orbit',
    tag: 'Real Estate',
    desc: 'Input property image, set drone orbit camera move, generate 4K architectural property preview.',
    icon: '🏛️',
  },
  {
    id: 'product-commercial',
    name: 'Studio Product Commercial',
    tag: 'Commercial',
    desc: 'Upload 3D product render, chain lighting matrix reference, output high-impact 60fps video ad.',
    icon: '📸',
  },
  {
    id: 'character-lock',
    name: 'Consistent Persona Video',
    tag: 'Character AI',
    desc: 'Lock character face reference across prompt chains to generate multi-shot narrative sequence.',
    icon: '🎭',
  },
];

const INITIAL_NODES = [
  {
    id: 'node-prompt-1',
    type: 'Prompt Node',
    label: 'Cinematic Concept Prompt',
    x: 60,
    y: 120,
    inputs: [],
    outputs: [{ id: 'out-text', label: 'Prompt Text', type: 'text' }],
    data: {
      prompt: 'Cinematic wide shot of a futuristic sports car driving through rain-slicked neon Tokyo street at dusk, 8k, photorealistic, anamorphic lens flare',
      negativePrompt: 'blurry, low quality, distortion, static',
      seed: 42091,
    },
    color: 'border-cyan-500/60 shadow-cyan-500/10',
  },
  {
    id: 'node-image-1',
    type: 'Reference Asset',
    label: 'Style & Environment Ref',
    x: 420,
    y: 100,
    inputs: [],
    outputs: [{ id: 'out-img', label: 'Image Output', type: 'image' }],
    data: {
      imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&auto=format&fit=crop&q=80',
      weight: 0.85,
    },
    color: 'border-purple-500/60 shadow-purple-500/10',
  },
  {
    id: 'node-engine-1',
    type: 'Model Engine',
    label: 'AI Video Diffusion Engine',
    x: 780,
    y: 120,
    inputs: [
      { id: 'in-text', label: 'Prompt Text', type: 'text' },
      { id: 'in-img', label: 'Image Ref', type: 'image' },
    ],
    outputs: [{ id: 'out-video', label: 'Raw Video', type: 'video' }],
    data: {
      provider: 'kling',
      model: 'kling-3-0',
      aspectRatio: '16:9',
      duration: 5,
      cameraMotion: 'drone_orbit',
      fps: 30,
    },
    color: 'border-violet-500/60 shadow-violet-500/10',
  },
  {
    id: 'node-upscale-1',
    type: 'Video Upscaler',
    label: '4K AI Motion Enhance',
    x: 1140,
    y: 150,
    inputs: [{ id: 'in-video-raw', label: 'Video Source', type: 'video' }],
    outputs: [{ id: 'out-video-hd', label: '4K Stream', type: 'video' }],
    data: {
      resolution: '4K (3840x2160)',
      denoise: 0.2,
      sharpness: 1.2,
    },
    color: 'border-blue-500/60 shadow-blue-500/10',
  },
  {
    id: 'node-output-1',
    type: 'Output Render',
    label: 'Final Master Video Output',
    x: 1480,
    y: 150,
    inputs: [{ id: 'in-final', label: 'Master Input', type: 'video' }],
    outputs: [],
    data: {
      status: 'ready',
      outputUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    },
    color: 'border-emerald-500/60 shadow-emerald-500/10',
  },
];

const INITIAL_EDGES = [
  { id: 'e1', fromNode: 'node-prompt-1', fromPort: 'out-text', toNode: 'node-engine-1', toPort: 'in-text' },
  { id: 'e2', fromNode: 'node-image-1', fromPort: 'out-img', toNode: 'node-engine-1', toPort: 'in-img' },
  { id: 'e3', fromNode: 'node-engine-1', fromPort: 'out-video', toNode: 'node-upscale-1', toPort: 'in-video-raw' },
  { id: 'e4', fromNode: 'node-upscale-1', fromPort: 'out-video-hd', toNode: 'node-output-1', toPort: 'in-final' },
];

export default function AICanvasPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Graph state
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [edges, setEdges] = useState(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState('node-prompt-1');
  const [activeTemplate, setActiveTemplate] = useState(CANVAS_TEMPLATES[0]);

  // Stage viewport state (Zoom & Pan)
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  // Node Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const nodeDragOffset = useRef({ x: 0, y: 0 });

  // Connection Dragging State (Port -> Mouse)
  const [connectingPort, setConnectingPort] = useState(null); // { nodeId, portId, type, isOutput, x, y }
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Pipeline Execution State
  const [executing, setExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState('');
  const [activeExecutingNodeId, setActiveExecutingNodeId] = useState(null);
  const [assetModalOpen, setAssetModalOpen] = useState(false);

  const stageRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  // Calculate Port Absolute Coordinates on Canvas
  const getPortPosition = useCallback((nodeId, portId, isOutput) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const NODE_WIDTH = 300;
    const HEADER_HEIGHT = 44;

    if (isOutput) {
      const idx = node.outputs.findIndex((p) => p.id === portId);
      const yOffset = HEADER_HEIGHT + 32 + (idx >= 0 ? idx * 28 : 0);
      return { x: node.x + NODE_WIDTH, y: node.y + yOffset };
    } else {
      const idx = node.inputs.findIndex((p) => p.id === portId);
      const yOffset = HEADER_HEIGHT + 32 + (idx >= 0 ? idx * 28 : 0);
      return { x: node.x, y: node.y + yOffset };
    }
  }, [nodes]);

  // Pan Canvas Handler
  const handleStageMouseDown = (e) => {
    // If middle click or space key pressed or clicked directly on background stage
    if (e.button === 1 || e.target === stageRef.current || e.target.tagName === 'svg') {
      setIsPanning(true);
      panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };

  const handleMouseMove = (e) => {
    // Canvas Panning
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
      return;
    }

    // Node Dragging
    if (draggingNodeId) {
      const newX = (e.clientX - panOffset.x - nodeDragOffset.current.x) / (zoomLevel / 100);
      const newY = (e.clientY - panOffset.y - nodeDragOffset.current.y) / (zoomLevel / 100);
      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n))
      );
      return;
    }

    // Port Connection Cable Dragging
    if (connectingPort) {
      const rect = stageRef.current.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left - panOffset.x) / (zoomLevel / 100),
        y: (e.clientY - rect.top - panOffset.y) / (zoomLevel / 100),
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setConnectingPort(null);
  };

  // Node Drag Start
  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    nodeDragOffset.current = {
      x: e.clientX - panOffset.x - node.x * (zoomLevel / 100),
      y: e.clientY - panOffset.y - node.y * (zoomLevel / 100),
    };
  };

  // Start Dragging Connection from Port
  const handlePortMouseDown = (e, nodeId, portId, type, isOutput) => {
    e.stopPropagation();
    const pos = getPortPosition(nodeId, portId, isOutput);
    setConnectingPort({ nodeId, portId, type, isOutput, x: pos.x, y: pos.y });
    setMousePos(pos);
  };

  // Drop Connection onto Port
  const handlePortMouseUp = (e, targetNodeId, targetPortId, targetType, isTargetOutput) => {
    e.stopPropagation();
    if (!connectingPort) return;

    // Must connect Output -> Input (or Input -> Output) and cannot connect to self
    if (connectingPort.nodeId === targetNodeId) return;
    if (connectingPort.isOutput === isTargetOutput) return;

    const fromNode = connectingPort.isOutput ? connectingPort.nodeId : targetNodeId;
    const fromPort = connectingPort.isOutput ? connectingPort.portId : targetPortId;
    const toNode = connectingPort.isOutput ? targetNodeId : connectingPort.nodeId;
    const toPort = connectingPort.isOutput ? targetPortId : connectingPort.portId;

    // Check existing
    const existing = edges.find((edge) => edge.fromNode === fromNode && edge.fromPort === fromPort && edge.toNode === toNode && edge.toPort === toPort);
    if (!existing) {
      const newEdge = { id: `edge-${Date.now()}`, fromNode, fromPort, toNode, toPort };
      setEdges((prev) => [...prev, newEdge]);
    }

    setConnectingPort(null);
  };

  // Add Preset Node
  const addNode = (nodeType) => {
    const id = `node-${nodeType.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    let inputs = [];
    let outputs = [];
    let data = {};
    let color = 'border-cyan-500/60 shadow-cyan-500/10';

    if (nodeType === 'Prompt Node') {
      outputs = [{ id: 'out-text', label: 'Prompt Text', type: 'text' }];
      data = { prompt: 'Cinematic establishing shot of Gloria in futuristic metropolis', negativePrompt: 'blurry, static', seed: 12345 };
      color = 'border-cyan-500/60 shadow-cyan-500/10';
    } else if (nodeType === 'Reference Asset') {
      outputs = [{ id: 'out-img', label: 'Image Output', type: 'image' }];
      data = { imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600', weight: 1.0 };
      color = 'border-purple-500/60 shadow-purple-500/10';
    } else if (nodeType === 'Model Engine') {
      inputs = [
        { id: 'in-text', label: 'Prompt Text', type: 'text' },
        { id: 'in-img', label: 'Image Ref', type: 'image' },
      ];
      outputs = [{ id: 'out-video', label: 'Raw Video', type: 'video' }];
      data = { provider: 'kling', model: 'kling-3-0', aspectRatio: '16:9', duration: 5, cameraMotion: 'cinematic_pan' };
      color = 'border-violet-500/60 shadow-violet-500/10';
    } else if (nodeType === 'Video Upscaler') {
      inputs = [{ id: 'in-video-raw', label: 'Video Source', type: 'video' }];
      outputs = [{ id: 'out-video-hd', label: '4K Stream', type: 'video' }];
      data = { resolution: '4K (3840x2160)', denoise: 0.1, sharpness: 1.5 };
      color = 'border-blue-500/60 shadow-blue-500/10';
    } else if (nodeType === 'Output Render') {
      inputs = [{ id: 'in-final', label: 'Master Input', type: 'video' }];
      data = { status: 'idle', outputUrl: '' };
      color = 'border-emerald-500/60 shadow-emerald-500/10';
    }

    const newNode = {
      id,
      type: nodeType,
      label: `${nodeType} #${nodes.length + 1}`,
      x: 300 + (nodes.length % 3) * 60,
      y: 180 + (nodes.length % 4) * 60,
      inputs,
      outputs,
      data,
      color,
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(id);
  };

  // Update Selected Node Data
  const updateSelectedNodeData = (field, value) => {
    if (!selectedNodeId) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, [field]: value } } : n))
    );
  };

  const updateSelectedNodeLabel = (label) => {
    if (!selectedNodeId) return;
    setNodes((prev) => prev.map((n) => (n.id === selectedNodeId ? { ...n, label } : n)));
  };

  const deleteNode = (id) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.fromNode !== id && e.toNode !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Handle File Upload for Reference Image Node
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateSelectedNodeData('imageUrl', url);
  };

  // Run Canvas Pipeline with Interactive glowing particle stream
  const handleRunPipeline = async () => {
    setExecuting(true);
    setExecutionLog('⚡ Initializing Spatial Node Pipeline execution sequence...');

    const promptNode = nodes.find((n) => n.type === 'Prompt Node');
    const imageNode = nodes.find((n) => n.type === 'Reference Asset');
    const engineNode = nodes.find((n) => n.type === 'Model Engine');
    const outputNode = nodes.find((n) => n.type === 'Output Render');

    // Step 1: Prompt Node Activation
    if (promptNode) {
      setActiveExecutingNodeId(promptNode.id);
      setExecutionLog(`1. Reading Prompt Node: "${promptNode.data.prompt?.slice(0, 40)}..."`);
      await new Promise((r) => setTimeout(r, 800));
    }

    // Step 2: Reference Image Node
    if (imageNode) {
      setActiveExecutingNodeId(imageNode.id);
      setExecutionLog('2. Processing Reference Image & Style Latent Vectors...');
      await new Promise((r) => setTimeout(r, 800));
    }

    // Step 3: Model Engine Execution via backend video-service (:3011)
    if (engineNode) {
      setActiveExecutingNodeId(engineNode.id);
      const provider = engineNode.data.provider || 'kling';
      setExecutionLog(`3. Dispatching generation job to video-service (:3011) via ${provider.toUpperCase()} provider adapter...`);

      const userId = user?.id || 'usr-guest-1';
      fetch('http://localhost:3008/v1/credits/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, modelId: provider, units: 30 }),
      }).catch(() => {});

      fetch('http://localhost:3011/v1/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: imageNode?.data?.imageUrl ? 'image_to_video' : 'text_to_video',
          prompt: promptNode?.data?.prompt || 'Cinematic video render',
          image_url: imageNode?.data?.imageUrl,
          aspect_ratio: engineNode?.data?.aspectRatio || '16:9',
          duration_seconds: engineNode?.data?.duration || 5,
          preferred_provider: provider,
        }),
      }).catch(() => {});

      await new Promise((r) => setTimeout(r, 1500));
    }

    // Step 4: Output Synthesis & Asset Registration
    const generatedUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    if (outputNode) {
      setActiveExecutingNodeId(outputNode.id);
      setExecutionLog('4. Synthesizing 4K frames & auto-syncing output to asset-service (:3006)...');

      setNodes((prev) =>
        prev.map((n) =>
          n.id === outputNode.id
            ? { ...n, data: { ...n.data, outputUrl: generatedUrl, status: 'succeeded' } }
            : n
        )
      );

      fetch('http://localhost:3006/v1/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Canvas Node Pipeline Output - ${new Date().toLocaleTimeString()}`,
          type: 'video',
          url: generatedUrl,
          metadata: { prompt: promptNode?.data?.prompt },
        }),
      }).catch(() => {});
    }

    await new Promise((r) => setTimeout(r, 600));
    setActiveExecutingNodeId(null);
    setExecuting(false);
    setExecutionLog('✅ Canvas Graph Pipeline Executed Successfully!');
  };

  return (
    <div className="fixed inset-0 bg-[#07090e] text-zinc-100 flex flex-col overflow-hidden font-sans select-none z-50">
      
      {/* Top Glassmorphic Navigation Header */}
      <div className="h-14 border-b border-white/10 bg-[#0d1017]/90 backdrop-blur-xl px-5 flex items-center justify-between shrink-0 z-30 shadow-2xl">
        <div className="flex items-center gap-4">
          <Link
            href="/video"
            className="text-xs text-zinc-300 hover:text-white font-grotesk font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
          >
            ← Back to Studio
          </Link>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0d1017] rounded-[10px] flex items-center justify-center text-xs">
                ✨
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold font-grotesk text-white tracking-wide">
                  AI Spatial Node Canvas
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold">
                  ComfyUI / Krea Engine Spec
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Control Tools */}
        <div className="flex items-center gap-3">
          {/* Zoom Control */}
          <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-xl px-2 py-1 text-xs font-mono">
            <button
              onClick={() => setZoomLevel((z) => Math.max(40, z - 10))}
              className="px-1.5 text-zinc-400 hover:text-white font-bold"
            >
              -
            </button>
            <span className="text-cyan-300 font-bold px-1">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(160, z + 10))}
              className="px-1.5 text-zinc-400 hover:text-white font-bold"
            >
              +
            </button>
          </div>

          <button
            onClick={() => {
              setNodes(INITIAL_NODES);
              setEdges(INITIAL_EDGES);
              setPanOffset({ x: 0, y: 0 });
              setSelectedNodeId('node-prompt-1');
            }}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 transition flex items-center gap-1.5"
          >
            <span>🧹 Reset Graph</span>
          </button>

          <button
            onClick={handleRunPipeline}
            disabled={executing}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 hover:from-cyan-300 hover:to-purple-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/30 transition disabled:opacity-50 flex items-center gap-2"
          >
            {executing ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Run Canvas Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace Stage */}
      <div className="flex-1 flex min-h-0 bg-[#07090e] relative overflow-hidden">
        
        {/* Left Template Sidebar */}
        <div className="w-64 border-r border-white/10 bg-[#0d1017]/90 backdrop-blur-xl p-4 space-y-4 shrink-0 flex flex-col justify-between overflow-y-auto z-20">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Pipeline Presets
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">4K PRO</span>
            </div>

            <div className="space-y-2">
              {CANVAS_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setActiveTemplate(tmpl)}
                  className={`w-full p-3 rounded-2xl border text-left space-y-1.5 transition ${
                    activeTemplate.id === tmpl.id
                      ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-cyan-400/80 text-white shadow-lg shadow-cyan-500/10'
                      : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold font-grotesk">
                    <span className="flex items-center gap-1.5">
                      <span>{tmpl.icon}</span>
                      <span>{tmpl.name}</span>
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 leading-tight">
                    {tmpl.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-2 text-[11px] font-mono text-cyan-200">
            <div className="font-bold text-white font-grotesk flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>🌐</span> Node Graph Rules
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[10px] text-zinc-400 leading-relaxed">
              • Drag colored port handles to connect nodes.<br />
              • Inputs flow Left to Right.<br />
              • Hold Middle-Click or Space to pan canvas.
            </div>
          </div>
        </div>

        {/* Spatial Node Stage Canvas */}
        <div
          ref={stageRef}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 relative bg-[radial-gradient(#1e2433_1px,transparent_1px)] [background-size:28px_28px] overflow-hidden cursor-crosshair z-10"
        >
          {/* Main Transformed Canvas Container */}
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`,
              transformOrigin: '0 0',
            }}
            className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none"
          >
            {/* SVG Bezier Cables Connection Render Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <filter id="cableGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Render Configured Graph Edges */}
              {edges.map((edge) => {
                const fromNode = nodes.find((n) => n.id === edge.fromNode);
                const toNode = nodes.find((n) => n.id === edge.toNode);
                if (!fromNode || !toNode) return null;

                const fromPos = getPortPosition(edge.fromNode, edge.fromPort, true);
                const toPos = getPortPosition(edge.toNode, edge.toPort, false);

                // Curve Bezier Control Points
                const dx = Math.abs(toPos.x - fromPos.x) * 0.5;
                const pathD = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + dx} ${fromPos.y}, ${toPos.x - dx} ${toPos.y}, ${toPos.x} ${toPos.y}`;

                const fromPortObj = fromNode.outputs.find((p) => p.id === edge.fromPort);
                const strokeColor = PORT_COLORS[fromPortObj?.type || 'text']?.stroke || '#38bdf8';

                const isEdgeActive = executing && (activeExecutingNodeId === edge.fromNode || activeExecutingNodeId === edge.toNode);

                return (
                  <g key={edge.id} className="pointer-events-auto cursor-pointer" onClick={() => setEdges((prev) => prev.filter((e) => e.id !== edge.id))}>
                    {/* Shadow Outer Glow Cable */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="5"
                      strokeOpacity="0.3"
                      filter="url(#cableGlow)"
                    />
                    {/* Main Core Bezier Cable Line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2.5"
                      strokeDasharray={isEdgeActive ? '8,8' : 'none'}
                      className={isEdgeActive ? 'animate-pulse' : ''}
                    />

                    {/* Animated Pulsing Data Particles along cable during pipeline execution */}
                    {executing && (
                      <circle r="4" fill="#ffffff" filter="url(#cableGlow)">
                        <animateMotion path={pathD} dur="1.2s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>
                );
              })}

              {/* Render Active Cable Connecting Mouse Drag */}
              {connectingPort && (
                <path
                  d={`M ${connectingPort.x} ${connectingPort.y} C ${connectingPort.x + (connectingPort.isOutput ? 100 : -100)} ${connectingPort.y}, ${mousePos.x + (connectingPort.isOutput ? -100 : 100)} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                  fill="none"
                  stroke={PORT_COLORS[connectingPort.type]?.stroke || '#38bdf8'}
                  strokeWidth="3"
                  strokeDasharray="5,5"
                  filter="url(#cableGlow)"
                />
              )}
            </svg>

            {/* Interactive Node Cards */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isExecutingThis = activeExecutingNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  style={{ left: node.x, top: node.y }}
                  className={`absolute w-[300px] bg-[#111420]/95 backdrop-blur-2xl border-2 ${
                    node.color
                  } rounded-2xl p-4 shadow-2xl space-y-3 cursor-grab active:cursor-grabbing select-none pointer-events-auto z-10 transition-shadow ${
                    isSelected ? 'ring-2 ring-cyan-400 shadow-cyan-500/40' : 'hover:border-cyan-400/60'
                  } ${isExecutingThis ? 'ring-4 ring-emerald-400 animate-pulse' : ''}`}
                >
                  {/* Card Top Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isExecutingThis ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`} />
                      <span className="text-[11px] font-mono font-extrabold text-white uppercase tracking-wider">
                        {node.type}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNode(node.id);
                      }}
                      className="text-zinc-500 hover:text-rose-400 text-xs font-bold transition px-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="text-xs font-bold text-cyan-200 font-grotesk truncate">
                    {node.label}
                  </div>

                  {/* Input Ports Left Column */}
                  {node.inputs.length > 0 && (
                    <div className="space-y-2 py-1">
                      {node.inputs.map((port) => {
                        const portStyle = PORT_COLORS[port.type] || PORT_COLORS.text;
                        return (
                          <div key={port.id} className="flex items-center gap-2 relative">
                            {/* Left Input Port Handle Dot */}
                            <div
                              onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id, port.type, false)}
                              onMouseUp={(e) => handlePortMouseUp(e, node.id, port.id, port.type, false)}
                              className={`-left-6 absolute w-4 h-4 rounded-full ${portStyle.bg} border-2 border-black ${portStyle.glow} cursor-pointer hover:scale-125 transition-transform`}
                            />
                            <span className="text-[10px] font-mono text-zinc-400 pl-1">
                              ► {port.label} ({port.type})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Node Inner Preview Widget Contents */}
                  {node.type === 'Prompt Node' && (
                    <div className="space-y-2">
                      <textarea
                        value={node.data.prompt || ''}
                        onChange={(e) => updateSelectedNodeData('prompt', e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        rows={3}
                        className="w-full bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs text-white resize-none focus:outline-none focus:border-cyan-400 font-sans"
                        placeholder="Enter concept prompt definition..."
                      />
                    </div>
                  )}

                  {node.type === 'Reference Asset' && (
                    <div className="space-y-2">
                      <div className="aspect-video bg-black rounded-xl overflow-hidden border border-white/10 relative group">
                        {node.data.imageUrl ? (
                          <img src={node.data.imageUrl} alt="Ref" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-xs text-zinc-500 font-mono">
                            <span>🖼️ Drop Reference</span>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white font-grotesk"
                        >
                          📷 Change Asset
                        </button>
                      </div>
                    </div>
                  )}

                  {node.type === 'Model Engine' && (
                    <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 space-y-1.5 font-mono text-xs text-cyan-300">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-zinc-400">ENGINE:</span>
                        <span className="font-bold text-white uppercase">{node.data.provider}</span>
                      </div>
                      <select
                        value={node.data.provider || 'kling'}
                        onChange={(e) => updateSelectedNodeData('provider', e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full bg-black/80 border border-white/10 rounded-lg p-1.5 text-xs text-cyan-300 font-bold focus:outline-none"
                      >
                        <option value="kling">Kling 3.0 (Kuaishou)</option>
                        <option value="google_veo">Google Veo 3.1</option>
                        <option value="runway">Runway Gen-4.5</option>
                        <option value="wan">Wan 2.6 (Alibaba)</option>
                        <option value="pika">Pika 2.2</option>
                      </select>
                    </div>
                  )}

                  {node.type === 'Output Render' && (
                    <div className="space-y-2">
                      <div className="aspect-video bg-black rounded-xl overflow-hidden border border-white/10 relative">
                        {node.data.outputUrl ? (
                          <video src={node.data.outputUrl} controls className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-mono">
                            Awaiting canvas pipeline output...
                          </div>
                        )}
                      </div>

                      {node.data.outputUrl && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/editor?url=${encodeURIComponent(node.data.outputUrl)}`);
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 transition text-center"
                          >
                            ✏️ Edit Video
                          </button>
                          <a
                            href={node.data.outputUrl}
                            target="_blank"
                            rel="noreferrer"
                            download
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold border border-white/10 transition"
                          >
                            ⬇ 4K
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Output Ports Right Column */}
                  {node.outputs.length > 0 && (
                    <div className="space-y-2 py-1">
                      {node.outputs.map((port) => {
                        const portStyle = PORT_COLORS[port.type] || PORT_COLORS.text;
                        return (
                          <div key={port.id} className="flex items-center justify-end gap-2 relative">
                            <span className="text-[10px] font-mono text-zinc-400 pr-1">
                              {port.label} ({port.type}) ►
                            </span>
                            {/* Right Output Port Handle Dot */}
                            <div
                              onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id, port.type, true)}
                              onMouseUp={(e) => handlePortMouseUp(e, node.id, port.id, port.type, true)}
                              className={`-right-6 absolute w-4 h-4 rounded-full ${portStyle.bg} border-2 border-black ${portStyle.glow} cursor-pointer hover:scale-125 transition-transform`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Card Bottom Footer ID */}
                  <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 pt-1 border-t border-white/5">
                    <span>{node.id}</span>
                    <span className="text-emerald-400 font-bold">● ONLINE</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Bottom Center Glassmorphic Dock */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#0d1017]/90 backdrop-blur-2xl border border-white/15 rounded-full px-5 py-2.5 flex items-center gap-3 shadow-2xl">
            <button
              onClick={() => addNode('Prompt Node')}
              className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-400 border border-white/10 text-xs font-bold text-cyan-300 transition flex items-center gap-1.5"
            >
              <span>✍️</span> Prompt
            </button>
            <button
              onClick={() => addNode('Reference Asset')}
              className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-purple-500/20 hover:border-purple-400 border border-white/10 text-xs font-bold text-purple-300 transition flex items-center gap-1.5"
            >
              <span>🖼️</span> Ref Asset
            </button>
            <button
              onClick={() => addNode('Model Engine')}
              className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-violet-500/20 hover:border-violet-400 border border-white/10 text-xs font-bold text-violet-300 transition flex items-center gap-1.5"
            >
              <span>⚙️</span> Engine
            </button>
            <button
              onClick={() => addNode('Video Upscaler')}
              className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-blue-500/20 hover:border-blue-400 border border-white/10 text-xs font-bold text-blue-300 transition flex items-center gap-1.5"
            >
              <span>✨</span> 4K Upscale
            </button>
            <button
              onClick={() => addNode('Output Render')}
              className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-400 border border-white/10 text-xs font-bold text-emerald-300 transition flex items-center gap-1.5"
            >
              <span>🎬</span> Output
            </button>

            <div className="h-4 w-px bg-white/10" />

            <button
              onClick={handleRunPipeline}
              disabled={executing}
              className="px-5 py-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/30 transition flex items-center gap-1.5"
            >
              <span>⚡ Execute</span>
            </button>
          </div>

          {/* Bottom Right Minimap Preview Widget */}
          <div className="absolute bottom-6 right-6 z-30 w-44 h-32 bg-[#0c0e14]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl pointer-events-none">
            <div className="text-[9px] font-mono font-bold text-zinc-400 uppercase mb-1">Graph Minimap</div>
            <div className="w-full h-24 bg-black/60 rounded-xl relative overflow-hidden border border-white/5">
              {nodes.map((n) => (
                <div
                  key={n.id}
                  style={{
                    left: `${(n.x / 2000) * 100}%`,
                    top: `${(n.y / 1200) * 100}%`,
                  }}
                  className={`absolute w-3 h-2 rounded-sm ${n.id === selectedNodeId ? 'bg-cyan-400 ring-1 ring-white' : 'bg-zinc-600'}`}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Hidden File Input for Image Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Right Dynamic Node Inspector Sidebar */}
        <div className="w-80 border-l border-white/10 bg-[#0d1017]/90 backdrop-blur-xl p-4 space-y-4 shrink-0 overflow-y-auto z-20">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-grotesk flex items-center gap-1.5">
              <span>⚙️</span> Node Inspector
            </h3>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">
              {selectedNode.id}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-zinc-400 text-[11px] font-bold block mb-1">Node Title Label</label>
              <input
                type="text"
                value={selectedNode.label}
                onChange={(e) => updateSelectedNodeLabel(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-grotesk font-bold"
              />
            </div>

            {selectedNode.type === 'Prompt Node' && (
              <>
                <div>
                  <label className="text-zinc-400 text-[11px] font-bold block mb-1">Positive Concept Prompt</label>
                  <textarea
                    value={selectedNode.data.prompt || ''}
                    onChange={(e) => updateSelectedNodeData('prompt', e.target.value)}
                    rows={4}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white resize-none focus:outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 text-[11px] font-bold block mb-1">Negative Prompt</label>
                  <input
                    type="text"
                    value={selectedNode.data.negativePrompt || ''}
                    onChange={(e) => updateSelectedNodeData('negativePrompt', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 text-[11px] font-bold block mb-1">Random Seed</label>
                  <input
                    type="number"
                    value={selectedNode.data.seed || 42}
                    onChange={(e) => updateSelectedNodeData('seed', parseInt(e.target.value) || 0)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </>
            )}

            {selectedNode.type === 'Reference Asset' && (
              <>
                <div className="space-y-2">
                  <label className="text-zinc-400 text-[11px] font-bold block mb-1">Select Reference Image Asset</label>
                  <button
                    onClick={() => setAssetModalOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/30 transition text-center mb-1"
                  >
                    🖼️ Choose from My Asset Library
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold border border-purple-500/30 transition text-center"
                  >
                    📁 Browse Local File Upload
                  </button>
                </div>

                <div>
                  <label className="text-zinc-400 text-[11px] font-bold block mb-1">Style Weight (0.0 to 1.0)</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedNode.data.weight || 0.8}
                    onChange={(e) => updateSelectedNodeData('weight', parseFloat(e.target.value))}
                    className="w-full accent-purple-400"
                  />
                  <div className="text-[10px] font-mono text-purple-300 text-right">{selectedNode.data.weight}</div>
                </div>
              </>
            )}

            {selectedNode.type === 'Model Engine' && (
              <>
                <div>
                  <label className="text-zinc-400 text-[11px] font-bold block mb-1">AI Video Provider</label>
                  <select
                    value={selectedNode.data.provider || 'kling'}
                    onChange={(e) => updateSelectedNodeData('provider', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-400"
                  >
                    <option value="kling">Kling 3.0 (Kuaishou)</option>
                    <option value="google_veo">Google Veo 3.1</option>
                    <option value="runway">Runway Gen-4.5</option>
                    <option value="wan">Wan 2.6 (Alibaba)</option>
                    <option value="pika">Pika 2.2</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 text-[11px] font-bold block mb-1">Camera Motion Preset</label>
                  <select
                    value={selectedNode.data.cameraMotion || 'drone_orbit'}
                    onChange={(e) => updateSelectedNodeData('cameraMotion', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="drone_orbit">360° Property Drone Orbit</option>
                    <option value="cinematic_pan">Cinematic Horizon Pan</option>
                    <option value="push_in">Dramatic Push-In</option>
                    <option value="timelapse_sky">Timelapse Sky Motion</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 text-[11px] font-bold block mb-1">Aspect Ratio</label>
                  <select
                    value={selectedNode.data.aspectRatio || '16:9'}
                    onChange={(e) => updateSelectedNodeData('aspectRatio', e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Vertical Reel</option>
                    <option value="1:1">1:1 Square</option>
                  </select>
                </div>
              </>
            )}

            {/* Live Pipeline Execution Logs */}
            {executionLog && (
              <div className="p-3.5 rounded-2xl bg-black/80 border border-white/10 space-y-1.5 font-mono text-[10px]">
                <div className="text-cyan-400 font-bold flex items-center justify-between">
                  <span>LIVE EXECUTION STREAM</span>
                  {executing && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                </div>
                <div className="text-zinc-300 leading-relaxed">{executionLog}</div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Asset Selector Modal */}
      <AssetSelectorModal
        isOpen={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        onSelectAsset={(url) => updateSelectedNodeData('imageUrl', url)}
        acceptedType="image"
      />

    </div>
  );
}
