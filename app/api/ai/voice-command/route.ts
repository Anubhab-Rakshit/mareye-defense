import { NextRequest, NextResponse } from "next/server";
import { generateGroqResponse } from "@/lib/groq-client";

// Fetch all platform data to build context
async function gatherPlatformIntelligence(baseUrl: string) {
  const sections: string[] = [];

  // 1. Intelligence data (real-time maritime)
  try {
    const res = await fetch(`${baseUrl}/api/intelligence`, {
      cache: "no-store",
    });
    if (res.ok) {
      const intel = await res.json();
      sections.push(`=== REAL-TIME MARITIME INTELLIGENCE ===`);
      sections.push(`Timestamp: ${intel.timestamp}`);
      sections.push(`Total Zones Monitored: ${intel.summary?.totalZones || 0}`);
      sections.push(`Average Threat Level: ${intel.summary?.avgThreat || 0}%`);
      sections.push(`Critical Zones: ${intel.summary?.criticalZones || 0}`);
      sections.push(`High Threat Zones: ${intel.summary?.highZones || 0}`);
      sections.push(
        `Fleet Readiness: ${intel.summary?.overallReadiness || 0}%`,
      );

      if (intel.zones) {
        for (const zone of intel.zones) {
          sections.push(
            `\nZone: ${zone.name} (${zone.command}, HQ: ${zone.hq})`,
          );
          sections.push(`  Coordinates: ${zone.lat}°N, ${zone.lon}°E`);
          sections.push(
            `  Threat: ${zone.threat?.category} (${zone.threat?.level}%)`,
          );
          if (zone.marine?.current) {
            sections.push(`  Wave Height: ${zone.marine.current.wave_height}m`);
            sections.push(`  Swell: ${zone.marine.current.swell_wave_height}m`);
          }
          if (zone.weather?.current) {
            sections.push(
              `  Temperature: ${zone.weather.current.temperature_2m}°C`,
            );
            sections.push(
              `  Wind: ${zone.weather.current.wind_speed_10m} km/h, Gusts: ${zone.weather.current.wind_gusts_10m} km/h`,
            );
            sections.push(
              `  Cloud Cover: ${zone.weather.current.cloud_cover}%`,
            );
            sections.push(
              `  Visibility: ${(zone.weather?.hourly?.visibility?.[0] || 0) / 1000} km`,
            );
          }
          if (zone.threat?.factors) {
            sections.push(`  Threat Factors:`);
            for (const f of zone.threat.factors) {
              sections.push(`    - ${f.name}: ${f.score} — ${f.detail}`);
            }
          }
          if (zone.ops) {
            const ready = zone.ops.filter((o: any) => o.ready).length;
            sections.push(`  Ops Ready: ${ready}/${zone.ops.length}`);
            for (const op of zone.ops) {
              sections.push(
                `    - ${op.operation}: ${op.status} (${Math.round(op.confidence)}% confidence) — ${op.conditions}`,
              );
            }
          }
        }
      }

      if (intel.brief) {
        sections.push(`\n=== AI INTELLIGENCE BRIEF ===`);
        sections.push(intel.brief);
      }
    }
  } catch (e) {
    sections.push(`[Intelligence data unavailable]`);
  }

  // 2. Detection/threat history
  try {
    const res = await fetch(`${baseUrl}/api/history`, { cache: "no-store" });
    if (res.ok) {
      const history = await res.json();
      if (history.detections && history.detections.length > 0) {
        sections.push(`\n=== DETECTION HISTORY ===`);
        sections.push(`Total Scans Recorded: ${history.detections.length}`);
        let totalThreats = 0;
        let criticalCount = 0;
        const classCounts: Record<string, number> = {};
        for (const det of history.detections) {
          totalThreats += det.totalObjects || 0;
          if (
            det.overallThreatLevel === "CRITICAL" ||
            det.overallThreatLevel === "HIGH"
          )
            criticalCount++;
          if (det.detections) {
            for (const d of det.detections) {
              classCounts[d.class] = (classCounts[d.class] || 0) + 1;
            }
          }
        }
        sections.push(`Total Objects Detected: ${totalThreats}`);
        sections.push(`Critical/High Threat Scans: ${criticalCount}`);
        sections.push(`Detection Classes:`);
        for (const [cls, count] of Object.entries(classCounts)) {
          sections.push(`  - ${cls}: ${count}`);
        }
      }
    }
  } catch (e) {
    // silent
  }

  // 3. Analytics data
  try {
    const res = await fetch(`${baseUrl}/api/analytics`, { cache: "no-store" });
    if (res.ok) {
      const analytics = await res.json();
      if (analytics.length > 0) {
        sections.push(`\n=== CNN ANALYTICS ===`);
        sections.push(`Total Analysis Reports: ${analytics.length}`);
        for (const a of analytics.slice(0, 5)) {
          sections.push(
            `  - ${a.analysisName}: PSNR=${a.reportData?.basic_metrics?.psnr?.toFixed(2) || "N/A"}, SSIM=${a.reportData?.basic_metrics?.ssim?.toFixed(4) || "N/A"}`,
          );
        }
      }
    }
  } catch (e) {
    // silent
  }

  // 4. Models data
  try {
    const res = await fetch(`${baseUrl}/api/models`, { cache: "no-store" });
    if (res.ok) {
      const models = await res.json();
      if (models.onnx?.length || models.tensorrt?.length) {
        sections.push(`\n=== DEPLOYED AI MODELS ===`);
        sections.push(`ONNX Models: ${models.onnx?.length || 0}`);
        sections.push(`TensorRT Models: ${models.tensorrt?.length || 0}`);
      }
    }
  } catch (e) {
    // silent
  }

  // 5. System health
  try {
    const res = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
    if (res.ok) {
      const health = await res.json();
      sections.push(`\n=== SYSTEM STATUS ===`);
      sections.push(`Status: ${health.status || "ONLINE"}`);
      sections.push(`Flask Backend: ${health.flask || "Unknown"}`);
    }
  } catch (e) {
    sections.push(`\n=== SYSTEM STATUS ===\nStatus: ONLINE (Next.js)`);
  }

  return sections.join("\n");
}

