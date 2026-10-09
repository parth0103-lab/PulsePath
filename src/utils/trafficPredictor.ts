import {
  Ambulance,
  TrafficIntersection,
  CorridorRoute,
  Hospital,
  PredictiveTrafficImpact,
  GroundedPlaceLink,
} from '../types';

export function calculatePredictiveTrafficImpact(
  ambulance: Ambulance,
  intersections: TrafficIntersection[],
  corridors: CorridorRoute[],
  hospitals: Hospital[],
  existingGrounded?: {
    links?: GroundedPlaceLink[];
    summary?: string;
    isAnalyzing?: boolean;
  }
): PredictiveTrafficImpact {
  const corridor = corridors.find((c) => c.id === ambulance.corridorPathId);
  const targetHospital = hospitals.find((h) => h.id === ambulance.assignedHospitalId);

  // If vehicle is available / standby
  if (ambulance.status === 'available' || !ambulance.corridorActive && !ambulance.patientId) {
    return {
      score: 95,
      statusLabel: 'OPTIMAL CLEARANCE',
      colorCode: '#00ffaa',
      preemptedSignalsCount: 0,
      totalSignalsCount: 0,
      preemptionRatePct: 100,
      projectedDelayMinutes: 0,
      corridorImpedanceIndex: 0.05,
      bottlenecks: [],
      rerouteRecommendation: undefined,
      groundedPlaceLinks: existingGrounded?.links || [
        {
          title: 'Sector 01 Central Staging Terminal',
          uri: 'https://www.google.com/maps/search/?api=1&query=Emergency+Medical+Services+Station',
          snippet: 'Holding standby patrol zone with direct arterial access.',
        },
      ],
      aiAnalysisSummary: existingGrounded?.summary || 'Unit in patrol readiness. Sector arterial impedance negligible.',
      isAiAnalyzing: existingGrounded?.isAnalyzing,
    };
  }

  const corridorIntersections = corridor
    ? intersections.filter((i) => corridor.intersectionIds.includes(i.id))
    : [];

  const totalSignals = corridorIntersections.length || 4;
  const preemptedSignals = corridorIntersections.filter(
    (i) => i.status === 'PREEMPTED_GREEN'
  ).length;

  const preemptionRate = totalSignals > 0 ? (preemptedSignals / totalSignals) * 100 : 0;
  
  // Find bottleneck intersections
  const bottleneckNames = corridorIntersections
    .filter((i) => i.status !== 'PREEMPTED_GREEN')
    .map((i) => i.name);

  // Calculate score (0-100)
  let baseScore: number;
  if (!ambulance.corridorActive) {
    baseScore = 32; // Unpreempted emergency transit encounters severe cross-traffic friction
  } else {
    // Range between 45 (0 preempted) to 96 (all preempted)
    baseScore = Math.round(45 + (preemptionRate / 100) * 51);
    if (ambulance.sirenActive) baseScore = Math.min(100, baseScore + 2);
  }

  // Label & color assignment
  let statusLabel: PredictiveTrafficImpact['statusLabel'];
  let colorCode: string;

  if (baseScore >= 80) {
    statusLabel = 'OPTIMAL CLEARANCE';
    colorCode = '#00ffaa';
  } else if (baseScore >= 65) {
    statusLabel = 'MODERATE IMPEDANCE';
    colorCode = '#00f2ff';
  } else if (baseScore >= 45) {
    statusLabel = 'HIGH BACKLOG';
    colorCode = '#ffaa00';
  } else {
    statusLabel = 'CRITICAL CONGESTION';
    colorCode = '#ff2d55';
  }

  // Projected time delta:
  // With 100% preemption, saving ~45s (0.75m) per signal vs normal cycle
  // If signals are un-preempted, ambulance gets delayed ~45s per red light
  const unPreemptedCount = totalSignals - preemptedSignals;
  const projectedDelayMinutes = ambulance.corridorActive
    ? +(-(preemptedSignals * 0.75) + unPreemptedCount * 0.45).toFixed(1)
    : +(unPreemptedCount * 1.1).toFixed(1);

  // Corridor impedance index: 0 (free flow) to 1.0 (deadlock)
  const corridorImpedanceIndex = +(1 - baseScore / 100).toFixed(2);

  // Reroute evaluation
  let rerouteRecommendation: PredictiveTrafficImpact['rerouteRecommendation'];

  // Check alternate hospital & corridors if current path has bottlenecks or score < 75
  if (baseScore < 75 && targetHospital) {
    const alternateHospitals = hospitals.filter(
      (h) => h.id !== targetHospital.id && h.diversionStatus !== 'DIVERT'
    );

    if (alternateHospitals.length > 0) {
      // Pick best alternate (e.g. St. Jude or Univ Heart)
      const altHospital = alternateHospitals[0];
      const altCorridor = corridors.find((c) => c.hospitalId === altHospital.id);
      const altIntersections = altCorridor
        ? intersections.filter((i) => altCorridor.intersectionIds.includes(i.id))
        : [];
      const altPreempted = altIntersections.filter((i) => i.status === 'PREEMPTED_GREEN').length;

      const projectedSavings = +(Math.abs(projectedDelayMinutes) + 1.6).toFixed(1);

      rerouteRecommendation = {
        recommended: true,
        reason: bottleneckNames.length > 0
          ? `Bottleneck at ${bottleneckNames[0]}. Alternate corridor offers ${altPreempted}/${altIntersections.length || 2} clear signals.`
          : `Active preemption gap detected. Faster transit advantage via ${altHospital.shortName}.`,
        targetHospitalId: altHospital.id,
        targetHospitalName: altHospital.shortName,
        alternateCorridorId: altCorridor?.id || 'corr-beta',
        alternateCorridorName: altCorridor?.name || 'Corridor Beta',
        projectedMinutesSaved: projectedSavings,
      };
    }
  }

  // Default fallback grounded links if not yet fetched from API
  const defaultLinks: GroundedPlaceLink[] = targetHospital
    ? [
        {
          title: `${targetHospital.name} (Emergency Ramp)`,
          uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(targetHospital.name + ' ' + targetHospital.address)}`,
          snippet: `Trauma receiving gate on ${targetHospital.address}. Priority siren bay clearance.`,
        },
        {
          title: `${corridor?.name || 'Emergency Corridor'} Traffic Flow`,
          uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(corridor?.name || 'Emergency Traffic Corridor')}`,
          snippet: 'Connected to metropolitan Traffic Signal Preemption System (TSPS).',
        },
      ]
    : [];

  return {
    score: baseScore,
    statusLabel,
    colorCode,
    preemptedSignalsCount: preemptedSignals,
    totalSignalsCount: totalSignals,
    preemptionRatePct: Math.round(preemptionRate),
    projectedDelayMinutes,
    corridorImpedanceIndex,
    bottlenecks: bottleneckNames,
    rerouteRecommendation,
    groundedPlaceLinks: existingGrounded?.links && existingGrounded.links.length > 0 ? existingGrounded.links : defaultLinks,
    aiAnalysisSummary: existingGrounded?.summary || (
      baseScore >= 80
        ? `Preemption corridor active. Green wave locked across ${preemptedSignals}/${totalSignals} signals. Time advantage: ${Math.abs(projectedDelayMinutes)}m saved.`
        : `Traffic friction detected at ${bottleneckNames.join(', ') || 'arterial crossings'}. Delay risk: +${projectedDelayMinutes}m without clearing.`
    ),
    isAiAnalyzing: existingGrounded?.isAnalyzing,
  };
}

