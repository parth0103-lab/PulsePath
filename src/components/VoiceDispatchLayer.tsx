import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  History,
  HelpCircle,
  Headphones,
  Zap,
} from 'lucide-react';

export const VoiceDispatchLayer: React.FC = () => {
  const {
    isVoiceListening,
    setVoiceListening,
    toggleVoiceListening,
    isVoxHandsFree,
    toggleVoxHandsFree,
    isVoiceProcessing,
    voiceReadbackEnabled,
    setVoiceReadbackEnabled,
    latestVoiceCommand,
    voiceLogs,
    clearVoiceLogs,
    executeVoiceTranscript,
    ambulances,
    hospitals,
    patients,
    isVoiceLayerOpen,
    setIsVoiceLayerOpen,
  } = useEmergency();

  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [micPermissionDenied, setMicPermissionDenied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'logs' | 'guide'>('presets');

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(isVoiceListening);
  const isVoxRef = useRef<boolean>(isVoxHandsFree);
  const isSpacePressedRef = useRef<boolean>(false);

  isListeningRef.current = isVoiceListening;
  isVoxRef.current = isVoxHandsFree;

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setMicPermissionDenied(false);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcriptChunk;
          } else {
            interim += transcriptChunk;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final.trim()) {
          setInterimTranscript('');
          executeVoiceTranscript(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicPermissionDenied(true);
          setVoiceListening(false);
        } else if (event.error !== 'no-speech') {
          console.warn('Speech recognition event warning:', event.error);
        }
      };

      recognition.onend = () => {
        // If VOX Hands-Free is active or user intended to keep listening, auto-restart
        if (isVoxRef.current && isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            // Already started
          }
        } else if (!isVoxRef.current) {
          setVoiceListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition initialization failed:', err);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [executeVoiceTranscript, setVoiceListening]);

  // Handle listening state changes with recognition instance
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isVoiceListening) {
      try {
        recognitionRef.current.start();
      } catch {
        // Recognition already active
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setInterimTranscript('');
    }
  }, [isVoiceListening]);

  // Push-to-Talk (PTT) keyboard shortcut: Spacebar hold
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in form inputs or modals
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      // Spacebar or Ctrl+Space for PTT
      if (e.code === 'Space' && !e.repeat && !isSpacePressedRef.current && !isVoxHandsFree) {
        e.preventDefault();
        isSpacePressedRef.current = true;
        setVoiceListening(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.code === 'Space' && isSpacePressedRef.current && !isVoxHandsFree) {
        e.preventDefault();
        isSpacePressedRef.current = false;
        setVoiceListening(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isVoxHandsFree, setVoiceListening]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    executeVoiceTranscript(manualInput.trim());
    setManualInput('');
  };

  const handlePresetTrigger = (phrase: string) => {
    executeVoiceTranscript(phrase);
  };

  // Preset fast action buttons
  const quickPresets = [
    {
      label: 'Reroute ALS-01 → St. Jude',
      phrase: 'Reroute ALS-01 to St. Jude',
      category: 'reroute',
      badge: 'REROUTE',
      color: 'border-[#ffaa00]/50 text-[#ffaa00] hover:bg-[#ffaa00]/10',
    },
    {
      label: 'Reroute MICU-04 → Memorial Peds',
      phrase: 'Reroute MICU-04 to Memorial',
      category: 'reroute',
      badge: 'REROUTE',
      color: 'border-[#ffaa00]/50 text-[#ffaa00] hover:bg-[#ffaa00]/10',
    },
    {
      label: 'Handoff Arthur Sterling (STEMI)',
      phrase: 'Complete handoff for Arthur Sterling',
      category: 'handoff',
      badge: 'HANDOFF',
      color: 'border-[#00ffaa]/50 text-[#00ffaa] hover:bg-[#00ffaa]/10',
    },
    {
      label: 'Handoff Elena Rostova (Trauma)',
      phrase: 'Complete handoff for Elena Rostova',
      category: 'handoff',
      badge: 'HANDOFF',
      color: 'border-[#00ffaa]/50 text-[#00ffaa] hover:bg-[#00ffaa]/10',
    },
    {
      label: 'Open Handoff Protocol (Marcus Chen)',
      phrase: 'Open handoff for Marcus Chen',
      category: 'modal',
      badge: 'PROTOCOL',
      color: 'border-[#00f2ff]/50 text-[#00f2ff] hover:bg-[#00f2ff]/10',
    },
    {
      label: 'Pre-Alert Hospital for PT-9014',
      phrase: 'Send pre-alert for Arthur Sterling',
      category: 'prealert',
      badge: 'PRE-ALERT',
      color: 'border-[#ff2d55]/50 text-[#ff2d55] hover:bg-[#ff2d55]/10',
    },
    {
      label: 'Preempt Corridor (Green Wave)',
      phrase: 'Preempt corridor traffic signals',
      category: 'preempt',
      badge: 'SIGNAL',
      color: 'border-[#00f2ff]/50 text-[#00f2ff] hover:bg-[#00f2ff]/10',
    },
    {
      label: 'Switch View to Corridor Radar',
      phrase: 'Switch to Corridor Radar',
      category: 'view',
      badge: 'NAV',
      color: 'border-white/30 text-white hover:bg-white/10',
    },
  ];

  return (
    <section 
      aria-label="Voice-to-Text Dispatch Control Layer"
      className="fixed bottom-0 left-0 right-0 z-30 flex flex-col pointer-events-none"
    >
      {/* EXPANDABLE CONSOLE DRAWER */}
      {isVoiceLayerOpen && (
        <div className="pointer-events-auto bg-[#121214]/98 backdrop-blur-md border-t border-white/15 shadow-2xl p-4 sm:p-6 transition-all duration-300 max-h-[75vh] overflow-y-auto">
          <div className="max-w-7xl mx-auto flex flex-col gap-4">
            {/* Header & Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff]">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-syne font-bold text-sm tracking-wide uppercase text-white">
                      Voice-To-Text CAD Dispatch Control Layer
                    </h3>
                    <span className="unit-badge text-[#00f2ff] border-[#00f2ff]/30 text-[9px]">
                      HANDS-FREE VOX
                    </span>
                    {isVoxHandsFree && (
                      <span className="unit-badge text-[#00ffaa] border-[#00ffaa]/30 text-[9px] animate-pulse">
                        CONTINUOUS LISTEN ON
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/50 font-mono-tech mt-0.5">
                    Dispatchers can verbally trigger ambulance reroutes and hospital bed patient handoffs hands-free while operating tactical radios.
                  </p>
                </div>
              </div>

              {/* Console Tabs */}
              <div className="flex items-center gap-1 bg-[#1a1a1c] border border-white/10 p-1 text-[10px] font-mono-tech uppercase">
                <button
                  onClick={() => setActiveTab('presets')}
                  className={`px-3 py-1 cursor-pointer transition-colors ${
                    activeTab === 'presets'
                      ? 'bg-[#00f2ff] text-black font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Verbal Presets
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`px-3 py-1 cursor-pointer transition-colors flex items-center gap-1.5 ${
                    activeTab === 'logs'
                      ? 'bg-[#00f2ff] text-black font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <span>Transmission Log</span>
                  <span className="px-1 text-[9px] bg-black/40 text-white rounded">
                    {voiceLogs.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('guide')}
                  className={`px-3 py-1 cursor-pointer transition-colors ${
                    activeTab === 'guide'
                      ? 'bg-[#00f2ff] text-black font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Phrase Guide
                </button>
                <button
                  onClick={() => setIsVoiceLayerOpen(false)}
                  className="px-2 py-1 text-white/40 hover:text-white cursor-pointer ml-1"
                  title="Collapse Console"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TAB CONTENT: PRESETS & SIMULATOR */}
            {activeTab === 'presets' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tech text-white/60">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#00f2ff]" />
                    <span>Instant Verbal Radio Triggers (click to transmit verbally or test hands-free execution):</span>
                  </div>
                  <div className="text-[10px] text-white/40">
                    Keyboard PTT shortcut: <kbd className="px-1.5 py-0.5 bg-white/10 text-[#00f2ff] border border-white/20 font-bold">SPACEBAR</kbd> (hold to talk)
                  </div>
                </div>

                {/* Preset Chips Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {quickPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetTrigger(preset.phrase)}
                      className={`text-left p-2.5 bg-[#18181b] border ${preset.color} transition-all cursor-pointer group flex flex-col justify-between h-full`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[9px] font-mono-tech uppercase font-bold tracking-wider px-1 py-0.5 bg-black/60 border border-current">
                          {preset.badge}
                        </span>
                        <Mic className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="font-mono-tech text-[11px] font-semibold text-white/90 group-hover:text-white mb-1">
                        "{preset.phrase}"
                      </div>
                      <div className="text-[10px] text-white/40 line-clamp-1">
                        {preset.label}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Direct Manual Radio Voice Input (for testing or noisy rooms) */}
                <form
                  onSubmit={handleManualSubmit}
                  className="mt-1 flex items-center gap-2 bg-[#18181b] border border-white/10 p-2"
                >
                  <Radio className="w-4 h-4 text-[#00f2ff] shrink-0 ml-1" />
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder='Type spoken radio command e.g. "Reroute ALS-01 to St. Jude" or "Complete handoff for Arthur Sterling"...'
                    className="flex-1 bg-transparent border-none text-[12px] font-mono-tech text-white placeholder:text-white/30 focus:outline-none px-2"
                  />
                  <button
                    type="submit"
                    disabled={!manualInput.trim() || isVoiceProcessing}
                    className="btn-tactical h-8 px-4 text-[10px] flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    <span>Transmit CAD Command</span>
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT: TRANSMISSION LOG */}
            {activeTab === 'logs' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px] font-mono-tech text-white/60">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#00f2ff]" />
                    <span>Recent Spoken CAD Transmissions & Voice Action Execution Audit:</span>
                  </span>
                  {voiceLogs.length > 0 && (
                    <button
                      onClick={clearVoiceLogs}
                      className="text-[10px] text-white/40 hover:text-white cursor-pointer underline"
                    >
                      Clear Log
                    </button>
                  )}
                </div>

                <div className="bg-[#18181b] border border-white/10 divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                  {voiceLogs.length === 0 ? (
                    <div className="p-6 text-center text-white/40 font-mono-tech text-xs">
                      No radio transmissions logged yet. Hold Spacebar or click Mic to speak.
                    </div>
                  ) : (
                    voiceLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/[0.02]"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5">
                            {log.status === 'executed' ? (
                              <CheckCircle2 className="w-4 h-4 text-[#00ffaa]" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-[#ffaa00]" />
                            )}
                          </div>
                          <div>
                            <div className="font-mono-tech text-xs text-white font-medium flex items-center gap-2">
                              <span>"{log.transcript}"</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 border uppercase font-bold ${
                                  log.intent.type === 'REROUTE'
                                    ? 'text-[#ffaa00] border-[#ffaa00]/40'
                                    : log.intent.type === 'HANDOFF_COMPLETE'
                                    ? 'text-[#00ffaa] border-[#00ffaa]/40'
                                    : log.intent.type === 'PRE_ALERT'
                                    ? 'text-[#ff2d55] border-[#ff2d55]/40'
                                    : 'text-[#00f2ff] border-[#00f2ff]/40'
                                }`}
                              >
                                {log.intent.type}
                              </span>
                            </div>
                            <div className="text-[11px] text-white/50 font-mono-tech mt-0.5 flex flex-wrap items-center gap-3">
                              <span>{log.intent.statusMessage}</span>
                              {log.intent.speechReadback && (
                                <span className="text-[#00f2ff]/70 italic">
                                  "{log.intent.speechReadback}"
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono-tech text-[10px] text-white/40 shrink-0 sm:text-right">
                          {log.timestamp}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: PHRASE GUIDE */}
            {activeTab === 'guide' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono-tech">
                <div className="p-3 bg-[#18181b] border border-white/10 flex flex-col gap-2">
                  <div className="text-[#ffaa00] font-bold text-[11px] uppercase flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Ambulance Rerouting</span>
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Verbally divert an in-transit unit and automatically switch the signal preemption corridor.
                  </p>
                  <ul className="text-[11px] text-white/80 space-y-1.5 list-disc pl-4 mt-1">
                    <li><span className="text-[#00f2ff]">"Reroute ALS-01 to St. Jude"</span></li>
                    <li><span className="text-[#00f2ff]">"Divert MICU-04 to Memorial"</span></li>
                    <li><span className="text-[#00f2ff]">"Redirect Unit 1 to Metro General"</span></li>
                    <li><span className="text-[#00f2ff]">"Switch corridor for ALS 01 to University"</span></li>
                  </ul>
                </div>

                <div className="p-3 bg-[#18181b] border border-white/10 flex flex-col gap-2">
                  <div className="text-[#00ffaa] font-bold text-[11px] uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Patient Transfer & Handoff</span>
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Formal verbal disposition locking bed occupancy and completing care handover.
                  </p>
                  <ul className="text-[11px] text-white/80 space-y-1.5 list-disc pl-4 mt-1">
                    <li><span className="text-[#00f2ff]">"Complete handoff for Arthur Sterling"</span></li>
                    <li><span className="text-[#00f2ff]">"Transfer patient Elena Rostova"</span></li>
                    <li><span className="text-[#00f2ff]">"Sign handoff for PT-9014"</span></li>
                    <li><span className="text-[#00f2ff]">"Open handoff protocol for Marcus Chen"</span></li>
                  </ul>
                </div>

                <div className="p-3 bg-[#18181b] border border-white/10 flex flex-col gap-2">
                  <div className="text-[#00f2ff] font-bold text-[11px] uppercase flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Tactical CAD Controls</span>
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Preempt signals, toggle vehicle siren, dispatch pre-alerts, or switch screen radars.
                  </p>
                  <ul className="text-[11px] text-white/80 space-y-1.5 list-disc pl-4 mt-1">
                    <li><span className="text-[#00f2ff]">"Send pre-alert for Arthur Sterling"</span></li>
                    <li><span className="text-[#00f2ff]">"Clear corridor for ALS-01"</span></li>
                    <li><span className="text-[#00f2ff]">"Toggle siren for Unit 1"</span></li>
                    <li><span className="text-[#00f2ff]">"Switch to Corridor Radar" / "Show Fleet"</span></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOCKED BOTTOM DISPATCHER VOICE BAR (Always visible & interactive) */}
      <div className="pointer-events-auto bg-[#0d0d0d]/95 backdrop-blur-md border-t border-white/15 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-xl">
        {/* Left: Tactical Mic Control & Status */}
        <div className="flex items-center gap-3">
          {/* Main Push-to-Talk / Toggle Mic Button */}
          <button
            onClick={toggleVoiceListening}
            className={`relative h-10 px-3.5 rounded-none font-mono-tech text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border ${
              isVoiceListening
                ? 'bg-[#ff2d55] border-[#ff2d55] text-white shadow-[0_0_15px_rgba(255,45,85,0.6)] animate-pulse'
                : isVoxHandsFree
                ? 'bg-[#00ffaa]/10 border-[#00ffaa] text-[#00ffaa]'
                : 'bg-[#1a1a1c] border-white/20 text-white hover:border-[#00f2ff] hover:text-[#00f2ff]'
            }`}
            title={
              isVoiceListening
                ? 'Mic Active: Click to Stop Listening'
                : 'Click to Start Voice Dispatch (or hold SPACEBAR)'
            }
          >
            {isVoiceListening ? (
              <>
                <Mic className="w-4 h-4 animate-bounce" />
                <span>TX ON · REC</span>
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4 text-white/60" />
                <span>VOX MIC</span>
              </>
            )}

            {/* Glowing audio level indicators */}
            {isVoiceListening && (
              <span className="flex items-center gap-0.5 ml-1">
                <span className="w-1 h-3 bg-white animate-pulse" />
                <span className="w-1 h-4 bg-white animate-pulse delay-75" />
                <span className="w-1 h-2 bg-white animate-pulse delay-150" />
              </span>
            )}
          </button>

          {/* Hands-Free VOX Open-Mic Toggle */}
          <button
            onClick={toggleVoxHandsFree}
            className={`px-2.5 py-1 text-[10px] font-mono-tech uppercase border cursor-pointer transition-colors hidden sm:flex items-center gap-1.5 ${
              isVoxHandsFree
                ? 'bg-[#00ffaa]/20 border-[#00ffaa] text-[#00ffaa] font-bold'
                : 'bg-[#1a1a1c] border-white/10 text-white/50 hover:text-white hover:border-white/30'
            }`}
            title="Hands-Free Continuous Listening (keeps mic open for rapid dispatcher speech)"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isVoxHandsFree ? 'bg-[#00ffaa] animate-ping' : 'bg-white/30'
              }`}
            />
            <span>VOX Hands-Free: {isVoxHandsFree ? 'ARMED' : 'OFF'}</span>
          </button>

          {/* Spacebar helper */}
          <span className="hidden xl:inline text-[10px] font-mono-tech text-white/40">
            [Hold <kbd className="text-[#00f2ff] bg-white/5 px-1 border border-white/10">SPACE</kbd> to talk]
          </span>
        </div>

        {/* Center: Live Transcript Ticker & Recognized Command Status */}
        <div className="flex-1 max-w-2xl px-2 truncate flex items-center gap-2 text-xs font-mono-tech">
          {isVoiceProcessing ? (
            <div className="flex items-center gap-2 text-[#00f2ff] animate-pulse">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>PARSING RADIO TRANSMISSION VIA AI DISPATCH ENGINE...</span>
            </div>
          ) : interimTranscript ? (
            <div className="flex items-center gap-2 text-white font-medium truncate">
              <span className="text-[#ff2d55] animate-pulse font-bold">[LISTENING]</span>
              <span className="italic truncate">"{interimTranscript}..."</span>
            </div>
          ) : latestVoiceCommand && latestVoiceCommand.type !== 'UNKNOWN' ? (
            <div className="flex items-center gap-2 truncate">
              <span className="text-[#00ffaa] shrink-0 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>[{latestVoiceCommand.type}]</span>
              </span>
              <span className="text-white/90 truncate">
                {latestVoiceCommand.statusMessage}
              </span>
              {latestVoiceCommand.speechReadback && (
                <span className="text-white/40 hidden md:inline truncate">
                  · "{latestVoiceCommand.speechReadback}"
                </span>
              )}
            </div>
          ) : micPermissionDenied ? (
            <div className="text-[#ffaa00] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Mic access blocked in browser. Use verbal preset chips or manual input.</span>
            </div>
          ) : !speechSupported ? (
            <div className="text-[#ffaa00] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Web Speech API not enabled. Use verbal preset buttons to trigger CAD actions.</span>
            </div>
          ) : (
            <div className="text-white/40 truncate flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]/60" />
              <span>Hands-free radio ready. Say: <strong className="text-white/70">"Reroute ALS-01 to St. Jude"</strong> or <strong className="text-white/70">"Complete handoff for Arthur Sterling"</strong></span>
            </div>
          )}
        </div>

        {/* Right: Quick Action Chip, TTS Readback Toggle & Console Expand */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Verbal Trigger on Mobile / Compact */}
          <button
            onClick={() => handlePresetTrigger('Reroute ALS-01 to St. Jude')}
            className="hidden lg:inline-flex text-[10px] font-mono-tech px-2.5 py-1 bg-[#ffaa00]/10 border border-[#ffaa00]/30 text-[#ffaa00] hover:bg-[#ffaa00]/20 transition-colors cursor-pointer"
            title="Fast Test: Reroute ALS-01 to St. Jude"
          >
            ⚡ Reroute ALS-01
          </button>

          <button
            onClick={() => handlePresetTrigger('Complete handoff for Arthur Sterling')}
            className="hidden md:inline-flex text-[10px] font-mono-tech px-2.5 py-1 bg-[#00ffaa]/10 border border-[#00ffaa]/30 text-[#00ffaa] hover:bg-[#00ffaa]/20 transition-colors cursor-pointer"
            title="Fast Test: Complete Handoff for Arthur Sterling"
          >
            ⚡ Handoff PT-9014
          </button>

          {/* Radio Voice Readback (TTS) Toggle */}
          <button
            onClick={() => setVoiceReadbackEnabled(!voiceReadbackEnabled)}
            className={`p-1.5 border transition-colors cursor-pointer ${
              voiceReadbackEnabled
                ? 'bg-[#1a1a1c] border-[#00f2ff]/40 text-[#00f2ff]'
                : 'bg-[#1a1a1c] border-white/10 text-white/40 hover:text-white'
            }`}
            title={
              voiceReadbackEnabled
                ? 'Synthesized Dispatch Radio Readback: ON'
                : 'Synthesized Dispatch Radio Readback: MUTED'
            }
          >
            {voiceReadbackEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Expand/Collapse Console Drawer Button */}
          <button
            onClick={() => setIsVoiceLayerOpen(!isVoiceLayerOpen)}
            className="btn-tactical-outline h-8 px-2.5 text-[10px] flex items-center gap-1.5"
            title={isVoiceLayerOpen ? 'Minimize Voice Console' : 'Expand Voice Console'}
          >
            <Radio className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span className="hidden sm:inline">VOX CONSOLE</span>
            {isVoiceLayerOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