// Detect if a command is casual/greeting vs. needs platform data scan
function isCasualCommand(command: string): boolean {
  const cmd = command.toLowerCase().trim();
  const casualPatterns = [
    /^(hi|hey|hello|howdy|yo|hola|namaste|namaskar)\b/,
    /^(good\s*(morning|afternoon|evening|night|day))\b/,
    /^(how are you|how do you do|what'?s up|sup|whats up)\b/,
    /^(thank|thanks|thank you|dhanyavaad|shukriya)\b/,
    /^(bye|goodbye|see you|take care|good night)\b/,
    /^(who are you|what are you|what is your name|what can you do)\b/,
    /^(tell me a joke|joke|funny)\b/,
    /^(ok|okay|alright|roger|copy|understood|aye)\b/,
    /^(yes|no|yeah|nah|nope|yep)\b/,
  ];
  return casualPatterns.some((p) => p.test(cmd));
}

function generateCasualResponse(command: string): string {
  const cmd = command.toLowerCase().trim();
  if (/^(hi|hey|hello|howdy|yo|hola|namaste|namaskar)\b/.test(cmd)) {
    return "Commander, Marine Security AI Defense System is online and at your service. All naval zones are under active surveillance. How may I assist you?";
  }
  if (/^(good\s*morning)\b/.test(cmd)) {
    return "Good morning Commander. Marine Security systems are fully operational. All stations reporting normal. Standing by for your orders.";
  }
  if (/^(good\s*(afternoon|evening))\b/.test(cmd)) {
    return "Good day Commander. Marine Security defense grid is active across all operational zones. What do you need?";
  }
  if (/^(good\s*night)\b/.test(cmd)) {
    return "Good night Commander. Switching to automated night surveillance mode. All AI detection systems remain active. Rest well, sir.";
  }
  if (/^(how are you|how do you do|what'?s up|sup|whats up)\b/.test(cmd)) {
    return "Commander, all systems nominal. Core AI modules are running at full capacity. Marine Security is ready for tasking.";
  }
  if (/^(thank|thanks|thank you|dhanyavaad|shukriya)\b/.test(cmd)) {
    return "Aye Commander. Marine Security is always at your service. Standing by for further orders.";
  }
  if (/^(bye|goodbye|see you|take care)\b/.test(cmd)) {
    return "Aye Commander. Marine Security will continue autonomous surveillance. Returning to standby mode.";
  }
  if (/^(who are you|what are you|what is your name)\b/.test(cmd)) {
    return "Commander, I am Marine Security, the AI powered Maritime Defense Intelligence System developed for the Indian Naval Command. I provide real-time threat analysis, maritime surveillance, and operational readiness assessment across all Indian Ocean zones.";
  }
  if (/^(what can you do)\b/.test(cmd)) {
    return "Commander, I can report real-time threat levels across six naval zones, sea conditions, fleet operational readiness, detection scan history, and provide AI-powered threat analysis. Just say Marine Security followed by your question.";
  }
  return "Aye Commander. Marine Security standing by. How may I assist?";
}

export async function POST(request: NextRequest) {
  try {
    const { command } = await request.json();

    if (!command) {
      return NextResponse.json(
        { error: "No command provided" },
        { status: 400 },
      );
    }

    // FAST PATH: casual greetings — respond instantly without scanning platforms
    if (isCasualCommand(command)) {
      const casualResponse = generateCasualResponse(command);

      // If Groq is available, let AI handle greetings naturally too
      if (process.env.GROQ_API_KEY) {
        try {
          const casualContext = `You are Marine Security — the AI voice assistant for the Marine Security Indian Naval Defense System. You are speaking to a senior Indian naval intelligence officer via voice.
The user said something casual/greeting: "${command}"
Respond naturally and briefly as a military AI assistant. Maximum 1-2 sentences. Be warm but professional. Use Indian naval terminology.
CRITICAL: Your response will be spoken aloud. No formatting, no symbols, no markdown. Just plain conversational English.`;
          const response = await generateGroqResponse(command, casualContext);
          return NextResponse.json({
            response,
            provider: "groq",
            dataScanned: false,
          });
        } catch {
          // Groq failed, use offline casual response
        }
      }

      return NextResponse.json({
        response: casualResponse,
        provider: "offline",
        dataScanned: false,
      });
    }

    // FULL PATH: info-seeking command — scan all platforms
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3000";
    const baseUrl = `${proto}://${host}`;

    // Gather all platform data
    const platformData = await gatherPlatformIntelligence(baseUrl);

    // Check if Groq is available
    if (!process.env.GROQ_API_KEY) {
      // Offline intelligent response
      return NextResponse.json({
        response: generateOfflineResponse(command, platformData),
        provider: "offline",
        dataScanned: true,
      });
    }

    // Build the enhanced prompt with full platform data
    const enhancedContext = `You are Marine Security — the AI voice assistant for the Marine Security Indian Naval Defense System. You are speaking to a senior Indian naval intelligence officer via voice.

YOUR PERSONA:
- You are a military-grade AI defense system aboard an Indian Naval vessel
- You speak like a sharp, professional Indian defense AI — authoritative yet natural
- Use Indian naval terminology: "Aye Commander", "Affirmative", "Negative", "Roger that", "Wilco"
- Start responses with "Commander," or "Sir,"
- Give threat levels, percentages, and specific data
- Be extremely concise — your responses are spoken aloud via text-to-speech
- Maximum 2-3 sentences unless detailed data is specifically requested
- When mentioning locations, ALWAYS use full natural language:
  CORRECT: "from Visakhapatnam to Kochi" or "the Arabian Sea near Mumbai"
  WRONG: "Visakhapatnam → Kochi" or using arrows, dashes, or symbols
- NEVER use special characters, arrows (→), bullets, asterisks, or markdown in responses
- Spell out abbreviations: say "kilometers per hour" not "km/h", say "percent" not "%", say "degrees celsius" not "°C"
- Pronounce Indian city names properly — Visakhapatnam, Kochi, Chennai, Mumbai, Karwar, Port Blair
- When giving coordinates, say "latitude" and "longitude" instead of symbols
- Sound like a confident Indian naval operations officer, not a robot
- Use natural connecting phrases: "currently at", "operating near", "deployed from", "en route from X to Y"

CURRENT PLATFORM DATA (LIVE):
${platformData}

NAVAL OPERATIONAL ZONES:
- Arabian Sea, under Western Naval Command headquartered in Mumbai
- Bay of Bengal, under Eastern Naval Command headquartered in Visakhapatnam
- Andaman Sea, under Andaman and Nicobar Command headquartered in Port Blair
- Laccadive Sea, under Southern Naval Command headquartered in Kochi
- Indian Ocean South, under Far Sea Operations headquartered in Karwar
- Gulf of Mannar, under Tamil Nadu Naval Area headquartered in Chennai

CAPABILITIES YOU CAN REPORT ON:
1. Real-time threat levels across all six naval zones
2. Sea conditions including wave height, swell, and weather
3. Operational readiness for submarine ops, surface patrol, helicopter ops, diving ops, mine countermeasures, and amphibious assault
4. Detection scan history and threat classifications
5. CNN underwater image enhancement analytics
6. AI model deployment status
7. System health

CRITICAL: Your response will be directly spoken aloud. Write ONLY plain conversational English. No formatting, no symbols, no markdown, no lists with dashes. Just natural spoken sentences.`;

    const response = await generateGroqResponse(command, enhancedContext);
    return NextResponse.json({
      response,
      provider: "groq",
      dataScanned: true,
    });
  } catch (error) {
    console.error("Voice command error:", error);
    return NextResponse.json(
      {
        error: "Voice command processing failed",
        detail: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}

function generateOfflineResponse(
  command: string,
  platformData: string,
): string {
  const cmd = command.toLowerCase();

  // Parse quick stats from platform data
  const avgThreatMatch = platformData.match(/Average Threat Level: (\d+)%/);
  const avgThreat = avgThreatMatch ? avgThreatMatch[1] : "unknown";
  const critMatch = platformData.match(/Critical Zones: (\d+)/);
  const critZones = critMatch ? critMatch[1] : "0";
  const readinessMatch = platformData.match(/Fleet Readiness: (\d+)%/);
  const readiness = readinessMatch ? readinessMatch[1] : "unknown";
  const totalZonesMatch = platformData.match(/Total Zones Monitored: (\d+)/);
  const totalZones = totalZonesMatch ? totalZonesMatch[1] : "6";

  if (
    cmd.includes("threat") ||
    cmd.includes("danger") ||
    cmd.includes("risk")
  ) {
    return `Commander, current average threat level across ${totalZones} operational zones is ${avgThreat} percent. ${critZones} zones are at critical alert status. Fleet readiness stands at ${readiness} percent. All surveillance systems from the Arabian Sea near Mumbai to the Bay of Bengal near Visakhapatnam are actively scanning.`;
  }
  if (
    cmd.includes("status") ||
    cmd.includes("report") ||
    cmd.includes("sitrep")
  ) {
    return `Sir, MarEye Defense System is fully operational. We are monitoring ${totalZones} naval zones spanning from Kochi in the south to Port Blair in the east. Average threat level is at ${avgThreat} percent with fleet readiness at ${readiness} percent. All AI detection systems are online and scanning.`;
  }
  if (
    cmd.includes("ready") ||
    cmd.includes("operational") ||
    cmd.includes("ops")
  ) {
    return `Commander, fleet operational readiness is at ${readiness} percent. Submarine operations, surface patrol, helicopter ops, and diving operations are being assessed in real-time across all ${totalZones} zones from Mumbai to Chennai.`;
  }
  if (cmd.includes("hello") || cmd.includes("hi ") || cmd.includes("hey")) {
    return `Commander, Marine Security AI Defense System is online and standing by. ${totalZones} naval zones under active surveillance across the Indian Ocean region. How may I assist you?`;
  }

  return `Commander, Marine Security AI is operating in offline mode. Current threat level is ${avgThreat} percent and fleet readiness is at ${readiness} percent across ${totalZones} zones. For full AI analysis capability, please configure the Groq API key.`;
}
