"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Radar,
  AlertTriangle,
  Eye,
  Map,
  Settings,
  Shield,
  Lock,
  Camera,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";
import { SonarGridBackground } from "./sonar-grid-background";
import { SecurityFooter } from "./security-classified-bar";
import DetectionView from "./detection-view";
import VesselTracking from "./vessel-tracking";
import ThreatAnalysis from "./threat-analysis";
import { getThreatStats, loadDetections } from "@/lib/detection-storage";
import { io, Socket } from "socket.io-client";

interface Detection {
  class: string;
  confidence: number;
  threat_level?: string;
  bbox: [number, number, number, number];
  color: string;
}

interface DetectionResult {
  originalImage: string;
  detectedImage: string;
  originalFileName?: string;
  detections: Detection[];
  processingTime: number;
  totalObjects: number;
  overallThreatLevel?: string;
  overallThreatScore?: number;
  threatCount?: number;
  timestamp?: Date;
}

export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState<
    "detection" | "vessels" | "threats" | "livefeed"
  >("detection");
  const [systemStatus] = useState("ACTIVE");
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>(
    () => {
      const stored = loadDetections();
      return stored.map((s) => ({
        originalImage: s.originalImage,
        detectedImage: s.detectedImage,
        detections: s.detections,
        processingTime: s.processingTime,
        totalObjects: s.totalObjects,
        overallThreatLevel: s.overallThreatLevel,
        overallThreatScore: s.overallThreatScore,
        threatCount: s.threatCount,
        timestamp: new Date(s.timestamp),
      }));
    },
  );

  const stats = getThreatStats();
  const totalThreats = stats.totalThreats;
  const avgAccuracy = stats.avgConfidence;
  const criticalThreats = stats.criticalThreats;

  const handleDetectionComplete = (results: DetectionResult[]) => {
    setDetectionResults(results);
  };

  return (
    <div className="relative w-full min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 overflow-hidden">
      <SonarGridBackground />

      <div className="relative z-10 pt-28">
        {/* Top navigation bar */}
        <nav className="border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-xl">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500 rounded-lg opacity-20 blur-lg" />
                  <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg border border-cyan-400/50 shadow-lg shadow-cyan-500/30">
                    <Radar className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold font-orbitron tracking-wider text-cyan-300 text-glow-cyan">
                    MAREYE
                  </h1>
                  <p className="text-xs font-space-mono text-slate-400">
                    Marine Threat Detection System
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-[9px] font-space-mono text-emerald-400/80 uppercase tracking-wider">
                    Encrypted Channel
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-40" />
                  </div>
                  <span className="text-xs font-space-mono text-emerald-400 font-bold">
                    SYSTEM {systemStatus}
                  </span>
                </div>
                <div className="h-8 w-px bg-cyan-500/20" />

                <div className="flex gap-8">
                  <div className="text-center">
                    <div className="text-sm font-space-mono text-cyan-300 font-orbitron">
                      {detectionResults.length}
                    </div>
                    <p className="text-xs text-slate-500 font-space-mono">
                      Scans
                    </p>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-sm font-space-mono font-orbitron ${totalThreats > 0 ? "text-red-400" : "text-emerald-400"}`}
                    >
                      {totalThreats}
                    </div>
                    <p className="text-xs text-slate-500 font-space-mono">
                      Threats
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-space-mono text-emerald-400">
                      {avgAccuracy}%
                    </div>
                    <p className="text-xs text-slate-500">Confidence</p>
                  </div>
                </div>
              </div>

              <button className="p-2 hover:bg-cyan-500/10 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-slate-400 hover:text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex border-t border-cyan-500/10 px-6">
            <TabButton
              active={activeTab === "detection"}
              onClick={() => setActiveTab("detection")}
              icon={<Eye className="w-4 h-4" />}
              label="Detection"
            />
            <TabButton
              active={activeTab === "vessels"}
              onClick={() => setActiveTab("vessels")}
              icon={<Map className="w-4 h-4" />}
              label="Threat Map"
              badge={totalThreats > 0 ? totalThreats : undefined}
            />
            <TabButton
              active={activeTab === "threats"}
              onClick={() => setActiveTab("threats")}
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Threat Timeline"
              badge={criticalThreats > 0 ? criticalThreats : undefined}
            />
            <TabButton
              active={activeTab === "livefeed"}
              onClick={() => setActiveTab("livefeed")}
              icon={<Camera className="w-4 h-4" />}
              label="Live Feed"
            />
          </div>
        </nav>

        {/* Main content area */}
        <main className="p-6 space-y-6 animate-ambient-hum">
          {activeTab === "detection" && (
            <DetectionView onResultsUpdate={handleDetectionComplete} />
          )}
          {activeTab === "vessels" && (
            <VesselTracking detectionResults={detectionResults} />
          )}
          {activeTab === "threats" && (
            <ThreatAnalysis detectionResults={detectionResults} />
          )}
          {activeTab === "livefeed" && <LiveFeedPanel />}
        </main>
      </div>

      {/* Security Footer */}
      <SecurityFooter />
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-space-mono font-medium border-b-2 transition-all relative ${
        active
          ? "border-cyan-400 text-cyan-300"
          : "border-transparent text-slate-500 hover:text-slate-300"
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   LIVE FEED PANEL — ESP32-CAM + YOLO Threat Detection
   ═══════════════════════════════════════════════════ */
function LiveFeedPanel() {
  const [cameraActive, setCameraActive] = useState(false);
  const [frame, setFrame] = useState<string>("");
  const [esp32Connected, setEsp32Connected] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [threatStats, setThreatStats] = useState<any>(null);
  const [threatAlerts, setThreatAlerts] = useState<any[]>([]);
  const [servoAngle, setServoAngle] = useState(90);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!cameraActive) return;

    const socket = io("http://localhost:5001", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => {
      setSocketConnected(false);
      setEsp32Connected(false);
    });

    socket.on("esp32_status", (data: any) => {
      setEsp32Connected(data.connected);
    });

    socket.on("system_status", (data: any) => {
      setEsp32Connected(data.esp32_connected);
    });

    socket.on("video_frame", (data: any) => {
      setFrame(data.frame);
    });

    socket.on("threat_stats", (data: any) => {
      setThreatStats(data);
    });

    socket.on("threat_alert", (data: any) => {
      setThreatAlerts((prev) => [data, ...prev].slice(0, 10));
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("esp32_status");
      socket.off("system_status");
      socket.off("video_frame");
      socket.off("threat_stats");
      socket.off("threat_alert");
      socket.disconnect();
    };
  }, [cameraActive]);

  const handleServo = useCallback((angle: number) => {
    setServoAngle(angle);
    socketRef.current?.emit("move_servo", { angle });
  }, []);

  const threatColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL": return "text-red-400 border-red-500/30 bg-red-500/10";
      case "HIGH": return "text-orange-400 border-orange-500/30 bg-orange-500/10";
      case "MEDIUM": return "text-amber-400 border-amber-500/30 bg-amber-500/10";
      default: return "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
    }
  };

  // Not activated state — show button
  if (!cameraActive) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative mb-8">
          <div className="absolute -inset-8 rounded-full border border-dashed border-cyan-500/10 animate-spin" style={{ animationDuration: "30s" }} />
          <div className="absolute -inset-4 rounded-full border border-cyan-500/5 animate-ping" style={{ animationDuration: "4s" }} />
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-500/30 flex items-center justify-center shadow-2xl shadow-cyan-500/10">
            <Camera className="w-10 h-10 text-cyan-400/60" />
          </div>
        </div>
        <h2 className="font-orbitron text-lg font-bold tracking-[0.2em] text-cyan-200 uppercase mb-2">
          MAREYE LIVE CAMERA FEED
        </h2>
        <p className="text-[10px] font-space-mono text-slate-400 uppercase tracking-wider mb-6">
          ESP32-CAM + YOLOv8 Real-Time Threat Detection
        </p>
        <button
          onClick={() => setCameraActive(true)}
          className="relative px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 text-white font-orbitron text-xs tracking-[0.3em] uppercase overflow-hidden group border border-cyan-400/20 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:shadow-xl transition-all duration-300"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            ACTIVATE CAMERA
          </span>
        </button>
      </div>
    );
  }

  // Active state — show live feed
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main video feed */}
      <div className="lg:col-span-2">
        <div className="relative bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-cyan-500/15 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/20 to-cyan-900/30 px-4 py-2 border-b border-cyan-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-space-mono text-red-300 uppercase tracking-widest font-bold">
                LIVE
              </span>
              <span className="text-[8px] font-space-mono text-cyan-300/40 uppercase tracking-widest ml-2">
                ESP32-CAM Feed
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {esp32Connected ? (
                  <Wifi className="w-3 h-3 text-emerald-400" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-400" />
                )}
                <span className="text-[7px] font-space-mono text-slate-400 uppercase">
                  {esp32Connected ? "ESP32 ONLINE" : "ESP32 OFFLINE"}
                </span>
              </div>
              <button
                onClick={() => setCameraActive(false)}
                className="text-[8px] font-space-mono text-red-400 hover:text-red-300 uppercase tracking-wider border border-red-500/30 px-2 py-0.5 rounded hover:bg-red-500/10 transition-all"
              >
                STOP
              </button>
            </div>
          </div>

          {/* Video Frame */}
          <div className="relative aspect-video bg-black/80 flex items-center justify-center">
            {frame ? (
              <img
                src={`data:image/jpeg;base64,${frame}`}
                alt="Live YOLO Feed"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Activity className="w-8 h-8 text-cyan-400/40 animate-pulse" />
                <span className="text-[10px] font-space-mono text-cyan-400/40 uppercase tracking-wider">
                  Awaiting video frames...
                </span>
              </div>
            )}

            {/* HUD overlay */}
            <div className="absolute top-3 left-3 text-[8px] font-space-mono text-cyan-400/50 uppercase tracking-wider">
              <div>MAREYE CAM-01</div>
              <div>YOLOv8 INFERENCE</div>
            </div>
            <div className="absolute top-3 right-3 text-[8px] font-space-mono text-cyan-400/50 uppercase tracking-wider text-right">
              <div>{new Date().toLocaleTimeString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" })} IST</div>
              <div>FPS: ~12</div>
            </div>

            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400/30" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400/30" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400/30" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400/30" />
          </div>

          {/* Servo Control */}
          <div className="px-4 py-3 border-t border-cyan-500/10 bg-slate-900/50">
            <div className="flex items-center gap-4">
              <span className="text-[8px] font-space-mono text-slate-400 uppercase tracking-wider w-20">
                PAN: {servoAngle}°
              </span>
              <input
                type="range"
                min={0}
                max={180}
                value={servoAngle}
                onChange={(e) => handleServo(Number(e.target.value))}
                className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex gap-2">
                <button onClick={() => handleServo(0)} className="text-[7px] font-space-mono text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded hover:bg-cyan-500/10 transition-all uppercase">Port</button>
                <button onClick={() => handleServo(90)} className="text-[7px] font-space-mono text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded hover:bg-cyan-500/10 transition-all uppercase">Center</button>
                <button onClick={() => handleServo(180)} className="text-[7px] font-space-mono text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded hover:bg-cyan-500/10 transition-all uppercase">Stbd</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar — Threat Stats + Alerts */}
      <div className="space-y-4">
        {/* Connection Status */}
        <div className="bg-slate-900/70 backdrop-blur-xl rounded-xl border border-cyan-500/15 p-4">
          <h3 className="text-[9px] font-space-mono text-cyan-300/60 uppercase tracking-widest mb-3 font-bold">
            System Status
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-space-mono text-slate-400 uppercase">Backend</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${socketConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                <span className={`text-[8px] font-space-mono ${socketConnected ? "text-emerald-400" : "text-red-400"}`}>
                  {socketConnected ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-space-mono text-slate-400 uppercase">ESP32-CAM</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${esp32Connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                <span className={`text-[8px] font-space-mono ${esp32Connected ? "text-emerald-400" : "text-amber-400"}`}>
                  {esp32Connected ? "STREAMING" : "WAITING"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Threat Stats */}
        {threatStats && (
          <div className="bg-slate-900/70 backdrop-blur-xl rounded-xl border border-cyan-500/15 p-4">
            <h3 className="text-[9px] font-space-mono text-cyan-300/60 uppercase tracking-widest mb-3 font-bold">
              Threat Statistics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-slate-800/50 rounded-lg border border-cyan-500/10">
                <div className="text-lg font-orbitron text-cyan-300 font-bold">{threatStats.total_detections ?? 0}</div>
                <div className="text-[7px] font-space-mono text-slate-400 uppercase">Detections</div>
              </div>
              <div className="text-center p-2 bg-slate-800/50 rounded-lg border border-cyan-500/10">
                <div className="text-lg font-orbitron text-red-400 font-bold">{threatStats.active_threats ?? 0}</div>
                <div className="text-[7px] font-space-mono text-slate-400 uppercase">Threats</div>
              </div>
              <div className="text-center p-2 bg-slate-800/50 rounded-lg border border-cyan-500/10">
                <div className="text-lg font-orbitron text-amber-300 font-bold">{threatStats.frames_analyzed ?? 0}</div>
                <div className="text-[7px] font-space-mono text-slate-400 uppercase">Frames</div>
              </div>
              <div className="text-center p-2 bg-slate-800/50 rounded-lg border border-cyan-500/10">
                <div className="text-lg font-orbitron text-emerald-300 font-bold">{threatStats.fps?.toFixed(1) ?? "—"}</div>
                <div className="text-[7px] font-space-mono text-slate-400 uppercase">FPS</div>
              </div>
            </div>

            {/* Per-class breakdown */}
            {threatStats.class_counts && Object.keys(threatStats.class_counts).length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="text-[8px] font-space-mono text-slate-500 uppercase tracking-wider">Detected Classes</div>
                {Object.entries(threatStats.class_counts).map(([cls, count]) => (
                  <div key={cls} className="flex items-center justify-between px-2 py-1 bg-slate-800/40 rounded border border-cyan-500/5">
                    <span className="text-[9px] font-space-mono text-cyan-300 uppercase">{cls}</span>
                    <span className="text-[9px] font-space-mono text-amber-300 font-bold">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Threat Alerts */}
        <div className="bg-slate-900/70 backdrop-blur-xl rounded-xl border border-cyan-500/15 p-4">
          <h3 className="text-[9px] font-space-mono text-red-300/60 uppercase tracking-widest mb-3 font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            Threat Alerts
          </h3>
          {threatAlerts.length === 0 ? (
            <p className="text-[9px] font-space-mono text-slate-500 uppercase text-center py-4">
              No threats detected yet
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {threatAlerts.map((alert, i) => (
                <div key={i} className={`p-2 rounded-lg border text-[9px] font-space-mono ${threatColor(alert.threat_level)}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold uppercase">{alert.class}</span>
                    <span className="text-[7px] opacity-60">{alert.threat_level}</span>
                  </div>
                  <div className="text-[7px] opacity-50">
                    Conf: {((alert.confidence ?? 0) * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
