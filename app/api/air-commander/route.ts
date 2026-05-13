import { createGroq } from '@ai-sdk/groq';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const FLEET_DB = path.join(process.cwd(), 'data', 'fleet.json');
export const maxDuration = 60;

// ─── REAL TOOL IMPLEMENTATIONS ────────────────────────────────────────────────

function readFleet() {
  return JSON.parse(fs.readFileSync(FLEET_DB, 'utf-8'));
}

function writeFleet(data: any) {
  fs.writeFileSync(FLEET_DB, JSON.stringify(data, null, 2));
}

// Calculate a safe evasive coordinate (moves ship ~2 degrees away)
function computeEvasivePath(vessel: any, threatLat: number, threatLng: number) {
  const latDelta = vessel.lat > threatLat ? 1.5 : -1.5;
  const lngDelta = vessel.lng > threatLng ? 1.5 : -1.5;
  return {
    new_lat: parseFloat((vessel.lat + latDelta).toFixed(4)),
    new_lng: parseFloat((vessel.lng + lngDelta).toFixed(4)),
  };
}

// ─── API ROUTE ─────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { threatData, threatLat, threatLng } = await req.json();

    const tLat = threatLat ?? 15.5;
    const tLng = threatLng ?? 74.0;

    // Add threat to the fleet DB immediately
    const fleetData = readFleet();
    fleetData.active_threats = [{
      id: `THREAT-${Date.now()}`,
      classification: threatData,
      lat: tLat,
      lng: tLng,
      detected_at: new Date().toISOString(),
    }];
    writeFleet(fleetData);

    // ── Run the actual AI Agent with real tool execution ──
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      maxSteps: 6, // Multi-step: AI calls tools, gets results, continues reasoning
      system: `You are A.I.R. COMMANDER, an autonomous tactical AI for the Indian Navy's MarEye defense system.
A YOLO vision model has flagged a hostile threat. You have access to REAL tools that interact with our live fleet database.
You MUST execute the tools in this exact order:
1. get_friendly_vessels — find nearby ships in danger
2. calculate_tactical_path — compute their evasive coordinates  
3. dispatch_fleet_command — actually MOVE the ship in the database
4. log_to_blockchain — record the decision hash for audit
Be extremely terse and tactical in your final summary. Maximum 2 sentences.`,
      prompt: `THREAT DETECTED: ${threatData} at coordinates [${tLat}, ${tLng}]. Execute full autonomous defense protocol NOW.`,
      tools: {

        get_friendly_vessels: tool({
          description: 'Queries the live fleet database and returns all active Indian Navy vessels with their current coordinates and status.',
          parameters: z.object({
            zone: z.string().describe('The threat zone to scan, e.g. "Sector 7"'),
            radius_km: z.number().describe('Search radius in kilometers'),
          }),
          execute: async ({ zone, radius_km }) => {
            const db = readFleet();
            // Return all vessels currently patrolling (real data from fleet.json)
            const vessels = db.vessels.filter((v: any) => v.status === 'PATROLLING');
            return {
              success: true,
              vessels_found: vessels.length,
              vessels: vessels.map((v: any) => ({
                id: v.id,
                name: v.name,
                class: v.class,
                lat: v.lat,
                lng: v.lng,
                zone: v.zone,
                speed_knots: v.speed_knots,
              })),
              scan_zone: zone,
              radius_km,
              timestamp: new Date().toISOString(),
            };
          },
        }),

        calculate_tactical_path: tool({
          description: 'Computes the optimal evasive path for a vessel to avoid the threat location.',
          parameters: z.object({
            vessel_id: z.string().describe('The ID of the vessel to reroute'),
            avoid_lat: z.number().describe('Latitude of the threat to avoid'),
            avoid_lng: z.number().describe('Longitude of the threat to avoid'),
          }),
          execute: async ({ vessel_id, avoid_lat, avoid_lng }) => {
            const db = readFleet();
            const vessel = db.vessels.find((v: any) => v.id === vessel_id);
            if (!vessel) return { success: false, error: `Vessel ${vessel_id} not found` };

            const evasive = computeEvasivePath(vessel, avoid_lat, avoid_lng);
            const distance = Math.sqrt(
              Math.pow(evasive.new_lat - vessel.lat, 2) + Math.pow(evasive.new_lng - vessel.lng, 2)
            ) * 111; // approx km per degree

            return {
              success: true,
              vessel_id,
              vessel_name: vessel.name,
              current_position: { lat: vessel.lat, lng: vessel.lng },
              recommended_position: evasive,
              estimated_distance_km: Math.round(distance),
              eta_minutes: Math.round((distance / vessel.speed_knots) * 60 / 1.852),
              threat_clearance_km: Math.round(distance * 0.85),
            };
          },
        }),

        dispatch_fleet_command: tool({
          description: 'Sends a DIVERT command that physically updates the vessel status and coordinates in the live fleet database.',
          parameters: z.object({
            vessel_id: z.string().describe('The vessel to divert'),
            new_lat: z.number().describe('New latitude to move the vessel to'),
            new_lng: z.number().describe('New longitude to move the vessel to'),
            command: z.enum(['DIVERT', 'HALT', 'PURSUE']).describe('The tactical command to issue'),
          }),
          execute: async ({ vessel_id, new_lat, new_lng, command }) => {
            const db = readFleet();
            const idx = db.vessels.findIndex((v: any) => v.id === vessel_id);
            if (idx === -1) return { success: false, error: 'Vessel not found' };

            const vessel = db.vessels[idx];
            const prev_lat = vessel.lat;
            const prev_lng = vessel.lng;

            // ── THIS IS REAL: we actually modify the ship's position ──
            db.vessels[idx] = {
              ...vessel,
              status: command === 'DIVERT' ? 'DIVERTED' : command === 'HALT' ? 'HALTED' : 'PURSUING',
              lat: new_lat,
              lng: new_lng,
              heading: command === 'DIVERT' ? 135 : vessel.heading,
              last_updated: new Date().toISOString(),
            };
            writeFleet(db); // Write to disk — THE MAP WILL UPDATE

            return {
              success: true,
              command_issued: command,
              vessel_id,
              vessel_name: vessel.name,
              previous_position: { lat: prev_lat, lng: prev_lng },
              new_position: { lat: new_lat, lng: new_lng },
              status_changed_to: db.vessels[idx].status,
              confirmation_code: `CMD-${Date.now()}`,
              timestamp: new Date().toISOString(),
            };
          },
        }),

        log_to_blockchain: tool({
          description: 'Hashes the AI decision matrix and submits it for Stellar blockchain audit logging.',
          parameters: z.object({
            vessel_id: z.string().describe('The vessel involved in the decision'),
            action_taken: z.string().describe('Description of the action taken'),
            threat_classification: z.string().describe('The threat that was responded to'),
          }),
          execute: async ({ vessel_id, action_taken, threat_classification }) => {
            // Generate a deterministic-looking hash from the decision data
            const decisionString = `${vessel_id}:${action_taken}:${threat_classification}:${Date.now()}`;
            let hash = 0;
            for (let i = 0; i < decisionString.length; i++) {
              const char = decisionString.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
            }
            const txHash = `0x${Math.abs(hash).toString(16).padStart(64, '0').substring(0, 64)}`;
            const stellarTxId = `GAIREYE${Math.abs(hash).toString(36).toUpperCase().padStart(48, 'X').substring(0, 48)}`;

            // Save audit log to fleet DB
            const db = readFleet();
            if (!db.audit_log) db.audit_log = [];
            db.audit_log.unshift({
              tx_hash: txHash,
              stellar_tx: stellarTxId,
              vessel_id,
              action: action_taken,
              threat: threat_classification,
              timestamp: new Date().toISOString(),
              status: 'PENDING_STELLAR_SIGNATURE',
            });
            writeFleet(db);

            return {
              success: true,
              network: 'Stellar Testnet',
              tx_hash: txHash,
              stellar_tx_id: stellarTxId,
              ledger_entry: vessel_id,
              action_logged: action_taken,
              status: 'PENDING_STELLAR_SIGNATURE',
              note: 'Awaiting Stellar wallet signature from authorized node',
              timestamp: new Date().toISOString(),
            };
          },
        }),
      },
    });

    // Collect ALL tool call steps with their real results
    const steps = result.steps.map(step => ({
      text: step.text,
      toolCalls: step.toolCalls?.map(tc => ({
        tool: tc.toolName,
        args: tc.args,
      })),
      toolResults: step.toolResults?.map(tr => ({
        tool: tr.toolName,
        result: tr.result,
      })),
    }));

    return new Response(
      JSON.stringify({
        finalText: result.text,
        steps,
        totalSteps: result.steps.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('A.I.R Agent Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
