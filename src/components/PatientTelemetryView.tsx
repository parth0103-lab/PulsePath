import React, { useEffect, useRef } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import {
  Activity,
  Heart,
  Droplet,
  Wind,
  Thermometer,
  Brain,
  Send,
  FileCheck2,
  Stethoscope,
} from 'lucide-react';

export const PatientTelemetryView: React.FC = () => {
  const {
    patients,
    ambulances,
    hospitals,
    selectedPatientId,
    setSelectedPatientId,
    sendPreAlertNotice,
    openHandoffModal,
  } = useEmergency();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentPatient =
    patients.find((p) => p.id === selectedPatientId) || patients[0];
  const targetHospital = hospitals.find((h) => h.id === currentPatient?.assignedHospitalId);

  // Live ECG Waveform Animation Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentPatient) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let x = 0;
    const width = canvas.width;
    const height = canvas.height;
    const baseline = height / 2;

    const getEcgPoint = (t: number) => {
      const cycle = t % 100;
      if (cycle < 10) return baseline;
      if (cycle < 16) return baseline - 8;
      if (cycle < 22) return baseline;
      if (cycle < 25) return baseline + 6;
      if (cycle < 30) return baseline - 45;
      if (cycle < 35) return baseline + 18;
      if (cycle < 45) return baseline;
      if (cycle < 58) return baseline - 14;
      return baseline;
    };

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    let lastY = baseline;
    let stepCount = 0;

    const render = () => {
      ctx.fillStyle = '#050505';
      ctx.fillRect((x + 1) % width, 0, 16, height);

      // Subtle tactical grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      for (let gy = 20; gy < height; gy += 20) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + 2, gy);
        ctx.stroke();
      }

      const speedMultiplier = (currentPatient.vitals.hr / 60) * 1.4;
      const currentY = getEcgPoint(stepCount * speedMultiplier);

      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 4;

      ctx.beginPath();
      ctx.moveTo(x, lastY);
      ctx.lineTo((x + 2) % width, currentY);
      ctx.stroke();

      ctx.shadowBlur = 0;
      lastY = currentY;
      x = (x + 2) % width;
      stepCount += 1;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentPatient?.vitals.hr, currentPatient?.id]);

  if (!currentPatient) {
    return (
      <div className="p-8 text-center text-white/40 font-mono-tech text-xs">
        NO ACTIVE PATIENT TELEMETRY STREAM
      </div>
    );
  }

  const mapValue = Math.round(
    currentPatient.vitals.dbp + (currentPatient.vitals.sbp - currentPatient.vitals.dbp) / 3
  );

  return (
    <div className="space-y-6">
      {/* Patient Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/10">
        <span className="label mr-2 shrink-0">
          In-Transit Cases:
        </span>
        {patients.map((p) => {
          const isSelected = p.id === currentPatient.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPatientId(p.id)}
              className={`flex items-center gap-2 px-3 py-1.5 font-mono-tech text-xs uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer border ${
                isSelected
                  ? 'bg-white text-black font-bold border-white'
                  : 'bg-[#1a1a1c] text-white/50 border-white/10 hover:text-white'
              }`}
            >
              <span>{p.id}</span>
              <span>·</span>
              <span className="truncate max-w-[120px]">{p.name}</span>
              <span
                className={`text-[10px] font-bold ${
                  p.triageCode === 'RED'
                    ? 'text-[#ff2d55]'
                    : p.triageCode === 'ORANGE'
                    ? 'text-[#ffd60a]'
                    : 'text-[#00ffaa]'
                }`}
              >
                [{p.triageCode}]
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Clinical Card */}
      <div className="p-6 bg-[#1a1a1c] border-l-3 border-l-[#ff2d55] border-y border-r border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-syne text-2xl font-bold uppercase tracking-tight text-white">
                {currentPatient.name}
              </h2>
              <span className="unit-badge text-[#ff2d55] border-[#ff2d55]">
                {currentPatient.triageCategoryName}
              </span>
              <span className="unit-badge text-[#00f2ff] border-[#00f2ff]">
                {currentPatient.traumaAlertLevel}
              </span>
            </div>
            <div className="label mt-1 text-white/60">
              {currentPatient.age}Y/{currentPatient.gender} · ID: {currentPatient.id} · CHIEF COMPLAINT: {currentPatient.chiefComplaint}
            </div>
          </div>

          {/* Destination & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 font-mono-tech">
            <div className="text-right text-xs">
              <div className="label">Receiving Center</div>
              <div className="text-white font-bold">{targetHospital?.name || 'En Route'}</div>
              <div className="text-[10px] text-[#00ffaa]">{currentPatient.assignedBayName}</div>
            </div>

            <button
              onClick={() => sendPreAlertNotice(currentPatient.id)}
              disabled={currentPatient.preAlertAcknowledged}
              className="btn-tactical py-2 px-3 text-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              <span>
                {currentPatient.preAlertAcknowledged ? 'PRE-ALERT SENT' : 'TRANSMIT PRE-ALERT'}
              </span>
            </button>

            <button
              onClick={() => openHandoffModal(currentPatient.id)}
              className="btn-tactical text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-[#00ffaa]" />
              <span>
                {currentPatient.status === 'delivered' ? 'UPDATE HANDOFF' : 'PATIENT HANDOFF'}
              </span>
            </button>
          </div>
        </div>

        {currentPatient.status === 'delivered' && (
          <div className="mt-3 p-3 bg-[#00ffaa]/10 border border-[#00ffaa]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono-tech text-xs">
            <div className="flex items-center gap-2">
              <span className="unit-badge text-[#00ffaa] border-[#00ffaa]">DELIVERED · BED OCCUPIED</span>
              <span className="text-white font-bold">
                Transferred at {currentPatient.deliveryTimestamp || 'ED Arrival'}
              </span>
              <span className="text-white/40">· Attending: {currentPatient.receivingPhysician}</span>
            </div>
            {currentPatient.handoffNotes && (
              <span className="text-white/60 text-[11px] truncate max-w-md font-sans">
                {currentPatient.handoffNotes}
              </span>
            )}
          </div>
        )}

        {/* Live Continuous ECG Canvas */}
        <div className="mt-4 bg-[#050505] p-3 border border-white/10">
          <div className="flex items-center justify-between text-xs font-mono-tech text-[#00ffaa] mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 animate-pulse text-[#00ffaa]" />
              <span className="tracking-wider">LEAD II CONTINUOUS ECG TELEMETRY (25MM/S · 10MM/MV)</span>
            </div>
            <div className="text-[10px] text-white/40">
              RHYTHM: SINUS TACHYCARDIA · ELEVATION MONITORED
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={900}
            height={110}
            className="w-full h-[110px] bg-[#050505]"
          />
        </div>

        {/* Systematic Vitals Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
          {/* HR */}
          <div className="p-3 bg-[#0d0d0d] border border-white/10">
            <div className="flex items-center justify-between text-white/40 text-xs mb-1">
              <span className="label flex items-center gap-1">
                <Heart className="w-3 h-3 text-[#ff2d55]" /> HR
              </span>
              <span className="text-[10px] font-mono-tech">BPM</span>
            </div>
            <div className="font-mono-tech text-2xl font-bold text-[#ff2d55] tabular-nums">
              {currentPatient.vitals.hr}
            </div>
            <div className="text-[10px] text-white/30 font-mono-tech mt-0.5">NOMINAL: 60-100</div>
          </div>

          {/* Blood Pressure */}
          <div className="p-3 bg-[#0d0d0d] border border-white/10">
            <div className="flex items-center justify-between text-white/40 text-xs mb-1">
              <span className="label flex items-center gap-1">
                <Droplet className="w-3 h-3 text-[#00f2ff]" /> NIBP
              </span>
              <span className="text-[10px] font-mono-tech">MMHG</span>
            </div>
            <div className="font-mono-tech text-xl font-bold text-white tabular-nums">
              {currentPatient.vitals.sbp}/{currentPatient.vitals.dbp}
            </div>
            <div className="text-[10px] text-white/30 font-mono-tech mt-0.5">MAP: {mapValue} MMHG</div>
          </div>

          {/* SpO2 */}
          <div className="p-3 bg-[#0d0d0d] border border-white/10">
            <div className="flex items-center justify-between text-white/40 text-xs mb-1">
              <span className="label flex items-center gap-1">
                <Wind className="w-3 h-3 text-[#00f2ff]" /> SPO2
              </span>
              <span className="text-[10px] font-mono-tech">%</span>
            </div>
            <div className="font-mono-tech text-2xl font-bold text-[#00f2ff] tabular-nums">
              {currentPatient.vitals.spo2}%
            </div>
            <div className="text-[10px] text-white/30 font-mono-tech mt-0.5">HIGH-FLOW O2 ON</div>
          </div>

          {/* Resp Rate */}
          <div className="p-3 bg-[#0d0d0d] border border-white/10">
            <div className="flex items-center justify-between text-white/40 text-xs mb-1">
              <span className="label flex items-center gap-1">
                <Activity className="w-3 h-3 text-[#00ffaa]" /> RR
              </span>
              <span className="text-[10px] font-mono-tech">/MIN</span>
            </div>
            <div className="font-mono-tech text-2xl font-bold text-[#00ffaa] tabular-nums">
              {currentPatient.vitals.rr}
            </div>
            <div className="text-[10px] text-white/30 font-mono-tech mt-0.5">ETCO2: {currentPatient.vitals.etco2 || 34}</div>
          </div>

          {/* GCS */}
          <div className="p-3 bg-[#0d0d0d] border border-white/10">
            <div className="flex items-center justify-between text-white/40 text-xs mb-1">
              <span className="label flex items-center gap-1">
                <Brain className="w-3 h-3 text-white" /> GCS
              </span>
              <span className="text-[10px] font-mono-tech">SCORE</span>
            </div>
            <div className="font-mono-tech text-2xl font-bold text-white tabular-nums">
              {currentPatient.vitals.gcs}/15
            </div>
            <div className="text-[10px] text-white/30 font-mono-tech mt-0.5">PERRL 3MM</div>
          </div>

          {/* Temp */}
          <div className="p-3 bg-[#0d0d0d] border border-white/10">
            <div className="flex items-center justify-between text-white/40 text-xs mb-1">
              <span className="label flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-[#ffd60a]" /> TEMP
              </span>
              <span className="text-[10px] font-mono-tech">°C</span>
            </div>
            <div className="font-mono-tech text-2xl font-bold text-[#ffd60a] tabular-nums">
              {currentPatient.vitals.temp}°C
            </div>
            <div className="text-[10px] text-white/30 font-mono-tech mt-0.5">GLUCOSE: {currentPatient.vitals.bloodGlucose}</div>
          </div>
        </div>

        {/* History & SBAR Handover */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/10 text-xs">
          {/* Interventions */}
          <div className="space-y-3">
            <div className="label flex items-center gap-2">
              <Stethoscope className="w-3.5 h-3.5 text-[#00f2ff]" />
              <span>FIELD INTERVENTIONS & DRUG TIMELINE:</span>
            </div>
            <ul className="space-y-1.5 font-mono-tech text-white/80">
              {currentPatient.interventions.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#ff2d55] font-bold">▪</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="p-3 bg-[#0d0d0d] border border-white/10 font-mono-tech text-[11px] space-y-1">
              <div className="text-white/40">
                HISTORY: <span className="text-white">{currentPatient.medicalHistory.join(', ') || 'NONE REPORTED'}</span>
              </div>
              <div className="text-[#ff2d55]">
                ALLERGIES: {currentPatient.allergies.join(', ')}
              </div>
            </div>
          </div>

          {/* SBAR Format */}
          <div className="p-4 bg-[#0d0d0d] border border-white/10 space-y-2 font-mono-tech text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-1">
              <span className="label text-[#00f2ff]">SBAR STANDARDIZED PRE-ARRIVAL BRIEF</span>
              <span className="text-[10px] text-[#00ffaa]">
                {currentPatient.preAlertAcknowledged ? 'ED ATTENDING VERIFIED' : 'READY TO TRANSMIT'}
              </span>
            </div>

            <div>
              <span className="text-[#ff2d55] font-bold">[S] SITUATION: </span>
              <span className="text-white/80">{currentPatient.chiefComplaint}</span>
            </div>

            <div>
              <span className="text-[#00f2ff] font-bold">[B] BACKGROUND: </span>
              <span className="text-white/60">{currentPatient.notes}</span>
            </div>

            <div>
              <span className="text-[#ffd60a] font-bold">[A] ASSESSMENT: </span>
              <span className="text-white/80">
                HEMODYNAMIC INSTABILITY (BP {currentPatient.vitals.sbp}/{currentPatient.vitals.dbp}, HR {currentPatient.vitals.hr}). CODE {currentPatient.traumaAlertLevel}.
              </span>
            </div>

            <div>
              <span className="text-[#00ffaa] font-bold">[R] RECOMMENDATION: </span>
              <span className="text-white/80">
                PREPARE {currentPatient.assignedBayName} AT {targetHospital?.shortName}. TRAUMA SURGEON TO MEET GURNEY ON ARRIVAL.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
