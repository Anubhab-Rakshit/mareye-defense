"use client";

import type React from "react";
import { useState, useRef } from "react";
import {
  Upload,
  Play,
  Loader2,
  Zap,
  Eye,
  BarChart3,
  Settings,
  ImageIcon,
  Video,
} from "lucide-react";
import HolographicCard from "./holographic-card";
import DetectionResultsEnhanced from "./detection-results-enhanced";
import RealTimeFeed from "./real-time-feed";
import TacticalStat from "./tactical-stat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addDetection,
  loadDetections,
  normalizeOverallThreatScore,
} from "@/lib/detection-storage";

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

interface DetectionViewProps {
  onResultsUpdate?: (results: DetectionResult[]) => void;
}

export default function DetectionView({ onResultsUpdate }: DetectionViewProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [results, setResults] = useState<DetectionResult[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = loadDetections();
    return stored.map((s) => ({
      originalImage: s.originalImage,
      detectedImage: s.detectedImage,
      detections: s.detections,
      processingTime: s.processingTime,
      totalObjects: s.totalObjects,
      overallThreatLevel: s.overallThreatLevel,
      overallThreatScore: normalizeOverallThreatScore(s.overallThreatScore),
      threatCount: s.threatCount,
      timestamp: new Date(s.timestamp),
    }));
  });
  const [activeTab, setActiveTab] = useState("image");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to calculate Haversine distance (in km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper to store threat for the interactive map
  const storeThreatForMap = (lat: number, lng: number, threatScore: number, classification: string) => {
    try {
      if (typeof window === "undefined") return;
      
      const localLocation = localStorage.getItem('userLocation');
      const parsedLoc = localLocation ? JSON.parse(localLocation) : { lat: 21.0, lng: 88.0 };
      
      const distance = calculateDistance(parsedLoc.lat, parsedLoc.lng, lat, lng);
      
      // Determine AI Insights based on score & distance
      let vulnerability = "Medium";
      let damagePotential = "Moderate";
      
      if (threatScore > 85) {
        vulnerability = distance < 50 ? "Critical (Immediate Interception Required)" : "High (Monitor Track)";
        damagePotential = distance < 50 ? "Catastrophic damage to hull integrity" : "Significant infrastructure risk";
      } else if (threatScore > 60) {
        vulnerability = "High (Deploy Countermeasures)";
        damagePotential = "Substantial operational disruption";
      } else {
        vulnerability = "Low (Routine Observation)";
        damagePotential = "Minor superficial impact";
      }

      const newThreat = {
        id: `threat_${Date.now()}`,
        lat,
        lng,
        distance: distance.toFixed(2),
        classification,
        threatScore: Math.round(threatScore),
        timestamp: new Date().toISOString(),
        vulnerability,
        damagePotential
      };

      const existingThreats = JSON.parse(localStorage.getItem('activeThreats') || '[]');
      const updatedThreats = [newThreat, ...existingThreats].slice(0, 10); // Keep last 10
      localStorage.setItem('activeThreats', JSON.stringify(updatedThreats));
      
      // Dispatch custom event for Command Center map to refresh
      window.dispatchEvent(new CustomEvent("threatDetected", { detail: newThreat }));
    } catch (error) {
      console.error("Failed to store threat for map", error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const updateResults = (newResults: DetectionResult[]) => {
    setResults(newResults);
    onResultsUpdate?.(newResults);
  };

  const processImage = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", "image");

      const progressInterval = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      const response = await fetch("/api/detection/process", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Detection failed");
      }

      const result = await response.json();

      if (result.success) {
        const normalizedThreatScore =
          normalizeOverallThreatScore(result.overallThreatScore) ?? 0;

        // Get location from inputs or profile
        let finalLat = latitude ? parseFloat(latitude) : null;
        let finalLng = longitude ? parseFloat(longitude) : null;
        
        if (!finalLat || !finalLng) {
          try {
            const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
            if (profile.latitude && profile.longitude) {
              finalLat = parseFloat(profile.latitude);
              finalLng = parseFloat(profile.longitude);
              if (!latitude) setLatitude(profile.latitude.toString());
              if (!longitude) setLongitude(profile.longitude.toString());
            }
          } catch (e) {}
        }

        const detectionResult: DetectionResult = {
          originalImage: URL.createObjectURL(selectedFile),
          detectedImage: result.detectedImage,
          originalFileName: result.originalFileName,
          detections: result.detections,
          processingTime: result.processingTime,
          totalObjects: result.detections.length,
          overallThreatLevel: result.overallThreatLevel,
          overallThreatScore: normalizedThreatScore,
          threatCount: result.threatCount,
          timestamp: new Date(),
        };

        addDetection({
          originalImage: detectionResult.originalImage,
          detectedImage: detectionResult.detectedImage,
          detections: detectionResult.detections,
          processingTime: detectionResult.processingTime,
          totalObjects: detectionResult.totalObjects,
          overallThreatLevel: detectionResult.overallThreatLevel,
          overallThreatScore: detectionResult.overallThreatScore,
          threatCount: detectionResult.threatCount,
          lat: finalLat || undefined,
          lng: finalLng || undefined,
        });

        const newResults = [detectionResult, ...results];
        updateResults(newResults);
        
        // Save to map if coords provided and threat detected
        if (finalLat && finalLng && normalizedThreatScore > 0) {
          const mainClass = result.detections[0]?.class || "Unknown Contact";
          storeThreatForMap(finalLat, finalLng, normalizedThreatScore, mainClass);
        }
        
        setSelectedFile(null);
      } else {
        throw new Error("Detection failed");
      }
    } catch (error) {
      console.error("Detection error:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const processVideo = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", "video");

      const progressInterval = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 5;
        });
      }, 1000);

      const response = await fetch("/api/detection/process", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Video detection failed");
      }

      const result = await response.json();

      if (result.success) {
        const normalizedThreatScore =
          normalizeOverallThreatScore(result.overallThreatScore) ?? 0;

        // Get location from inputs or profile
        let finalLat = latitude ? parseFloat(latitude) : null;
        let finalLng = longitude ? parseFloat(longitude) : null;
        
        if (!finalLat || !finalLng) {
          try {
            const profile = JSON.parse(localStorage.getItem("userProfile") || "{}");
            if (profile.latitude && profile.longitude) {
              finalLat = parseFloat(profile.latitude);
              finalLng = parseFloat(profile.longitude);
              if (!latitude) setLatitude(profile.latitude.toString());
              if (!longitude) setLongitude(profile.longitude.toString());
            }
          } catch (e) {}
        }

        const detectionResult: DetectionResult = {
          originalImage: URL.createObjectURL(selectedFile),
          detectedImage: result.detectedVideo || result.detectedImage,
          originalFileName: result.originalFileName,
          detections: result.detections,
          processingTime: result.processingTime,
          totalObjects: result.detections.length,
          overallThreatLevel: result.overallThreatLevel,
          overallThreatScore: normalizedThreatScore,
          threatCount: result.threatCount,
          timestamp: new Date(),
        };

        addDetection({
          originalImage: detectionResult.originalImage,
          detectedImage: detectionResult.detectedImage,
          detections: detectionResult.detections,
          processingTime: detectionResult.processingTime,
          totalObjects: detectionResult.totalObjects,
          overallThreatLevel: detectionResult.overallThreatLevel,
          overallThreatScore: detectionResult.overallThreatScore,
          threatCount: detectionResult.threatCount,
          lat: finalLat || undefined,
          lng: finalLng || undefined,
        });

        // Dispatch event for real-time command center updates
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("detectionAdded"));
        }

        const newResults = [detectionResult, ...results];
        updateResults(newResults);
        
        // Save to map if coords provided and threat detected
        if (finalLat && finalLng && normalizedThreatScore > 0) {
          const mainClass = result.detections[0]?.class || "Unknown Contact";
          storeThreatForMap(finalLat, finalLng, normalizedThreatScore, mainClass);
        }
        
        setSelectedFile(null);
      } else {
        throw new Error("Video detection failed");
      }
    } catch (error) {
      console.error("Video detection error:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const downloadFile = (fileData: string, filename: string) => {
    try {
      const link = document.createElement("a");
      link.href = fileData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed. Please try again.");
    }
  };

  const deleteResult = (index: number) => {
    if (
      window.confirm("Are you sure you want to delete this detection result?")
    ) {
      const newResults = results.filter((_, i) => i !== index);
      updateResults(newResults);
      const stored = loadDetections();
      if (stored[index]) {
        const { deleteDetection } = require("@/lib/detection-storage");
        deleteDetection(stored[index].id);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* System metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <TacticalStat
          label="Detection Speed"
          value="30+"
          unit="FPS"
          variant="primary"
          icon={<Zap className="w-4 h-4 sm:w-5 sm:h-5" />}
        />
        <TacticalStat
          label="Accuracy Rate"
          value="95"
          unit="%"
          variant="success"
          icon={<Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
        />
        <TacticalStat
          label="Detectable Classes"
          value="5"
          unit="types"
          variant="secondary"
          icon={<BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />}
        />
        <TacticalStat
          label="System Status"
          value="ONLINE"
          variant="primary"
          icon={<Settings className="w-4 h-4 sm:w-5 sm:h-5" />}
        />
      </div>

      {/* Upload and Processing */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-900/40 border border-cyan-500/20 backdrop-blur-xl">
          <TabsTrigger value="image" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Image Detection
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Video Detection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image" className="mt-6 space-y-6">
          <HolographicCard>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-cyan-300 font-orbitron mb-2">
                  Image Detection
                </h3>
                <p className="text-sm text-slate-400">
                  Upload an underwater image for real-time threat detection
                </p>
              </div>

              <div
                className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-12 h-12 text-cyan-300 mx-auto mb-4" />
                <p className="text-foreground mb-2 font-semibold">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-slate-400">
                  Supports JPG, PNG, BMP formats
                </p>
                {selectedFile && (
                  <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <p className="text-sm text-foreground">
                      Selected: {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-space-mono text-cyan-400 uppercase tracking-widest block">Threat Latitude</label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="e.g. 15.2993"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full bg-slate-900 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-space-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-space-mono text-cyan-400 uppercase tracking-widest block">Threat Longitude</label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="e.g. 74.1240"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full bg-slate-900 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-space-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={processImage}
                  disabled={!selectedFile || isProcessing || !latitude || !longitude}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-secondary text-card hover:shadow-lg hover:shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Detect Objects
                    </>
                  )}
                </button>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Processing image...</span>
                    <span className="text-cyan-300 font-space-mono">
                      {Math.round(processingProgress)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border/50 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </HolographicCard>
        </TabsContent>

        <TabsContent value="video" className="mt-6 space-y-6">
          <HolographicCard>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-cyan-300 font-orbitron mb-2">
                  Video Detection
                </h3>
                <p className="text-sm text-slate-400">
                  Process underwater videos for frame-by-frame threat analysis
                </p>
              </div>

              <div
                className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Video className="w-12 h-12 text-cyan-300 mx-auto mb-4" />
                <p className="text-foreground mb-2 font-semibold">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-slate-400">
                  Supports MP4, AVI, MOV, MKV formats
                </p>
                {selectedFile && (
                  <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <p className="text-sm text-foreground">
                      Selected: {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-space-mono text-cyan-400 uppercase tracking-widest block">Threat Latitude</label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="e.g. 15.2993"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full bg-slate-900 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-space-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-space-mono text-cyan-400 uppercase tracking-widest block">Threat Longitude</label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="e.g. 74.1240"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full bg-slate-900 border border-cyan-500/30 rounded-lg px-3 py-2 text-cyan-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-space-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={processVideo}
                  disabled={!selectedFile || isProcessing || !latitude || !longitude}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-secondary text-card hover:shadow-lg hover:shadow-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Detect in Video
                    </>
                  )}
                </button>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Processing video frames...</span>
                    <span className="text-cyan-300 font-space-mono">
                      {Math.round(processingProgress)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border/50 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </HolographicCard>
        </TabsContent>
      </Tabs>

      {/* Results section */}
      {results.length > 0 && (
        <HolographicCard>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <h2 className="text-xl font-bold text-cyan-300 font-orbitron">
                Detection History
              </h2>
              <span className="text-sm text-slate-400">
                {results.length} results
              </span>
            </div>

            <div className="space-y-4">
              {results.map((result, index) => (
                <DetectionResultsEnhanced
                  key={index}
                  index={index}
                  originalImage={result.originalImage}
                  detectedImage={result.detectedImage}
                  originalFileName={result.originalFileName}
                  detections={result.detections}
                  processingTime={result.processingTime}
                  totalObjects={result.totalObjects}
                  overallThreatLevel={result.overallThreatLevel}
                  overallThreatScore={result.overallThreatScore}
                  threatCount={result.threatCount}
                  onDelete={deleteResult}
                  onDownload={downloadFile}
                />
              ))}
            </div>
          </div>
        </HolographicCard>
      )}

      {/* Live feed */}
      <HolographicCard>
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-cyan-300 font-orbitron">
            Real-Time Activity Feed
          </h3>
          <RealTimeFeed />
        </div>
      </HolographicCard>
    </div>
  );
}
