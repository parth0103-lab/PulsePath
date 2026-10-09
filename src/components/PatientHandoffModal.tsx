import React, { useState, useEffect } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { Vitals, Patient } from '../types';
import {
  X,
  Heart,
  Droplet,
  Wind,
  Activity,
  Thermometer,
  Brain,
  CheckCircle2,
  Stethoscope,
  Bed,
  RefreshCw,
  Sparkles,
  Mic,
  Radio,
} from 'lucide-react';

export const PatientHandoffModal: React.FC = () => {
  const {
    isHandoffModalOpen,
    closeHandoffModal,
    handoffPatientId,
    patients,
    hospitals,
    ambulances,
    completePatientHandoff,
  } = useEmergency();

  // Selected patient inside modal (can switch between patients)
  const [activePatientId, setActivePatientId] = useState<string>('');

  useEffect(() => {
    if (handoffPatientId) {
      setActivePatientId(handoffPatientId);
    } else if (patients.length > 0 && !activePatientId) {
      setActivePatientId(patients[0].id);
    }
  }, [handoffPatientId, patients]);

  const patient = patients.find((p) => p.id === activePatientId) || patients[0];
  const targetHospital = hospitals.find((h) => h.id === patient?.assignedHospitalId);
  const assignedAmbulance = ambulances.find((a) => a.patientId === patient?.id);

  // Form State initialized with patient's latest telemetry vitals
  const [vitals, setVitals] = useState<Vitals>({
    hr: 110,
    sbp: 120,
    dbp: 80,
    spo2: 98,
    rr: 18,
    temp: 36.8,
    gcs: 15,
    etco2: 35,
    bloodGlucose: 110,
  });

  const [triageNotes, setTriageNotes] = useState<string>('');
  const [receivingPhysician, setReceivingPhysician] = useState<string>('');
  const [handoffConfirmed, setHandoffConfirmed] = useState<boolean>(true);

  // Sync state whenever active patient changes
  useEffect(() => {
    if (patient) {
      setVitals({ ...patient.vitals });
      setReceivingPhysician(
        patient.receivingPhysician ||
          targetHospital?.receivingTeam ||
          'Dr. V. Mercer (Trauma Attending)'
      );
      setTriageNotes(
        patient.handoffNotes ||
          (patient.notes
            ? `FIELD HANDOFF NOTE: ${patient.notes} Final handover performed at Bay entrance. Airway and IV lines verified.`
            : 'Patient transferred to ED stretcher. Vitals stabilized en route. Handover report delivered to receiving team.')
      );
    }
  }, [patient?.id, targetHospital]);

  if (!isHandoffModalOpen || !patient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    completePatientHandoff(
      patient.id,
      vitals,
      triageNotes,
      receivingPhysician
    );
    closeHandoffModal();
  };

  const addQuickNote = (phrase: string) => {
    setTriageNotes((prev) => (prev ? `${prev} · ${phrase}` : phrase));
  };

  const syncWithLiveTelemetry = () => {
    if (patient) {
      setVitals({ ...patient.vitals });
    }
  };

  const applyVitalsPreset = (preset: 'trauma' | 'stemi' | 'stroke' | 'stable') => {
    if (preset === 'trauma') {
      setVitals({
        hr: 128,
        sbp: 88,
        dbp: 56,
        spo2: 93,
        rr: 26,
        temp: 35.6,
        gcs: 10,
        etco2: 30,
        bloodGlucose: 148,
      });
    } else if (preset === 'stemi') {
      setVitals({
        hr: 92,
        sbp: 148,
        dbp: 92,
        spo2: 99,
        rr: 18,
        temp: 36.8,
        gcs: 15,
        etco2: 36,
        bloodGlucose: 122,
      });
    } else if (preset === 'stroke') {
      setVitals({
        hr: 76,
        sbp: 174,
        dbp: 98,
        spo2: 98,
        rr: 16,
        temp: 37.0,
        gcs: 13,
        etco2: 35,
        bloodGlucose: 106,
      });
    } else {
      setVitals({
        hr: 74,
        sbp: 120,
        dbp: 78,
        spo2: 99,
        rr: 14,
        temp: 36.6,
        gcs: 15,
        etco2: 38,
        bloodGlucose: 96,
      });
    }
  };

  const isDelivered = patient.status === 'delivered';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-[#1a1a1c] border border-white/20 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#0d0d0d] flex items-center justify-between shrink-0">
          <div>
            <div className="label text-[#00f2ff] flex items-center gap-2">
              <span>CRITICAL CARE HANDOFF PROTOCOL // DISPOSITION REPORT</span>
              {isDelivered && (
                <span className="unit-badge text-[#00ffaa] border-[#00ffaa]">
                  DELIVERED RECORD
                </span>
              )}
            </div>
            <h2 className="font-syne text-xl font-bold uppercase tracking-tight text-white mt-0.5 flex items-center gap-2">
              <span>Patient Handoff & Bed Transfer</span>
              <span className="unit-badge text-[#ff2d55] border-[#ff2d55]">
                {patient.triageCategoryName}
              </span>
            </h2>
          </div>

          <button
            onClick={closeHandoffModal}
            className="p-1.5 text-white/50 hover:text-white transition-colors cursor-pointer border border-white/10 hover:border-white/30"
            title="Cancel & Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Patient Switcher Tabs (if multiple patients exist) */}
        {patients.length > 1 && (
          <div className="px-6 py-2 bg-[#121214] border-b border-white/10 flex items-center gap-2 overflow-x-auto shrink-0 font-mono-tech text-xs">
            <span className="label text-white/40 shrink-0">CASE:</span>
            {patients.map((p) => {
              const isSelected = p.id === patient.id;
              const pDelivered = p.status === 'delivered';
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setActivePatientId(p.id)}
                  className={`px-3 py-1 flex items-center gap-1.5 transition-colors cursor-pointer border uppercase whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-[#1a1a1c] text-white/60 border-white/10 hover:text-white'
                  }`}
                >
                  <span>{p.id}</span>
                  <span className="font-sans font-semibold">· {p.name}</span>
                  <span
                    className={`text-[9px] font-bold ${
                      pDelivered
                        ? 'text-[#00ffaa]'
                        : p.triageCode === 'RED'
                        ? 'text-[#ff2d55]'
                        : 'text-[#ffd60a]'
                    }`}
                  >
                    [{pDelivered ? 'DELIVERED' : p.triageCode}]
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 font-mono-tech flex-1 text-xs">
          {/* Patient & Facility Lockup */}
          <div className="p-4 bg-[#0d0d0d] border border-white/10 flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm uppercase">{patient.name}</span>
                <span className="text-white/40">·</span>
                <span className="text-[#00f2ff] font-bold">{patient.id}</span>
                <span className="text-white/40">({patient.age}y / {patient.gender})</span>
              </div>
              <div className="text-white/60 text-[11px] font-sans mt-1 line-clamp-1">
                {patient.chiefComplaint}
              </div>
              {assignedAmbulance ? (
                <div className="text-white/40 text-[10px] mt-1">
                  TRANSPORT UNIT: <span className="text-white">{assignedAmbulance.callsign} ({assignedAmbulance.type})</span>
                </div>
              ) : (
                <div className="text-white/40 text-[10px] mt-1">
                  STATUS: <span className="text-[#00ffaa]">UNIT RELEASED / CARE TRANSFERRED</span>
                </div>
              )}
            </div>

            <div className="sm:text-right border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
              <div className="label">Receiving Facility & Bay</div>
              <div className="text-white font-bold text-xs uppercase mt-0.5">
                {targetHospital?.shortName}
              </div>
              <div className="text-[#00ffaa] font-bold text-[11px] flex items-center sm:justify-end gap-1 mt-0.5">
                <Bed className="w-3.5 h-3.5" />
                <span>{patient.assignedBayName}</span>
              </div>
              <div className="text-white/60 text-[10px] mt-0.5">
                BED STATUS TRANSITION:{' '}
                {isDelivered ? (
                  <span className="text-[#00ffaa] font-bold">OCCUPIED [ACTIVE]</span>
                ) : (
                  <>
                    <span className="text-[#ffd60a]">RESERVED</span> →{' '}
                    <span className="text-[#ff2d55] font-bold">OCCUPIED</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Section: Final Patient Vitals Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="label text-white">Final Patient Vitals on Arrival</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={syncWithLiveTelemetry}
                  className="text-[10px] text-[#00f2ff] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Copy current telemetry values"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync Telemetry</span>
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="text-[10px] text-white/40 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-[#00f2ff]" /> PRESETS:
              </span>
              <button
                type="button"
                onClick={() => applyVitalsPreset('trauma')}
                className="text-[9px] px-2 py-0.5 bg-[#0d0d0d] border border-white/10 text-white/70 hover:border-[#ff2d55] hover:text-[#ff2d55] transition-colors cursor-pointer"
              >
                Trauma Shock
              </button>
              <button
                type="button"
                onClick={() => applyVitalsPreset('stemi')}
                className="text-[9px] px-2 py-0.5 bg-[#0d0d0d] border border-white/10 text-white/70 hover:border-[#ffd60a] hover:text-[#ffd60a] transition-colors cursor-pointer"
              >
                Code STEMI
              </button>
              <button
                type="button"
                onClick={() => applyVitalsPreset('stroke')}
                className="text-[9px] px-2 py-0.5 bg-[#0d0d0d] border border-white/10 text-white/70 hover:border-[#00f2ff] hover:text-[#00f2ff] transition-colors cursor-pointer"
              >
                Stroke Alert
              </button>
              <button
                type="button"
                onClick={() => applyVitalsPreset('stable')}
                className="text-[9px] px-2 py-0.5 bg-[#0d0d0d] border border-white/10 text-white/70 hover:border-[#00ffaa] hover:text-[#00ffaa] transition-colors cursor-pointer"
              >
                Stabilized
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* HR */}
              <div className="p-2.5 bg-[#0d0d0d] border border-white/10">
                <label className="text-[10px] text-white/50 flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-[#ff2d55]" /> HR
                  </span>
                  <span>BPM</span>
                </label>
                <input
                  type="number"
                  value={vitals.hr}
                  onChange={(e) => setVitals({ ...vitals, hr: Number(e.target.value) })}
                  className="w-full bg-[#1a1a1c] border border-white/15 px-2 py-1 text-white font-bold text-sm focus:border-[#ff2d55] focus:outline-none"
                  required
                />
              </div>

              {/* NIBP Systolic / Diastolic */}
              <div className="p-2.5 bg-[#0d0d0d] border border-white/10">
                <label className="text-[10px] text-white/50 flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <Droplet className="w-3 h-3 text-[#00f2ff]" /> BP (NIBP)
                  </span>
                  <span>MMHG</span>
                </label>
                <div className="flex gap-1 items-center">
                  <input
                    type="number"
                    value={vitals.sbp}
                    onChange={(e) => setVitals({ ...vitals, sbp: Number(e.target.value) })}
                    placeholder="Sys"
                    className="w-full bg-[#1a1a1c] border border-white/15 px-2 py-1 text-white font-bold text-sm focus:border-[#00f2ff] focus:outline-none"
                    required
                  />
                  <span className="text-white/40">/</span>
                  <input
                    type="number"
                    value={vitals.dbp}
                    onChange={(e) => setVitals({ ...vitals, dbp: Number(e.target.value) })}
                    placeholder="Dia"
                    className="w-full bg-[#1a1a1c] border border-white/15 px-2 py-1 text-white font-bold text-sm focus:border-[#00f2ff] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* SpO2 */}
              <div className="p-2.5 bg-[#0d0d0d] border border-white/10">
                <label className="text-[10px] text-white/50 flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <Wind className="w-3 h-3 text-[#00f2ff]" /> SPO2
                  </span>
                  <span>%</span>
                </label>
                <input
                  type="number"
                  value={vitals.spo2}
                  onChange={(e) => setVitals({ ...vitals, spo2: Number(e.target.value) })}
                  className="w-full bg-[#1a1a1c] border border-white/15 px-2 py-1 text-white font-bold text-sm focus:border-[#00f2ff] focus:outline-none"
                  required
                />
              </div>

              {/* Resp Rate */}
              <div className="p-2.5 bg-[#0d0d0d] border border-white/10">
                <label className="text-[10px] text-white/50 flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-[#00ffaa]" /> RR
                  </span>
                  <span>/MIN</span>
                </label>
                <input
                  type="number"
                  value={vitals.rr}
                  onChange={(e) => setVitals({ ...vitals, rr: Number(e.target.value) })}
                  className="w-full bg-[#1a1a1c] border border-white/15 px-2 py-1 text-white font-bold text-sm focus:border-[#00ffaa] focus:outline-none"
                  required
                />
              </div>

              {/* GCS */}
              <div className="p-2.5 bg-[#0d0d0d] border border-white/10">
                <label className="text-[10px] text-white/50 flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <Brain className="w-3 h-3 text-white" /> GCS
                  </span>
                  <span>SCORE</span>
                </label>
                <input
                  type="number"
                  min="3"
                  max="15"
                  value={vitals.gcs}
                  onChange={(e) => setVitals({ ...vitals, gcs: Number(e.target.value) })}
                  className="w-full bg-[#1a1a1c] border border-white/15 px-2 py-1 text-white font-bold text-sm focus:border-white focus:outline-none"
                  required
                />
              </div>

              {/* Temp */}
              <div className="p-2.5 bg-[#0d0d0d] border border-white/10">
                <label className="text-[10px] text-white/50 flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-[#ffd60a]" /> TEMP
                  </span>
                  <span>°C</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={vitals.temp}
                  onChange={(e) => setVitals({ ...vitals, temp: Number(e.target.value) })}
                  className="w-full bg-[#1a1a1c] border border-white/15 px-2 py-1 text-white font-bold text-sm focus:border-[#ffd60a] focus:outline-none"
                  required
                />
              </div>

              {/* EtCO2 */}
              <div className="p-2.5 bg-[#0d0d0d] border border-white/10">
                <label className="text-[10px] text-white/50 flex items-center justify-between mb-1">
                  <span>ETCO2</span>
                  <span>MMHG</span>
                </label>
                <input
                  type="number"
                  value={vitals.etco2 || 35}
                  onChange={(e) => setVitals({ ...vitals, etco2: Number(e.target.value) })}
                  className="w-full bg-[#1a1a1c] border border-white/15 px-2 py-1 text-white font-bold text-sm focus:border-[#00f2ff] focus:outline-none"
                />
              </div>

              {/* Blood Glucose */}
              <div className="p-2.5 bg-[#0d0d0d] border border-white/10">
                <label className="text-[10px] text-white/50 flex items-center justify-between mb-1">
                  <span>GLUCOSE</span>
                  <span>MG/DL</span>
                </label>
                <input
                  type="number"
                  value={vitals.bloodGlucose || 110}
                  onChange={(e) => setVitals({ ...vitals, bloodGlucose: Number(e.target.value) })}
                  className="w-full bg-[#1a1a1c] border border-white/15 px-2 py-1 text-white font-bold text-sm focus:border-[#00f2ff] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Triage Notes & Disposition */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="label text-white">Final Triage Handoff Notes</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#00ffaa] flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>VOX READY</span>
                </span>
                <span className="text-[10px] text-white/40">PARAMEDIC TO ATTENDING SIGN-OFF</span>
              </div>
            </div>

            <textarea
              rows={3}
              value={triageNotes}
              onChange={(e) => setTriageNotes(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-white/15 p-3 text-white text-xs font-mono-tech focus:border-[#00f2ff] focus:outline-none leading-relaxed"
              placeholder="Enter final clinical triage notes, interventions performed, IV access, and response to treatment..."
              required
            />

            {/* Quick remark buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="label mr-1 my-auto">QUICK INSERTS:</span>
              {[
                'Airway Secure via ETT',
                'IV Lines Patent (x2 18G)',
                'TXA Infused (1g in 100mL)',
                'MTP Blood Protocol Initiated',
                'Patient Stable on Stretcher',
                'Direct Transfer to Trauma CT',
                'Trauma Surgeon Briefed at Bedside',
              ].map((phrase) => (
                <button
                  type="button"
                  key={phrase}
                  onClick={() => addQuickNote(phrase)}
                  className="text-[10px] px-2 py-1 bg-[#0d0d0d] border border-white/10 text-white/70 hover:text-[#00f2ff] hover:border-[#00f2ff] transition-colors cursor-pointer"
                >
                  + {phrase}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Attending Verification & Hospital Bed Occupancy Confirmation */}
          <div className="p-4 bg-[#0d0d0d] border border-white/10 space-y-3">
            <div>
              <label className="block label text-white/50 mb-1">
                RECEIVING ATTENDING PHYSICIAN / CHARGE NURSE:
              </label>
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-[#00f2ff] shrink-0" />
                <input
                  type="text"
                  value={receivingPhysician}
                  onChange={(e) => setReceivingPhysician(e.target.value)}
                  className="w-full bg-[#1a1a1c] border border-white/15 px-3 py-1.5 text-white font-bold text-xs focus:border-[#00f2ff] focus:outline-none"
                  placeholder="e.g. Dr. V. Mercer (Trauma Attending)"
                  required
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-white/10 text-[11px] text-white/80">
              <input
                type="checkbox"
                checked={handoffConfirmed}
                onChange={(e) => setHandoffConfirmed(e.target.checked)}
                className="mt-0.5 accent-[#00ffaa]"
                required
              />
              <span>
                Formal transfer of care confirmed. Marking patient <strong className="text-[#00ffaa]">DELIVERED</strong> will release ambulance <strong className="text-white">{assignedAmbulance?.callsign || 'Unit'}</strong> and update <strong className="text-[#00f2ff]">{targetHospital?.shortName} - {patient.assignedBayName}</strong> status from RESERVED to <strong className="text-[#ff2d55]">OCCUPIED</strong>.
              </span>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
            <div className="text-[11px] text-white/40 font-mono-tech">
              {isDelivered
                ? `RECORD DELIVERED AT ${patient.deliveryTimestamp || 'ARRIVAL'}`
                : 'PENDING HANDOFF SUBMISSION'}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeHandoffModal}
                className="btn-tactical-outline text-xs px-4 py-2.5"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!handoffConfirmed}
                className="btn-tactical text-xs px-5 py-2.5 flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4 text-[#ff2d55]" />
                <span>{isDelivered ? 'Update Disposition Report' : 'Validate Handoff & Occupy Bed'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
