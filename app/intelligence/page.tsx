"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SecurityFooter } from "@/components/security-classified-bar";
import { SonarGridBackground } from "@/components/sonar-grid-background";
import {
  Shield,
  Radar,
  Activity,
  Waves,
  Wind,
  Eye,
  Thermometer,
  Cloud,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  Anchor,
  Navigation,
  Compass,
  Globe,
  Globe2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Crosshair,
  Radio,
  Zap,
  Target,
  BarChart3,
} from "lucide-react";
import dynamic from "next/dynamic";
const GlobeWarRoom = dynamic(() => import("@/components/globe-war-room"), {
  ssr: false,
  loading: () => <div className="h-[600px] flex items-center justify-center bg-slate-900/50 rounded-xl animate-pulse text-cyan-500 font-orbitron">LOADING TACTICAL WAR ROOM...</div>
});

interface ZoneData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  command: string;
  hq: string;
  marine: any;
  weather: any;
  threat: {
    level: number;
    category: string;
    factors: { name: string; score: number; detail: string }[];
  };
  ops: {
    operation: string;
    icon: string;
    ready: boolean;
    confidence: number;
    conditions: string;
    status: string;
  }[];
}

interface IntelData {
  timestamp: string;
  zones: ZoneData[];
  brief: string;
  summary: {
    totalZones: number;
    criticalZones: number;
    highZones: number;
    moderateZones: number;
    lowZones: number;
    avgThreat: number;
    overallReadiness: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  OPTIMAL: "text-emerald-400 border-emerald-400/50 bg-emerald-400/10",
  FEASIBLE: "text-cyan-400 border-cyan-400/50 bg-cyan-400/10",
  CAUTION: "text-amber-400 border-amber-400/50 bg-amber-400/10",
  RESTRICTED: "text-orange-400 border-orange-400/50 bg-orange-400/10",
  "NO-GO": "text-red-400 border-red-400/50 bg-red-400/10",
};

const THREAT_COLORS: Record<string, string> = {
  LOW: "from-emerald-500 to-green-500",
  MODERATE: "from-amber-500 to-yellow-500",
  HIGH: "from-orange-500 to-red-500",
  CRITICAL: "from-red-600 to-rose-600",
};

const THREAT_BORDER: Record<string, string> = {
  LOW: "border-emerald-500/40",
  MODERATE: "border-amber-500/40",
  HIGH: "border-orange-500/40",
  CRITICAL: "border-red-500/40",
};

const THREAT_GLOW: Record<string, string> = {
  LOW: "shadow-emerald-500/20",
  MODERATE: "shadow-amber-500/20",
  HIGH: "shadow-orange-500/20",
  CRITICAL: "shadow-red-500/20",
};

const OPS_ICONS: Record<string, React.ReactNode> = {
  submarine: <Navigation className="w-4 h-4" />,
  ship: <Anchor className="w-4 h-4" />,
  helicopter: <Wind className="w-4 h-4" />,
  diver: <Waves className="w-4 h-4" />,
  mine: <Target className="w-4 h-4" />,
  assault: <Shield className="w-4 h-4" />,
};

function ThreatGauge({ level, category }: { level: number; category: string }) {
  const rotation = (level / 100) * 180 - 90;
  return (
    <div className="relative w-36 h-20 mx-auto">
      {/* Gauge background arc */}
      <svg viewBox="0 0 120 70" className="w-full h-full">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="33%" stopColor="#f59e0b" />
            <stop offset="66%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          stroke="rgba(100,200,255,0.1)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(level / 100) * 157} 157`}
        />
        {/* Needle */}
        <line
          x1="60"
          y1="65"
          x2="60"
          y2="20"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${rotation} 60 65)`}
          style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.5))" }}
        />
        <circle cx="60" cy="65" r="4" fill="white" opacity="0.8" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <span className="text-lg font-orbitron font-bold text-white">
          {level}%
        </span>
      </div>
    </div>
  );
}

function AnimatedNumber({
  value,
  duration = 1500,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}</>;
}

