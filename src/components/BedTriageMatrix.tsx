import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { Hospital, BedCategory } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Minus,
} from 'lucide-react';

export const BedTriageMatrix: React.FC = () => {
  const {
    hospitals,
    patients,
    selectedHospitalId,
    setSelectedHospitalId,
    reserveHospitalBed,
    releaseHospitalBed,
    setSelectedPatientId,
    setActiveView,
    openHandoffModal,
  } = useEmergency();

  const [filterType, setFilterType] = useState<string>('all');

  const filteredHospitals = hospitals.filter((h) => {
    if (filterType === 'open' && h.diversionStatus !== 'OPEN') return false;
    if (filterType === 'trauma' && !h.traumaSurgeonOnDuty) return false;
    return true;
  });

  const renderBedCount = (
    categoryName: string,
    bedCat: BedCategory,
    hospId: string,
    bedKey: keyof Hospital['beds']
  ) => {
    const available = bedCat.total - (bedCat.occupied + bedCat.reserved);

    return (
      <div className="p-3 bg-[#0d0d0d] border border-white/10 hover:border-white/25 transition-colors">
        <div className="flex items-center justify-between mb-1.5 font-mono-tech">
          <span className="text-[11px] font-medium text-white/70 uppercase">{categoryName}</span>
          <span
            className={`text-xs font-bold tabular-nums ${
              available === 0
                ? 'text-[#ff2d55]'
                : available <= 1
                ? 'text-[#ffd60a]'
                : 'text-[#00ffaa]'
            }`}
          >
            {available} / {bedCat.total} FREE
          </span>
        </div>

        {/* Minimal tactical bar */}
        <div className="w-full bg-[#1a1a1c] h-1.5 flex mb-2">
          <div
            style={{ width: `${(bedCat.occupied / bedCat.total) * 100}%` }}
            className="bg-[#ff2d55] h-full"
            title={`Occupied: ${bedCat.occupied}`}
          />
          <div
            style={{ width: `${(bedCat.reserved / bedCat.total) * 100}%` }}
            className="bg-[#ffd60a] h-full"
            title={`Reserved: ${bedCat.reserved}`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono-tech text-white/40">
          <div>
            <span className="text-[#ff2d55]">{bedCat.occupied} OCC</span>
            <span className="mx-1">·</span>
            <span className="text-[#ffd60a]">{bedCat.reserved} HELD</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                releaseHospitalBed(hospId, bedKey);
              }}
              disabled={bedCat.reserved === 0}
              title="Release 1 bed"
              className="p-1 bg-[#1a1a1c] border border-white/10 hover:border-white/40 text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                reserveHospitalBed(hospId, bedKey);
              }}
              disabled={available <= 0}
              title="Reserve 1 bed"
              className="p-1 bg-[#ff2d55] text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1a1a1c] p-4 border border-white/10">
        <div>
          <div className="label text-[#00f2ff]">Network Triage Matrix</div>
          <h2 className="font-syne text-xl font-bold uppercase tracking-tight text-white mt-0.5">
            Regional Hospital Bed Allocation & Capacity
          </h2>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 font-mono-tech text-[11px]">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 uppercase transition-colors cursor-pointer border ${
              filterType === 'all'
                ? 'bg-white text-black font-bold border-white'
                : 'bg-[#0d0d0d] text-white/50 border-white/10 hover:text-white'
            }`}
          >
            All Facilities ({hospitals.length})
          </button>
          <button
            onClick={() => setFilterType('open')}
            className={`px-3 py-1.5 uppercase transition-colors cursor-pointer border ${
              filterType === 'open'
                ? 'bg-white text-black font-bold border-white'
                : 'bg-[#0d0d0d] text-white/50 border-white/10 hover:text-white'
            }`}
          >
            Accepting Intake
          </button>
          <button
            onClick={() => setFilterType('trauma')}
            className={`px-3 py-1.5 uppercase transition-colors cursor-pointer border ${
              filterType === 'trauma'
                ? 'bg-white text-black font-bold border-white'
                : 'bg-[#0d0d0d] text-white/50 border-white/10 hover:text-white'
            }`}
          >
            Trauma Surgeon On Duty
          </button>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredHospitals.map((hospital) => {
          const isSelected = hospital.id === selectedHospitalId;
          const assignedPatients = patients.filter((p) => p.assignedHospitalId === hospital.id);

          return (
            <div
              key={hospital.id}
              onClick={() => setSelectedHospitalId(hospital.id)}
              className={`p-5 transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-[#1a1a1c] border-[#00f2ff] shadow-[0_0_20px_rgba(0,242,255,0.15)]'
                  : 'bg-[#1a1a1c]/60 border-white/10 hover:border-white/30'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-syne text-base font-bold text-white uppercase tracking-tight">
                    {hospital.name}
                  </h3>
                  <div className="text-xs text-white/50 mt-0.5">{hospital.type}</div>
                  <div className="label text-[10px] mt-1">
                    {hospital.address} · {hospital.distanceFromCenterKm} KM DISTANCE
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono-tech">
                  <div className="text-xs font-bold flex items-center justify-end gap-1.5">
                    {hospital.diversionStatus === 'OPEN' ? (
                      <span className="text-[#00ffaa] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>OPEN FOR INTAKE</span>
                      </span>
                    ) : (
                      <span className="text-[#ffd60a] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>DIVERSION WARNING</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    <span>ED WAIT: {hospital.currentWaitTimeMins} MINS</span>
                  </div>
                </div>
              </div>

              {/* Clinical Badges */}
              <div className="grid grid-cols-3 gap-2 mb-4 p-2.5 bg-[#0d0d0d] border border-white/10 text-[10px] font-mono-tech">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 ${hospital.traumaSurgeonOnDuty ? 'bg-[#00ffaa]' : 'bg-white/30'}`} />
                  <span className={hospital.traumaSurgeonOnDuty ? 'text-white' : 'text-white/40'}>
                    SURGEON: {hospital.traumaSurgeonOnDuty ? 'ON DUTY' : 'ON CALL'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 ${hospital.ctScanAvailable ? 'bg-[#00ffaa]' : 'bg-white/30'}`} />
                  <span className={hospital.ctScanAvailable ? 'text-white' : 'text-white/40'}>
                    CT SCAN: {hospital.ctScanAvailable ? 'ACTIVE' : 'DOWN'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 ${hospital.cathLabOnCall ? 'bg-[#00ffaa]' : 'bg-white/30'}`} />
                  <span className={hospital.cathLabOnCall ? 'text-white' : 'text-white/40'}>
                    CATH LAB: {hospital.cathLabOnCall ? 'READY' : 'STANDBY'}
                  </span>
                </div>
              </div>

              {/* Bed Category Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {renderBedCount('Trauma Bay', hospital.beds.traumaBay, hospital.id, 'traumaBay')}
                {renderBedCount('Intensive Care', hospital.beds.icu, hospital.id, 'icu')}
                {renderBedCount('Cath Lab (STEMI)', hospital.beds.cathLab, hospital.id, 'cathLab')}
                {renderBedCount('Emergency OR', hospital.beds.orSuites, hospital.id, 'orSuites')}
                {renderBedCount('Isolation', hospital.beds.negPressure, hospital.id, 'negPressure')}
                {renderBedCount('ED General', hospital.beds.erGeneral, hospital.id, 'erGeneral')}
              </div>

              {/* Inbound Patients */}
              {assignedPatients.length > 0 && (
                <div className="pt-3 border-t border-white/10 font-mono-tech">
                  <div className="label mb-2 flex items-center justify-between">
                    <span>INBOUND PRE-ALERTED PATIENTS ({assignedPatients.length}):</span>
                    <span className="text-[#00f2ff]">{hospital.contactRadioChannel}</span>
                  </div>
                  <div className="space-y-1">
                    {assignedPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPatientId(p.id);
                          setActiveView('telemetry');
                        }}
                        className="p-2 bg-[#0d0d0d] border border-white/10 hover:border-[#00f2ff] transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#ff2d55]">{p.id}</span>
                          <span className="text-white truncate max-w-[150px] font-semibold">{p.name}</span>
                          <span className="text-white/40 text-[10px] truncate max-w-[180px]">
                            {p.chiefComplaint}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[#00ffaa] text-[10px]">{p.assignedBayName}</span>
                          <span className="text-[#ff2d55] text-[10px] font-bold">
                            ETA {p.estimatedArrivalTimestamp}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openHandoffModal(p.id);
                            }}
                            className="btn-tactical text-[9px] py-0.5 px-2 uppercase tracking-normal"
                            title="Complete Patient Handoff & Bed Disposition"
                          >
                            {p.status === 'delivered' ? 'Occupied' : 'Handoff'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
