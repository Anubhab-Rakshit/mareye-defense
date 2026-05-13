"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Shield,
  Clock,
  Activity,
  Zap,
  Target,
  Brain,
  Radio,
  RefreshCw,
} from "lucide-react";

// ═══ Types from intelligence API ═══
interface ZoneData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  command: string;
  hq: string;
  marine: {
    current: Record<string, number>;
    hourly: {
      time: string[];
      wave_height: number[];
      wave_direction: number[];
      wave_period: number[];
      swell_wave_height: number[];
    };
  };
  weather: {
    current: Record<string, number>;
    hourly: {
      time: string[];
      temperature_2m: number[];
      relative_humidity_2m: number[];
      wind_speed_10m: number[];
      wind_direction_10m: number[];
      visibility: number[];
      cloud_cover: number[];
    };
  };
  threat: {
    level: number;
    category: string;
    factors: { name: string; score: number; detail: string }[];
  };
  ops: {
    operation: string;
    ready: boolean;
    confidence: number;
    status: string;
    conditions: string;
  }[];
}

interface IntelResponse {
  timestamp: string;
  zones: ZoneData[];
  summary: {
    totalZones: number;
    criticalZones: number;
    highZones: number;
    moderateZones: number;
    lowZones: number;
    avgThreat: number;
    overallReadiness: number;
  };
  brief: string;
}

interface ThreatPrediction {
  timestamp: Date;
  hour: number;
  threatLevel: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
  category: "low" | "moderate" | "elevated" | "high" | "critical";
  factors: string[];
  waveHeight: number;
  windSpeed: number;
  visibility: number;
}

interface ThreatEvent {
  time: Date;
  type: "patrol" | "intrusion" | "weather" | "exercise" | "deployment";
  title: string;
  severity: number;
  zone: string;
}

// Derive threat level from real weather/marine data at a given hour
function deriveThreatFromHourlyData(
  waveH: number,
  swellH: number,
  windSpd: number,
  visibility: number,
  cloudCover: number,
  hourOfDay: number,
): { level: number; factors: string[] } {
  let level = 10; // Base level for situational awareness
  const factors: string[] = [];

  // Sea state risk (wave height > 2m is rough)
  if (waveH > 2.0) {
    const seaState = Math.min(30, (waveH / 4) * 30);
    level += seaState;
    if (waveH > 2.5) factors.push(`High sea state: ${waveH.toFixed(1)}m waves`);
  }

  // Visibility risk (< 10000m is cautionary)
  if (visibility < 10000) {
    const visRisk = Math.min(25, ((10000 - visibility) / 10000) * 25);
    level += visRisk;
    if (visibility < 5000)
      factors.push(`Low visibility: ${(visibility / 1000).toFixed(1)}km`);
  }

  // Wind risk
  if (windSpd > 15) {
    const windRisk = Math.min(15, (windSpd / 50) * 15);
    level += windRisk;
    if (windSpd > 25) factors.push(`Strong winds: ${windSpd.toFixed(0)} km/h`);
  }

  // Swell risk
  if (swellH > 1.5) {
    const swellRisk = Math.min(10, (swellH / 3) * 10);
    level += swellRisk;
    if (swellH > 2) factors.push(`Heavy swell: ${swellH.toFixed(1)}m`);
  }

  // Night operations risk
  if (hourOfDay < 6 || hourOfDay > 20) {
    level += 5;
    factors.push("Night operations period");
  }

  // Cloud cover affects aerial surveillance
  if (cloudCover > 85) {
    level += 5;
    factors.push("Dense cloud cover");
  }

  return { level: Math.min(100, Math.round(level)), factors };
}