function ScanLine() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent animate-scan-down" />
    </div>
  );
}

export default function IntelligencePage() {
  const [data, setData] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showBrief, setShowBrief] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "zones" | "ops" | "brief" | "war-room"
  >("overview");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const briefRef = useRef<HTMLPreElement>(null);

  const fetchIntelligence = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/intelligence");
      if (!res.ok) throw new Error("Failed to fetch intelligence data");
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIntelligence();
    const interval = setInterval(() => fetchIntelligence(true), 10 * 60 * 1000); // auto-refresh 10min
    return () => clearInterval(interval);
  }, [fetchIntelligence]);

  const selectedZoneData = data?.zones.find((z) => z.id === selectedZone);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <SonarGridBackground />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-2 border-cyan-500/30 flex items-center justify-center">
              <Radar
                className="w-12 h-12 text-cyan-400 animate-spin"
                style={{ animationDuration: "3s" }}
              />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-orbitron text-cyan-300 mb-2">
              INITIALIZING INTELLIGENCE SYSTEMS
            </h2>
            <p className="text-sm text-cyan-500/60 font-space-mono">
              Establishing secure connection to maritime data networks...
            </p>
            <div className="mt-4 flex items-center gap-2 justify-center">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="text-xs text-cyan-400/70 font-space-mono">
                Fetching real-time data from 6 operational zones
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <SonarGridBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <AlertTriangle className="w-16 h-16 text-red-400" />
          <h2 className="text-xl font-orbitron text-red-300">
            INTELLIGENCE LINK DISRUPTED
          </h2>
          <p className="text-sm text-red-400/60 font-space-mono">{error}</p>
          <Button
            onClick={() => fetchIntelligence()}
            className="mt-4 bg-cyan-600 hover:bg-cyan-500 font-orbitron text-xs"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> RE-ESTABLISH CONNECTION
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <SonarGridBackground />
      <ScanLine />

      {/* Page Content */}
      <div className="relative z-10 pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        {/* ═══════════════ HEADER ═══════════════ */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-space-mono text-cyan-300 uppercase tracking-widest">
              Live Intelligence Feed •{" "}
              {lastRefresh?.toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour12: false,
              })}{" "}
              IST
            </span>
            <button
              onClick={() => fetchIntelligence(true)}
              disabled={refreshing}
              className="ml-2 text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-orbitron font-black tracking-wider mb-3"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            AI MARITIME INTELLIGENCE CENTER
          </h1>
          <p className="text-cyan-500/60 font-space-mono text-sm max-w-2xl mx-auto">
            Real-time operational intelligence for Indian Naval Command •
            Powered by MarEye AI Defense System
          </p>
        </div>

        {/* ═══════════════ TAB BAR ═══════════════ */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-cyan-500/30 bg-slate-900/80 backdrop-blur-sm p-1 gap-1">
            {(["overview", "zones", "ops", "brief", "war-room"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md font-orbitron text-xs uppercase tracking-wider transition-all duration-300 ${
                  activeTab === tab
                    ? tab === "war-room"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10"
                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
                    : "text-cyan-500/50 hover:text-cyan-400 hover:bg-slate-800/50"
                }`}
              >
                {tab === "overview" && (
                  <Globe className="w-3 h-3 inline mr-2" />
                )}
                {tab === "zones" && <MapPin className="w-3 h-3 inline mr-2" />}
                {tab === "ops" && <Shield className="w-3 h-3 inline mr-2" />}
                {tab === "brief" && (
                  <FileText className="w-3 h-3 inline mr-2" />
                )}
                {tab === "war-room" && (
                  <Globe2 className="w-3 h-3 inline mr-2" />
                )}
                {tab === "war-room" ? "WAR ROOM" : tab}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                {
                  label: "Active Zones",
                  value: data.summary.totalZones,
                  icon: <Globe className="w-5 h-5" />,
                  color: "cyan",
                },
                {
                  label: "Avg Threat",
                  value: `${data.summary.avgThreat}%`,
                  icon: <AlertTriangle className="w-5 h-5" />,
                  color:
                    data.summary.avgThreat > 50
                      ? "red"
                      : data.summary.avgThreat > 25
                        ? "amber"
                        : "emerald",
                },
                {
                  label: "Critical Zones",
                  value: data.summary.criticalZones,
                  icon: <XCircle className="w-5 h-5" />,
                  color: "red",
                },
                {
                  label: "High Threat",
                  value: data.summary.highZones,
                  icon: <AlertTriangle className="w-5 h-5" />,
                  color: "orange",
                },
                {
                  label: "Fleet Readiness",
                  value: `${data.summary.overallReadiness}%`,
                  icon: <CheckCircle2 className="w-5 h-5" />,
                  color: "emerald",
                },
                {
                  label: "Low Threat",
                  value: data.summary.lowZones,
                  icon: <Shield className="w-5 h-5" />,
                  color: "emerald",
                },
              ].map((stat, i) => (
                <Card
                  key={i}
                  className="bg-slate-900/60 border-cyan-500/20 backdrop-blur-sm hover:border-cyan-400/40 transition-all duration-300"
                >
                  <CardContent className="p-4 text-center">
                    <div
                      className={`text-${stat.color}-400 mx-auto mb-2 flex justify-center`}
                    >
                      {stat.icon}
                    </div>
                    <p className="text-2xl font-orbitron font-bold text-white">
                      {stat.value}
                    </p>
                    <p className="text-[10px] text-cyan-500/60 font-space-mono uppercase tracking-wider mt-1">
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Zone Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {data.zones.map((zone) => (
                <Card
                  key={zone.id}
                  className={`bg-slate-900/70 backdrop-blur-sm cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-lg ${THREAT_BORDER[zone.threat.category]} ${THREAT_GLOW[zone.threat.category]} ${selectedZone === zone.id ? "ring-2 ring-cyan-400/50" : ""}`}
                  onClick={() => {
                    setSelectedZone(zone.id);
                    setActiveTab("zones");
                  }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Anchor className="w-4 h-4 text-cyan-400" />
                        <CardTitle className="text-sm font-orbitron text-cyan-300">
                          {zone.name}
                        </CardTitle>
                      </div>
                      <Badge
                        className={`text-[10px] font-orbitron bg-gradient-to-r ${THREAT_COLORS[zone.threat.category]} border-0 text-white`}
                      >
                        {zone.threat.category}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-cyan-500/50 font-space-mono">
                      {zone.command} • HQ: {zone.hq}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <Waves className="w-3 h-3 mx-auto text-cyan-400/60 mb-1" />
                        <p className="text-xs font-orbitron text-white">
                          {zone.marine?.current?.wave_height ?? "—"}m
                        </p>
                        <p className="text-[8px] text-cyan-500/40 font-space-mono">
                          WAVES
                        </p>
                      </div>
                      <div className="text-center">
                        <Wind className="w-3 h-3 mx-auto text-cyan-400/60 mb-1" />
                        <p className="text-xs font-orbitron text-white">
                          {zone.weather?.current?.wind_speed_10m ?? "—"}
                        </p>
                        <p className="text-[8px] text-cyan-500/40 font-space-mono">
                          WIND KM/H
                        </p>
                      </div>
                      <div className="text-center">
                        <Thermometer className="w-3 h-3 mx-auto text-cyan-400/60 mb-1" />
                        <p className="text-xs font-orbitron text-white">
                          {zone.weather?.current?.temperature_2m ?? "—"}°
                        </p>
                        <p className="text-[8px] text-cyan-500/40 font-space-mono">
                          TEMP
                        </p>
                      </div>
                    </div>

                    {/* Threat bar */}
                    <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${THREAT_COLORS[zone.threat.category]} transition-all duration-1000`}
                        style={{ width: `${zone.threat.level}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[8px] text-cyan-500/40 font-space-mono">
                        THREAT {zone.threat.level}%
                      </span>
                      <span className="text-[8px] text-cyan-500/40 font-space-mono">
                        {zone.ops.filter((o) => o.ready).length}/
                        {zone.ops.length} OPS READY
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Overall Threat Gauge */}
            <Card className="bg-slate-900/70 border-cyan-500/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-center font-orbitron text-cyan-300 text-lg flex items-center justify-center gap-2">
                  <Crosshair className="w-5 h-5" />
                  OVERALL MARITIME THREAT ASSESSMENT
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ThreatGauge
                  level={data.summary.avgThreat}
                  category={
                    data.summary.avgThreat < 25
                      ? "LOW"
                      : data.summary.avgThreat < 50
                        ? "MODERATE"
                        : data.summary.avgThreat < 75
                          ? "HIGH"
                          : "CRITICAL"
                  }
                />
                <p className="text-center text-xs text-cyan-500/60 font-space-mono mt-4">
                  Aggregated threat level across {data.summary.totalZones}{" "}
                  operational zones in Indian Ocean Region
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════ ZONES TAB ═══════════════ */}
        {activeTab === "zones" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Zone selector */}
            <div className="flex flex-wrap gap-2 justify-center">
              {data.zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(z.id)}
                  className={`px-3 py-2 rounded-lg border font-orbitron text-xs transition-all ${
                    selectedZone === z.id
                      ? `${THREAT_BORDER[z.threat.category]} bg-cyan-500/10 text-cyan-300`
                      : "border-slate-700 text-cyan-500/50 hover:border-cyan-500/30 hover:text-cyan-400"
                  }`}
                >
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {z.name}
                  <Badge
                    className={`ml-2 text-[8px] bg-gradient-to-r ${THREAT_COLORS[z.threat.category]} border-0 text-white`}
                  >
                    {z.threat.level}%
                  </Badge>
                </button>
              ))}
            </div>

            {selectedZoneData ? (
              <div className="space-y-6">
                {/* Zone Header */}
                <Card
                  className={`bg-slate-900/70 backdrop-blur-sm ${THREAT_BORDER[selectedZoneData.threat.category]}`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={`w-10 h-10 rounded-full bg-gradient-to-br ${THREAT_COLORS[selectedZoneData.threat.category]} flex items-center justify-center`}
                          >
                            <Anchor className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl font-orbitron font-bold text-white">
                              {selectedZoneData.name}
                            </h2>
                            <p className="text-xs text-cyan-500/60 font-space-mono">
                              {selectedZoneData.command} • HQ:{" "}
                              {selectedZoneData.hq}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-2">
                          <span className="text-[10px] text-cyan-400/60 font-space-mono flex items-center gap-1">
                            <Compass className="w-3 h-3" />{" "}
                            {selectedZoneData.lat}°N, {selectedZoneData.lon}°E
                          </span>
                          <span className="text-[10px] text-cyan-400/60 font-space-mono flex items-center gap-1">
                            <Radio className="w-3 h-3" /> ACTIVE MONITORING
                          </span>
                        </div>
                      </div>
                      <ThreatGauge
                        level={selectedZoneData.threat.level}
                        category={selectedZoneData.threat.category}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Weather & Sea State */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sea State */}
                  <Card className="bg-slate-900/70 border-cyan-500/20 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-sm font-orbitron text-cyan-300 flex items-center gap-2">
                        <Waves className="w-4 h-4" /> SEA STATE ANALYSIS
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          {
                            label: "Wave Height",
                            value: `${selectedZoneData.marine?.current?.wave_height ?? "N/A"}m`,
                            icon: <Waves className="w-4 h-4" />,
                          },
                          {
                            label: "Wave Period",
                            value: `${selectedZoneData.marine?.current?.wave_period ?? "N/A"}s`,
                            icon: <Activity className="w-4 h-4" />,
                          },
                          {
                            label: "Wave Direction",
                            value: `${selectedZoneData.marine?.current?.wave_direction ?? "N/A"}°`,
                            icon: <Compass className="w-4 h-4" />,
                          },
                          {
                            label: "Swell Height",
                            value: `${selectedZoneData.marine?.current?.swell_wave_height ?? "N/A"}m`,
                            icon: <Waves className="w-4 h-4" />,
                          },
                          {
                            label: "Swell Period",
                            value: `${selectedZoneData.marine?.current?.swell_wave_period ?? "N/A"}s`,
                            icon: <Clock className="w-4 h-4" />,
                          },
                          {
                            label: "Swell Direction",
                            value: `${selectedZoneData.marine?.current?.swell_wave_direction ?? "N/A"}°`,
                            icon: <Navigation className="w-4 h-4" />,
                          },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-cyan-500/10"
                          >
                            <div className="text-cyan-400/60">{item.icon}</div>
                            <div>
                              <p className="text-xs font-orbitron text-white">
                                {item.value}
                              </p>
                              <p className="text-[9px] text-cyan-500/40 font-space-mono uppercase">
                                {item.label}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Weather */}
                  <Card className="bg-slate-900/70 border-cyan-500/20 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-sm font-orbitron text-cyan-300 flex items-center gap-2">
                        <Cloud className="w-4 h-4" /> WEATHER CONDITIONS
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          {
                            label: "Temperature",
                            value: `${selectedZoneData.weather?.current?.temperature_2m ?? "N/A"}°C`,
                            icon: <Thermometer className="w-4 h-4" />,
                          },
                          {
                            label: "Wind Speed",
                            value: `${selectedZoneData.weather?.current?.wind_speed_10m ?? "N/A"} km/h`,
                            icon: <Wind className="w-4 h-4" />,
                          },
                          {
                            label: "Wind Gusts",
                            value: `${selectedZoneData.weather?.current?.wind_gusts_10m ?? "N/A"} km/h`,
                            icon: <Zap className="w-4 h-4" />,
                          },
                          {
                            label: "Wind Direction",
                            value: `${selectedZoneData.weather?.current?.wind_direction_10m ?? "N/A"}°`,
                            icon: <Compass className="w-4 h-4" />,
                          },
                          {
                            label: "Cloud Cover",
                            value: `${selectedZoneData.weather?.current?.cloud_cover ?? "N/A"}%`,
                            icon: <Cloud className="w-4 h-4" />,
                          },
                          {
                            label: "Humidity",
                            value: `${selectedZoneData.weather?.current?.relative_humidity_2m ?? "N/A"}%`,
                            icon: <Waves className="w-4 h-4" />,
                          },
                          {
                            label: "Pressure",
                            value: `${selectedZoneData.weather?.current?.surface_pressure ?? "N/A"} hPa`,
                            icon: <BarChart3 className="w-4 h-4" />,
                          },
                          {
                            label: "Precipitation",
                            value: `${selectedZoneData.weather?.current?.precipitation ?? "0"} mm`,
                            icon: <Cloud className="w-4 h-4" />,
                          },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-cyan-500/10"
                          >
                            <div className="text-cyan-400/60">{item.icon}</div>
                            <div>
                              <p className="text-xs font-orbitron text-white">
                                {item.value}
                              </p>
                              <p className="text-[9px] text-cyan-500/40 font-space-mono uppercase">
                                {item.label}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Threat Factors */}
                <Card className="bg-slate-900/70 border-cyan-500/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-orbitron text-cyan-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> AI THREAT FACTOR
                      ANALYSIS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedZoneData.threat.factors.map((factor, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-orbitron text-cyan-300">
                              {factor.name}
                            </span>
                            <span className="text-xs font-orbitron text-white">
                              {factor.score}/30
                            </span>
                          </div>
                          <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${
                                factor.score < 8
                                  ? "bg-emerald-500"
                                  : factor.score < 15
                                    ? "bg-amber-500"
                                    : factor.score < 22
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                              }`}
                              style={{ width: `${(factor.score / 30) * 100}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-cyan-500/50 font-space-mono">
                            {factor.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Operational Readiness for selected zone */}
                <Card className="bg-slate-900/70 border-cyan-500/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-orbitron text-cyan-300 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> ZONE OPERATIONAL READINESS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedZoneData.ops.map((op, i) => (
                        <div
                          key={i}
                          className={`p-4 rounded-lg border ${STATUS_COLORS[op.status]} bg-opacity-50`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="text-current">
                              {OPS_ICONS[op.icon]}
                            </div>
                            <span className="text-xs font-orbitron font-bold">
                              {op.operation}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              className={`text-[9px] font-orbitron ${STATUS_COLORS[op.status]} border`}
                            >
                              {op.status}
                            </Badge>
                            <span className="text-xs font-space-mono">
                              {Math.round(op.confidence)}%
                            </span>
                          </div>
                          <div className="relative h-1.5 rounded-full bg-slate-800/50 overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full bg-current transition-all duration-1000"
                              style={{
                                width: `${Math.max(0, Math.min(100, op.confidence))}%`,
                              }}
                            />
                          </div>
                          <p className="text-[9px] mt-2 opacity-70 font-space-mono">
                            {op.conditions}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-20">
                <MapPin className="w-12 h-12 text-cyan-500/30 mx-auto mb-4" />
                <p className="text-cyan-500/40 font-orbitron text-sm">
                  SELECT AN OPERATIONAL ZONE FOR DETAILED ANALYSIS
                </p>
                <p className="text-cyan-500/30 font-space-mono text-xs mt-2">
                  Click any zone above to view detailed intelligence
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ OPS READINESS TAB ═══════════════ */}
        {activeTab === "ops" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="bg-slate-900/70 border-cyan-500/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-center font-orbitron text-cyan-300 text-lg flex items-center justify-center gap-2">
                  <Shield className="w-5 h-5" /> FLEET OPERATIONAL READINESS
                  MATRIX
                </CardTitle>
                <p className="text-center text-[10px] text-cyan-500/50 font-space-mono">
                  Real-time operational capability assessment across all Indian
                  Navy zones
                </p>
              </CardHeader>
              <CardContent>
                {/* Matrix header */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-cyan-500/20">
                        <th className="text-left py-3 px-2 font-orbitron text-cyan-400 text-[10px]">
                          OPERATION
                        </th>
                        {data.zones.map((z) => (
                          <th
                            key={z.id}
                            className="text-center py-3 px-2 font-orbitron text-cyan-400 text-[10px] min-w-[100px]"
                          >
                            {z.name.split(" ")[0].toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.zones[0]?.ops.map((_, opIndex) => (
                        <tr
                          key={opIndex}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              {OPS_ICONS[data.zones[0].ops[opIndex].icon]}
                              <span className="font-orbitron text-white text-[10px]">
                                {data.zones[0].ops[opIndex].operation}
                              </span>
                            </div>
                          </td>
                          {data.zones.map((zone) => {
                            const op = zone.ops[opIndex];
                            return (
                              <td
                                key={zone.id}
                                className="text-center py-3 px-2"
                              >
                                <Badge
                                  className={`text-[8px] font-orbitron ${STATUS_COLORS[op.status]} border`}
                                >
                                  {op.status}
                                </Badge>
                                <p className="text-[8px] text-cyan-500/40 font-space-mono mt-1">
                                  {Math.round(op.confidence)}%
                                </p>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-6 pt-4 border-t border-cyan-500/10">
                  {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <div key={status} className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${color.includes("emerald") ? "bg-emerald-400" : color.includes("cyan") ? "bg-cyan-400" : color.includes("amber") ? "bg-amber-400" : color.includes("orange") ? "bg-orange-400" : "bg-red-400"}`}
                      />
                      <span className="text-[9px] font-space-mono text-cyan-500/50">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Per-zone readiness summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.zones.map((zone) => {
                const readyCount = zone.ops.filter((o) => o.ready).length;
                const readiness = Math.round(
                  (readyCount / zone.ops.length) * 100,
                );
                return (
                  <Card
                    key={zone.id}
                    className={`bg-slate-900/60 border-cyan-500/20 backdrop-blur-sm hover:border-cyan-400/30 transition-all`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Anchor className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-orbitron text-cyan-300">
                            {zone.name}
                          </span>
                        </div>
                        <span
                          className={`text-lg font-orbitron font-bold ${readiness > 70 ? "text-emerald-400" : readiness > 40 ? "text-amber-400" : "text-red-400"}`}
                        >
                          {readiness}%
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${readiness > 70 ? "bg-emerald-500" : readiness > 40 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${readiness}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {zone.ops.map((op, i) => (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded flex items-center justify-center ${op.ready ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                            title={`${op.operation}: ${op.status}`}
                          >
                            {OPS_ICONS[op.icon]}
                          </div>
                        ))}
                      </div>
                      <p className="text-[8px] text-cyan-500/40 font-space-mono mt-2">
                        {readyCount}/{zone.ops.length} operations feasible
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════ INTEL BRIEF TAB ═══════════════ */}
        {activeTab === "brief" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="bg-slate-900/70 border-amber-500/30 backdrop-blur-sm shadow-lg shadow-amber-500/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-orbitron text-amber-300 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> AI-GENERATED INTELLIGENCE
                    BRIEF
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="text-[8px] font-orbitron bg-red-600 border-0 text-white animate-pulse">
                      SECRET
                    </Badge>
                    <Badge className="text-[8px] font-orbitron bg-amber-600/30 border border-amber-500/50 text-amber-300">
                      NOFORN
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-[10px] text-amber-400/60 font-space-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Generated:{" "}
                    {lastRefresh?.toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      hour12: false,
                    })}{" "}
                    IST
                  </span>
                  <span className="text-[10px] text-amber-400/60 font-space-mono flex items-center gap-1">
                    <Zap className="w-3 h-3" /> AI Confidence: HIGH
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
                  <pre
                    ref={briefRef}
                    className="text-[11px] text-cyan-300/80 font-space-mono whitespace-pre-wrap leading-relaxed p-6 bg-slate-950/50 rounded-lg border border-amber-500/20 max-h-[600px] overflow-y-auto custom-scrollbar"
                  >
                    {data.brief}
                  </pre>
                  <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-amber-500/5 to-transparent pointer-events-none" />
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-amber-500/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-cyan-500/50 font-space-mono">
                      Auto-refreshes every 10 minutes
                    </span>
                  </div>
                  <Button
                    onClick={() => fetchIntelligence(true)}
                    size="sm"
                    disabled={refreshing}
                    className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 font-orbitron text-[10px]"
                  >
                    <RefreshCw
                      className={`w-3 h-3 mr-1 ${refreshing ? "animate-spin" : ""}`}
                    />
                    REFRESH BRIEF
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick zone summary below the brief */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {data.zones.map((zone) => (
                <Card
                  key={zone.id}
                  className={`bg-slate-900/50 ${THREAT_BORDER[zone.threat.category]} backdrop-blur-sm`}
                >
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-orbitron text-cyan-300 mb-1">
                      {zone.name.split(" ").slice(0, 2).join(" ")}
                    </p>
                    <p
                      className={`text-lg font-orbitron font-bold ${
                        zone.threat.category === "LOW"
                          ? "text-emerald-400"
                          : zone.threat.category === "MODERATE"
                            ? "text-amber-400"
                            : zone.threat.category === "HIGH"
                              ? "text-orange-400"
                              : "text-red-400"
                      }`}
                    >
                      {zone.threat.level}%
                    </p>
                    <Badge
                      className={`text-[7px] font-orbitron bg-gradient-to-r ${THREAT_COLORS[zone.threat.category]} border-0 text-white mt-1`}
                    >
                      {zone.threat.category}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════ WAR ROOM TAB ═══════════════ */}
        {activeTab === "war-room" && (
          <div className="animate-in fade-in duration-500 -mx-4 sm:-mx-6 lg:-mx-8">
            <GlobeWarRoom />
          </div>
        )}
      </div>

      <SecurityFooter />

      {/* Custom animations */}
      <style jsx>{`
        @keyframes scan-down {
          0% {
            top: -2px;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
        .animate-scan-down {
          animation: scan-down 8s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
