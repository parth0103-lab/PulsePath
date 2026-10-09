import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import {
  Navigation,
  Siren,
  Hospital as HospitalIcon,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';

export const CorridorMap: React.FC = () => {
  const {
    ambulances,
    hospitals,
    intersections,
    corridors,
    patients,
    selectedAmbulanceId,
    setSelectedAmbulanceId,
    setSelectedPatientId,
    setSelectedHospitalId,
    setActiveView,
    toggleCorridorPreemption,
    toggleAmbulanceSiren,
    rerouteAmbulance,
    openHandoffModal,
  } = useEmergency();

  const [activeCorridorFilter, setActiveCorridorFilter] = useState<string>('all');
  const [showRerouteMenu, setShowRerouteMenu] = useState<boolean>(false);

  const selectedAmbulance = ambulances.find((a) => a.id === selectedAmbulanceId) || ambulances[0];
  const assignedPatient = patients.find((p) => p.id === selectedAmbulance?.patientId);
  const targetHospital = hospitals.find((h) => h.id === selectedAmbulance?.assignedHospitalId);

  const displayedCorridors = corridors.filter(
    (c) => activeCorridorFilter === 'all' || c.id === activeCorridorFilter
  );

  return (
    <div className="relative bg-[#050505] border border-white/10 flex flex-col h-[600px] lg:h-[650px] overflow-hidden">
      {/* Map Header */}
      <div className="px-6 py-3.5 border-b border-white/10 bg-[#0d0d0d] flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3">
          <span className="label">Corridor Preemption Vector Radar</span>
          <span className="unit-badge text-[#00f2ff] border-[#00f2ff]/40">Sector 01-04 Active</span>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 font-mono-tech text-[11px]">
          <button
            onClick={() => setActiveCorridorFilter('all')}
            className={`px-3 py-1 uppercase tracking-wider transition-colors cursor-pointer border ${
              activeCorridorFilter === 'all'
                ? 'bg-white text-black font-bold border-white'
                : 'bg-[#1a1a1c] text-white/50 border-white/10 hover:text-white'
            }`}
          >
            All Corridors
          </button>
          <button
            onClick={() => setActiveCorridorFilter('corr-alpha')}
            className={`px-3 py-1 uppercase tracking-wider transition-colors cursor-pointer border ${
              activeCorridorFilter === 'corr-alpha'
                ? 'bg-[#ff2d55] text-white font-bold border-[#ff2d55]'
                : 'bg-[#1a1a1c] text-white/50 border-white/10 hover:text-white'
            }`}
          >
            Alpha (Metro)
          </button>
          <button
            onClick={() => setActiveCorridorFilter('corr-beta')}
            className={`px-3 py-1 uppercase tracking-wider transition-colors cursor-pointer border ${
              activeCorridorFilter === 'corr-beta'
                ? 'bg-[#00f2ff] text-black font-bold border-[#00f2ff]'
                : 'bg-[#1a1a1c] text-white/50 border-white/10 hover:text-white'
            }`}
          >
            Beta (Neuro)
          </button>
        </div>
      </div>

      {/* Main Vector Radar Canvas */}
      <div className="relative flex-1 bg-[#050505] overflow-hidden select-none">
        {/* Tactical Dot Radial Matrix */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        {/* SVG Drawing Layer for Radar rings, Grid lines, Corridors */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="tacticalGrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.2" />
            </pattern>
          </defs>

          {/* Grid background */}
          <rect width="100" height="100" fill="url(#tacticalGrid)" />

          {/* Concentric Radar Range Circles */}
          <circle cx="50" cy="50" r="18" stroke="#00f2ff" strokeWidth="0.2" fill="none" strokeDasharray="1 1" opacity="0.3" />
          <circle cx="50" cy="50" r="32" stroke="#00f2ff" strokeWidth="0.2" fill="none" strokeDasharray="1.5 1.5" opacity="0.25" />
          <circle cx="50" cy="50" r="44" stroke="#00f2ff" strokeWidth="0.2" fill="none" strokeDasharray="2 2" opacity="0.2" />

          {/* Radar Sweep Crosshair Axes */}
          <line x1="50" y1="0" x2="50" y2="100" stroke="#00f2ff" strokeWidth="0.15" strokeDasharray="1 2" opacity="0.2" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#00f2ff" strokeWidth="0.15" strokeDasharray="1 2" opacity="0.2" />

          {/* Background Arterial Roads */}
          <path
            d="M 10 20 L 90 20 M 10 40 L 90 40 M 10 60 L 90 60 M 10 80 L 90 80 M 20 10 L 20 90 M 40 10 L 40 90 M 60 10 L 60 90 M 80 10 L 80 90"
            stroke="#1a1a1c"
            strokeWidth="0.4"
            fill="none"
          />

          {/* Emergency Corridors */}
          {displayedCorridors.map((corridor) => {
            const pointsStr = corridor.pathPoints.map((p) => `${p.x},${p.y}`).join(' ');
            const isAlpha = corridor.id === 'corr-alpha';

            return (
              <g key={corridor.id}>
                {/* Outer Corridor Track */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={isAlpha ? '#ff2d55' : '#00f2ff'}
                  strokeWidth="1.8"
                  strokeOpacity="0.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Active Preemption Dash Line */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={isAlpha ? '#ff2d55' : '#00f2ff'}
                  strokeWidth="0.8"
                  strokeDasharray="2 1"
                  className="animate-ecg"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </svg>

        {/* Tactical Preemption Floating Badge */}
        <div className="absolute bottom-5 right-6 text-right pointer-events-none z-10">
          <div className="label text-[#00f2ff]">TSPS Priority Wave</div>
          <div className="font-mono-tech text-2xl font-bold text-white tracking-wider">ACTIVE</div>
        </div>

        {/* Traffic Intersections */}
        {intersections.map((intersection) => {
          const isPreempted = intersection.status === 'PREEMPTED_GREEN';
          const isYellow = intersection.status === 'CLEARING_YELLOW';

          return (
            <div
              key={intersection.id}
              style={{ left: `${intersection.coords.x}%`, top: `${intersection.coords.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 cursor-pointer"
              onClick={() => toggleCorridorPreemption(intersection.id)}
            >
              <div
                className={`w-5 h-5 flex items-center justify-center transition-all ${
                  isPreempted
                    ? 'bg-[#00ffaa]/10 border border-[#00ffaa] shadow-[0_0_12px_rgba(0,255,170,0.4)]'
                    : isYellow
                    ? 'bg-[#ffd60a]/10 border border-[#ffd60a]'
                    : 'bg-[#ff2d55]/10 border border-[#ff2d55]'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 ${
                    isPreempted
                      ? 'bg-[#00ffaa]'
                      : isYellow
                      ? 'bg-[#ffd60a]'
                      : 'bg-[#ff2d55]'
                  }`}
                />
              </div>

              {/* Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-7 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-52 p-2 bg-[#1a1a1c] border border-white/20 shadow-xl z-30 font-mono-tech text-[10px]">
                <div className="font-bold text-white uppercase">{intersection.name}</div>
                <div className="text-white/40 mb-1">{intersection.corridorName}</div>
                <div className="flex items-center justify-between border-t border-white/10 pt-1">
                  <span className="text-white/50">SIGNAL:</span>
                  <span
                    className={
                      isPreempted
                        ? 'text-[#00ffaa] font-bold'
                        : isYellow
                        ? 'text-[#ffd60a]'
                        : 'text-[#ff2d55]'
                    }
                  >
                    {isPreempted ? 'PREEMPTED GREEN' : isYellow ? 'CLEARING' : 'HOLD RED'}
                  </span>
                </div>
                {intersection.timeUntilAmbulancePassSec > 0 && (
                  <div className="flex items-center justify-between text-white/50 mt-0.5">
                    <span>ETA PASS:</span>
                    <span className="text-[#00f2ff] font-bold">{intersection.timeUntilAmbulancePassSec}s</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Hospital Nodes */}
        {hospitals.map((hospital) => {
          const isSelected = hospital.id === selectedAmbulance?.assignedHospitalId;
          const availableTrauma =
            hospital.beds.traumaBay.total -
            (hospital.beds.traumaBay.occupied + hospital.beds.traumaBay.reserved);

          return (
            <div
              key={hospital.id}
              style={{ left: `${hospital.coords.x}%`, top: `${hospital.coords.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 cursor-pointer"
              onClick={() => {
                setSelectedHospitalId(hospital.id);
                setActiveView('triage');
              }}
            >
              <div
                className={`p-2 transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#1a1a1c] border-2 border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.25)] text-white'
                    : 'bg-[#0d0d0d] border border-white/15 hover:border-white/40 text-white/90'
                }`}
              >
                <HospitalIcon className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
                <div className="text-left font-mono-tech pr-1">
                  <div className="text-[11px] font-bold uppercase whitespace-nowrap">{hospital.shortName}</div>
                  <div className="text-[9px] text-white/40 flex items-center gap-1.5">
                    <span className={availableTrauma > 0 ? 'text-[#00ffaa] font-bold' : 'text-[#ff2d55]'}>
                      {availableTrauma} FREE
                    </span>
                    <span>·</span>
                    <span>{hospital.currentWaitTimeMins}m WAIT</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Moving Ambulances */}
        {ambulances.map((amb) => {
          if (amb.status === 'available' && amb.speedKmh === 0) return null;
          const isSelected = amb.id === selectedAmbulanceId;
          const pt = patients.find((p) => p.id === amb.patientId);

          return (
            <div
              key={amb.id}
              style={{ left: `${amb.coords.x}%`, top: `${amb.coords.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group z-30 cursor-pointer transition-all duration-700 ease-out"
              onClick={() => {
                setSelectedAmbulanceId(amb.id);
                if (amb.patientId) setSelectedPatientId(amb.patientId);
              }}
            >
              {/* Emergency Beacon Radar ping */}
              {amb.sirenActive && (
                <div className="absolute inset-0 -m-3 rounded-full border border-[#ff2d55] animate-ping opacity-60 pointer-events-none" />
              )}

              <div
                className={`px-2 py-1 flex items-center gap-1.5 transition-all font-mono-tech text-[10px] ${
                  isSelected
                    ? 'bg-[#ff2d55] text-white font-bold border border-white'
                    : 'bg-[#1a1a1c] border border-white/20 text-white hover:border-[#00f2ff]'
                }`}
              >
                <Navigation
                  className={`w-3 h-3 transform rotate-45 ${
                    amb.sirenActive ? 'text-white' : 'text-white/40'
                  }`}
                />
                <span className="font-bold whitespace-nowrap">{amb.callsign}</span>
                <span className="opacity-80">[{amb.speedKmh}KM/H]</span>
              </div>

              {/* Tactical Label Callout */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-1 bg-black/90 border border-white/10 text-[9px] font-mono-tech text-[#ff2d55] font-bold">
                {amb.callsign} [VECTOR ACTIVE]
              </div>
            </div>
          );
        })}
      </div>

      {/* Tactical Telemetry Bottom HUD */}
      {selectedAmbulance && (
        <div className="p-4 border-t border-white/10 bg-[#0d0d0d] grid grid-cols-1 md:grid-cols-3 items-center gap-4 z-20">
          {/* Tracking Unit */}
          <div>
            <div className="label">Tracking Unit</div>
            <div className="font-mono-tech font-bold text-white text-sm">
              {selectedAmbulance.callsign} / {selectedAmbulance.speedKmh} km/h
            </div>
            <div className="text-[11px] text-white/40 font-mono-tech mt-0.5">
              Dest: {targetHospital?.shortName || 'Field'} · Radio: {selectedAmbulance.radioChannel}
            </div>
            {selectedAmbulance.predictiveTrafficImpact && (
              <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                <span
                  className="font-bold px-1"
                  style={{
                    color: selectedAmbulance.predictiveTrafficImpact.colorCode,
                    backgroundColor: `${selectedAmbulance.predictiveTrafficImpact.colorCode}20`,
                    border: `1px solid ${selectedAmbulance.predictiveTrafficImpact.colorCode}40`,
                  }}
                >
                  IMPACT: {selectedAmbulance.predictiveTrafficImpact.score}/100 [{selectedAmbulance.predictiveTrafficImpact.statusLabel}]
                </span>
                <span className="text-white/50">
                  {selectedAmbulance.predictiveTrafficImpact.projectedDelayMinutes <= 0
                    ? `${Math.abs(selectedAmbulance.predictiveTrafficImpact.projectedDelayMinutes)}m saved`
                    : `+${selectedAmbulance.predictiveTrafficImpact.projectedDelayMinutes}m delay`}
                </span>
              </div>
            )}
          </div>

          {/* Estimated Arrival */}
          <div className="md:text-center">
            <div className="label">Estimated Arrival</div>
            <div className="font-mono-tech font-bold text-[#00f2ff] text-base">
              {Math.floor(selectedAmbulance.etaSeconds / 60)}m {selectedAmbulance.etaSeconds % 60}s · {selectedAmbulance.distanceKm} km
            </div>
            {assignedPatient && (
              <div className="text-[11px] text-[#ff2d55] font-mono-tech truncate mt-0.5">
                {assignedPatient.traumaAlertLevel} · {assignedPatient.name}
              </div>
            )}
          </div>

          {/* Tactical Controls */}
          <div className="flex items-center justify-start md:justify-end gap-2 font-mono-tech">
            {/* Siren Toggle */}
            <button
              onClick={() => toggleAmbulanceSiren(selectedAmbulance.id)}
              className={`px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold transition-colors cursor-pointer border ${
                selectedAmbulance.sirenActive
                  ? 'bg-[#ff2d55] text-white border-[#ff2d55]'
                  : 'bg-[#1a1a1c] text-white/50 border-white/10 hover:text-white'
              }`}
            >
              <Siren className="w-3.5 h-3.5 inline mr-1.5" />
              <span>{selectedAmbulance.sirenActive ? 'SIREN ON' : 'SIREN OFF'}</span>
            </button>

            {/* Reroute Selector */}
            <div className="relative">
              <button
                onClick={() => setShowRerouteMenu(!showRerouteMenu)}
                className="btn-tactical-outline text-[11px] py-1.5"
              >
                <SlidersHorizontal className="w-3 h-3 mr-1" />
                <span>Reroute</span>
              </button>

              {showRerouteMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-64 bg-[#1a1a1c] border border-white/20 shadow-2xl p-2 z-50 text-xs font-mono-tech">
                  <div className="label mb-2 px-1">EMERGENCY DIVERT / REROUTE:</div>
                  {hospitals.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => {
                        rerouteAmbulance(selectedAmbulance.id, h.id);
                        setShowRerouteMenu(false);
                      }}
                      className={`w-full text-left p-2 hover:bg-white/10 transition-colors flex items-center justify-between uppercase ${
                        h.id === selectedAmbulance.assignedHospitalId ? 'text-[#00f2ff] font-bold' : 'text-white/70'
                      }`}
                    >
                      <span className="truncate">{h.shortName}</span>
                      <span className="text-[10px] text-white/40">{h.distanceFromCenterKm}KM</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Inspect Telemetry & Handoff */}
            {assignedPatient && (
              <>
                <button
                  onClick={() => openHandoffModal(assignedPatient.id)}
                  className="btn-tactical text-[11px] py-1.5 flex items-center gap-1"
                  title="Open Patient Handoff & Bed Disposition Protocol"
                >
                  <span>Handoff</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedPatientId(assignedPatient.id);
                    setActiveView('telemetry');
                  }}
                  className="btn-tactical-outline text-[11px] py-1.5"
                >
                  <span>Vitals</span>
                  <ChevronRight className="w-3 h-3 ml-1" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
