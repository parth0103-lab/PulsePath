import React, { useState } from 'react';
import { EmergencyProvider, useEmergency } from './context/EmergencyContext';
import { Header } from './components/Header';
import { CorridorMap } from './components/CorridorMap';
import { BedTriageMatrix } from './components/BedTriageMatrix';
import { PatientTelemetryView } from './components/PatientTelemetryView';
import { CADDispatchView } from './components/CADDispatchView';
import { AmbulanceFleetPanel } from './components/AmbulanceFleetPanel';
import { PatientHandoffModal } from './components/PatientHandoffModal';
import { VoiceDispatchLayer } from './components/VoiceDispatchLayer';
import {
  X,
  CheckCircle2,
  Gauge,
  AlertTriangle,
  ArrowRight,
  SlidersHorizontal,
  Activity,
  ChevronRight,
} from 'lucide-react';

const EmergencyDashboardContent: React.FC = () => {
  const {
    activeView,
    setActiveView,
    recentAlert,
    dismissAlert,
    patients,
    hospitals,
    selectedPatientId,
    setSelectedPatientId,
    ambulances,
    selectedAmbulanceId,
    setSelectedAmbulanceId,
    intersections,
    openHandoffModal,
    rerouteAmbulance,
    simulateCorridorBottleneck,
  } = useEmergency();

  const [fleetFilter, setFleetFilter] = useState<'all' | 'transit'>('all');

  const selectedPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  // Calculated Metrics for systematic stat-grid
  const enRouteAmbulancesCount = ambulances.filter(
    (a) => a.status === 'en_route_hospital'
  ).length;

  const preemptedSignalsCount = intersections.filter(
    (i) => i.status === 'PREEMPTED_GREEN'
  ).length;

  let totalCriticalBeds = 0;
  let availableCriticalBeds = 0;
  hospitals.forEach((h) => {
    totalCriticalBeds += h.beds.traumaBay.total + h.beds.icu.total;
    const freeTrauma =
      h.beds.traumaBay.total - (h.beds.traumaBay.occupied + h.beds.traumaBay.reserved);
    const freeIcu =
      h.beds.icu.total - (h.beds.icu.occupied + h.beds.icu.reserved);
    availableCriticalBeds += Math.max(0, freeTrauma) + Math.max(0, freeIcu);
  });

  const avgFlowScore = Math.round(
    ambulances.reduce((acc, a) => acc + (a.predictiveTrafficImpact?.score || 90), 0) /
      (ambulances.length || 1)
  );

  const unitsWithReroute = ambulances.filter(
    (a) => a.predictiveTrafficImpact?.rerouteRecommendation?.recommended
  );

  const displayedAmbulances = ambulances.filter((a) => {
    if (fleetFilter === 'transit') return a.status === 'en_route_hospital';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col font-sans selection:bg-[#00f2ff] selection:text-[#0d0d0d]">
      {/* Technical Header */}
      <Header />

      {/* Patient Handoff Modal */}
      <PatientHandoffModal />

      {/* Alert Ticker Strip */}
      {recentAlert && (
        <div className="bg-[#ff2d55] text-white px-6 py-1.5 font-mono-tech font-bold text-[11px] flex items-center justify-between tracking-wide z-30">
          <div className="truncate pr-4 flex items-center gap-2">
            <span>[CRITICAL]</span>
            <span className="uppercase">{recentAlert}</span>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-[10px] uppercase">
            <span className="hidden sm:inline">REGION-WIDE SYNC ACTIVE 100%</span>
            <button
              onClick={dismissAlert}
              className="hover:opacity-75 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden">
        {/* VIEW 1: Overview Command Center (Exact Variation 5 3-column workstation layout) */}
        {activeView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr_340px] border-b border-white/10 min-h-[calc(100vh-64px-48px-32px)]">
            {/* Column 1: Systematic Stats & Fleet Status */}
            <section className="border-r border-white/10 p-5 flex flex-col bg-[#0d0d0d] space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="label">System Overview</span>
                  <span className="unit-badge text-[#00f2ff] border-[#00f2ff]/40">Live Feed</span>
                </div>

                {/* Systematic Stats Grid */}
                <div className="grid grid-cols-2 gap-[1px] bg-white/10 -mx-5">
                  <div className="bg-[#0d0d0d] p-4">
                    <div className="label text-[10px]">Ambulances En Route</div>
                    <h3 className="font-syne text-3xl font-extrabold tracking-tighter leading-none mt-1 text-white">
                      {String(enRouteAmbulancesCount).padStart(2, '0')}
                    </h3>
                  </div>

                  <div className="bg-[#0d0d0d] p-4">
                    <div className="label text-[10px]">Preempted Signals</div>
                    <h3 className="font-syne text-3xl font-extrabold tracking-tighter leading-none mt-1 text-white">
                      {String(preemptedSignalsCount).padStart(2, '0')}
                    </h3>
                  </div>

                  <div className="bg-[#0d0d0d] p-4">
                    <div className="label text-[10px]">Critical Bay Vacancy</div>
                    <h3 className="font-syne text-3xl font-extrabold tracking-tighter leading-none mt-1 text-[#ff2d55]">
                      {availableCriticalBeds}/{totalCriticalBeds}
                    </h3>
                  </div>

                  <div className="bg-[#0d0d0d] p-4">
                    <div className="label text-[10px]">Corridor Preemption Flow</div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <h3
                        className="font-syne text-3xl font-extrabold tracking-tighter leading-none"
                        style={{
                          color:
                            avgFlowScore >= 80 ? '#00ffaa' : avgFlowScore >= 60 ? '#00f2ff' : '#ffaa00',
                        }}
                      >
                        {avgFlowScore}
                      </h3>
                      <span className="text-[10px] text-white/50 font-mono-tech">/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Fleet Status with Predictive Traffic Impact */}
              <div className="flex-1 flex flex-col pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="label text-white">Fleet Predictive Impact</span>
                    {unitsWithReroute.length > 0 && (
                      <span className="text-[9px] font-mono-tech font-bold px-1.5 py-0.5 bg-[#ffaa00]/20 text-[#ffaa00] border border-[#ffaa00]/40 animate-pulse">
                        {unitsWithReroute.length} REROUTE
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveView('fleet')}
                    className="text-[10px] font-mono-tech text-[#00f2ff] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Radar</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Filter Selector */}
                <div className="flex items-center justify-between gap-1 mb-3 text-[10px] font-mono-tech">
                  <div className="flex items-center bg-[#141416] p-0.5 border border-white/10">
                    <button
                      onClick={() => setFleetFilter('all')}
                      className={`px-2 py-0.5 uppercase transition-colors cursor-pointer ${
                        fleetFilter === 'all'
                          ? 'bg-white text-black font-bold'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      All ({ambulances.length})
                    </button>
                    <button
                      onClick={() => setFleetFilter('transit')}
                      className={`px-2 py-0.5 uppercase transition-colors cursor-pointer ${
                        fleetFilter === 'transit'
                          ? 'bg-[#00f2ff] text-black font-bold'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      Transit ({enRouteAmbulancesCount})
                    </button>
                  </div>

                  <button
                    onClick={() => simulateCorridorBottleneck()}
                    className="text-[9px] px-2 py-1 bg-[#1a1a1c] hover:bg-[#ff2d55]/20 text-white/70 hover:text-[#ff2d55] border border-white/10 transition-colors cursor-pointer"
                    title="Simulate signal outage or sudden bottleneck on Corridor Alpha to test real-time predictive score reroute"
                  >
                    Test Bottleneck
                  </button>
                </div>

                {/* Ambulance Fleet Cards */}
                <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-380px)] pr-1">
                  {displayedAmbulances.map((amb) => {
                    const isAvail = amb.status === 'available';
                    const isSelected = amb.id === selectedAmbulanceId;
                    const pt = patients.find((p) => p.id === amb.patientId);
                    const impact = amb.predictiveTrafficImpact;
                    const reroute = impact?.rerouteRecommendation;

                    return (
                      <div
                        key={amb.id}
                        onClick={() => {
                          setSelectedAmbulanceId(amb.id);
                          if (amb.patientId) setSelectedPatientId(amb.patientId);
                        }}
                        className={`p-3 bg-[#141416] border transition-all cursor-pointer font-mono-tech ${
                          isSelected
                            ? 'border-[#00f2ff] shadow-[0_0_12px_rgba(0,242,255,0.15)] bg-[#1a1a1e]'
                            : isAvail
                            ? 'border-white/10 hover:border-white/30'
                            : 'border-white/15 hover:border-white/40'
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{amb.callsign}</span>
                            <span className="text-[9px] px-1 bg-white/5 border border-white/10 text-white/60">
                              {amb.type}
                            </span>
                          </div>

                          <span
                            className={`unit-badge text-[10px] ${
                              isAvail
                                ? 'text-[#00ffaa] border-[#00ffaa]'
                                : 'text-[#ff2d55] border-[#ff2d55]'
                            }`}
                          >
                            {isAvail ? 'Available' : pt?.traumaAlertLevel || 'Code Transit'}
                          </span>
                        </div>

                        {/* In-Transit Destination & ETA */}
                        {!isAvail ? (
                          <div className="flex justify-between items-center text-[10px] text-white/60 mt-1.5">
                            <span>
                              DEST: {amb.assignedHospitalId === 'hosp-metro' ? 'METRO TRAUMA' : 'ST. JUDE NEURO'}
                            </span>
                            <span className="text-[#00f2ff] font-bold">
                              ETA {Math.floor(amb.etaSeconds / 60)}m {amb.etaSeconds % 60}s ({amb.distanceKm}km)
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-white/40 mt-1">
                            Standby Patrol · Sector 01-02 Ready
                          </div>
                        )}

                        {/* PREDICTIVE TRAFFIC IMPACT SCORE STRIP */}
                        {impact && (
                          <div className="mt-2.5 pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-white/50 text-[9px] uppercase tracking-wider">
                                Traffic Impact Score
                              </span>
                              <span
                                className="font-bold text-[11px]"
                                style={{ color: impact.colorCode }}
                              >
                                {impact.score}/100 [{impact.statusLabel}]
                              </span>
                            </div>

                            {/* Impact Bar */}
                            <div className="h-1.5 w-full bg-white/10 mt-1 overflow-hidden rounded-none">
                              <div
                                className="h-full transition-all duration-500"
                                style={{
                                  width: `${Math.max(5, impact.score)}%`,
                                  backgroundColor: impact.colorCode,
                                }}
                              />
                            </div>

                            {/* Preemption rate & time delta */}
                            <div className="flex items-center justify-between text-[9px] text-white/50 mt-1 font-mono-tech">
                              <span>
                                {impact.preemptedSignalsCount}/{impact.totalSignalsCount} Signals Preempted ({impact.preemptionRatePct}%)
                              </span>
                              <span className={impact.projectedDelayMinutes <= 0 ? 'text-[#00ffaa]' : 'text-[#ff2d55]'}>
                                {impact.projectedDelayMinutes <= 0
                                  ? `${Math.abs(impact.projectedDelayMinutes)}m saved`
                                  : `+${impact.projectedDelayMinutes}m delay`}
                              </span>
                            </div>

                            {/* Reroute Recommendation Callout */}
                            {reroute?.recommended && (
                              <div className="mt-2 p-2 bg-[#ffaa00]/15 border border-[#ffaa00]/50 text-[10px] space-y-1.5">
                                <div className="flex items-center gap-1.5 text-[#ffaa00] font-bold">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span>REROUTE ADVICE (-{reroute.projectedMinutesSaved}M SAVED)</span>
                                </div>
                                <p className="text-white/80 text-[9px] leading-tight">
                                  {reroute.reason}
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    rerouteAmbulance(amb.id, reroute.targetHospitalId);
                                  }}
                                  className="w-full py-1 px-2 bg-[#ffaa00] hover:bg-[#ffaa00]/90 text-black font-bold text-[9px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>Execute Reroute to {reroute.targetHospitalName}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Card Footer Actions */}
                        <div className="mt-2.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px]">
                          <span className="text-white/40">Radio: {amb.radioChannel}</span>
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <span className="text-[#00f2ff] font-bold">● SELECTED</span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAmbulanceId(amb.id);
                                setActiveView('corridor');
                              }}
                              className="text-white/60 hover:text-white hover:underline cursor-pointer"
                            >
                              Corridor Radar →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Column 2: Corridor Radar */}
            <section className="border-r border-white/10 p-0 bg-[#050505] flex flex-col">
              <CorridorMap />
            </section>

            {/* Column 3: Field Vitals Stream & Bed Triage Matrix */}
            <section className="p-6 bg-[#0d0d0d] flex flex-col space-y-6">
              {/* Field Vitals Stream Card */}
              {selectedPatient && (
                <div>
                  <div className="label mb-3">Field Vitals Stream [Real-Time]</div>
                  <div className="card-tactical card-urgent">
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-syne text-lg font-bold uppercase tracking-tight text-white">
                        {selectedPatient.name}
                      </h4>
                      <span className="unit-badge text-[#ff2d55] border-[#ff2d55]">
                        ESI {selectedPatient.triageLevel}
                      </span>
                    </div>

                    <div className="label my-1.5 text-white/60">
                      {selectedPatient.age}y/{selectedPatient.gender} · {selectedPatient.id}
                    </div>

                    <p className="text-xs leading-relaxed text-white/60 font-sans line-clamp-2">
                      {selectedPatient.chiefComplaint}
                    </p>

                    {/* Vitals */}
                    <div className="flex gap-6 mt-4 font-mono-tech">
                      <div>
                        <span className="label text-[9px] block">HR</span>
                        <span className="font-bold text-lg text-[#ff2d55]">
                          {selectedPatient.vitals.hr}
                        </span>
                      </div>
                      <div>
                        <span className="label text-[9px] block">BP</span>
                        <span className="font-bold text-lg text-white">
                          {selectedPatient.vitals.sbp}/{selectedPatient.vitals.dbp}
                        </span>
                      </div>
                      <div>
                        <span className="label text-[9px] block">SPO2</span>
                        <span className="font-bold text-lg text-[#00f2ff]">
                          {selectedPatient.vitals.spo2}%
                        </span>
                      </div>
                    </div>

                    {selectedPatient.status === 'delivered' && (
                      <div className="mt-3 p-2 bg-[#00ffaa]/10 border border-[#00ffaa]/40 text-[#00ffaa] text-[10px] font-mono-tech flex items-center justify-between">
                        <span>DELIVERED · BED OCCUPIED</span>
                        <span>{selectedPatient.deliveryTimestamp || 'TRANSFER VERIFIED'}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => setActiveView('telemetry')}
                        className="btn-tactical-outline w-full text-center"
                      >
                        Telemetry Stream
                      </button>

                      <button
                        onClick={() => openHandoffModal(selectedPatient.id)}
                        className="btn-tactical w-full text-center flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#ff2d55]" />
                        <span>{selectedPatient.status === 'delivered' ? 'Handoff Done' : 'Patient Handoff'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bed Triage Matrix Quick Strip */}
              <div>
                <div className="label mb-3">Bed Triage Matrix</div>
                <div className="grid gap-[1px] bg-white/10 font-mono-tech">
                  {hospitals.map((hosp) => {
                    const freeTrauma =
                      hosp.beds.traumaBay.total -
                      (hosp.beds.traumaBay.occupied + hosp.beds.traumaBay.reserved);

                    return (
                      <div
                        key={hosp.id}
                        onClick={() => setActiveView('triage')}
                        className="bg-[#0d0d0d] p-3 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <span className="text-xs font-semibold uppercase text-white/90">
                          {hosp.shortName}
                        </span>
                        <span
                          className={`font-bold text-xs ${
                            freeTrauma > 0 ? 'text-[#00ffaa]' : 'text-[#ff2d55]'
                          }`}
                        >
                          {freeTrauma > 0 ? `${freeTrauma} FREE` : 'FULL'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: Corridor Radar Dedicated */}
        {activeView === 'corridor' && (
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <CorridorMap />
            <AmbulanceFleetPanel />
          </div>
        )}

        {/* VIEW: Fleet Radar Dedicated */}
        {activeView === 'fleet' && (
          <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <AmbulanceFleetPanel />
          </div>
        )}

        {/* VIEW 3: Bed Triage Dedicated */}
        {activeView === 'triage' && (
          <div className="p-6 max-w-7xl mx-auto">
            <BedTriageMatrix />
          </div>
        )}

        {/* VIEW 4: Telemetry Dedicated */}
        {activeView === 'telemetry' && (
          <div className="p-6 max-w-7xl mx-auto">
            <PatientTelemetryView />
          </div>
        )}

        {/* VIEW 5: CAD Dispatch Dedicated */}
        {activeView === 'dispatch' && (
          <div className="p-6 max-w-7xl mx-auto">
            <CADDispatchView />
          </div>
        )}
      </main>

      {/* Technical Footer */}
      <footer className="h-12 px-6 border-t border-white/10 flex justify-between items-center bg-[#1a1a1c] z-20 mb-14">
        <div className="label">PULSEPATH E.T.S. // VERSION 4.3.0_STABLE</div>
        <div className="flex gap-8">
          <div className="label flex items-center gap-1.5">
            <span className="text-[#00ffaa]">●</span>
            <span>TAC-01 ACTIVE</span>
          </div>
          <div className="label flex items-center gap-1.5">
            <span className="text-[#00f2ff]">●</span>
            <span>CORRIDOR WAVE ONLINE</span>
          </div>
        </div>
      </footer>

      {/* Dispatcher Voice-to-Text Control Layer (Hands-Free Radio Dispatch) */}
      <VoiceDispatchLayer />
    </div>
  );
};

export default function App() {
  return (
    <EmergencyProvider>
      <EmergencyDashboardContent />
    </EmergencyProvider>
  );
}
