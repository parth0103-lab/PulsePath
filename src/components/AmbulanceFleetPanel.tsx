import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import {
  Siren,
  Battery,
  MapPin,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Gauge,
  Layers,
  ChevronDown,
  ChevronUp,
  Radio,
} from 'lucide-react';

export const AmbulanceFleetPanel: React.FC = () => {
  const {
    ambulances,
    patients,
    hospitals,
    intersections,
    corridors,
    selectedAmbulanceId,
    setSelectedAmbulanceId,
    setSelectedPatientId,
    toggleAmbulanceSiren,
    rerouteAmbulance,
    openHandoffModal,
    triggerAiTrafficGrounding,
    toggleCorridorPreemption,
    simulateCorridorBottleneck,
    resetAmbulanceUnit,
  } = useEmergency();

  const [filter, setFilter] = useState<'all' | 'transit' | 'reroute'>('all');
  const [expandedRerouteAmbId, setExpandedRerouteAmbId] = useState<string | null>(null);
  const [expandedMapsAmbId, setExpandedMapsAmbId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Compute fleet-level metrics
  const inTransitAmbulances = ambulances.filter((a) => a.status === 'en_route_hospital');
  const unitsWithRerouteAdvice = ambulances.filter(
    (a) => a.predictiveTrafficImpact?.rerouteRecommendation?.recommended
  );

  const avgFlowScore = Math.round(
    ambulances.reduce((acc, a) => acc + (a.predictiveTrafficImpact?.score || 90), 0) /
      (ambulances.length || 1)
  );

  // Filter ambulances
  const filteredAmbulances = ambulances.filter((amb) => {
    if (filter === 'transit') return amb.status === 'en_route_hospital';
    if (filter === 'reroute') {
      return (
        amb.predictiveTrafficImpact?.rerouteRecommendation?.recommended ||
        (amb.predictiveTrafficImpact?.score || 100) < 75
      );
    }
    return true;
  });

  const handleSyncAllMapsGrounding = async () => {
    setIsSyncingAll(true);
    try {
      for (const amb of inTransitAmbulances) {
        await triggerAiTrafficGrounding(amb.id);
      }
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div className="space-y-4 font-mono-tech">
      {/* Fleet Overview & Dispatch Command Strip */}
      <div className="p-3 bg-[#141416] border border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <div className="label">Fleet Dispatch Telemetry</div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{ambulances.length} Active Units</span>
              <span className="text-[#00f2ff]">• {inTransitAmbulances.length} in Transit</span>
            </div>
          </div>

          <div className="hidden sm:block h-7 w-[1px] bg-white/10" />

          {/* Average Traffic Impact Flow Velocity */}
          <div className="hidden sm:flex items-center gap-3">
            <Gauge className="w-5 h-5 text-[#00f2ff]" />
            <div>
              <div className="label">Predictive Corridor Flow</div>
              <div className="text-xs font-bold flex items-center gap-2">
                <span
                  style={{
                    color:
                      avgFlowScore >= 80 ? '#00ffaa' : avgFlowScore >= 60 ? '#00f2ff' : '#ffaa00',
                  }}
                >
                  {avgFlowScore}/100 Index
                </span>
                <span className="text-white/40 text-[10px]">
                  {avgFlowScore >= 80 ? 'Optimal Green Wave' : 'Active Impedance Clearing'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dispatch Controls & Grounding Trigger */}
        <div className="flex items-center gap-2">
          {/* Quick Filter Buttons */}
          <div className="flex items-center bg-[#0d0d0d] p-0.5 border border-white/10">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1 text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              All ({ambulances.length})
            </button>
            <button
              onClick={() => setFilter('transit')}
              className={`px-2 py-1 text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                filter === 'transit'
                  ? 'bg-[#00f2ff] text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              In Transit ({inTransitAmbulances.length})
            </button>
            <button
              onClick={() => setFilter('reroute')}
              className={`px-2 py-1 text-[10px] font-bold uppercase transition-colors cursor-pointer flex items-center gap-1 ${
                filter === 'reroute'
                  ? 'bg-[#ffaa00] text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Reroute Alert ({unitsWithRerouteAdvice.length})
            </button>
          </div>

          {/* Sync All Google Maps Grounding */}
          <button
            onClick={handleSyncAllMapsGrounding}
            disabled={isSyncingAll}
            className="btn-tactical text-[10px] px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Query Gemini 2.5 Flash with Google Maps Grounding for live corridor intelligence"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncingAll ? 'animate-spin' : ''}`} />
            <span>{isSyncingAll ? 'SYNCING...' : 'MAPS GROUNDING'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Ambulance Vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredAmbulances.map((amb) => {
          const isSelected = amb.id === selectedAmbulanceId;
          const assignedPatient = patients.find((p) => p.id === amb.patientId);
          const targetHospital = hospitals.find((h) => h.id === amb.assignedHospitalId);
          const isAvailable = amb.status === 'available';
          const impact = amb.predictiveTrafficImpact;
          const corridor = corridors.find((c) => c.id === amb.corridorPathId);
          const corridorIntersections = corridor
            ? intersections.filter((i) => corridor.intersectionIds.includes(i.id))
            : [];

          const isRerouteExpanded = expandedRerouteAmbId === amb.id;
          const isMapsExpanded = expandedMapsAmbId === amb.id;

          return (
            <div
              key={amb.id}
              onClick={() => {
                setSelectedAmbulanceId(amb.id);
                if (amb.patientId) setSelectedPatientId(amb.patientId);
              }}
              className={`p-4 transition-all cursor-pointer border-l-4 flex flex-col justify-between ${
                isAvailable
                  ? 'border-l-[#00ffaa] bg-[#1a1a1c]'
                  : impact && impact.score < 65
                  ? 'border-l-[#ffaa00] bg-[#1a1a1c]'
                  : 'border-l-[#ff2d55] bg-[#1a1a1c]'
              } ${
                isSelected
                  ? 'border-y border-r border-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.2)]'
                  : 'border-y border-r border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                {/* Unit Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      {amb.callsign}
                    </span>
                    <span className="unit-badge text-white/60">
                      {amb.type}
                    </span>
                    {amb.corridorActive && (
                      <span className="text-[10px] text-[#00f2ff] font-bold px-1 bg-[#00f2ff]/10 border border-[#00f2ff]/30">
                        [TSPS PREEMPTION]
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAmbulanceSiren(amb.id);
                      }}
                      title={amb.sirenActive ? 'Siren On' : 'Siren Off'}
                      className={`p-1 transition-colors cursor-pointer border ${
                        amb.sirenActive
                          ? 'bg-[#ff2d55] text-white border-[#ff2d55]'
                          : 'bg-[#0d0d0d] text-white/40 border-white/10 hover:text-white'
                      }`}
                    >
                      <Siren className="w-3 h-3" />
                    </button>
                    <span
                      className={`unit-badge ${
                        isAvailable
                          ? 'text-[#00ffaa] border-[#00ffaa]'
                          : 'text-[#ff2d55] border-[#ff2d55]'
                      }`}
                    >
                      {isAvailable ? 'AVAILABLE' : 'CODE TRANSIT'}
                    </span>
                  </div>
                </div>

                {/* Patient / Mission Info */}
                {assignedPatient ? (
                  <div className="mb-2 p-2 bg-[#0d0d0d] border border-white/10">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-bold text-white truncate">
                        {assignedPatient.name}
                      </span>
                      <span className="text-[#ff2d55] font-bold text-[10px]">
                        {assignedPatient.traumaAlertLevel}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/40 truncate font-sans">
                      {assignedPatient.chiefComplaint}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/50 pt-1 mt-1 border-t border-white/10">
                      <span className="text-white/80">DEST: {targetHospital?.shortName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#00f2ff] font-bold">
                          ETA {Math.floor(amb.etaSeconds / 60)}M {amb.etaSeconds % 60}S
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openHandoffModal(assignedPatient.id);
                          }}
                          className="btn-tactical text-[9px] py-0.5 px-1.5 uppercase tracking-normal"
                          title="Complete Patient Handoff"
                        >
                          Handoff
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-2 p-2 bg-[#0d0d0d] border border-white/10 text-[10px] text-white/40 flex items-center justify-between">
                    <span>STANDBY PATROL · SECTOR 01</span>
                    <span className="text-[#00ffaa]">• READY FOR CAD DISPATCH</span>
                  </div>
                )}

                {/* Corridor Progress Bar */}
                {amb.status === 'en_route_hospital' && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
                      <span>CORRIDOR TRANSIT PROGRESS</span>
                      <span className="text-[#00f2ff] font-bold">{Math.round(amb.progressPct)}%</span>
                    </div>
                    <div className="w-full bg-[#0d0d0d] h-1.5 overflow-hidden">
                      <div
                        style={{ width: `${amb.progressPct}%` }}
                        className="bg-[#00f2ff] h-full transition-all duration-500 shadow-[0_0_8px_#00f2ff]"
                      />
                    </div>
                  </div>
                )}

                {/* PREDICTIVE TRAFFIC IMPACT SCORE CARD */}
                {impact && (
                  <div className="mb-3 p-2.5 bg-[#0d0d0d] border border-white/15 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-[#00f2ff]" />
                        <span className="label text-[10px] text-white/80">Predictive Traffic Impact</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs font-bold px-1.5 py-0.5"
                          style={{
                            color: impact.colorCode,
                            backgroundColor: `${impact.colorCode}15`,
                            border: `1px solid ${impact.colorCode}40`,
                          }}
                        >
                          {impact.score}/100
                        </span>
                        <span
                          className="text-[9px] font-bold tracking-wider"
                          style={{ color: impact.colorCode }}
                        >
                          [{impact.statusLabel}]
                        </span>
                      </div>
                    </div>

                    {/* Preemption Signals & Velocity Metric */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-white/10">
                      <div>
                        <div className="text-white/40">CORRIDOR SIGNALS</div>
                        <div className="font-bold text-white flex items-center gap-1">
                          <span
                            className={
                              impact.preemptedSignalsCount === impact.totalSignalsCount
                                ? 'text-[#00ffaa]'
                                : 'text-[#ffaa00]'
                            }
                          >
                            {impact.preemptedSignalsCount}/{impact.totalSignalsCount} Green Wave
                          </span>
                          <span className="text-white/40">({impact.preemptionRatePct}%)</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-white/40">TRANSIT ADVANTAGE</div>
                        <div
                          className="font-bold"
                          style={{
                            color: impact.projectedDelayMinutes <= 0 ? '#00ffaa' : '#ff2d55',
                          }}
                        >
                          {impact.projectedDelayMinutes <= 0 ? (
                            <span>{Math.abs(impact.projectedDelayMinutes)}m Saved</span>
                          ) : (
                            <span>+{impact.projectedDelayMinutes}m Delay Risk</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Intersection Signal Strip */}
                    {corridorIntersections.length > 0 && (
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[9px] text-white/40 mb-1">
                          <span>INTERSECTION NODES (CLICK TO TOGGLE WAVE)</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              simulateCorridorBottleneck(amb.id);
                            }}
                            className="text-[9px] text-[#00f2ff] hover:underline flex items-center gap-1 cursor-pointer"
                            title="Toggle corridor green wave to simulate traffic bottlenecks and test score recalculation"
                          >
                            <span>Shift Wave</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {corridorIntersections.map((intNode) => {
                            const isGreen = intNode.status === 'PREEMPTED_GREEN';
                            const isYellow = intNode.status === 'CLEARING_YELLOW';
                            return (
                              <button
                                key={intNode.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCorridorPreemption(intNode.id);
                                }}
                                title={`${intNode.name}: ${intNode.status} (Click to toggle preemption state)`}
                                className={`text-[8px] py-1 px-1 text-center truncate font-bold border transition-colors cursor-pointer hover:brightness-125 ${
                                  isGreen
                                    ? 'bg-[#00ffaa]/15 border-[#00ffaa]/40 text-[#00ffaa]'
                                    : isYellow
                                    ? 'bg-[#ffaa00]/15 border-[#ffaa00]/40 text-[#ffaa00]'
                                    : 'bg-[#ff2d55]/15 border-[#ff2d55]/40 text-[#ff2d55]'
                                }`}
                              >
                                {intNode.name.split('&')[0]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bottlenecks Warning */}
                    {impact.bottlenecks.length > 0 && amb.status === 'en_route_hospital' && (
                      <div className="p-1.5 bg-[#ffaa00]/10 border border-[#ffaa00]/30 text-[10px] text-[#ffaa00] flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Bottleneck Detected: </span>
                          <span>Unpreempted cross-traffic at {impact.bottlenecks.join(', ')}.</span>
                        </div>
                      </div>
                    )}

                    {/* REROUTE RECOMMENDATION ACTION CALLOUT */}
                    {impact.rerouteRecommendation?.recommended && (
                      <div className="p-2 bg-[#ffaa00]/15 border border-[#ffaa00] text-[10px] space-y-1.5">
                        <div className="flex items-center justify-between text-[#ffaa00] font-bold">
                          <span className="flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-[#ffaa00]" />
                            <span>RECOMMENDED REROUTE</span>
                          </span>
                          <span className="text-white bg-[#ffaa00] text-black px-1 text-[9px] font-bold">
                            +{impact.rerouteRecommendation.projectedMinutesSaved}M ADVANTAGE
                          </span>
                        </div>
                        <div className="text-white/80 text-[10px] font-sans">
                          {impact.rerouteRecommendation.reason}
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[#00f2ff] font-bold">
                            Via {impact.rerouteRecommendation.alternateCorridorName} → {impact.rerouteRecommendation.targetHospitalName}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[9px] text-[#ffaa00] hidden sm:flex items-center gap-1 bg-black/50 px-1.5 py-0.5 border border-[#ffaa00]/30"
                              title="Voice command recognized: say 'Reroute ALS-01 to St. Jude'"
                            >
                              <Radio className="w-2.5 h-2.5 animate-pulse" />
                              <span>VOX: "Reroute {amb.callsign}"</span>
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (impact.rerouteRecommendation?.targetHospitalId) {
                                  rerouteAmbulance(
                                    amb.id,
                                    impact.rerouteRecommendation.targetHospitalId
                                  );
                                }
                              }}
                              className="bg-[#ffaa00] text-black hover:bg-white text-[9px] px-2 py-1 font-bold uppercase transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span>Execute Reroute</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MANUAL REROUTE CORRIDOR ACCORDION */}
                {amb.status === 'en_route_hospital' && (
                  <div className="mb-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedRerouteAmbId(isRerouteExpanded ? null : amb.id);
                      }}
                      className="w-full py-1 px-2 bg-[#0d0d0d] hover:bg-white/5 border border-white/10 text-[10px] text-white/70 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3 text-[#00f2ff]" />
                        <span>Reroute Alternate Corridors ({hospitals.filter((h) => h.id !== amb.assignedHospitalId).length} Options)</span>
                      </span>
                      {isRerouteExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {isRerouteExpanded && (
                      <div className="p-2 bg-[#0d0d0d] border-x border-b border-white/10 space-y-1.5">
                        <div className="text-[9px] text-white/40 uppercase">
                          Select Alternate Destination for Immediate Rerouting:
                        </div>
                        {hospitals
                          .filter((h) => h.id !== amb.assignedHospitalId)
                          .map((altHosp) => {
                            const altCorr = corridors.find((c) => c.hospitalId === altHosp.id);
                            const altInts = altCorr
                              ? intersections.filter((i) => altCorr.intersectionIds.includes(i.id))
                              : [];
                            const altGreen = altInts.filter((i) => i.status === 'PREEMPTED_GREEN').length;
                            return (
                              <div
                                key={altHosp.id}
                                className="p-1.5 bg-[#141416] border border-white/10 flex items-center justify-between text-[10px]"
                              >
                                <div>
                                  <div className="font-bold text-white">{altHosp.shortName}</div>
                                  <div className="text-white/40 text-[9px]">
                                    {altHosp.distanceFromCenterKm} km · {altGreen}/{altInts.length} TSPS Clear
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    rerouteAmbulance(amb.id, altHosp.id);
                                    setExpandedRerouteAmbId(null);
                                  }}
                                  className="btn-tactical text-[9px] px-2 py-0.5 uppercase tracking-normal"
                                >
                                  Reroute Here
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* GOOGLE MAPS GROUNDING INTELLIGENCE DRAWER */}
                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedMapsAmbId(isMapsExpanded ? null : amb.id);
                      }}
                      className="flex-1 py-1 px-2 bg-[#0d0d0d] hover:bg-white/5 border border-white/10 text-[10px] text-[#00f2ff] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#00f2ff]" />
                        <span>Google Maps Grounding Intel</span>
                      </span>
                      {isMapsExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerAiTrafficGrounding(amb.id);
                        setExpandedMapsAmbId(amb.id);
                      }}
                      disabled={impact?.isAiAnalyzing}
                      title="Sync live Maps Grounding with Gemini 2.5 Flash"
                      className="p-1 px-2 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 border border-[#00f2ff]/30 text-[#00f2ff] text-[10px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className={`w-3 h-3 ${impact?.isAiAnalyzing ? 'animate-spin' : ''}`} />
                      <span>{impact?.isAiAnalyzing ? 'Analyzing...' : 'AI Ground'}</span>
                    </button>
                  </div>

                  {isMapsExpanded && (
                    <div className="p-2.5 bg-[#0d0d0d] border-x border-b border-white/10 space-y-2 mt-0.5">
                      {/* AI Grounded Commentary */}
                      <div className="text-[10px] text-white/80 font-sans leading-relaxed bg-[#141416] p-2 border border-white/10">
                        <div className="text-[#00f2ff] font-mono-tech text-[9px] font-bold mb-1 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>GEMINI 2.5 FLASH GROUNDED ASSESSMENT:</span>
                        </div>
                        {impact?.aiAnalysisSummary ||
                          'Corridor preemption verified. Arterial traffic impedance nominal.'}
                      </div>

                      {/* Verified Google Maps Links */}
                      <div>
                        <div className="label text-[9px] mb-1 text-white/50">
                          Verified Google Maps Corridors & Places:
                        </div>
                        <div className="space-y-1">
                          {impact?.groundedPlaceLinks && impact.groundedPlaceLinks.length > 0 ? (
                            impact.groundedPlaceLinks.map((link, idx) => (
                              <a
                                key={idx}
                                href={link.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 bg-[#141416] hover:bg-[#1a1a1e] border border-white/10 hover:border-[#00f2ff]/40 flex items-center justify-between text-[10px] text-white transition-all group"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <MapPin className="w-3 h-3 text-[#ff2d55] shrink-0" />
                                  <span className="truncate group-hover:text-[#00f2ff]">
                                    {link.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[#00f2ff] text-[9px] shrink-0 ml-2">
                                  <span>Open Maps</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </div>
                              </a>
                            ))
                          ) : (
                            <div className="text-[9px] text-white/40">
                              No external maps links available yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Specs Footer */}
              <div className="flex items-center justify-between text-[10px] text-white/40 pt-2 border-t border-white/10 mt-2">
                <span>
                  {amb.speedKmh} KM/H · {amb.distanceKm} KM · RAD: {amb.radioChannel}
                </span>
                <span className="flex items-center gap-1">
                  <Battery className="w-2.5 h-2.5" />
                  <span>{amb.batteryOrFuelPct}%</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
