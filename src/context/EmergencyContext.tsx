import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Hospital,
  Ambulance,
  Patient,
  TrafficIntersection,
  CorridorRoute,
  CADIncident,
  SignalState,
  GroundedPlaceLink,
  VoiceCommandIntent,
  VoiceLogEntry,
} from '../types';
import {
  INITIAL_HOSPITALS,
  INITIAL_AMBULANCES,
  INITIAL_PATIENTS,
  INITIAL_INTERSECTIONS,
  INITIAL_CORRIDORS,
  INITIAL_CAD_INCIDENTS,
} from '../data/initialData';
import { soundEngine } from '../utils/audio';
import {
  calculatePredictiveTrafficImpact,
  requestGroundedTrafficIntelligence,
} from '../utils/trafficPredictor';
import { parseVoiceCommandWithAi } from '../utils/voiceCommandParser';

interface EmergencyContextType {
  hospitals: Hospital[];
  ambulances: Ambulance[];
  patients: Patient[];
  intersections: TrafficIntersection[];
  corridors: CorridorRoute[];
  cadIncidents: CADIncident[];
  selectedAmbulanceId: string | null;
  selectedPatientId: string | null;
  selectedHospitalId: string | null;
  activeView: 'overview' | 'corridor' | 'fleet' | 'triage' | 'telemetry' | 'dispatch';
  isSimulating: boolean;
  simSpeed: number;
  soundMuted: boolean;
  recentAlert: string | null;
  
  // Setters & Actions
  setSelectedAmbulanceId: (id: string | null) => void;
  setSelectedPatientId: (id: string | null) => void;
  setSelectedHospitalId: (id: string | null) => void;
  setActiveView: (view: 'overview' | 'corridor' | 'fleet' | 'triage' | 'telemetry' | 'dispatch') => void;
  setIsSimulating: (simulating: boolean) => void;
  setSimSpeed: (speed: number) => void;
  toggleSound: () => void;
  
  // Operational Methods
  toggleCorridorPreemption: (intersectionId: string) => void;
  toggleAmbulanceSiren: (ambulanceId: string) => void;
  rerouteAmbulance: (ambulanceId: string, targetHospitalId: string) => void;
  reserveHospitalBed: (hospitalId: string, bedType: keyof Hospital['beds'], patientId?: string) => void;
  releaseHospitalBed: (hospitalId: string, bedType: keyof Hospital['beds']) => void;
  sendPreAlertNotice: (patientId: string) => void;
  signDigitalHandover: (patientId: string) => void;
  completePatientHandoff: (
    patientId: string,
    finalVitals: import('../types').Vitals,
    handoffNotes: string,
    receivingPhysicianName?: string
  ) => void;
  isHandoffModalOpen: boolean;
  handoffPatientId: string | null;
  openHandoffModal: (patientId?: string) => void;
  closeHandoffModal: () => void;
  addCadIncident: (incidentData: {
    caller?: string;
    location: string;
    chiefComplaint: string;
    severity?: import('../types').PriorityCode;
    suggestedBedType?: keyof Hospital['beds'];
    age?: number;
    gender?: 'M' | 'F';
  }) => CADIncident;
  resetAmbulanceUnit: (ambulanceId: string) => void;
  simulateCorridorBottleneck: (ambulanceId?: string) => void;
  dispatchAmbulanceToIncident: (
    incidentId: string,
    ambulanceId: string,
    targetHospitalId: string,
    bedType: keyof Hospital['beds']
  ) => void;
  triggerAiTrafficGrounding: (ambulanceId: string) => Promise<void>;
  dismissAlert: () => void;

  // Hands-Free Voice Dispatch Layer
  isVoiceListening: boolean;
  isVoxHandsFree: boolean;
  isVoiceProcessing: boolean;
  isVoiceLayerOpen: boolean;
  voiceReadbackEnabled: boolean;
  latestVoiceCommand: VoiceCommandIntent | null;
  voiceLogs: VoiceLogEntry[];
  setIsVoiceLayerOpen: (open: boolean) => void;
  setVoiceListening: (listening: boolean) => void;
  toggleVoiceListening: () => void;
  toggleVoxHandsFree: () => void;
  setVoiceReadbackEnabled: (enabled: boolean) => void;
  clearVoiceLogs: () => void;
  executeVoiceTranscript: (transcript: string) => Promise<{ success: boolean; intent: VoiceCommandIntent }>;
}

