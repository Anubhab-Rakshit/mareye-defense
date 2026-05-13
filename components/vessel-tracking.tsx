"use client";

import { useState, useMemo } from "react";
import { Map, Activity } from "lucide-react";
import { getAllThreatObjects } from "@/lib/detection-storage";
import { LiveTacticalRadar } from "./live-tactical-radar";

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

interface VesselTrackingProps {
  detectionResults: DetectionResult[];
}

const DETECTION_CLASSES = {
  "Mines - v1 2025-05-15 8-03pm": { label: "Mines", color: "#ff4444" },
  mayin: { label: "Mines", color: "#ff4444" },
  Submarine: { label: "Submarine", color: "#4488ff" },
  "auv-rov": { label: "AUV/ROV", color: "#00d9ff" },
  divers: { label: "Divers", color: "#00ff88" },
};

// Function to generate deterministic but varied coordinates for each threat
function generateThreatCoordinates(
  threatId: string,
  totalThreats: number,
  index: number,
) {
  // Use threat ID to generate consistent but varied positions
  const hash = threatId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const angleVariation =
    (hash % 360) + index * (360 / Math.max(totalThreats, 1));
  const radiusVariation = 40 + ((hash % 100) / 100) * 40 + (index % 3) * 15;

  const angle = (angleVariation * Math.PI) / 180;
  const radius = radiusVariation;

  return {
    x: 50 + (Math.cos(angle) * radius) / 5,
    y: 50 + (Math.sin(angle) * radius) / 5,
    angle: angleVariation,
    radius: radiusVariation,
  };
}

export default function VesselTracking({
  detectionResults,
}: VesselTrackingProps) {
  const [selectedThreatId, setSelectedThreatId] = useState<string | null>(null);

  const threatObjects = useMemo(() => {
    const storedThreats = getAllThreatObjects();
    return storedThreats.map((threat, index) => ({
      ...threat,
      coordinates: generateThreatCoordinates(
        threat.id,
        storedThreats.length,
        index,
      ),
    }));
  }, [detectionResults]);

  const selectedThreat = selectedThreatId
    ? threatObjects.find((t) => t.id === selectedThreatId)
    : null;

  const getThreatColor = (threatLevel?: string) => {
    return threatLevel === "CRITICAL"
      ? "#ff4444"
      : threatLevel === "HIGH"
        ? "#ffaa00"
        : threatLevel === "MEDIUM"
          ? "#ffff00"
          : "#00ff88";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main threat map */}
      <div className="lg:col-span-2 border border-primary/30 rounded-lg p-6 bg-gradient-to-br from-card/40 to-card/20 backdrop-blur-xl overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-cyan-300">
            Tactical Threat Map
          </h2>
          <Activity className="w-5 h-5 text-slate-400 animate-pulse" />
        </div>

        {/* Radar visualization using shared component */}
        <div className="flex justify-center bg-black/40 rounded-xl py-8 border border-cyan-500/10 mb-6">
          <LiveTacticalRadar 
            threats={threatObjects.map(t => ({
              id: t.id,
              class: t.class,
              confidence: t.confidence,
              threat_level: t.threat_level
            }))} 
            size={Math.min(450, 600)} 
          />
        </div>

        {/* Map stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-xs text-slate-400">Total Threats</p>
            <p className="text-xl font-bold text-cyan-300 font-space-mono">
              {threatObjects.length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-xs text-slate-400">Critical</p>
            <p className="text-xl font-bold text-destructive font-space-mono">
              {
                threatObjects.filter((t) => t.threat_level === "CRITICAL")
                  .length
              }
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/10 border border-secondary/30">
            <p className="text-xs text-slate-400">Avg Confidence</p>
            <p className="text-xl font-bold text-secondary font-space-mono">
              {threatObjects.length > 0
                ? Math.round(
                    (threatObjects.reduce((sum, t) => sum + t.confidence, 0) /
                      threatObjects.length) *
                      100,
                  )
                : 0}
              %
            </p>
          </div>
        </div>
      </div>

      {/* Threat details panel */}
      <div className="space-y-4">
        <div className="border border-primary/30 rounded-lg p-4 bg-gradient-to-br from-card/40 to-card/20 backdrop-blur-xl">
          <h3 className="text-sm font-bold text-cyan-300 mb-4">
            Detected Threats ({threatObjects.length})
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {threatObjects.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No detections
              </p>
            ) : (
              threatObjects.map((threat) => {
                const classInfo =
                  DETECTION_CLASSES[
                    threat.class as keyof typeof DETECTION_CLASSES
                  ];
                const isSelected = selectedThreatId === threat.id;

                return (
                  <button
                    key={threat.id}
                    onClick={() =>
                      setSelectedThreatId(isSelected ? null : threat.id)
                    }
                    className={`w-full p-3 rounded-lg border transition-all text-left text-xs ${
                      isSelected
                        ? "border-primary bg-primary/20 ring-2 ring-primary/50"
                        : "border-cyan-500/20 bg-slate-800/50 hover:border-cyan-400/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: getThreatColor(threat.threat_level),
                        }}
                      />
                      <span className="font-semibold text-white">
                        {classInfo?.label || threat.class}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="space-y-2 border-t border-cyan-500/20 pt-2 mt-2">
                        <div className="flex justify-between text-slate-400">
                          <span>Confidence:</span>
                          <span className="text-white font-space-mono">
                            {(threat.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Threat Level:</span>
                          <span className="text-white font-space-mono">
                            {threat.threat_level || "LOW"}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Scan ID:</span>
                          <span className="text-white font-space-mono text-[10px]">
                            #{threat.scanIndex + 1}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Detected:</span>
                          <span className="text-white font-space-mono text-[10px]">
                            {new Date(threat.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected threat details */}
        {selectedThreat && (
          <div className="border border-primary/30 rounded-lg p-4 bg-gradient-to-br from-primary/10 to-card/20 backdrop-blur-xl">
            <h4 className="text-sm font-bold text-cyan-300 mb-3">
              Threat Details
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400 mb-1">Class</p>
                <p className="text-white font-semibold">
                  {DETECTION_CLASSES[
                    selectedThreat.class as keyof typeof DETECTION_CLASSES
                  ]?.label || selectedThreat.class}
                </p>
              </div>

              <div>
                <p className="text-slate-400 mb-1">Confidence Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-border/50 overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${selectedThreat.confidence * 100}%` }}
                    />
                  </div>
                  <span className="font-space-mono text-cyan-300">
                    {(selectedThreat.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <p className="text-slate-400 mb-1">Threat Level</p>
                <div
                  className="px-2 py-1 rounded text-white font-semibold text-center"
                  style={{
                    backgroundColor: getThreatColor(
                      selectedThreat.threat_level,
                    ),
                  }}
                >
                  {selectedThreat.threat_level || "LOW"}
                </div>
              </div>

              <div>
                <p className="text-slate-400 mb-1">Detection Time</p>
                <p className="text-white font-space-mono">
                  {new Date(selectedThreat.timestamp).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-slate-400 mb-1">Position on Radar</p>
                <p className="text-white font-space-mono">
                  X: {selectedThreat.coordinates.x.toFixed(1)}% Y:{" "}
                  {selectedThreat.coordinates.y.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