export async function requestGroundedTrafficIntelligence(
  ambulance: Ambulance,
  corridor: CorridorRoute | undefined,
  hospital: Hospital | undefined,
  intersections: TrafficIntersection[]
): Promise<{
  summary: string;
  groundingLinks: GroundedPlaceLink[];
  trafficFlowScore: number;
  delayAvoidedMins: string;
}> {
  const corridorIntersections = corridor
    ? intersections.filter((i) => corridor.intersectionIds.includes(i.id))
    : [];

  const preemptedCount = corridorIntersections.filter(
    (i) => i.status === 'PREEMPTED_GREEN'
  ).length;

  const res = await fetch('/api/traffic-predict-grounding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callsign: ambulance.callsign,
      type: ambulance.type,
      corridorName: corridor?.name || 'Corridor Alpha',
      targetHospitalName: hospital?.name || 'Metro General Trauma Center',
      targetHospitalAddress: hospital?.address || '100 Medical Center Way',
      intersectionsCount: corridorIntersections.length || 4,
      preemptedCount,
      distanceKm: ambulance.distanceKm,
      etaSeconds: ambulance.etaSeconds,
      corridorActive: ambulance.corridorActive,
      coordinates: { lat: 37.7749, lng: -122.4194 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch grounded traffic prediction: ${res.statusText}`);
  }

  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Invalid traffic prediction response');
  }

  return json.data;
}