const EmergencyContext = createContext<EmergencyContextType | null>(null);

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hospitals, setHospitals] = useState<Hospital[]>(INITIAL_HOSPITALS);
  const [ambulances, setAmbulances] = useState<Ambulance[]>(INITIAL_AMBULANCES);
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [intersections, setIntersections] = useState<TrafficIntersection[]>(INITIAL_INTERSECTIONS);
  const [corridors] = useState<CorridorRoute[]>(INITIAL_CORRIDORS);
  const [cadIncidents, setCadIncidents] = useState<CADIncident[]>(INITIAL_CAD_INCIDENTS);

  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string | null>('amb-als-01');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>('PT-9014');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>('hosp-metro');
  const [activeView, setActiveView] = useState<'overview' | 'corridor' | 'fleet' | 'triage' | 'telemetry' | 'dispatch'>('overview');

  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState<boolean>(false);
  const [handoffPatientId, setHandoffPatientId] = useState<string | null>(null);
  const [recentAlert, setRecentAlert] = useState<string | null>(
    'Corridor Alpha Activated: Traffic signals preempted green for Unit ALS-01 approaching Metro Trauma.'
  );

  // Hands-Free Voice Dispatch Layer
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [isVoxHandsFree, setIsVoxHandsFree] = useState<boolean>(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState<boolean>(false);
  const [isVoiceLayerOpen, setIsVoiceLayerOpen] = useState<boolean>(false);
  const [voiceReadbackEnabled, setVoiceReadbackEnabled] = useState<boolean>(true);
  const [latestVoiceCommand, setLatestVoiceCommand] = useState<VoiceCommandIntent | null>(null);
  const [voiceLogs, setVoiceLogs] = useState<VoiceLogEntry[]>([
    {
      id: 'voice-log-init',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      transcript: 'VOX CAD Voice-to-Text Layer Armed',
      intent: {
        type: 'SWITCH_VIEW',
        confidence: 1.0,
        rawTranscript: 'Voice Layer Standby',
        speechReadback: 'Voice dispatch layer operational. Ready for verbal reroute and handoff transmissions.',
        statusMessage: 'VOX Radio Layer Armed',
      },
      status: 'executed',
    },
  ]);

  const toggleVoiceListening = useCallback(() => {
    setIsVoiceListening((prev) => {
      const next = !prev;
      if (next) {
        soundEngine.playMicOn();
      } else {
        soundEngine.playMicOff();
      }
      return next;
    });
  }, []);

  const setVoiceListening = useCallback((listening: boolean) => {
    setIsVoiceListening((prev) => {
      if (prev !== listening) {
        if (listening) {
          soundEngine.playMicOn();
        } else {
          soundEngine.playMicOff();
        }
      }
      return listening;
    });
  }, []);

  const toggleVoxHandsFree = useCallback(() => {
    setIsVoxHandsFree((prev) => {
      const next = !prev;
      soundEngine.playRadioChirp();
      if (next) {
        setRecentAlert('HANDS-FREE VOX ARMED: Open microphone monitoring for dispatcher voice commands.');
      } else {
        setRecentAlert('VOX MUTED: Push-To-Talk manual radio mode active.');
      }
      return next;
    });
  }, []);

  const clearVoiceLogs = useCallback(() => {
    setVoiceLogs([]);
  }, []);

  const [groundedCache, setGroundedCache] = useState<
    Record<string, { summary: string; links: GroundedPlaceLink[]; isAnalyzing: boolean }>
  >({});

  const lastBeepTimeRef = useRef<number>(Date.now());

  const openHandoffModal = useCallback((patientId?: string) => {
    setHandoffPatientId(patientId || selectedPatientId);
    setIsHandoffModalOpen(true);
  }, [selectedPatientId]);

  const closeHandoffModal = useCallback(() => {
    setIsHandoffModalOpen(false);
    setHandoffPatientId(null);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      if (!next) {
        soundEngine.playRadioChirp();
      }
      return next;
    });
  }, []);

  const dismissAlert = () => setRecentAlert(null);

  // Manual Signal Preemption Toggle
  const toggleCorridorPreemption = useCallback((intersectionId: string) => {
    setIntersections((prev) =>
      prev.map((int) => {
        if (int.id === intersectionId) {
          const nextState: SignalState =
            int.status === 'PREEMPTED_GREEN' ? 'NORMAL_CYCLE' : 'PREEMPTED_GREEN';
          soundEngine.playCorridorPreemptTone();
          return {
            ...int,
            status: nextState,
            crossTrafficState: nextState === 'PREEMPTED_GREEN' ? 'RED' : 'GREEN',
            manualOverride: !int.manualOverride,
          };
        }
        return int;
      })
    );
  }, []);

  // Toggle Ambulance Siren
  const toggleAmbulanceSiren = useCallback((ambulanceId: string) => {
    setAmbulances((prev) =>
      prev.map((amb) => {
        if (amb.id === ambulanceId) {
          const nextSiren = !amb.sirenActive;
          if (nextSiren) soundEngine.playRadioChirp();
          return { ...amb, sirenActive: nextSiren };
        }
        return amb;
      })
    );
  }, []);

  // Reroute ambulance to alternative trauma center
  const rerouteAmbulance = useCallback((ambulanceId: string, targetHospitalId: string) => {
    const targetHosp = hospitals.find((h) => h.id === targetHospitalId);
    if (!targetHosp) return;

    const altCorridor = corridors.find((c) => c.hospitalId === targetHospitalId);

    soundEngine.playRadioChirp();
    setRecentAlert(
      `REROUTE DISPATCH: Unit re-directed to ${targetHosp.name}. Priority corridor switched to ${altCorridor?.name || 'Alternate Feeder'}.`
    );

    setAmbulances((prev) =>
      prev.map((amb) => {
        if (amb.id === ambulanceId) {
          return {
            ...amb,
            assignedHospitalId: targetHospitalId,
            corridorPathId: altCorridor ? altCorridor.id : amb.corridorPathId,
            progressPct: 15,
            etaSeconds: 320,
            distanceKm: targetHosp.distanceFromCenterKm,
            corridorActive: true,
          };
        }
        return amb;
      })
    );

    setPatients((prev) =>
      prev.map((pt) => {
        const amb = ambulances.find((a) => a.id === ambulanceId);
        if (amb && amb.patientId === pt.id) {
          return {
            ...pt,
            assignedHospitalId: targetHospitalId,
            preAlertAcknowledged: false,
          };
        }
        return pt;
      })
    );
  }, [hospitals, ambulances, corridors]);

  // AI-Powered Google Maps Grounded Traffic Intelligence
  const triggerAiTrafficGrounding = useCallback(
    async (ambulanceId: string) => {
      const amb = ambulances.find((a) => a.id === ambulanceId);
      if (!amb) return;

      const corridor = corridors.find((c) => c.id === amb.corridorPathId);
      const hospital = hospitals.find((h) => h.id === amb.assignedHospitalId);

      setGroundedCache((prev) => ({
        ...prev,
        [ambulanceId]: {
          summary: prev[ambulanceId]?.summary || 'Syncing live Google Maps traffic intelligence and route corridors...',
          links: prev[ambulanceId]?.links || [],
          isAnalyzing: true,
        },
      }));

      soundEngine.playRadioChirp();
      setRecentAlert(`MAPS GROUNDING: Requesting real-time traffic analysis via Gemini 2.5 Flash for ${amb.callsign}...`);

      try {
        const intelligence = await requestGroundedTrafficIntelligence(
          amb,
          corridor,
          hospital,
          intersections
        );

        setGroundedCache((prev) => ({
          ...prev,
          [ambulanceId]: {
            summary: intelligence.summary,
            links: intelligence.groundingLinks,
            isAnalyzing: false,
          },
        }));

        soundEngine.playRadioChirp();
        setRecentAlert(
          `MAPS GROUNDED: Real-time traffic intelligence verified for Unit ${amb.callsign}. ${intelligence.groundingLinks.length} Google Maps navigation corridors synced.`
        );
      } catch (err: any) {
        console.warn('Grounding intelligence request failed, using tactical estimate:', err);
        setGroundedCache((prev) => ({
          ...prev,
          [ambulanceId]: {
            summary: prev[ambulanceId]?.summary || 'Active preemption green wave holding. Corridor velocity optimal.',
            links: prev[ambulanceId]?.links || [],
            isAnalyzing: false,
          },
        }));
      }
    },
    [ambulances, corridors, hospitals, intersections]
  );

  // Reserve bed in hospital
  const reserveHospitalBed = useCallback((
    hospitalId: string,
    bedType: keyof Hospital['beds'],
    patientId?: string
  ) => {
    setHospitals((prev) =>
      prev.map((hosp) => {
        if (hosp.id === hospitalId) {
          const currentBed = hosp.beds[bedType];
          const available = currentBed.total - (currentBed.occupied + currentBed.reserved);
          if (available <= 0) return hosp;
          return {
            ...hosp,
            beds: {
              ...hosp.beds,
              [bedType]: {
                ...currentBed,
                reserved: currentBed.reserved + 1,
              },
            },
          };
        }
        return hosp;
      })
    );

    if (patientId) {
      setPatients((prev) =>
        prev.map((pt) => {
          if (pt.id === patientId) {
            return {
              ...pt,
              assignedHospitalId: hospitalId,
              assignedBedType: bedType as Patient['assignedBedType'],
              preAlertSent: true,
              preAlertAcknowledged: true,
            };
          }
          return pt;
        })
      );
    }
    soundEngine.playRadioChirp();
    setRecentAlert(`BED RESERVATION LOCKED: ${String(bedType).toUpperCase()} held at target hospital.`);
  }, []);

  // Release bed
  const releaseHospitalBed = useCallback((hospitalId: string, bedType: keyof Hospital['beds']) => {
    setHospitals((prev) =>
      prev.map((hosp) => {
        if (hosp.id === hospitalId) {
          const current = hosp.beds[bedType];
          if (current.reserved <= 0) return hosp;
          return {
            ...hosp,
            beds: {
              ...hosp.beds,
              [bedType]: {
                ...current,
                reserved: current.reserved - 1,
              },
            },
          };
        }
        return hosp;
      })
    );
  }, []);

  // Send Pre-Alert notification to hospital
  const sendPreAlertNotice = useCallback((patientId: string) => {
    setPatients((prev) =>
      prev.map((pt) => {
        if (pt.id === patientId) {
          soundEngine.playRadioChirp();
          setRecentAlert(`PRIORITY PRE-ALERT DISPATCHED: ED Trauma Team notified for ${pt.name} (${pt.traumaAlertLevel}).`);
          return { ...pt, preAlertSent: true, preAlertAcknowledged: true };
        }
        return pt;
      })
    );
  }, []);

  // Sign digital handover
  const signDigitalHandover = useCallback((patientId: string) => {
    setPatients((prev) =>
      prev.map((pt) => {
        if (pt.id === patientId) {
          soundEngine.playRadioChirp();
          setRecentAlert(`TRANSFER OF CARE COMPLETE: Digital Handover validated by Receiving Attending for ${pt.name}.`);
          return { ...pt, digitalHandoverSigned: true, status: 'delivered' };
        }
        return pt;
      })
    );

    // Set ambulance to available
    setAmbulances((prev) =>
      prev.map((amb) => {
        if (amb.patientId === patientId) {
          return {
            ...amb,
            status: 'available',
            speedKmh: 0,
            corridorActive: false,
            sirenActive: false,
            patientId: null,
            assignedHospitalId: null,
          };
        }
        return amb;
      })
    );
  }, []);

  // Complete formal patient handoff with final vitals and triage notes, occupying hospital bed
  const completePatientHandoff = useCallback((
    patientId: string,
    finalVitals: import('../types').Vitals,
    handoffNotes: string,
    receivingPhysicianName?: string
  ) => {
    let targetHospitalId = '';
    let targetBedType: keyof Hospital['beds'] = 'traumaBay';
    let patientName = '';
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Mark patient as delivered and store final vitals + triage notes
    setPatients((prev) =>
      prev.map((pt) => {
        if (pt.id === patientId) {
          targetHospitalId = pt.assignedHospitalId;
          targetBedType = pt.assignedBedType;
          patientName = pt.name;
          return {
            ...pt,
            status: 'delivered',
            digitalHandoverSigned: true,
            deliveryTimestamp: nowTime,
            vitals: finalVitals,
            finalVitals: finalVitals,
            handoffNotes: handoffNotes,
            receivingPhysician: receivingPhysicianName || pt.receivingPhysician,
          };
        }
        return pt;
      })
    );

    // 2. Update target hospital bed status to 'occupied' (move from reserved -> occupied)
    setHospitals((prev) =>
      prev.map((hosp) => {
        if (hosp.id === targetHospitalId) {
          const bedCat = hosp.beds[targetBedType];
          const newReserved = Math.max(0, bedCat.reserved - 1);
          const newOccupied = Math.min(bedCat.total, bedCat.occupied + 1);
          return {
            ...hosp,
            beds: {
              ...hosp.beds,
              [targetBedType]: {
                ...bedCat,
                reserved: newReserved,
                occupied: newOccupied,
              },
            },
          };
        }
        return hosp;
      })
    );

    // 3. Clear and free assigned ambulance
    setAmbulances((prev) =>
      prev.map((amb) => {
        if (amb.patientId === patientId) {
          return {
            ...amb,
            status: 'available',
            speedKmh: 0,
            corridorActive: false,
            sirenActive: false,
            progressPct: 100,
            patientId: null,
            assignedHospitalId: null,
          };
        }
        return amb;
      })
    );

    soundEngine.playRadioChirp();
    const hosp = hospitals.find((h) => h.id === targetHospitalId);
    setRecentAlert(
      `TRANSFER OF CARE COMPLETE: ${patientId} (${patientName}) DELIVERED TO ${hosp?.shortName?.toUpperCase() || 'HOSPITAL'}. BED OCCUPIED IN ${String(targetBedType).toUpperCase()}.`
    );
    setIsHandoffModalOpen(false);
    setHandoffPatientId(null);
  }, [hospitals]);

  // Dispatch ambulance to incident
  const dispatchAmbulanceToIncident = useCallback((
    incidentId: string,
    ambulanceId: string,
    targetHospitalId: string,
    bedType: keyof Hospital['beds']
  ) => {
    const incident = cadIncidents.find((i) => i.id === incidentId);
    const amb = ambulances.find((a) => a.id === ambulanceId);
    const hosp = hospitals.find((h) => h.id === targetHospitalId);
    if (!incident || !amb || !hosp) return;

    const newPatientId = `PT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPatient: Patient = {
      id: newPatientId,
      name: `Patient (${incident.gender}, ${incident.age}y)`,
      age: incident.age,
      gender: incident.gender,
      chiefComplaint: incident.chiefComplaint,
      triageLevel: incident.severity.includes('Critical') ? 1 : 2,
      triageCode: incident.severity.includes('Critical') ? 'RED' : 'ORANGE',
      triageCategoryName: incident.severity.includes('Critical') ? 'ESI 1 - Resuscitation' : 'ESI 2 - Emergent',
      traumaAlertLevel: incident.chiefComplaint.toLowerCase().includes('burn') ? 'Level 1 Trauma' : 'Standard',
      vitals: {
        hr: 110 + Math.floor(Math.random() * 20),
        sbp: 95,
        dbp: 60,
        spo2: 93,
        rr: 24,
        temp: 36.8,
        gcs: 14,
        bloodGlucose: 115,
      },
      vitalsHistory: [
        { time: '10:48', hr: 110, spo2: 93, sbp: 95, dbp: 60 },
      ],
      interventions: ['Dispatch triage initiated', 'Ambulance en route to scene'],
      allergies: ['Unknown / Pending field triage'],
      medicalHistory: ['Pending history taking'],
      assignedHospitalId: targetHospitalId,
      assignedBedType: bedType as Patient['assignedBedType'],
      assignedBayName: `${String(bedType).toUpperCase()} Bay 1`,
      receivingPhysician: hosp.receivingTeam,
      preAlertSent: true,
      preAlertAcknowledged: true,
      digitalHandoverSigned: false,
      estimatedArrivalTimestamp: '11 mins',
      notes: `Incident dispatch from ${incident.location}. ${incident.chiefComplaint}`,
    };

    setPatients((prev) => [newPatient, ...prev]);
    setCadIncidents((prev) => prev.filter((i) => i.id !== incidentId));

    setAmbulances((prev) =>
      prev.map((a) => {
        if (a.id === ambulanceId) {
          return {
            ...a,
            status: 'en_route_hospital',
            patientId: newPatientId,
            assignedHospitalId: targetHospitalId,
            corridorActive: true,
            sirenActive: true,
            speedKmh: 64,
            progressPct: 15,
            etaSeconds: 480,
            distanceKm: 5.6,
          };
        }
        return a;
      })
    );

    // Reserve hospital bed
    reserveHospitalBed(targetHospitalId, bedType, newPatientId);

    // Audio chime & notification
    soundEngine.playCorridorPreemptTone();
    soundEngine.playRadioChirp();
    setRecentAlert(`CAD DISPATCH CONFIRMED: Unit ${amb.callsign} assigned to ${incident.location}. Corridor preemption armed to ${hosp.shortName}.`);

    setSelectedAmbulanceId(ambulanceId);
    setSelectedPatientId(newPatientId);
  }, [cadIncidents, ambulances, hospitals, reserveHospitalBed]);

  // Log and add new CAD Incident to dispatch queue
  const addCadIncident = useCallback((incidentData: {
    caller?: string;
    location: string;
    chiefComplaint: string;
    severity?: import('../types').PriorityCode;
    suggestedBedType?: keyof Hospital['beds'];
    age?: number;
    gender?: 'M' | 'F';
  }): CADIncident => {
    const newId = `CAD-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newIncident: CADIncident = {
      id: newId,
      caller: incidentData.caller || '911 Emergency Dispatcher',
      location: incidentData.location || 'Central Metro District',
      chiefComplaint: incidentData.chiefComplaint || 'Acute Trauma / Distress',
      severity: incidentData.severity || 'Code 3 - Critical',
      reportedTime: nowTime,
      suggestedBedType: incidentData.suggestedBedType || 'traumaBay',
      age: incidentData.age ?? 45,
      gender: incidentData.gender || 'M',
    };

    setCadIncidents((prev) => [newIncident, ...prev]);
    soundEngine.playRadioChirp();
    setRecentAlert(
      `NEW CAD INCIDENT QUEUED: ${newId} (${newIncident.severity}) AT ${newIncident.location.toUpperCase()}`
    );
    return newIncident;
  }, []);

  // Reset ambulance to available status (clearing assignment for re-dispatch)
  const resetAmbulanceUnit = useCallback((ambulanceId: string) => {
    setAmbulances((prev) =>
      prev.map((a) => {
        if (a.id === ambulanceId) {
          return {
            ...a,
            status: 'available',
            speedKmh: 0,
            corridorActive: false,
            sirenActive: false,
            patientId: null,
            assignedHospitalId: null,
            progressPct: 0,
            etaSeconds: 0,
          };
        }
        return a;
      })
    );
    soundEngine.playRadioChirp();
    setRecentAlert(`UNIT RESET: Ambulance returned to patrol staging ready for dispatch.`);
  }, []);

  // Simulate corridor bottleneck / preemption shift to test predictive traffic impact
  const simulateCorridorBottleneck = useCallback((ambulanceId?: string) => {
    const targetAmbId = ambulanceId || selectedAmbulanceId || ambulances[0]?.id;
    const amb = ambulances.find((a) => a.id === targetAmbId);
    if (!amb || !amb.corridorPathId) return;

    const corr = corridors.find((c) => c.id === amb.corridorPathId);
    if (!corr) return;

    setIntersections((prev) =>
      prev.map((i) => {
        if (corr.intersectionIds.includes(i.id)) {
          const isCurrentlyGreen = i.status === 'PREEMPTED_GREEN';
          return {
            ...i,
            status: isCurrentlyGreen ? 'NORMAL_CYCLE' : 'PREEMPTED_GREEN',
            crossTrafficState: isCurrentlyGreen ? 'GREEN' : 'RED',
            preemptionArmed: !isCurrentlyGreen,
          };
        }
        return i;
      })
    );
    soundEngine.playCorridorPreemptTone();
    setRecentAlert(`CORRIDOR IMPEDANCE SHIFT: Signal wave toggled on ${corr.name}. Predictive traffic scores recalculated.`);
  }, [ambulances, corridors]);

  // Execute Voice Command Transcript parsed verbally by Dispatcher
  const executeVoiceTranscript = useCallback(
    async (transcript: string): Promise<{ success: boolean; intent: VoiceCommandIntent }> => {
      if (!transcript || !transcript.trim()) {
        const fallbackIntent: VoiceCommandIntent = {
          type: 'UNKNOWN',
          confidence: 0,
          rawTranscript: '',
          speechReadback: '',
          statusMessage: 'No audio detected',
        };
        return { success: false, intent: fallbackIntent };
      }

      setIsVoiceProcessing(true);

      const intent = await parseVoiceCommandWithAi(transcript, {
        ambulances,
        hospitals,
        patients,
        selectedAmbulanceId,
        selectedPatientId,
      });

      let success = false;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      switch (intent.type) {
        case 'REROUTE': {
          if (intent.ambulanceId && intent.hospitalId) {
            rerouteAmbulance(intent.ambulanceId, intent.hospitalId);
            setSelectedAmbulanceId(intent.ambulanceId);
            setSelectedHospitalId(intent.hospitalId);
            soundEngine.playCommandSuccess();
            if (voiceReadbackEnabled) {
              soundEngine.speakDispatcherAck(intent.speechReadback);
            }
            success = true;
          }
          break;
        }

        case 'HANDOFF_COMPLETE': {
          if (intent.patientId) {
            const pt = patients.find((p) => p.id === intent.patientId);
            if (pt) {
              completePatientHandoff(
                pt.id,
                pt.vitals,
                intent.notes ||
                  `FIELD DISPATCH RADIO HANDOFF: Verbal transfer-of-care authenticated by CAD Dispatcher for ${pt.name}. Receiving attending notified.`,
                pt.receivingPhysician
              );
              setSelectedPatientId(pt.id);
              soundEngine.playCommandSuccess();
              if (voiceReadbackEnabled) {
                soundEngine.speakDispatcherAck(intent.speechReadback);
              }
              success = true;
            }
          }
          break;
        }

        case 'HANDOFF_MODAL': {
          openHandoffModal(intent.patientId || selectedPatientId || undefined);
          soundEngine.playCommandSuccess();
          if (voiceReadbackEnabled) {
            soundEngine.speakDispatcherAck(intent.speechReadback);
          }
          success = true;
          break;
        }

        case 'PRE_ALERT': {
          if (intent.patientId) {
            sendPreAlertNotice(intent.patientId);
            setSelectedPatientId(intent.patientId);
            soundEngine.playCommandSuccess();
            if (voiceReadbackEnabled) {
              soundEngine.speakDispatcherAck(intent.speechReadback);
            }
            success = true;
          }
          break;
        }

        case 'TOGGLE_SIREN': {
          if (intent.ambulanceId) {
            toggleAmbulanceSiren(intent.ambulanceId);
            soundEngine.playCommandSuccess();
            if (voiceReadbackEnabled) {
              soundEngine.speakDispatcherAck(intent.speechReadback);
            }
            success = true;
          }
          break;
        }

        case 'TOGGLE_PREEMPTION': {
          if (intersections.length > 0) {
            toggleCorridorPreemption(intersections[0].id);
            soundEngine.playCommandSuccess();
            if (voiceReadbackEnabled) {
              soundEngine.speakDispatcherAck(intent.speechReadback);
            }
            success = true;
          }
          break;
        }

        case 'SWITCH_VIEW': {
          if (intent.targetView) {
            setActiveView(intent.targetView);
            soundEngine.playCommandSuccess();
            if (voiceReadbackEnabled) {
              soundEngine.speakDispatcherAck(intent.speechReadback);
            }
            success = true;
          }
          break;
        }

        case 'SIMULATE_BOTTLENECK': {
          simulateCorridorBottleneck();
          soundEngine.playCommandSuccess();
          if (voiceReadbackEnabled) {
            soundEngine.speakDispatcherAck(intent.speechReadback);
          }
          success = true;
          break;
        }

        default: {
          soundEngine.playCommandFail();
          if (voiceReadbackEnabled) {
            soundEngine.speakDispatcherAck('Dispatch standing by. Command unrecognized, repeat radio transmission.');
          }
          setRecentAlert(`VOICE COMMAND UNRECOGNIZED: "${transcript}"`);
          break;
        }
      }

      setLatestVoiceCommand(intent);
      setVoiceLogs((prev) => [
        {
          id: `voice-${Date.now()}`,
          timestamp: nowStr,
          transcript,
          intent,
          status: success ? 'executed' : 'failed',
        },
        ...prev.slice(0, 24),
      ]);

      setIsVoiceProcessing(false);
      return { success, intent };
    },
    [
      ambulances,
      hospitals,
      patients,
      selectedAmbulanceId,
      selectedPatientId,
      rerouteAmbulance,
      completePatientHandoff,
      openHandoffModal,
      sendPreAlertNotice,
      toggleAmbulanceSiren,
      toggleCorridorPreemption,
      simulateCorridorBottleneck,
      intersections,
      voiceReadbackEnabled,
      setActiveView,
    ]
  );

  // Main Simulation Loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const step = simSpeed;

      // 1. Advance ambulances along corridor
      setAmbulances((prevAmbulances) => {
        return prevAmbulances.map((amb) => {
          if (amb.status !== 'en_route_hospital' || !amb.corridorActive) {
            return amb;
          }

          // Progress percentage
          const nextProgress = Math.min(100, amb.progressPct + 0.4 * step);
          const nextEta = Math.max(0, amb.etaSeconds - 1 * step);
          const nextDist = Math.max(0, +(amb.distanceKm - 0.015 * step).toFixed(2));
          const nextSpeed = Math.floor(58 + Math.sin(Date.now() / 3000) * 10);

          // Calculate approximate coords along corridor path
          const corridor = corridors.find((c) => c.id === amb.corridorPathId);
          let newCoords = amb.coords;
          if (corridor && corridor.pathPoints.length >= 2) {
            const numSegments = corridor.pathPoints.length - 1;
            const segmentFloat = (nextProgress / 100) * numSegments;
            const segIndex = Math.min(numSegments - 1, Math.floor(segmentFloat));
            const subProgress = segmentFloat - segIndex;

            const p1 = corridor.pathPoints[segIndex];
            const p2 = corridor.pathPoints[segIndex + 1];
            newCoords = {
              x: +(p1.x + (p2.x - p1.x) * subProgress).toFixed(1),
              y: +(p1.y + (p2.y - p1.y) * subProgress).toFixed(1),
            };
          }

          const hasArrived = nextProgress >= 100;

          return {
            ...amb,
            progressPct: hasArrived ? 100 : nextProgress,
            etaSeconds: nextEta,
            distanceKm: nextDist,
            speedKmh: hasArrived ? 0 : nextSpeed,
            coords: newCoords,
            status: hasArrived ? 'handover_in_progress' : amb.status,
          };
        });
      });

      // 2. Dynamically trigger Preempted Green Waves on intersections
      setIntersections((prevInts) => {
        return prevInts.map((int) => {
          if (int.manualOverride) return int;

          // Find active ambulance on this corridor
          const activeAmb = ambulances.find(
            (a) => a.corridorActive && a.status === 'en_route_hospital'
          );

          if (!activeAmb) return int;

          // Compute distance to this intersection
          const dx = int.coords.x - activeAmb.coords.x;
          const dy = int.coords.y - activeAmb.coords.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // If ambulance is within 18 map units ahead
          if (dist < 18 && int.coords.x >= activeAmb.coords.x - 2) {
            return {
              ...int,
              status: 'PREEMPTED_GREEN',
              crossTrafficState: 'RED',
              timeUntilAmbulancePassSec: Math.max(0, Math.floor(dist * 2.5)),
            };
          } else if (dist >= 18 && dist < 26) {
            return {
              ...int,
              status: 'CLEARING_YELLOW',
              crossTrafficState: 'RED',
            };
          } else {
            return {
              ...int,
              status: 'NORMAL_CYCLE',
              crossTrafficState: 'GREEN',
              timeUntilAmbulancePassSec: 0,
            };
          }
        });
      });

      // 3. Fluctuating Patient Vitals
      setPatients((prevPatients) => {
        return prevPatients.map((pt) => {
          const jitterHr = Math.floor(Math.sin(Date.now() / 4000 + pt.age) * 2);
          const currentHr = Math.max(45, Math.min(180, pt.vitals.hr + jitterHr));

          return {
            ...pt,
            vitals: {
              ...pt.vitals,
              hr: currentHr,
              spo2: Math.max(82, Math.min(100, pt.vitals.spo2 + (Math.random() > 0.85 ? (Math.random() > 0.5 ? 1 : -1) : 0))),
            },
          };
        });
      });

      // 4. Cardiac Monitor Beep on active selected patient
      const now = Date.now();
      const currentPatient = patients.find((p) => p.id === selectedPatientId);
      if (currentPatient && !soundMuted) {
        const beatIntervalMs = (60 / currentPatient.vitals.hr) * 1000;
        if (now - lastBeepTimeRef.current >= beatIntervalMs) {
          lastBeepTimeRef.current = now;
          soundEngine.playHeartBeep(currentPatient.vitals.hr > 120 ? 980 : 880);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, ambulances, corridors, patients, selectedPatientId, soundMuted]);

  // Dynamically compute Predictive Traffic Impact score for each vehicle based on corridor preemption
  const ambulancesWithImpact = useMemo(() => {
    return ambulances.map((amb) => ({
      ...amb,
      predictiveTrafficImpact: calculatePredictiveTrafficImpact(
        amb,
        intersections,
        corridors,
        hospitals,
        groundedCache[amb.id]
      ),
    }));
  }, [ambulances, intersections, corridors, hospitals, groundedCache]);

  return (
    <EmergencyContext.Provider
      value={{
        hospitals,
        ambulances: ambulancesWithImpact,
        patients,
        intersections,
        corridors,
        cadIncidents,
        selectedAmbulanceId,
        selectedPatientId,
        selectedHospitalId,
        activeView,
        isSimulating,
        simSpeed,
        soundMuted,
        recentAlert,
        setSelectedAmbulanceId,
        setSelectedPatientId,
        setSelectedHospitalId,
        setActiveView,
        setIsSimulating,
        setSimSpeed,
        toggleSound,
        toggleCorridorPreemption,
        toggleAmbulanceSiren,
        rerouteAmbulance,
        reserveHospitalBed,
        releaseHospitalBed,
        sendPreAlertNotice,
        signDigitalHandover,
        completePatientHandoff,
        isHandoffModalOpen,
        handoffPatientId,
        openHandoffModal,
        closeHandoffModal,
        addCadIncident,
        resetAmbulanceUnit,
        simulateCorridorBottleneck,
        dispatchAmbulanceToIncident,
        triggerAiTrafficGrounding,
        dismissAlert,
        isVoiceListening,
        isVoxHandsFree,
        isVoiceProcessing,
        isVoiceLayerOpen,
        voiceReadbackEnabled,
        latestVoiceCommand,
        voiceLogs,
        setIsVoiceLayerOpen,
        setVoiceListening,
        toggleVoiceListening,
        toggleVoxHandsFree,
        setVoiceReadbackEnabled,
        clearVoiceLogs,
        executeVoiceTranscript,
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
};
