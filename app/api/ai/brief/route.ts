import { generateGroqResponse } from "@/lib/groq-client";
import { NextResponse } from "next/server";

const BRIEF_PROMPT = `
You are 'NAV-INTEL-SENTINEL', a strategic naval intelligence fusion agent for the Indian Navy.
Your goal is to provide the 'Bottom Line Up Front' (BLUF) to a Commanding Officer.

CONTEXT TO PROCESS:
1. Live Weather/Marine conditions (Wave heights, wind).
2. Threat Levels (Geopolitical risk, Piracy index).
3. Recent Detections (YOLO outputs).
4. Comm Intercepts (SIGINT).

RULES:
- Be extremely professional, concise, and authoritative.
- Maximum 2 sentences.
- Focus on the ACTIONABLE relationship between factors. 
- Example: "Environmental conditions (3.2m swells) at Arabian Sea currently limit small-craft piracy mobility; maintain standard surveillance of Chokepoint Alpha."
- Example: "YOLO detection of unidentified drone at Sector 7 correlates with recent SIGINT chatter; scramble Swarm Alpha for perimeter verification."

Do NOT use conversational filler. Start immediately.
`;

export async function POST(req: Request) {
  try {
    const { zoneData, detections, intercepts, missionStats } = await req.json();

    const context = `
ZONE: ${zoneData?.name || "Unknown"}
SEA STATE: Wave Height ${zoneData?.marine?.wave_height}m, Wind ${zoneData?.weather?.wind_speed}km/h
INTEL: Threat Score ${zoneData?.threatLevel}%, Piracy Index ${zoneData?.piracyIndex}/10
DETECTIONS: ${detections || "None"}
INTERCEPTS: ${intercepts || "None"}
MISSION MISSION STATS: ${missionStats || "Normal ops"}
    `.trim();

    const response = await generateGroqResponse(context, BRIEF_PROMPT);

    return NextResponse.json({ brief: response });
  } catch (error: any) {
    console.error("Fusion Brief Error:", error);
    return NextResponse.json(
      { error: "Failed to generate briefing: " + error.message },
      { status: 500 },
    );
  }
}
