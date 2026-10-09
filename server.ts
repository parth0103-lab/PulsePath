import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize GoogleGenAI server-side with process.env.GEMINI_API_KEY
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!ai,
  });
});

// Grounded Corridor & Traffic Prediction Endpoint using Gemini 3.8 Flash + googleMaps
app.post('/api/traffic-predict-grounding', async (req: Request, res: Response) => {
  try {
    const {
      callsign,
      type,
      corridorName,
      targetHospitalName,
      targetHospitalAddress,
      intersectionsCount,
      preemptedCount,
      distanceKm,
      etaSeconds,
      corridorActive,
      coordinates,
    } = req.body;

    const lat = coordinates?.lat || 37.7749;
    const lng = coordinates?.lng || -122.4194;

    // Default fallback grounding data
    let groundedResponse: {
      summary: string;
      groundingLinks: Array<{ title: string; uri: string; snippet?: string }>;
      trafficFlowScore: number;
      rerouteViability: string;
      delayAvoidedMins: string;
    } = {
      summary: `Corridor preemption active for ${callsign || 'Unit'}. ${preemptedCount || 0} of ${intersectionsCount || 0} intersections holding preempted green wave toward ${targetHospitalName || 'Metro Medical'}. Transit impedance minimized by 74%.`,
      groundingLinks: [
        {
          title: `${targetHospitalName || 'Metro General Trauma Center'} Emergency Bay`,
          uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(targetHospitalName || 'Trauma Center Hospital')}`,
          snippet: 'Designated emergency vehicle bay entrance with priority signal approach.',
        },
        {
          title: `${corridorName || 'Metropolitan Emergency Arterial'} Corridor`,
          uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(corridorName || 'Emergency Transit Corridor')}`,
          snippet: 'Preempted arterial route equipped with Traffic Signal Preemption System (TSPS).',
        },
      ],
      trafficFlowScore: Math.round(
        corridorActive ? 75 + Math.min(24, ((preemptedCount || 1) / Math.max(1, intersectionsCount || 1)) * 25) : 38
      ),
      rerouteViability: preemptedCount < intersectionsCount ? 'CONSIDER_ALTERNATE' : 'HOLD_CURRENT',
      delayAvoidedMins: ((((preemptedCount || 2) * 45) / 60)).toFixed(1),
    };

    if (ai) {
      try {
        const prompt = `You are a city-wide Emergency Medical Services (EMS) Traffic Preemption and CAD Dispatch AI Specialist.
Analyze the predictive traffic impact and rerouting options for:
- Ambulance Unit: ${callsign} (${type || 'ALS'})
- Current Active Corridor: ${corridorName}
- Target Hospital: ${targetHospitalName} (${targetHospitalAddress || 'Downtown'})
- Distance: ${distanceKm || '3.5'} km | ETA: ${Math.round((etaSeconds || 240) / 60)} mins
- Corridor Preemption Status: ${corridorActive ? 'ACTIVE PREEMPTION' : 'NORMAL / UNPREEMPTED'}
- Traffic Intersections on Path: ${intersectionsCount || 4} total (${preemptedCount || 0} preempted green)

Provide a sharp, tactical 2-3 sentence assessment of:
1. Expected cross-street bottleneck risk along the arterial corridor.
2. Estimated travel time difference achieved by signal preemption.
3. Concrete dispatcher advice regarding whether to maintain current corridor route or reroute to an alternate feeder artery.
Mention relevant hospitals, trauma bays, and avenues.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            tools: [{ googleMaps: {} }],
            toolConfig: {
              retrievalConfig: {
                latLng: {
                  latitude: lat,
                  longitude: lng,
                },
              },
            },
          },
        });

        const textOutput = response.text || '';
        
        // Extract Google Maps Grounding Links from candidate groundingMetadata
        const extractedLinks: Array<{ title: string; uri: string; snippet?: string }> = [];
        const candidate = response.candidates?.[0];
        const groundingChunks = (candidate as any)?.groundingMetadata?.groundingChunks;

        if (Array.isArray(groundingChunks)) {
          for (const chunk of groundingChunks) {
            if (chunk.maps) {
              extractedLinks.push({
                title: chunk.maps.title || 'Google Maps Location',
                uri: chunk.maps.uri || `https://maps.google.com/?q=${encodeURIComponent(chunk.maps.title || 'Emergency Corridor')}`,
                snippet: chunk.maps.placeAnswerSources?.reviewSnippets?.[0] || 'Verified Maps geographic reference point',
              });
            } else if (chunk.web) {
              extractedLinks.push({
                title: chunk.web.title || 'Web Grounding Reference',
                uri: chunk.web.uri,
                snippet: 'Online route reference',
              });
            }
          }
        }

        // Always ensure at least the destination hospital and corridor have direct Google Maps links
        if (extractedLinks.length === 0) {
          extractedLinks.push({
            title: `${targetHospitalName || 'Hospital'} Navigation Point`,
            uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(targetHospitalName || 'Hospital')}`,
            snippet: 'Hospital Emergency Receiving Bay entrance',
          });
          extractedLinks.push({
            title: `${corridorName || 'Route'} Corridor Navigation`,
            uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(corridorName || 'Transit Route')}`,
            snippet: 'Active Preemption Arterial',
          });
        }

        groundedResponse = {
          summary: textOutput.trim(),
          groundingLinks: extractedLinks,
          trafficFlowScore: Math.round(
            corridorActive ? 75 + Math.min(24, ((preemptedCount || 1) / Math.max(1, intersectionsCount || 1)) * 25) : 38
          ),
          rerouteViability: preemptedCount < intersectionsCount ? 'CONSIDER_ALTERNATE' : 'HOLD_CURRENT',
          delayAvoidedMins: ((((preemptedCount || 2) * 50) / 60)).toFixed(1),
        };
      } catch (geminiErr) {
        console.warn('Gemini Maps Grounding warning, using tactical prediction engine:', geminiErr);
      }
    }

    res.json({
      success: true,
      data: groundedResponse,
    });
  } catch (error: any) {
    console.error('Error generating traffic impact prediction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Voice-to-Text Dispatch Intelligence Endpoint using Gemini 3.8 Flash
app.post('/api/voice-dispatch-parse', async (req: Request, res: Response) => {
  try {
    const { rawTranscript, context } = req.body;
    if (!rawTranscript || typeof rawTranscript !== 'string') {
      return res.status(400).json({ success: false, error: 'rawTranscript is required' });
    }

    if (!ai) {
      return res.json({
        success: false,
        message: 'Gemini API not configured, using local parser',
      });
    }

    const prompt = `You are a 911 Emergency Medical Services (EMS) Dispatch Computer Aided Dispatch (CAD) voice command processor.
A dispatcher spoke the following radio command to keep their hands free for radio communications:
"${rawTranscript}"

Operational Fleet & Medical Context:
- Ambulances: ${JSON.stringify(context?.ambulances || [])}
- Hospitals: ${JSON.stringify(context?.hospitals || [])}
- In-transit Patients: ${JSON.stringify(context?.patients || [])}
- Currently Selected Ambulance: ${context?.selectedAmbulanceId || 'none'}
- Currently Selected Patient: ${context?.selectedPatientId || 'none'}

Analyze the voice transmission and return ONLY a valid JSON object (no markdown, no backticks, no conversational text) conforming to this schema:
{
  "type": "REROUTE" | "HANDOFF_COMPLETE" | "HANDOFF_MODAL" | "PRE_ALERT" | "TOGGLE_SIREN" | "TOGGLE_PREEMPTION" | "SWITCH_VIEW" | "SIMULATE_BOTTLENECK" | "UNKNOWN",
  "ambulanceId": "matching ambulance id (e.g. 'amb-als-01') or null",
  "ambulanceCallsign": "matching callsign (e.g. 'ALS-01') or null",
  "hospitalId": "matching hospital id (e.g. 'hosp-stjude') or null",
  "hospitalName": "matching hospital short name or null",
  "patientId": "matching patient id (e.g. 'PT-9014') or null",
  "patientName": "patient full name or null",
  "targetView": "overview" | "corridor" | "fleet" | "triage" | "telemetry" | "dispatch" | null,
  "confidence": number between 0.0 and 1.0,
  "speechReadback": "Realistic 1-sentence tactical dispatcher radio readback acknowledgment (e.g. 'Copy dispatch, Unit ALS-01 redirected to St. Jude Neuro Center.')",
  "statusMessage": "Short tactical status string (e.g. 'Rerouted ALS-01 → St. Jude Neuro')"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const textOutput = response.text || '{}';
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(textOutput);
    } catch {
      const match = textOutput.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      }
    }

    parsedData.rawTranscript = rawTranscript;

    res.json({
      success: true,
      intent: parsedData,
    });
  } catch (error: any) {
    console.error('Error in /api/voice-dispatch-parse:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal voice parsing error',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`PulsePath Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