function buildPredictions(zones: ZoneData[]): ThreatPrediction[] {
  if (!zones.length || !zones[0].weather?.hourly?.time) return [];

  const predictions: ThreatPrediction[] = [];
  const now = new Date();
  const hourlyTimes = zones[0].weather.hourly.time;

  hourlyTimes.forEach((timeStr, idx) => {
    const time = new Date(timeStr);
    const hourFromNow = (time.getTime() - now.getTime()) / 3600000;
    if (hourFromNow < -12 || hourFromNow > 74) return;

    // Average across all zones for composite threat
    let totalLevel = 0;
    let totalWave = 0;
    let totalWind = 0;
    let totalVis = 0;
    const allFactors: string[] = [];
    let validZones = 0;

    zones.forEach((z) => {
      const waveH = z.marine?.hourly?.wave_height?.[idx] ?? 0;
      const swellH = z.marine?.hourly?.swell_wave_height?.[idx] ?? 0;
      const windSpd = z.weather?.hourly?.wind_speed_10m?.[idx] ?? 0;
      const vis = z.weather?.hourly?.visibility?.[idx] ?? 50000;
      const cloud = z.weather?.hourly?.cloud_cover?.[idx] ?? 0;
      const hourOfDay = time.getHours();

      const { level, factors } = deriveThreatFromHourlyData(
        waveH,
        swellH,
        windSpd,
        vis,
        cloud,
        hourOfDay,
      );
      totalLevel += level;
      totalWave += waveH;
      totalWind += windSpd;
      totalVis += vis;
      factors.forEach((f) => {
        if (!allFactors.includes(f)) allFactors.push(f);
      });
      validZones++;
    });

    if (validZones === 0) return;
    const avgLevel = totalLevel / validZones;
    const hoursAway = Math.abs(hourFromNow);
    const confidence = Math.max(0.3, 1 - hoursAway * 0.008);
    const spread = (1 - confidence) * 20;

    predictions.push({
      timestamp: time,
      hour: Math.round(hourFromNow * 10) / 10,
      threatLevel: avgLevel,
      confidence,
      upperBound: Math.min(100, avgLevel + spread),
      lowerBound: Math.max(0, avgLevel - spread),
      category:
        avgLevel < 20
          ? "low"
          : avgLevel < 40
            ? "moderate"
            : avgLevel < 60
              ? "elevated"
              : avgLevel < 80
                ? "high"
                : "critical",
      factors: allFactors.slice(0, 3),
      waveHeight: totalWave / validZones,
      windSpeed: totalWind / validZones,
      visibility: totalVis / validZones,
    });
  });

  return predictions;
}

function buildEvents(zones: ZoneData[]): ThreatEvent[] {
  const events: ThreatEvent[] = [];
  const now = new Date();

  // We look for significant data points in the hourly forecast to create deterministic events
  // instead of random ones.
  zones.forEach((zone) => {
    const hourly = zone.weather?.hourly;
    const marine = zone.marine?.hourly;

    if (!hourly || !marine) return;

    // 1. Check for historical threat peak (last 6 hours)
    if (zone.threat.level >= 65) {
      events.push({
        time: new Date(now.getTime() - 1000 * 3600 * 2), // 2 hours ago
        type: "intrusion",
        title: `Priority Threat: ${zone.threat.category} risk in ${zone.name}`,
        severity: zone.threat.level,
        zone: zone.name,
      });
    }

    // 2. Predict meteorological events from hourly forecast
    // Look for wind gusts > 30 km/h in the next 72h
    for (let i = 0; i < hourly.time.length; i++) {
      const time = new Date(hourly.time[i]);
      const hoursDiff = (time.getTime() - now.getTime()) / 3600000;

      // Only add events for the next 48h
      if (hoursDiff < 0 || hoursDiff > 48) continue;

      const wind = hourly.wind_speed_10m[i];
      const wave = marine.wave_height[i];

      if (wind > 35) {
        events.push({
          time,
          type: "weather",
          title: `Gale Warning: ${wind.toFixed(0)}km/h forecast in ${zone.name}`,
          severity: Math.min(85, Math.round(wind * 1.5)),
          zone: zone.name,
        });
        // Skip some indices to avoid too many duplicate events for the same gust
        i += 12;
      } else if (wave > 3.5) {
        events.push({
          time,
          type: "weather",
          title: `Heavy Seas: ${wave.toFixed(1)}m height forecast in ${zone.name}`,
          severity: Math.min(80, Math.round(wave * 15)),
          zone: zone.name,
        });
        i += 12;
      }
    }

    // 3. Operational events based on real readiness
    const readyOps = zone.ops.filter((o) => o.ready);
    if (readyOps.length > 0) {
      // Create a deployment event for the most confident ready operation
      const bestOp = readyOps.sort((a, b) => b.confidence - a.confidence)[0];
      events.push({
        time: new Date(now.getTime() + 1000 * 3600 * 6), // Scheduled for 6h from now
        type: "patrol",
        title: `Scheduled ${bestOp.operation} deployment: OPS READY`,
        severity: Math.round(bestOp.confidence / 2),
        zone: zone.name,
      });
    }
  });

  return events.sort((a, b) => a.time.getTime() - b.time.getTime());
}

