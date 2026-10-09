import React from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { Activity, Radio, Bed, TrafficCone, ShieldCheck } from 'lucide-react';

export const QuickStatsStrip: React.FC = () => {
  const { ambulances, hospitals, intersections, patients } = useEmergency();

  const activeEnRouteAmbulances = ambulances.filter(
    (a) => a.status === 'en_route_hospital'
  ).length;

  const preemptedSignalsCount = intersections.filter(
    (i) => i.status === 'PREEMPTED_GREEN'
  ).length;

  // Calculate total critical beds (Trauma Bay + ICU) across network
  let totalCriticalBeds = 0;
  let occupiedCriticalBeds = 0;
  let reservedCriticalBeds = 0;

  hospitals.forEach((h) => {
    totalCriticalBeds += h.beds.traumaBay.total + h.beds.icu.total;
    occupiedCriticalBeds += h.beds.traumaBay.occupied + h.beds.icu.occupied;
    reservedCriticalBeds += h.beds.traumaBay.reserved + h.beds.icu.reserved;
  });

  const availableCriticalBeds = totalCriticalBeds - occupiedCriticalBeds - reservedCriticalBeds;
  const criticalOccupancyRate = Math.round(((occupiedCriticalBeds + reservedCriticalBeds) / totalCriticalBeds) * 100);

  const criticalPatientsCount = patients.filter((p) => p.triageLevel <= 2).length;

  return (
    <div className="border-b border-slate-800/80 bg-slate-900/60 py-3 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 text-xs text-slate-400">
        {/* Metric 1 */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Ambulances En Route
            </div>
            <div className="text-base font-bold font-mono text-white tabular-nums">
              {activeEnRouteAmbulances} <span className="text-xs font-normal text-slate-400">Units Active</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <TrafficCone className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Preempted Green Signals
            </div>
            <div className="text-base font-bold font-mono text-white tabular-nums">
              {preemptedSignalsCount} <span className="text-xs font-normal text-slate-400">Intersections</span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <Bed className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Critical Bay Availability
            </div>
            <div className="text-base font-bold font-mono text-white tabular-nums">
              {availableCriticalBeds} / {totalCriticalBeds} <span className="text-xs font-normal text-slate-400">({criticalOccupancyRate}% Occupied)</span>
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              ESI 1-2 Trauma Code
            </div>
            <div className="text-base font-bold font-mono text-white tabular-nums">
              {criticalPatientsCount} <span className="text-xs font-normal text-slate-400">Patients Streamed</span>
            </div>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
              Corridor Transit Advantage
            </div>
            <div className="text-base font-bold font-mono text-white tabular-nums">
              -4.6 <span className="text-xs font-normal text-slate-400">Mins Avg Savings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
