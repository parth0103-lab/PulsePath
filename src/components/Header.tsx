import React from 'react';
import { useEmergency } from '../context/EmergencyContext';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Download,
  CheckCircle2,
  Mic,
  MicOff,
  Radio,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeView,
    setActiveView,
    isSimulating,
    setIsSimulating,
    simSpeed,
    setSimSpeed,
    soundMuted,
    toggleSound,
    ambulances,
    openHandoffModal,
    isVoiceListening,
    toggleVoiceListening,
    isVoiceLayerOpen,
    setIsVoiceLayerOpen,
    isVoxHandsFree,
  } = useEmergency();

  const activeCorridorsCount = ambulances.filter(
    (a) => a.corridorActive && a.status === 'en_route_hospital'
  ).length;

  const rerouteAlertsCount = ambulances.filter(
    (a) => a.predictiveTrafficImpact?.rerouteRecommendation?.recommended
  ).length;

  return (
    <header className="sticky top-0 z-40 bg-[#0d0d0d] border-b border-white/10 px-6 h-16 grid grid-cols-[240px_1fr_auto] items-center">
      {/* Zone 1: Logo */}
      <button
        onClick={() => setActiveView('overview')}
        className="font-syne text-xl font-extrabold uppercase tracking-tight flex items-center gap-3 text-white text-left cursor-pointer focus:outline-none"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00f2ff" strokeWidth="3">
          <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
        </svg>
        <span>PulsePath</span>
      </button>

      {/* Zone 2: Navigation Links */}
      <nav className="flex items-center h-full">
        <button
          onClick={() => setActiveView('overview')}
          className={`h-full px-5 border-l border-white/10 font-mono-tech text-[11px] uppercase tracking-wider transition-colors cursor-pointer ${
            activeView === 'overview'
              ? 'text-[#00f2ff] bg-[#00f2ff]/5 border-b-2 border-b-[#00f2ff]'
              : 'text-white/40 hover:text-white'
          }`}
        >
          Live Command
        </button>

        <button
          onClick={() => setActiveView('fleet')}
          className={`h-full px-5 border-l border-white/10 font-mono-tech text-[11px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
            activeView === 'fleet'
              ? 'text-[#00f2ff] bg-[#00f2ff]/5 border-b-2 border-b-[#00f2ff]'
              : 'text-white/40 hover:text-white'
          }`}
        >
          <span>Fleet Radar</span>
          {rerouteAlertsCount > 0 ? (
            <span className="text-[10px] text-[#ffaa00] font-bold px-1 bg-[#ffaa00]/20 border border-[#ffaa00]/40 animate-pulse">
              ALERT [{rerouteAlertsCount}]
            </span>
          ) : (
            <span className="text-[10px] text-white/50">[{ambulances.length}]</span>
          )}
        </button>

        <button
          onClick={() => setActiveView('corridor')}
          className={`h-full px-5 border-l border-white/10 font-mono-tech text-[11px] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2 ${
            activeView === 'corridor'
              ? 'text-[#00f2ff] bg-[#00f2ff]/5 border-b-2 border-b-[#00f2ff]'
              : 'text-white/40 hover:text-white'
          }`}
        >
          <span>Corridor Radar</span>
          {activeCorridorsCount > 0 && (
            <span className="text-[10px] text-[#00f2ff] font-bold">[{activeCorridorsCount}]</span>
          )}
        </button>

        <button
          onClick={() => setActiveView('triage')}
          className={`h-full px-5 border-l border-white/10 font-mono-tech text-[11px] uppercase tracking-wider transition-colors cursor-pointer ${
            activeView === 'triage'
              ? 'text-[#00f2ff] bg-[#00f2ff]/5 border-b-2 border-b-[#00f2ff]'
              : 'text-white/40 hover:text-white'
          }`}
        >
          Bed Triage
        </button>

        <button
          onClick={() => setActiveView('telemetry')}
          className={`h-full px-5 border-l border-white/10 font-mono-tech text-[11px] uppercase tracking-wider transition-colors cursor-pointer ${
            activeView === 'telemetry'
              ? 'text-[#00f2ff] bg-[#00f2ff]/5 border-b-2 border-b-[#00f2ff]'
              : 'text-white/40 hover:text-white'
          }`}
        >
          Telemetry
        </button>

        <button
          onClick={() => setActiveView('dispatch')}
          className={`h-full px-5 border-l border-r border-white/10 font-mono-tech text-[11px] uppercase tracking-wider transition-colors cursor-pointer ${
            activeView === 'dispatch'
              ? 'text-[#00f2ff] bg-[#00f2ff]/5 border-b-2 border-b-[#00f2ff]'
              : 'text-white/40 hover:text-white'
          }`}
        >
          CAD Dispatch
        </button>
      </nav>

      {/* Zone 3: Status & Tactical Actions */}
      <div className="flex items-center gap-4">
        {/* Audio Mute */}
        <button
          onClick={toggleSound}
          title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
          className="p-1.5 text-white/50 hover:text-white border border-white/10 bg-[#1a1a1c] cursor-pointer transition-colors"
        >
          {soundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#00f2ff]" />}
        </button>

        {/* Sim Controls */}
        <div className="flex items-center bg-[#1a1a1c] border border-white/10 text-[10px] font-mono-tech">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className="p-1.5 text-white/70 hover:text-white transition-colors cursor-pointer"
            title={isSimulating ? 'Pause' : 'Resume'}
          >
            {isSimulating ? <Pause className="w-3 h-3 text-[#ff2d55]" /> : <Play className="w-3 h-3 text-[#00ffaa]" />}
          </button>
          <button
            onClick={() => setSimSpeed(simSpeed === 1 ? 2 : simSpeed === 2 ? 5 : 1)}
            className="px-2 py-1 text-white/50 hover:text-white transition-colors cursor-pointer"
            title="Speed Multiplier"
          >
            {simSpeed}x
          </button>
        </div>

        <div className="label text-[#00f2ff] hidden sm:block">
          • System Online
        </div>

        {/* Voice-to-Text Radio Trigger */}
        <button
          onClick={() => {
            if (!isVoiceLayerOpen) setIsVoiceLayerOpen(true);
            toggleVoiceListening();
          }}
          className={`h-8 px-2.5 text-[11px] font-mono-tech flex items-center gap-1.5 border transition-all cursor-pointer ${
            isVoiceListening
              ? 'bg-[#ff2d55] text-white border-[#ff2d55] animate-pulse shadow-[0_0_10px_rgba(255,45,85,0.5)]'
              : isVoxHandsFree
              ? 'bg-[#00ffaa]/20 border-[#00ffaa] text-[#00ffaa]'
              : 'bg-[#1a1a1c] border-white/10 text-white hover:text-[#00f2ff] hover:border-[#00f2ff]'
          }`}
          title="Toggle Hands-Free Voice Dispatch Control (hold Spacebar to talk)"
        >
          {isVoiceListening ? (
            <Mic className="w-3.5 h-3.5 animate-bounce" />
          ) : (
            <Radio className="w-3.5 h-3.5 text-[#00f2ff]" />
          )}
          <span className="hidden sm:inline">
            {isVoiceListening ? 'REC...' : isVoxHandsFree ? 'VOX ON' : 'VOX'}
          </span>
        </button>

        {/* Download Project ZIP */}
        <a
          href="/pulsepath-app.zip"
          download="pulsepath-emergency-corridor.zip"
          className="btn-tactical-outline h-8 px-3 text-[11px] flex items-center gap-1.5"
          title="Download full project ZIP to run locally"
        >
          <Download className="w-3.5 h-3.5 text-[#00f2ff]" />
          <span className="hidden md:inline">ZIP</span>
        </a>

        {/* Patient Handoff Protocol Button */}
        <button
          onClick={() => openHandoffModal()}
          className="btn-tactical-outline h-8 px-3 text-[11px] flex items-center gap-1.5 text-white hover:text-[#00ffaa] hover:border-[#00ffaa]"
          title="Open Patient Handoff & Bed Disposition Protocol"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-[#00ffaa]" />
          <span className="hidden lg:inline">Handoff</span>
        </button>

        <button
          onClick={() => setActiveView('dispatch')}
          className="btn-tactical h-8 px-4"
        >
          CAD Dispatch
        </button>
      </div>
    </header>
  );
};