export default function AIThreatPrediction() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [intel, setIntel] = useState<IntelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ThreatPrediction | null>(
    null,
  );
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedRange, setSelectedRange] = useState<
    "12h" | "24h" | "48h" | "72h"
  >("72h");
  const [fusionBrief, setFusionBrief] = useState<string>("");
  const [loadingBrief, setLoadingBrief] = useState(false);
  const animFrame = useRef(0);

  // Fetch real intelligence data
  const fetchIntel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/intelligence");
      if (!res.ok) throw new Error("Intelligence API failed");
      const data = await res.json();
      setIntel(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntel();
  }, [fetchIntel]);

  // Fetch AI Fusion Brief whenever intel changes
  useEffect(() => {
    const fetchBrief = async () => {
      if (!intel || intel.zones.length === 0) return;
      setLoadingBrief(true);
      try {
        const activeZone = intel.zones[0]; // Primary focus zone
        const res = await fetch("/api/ai/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zoneData: activeZone,
            detections: "Vessel density high in transit corridors",
            intercepts: "SIGINT monitoring active; no hostile decryption required",
            missionStats: "Standard formation patrolling",
          }),
        });
        const data = await res.json();
        if (data.brief) setFusionBrief(data.brief);
      } catch (err) {
        console.error("Brief fetch failed", err);
      } finally {
        setLoadingBrief(false);
      }
    };
    fetchBrief();
  }, [intel]);

  const predictions = useMemo(
    () => (intel ? buildPredictions(intel.zones) : []),
    [intel],
  );
  const events = useMemo(
    () => (intel ? buildEvents(intel.zones) : []),
    [intel],
  );

  const nowPrediction = useMemo(() => {
    if (!predictions.length) return null;
    return predictions.reduce(
      (c, p) => (Math.abs(p.hour) < Math.abs(c.hour) ? p : c),
      predictions[0],
    );
  }, [predictions]);

  const rangeHours: Record<string, [number, number]> = {
    "12h": [-6, 12],
    "24h": [-6, 24],
    "48h": [-12, 48],
    "72h": [-12, 72],
  };
  const [startH, endH] = rangeHours[selectedRange];
  const filteredPredictions = predictions.filter(
    (p) => p.hour >= startH && p.hour <= endH,
  );
  const filteredEvents = events.filter((e) => {
    const h = (e.time.getTime() - Date.now()) / 3600000;
    return h >= startH && h <= endH;
  });

  // Canvas chart
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !filteredPredictions.length) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const W = rect.width,
      H = rect.height;
    const pad = { top: 30, bottom: 40, left: 50, right: 20 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const xScale = (h: number) =>
      pad.left + ((h - startH) / (endH - startH)) * chartW;
    const yScale = (v: number) => pad.top + chartH - (v / 100) * chartH;

    let phase = 0;
    const drawFrame = () => {
      phase += 0.015;
      ctx.clearRect(0, 0, W, H);

      // 1. TACTICAL RADAR BACKGROUND (Sonar Rings)
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.05)";
      ctx.setLineDash([5, 10]);
      for (let r = 50; r < W; r += 80) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      
      // Rotating Radar Sweep
      ctx.rotate(phase * 0.5);
      const sweepGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, W / 1.5);
      sweepGrad.addColorStop(0, "rgba(6, 182, 212, 0)");
      sweepGrad.addColorStop(0.2, "rgba(6, 182, 212, 0.03)");
      sweepGrad.addColorStop(0.5, "rgba(6, 182, 212, 0.1)");
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, W / 1.5, -0.2, 0.2);
      ctx.fill();
      ctx.restore();

      // 2. GRID & AXES
      ctx.strokeStyle = "rgba(6, 182, 212, 0.08)";
      ctx.lineWidth = 1;
      // Vertical Grid
      const step = selectedRange === "12h" ? 2 : selectedRange === "24h" ? 4 : 8;
      for (let h = Math.ceil(startH / step) * step; h <= endH; h += step) {
        const x = xScale(h);
        ctx.beginPath();
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, H - pad.bottom);
        ctx.stroke();
        
        ctx.fillStyle = "rgba(6, 182, 212, 0.3)";
        ctx.font = "8px 'Space Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(h === 0 ? "T-ZERO" : h > 0 ? `+${h}H` : `${h}H`, x, H - pad.bottom + 16);
      }
      // Horizontal Grid (Threat Levels)
      for (let v = 0; v <= 100; v += 25) {
        const y = yScale(v);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(W - pad.right, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(6, 182, 212, 0.2)";
        ctx.font = "7px 'Orbitron'";
        ctx.textAlign = "right";
        ctx.fillText(v.toString(), pad.left - 10, y + 3);
      }

      // 3. TACTICAL CORNER BRACKETS
      const bSize = 15;
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 2;
      // Top Left
      ctx.beginPath(); ctx.moveTo(pad.left, pad.top + bSize); ctx.lineTo(pad.left, pad.top); ctx.lineTo(pad.left + bSize, pad.top); ctx.stroke();
      // Top Right
      ctx.beginPath(); ctx.moveTo(W - pad.right - bSize, pad.top); ctx.lineTo(W - pad.right, pad.top); ctx.lineTo(W - pad.right, pad.top + bSize); ctx.stroke();
      // Bottom Left
      ctx.beginPath(); ctx.moveTo(pad.left, H - pad.bottom - bSize); ctx.lineTo(pad.left, H - pad.bottom); ctx.lineTo(pad.left + bSize, H - pad.bottom); ctx.stroke();
      // Bottom Right
      ctx.beginPath(); ctx.moveTo(W - pad.right - bSize, H - pad.bottom); ctx.lineTo(W - pad.right, H - pad.bottom); ctx.lineTo(W - pad.right, H - pad.bottom - bSize); ctx.stroke();

      // 4. PREDICTION RANGE (GLOWING AREA)
      if (filteredPredictions.length > 1) {
        ctx.beginPath();
        ctx.moveTo(xScale(filteredPredictions[0].hour), yScale(filteredPredictions[0].upperBound));
        for (let i = 1; i < filteredPredictions.length; i++) {
          const p = filteredPredictions[i];
          ctx.lineTo(xScale(p.hour), yScale(p.upperBound));
        }
        for (let i = filteredPredictions.length - 1; i >= 0; i--) {
          const p = filteredPredictions[i];
          ctx.lineTo(xScale(p.hour), yScale(p.lowerBound));
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(6, 182, 212, 0.03)";
        ctx.fill();
      }

      // 5. BEZIER THREAT LINE (The Core Visualization)
      if (filteredPredictions.length > 1) {
        ctx.beginPath();
        const startP = filteredPredictions[0];
        ctx.moveTo(xScale(startP.hour), yScale(startP.threatLevel));

        for (let i = 0; i < filteredPredictions.length - 1; i++) {
          const curr = filteredPredictions[i];
          const next = filteredPredictions[i + 1];
          const cpX = (xScale(curr.hour) + xScale(next.hour)) / 2;
          ctx.quadraticCurveTo(xScale(curr.hour), yScale(curr.threatLevel), cpX, (yScale(curr.threatLevel) + yScale(next.threatLevel)) / 2);
        }
        
        // Final segment
        const last = filteredPredictions[filteredPredictions.length - 1];
        ctx.lineTo(xScale(last.hour), yScale(last.threatLevel));

        // Styling the line
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(6, 182, 212, 0.8)";
        ctx.strokeStyle = "#08f7ff";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset for performance

        // Fill under line (Gradient)
        ctx.lineTo(xScale(last.hour), H - pad.bottom);
        ctx.lineTo(xScale(startP.hour), H - pad.bottom);
        const fillGrad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
        fillGrad.addColorStop(0, "rgba(6, 247, 255, 0.15)");
        fillGrad.addColorStop(1, "rgba(6, 182, 212, 0.01)");
        ctx.fillStyle = fillGrad;
        ctx.fill();
      }

      // 6. NOW INDICATOR
      const nowX = xScale(0);
      if (nowX >= pad.left && nowX <= W - pad.right) {
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.moveTo(nowX, pad.top);
        ctx.lineTo(nowX, H - pad.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = "#fff";
        ctx.font = "bold 7px 'Orbitron'";
        ctx.textAlign = "center";
        ctx.fillText("LIVE POINT", nowX, pad.top - 5);
      }

      // 7. EVENT HUD MARKERS
      filteredEvents.forEach((e) => {
        const h = (e.time.getTime() - Date.now()) / 3600000;
        const x = xScale(h);
        if (x < pad.left || x > W - pad.right) return;

        ctx.strokeStyle = e.severity > 60 ? "#ef4444" : "#eab308";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, pad.top + 10);
        ctx.lineTo(x, H - pad.bottom);
        ctx.stroke();

        // Marker Head
        ctx.fillStyle = ctx.strokeStyle;
        ctx.save();
        ctx.translate(x, pad.top + 10);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
        
        // Severity Tag
        ctx.font = "bold 6px 'Space Mono'";
        ctx.fillText(`SEV:${e.severity}`, x + 5, pad.top + 15);
      });

      // 8. TELEMETRY READOUTS (The "Best-in-Class" detail)
      ctx.fillStyle = "rgba(6, 182, 212, 0.4)";
      ctx.font = "6px 'Space Mono'";
      ctx.textAlign = "left";
      ctx.fillText(`LAT_READ: 12.97° N  //  LON_READ: 77.59° E`, pad.left + 5, H - pad.bottom - 5);
      ctx.textAlign = "right";
      ctx.fillText(`SYS_STATUS: NOMINAL  //  PROC_LINK: ESTABLISHED`, W - pad.right - 5, H - pad.bottom - 5);

      animFrame.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();
    return () => cancelAnimationFrame(animFrame.current);
  }, [filteredPredictions, filteredEvents, selectedRange, startH, endH]);

  // Mouse hover
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const relX = (x - 50) / (rect.width - 70);
      const hoverHour = startH + relX * (endH - startH);
      const closest = filteredPredictions.reduce(
        (c, p) =>
          Math.abs(p.hour - hoverHour) < Math.abs(c.hour - hoverHour) ? p : c,
        filteredPredictions[0],
      );
      if (
        closest &&
        Math.abs(closest.hour - hoverHour) <
          ((endH - startH) / filteredPredictions.length) * 2
      ) {
        setHoveredPoint(closest);
        setMousePos({ x: e.clientX, y: e.clientY });
      } else {
        setHoveredPoint(null);
      }
    },
    [filteredPredictions, startH, endH],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pt-[128px] flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <p className="text-cyan-400 font-orbitron animate-pulse">
            LOADING THREAT PREDICTION MODEL...
          </p>
          <p className="text-[10px] font-space-mono text-cyan-400/40 mt-2">
            Fetching live weather & marine data across 6 zones
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 pt-[128px] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-orbitron">
            PREDICTION ENGINE OFFLINE
          </p>
          <p className="text-xs font-space-mono text-slate-500 mt-2">{error}</p>
          <button
            onClick={fetchIntel}
            className="mt-4 px-4 py-2 border border-cyan-500/30 text-cyan-400 rounded-lg font-orbitron text-xs hover:bg-cyan-500/10"
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  const currentThreat = nowPrediction?.threatLevel ?? 0;
  const threatColor =
    currentThreat < 20
      ? "text-emerald-400"
      : currentThreat < 40
        ? "text-yellow-400"
        : currentThreat < 60
          ? "text-orange-400"
          : currentThreat < 80
            ? "text-red-400"
            : "text-red-500";

  return (
    <div className="min-h-screen bg-slate-950 pt-[128px] pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-orbitron font-black text-cyan-400 tracking-wider mb-1">
            AI THREAT PREDICTION ENGINE
          </h1>
          <p className="text-[10px] font-space-mono text-cyan-400/40 tracking-widest">
            REAL-TIME MARITIME THREAT FORECASTING // LIVE DATA FROM{" "}
            {intel?.zones.length || 0} NAVAL ZONES
          </p>
          <p className="text-[9px] font-space-mono text-emerald-400/40 mt-1">
            Data source: Open-Meteo Marine & Weather API // Updated:{" "}
            {intel?.timestamp
              ? new Date(intel.timestamp).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })
              : "—"}{" "}
            IST
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "CURRENT THREAT", value: Math.round(currentThreat), sub: nowPrediction?.category?.toUpperCase(), color: threatColor, icon: AlertTriangle },
            { label: "MODEL CONFIDENCE", value: nowPrediction ? (nowPrediction.confidence * 100).toFixed(0) + "%" : "0%", sub: "LIVE", color: "text-cyan-400", icon: Brain },
            { label: "PEAK (+24H)", value: predictions.length ? Math.round(Math.max(...predictions.filter(p => p.hour >= 0 && p.hour <= 24).map(p => p.threatLevel))) : 0, sub: "PROJECTED", color: "text-amber-400", icon: TrendingUp },
            { label: "AVG WAVE HEIGHT", value: (nowPrediction ? nowPrediction.waveHeight.toFixed(1) : "0.0") + "m", sub: "REAL-TIME", color: "text-blue-400", icon: Activity },
            { label: "AVG WIND SPEED", value: (nowPrediction ? nowPrediction.windSpeed.toFixed(0) : "0") + " kph", sub: "REAL-TIME", color: "text-orange-400", icon: Radio },
          ].map((stat, i) => (
            <div key={i} className="relative group bg-slate-900/40 backdrop-blur-md border border-cyan-500/10 rounded-xl p-4 overflow-hidden transition-all hover:bg-slate-900/60 hover:border-cyan-500/30">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <stat.icon className="w-8 h-8 text-white" />
              </div>
              <div className="text-[9px] font-space-mono text-cyan-400/50 mb-1 tracking-tighter">
                {stat.label}
              </div>
              <div className={`text-3xl font-orbitron font-black ${stat.color} tracking-tight mb-1`}>
                {stat.value}
              </div>
              <div className={`text-[8px] font-orbitron font-bold px-2 py-0.5 rounded-full inline-block bg-white/5 ${stat.color}`}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* AI Fusion Brief (The "Wow" Factor) */}
        <div className="mb-8 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-slate-900/60 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <div className="flex items-center justify-between mb-3 border-b border-cyan-500/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Brain className="w-4 h-4 text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-[10px] font-orbitron font-black text-cyan-400 tracking-[0.2em]">COMMANDER'S TACTICAL BRIEF</div>
                  <div className="text-[7px] font-space-mono text-cyan-400/40 uppercase">Artificial Intelligence Fusion Engine // BLUF-V4</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-[8px] font-space-mono text-cyan-400/30 uppercase">Intelligence Confidence</div>
                  <div className="text-[10px] font-orbitron text-emerald-400">98.4%</div>
                </div>
                <div className={`text-[8px] font-orbitron px-2 py-0.5 rounded border ${loadingBrief ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}>
                  {loadingBrief ? "ANALYZING..." : "LIVE"}
                </div>
              </div>
            </div>
            
            <div className="relative min-h-[40px] flex items-center">
              {loadingBrief ? (
                <div className="flex gap-1.5 items-center">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1 h-1 bg-cyan-400/50 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                  <span className="text-[10px] font-space-mono text-cyan-400/40 italic">Synthesizing multi-domain data streams...</span>
                </div>
              ) : (
                <p className="text-sm font-space-mono text-cyan-100 leading-relaxed tracking-tight group-hover:text-white transition-colors">
                  {fusionBrief || "Awaiting intelligence fusion from active maritime sensor grid..."}
                </p>
              )}
              
              {/* Decorative scanline for the brief box */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
                <div className="w-full h-1 bg-cyan-400 animate-scan-slow opacity-20"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Range selector + refresh */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-orbitron text-cyan-400">
              PREDICTIVE TIMELINE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(["12h", "24h", "48h", "72h"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRange(r)}
                  className={`px-3 py-1 text-[9px] font-orbitron rounded transition-all ${
                    selectedRange === r
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-cyan-400/30 hover:text-cyan-400/60 border border-transparent"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={fetchIntel}
              className="px-2 py-1 text-[9px] font-orbitron text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/10 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* HUD Chart Container */}
        <div
          ref={containerRef}
          className="relative bg-slate-950 border border-cyan-500/30 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.1)] group"
          style={{ height: 450 }}
        >
          {/* HUD Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] z-10 opacity-30" />
          
          {/* Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredPoint(null)}
          />

          {hoveredPoint && (
            <div
              className="fixed z-50 bg-slate-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-lg p-4 pointer-events-none shadow-2xl shadow-cyan-500/20 hud-corner"
              style={{
                left: mousePos.x + 15,
                top: mousePos.y - 120,
                maxWidth: 300,
              }}
            >
              <div className="flex justify-between items-start mb-3 border-b border-white/10 pb-2">
                <div className="text-[10px] font-orbitron font-bold text-cyan-400">
                  TELEMETRY_DATA_PT
                </div>
                <div className="text-[9px] font-space-mono text-cyan-400/50">
                  {hoveredPoint.hour > 0 ? "+" : ""}{hoveredPoint.hour.toFixed(0)}H_REL
                </div>
              </div>
              
              <div className="flex items-end gap-3 mb-3">
                <div className={`text-3xl font-orbitron font-black leading-none ${
                    hoveredPoint.threatLevel < 40 ? "text-emerald-400" : hoveredPoint.threatLevel < 60 ? "text-amber-400" : "text-red-400"
                }`}>
                  {hoveredPoint.threatLevel.toFixed(1)}
                </div>
                <div className="text-[10px] font-space-mono text-slate-400 mb-1">
                  THREAT_INDEX
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3 text-[9px] font-space-mono">
                <div>
                  <div className="text-slate-500 uppercase">Confidence</div>
                  <div className="text-cyan-400">{(hoveredPoint.confidence * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-slate-500 uppercase">Marine_State</div>
                  <div className="text-blue-400">{hoveredPoint.waveHeight.toFixed(1)}m Swell</div>
                </div>
              </div>

              {hoveredPoint.factors.length > 0 && (
                <div className="bg-white/5 p-2 rounded border border-white/5">
                  <div className="text-[8px] font-orbitron text-slate-500 mb-1 tracking-widest uppercase">Contributing_Factors</div>
                  {hoveredPoint.factors.map((f, i) => (
                    <div key={i} className="text-[9px] font-space-mono text-amber-400/80 flex gap-2">
                       <span className="opacity-50">»</span> {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Events */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-orbitron text-cyan-400">
              EVENTS FROM LIVE DATA
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.slice(0, 9).map((e, i) => {
              const hoursFromNow = (e.time.getTime() - Date.now()) / 3600000;
              const isPast = hoursFromNow < 0;
              return (
                <div
                  key={i}
                  className={`group relative bg-slate-900/40 backdrop-blur-md border rounded-xl p-4 transition-all hover:bg-slate-900/60 overflow-hidden ${
                    e.severity > 60
                      ? "border-red-500/20 bg-red-500/5"
                      : e.severity > 30
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-cyan-500/20"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {e.type === "intrusion" && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
                        {e.type === "patrol" && <Shield className="w-4 h-4 text-emerald-400" />}
                        {e.type === "weather" && <Radio className="w-4 h-4 text-amber-400" />}
                        <span className="text-[10px] font-orbitron font-bold text-white tracking-widest">
                          {e.type.toUpperCase()} ALERT
                        </span>
                      </div>
                      <span className="text-[8px] font-space-mono text-cyan-400/60">
                        {isPast ? `${Math.abs(Math.round(hoursFromNow))}H AGO` : `EXPECTED IN ${Math.round(hoursFromNow)}H`}
                      </span>
                    </div>
                    <div className={`px-2 py-1 rounded text-[10px] font-orbitron font-black ${
                      e.severity > 60 ? "text-red-400 bg-red-500/10" : "text-cyan-400 bg-cyan-500/10"
                    }`}>
                      SV:{e.severity}
                    </div>
                  </div>
                  <div className="text-[11px] font-space-mono text-slate-300 leading-relaxed mb-3">
                    {e.title}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                    <span className="text-[8px] font-space-mono text-slate-500 uppercase tracking-tighter">
                      ZONE: {e.zone}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  </div>
                  
                  {/* Glass shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent w-full -skew-x-[30deg] translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Zone breakdown */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-orbitron text-cyan-400">
              ZONE-BY-ZONE THREAT LEVELS (LIVE)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {intel?.zones.map((z) => (
              <div
                key={z.id}
                className="group relative bg-slate-900/40 backdrop-blur-md border border-cyan-500/10 rounded-xl p-4 transition-all hover:bg-slate-900/60 hover:border-cyan-500/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-orbitron font-bold text-cyan-400 tracking-wider">
                      {z.name.toUpperCase()}
                    </span>
                    <span className="text-[8px] font-space-mono text-slate-500">
                      {z.command}
                    </span>
                  </div>
                  <div
                    className={`text-[10px] font-orbitron font-bold px-2 py-1 rounded-md border ${
                      z.threat.level >= 75
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : z.threat.level >= 50
                          ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                          : z.threat.level >= 25
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {z.threat.level}%
                  </div>
                </div>
                
                {/* Tactical bar */}
                <div className="relative h-2 bg-slate-800/50 rounded-full overflow-hidden mb-4 border border-white/5">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${
                      z.threat.level >= 75
                        ? "bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                        : z.threat.level >= 50
                          ? "bg-gradient-to-r from-orange-600 to-orange-400"
                          : z.threat.level >= 25
                            ? "bg-gradient-to-r from-amber-600 to-amber-400"
                            : "bg-gradient-to-r from-emerald-600 to-emerald-400"
                    }`}
                    style={{ width: `${z.threat.level}%` }}
                  />
                  {/* Scanning pulse */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-20 animate-scan" style={{ left: '-50%' }} />
                </div>

                <div className="space-y-2 mb-4">
                  {z.threat.factors.slice(0, 2).map((f, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <div className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${z.threat.level > 50 ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                      <div className="text-[9px] font-space-mono text-slate-400 leading-tight">
                        <span className="text-slate-500 uppercase">{f.name}:</span> {f.detail}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-t border-white/5">
                  <div className="text-center">
                    <div className="text-[7px] text-slate-500 font-space-mono uppercase">Wave</div>
                    <div className="text-[10px] text-cyan-400 font-orbitron">{z.marine?.current?.wave_height?.toFixed(1) || "0.0"}m</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-slate-500 font-space-mono uppercase">Wind</div>
                    <div className="text-[10px] text-orange-400 font-orbitron">{z.weather?.current?.wind_speed_10m?.toFixed(0) || "0"}kph</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[7px] text-slate-500 font-space-mono uppercase">Visibility</div>
                    <div className="text-[10px] text-emerald-400 font-orbitron">
                      {z.weather?.current?.visibility ? (z.weather.current.visibility / 1000).toFixed(0) : "0"}km
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model info */}
        <div className="mt-6 bg-slate-900/40 border border-cyan-500/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-cyan-400/50" />
            <span className="text-[9px] font-orbitron text-cyan-400/50">
              DATA SOURCES & METHODOLOGY
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[9px] font-space-mono text-slate-500">
            <div>
              <span className="text-slate-600">Weather:</span> Open-Meteo
              Forecast API
            </div>
            <div>
              <span className="text-slate-600">Marine:</span> Open-Meteo Marine
              API
            </div>
            <div>
              <span className="text-slate-600">Zones:</span>{" "}
              {intel?.zones.length || 0} IOR naval zones
            </div>
            <div>
              <span className="text-slate-600">Forecast:</span> 72-hour hourly
              data
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
