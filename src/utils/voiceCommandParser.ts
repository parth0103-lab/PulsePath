import {
  Ambulance,
  Hospital,
  Patient,
  VoiceCommandIntent,
  VoiceCommandType,
} from '../types';

interface ParseContext {
  ambulances: Ambulance[];
  hospitals: Hospital[];
  patients: Patient[];
  selectedAmbulanceId?: string | null;
  selectedPatientId?: string | null;
}

/**
 * Normalizes voice transcript text (removes punctuation, lowercase, cleans spacing)
 */
export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Finds an ambulance match by callsign, ID, or colloquial radio alias
 */
export function findAmbulanceMatch(
  query: string,
  ambulances: Ambulance[],
  fallbackId?: string | null
): Ambulance | undefined {
  const norm = normalizeTranscript(query);

  for (const amb of ambulances) {
    const callsignNorm = amb.callsign.toLowerCase();
    const idNorm = amb.id.toLowerCase();

    // Direct matches
    if (norm.includes(callsignNorm) || norm.includes(idNorm)) {
      return amb;
    }

    // Number matching e.g. "als 01", "als 1", "unit 1", "medic 1", "ambulance 1"
    const digits = amb.callsign.replace(/\D/g, '');
    const num = parseInt(digits, 10);
    if (!isNaN(num)) {
      const patterns = [
        `unit ${num}`,
        `unit 0${num}`,
        `medic ${num}`,
        `medic 0${num}`,
        `als ${num}`,
        `als 0${num}`,
        `micu ${num}`,
        `micu 0${num}`,
        `bls ${num}`,
        `ambulance ${num}`,
        `ambulance 0${num}`,
      ];
      for (const p of patterns) {
        if (norm.includes(p)) return amb;
      }
    }

    // MEDEVAC / Helo
    if (amb.type === 'MEDEVAC') {
      if (
        norm.includes('medevac') ||
        norm.includes('helo') ||
        norm.includes('flight') ||
        norm.includes('air ambulance')
      ) {
        return amb;
      }
    }
  }

  // Fallback to currently selected ambulance if query didn't explicitly name another
  if (fallbackId) {
    return ambulances.find((a) => a.id === fallbackId);
  }

  return undefined;
}

/**
 * Finds a hospital match by name, shortName, or landmark aliases
 */
export function findHospitalMatch(
  query: string,
  hospitals: Hospital[]
): Hospital | undefined {
  const norm = normalizeTranscript(query);

  // Exact / partial names
  for (const h of hospitals) {
    const nameNorm = h.name.toLowerCase();
    const shortNorm = h.shortName.toLowerCase();
    if (norm.includes(shortNorm) || norm.includes(nameNorm)) {
      return h;
    }
  }

  // Colloquial emergency designations
  if (
    norm.includes('metro') ||
    norm.includes('general') ||
    norm.includes('downtown') ||
    norm.includes('adult trauma')
  ) {
    return hospitals.find((h) => h.id === 'hosp-metro') || hospitals[0];
  }

  if (
    norm.includes('st jude') ||
    norm.includes('saint jude') ||
    norm.includes('neuro') ||
    norm.includes('stroke') ||
    norm.includes('brainard')
  ) {
    return hospitals.find((h) => h.id === 'hosp-stjude') || hospitals[1];
  }

  if (
    norm.includes('memorial') ||
    norm.includes('peds') ||
    norm.includes('pediatric') ||
    norm.includes('children') ||
    norm.includes('burn')
  ) {
    return hospitals.find((h) => h.id === 'hosp-memorial') || hospitals[2];
  }

  if (
    norm.includes('university') ||
    norm.includes('cardiac') ||
    norm.includes('heart') ||
    norm.includes('vascular') ||
    norm.includes('cath')
  ) {
    return hospitals.find((h) => h.id === 'hosp-univ-cardiac') || hospitals[3];
  }

  return undefined;
}

/**
 * Finds a patient match by name or ID
 */
export function findPatientMatch(
  query: string,
  patients: Patient[],
  fallbackId?: string | null
): Patient | undefined {
  const norm = normalizeTranscript(query);

  for (const pt of patients) {
    const nameNorm = pt.name.toLowerCase();
    const idNorm = pt.id.toLowerCase();
    const first = nameNorm.split(' ')[0];
    const last = nameNorm.split(' ')[1] || '';

    if (
      norm.includes(nameNorm) ||
      norm.includes(idNorm) ||
      (last && norm.includes(last)) ||
      (first.length > 3 && norm.includes(first))
    ) {
      return pt;
    }

    // Number matching e.g. 9014, 9022, 8991
    const digits = pt.id.replace(/\D/g, '');
    if (digits && norm.includes(digits)) {
      return pt;
    }
  }

  if (fallbackId) {
    return patients.find((p) => p.id === fallbackId);
  }

  return undefined;
}

/**
 * Fast client-side dispatcher radio rule parser
 */
