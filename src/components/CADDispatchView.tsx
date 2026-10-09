import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { Hospital, PriorityCode } from '../types';
import {
  MapPin,
  Clock,
  PlusCircle,
  Siren,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

export const CADDispatchView: React.FC = () => {
  const {
    cadIncidents,
    ambulances,
    hospitals,
    dispatchAmbulanceToIncident,
    setActiveView,
    addCadIncident,
    resetAmbulanceUnit,
  } = useEmergency();

  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    cadIncidents[0]?.id || ''
  );
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>(
    ambulances.find((a) => a.status === 'available')?.id || ambulances[0]?.id || ''
  );
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    hospitals[0]?.id || ''
  );
  const [selectedBedType, setSelectedBedType] = useState<keyof Hospital['beds']>('traumaBay');

  // Manual intake state
  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [manualCaller, setManualCaller] = useState<string>('911 Caller (Direct Line)');
  const [manualLocation, setManualLocation] = useState<string>('740 West Valley Parkway');
  const [manualComplaint, setManualComplaint] = useState<string>(
    'Acute Subarachnoid Hemorrhage - Thunderclap headache, collapse with seizure'
  );
  const [manualSeverity, setManualSeverity] = useState<PriorityCode>('Code 3 - Critical');
  const [manualBedType, setManualBedType] = useState<keyof Hospital['beds']>('traumaBay');
  const [manualAge, setManualAge] = useState<number>(45);
  const [manualGender, setManualGender] = useState<'M' | 'F'>('M');
  const [createdSuccessAlert, setCreatedSuccessAlert] = useState<string | null>(null);

  const selectedHosp = hospitals.find((h) => h.id === selectedHospitalId);
  const availableAmbulances = ambulances.filter((a) => a.status === 'available');

  const handleCreateIncident = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualLocation.trim() || !manualComplaint.trim()) return;

    const newInc = addCadIncident({
      caller: manualCaller,
      location: manualLocation,
      chiefComplaint: manualComplaint,
      severity: manualSeverity,
      suggestedBedType: manualBedType,
      age: manualAge,
      gender: manualGender,
    });

    setSelectedIncidentId(newInc.id);
    setSelectedBedType(newInc.suggestedBedType);
    setCreatedSuccessAlert(`Incident ${newInc.id} logged & queued for dispatch.`);
    setTimeout(() => setCreatedSuccessAlert(null), 4000);
  };

  const applyPreset = (preset: {
    caller: string;
    location: string;
    complaint: string;
    severity: PriorityCode;
    bedType: keyof Hospital['beds'];
    age: number;
    gender: 'M' | 'F';
  }) => {
    setManualCaller(preset.caller);
    setManualLocation(preset.location);
    setManualComplaint(preset.complaint);
    setManualSeverity(preset.severity);
    setManualBedType(preset.bedType);
    setManualAge(preset.age);
    setManualGender(preset.gender);
  };

  const handleDispatch = () => {
    if (!selectedIncidentId || !selectedAmbulanceId || !selectedHospitalId) return;
    dispatchAmbulanceToIncident(
      selectedIncidentId,
      selectedAmbulanceId,
      selectedHospitalId,
      selectedBedType
    );
    setActiveView('corridor');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-[#1a1a1c] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="label text-[#00f2ff]">Computer-Aided Dispatch</div>
          <h2 className="font-syne text-xl font-bold uppercase tracking-tight text-white mt-0.5">
            CAD Incident Intake & Corridor Preemption Arming
          </h2>
        </div>

        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="btn-tactical-outline text-xs"
        >
          <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-[#00f2ff]" />
          <span>{showManualForm ? 'Hide Manual Intake' : 'Manual Intake Form'}</span>
        </button>
      </div>

      {/* Manual Intake Form */}
      {showManualForm && (
        <form onSubmit={handleCreateIncident} className="p-5 bg-[#0d0d0d] border border-white/15 space-y-4 font-mono-tech">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div>
              <div className="label text-[#00f2ff]">Manual 911 Call Intake Protocol</div>
              <div className="text-xs text-white/60">Log real-time emergency caller reports directly into the dispatch queue</div>
            </div>

            {createdSuccessAlert && (
              <div className="bg-[#00ffaa]/15 border border-[#00ffaa] text-[#00ffaa] text-xs px-2.5 py-1 flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{createdSuccessAlert}</span>
              </div>
            )}
          </div>

          {/* Quick Presets for Dispatchers */}
          <div>
            <div className="label text-white/50 text-[10px] mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#00f2ff]" />
              <span>RAPID 911 CALL PRESETS (CLICK TO AUTO-FILL):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    caller: 'Witness at Crash Site',
                    location: 'Intersection 4th Ave & Elm St',
                    complaint: 'High-velocity 2-car collision, driver pinned, severe chest contusion and flail segment',
                    severity: 'Code 3 - Critical',
                    bedType: 'traumaBay',
                    age: 28,
                    gender: 'M',
                  })
                }
                className="px-2 py-1 bg-[#1a1a1c] border border-white/10 hover:border-[#ff2d55] text-white/80 hover:text-white text-[10px] transition-colors cursor-pointer"
              >
                [Code 3] Severe MVA Extrication
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    caller: 'Family Member',
                    location: '1240 Highland Terrace, Apt 4B',
                    complaint: 'Crushing retrosternal chest pressure radiating to jaw, diaphoresis, impending arrest',
                    severity: 'Code 3 - Critical',
                    bedType: 'cathLab',
                    age: 62,
                    gender: 'M',
                  })
                }
                className="px-2 py-1 bg-[#1a1a1c] border border-white/10 hover:border-[#00f2ff] text-white/80 hover:text-white text-[10px] transition-colors cursor-pointer"
              >
                [Code 3] Acute Anterior STEMI
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    caller: 'Senior Care Staff',
                    location: 'Pinecrest Assisted Living, Wing C',
                    complaint: 'Acute right hemiplegia, expressive aphasia, onset witnessed 25 minutes ago',
                    severity: 'Code 2 - Urgent',
                    bedType: 'icu',
                    age: 76,
                    gender: 'F',
                  })
                }
                className="px-2 py-1 bg-[#1a1a1c] border border-white/10 hover:border-[#ffd60a] text-white/80 hover:text-white text-[10px] transition-colors cursor-pointer"
              >
                [Code 2] Acute Ischemic CVA
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    caller: 'Industrial Facility Safety Officer',
                    location: 'Harbor Chemical Plant, Pier 9',
                    complaint: 'Flash boiler explosion, partial thickness burns 40% TBSA and smoke inhalation',
                    severity: 'Code 3 - Critical',
                    bedType: 'traumaBay',
                    age: 39,
                    gender: 'M',
                  })
                }
                className="px-2 py-1 bg-[#1a1a1c] border border-white/10 hover:border-[#ff2d55] text-white/80 hover:text-white text-[10px] transition-colors cursor-pointer"
              >
                [Code 3] Industrial Burn Trauma
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-1">
            <div>
              <label className="block text-white/40 mb-1">INCIDENT LOCATION *</label>
              <input
                type="text"
                required
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder="Street address or cross street"
                className="w-full px-3 py-2 bg-[#1a1a1c] border border-white/10 text-white focus:border-[#00f2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-white/40 mb-1">CALLER / REPORT SOURCE</label>
              <input
                type="text"
                value={manualCaller}
                onChange={(e) => setManualCaller(e.target.value)}
                placeholder="Reporter identity or source"
                className="w-full px-3 py-2 bg-[#1a1a1c] border border-white/10 text-white focus:border-[#00f2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-white/40 mb-1">TRIAGE PRIORITY SEVERITY</label>
              <select
                value={manualSeverity}
                onChange={(e) => setManualSeverity(e.target.value as PriorityCode)}
                className="w-full px-3 py-2 bg-[#1a1a1c] border border-white/10 text-white focus:border-[#00f2ff] focus:outline-none"
              >
                <option value="Code 3 - Critical">Code 3 - Critical (Lights & Siren)</option>
                <option value="Code 2 - Urgent">Code 2 - Urgent Priority</option>
                <option value="Code 1 - Standard">Code 1 - Standard Non-Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-white/40 mb-1">RECOMMENDED BED DISPOSITION</label>
              <select
                value={manualBedType}
                onChange={(e) => setManualBedType(e.target.value as keyof Hospital['beds'])}
                className="w-full px-3 py-2 bg-[#1a1a1c] border border-white/10 text-white focus:border-[#00f2ff] focus:outline-none"
              >
                <option value="traumaBay">Trauma Resuscitation Bay</option>
                <option value="cathLab">Cardiac Cath Lab Suite</option>
                <option value="icu">Intensive Care Unit (ICU)</option>
                <option value="orSuites">Emergency Surgical OR</option>
                <option value="negPressure">Negative Pressure Isolation</option>
                <option value="erGeneral">General ED Bed</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-white/40 mb-1">CHIEF COMPLAINT & SYMPTOMS *</label>
              <input
                type="text"
                required
                value={manualComplaint}
                onChange={(e) => setManualComplaint(e.target.value)}
                placeholder="Clinical symptoms, trauma mechanism, vitals reported"
                className="w-full px-3 py-2 bg-[#1a1a1c] border border-white/10 text-white focus:border-[#00f2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-white/40 mb-1">AGE & GENDER</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={manualAge}
                  onChange={(e) => setManualAge(Number(e.target.value))}
                  className="w-20 px-3 py-2 bg-[#1a1a1c] border border-white/10 text-white"
                />
                <select
                  value={manualGender}
                  onChange={(e) => setManualGender(e.target.value as 'M' | 'F')}
                  className="flex-1 px-3 py-2 bg-[#1a1a1c] border border-white/10 text-white"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowManualForm(false)}
              className="px-4 py-2 border border-white/10 hover:border-white/30 text-white/60 hover:text-white text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-tactical text-xs px-5 py-2 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-[#ff2d55]" />
              <span>Log & Queue CAD Incident</span>
            </button>
          </div>
        </form>
      )}

      {/* Main CAD Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono-tech">
        {/* Column 1: Pending CAD Incident Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="label">CAD Call Queue ({cadIncidents.length})</span>
            <span className="text-[#ff2d55] text-[11px] font-bold">[PRIORITY]</span>
          </div>

          {cadIncidents.length === 0 ? (
            <div className="p-8 bg-[#1a1a1c] border border-white/10 text-center text-xs text-white/40">
              QUEUE CLEAR · ALL INCIDENTS DISPATCHED
            </div>
          ) : (
            <div className="space-y-2">
              {cadIncidents.map((incident) => {
                const isSelected = incident.id === selectedIncidentId;
                return (
                  <div
                    key={incident.id}
                    onClick={() => {
                      setSelectedIncidentId(incident.id);
                      setSelectedBedType(incident.suggestedBedType);
                    }}
                    className={`p-4 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#1a1a1c] border-[#ff2d55] shadow-[0_0_15px_rgba(255,45,85,0.2)]'
                        : 'bg-[#1a1a1c]/60 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-[#ff2d55]">
                        {incident.id}
                      </span>
                      <span className="text-[10px] text-white/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {incident.reportedTime}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-white mb-1.5 flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-white/40 shrink-0 mt-0.5" />
                      <span>{incident.location}</span>
                    </div>

                    <p className="text-[11px] text-white/70 line-clamp-2 mb-2 font-sans">
                      {incident.chiefComplaint}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px]">
                      <span className="text-[#ff2d55] font-bold">{incident.severity}</span>
                      <span className="text-white/40">
                        {incident.gender}, {incident.age}Y · REQ: {String(incident.suggestedBedType).toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 2: Available Ambulance Fleet */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="label">Unit Selection</span>
            <span className="text-[#00ffaa] text-[11px] font-bold">
              {availableAmbulances.length} READY
            </span>
          </div>

          <div className="space-y-2">
            {ambulances.map((amb) => {
              const isSelected = amb.id === selectedAmbulanceId;
              const isAvailable = amb.status === 'available';

              return (
                <div
                  key={amb.id}
                  onClick={() => setSelectedAmbulanceId(amb.id)}
                  className={`p-4 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#1a1a1c] border-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                      : 'bg-[#1a1a1c]/60 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">
                        {amb.callsign}
                      </span>
                      <span className="unit-badge text-white/70">
                        {amb.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold ${
                          isAvailable ? 'text-[#00ffaa]' : 'text-[#ffd60a]'
                        }`}
                      >
                        {isAvailable ? 'AVAILABLE' : 'EN ROUTE'}
                      </span>
                      {!isAvailable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            resetAmbulanceUnit(amb.id);
                          }}
                          className="text-[9px] px-1.5 py-0.5 bg-white/5 hover:bg-white/15 border border-white/10 text-[#00f2ff] flex items-center gap-1 cursor-pointer"
                          title="Re-arm unit to patrol readiness for immediate dispatch"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Re-arm</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-white/40 mb-2">
                    CREW: {amb.crew.join(' · ')}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-white/30 pt-2 border-t border-white/10">
                    <span>BATTERY: {amb.batteryOrFuelPct}%</span>
                    <span>RADIO: {amb.radioChannel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Facility Destination & Corridor Route */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="label">Facility & Corridor Route</span>
            <span className="text-[#00f2ff] text-[11px] font-bold">[AUTO-MATCH]</span>
          </div>

          <div className="p-5 bg-[#1a1a1c] border border-white/10 space-y-4">
            <div>
              <label className="block text-[10px] uppercase text-white/40 mb-1.5">
                RECEIVING HOSPITAL:
              </label>
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d0d] border border-white/15 text-white text-xs font-mono-tech focus:border-[#00f2ff] focus:outline-none"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.distanceFromCenterKm} KM)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-white/40 mb-1.5">
                TARGET BED ALLOCATION:
              </label>
              <select
                value={selectedBedType}
                onChange={(e) => setSelectedBedType(e.target.value as keyof Hospital['beds'])}
                className="w-full px-3 py-2 bg-[#0d0d0d] border border-white/15 text-white text-xs font-mono-tech focus:border-[#00f2ff] focus:outline-none"
              >
                <option value="traumaBay">Trauma Resuscitation Bay</option>
                <option value="icu">Intensive Care Unit (ICU)</option>
                <option value="cathLab">Cardiac Cath Lab Suite</option>
                <option value="orSuites">Emergency Surgical OR</option>
                <option value="negPressure">Negative Pressure Isolation</option>
                <option value="erGeneral">General ED Bed</option>
              </select>
            </div>

            {selectedHosp && (
              <div className="p-3 bg-[#0d0d0d] border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/40">AVAILABLE BEDS:</span>
                  <span className="text-[#00ffaa] font-bold">
                    {selectedHosp.beds[selectedBedType].total -
                      (selectedHosp.beds[selectedBedType].occupied +
                        selectedHosp.beds[selectedBedType].reserved)}{' '}
                    FREE
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40">TRANSIT ADVANTAGE:</span>
                  <span className="text-[#00f2ff] font-bold">
                    ~{Math.round(selectedHosp.distanceFromCenterKm * 1.1)}m (PREEMPTED)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40">STATUS:</span>
                  <span className="text-[#00ffaa] font-bold">{selectedHosp.diversionStatus}</span>
                </div>
              </div>
            )}

            {/* Tactical Dispatch Button */}
            <div className="pt-2">
              <button
                onClick={handleDispatch}
                disabled={!selectedIncidentId || !selectedAmbulanceId}
                className="w-full btn-tactical py-3 text-xs tracking-wider"
              >
                <Siren className="w-4 h-4 mr-2 text-[#ff2d55]" />
                <span>DISPATCH UNIT & ARM CORRIDOR</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
