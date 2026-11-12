'use client';

import React, { useState } from 'react';
import {
  Brain,
  Video,
  ScanEye,
  Globe,
  X,
  Upload,
  Sparkles,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface TacticalAIModalProps {
  open: boolean;
  onClose: () => void;
  gameStateSummary: {
    wave: number;
    hp: number;
    armor: number;
    scrap: number;
    equippedWeapon: string;
    currentZone: string;
    difficulty: string;
  };
}

type AITab = 'deep_thinking' | 'analyze_video' | 'analyze_image' | 'search_grounding';

export default function TacticalAIModal({
  open,
  onClose,
  gameStateSummary,
}: TacticalAIModalProps) {
  const [activeTab, setActiveTab] = useState<AITab>('deep_thinking');
  const [prompt, setPrompt] = useState('');
  const [presetVideo, setPresetVideo] = useState<'video1' | 'video2'>('video2');
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [uploadedImageMime, setUploadedImageMime] = useState<string>('image/png');
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string>('');
  const [modelBadge, setModelBadge] = useState<string>('');
  const [warningNote, setWarningNote] = useState<string>('');
  const [sources, setSources] = useState<Array<{ uri: string; title: string }>>([]);

  if (!open) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedImageMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setUploadedImagePreview(dataUrl);
      const base64Part = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      setUploadedImageBase64(base64Part);
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async () => {
    setLoading(true);
    setWarningNote('');
    setSources([]);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: activeTab,
          prompt: prompt.trim() || undefined,
          presetAsset: presetVideo,
          imageBase64: activeTab === 'analyze_image' ? uploadedImageBase64 : undefined,
          imageMimeType: activeTab === 'analyze_image' ? uploadedImageMime : undefined,
          gameStateSummary,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setResultText(`Error: ${data.error}`);
      } else {
        setResultText(data.text || '');
        setModelBadge(data.modelUsed || '');
        setWarningNote(data.warning || '');
        setSources(data.sources || []);
      }
    } catch (err: unknown) {
      setResultText(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Gemini Tactical Command & Recon Hub"
    >
      <div className="w-full max-w-4xl bg-stone-950 border border-stone-700 text-stone-100 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-900 border-b border-stone-800">
          <div>
            <h2 className="text-lg font-bold tracking-wider uppercase font-mono text-amber-400">
              Tactical AI Command & Campus Recon Hub
            </h2>
            <p className="text-xs text-stone-400">
              Wave {gameStateSummary.wave} · Zone: {gameStateSummary.currentZone} · HP {gameStateSummary.hp}% · Scrap {gameStateSummary.scrap}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tactical AI Hub"
            className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-stone-800 bg-stone-900/60">
          <button
            type="button"
            onClick={() => {
              setActiveTab('deep_thinking');
              setResultText('');
            }}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'deep_thinking'
                ? 'border-amber-500 text-amber-400 bg-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Brain className="w-4 h-4 shrink-0" />
            <span>Deep Strategy (Carbon)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('analyze_video');
              setResultText('');
            }}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'analyze_video'
                ? 'border-amber-500 text-amber-400 bg-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Video className="w-4 h-4 shrink-0" />
            <span>Video Recon (Argon)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('analyze_image');
              setResultText('');
            }}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'analyze_image'
                ? 'border-amber-500 text-amber-400 bg-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <ScanEye className="w-4 h-4 shrink-0" />
            <span>3D Rig Scanner (Argon)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('search_grounding');
              setResultText('');
            }}
            className={`flex items-center justify-center gap-2 py-3 px-3 text-xs font-mono font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'search_grounding'
                ? 'border-amber-500 text-amber-400 bg-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>Search Grounding</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'deep_thinking' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-stone-900 border border-stone-800 text-xs text-stone-300 leading-relaxed">
                Uses <strong className="text-amber-400 font-mono">gemini-4-carbon</strong> with{' '}
                <strong className="text-amber-400 font-mono">ThinkingLevel.HIGH</strong> to compute optimal kiting paths across the 9 Campus Atlas nodes (Block B Table-Tennis Undercroft, 3rd-Floor Skybridges, Cricket Ground Amphitheater, and Basement Ramp) for your live wave state.
              </div>
            </div>
          )}

          {activeTab === 'analyze_video' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-stone-900 border border-stone-800 text-xs text-stone-300">
                Uses <strong className="text-amber-400 font-mono">gemini-4-argon</strong> to analyze the supplied Campus Outbreak combat footage for Titan Boss weakpoints, supply crate spawns, and combat pacing.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setPresetVideo('video2')}
                  className={`p-3 border cursor-pointer transition-colors ${
                    presetVideo === 'video2'
                      ? 'border-amber-500 bg-stone-900'
                      : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                  }`}
                >
                  <div className="text-xs font-mono font-bold text-amber-400 mb-2">
                    Footage A: Campus Outbreak & Titan Boss Awakening
                  </div>
                  <video
                    src="/assets/aistudio/Campus_zombie_survival_gameplay___8a28edd8_ade197e1.mp4"
                    controls
                    muted
                    className="w-full h-36 object-cover bg-black border border-stone-800"
                  />
                </div>

                <div
                  onClick={() => setPresetVideo('video1')}
                  className={`p-3 border cursor-pointer transition-colors ${
                    presetVideo === 'video1'
                      ? 'border-amber-500 bg-stone-900'
                      : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                  }`}
                >
                  <div className="text-xs font-mono font-bold text-amber-400 mb-2">
                    Footage B: Central Quadrangle SCAR Crate & Colossus
                  </div>
                  <video
                    src="/assets/aistudio/Man_fighting_zombies_in_campus_4b332b33_1080p_eef5149b.mp4"
                    controls
                    muted
                    className="w-full h-36 object-cover bg-black border border-stone-800"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analyze_image' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-stone-900 border border-stone-800 text-xs text-stone-300">
                Uses <strong className="text-amber-400 font-mono">gemini-4-argon</strong> to inspect the supplied 3D Character & Titan Blueprint (<code className="text-amber-300">NPC_Zombie_And_Titan_Characters_Root.001</code>) or any photo you upload.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="p-3 bg-stone-900 border border-stone-800">
                  <div className="text-xs font-mono text-stone-400 mb-2">
                    {uploadedImagePreview
                      ? 'Uploaded Custom Recon Image'
                      : 'Supplied 3D Character Blueprint (6 Models)'}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      uploadedImagePreview ||
                      '/assets/aistudio/Screenshot_2026-11-12_093429_827c53eb.png'
                    }
                    alt="3D Character Blueprint"
                    referrerPolicy="no-referrer"
                    className="w-full h-40 object-contain bg-stone-950 border border-stone-800"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center p-5 border border-dashed border-stone-700 hover:border-amber-500 bg-stone-900/50 cursor-pointer transition-colors">
                    <Upload className="w-6 h-6 text-amber-400 mb-2" />
                    <span className="text-xs font-mono text-stone-200">
                      Upload Custom Photo / Screenshot to Analyze
                    </span>
                    <span className="text-[11px] text-stone-500 mt-1">
                      PNG, JPG, WEBP supported · Or leave empty to scan the 3D Character Blueprint
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {uploadedImagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImagePreview(null);
                        setUploadedImageBase64(null);
                      }}
                      className="text-xs font-mono text-amber-400 hover:underline cursor-pointer"
                    >
                      Reset to Supplied 3D Character Sheet
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'search_grounding' && (
            <div className="p-3.5 bg-stone-900 border border-stone-800 text-xs text-stone-300">
              Uses <strong className="text-amber-400 font-mono">gemini-3.8-flash</strong> with live{' '}
              <strong className="text-amber-400 font-mono">Google Search Grounding</strong> to research campus defense architecture, horde survival tactics, and real-world references.
            </div>
          )}

          {/* Prompt Input + Execute */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                activeTab === 'deep_thinking'
                  ? 'Ask for a custom wave strategy, boss phase breakdown, or campus choke point plan...'
                  : activeTab === 'analyze_video'
                  ? 'Ask a specific question about the campus combat video footage...'
                  : activeTab === 'analyze_image'
                  ? 'Ask about the 6 character models, anatomy, or uploaded image...'
                  : 'Enter a search query for grounded survival & campus architecture intel...'
              }
              className="flex-1 px-3.5 py-2.5 bg-stone-900 border border-stone-700 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={runAnalysis}
              disabled={loading}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 text-stone-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Analyzing...' : 'Run Gemini Analysis'}</span>
            </button>
          </div>

          {/* Output Panel */}
          {resultText && (
            <div className="p-4 bg-stone-900 border border-stone-700 space-y-3">
              {modelBadge && (
                <div className="flex items-center justify-between text-xs font-mono text-amber-400 border-b border-stone-800 pb-2">
                  <span>MODEL: {modelBadge}</span>
                  <span>TELEMETRY VERIFIED</span>
                </div>
              )}

              {warningNote && (
                <div className="p-2.5 bg-amber-950/50 border border-amber-700/60 text-amber-200 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>{warningNote}</span>
                </div>
              )}

              <div className="text-xs sm:text-sm text-stone-200 whitespace-pre-wrap leading-relaxed font-sans">
                {resultText}
              </div>

              {sources.length > 0 && (
                <div className="pt-3 border-t border-stone-800">
                  <div className="text-xs font-mono text-stone-400 mb-2">
                    GOOGLE SEARCH GROUNDING SOURCES:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline font-mono"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{src.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