export function parseVoiceCommandLocally(
  rawTranscript: string,
  context: ParseContext
): VoiceCommandIntent {
  const norm = normalizeTranscript(rawTranscript);

  // 1. REROUTE AMBULANCE
  // Phrases: "reroute ALS-01 to St. Jude", "divert unit 1 to Metro", "redirect medic 4 to Memorial"
  const rerouteKeywords = ['reroute', 're-route', 'divert', 'redirect', 'route', 'send to'];
  const hasReroute = rerouteKeywords.some((kw) => norm.includes(kw));

  if (hasReroute) {
    // Try to isolate unit and target hospital
    const targetHospital = findHospitalMatch(norm, context.hospitals);
    const targetAmbulance =
      findAmbulanceMatch(norm, context.ambulances, context.selectedAmbulanceId) ||
      context.ambulances[0];

    if (targetHospital && targetAmbulance) {
      return {
        type: 'REROUTE',
        ambulanceId: targetAmbulance.id,
        ambulanceCallsign: targetAmbulance.callsign,
        hospitalId: targetHospital.id,
        hospitalName: targetHospital.shortName,
        confidence: 0.95,
        rawTranscript,
        speechReadback: `Copy dispatch. Unit ${targetAmbulance.callsign} rerouted to ${targetHospital.shortName}. Preemption feeder corridor switched.`,
        statusMessage: `Rerouted ${targetAmbulance.callsign} → ${targetHospital.shortName}`,
      };
    }
  }

  // 2. COMPLETE PATIENT HANDOFF
  // Phrases: "complete handoff for Arthur Sterling", "transfer patient Elena Rostova", "sign handoff for PT-9014", "hand off patient Marcus Chen"
  const handoffCompleteKeywords = [
    'complete handoff',
    'finish handoff',
    'confirm handoff',
    'sign handoff',
    'sign handover',
    'complete handover',
    'hand off patient',
    'handoff patient',
    'transfer patient',
    'transfer of care complete',
    'deliver patient',
  ];
  const hasHandoffComplete = handoffCompleteKeywords.some((kw) => norm.includes(kw));

  if (hasHandoffComplete) {
    // Check if a patient was named
    let patient = findPatientMatch(norm, context.patients, context.selectedPatientId);

    // If no direct patient match, check if an ambulance was named whose patient we can handoff
    if (!patient) {
      const amb = findAmbulanceMatch(norm, context.ambulances);
      if (amb && amb.patientId) {
        patient = context.patients.find((p) => p.id === amb.patientId);
      }
    }

    if (!patient) {
      patient = context.patients[0];
    }

    if (patient) {
      const targetHospital = context.hospitals.find(
        (h) => h.id === patient?.assignedHospitalId
      );
      return {
        type: 'HANDOFF_COMPLETE',
        patientId: patient.id,
        patientName: patient.name,
        hospitalId: patient.assignedHospitalId,
        hospitalName: targetHospital?.shortName || 'Target Hospital',
        confidence: 0.96,
        rawTranscript,
        speechReadback: `Copy dispatch. Transfer of care confirmed for ${patient.name}. Emergency bed disposition locked.`,
        statusMessage: `Patient Handoff Executed: ${patient.name}`,
      };
    }
  }

  // 3. OPEN PATIENT HANDOFF MODAL / PROTOCOL
  // Phrases: "open handoff modal", "initiate handoff protocol", "open handoff for Arthur Sterling"
  if (
    norm.includes('open handoff') ||
    norm.includes('initiate handoff') ||
    norm.includes('launch handoff') ||
    norm.includes('show handoff') ||
    norm.includes('handoff protocol')
  ) {
    const patient =
      findPatientMatch(norm, context.patients, context.selectedPatientId) ||
      context.patients[0];
    return {
      type: 'HANDOFF_MODAL',
      patientId: patient?.id,
      patientName: patient?.name,
      confidence: 0.9,
      rawTranscript,
      speechReadback: `Opening patient handoff protocol for ${patient?.name || 'unit'}.`,
      statusMessage: `Opened Handoff Protocol: ${patient?.name || 'Patient'}`,
    };
  }

  // 4. SEND PRE-ALERT TO HOSPITAL
  // Phrases: "send pre-alert for Arthur Sterling", "notify hospital", "issue pre-alert"
  if (
    norm.includes('pre alert') ||
    norm.includes('prealert') ||
    norm.includes('pre-alert') ||
    norm.includes('notify hospital')
  ) {
    const patient =
      findPatientMatch(norm, context.patients, context.selectedPatientId) ||
      context.patients[0];
    return {
      type: 'PRE_ALERT',
      patientId: patient?.id,
      patientName: patient?.name,
      confidence: 0.92,
      rawTranscript,
      speechReadback: `Pre-alert transmitted to receiving emergency trauma team for ${patient?.name}.`,
      statusMessage: `Pre-Alert Dispatched: ${patient?.name}`,
    };
  }

  // 5. SIREN CONTROL
  if (norm.includes('siren') || norm.includes('emergency lights')) {
    const amb =
      findAmbulanceMatch(norm, context.ambulances, context.selectedAmbulanceId) ||
      context.ambulances[0];
    return {
      type: 'TOGGLE_SIREN',
      ambulanceId: amb.id,
      ambulanceCallsign: amb.callsign,
      confidence: 0.88,
      rawTranscript,
      speechReadback: `Audible siren state toggled for ${amb.callsign}.`,
      statusMessage: `Toggled Siren: ${amb.callsign}`,
    };
  }

  // 6. SIGNAL PREEMPTION
  if (
    norm.includes('preempt') ||
    norm.includes('green wave') ||
    norm.includes('clear corridor') ||
    norm.includes('clear signals')
  ) {
    return {
      type: 'TOGGLE_PREEMPTION',
      confidence: 0.85,
      rawTranscript,
      speechReadback: 'Signal preemption cycle pulsed for active emergency arterial corridor.',
      statusMessage: 'Corridor Traffic Signal Preemption Toggled',
    };
  }

  // 7. SWITCH VIEW / NAVIGATION
  if (
    norm.includes('switch to') ||
    norm.includes('show') ||
    norm.includes('open') ||
    norm.includes('view') ||
    norm.includes('navigate to')
  ) {
    let targetView: VoiceCommandIntent['targetView'] = undefined;
    let viewLabel = '';

    if (norm.includes('corridor') || norm.includes('radar') || norm.includes('map')) {
      targetView = 'corridor';
      viewLabel = 'Corridor Radar';
    } else if (norm.includes('fleet') || norm.includes('ambulances') || norm.includes('units')) {
      targetView = 'fleet';
      viewLabel = 'Fleet Radar';
    } else if (norm.includes('triage') || norm.includes('bed') || norm.includes('matrix')) {
      targetView = 'triage';
      viewLabel = 'Bed Triage Matrix';
    } else if (norm.includes('telemetry') || norm.includes('vitals') || norm.includes('patient')) {
      targetView = 'telemetry';
      viewLabel = 'Patient Telemetry';
    } else if (norm.includes('dispatch') || norm.includes('cad') || norm.includes('incidents')) {
      targetView = 'dispatch';
      viewLabel = 'CAD Dispatch';
    } else if (norm.includes('overview') || norm.includes('command') || norm.includes('home')) {
      targetView = 'overview';
      viewLabel = 'Live Command Overview';
    }

    if (targetView) {
      return {
        type: 'SWITCH_VIEW',
        targetView,
        confidence: 0.95,
        rawTranscript,
        speechReadback: `Switching display to ${viewLabel}.`,
        statusMessage: `Navigated to ${viewLabel}`,
      };
    }
  }

  // 8. SIMULATE BOTTLENECK
  if (norm.includes('bottleneck') || norm.includes('congestion') || norm.includes('traffic delay')) {
    return {
      type: 'SIMULATE_BOTTLENECK',
      confidence: 0.88,
      rawTranscript,
      speechReadback: 'Simulating arterial congestion bottleneck on active corridor.',
      statusMessage: 'Corridor Bottleneck Injected',
    };
  }

  // UNKNOWN OR AMBIGUOUS
  return {
    type: 'UNKNOWN',
    confidence: 0.2,
    rawTranscript,
    speechReadback: 'Dispatch standing by. Command unrecognized. Please restate unit or action.',
    statusMessage: `Unrecognized radio command: "${rawTranscript}"`,
  };
}

