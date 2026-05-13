import { NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetch-utils";

// Indian Navy operational zones with coordinates
const NAVAL_ZONES = [
  {
    id: "arabian-sea",
    name: "Arabian Sea",
    lat: 15.0,
    lon: 65.0,
    command: "Western Naval Command",
    hq: "Mumbai",
  },
  {
    id: "bay-of-bengal",
    name: "Bay of Bengal",
    lat: 14.0,
    lon: 85.0,
    command: "Eastern Naval Command",
    hq: "Visakhapatnam",
  },
  {
    id: "andaman-sea",
    name: "Andaman Sea",
    lat: 11.0,
    lon: 93.0,
    command: "Andaman & Nicobar Command",
    hq: "Port Blair",
  },
  {
    id: "laccadive-sea",
    name: "Laccadive Sea",
    lat: 10.0,
    lon: 73.0,
    command: "Southern Naval Command",
    hq: "Kochi",
  },
  {
    id: "indian-ocean-south",
    name: "Indian Ocean (South)",
    lat: 0.0,
    lon: 75.0,
    command: "Far Sea Operations",
    hq: "Karwar",
  },
  {
    id: "gulf-of-mannar",
    name: "Gulf of Mannar",
    lat: 8.5,
    lon: 79.0,
    command: "Tamil Nadu Naval Area",
    hq: "Chennai",
  },
];

// Batched data fetching for all zones
async function fetchBatchMarineData(lats: string, lons: string) {
  const url = `https://api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lons}&current=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period&hourly=wave_height,wave_direction,wave_period,swell_wave_height&forecast_days=3&timezone=Asia/Kolkata`;
  try {
    const res = await fetchWithRetry(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : [data];
  } catch (err) {
    console.error("Batch marine fetch failed:", err);
    return null;
  }
}

async function fetchBatchWeatherData(lats: string, lons: string) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure&hourly=visibility,temperature_2m,wind_speed_10m&forecast_days=3&timezone=Asia/Kolkata`;
  try {
    const res = await fetchWithRetry(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : [data];
  } catch (err) {
    console.error("Batch weather fetch failed:", err);
    return null;
  }
}

// Zone-specific geopolitical intelligence (static, based on real strategic assessment)
const ZONE_INTEL: Record<string, {
  geopoliticalScore: number;
  piracyIndex: number;       // IMB Annual Piracy Report basis
  chokepointProximity: number;
  trafficDensity: number;    // vessel density 0-30
  elintBaseline: number;     // ELINT/COMINT intercept baseline
  geopoliticalDetail: string;
  piracyDetail: string;
}> = {
  "arabian-sea": {
    geopoliticalScore: 18,
    piracyIndex: 14,
    chokepointProximity: 12, // Hormuz & Bab el-Mandeb approach
    trafficDensity: 22,
    elintBaseline: 8,
    geopoliticalDetail: "Heightened IRGCN activity near Hormuz. Pak Navy exercises detected 220nm NW. US 5th Fleet patrol corridors active.",
    piracyDetail: "IMB 2024: 12 incidents Gulf of Aden/Arabian Sea corridor. Somali piracy resurgence — 3 vessels boarded Q3-Q4.",
  },
  "bay-of-bengal": {
    geopoliticalScore: 10,
    piracyIndex: 6,
    chokepointProximity: 8, // Malacca approach
    trafficDensity: 18,
    elintBaseline: 5,
    geopoliticalDetail: "PLAN survey vessel XIANG YANG HONG 10 tracked 340nm east of A&N Islands. Bangladesh Navy joint exercise CORPAT-24 concluded 72hr ago.",
    piracyDetail: "IMB 2024: Low piracy incidents. 2 attempted boarding reports near Chittagong anchorage zone.",
  },
  "andaman-sea": {
    geopoliticalScore: 22,
    piracyIndex: 9,
    chokepointProximity: 18, // Malacca & Sunda Strait proximity
    trafficDensity: 24,
    elintBaseline: 12,
    geopoliticalDetail: "SIGINT: Multiple encrypted transmissions from unidentified submarine contact 180nm south of Campbell Bay. Malacca chokepoint — 25% global trade passes within 200nm.",
    piracyDetail: "IMB 2024: 8 incidents Malacca/Andaman corridor. Armed robberies reported in Singapore Strait approaches.",
  },
  "laccadive-sea": {
    geopoliticalScore: 8,
    piracyIndex: 4,
    chokepointProximity: 6,
    trafficDensity: 14,
    elintBaseline: 3,
    geopoliticalDetail: "Routine southern transit route. Maldives EEZ boundary incidents — 2 MNDF interceptions of illegal fishing vessels. India-Maldives EXMAR exercise scheduled.",
    piracyDetail: "IMB 2024: Minimal piracy activity. Lakshadweep EEZ fishing violations by foreign vessels ongoing.",
  },
  "indian-ocean-south": {
    geopoliticalScore: 12,
    piracyIndex: 7,
    chokepointProximity: 5,
    trafficDensity: 10,
    elintBaseline: 4,
    geopoliticalDetail: "Far sea operations. Chinese nuclear submarine SSBN patrol area estimated 800-1200nm south. Diego Garcia B-52H deployments active — US strategic presence confirmed.",
    piracyDetail: "IMB 2024: Remote area — 4 piracy incidents reported far southern Indian Ocean. Humanitarian route monitoring active.",
  },
  "gulf-of-mannar": {
    geopoliticalScore: 14,
    piracyIndex: 5,
    chokepointProximity: 9,
    trafficDensity: 12,
    elintBaseline: 6,
    geopoliticalDetail: "Legacy LTTE maritime networks assessment ongoing. SL Navy-IN joint patrol DOSTI active. Tamil Nadu fishermen incursion incidents — 6 apprehensions this week.",
    piracyDetail: "IMB 2024: Low piracy. Colombo port smuggling routes monitored. Shallow water mine threat legacy assessment GREEN.",
  },
};

// AI Threat Assessment Algorithm — Enhanced with geopolitical & operational intelligence
function calculateThreatLevel(
  marine: any,
  weather: any,
  zoneId?: string,
): {
  level: number; // 0-100
  category: string;
  factors: { name: string; score: number; detail: string }[];
} {
  const factors: { name: string; score: number; detail: string }[] = [];
  const zoneIntel = zoneId ? ZONE_INTEL[zoneId] : null;

  // 1. Sea state threat
  const waveHeight = marine?.current?.wave_height ?? 0;
  const seaScore = Math.min(waveHeight * 10, 25);
  factors.push({
    name: "Sea State",
    score: Math.round(seaScore),
    detail: `Wave height: ${waveHeight}m — ${waveHeight < 1 ? "Calm (Sea State 1-2)" : waveHeight < 2.5 ? "Moderate (SS3-4) — sonar tracking nominal" : waveHeight < 4 ? "Rough (SS5) — hull sonar degraded 30%" : "Very Rough (SS6+) — ASW operations severely limited"}`,
  });

  // 2. Visibility / EMCON risk
  const visibility = weather?.hourly?.visibility?.[0] ?? 50000;
  const visKm = visibility / 1000;
  const visScore = visKm < 2 ? 20 : visKm < 5 ? 14 : visKm < 10 ? 8 : 3;
  factors.push({
    name: "Visibility / EMCON",
    score: visScore,
    detail: `Visibility: ${visKm.toFixed(1)}km — ${visKm < 2 ? "Poor — EMCON advantage to hostile submarines. Radar detection range reduced." : visKm < 5 ? "Reduced — MPA visual search compromised. ELINT watch elevated." : visKm < 10 ? "Moderate — Standard radar and visual watch effective." : "Clear — Full optical/EO surveillance coverage. IR tracking active."}`,
  });

  // 3. Wind / operational conditions
  const windSpeed = weather?.current?.wind_speed_10m ?? 0;
  const gustSpeed = weather?.current?.wind_gusts_10m ?? 0;
  const windScore = Math.min((windSpeed + gustSpeed * 0.4) * 0.4, 15);
  factors.push({
    name: "Wind / Sea Conditions",
    score: Math.round(windScore),
    detail: `Wind: ${windSpeed} km/h, Gusts: ${gustSpeed} km/h — ${windSpeed < 15 ? "Favorable — Helo ASW ops nominal. Boarding team deployable." : windSpeed < 30 ? "Challenging — Helo ops restricted to SS3. RHIB deployment caution." : "Hazardous — RHIB ops suspended. Helo ASW abort criteria possible."}`,
  });

  // 4. Temporal / OPSEC risk
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour > 18;
  const isTwilight = hour === 6 || hour === 7 || hour === 18 || hour === 19;
  const timeScore = isNight ? 14 : isTwilight ? 9 : 4;
  factors.push({
    name: "Temporal OPSEC",
    score: timeScore,
    detail: `${isNight ? `Night ops (${hour}:00 IST) — NV/IR coverage active. Submarine infiltration risk elevated. SALM watch doubled.` : isTwilight ? `Twilight (${hour}:00 IST) — Transition period. Radar/EO handoff window. Heightened alert.` : `Daylight (${hour}:00 IST) — Full MPA visual coverage. Standard ASWEX posture.`}`,
  });

  // 5. Geopolitical threat index (zone-specific)
  const geoScore = zoneIntel ? zoneIntel.geopoliticalScore : 8;
  factors.push({
    name: "Geopolitical Threat",
    score: geoScore,
    detail: zoneIntel?.geopoliticalDetail ?? "Standard geopolitical assessment. No active incidents reported in this zone.",
  });

  // 6. Piracy / asymmetric threat (IMB-based)
  const piracyScore = zoneIntel ? zoneIntel.piracyIndex : 4;
  factors.push({
    name: "Piracy / Asymmetric",
    score: piracyScore,
    detail: zoneIntel?.piracyDetail ?? "IMB 2024: Standard threat assessment. No recent incidents.",
  });

  // 7. Chokepoint proximity
  const chokeScore = zoneIntel ? zoneIntel.chokepointProximity : 4;
  factors.push({
    name: "Chokepoint Proximity",
    score: chokeScore,
    detail: chokeScore > 14 ? "HIGH — Vessel within or approaching critical chokepoint. Congestion and ambush risk elevated. PLAN/USN shadowing possible." :
            chokeScore > 8 ? "MODERATE — Within 250nm of strategic chokepoint. Transit route monitoring active." :
            "LOW — Open ocean zone. Chokepoint effects minimal.",
  });

  // 8. ELINT / SIGINT intercept count (simulated, realistic variance per zone)
  const elintBase = zoneIntel ? zoneIntel.elintBaseline : 3;
  // Add time-seeded variance for realism (changes each hour, stable within hour)
  const hourSeed = new Date().getHours();
  const elintVariance = Math.abs(Math.sin(hourSeed * 0.7 + (zoneId?.length ?? 5))) * 4;
  const elintActual = Math.round(elintBase + elintVariance);
  const elintScore = Math.min(elintActual, 10);
  factors.push({
    name: "SIGINT/ELINT Activity",
    score: elintScore,
    detail: `${elintActual} intercepts logged last 6hr — ${elintActual > 8 ? "ELEVATED: Encrypted SATCOM bursts detected. FLTSATCOM frequency suspected. Crypto analysis in progress." : elintActual > 5 ? "MODERATE: Intermittent HF/UHF activity. Pattern analysis ongoing. Submarine SITREP transmission possible." : "ROUTINE: Background ELINT traffic. No anomalous signatures detected."}`,
  });

  const totalScore = Math.min(
    Math.round(factors.reduce((s, f) => s + f.score, 0)),
    100,
  );
  const category =
    totalScore < 25
      ? "LOW"
      : totalScore < 50
        ? "MODERATE"
        : totalScore < 75
          ? "HIGH"
          : "CRITICAL";

  return { level: totalScore, category, factors };
}

// Operational readiness based on conditions
function calculateOpsReadiness(marine: any, weather: any) {
  const waveHeight = marine?.current?.wave_height ?? 0;
  const windSpeed = weather?.current?.wind_speed_10m ?? 0;
  const visibility = (weather?.hourly?.visibility?.[0] ?? 50000) / 1000;
  const swellHeight = marine?.current?.swell_wave_height ?? 0;

  return [
    {
      operation: "Submarine Operations",
      icon: "submarine",
      ready: waveHeight < 4 && windSpeed < 40,
      confidence: Math.max(0, 100 - waveHeight * 15 - windSpeed * 0.5),
      conditions: `Waves ${waveHeight}m, Wind ${windSpeed}km/h`,
      status:
        waveHeight < 2 ? "OPTIMAL" : waveHeight < 4 ? "FEASIBLE" : "RESTRICTED",
    },
    {
      operation: "Surface Patrol",
      icon: "ship",
      ready: waveHeight < 3 && windSpeed < 35,
      confidence: Math.max(0, 100 - waveHeight * 20 - windSpeed * 0.8),
      conditions: `Sea state ${waveHeight < 0.5 ? "0-1" : waveHeight < 1.25 ? "2-3" : waveHeight < 2.5 ? "4" : "5+"}, Wind ${windSpeed}km/h`,
      status:
        waveHeight < 1.25
          ? "OPTIMAL"
          : waveHeight < 2.5
            ? "FEASIBLE"
            : waveHeight < 4
              ? "CAUTION"
              : "NO-GO",
    },
    {
      operation: "Helicopter Operations",
      icon: "helicopter",
      ready: windSpeed < 25 && visibility > 3 && waveHeight < 3,
      confidence: Math.max(
        0,
        100 - windSpeed * 2 - (10 - Math.min(visibility, 10)) * 5,
      ),
      conditions: `Visibility ${visibility.toFixed(1)}km, Wind ${windSpeed}km/h`,
      status:
        windSpeed < 15 && visibility > 5
          ? "OPTIMAL"
          : windSpeed < 25 && visibility > 3
            ? "FEASIBLE"
            : "NO-GO",
    },
    {
      operation: "Diving Operations",
      icon: "diver",
      ready: waveHeight < 1.5 && swellHeight < 1 && windSpeed < 20,
      confidence: Math.max(
        0,
        100 - waveHeight * 30 - swellHeight * 20 - windSpeed * 1,
      ),
      conditions: `Waves ${waveHeight}m, Swell ${swellHeight}m`,
      status:
        waveHeight < 0.5 ? "OPTIMAL" : waveHeight < 1.5 ? "FEASIBLE" : "NO-GO",
    },
    {
      operation: "Mine Countermeasures",
      icon: "mine",
      ready: waveHeight < 1 && visibility > 5 && swellHeight < 0.5,
      confidence: Math.max(
        0,
        100 -
          waveHeight * 40 -
          swellHeight * 30 -
          (10 - Math.min(visibility, 10)) * 3,
      ),
      conditions: `Waves ${waveHeight}m, Visibility ${visibility.toFixed(1)}km`,
      status:
        waveHeight < 0.5 && visibility > 8
          ? "OPTIMAL"
          : waveHeight < 1
            ? "FEASIBLE"
            : "NO-GO",
    },
    {
      operation: "Amphibious Assault",
      icon: "assault",
      ready: waveHeight < 2 && windSpeed < 25 && visibility > 5,
      confidence: Math.max(
        0,
        100 -
          waveHeight * 25 -
          windSpeed * 1.2 -
          (10 - Math.min(visibility, 10)) * 4,
      ),
      conditions: `Waves ${waveHeight}m, Wind ${windSpeed}km/h, Vis ${visibility.toFixed(0)}km`,
      status:
        waveHeight < 1 && windSpeed < 15
          ? "OPTIMAL"
          : waveHeight < 2
            ? "FEASIBLE"
            : "NO-GO",
    },
  ];
}

// AI intelligence brief generator
function generateIntelBrief(zones: any[]) {
  const timestamp = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: false,
  });
  const criticalZones = zones.filter((z) => z.threat.level >= 50);
  const highestThreat = zones.reduce(
    (max, z) => (z.threat.level > max.threat.level ? z : max),
    zones[0],
  );

  let brief = `FLASH // INDIAN NAVAL INTELLIGENCE // ${timestamp} IST\n`;
  brief += `═══════════════════════════════════════════════════════\n`;
  brief += `SUBJECT: Maritime Domain Awareness — Operational Summary\n`;
  brief += `CLASSIFICATION: SECRET // NOFORN // MAREYE-AI\n`;
  brief += `═══════════════════════════════════════════════════════\n\n`;

  brief += `1. SITUATION OVERVIEW:\n`;
  brief += `   Active monitoring of ${zones.length} naval operational zones.\n`;
  brief += `   Overall threat assessment: ${criticalZones.length > 0 ? "ELEVATED" : "NORMAL"}.\n`;
  brief += `   Highest threat zone: ${highestThreat.name} (${highestThreat.threat.category} — ${highestThreat.threat.level}%).\n\n`;

  brief += `2. ZONE-BY-ZONE ANALYSIS:\n`;
  zones.forEach((z, i) => {
    brief += `   ${String.fromCharCode(65 + i)}. ${z.name.toUpperCase()} [${z.command}]:\n`;
    brief += `      Threat Level: ${z.threat.category} (${z.threat.level}%)\n`;
    brief += `      Sea State: Wave Ht ${z.marine?.current?.wave_height ?? "N/A"}m, `;
    brief += `Swell ${z.marine?.current?.swell_wave_height ?? "N/A"}m\n`;
    brief += `      Weather: ${z.weather?.current?.temperature_2m ?? "N/A"}°C, `;
    brief += `Wind ${z.weather?.current?.wind_speed_10m ?? "N/A"}km/h, `;
    brief += `Cloud ${z.weather?.current?.cloud_cover ?? "N/A"}%\n`;
    const readyOps = z.ops.filter((o: any) => o.ready).length;
    brief += `      Ops Readiness: ${readyOps}/${z.ops.length} operations feasible\n\n`;
  });

  brief += `3. AI RECOMMENDATION:\n`;
  if (criticalZones.length > 0) {
    brief += `   ⚠ ALERT: ${criticalZones.length} zone(s) reporting elevated threat conditions.\n`;
    brief += `   Recommend increased ASW patrols in ${criticalZones.map((z) => z.name).join(", ")}.\n`;
    brief += `   Maritime patrol aircraft sorties should be prioritized.\n`;
  } else {
    brief += `   All zones within normal operating parameters.\n`;
    brief += `   Standard patrol schedules recommended.\n`;
    brief += `   Favorable conditions for scheduled exercises.\n`;
  }

  brief += `\n4. FORECAST:\n`;
  brief += `   72-hour maritime forecast available per-zone.\n`;
  brief += `   Next intelligence update: T+60 minutes.\n\n`;

  brief += `═══════════════════════════════════════════════════════\n`;
  brief += `MAREYE AI DEFENSE SYSTEM // INDIAN NAVAL COMMAND\n`;
  brief += `END OF REPORT // ${timestamp} IST\n`;

  return brief;
}

export async function GET() {
  try {
    const lats = NAVAL_ZONES.map((z) => z.lat).join(",");
    const lons = NAVAL_ZONES.map((z) => z.lon).join(",");

    // Execute only 2 batch requests instead of 12 individual ones
    const [marineDataArray, weatherDataArray] = await Promise.all([
      fetchBatchMarineData(lats, lons),
      fetchBatchWeatherData(lats, lons),
    ]);

    const results = NAVAL_ZONES.map((zone, index) => {
      const marine = marineDataArray ? marineDataArray[index] : null;
      const weather = weatherDataArray ? weatherDataArray[index] : null;

      const threat = calculateThreatLevel(marine, weather, zone.id);
      const ops = calculateOpsReadiness(marine, weather);

      return {
        ...zone,
        marine,
        weather,
        threat,
        ops,
      };
    });

    const brief = generateIntelBrief(results);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      zones: results,
      brief,
      summary: {
        totalZones: results.length,
        criticalZones: results.filter((z) => z.threat.level >= 75).length,
        highZones: results.filter(
          (z) => z.threat.level >= 50 && z.threat.level < 75,
        ).length,
        moderateZones: results.filter(
          (z) => z.threat.level >= 25 && z.threat.level < 50,
        ).length,
        lowZones: results.filter((z) => z.threat.level < 25).length,
        avgThreat: Math.round(
          results.reduce((s, z) => s + z.threat.level, 0) / results.length,
        ),
        overallReadiness: Math.round(
          (results.reduce(
            (s, z) => s + z.ops.filter((o: any) => o.ready).length,
            0,
          ) /
            (results.length * results[0].ops.length)) *
            100,
        ),
      },
    });
  } catch (error: any) {
    console.error("Intelligence API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch intelligence data", detail: error.message },
      { status: 500 },
    );
  }
}
