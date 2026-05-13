import { createGroq } from '@ai-sdk/groq';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { auditThreatToStellar } from '@/lib/stellar-ledger';

// 1. Initialize Groq (Free Tier)
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const FLEET_DB = path.join(process.cwd(), 'data', 'fleet.json');
export const maxDuration = 60; // Set timeout for API route

// Helper: Read/Write Fleet DB
function readFleet() {
  return JSON.parse(fs.readFileSync(FLEET_DB, 'utf-8'));
}
function writeFleet(data: any) {
  fs.writeFileSync(FLEET_DB, JSON.stringify(data, null, 2));
}

export async function POST(req: Request) {
  try {
    const {
      rawImageUrl,
      lat: requestLat,
      lng: requestLng,
      realThreat,
      threatLevel: requestThreatLevel,
      environmentalData
    } = await req.json();

    const latValue = Number(requestLat);
    const lngValue = Number(requestLng);
    
    // We now use the REAL threat identified by the frontend's call to your Python YOLO script!
    const detectedThreat = realThreat || "Unknown Threat";

    // 2. The Agentic Brain Setup
    let ledgerAudit: any = null;

    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      maxSteps: 5,
      system: `You are A.I.R. COMMANDER, an autonomous tactical AI for the Indian Navy's MarEye defense system.
You have received a raw feed at coordinates [${latValue}, ${lngValue}].
CURRENT ENVIRONMENTAL DATA: ${environmentalData || "Unknown"}

You MUST execute your tools in this EXACT sequence:
1. 'enhanceFeed' to acknowledge CNN processing.
2. 'analyzeThreat' to acknowledge YOLO processing.
3. If a threat is found, 'executeManeuver' to move the nearest ship.
4. 'auditToLedger' to log the decision to the blockchain.

CRITICAL: In your final report, you MUST explain how the current weather/sea state influenced your tactical decision.`,

      prompt: `New raw feed received from ${rawImageUrl}. Begin investigation.`,
      
      // 3. Define the AI's Tools
      tools: {
        enhanceFeed: tool({
          description: 'Acknowledge CNN processing.',
          parameters: z.object({ imageUrl: z.string() }),
          execute: async ({ imageUrl }) => {
            console.log(`[AI AGENT] Acknowledging CNN feed: ${imageUrl}`);
            return { success: true, status: "Analyzed by Neural Network" };
          },
        }),

        analyzeThreat: tool({
          description: 'Acknowledge YOLO threat detection results.',
          parameters: z.object({ enhancedImageUrl: z.string() }),
          execute: async ({ enhancedImageUrl }) => {
            console.log(`[AI AGENT] Acknowledging YOLO threat on: ${enhancedImageUrl}`);
            return {
              success: true,
              threatDetected: true,
              threatClass: detectedThreat,
              coordinates: { lat: latValue, lng: lngValue }
            };
          },
        }),

        executeManeuver: tool({
          description: 'Updates the fleet.json database to plot the threat and autonomously divert the nearest ship.',
          parameters: z.object({
            threatClass: z.string(),
            lat: z.number(),
            lng: z.number(),
          }),
          execute: async ({ threatClass, lat, lng }) => {
            console.log(`[AI AGENT] Executing maneuver for threat: ${threatClass}`);
            const db = readFleet();
            
            db.active_threats = [{
              id: `THREAT-${Date.now()}`,
              classification: threatClass,
              lat,
              lng,
              detected_at: new Date().toISOString(),
            }];

            const vesselIdx = db.vessels.findIndex((v: any) => v.name === "INS Vikrant");
            if (vesselIdx !== -1) {
              db.vessels[vesselIdx].status = "DIVERTED";
              db.vessels[vesselIdx].lat = lat > 0 ? db.vessels[vesselIdx].lat - 1.5 : db.vessels[vesselIdx].lat + 1.5;
              db.vessels[vesselIdx].lng = lng > 0 ? db.vessels[vesselIdx].lng - 1.5 : db.vessels[vesselIdx].lng + 1.5;
            }
            writeFleet(db);

            return {
              success: true,
              maneuver: "Nearest vessel diverted to evasive coordinates.",
              mapUpdated: true
            };
          },
        }),

        auditToLedger: tool({
          description: 'Calls the Stellar blockchain client to log the AI decision immutably.',
          parameters: z.object({
            threatClass: z.string(),
            actionTaken: z.string(),
            lat: z.number().optional(),
            lng: z.number().optional(),
            threatLevel: z.string().optional(),
          }),
          execute: async ({ threatClass, actionTaken, lat, lng, threatLevel }) => {
            console.log(`[AI AGENT] Auditing to Stellar Blockchain...`);
            const resolvedLat = typeof lat === 'number' ? lat : latValue;
            const resolvedLng = typeof lng === 'number' ? lng : lngValue;

            const auditResult = await auditThreatToStellar({
              threatClass,
              actionTaken,
              lat: Number.isFinite(resolvedLat) ? resolvedLat : 0,
              lng: Number.isFinite(resolvedLng) ? resolvedLng : 0,
              threatLevel: threatLevel ?? (typeof requestThreatLevel === 'string' ? requestThreatLevel : 'UNKNOWN'),
            });

            ledgerAudit = auditResult;
            return auditResult;
          },
        }),
      },
    });

    if (!ledgerAudit) {
      ledgerAudit = await auditThreatToStellar({
        threatClass: detectedThreat,
        actionTaken: 'Diverted nearest ship',
        lat: Number.isFinite(latValue) ? latValue : 0,
        lng: Number.isFinite(lngValue) ? lngValue : 0,
        threatLevel: typeof requestThreatLevel === 'string' ? requestThreatLevel : 'UNKNOWN',
      })
    }

    return new Response(
      JSON.stringify({
        response: result.text,
        stepsTaken: result.steps.length,
        ledgerAudit,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Agent Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