/**
 * Enhanced parser that queries Gemini 3.8 Flash backend endpoint when client parsing is ambiguous
 */
export async function parseVoiceCommandWithAi(
  rawTranscript: string,
  context: ParseContext
): Promise<VoiceCommandIntent> {
  const localResult = parseVoiceCommandLocally(rawTranscript, context);

  // If local parser was confident (>0.8), return immediately to avoid network latency
  if (localResult.type !== 'UNKNOWN' && localResult.confidence >= 0.8) {
    return localResult;
  }

  // Otherwise, query Gemini 3.8 Flash backend parser
  try {
    const res = await fetch('/api/voice-dispatch-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawTranscript,
        context: {
          ambulances: context.ambulances.map((a) => ({
            id: a.id,
            callsign: a.callsign,
            assignedHospitalId: a.assignedHospitalId,
            patientId: a.patientId,
          })),
          hospitals: context.hospitals.map((h) => ({
            id: h.id,
            name: h.name,
            shortName: h.shortName,
          })),
          patients: context.patients.map((p) => ({
            id: p.id,
            name: p.name,
            assignedHospitalId: p.assignedHospitalId,
          })),
          selectedAmbulanceId: context.selectedAmbulanceId,
          selectedPatientId: context.selectedPatientId,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.intent) {
        return data.intent as VoiceCommandIntent;
      }
    }
  } catch (err) {
    console.warn('AI voice parsing fallback error, using local parsing:', err);
  }

  return localResult;
}
