export type TriageLevel = 1 | 2 | 3 | 4 | 5;
export type TriageCode = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
export type AmbulanceStatus = 'en_route_scene' | 'at_scene' | 'en_route_hospital' | 'handover_in_progress' | 'available';
export type PriorityCode = 'Code 3 - Critical' | 'Code 2 - Urgent' | 'Code 1 - Standard';
export type SignalState = 'PREEMPTED_GREEN' | 'CLEARING_YELLOW' | 'NORMAL_CYCLE' | 'HOLD_RED';
export type DiversionStatus = 'OPEN' | 'WARNING' | 'DIVERT';

export interface Vitals {
  hr: number; // bpm
  sbp: number; // mmHg systolic
  dbp: number; // mmHg diastolic
  spo2: number; // %
  rr: number; // breaths/min
  temp: number; // Celsius
  gcs: number; // 3-15
  etco2?: number; // mmHg
  bloodGlucose?: number; // mg/dL
}

export interface VitalHistoryPoint {
  time: string;
  hr: number;
  spo2: number;
  sbp: number;
  dbp: number;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  chiefComplaint: string;
  triageLevel: TriageLevel;
  triageCode: TriageCode;
  triageCategoryName: string; // e.g. "ESI 1 - Resuscitation"
  traumaAlertLevel: 'Level 1 Trauma' | 'Code STEMI' | 'Code Stroke' | 'Sepsis Alert' | 'Standard';
  vitals: Vitals;
  vitalsHistory: VitalHistoryPoint[];
  interventions: string[];
  allergies: string[];
  medicalHistory: string[];
  assignedHospitalId: string;
  assignedBedType: 'traumaBay' | 'icu' | 'cathLab' | 'orSuites' | 'erGeneral' | 'negPressure';
  assignedBayName: string;
  receivingPhysician: string;
  preAlertSent: boolean;
  preAlertAcknowledged: boolean;
  digitalHandoverSigned: boolean;
  status?: 'in_transit' | 'delivered';
  deliveryTimestamp?: string;
  handoffNotes?: string;
  finalVitals?: Vitals;
  estimatedArrivalTimestamp: string;
  notes: string;
}

export interface GroundedPlaceLink {
  title: string;
  uri: string;
  snippet?: string;
}

export interface PredictiveTrafficImpact {
  score: number; // 0-100
  statusLabel: 'OPTIMAL CLEARANCE' | 'MODERATE IMPEDANCE' | 'HIGH BACKLOG' | 'CRITICAL CONGESTION';
  colorCode: string;
  preemptedSignalsCount: number;
  totalSignalsCount: number;
  preemptionRatePct: number;
  projectedDelayMinutes: number; // negative means time saved via preemption
  corridorImpedanceIndex: number; // 0.0 to 1.0
  bottlenecks: string[];
  rerouteRecommendation?: {
    recommended: boolean;
    reason: string;
    targetHospitalId: string;
    targetHospitalName: string;
    alternateCorridorId: string;
    alternateCorridorName: string;
    projectedMinutesSaved: number;
  };
  groundedPlaceLinks?: GroundedPlaceLink[];
  aiAnalysisSummary?: string;
  isAiAnalyzing?: boolean;
}

export interface Ambulance {
  id: string;
  callsign: string;
  type: 'ALS' | 'MICU' | 'BLS' | 'MEDEVAC';
  status: AmbulanceStatus;
  crew: string[];
  assignedHospitalId: string | null;
  patientId: string | null;
  speedKmh: number;
  batteryOrFuelPct: number;
  corridorActive: boolean;
  coords: { x: number; y: number }; // Percentage 0-100 on map
  progressPct: number; // 0 to 100
  etaSeconds: number;
  distanceKm: number;
  priorityCode: PriorityCode;
  sirenActive: boolean;
  corridorPathId: string;
  radioChannel: string;
  predictiveTrafficImpact?: PredictiveTrafficImpact;
}

export interface BedCategory {
  total: number;
  occupied: number;
  reserved: number;
}

export interface Hospital {
  id: string;
  name: string;
  shortName: string;
  type: string;
  address: string;
  coords: { x: number; y: number };
  distanceFromCenterKm: number;
  beds: {
    traumaBay: BedCategory;
    icu: BedCategory;
    cathLab: BedCategory;
    orSuites: BedCategory;
    erGeneral: BedCategory;
    negPressure: BedCategory;
  };
  traumaSurgeonOnDuty: boolean;
  ctScanAvailable: boolean;
  cathLabOnCall: boolean;
  diversionStatus: DiversionStatus;
  contactRadioChannel: string;
  receivingTeam: string;
  currentWaitTimeMins: number;
}

export interface TrafficIntersection {
  id: string;
  name: string;
  corridorName: string;
  coords: { x: number; y: number };
  status: SignalState;
  crossTrafficState: 'RED' | 'YELLOW' | 'GREEN';
  timeUntilAmbulancePassSec: number;
  preemptionArmed: boolean;
  manualOverride: boolean;
}

export interface CorridorRoute {
  id: string;
  name: string;
  hospitalId: string;
  totalDistanceKm: number;
  intersectionIds: string[];
  pathPoints: Array<{ x: number; y: number }>;
}

export interface CADIncident {
  id: string;
  caller: string;
  location: string;
  chiefComplaint: string;
  severity: PriorityCode;
  reportedTime: string;
  suggestedBedType: 'traumaBay' | 'icu' | 'cathLab' | 'orSuites' | 'erGeneral' | 'negPressure';
  age: number;
  gender: 'M' | 'F';
}

export type VoiceCommandType =
  | 'REROUTE'
  | 'HANDOFF_COMPLETE'
  | 'HANDOFF_MODAL'
  | 'PRE_ALERT'
  | 'TOGGLE_SIREN'
  | 'TOGGLE_PREEMPTION'
  | 'SWITCH_VIEW'
  | 'SIMULATE_BOTTLENECK'
  | 'UNKNOWN';

export interface VoiceCommandIntent {
  type: VoiceCommandType;
  ambulanceId?: string;
  ambulanceCallsign?: string;
  hospitalId?: string;
  hospitalName?: string;
  patientId?: string;
  patientName?: string;
  targetView?: 'overview' | 'corridor' | 'fleet' | 'triage' | 'telemetry' | 'dispatch';
  notes?: string;
  confidence: number; // 0.0 to 1.0
  rawTranscript: string;
  speechReadback: string;
  statusMessage: string;
}

export interface VoiceLogEntry {
  id: string;
  timestamp: string;
  transcript: string;
  intent: VoiceCommandIntent;
  status: 'executed' | 'failed' | 'recognized';
}
