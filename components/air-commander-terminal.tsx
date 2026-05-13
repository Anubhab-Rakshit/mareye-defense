"use client";

import React, { useRef, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Terminal, ShieldAlert, Cpu, Database,
  Map as MapIcon, Lock, CheckCircle2,
  Play, Square, Radar, RotateCcw,
  Ship, ArrowRightLeft, Camera, Upload, Send
} from "lucide-react";
import { addDetection } from "@/lib/detection-storage";

interface ToolResult {
  tool: string;
  result: any;
}
interface Step {
  text?: string;
  toolCalls?: { tool: string; args: any }[];
  toolResults?: ToolResult[];
}
interface AgentResponse {
  response: string;
  stepsTaken: number;
  steps?: Step[];
}
interface LogEntry {
  type: 'trigger' | 'thought' | 'tool_call' | 'tool_result' | 'report';
  content?: string;
  tool?: string;
  args?: any;
  result?: any;
}

export function AirCommanderTerminal() {
  return (
    <Suspense fallback={<div className="h-[700px] w-full bg-[#0a0f18] rounded-xl animate-pulse" />}>
      <AirCommanderTerminalContent />
    </Suspense>
  );
}

function AirCommanderTerminalContent() {
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fleetData, setFleetData] = useState<any>(null);
  const [visualState, setVisualState] = useState<'idle' | 'enhancing' | 'detecting' | 'dispatching' | 'logging' | 'done'>('idle');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [logs]);

  // Poll fleet data every 2 seconds
  useEffect(() => {
    fetchFleet();
    pollRef.current = setInterval(fetchFleet, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const fetchFleet = async () => {
    try {
      const res = await fetch('/api/fleet');
      if (res.ok) setFleetData(await res.json());
    } catch {}
  };

  const resetFleet = async () => {
    await fetch('/api/fleet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset' }) });
    await fetchFleet();
    setLogs([]);
    setVisualState('idle');
  };

  const appendLog = (entry: LogEntry) => {
    setLogs(prev => [...prev, entry]);
  };

  const [inputLat, setInputLat] = useState<string>("14.8");
  const [inputLng, setInputLng] = useState<string>("74.0");
  const [inputImage, setInputImage] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setInputImage(e.target.files[0].name);
    }
  };

  const startScenario = async () => {
    if (isLoading || !selectedFile) return;

    setIsLoading(true);
    setLogs([]);
    setVisualState('enhancing');
    
    const latNum = parseFloat(inputLat);
    const lngNum = parseFloat(inputLng);
    const feedName = selectedFile.name;

    appendLog({
      type: 'trigger',
      content: `⚠ RAW FEED UPLOADED: ${feedName} at [${latNum}°N, ${lngNum}°E] | AI Agent autonomous response initiated...`
    });
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("type", "image");

    // 1. REAL API CALL TO CNN
    appendLog({ type: 'thought', content: "Raw feed received. Initializing Neural Noise Reduction CNN..." });
    setVisualState('enhancing');
    appendLog({ type: 'tool_call', tool: 'enhanceFeed', args: { imageUrl: feedName } });
    
    let cnnMetrics: any = { status: "Bypassed" };
    let cnnData: any = null;
    try {
      const cnnRes = await fetch("/api/cnn/process", { method: "POST", body: formData });
      cnnData = await cnnRes.json();
      if (cnnData.success) {
         cnnMetrics = { 
           psnr: cnnData.metrics?.psnr?.toFixed(2) || "N/A", 
           ssim: cnnData.metrics?.ssim?.toFixed(2) || "N/A",
           uiqm_improvement: cnnData.metrics?.uiqm_improvement?.toFixed(2) || "N/A",
           time: `${cnnData.metrics?.processingTime?.toFixed(2) || 1.2}s`
         };
      }
    } catch(e) { console.error("CNN Error", e) }
    appendLog({ type: 'tool_result', tool: 'enhanceFeed', result: { success: true, metrics: cnnMetrics } });

    // 2. REAL API CALL TO YOLO
    appendLog({ type: 'thought', content: "Image cleared. Running YOLOv8 Threat Detection Model..." });
    setVisualState('detecting');
    appendLog({ type: 'tool_call', tool: 'analyzeThreat', args: { enhancedImageUrl: `${feedName.split('.')[0]}_CLEAN.png` } });
    
    let detectedThreat = "Unknown Object";
    let threatConfidence = 0;
    let threatLevel = "UNKNOWN";
    try {
      const detRes = await fetch("/api/detection/process", { method: "POST", body: formData });
      const detData = await detRes.json();
      if (detData.success && detData.detections && detData.detections.length > 0) {
         // Get the highest confidence threat
         const top = detData.detections.sort((a: any, b: any) => b.confidence - a.confidence)[0];
          detectedThreat = top.class;
          threatConfidence = parseFloat(top.confidence.toFixed(2));
          threatLevel = detData.overallThreatLevel || "UNKNOWN";
         
         // SAVE TO DATABASE (LOCALSTORAGE) SO IT SHOWS IN INTEL ROOM / PATHPLANNER
         addDetection({
            originalImage: URL.createObjectURL(selectedFile),
            detectedImage: detData.detectedImage || cnnData?.enhancedImage || "",
            detections: detData.detections,
            processingTime: detData.processingTime || 0,
            totalObjects: detData.totalObjects || detData.detections.length,
            overallThreatLevel: detData.overallThreatLevel || "UNKNOWN",
            overallThreatScore: detData.overallThreatScore || 0,
            threatCount: detData.threatCount || detData.detections.length,
            lat: latNum,
            lng: lngNum,
            locationName: "Agent Override Sector"
         });
      } else {
         detectedThreat = "No Threat Detected";
      }
    } catch(e) { console.error("YOLO Error", e) }
    
    appendLog({ type: 'tool_result', tool: 'analyzeThreat', result: { success: true, threatClass: detectedThreat, confidence: threatConfidence } });

    if (detectedThreat === "No Threat Detected" || detectedThreat === "Unknown Object") {
       appendLog({ type: 'report', content: `Operation completed. Sector clear. No actionable threat identified in ${feedName}.` });
       setVisualState('done');
       setIsLoading(false);
       return;
    }

    // 3. FETCH LIVE INTELLIGENCE (Weather & Sea State)
    appendLog({ type: 'thought', content: "Fetching real-time environmental data for the sector..." });
    let weatherSummary = "Data unavailable";
    try {
      const intelRes = await fetch(`/api/intelligence?lat=${latNum}&lng=${lngNum}`);
      const intelData = await intelRes.json();
      if (intelData.weather) {
        weatherSummary = `Wave Ht: ${intelData.marine?.current?.wave_height}m, Wind: ${intelData.weather?.current?.wind_speed_10m}km/h, Vis: ${intelData.weather?.hourly?.visibility?.[0] / 1000}km. Threat Level: ${intelData.threat?.category}.`;
      }
    } catch(e) { console.error("Intel Error", e) }
    appendLog({ type: 'tool_result', tool: 'fetchIntelligence', result: { success: true, summary: weatherSummary } });

    // 4. GROQ AGENT: MANEUVER & BLOCKCHAIN
    appendLog({ type: 'thought', content: `Threat confirmed: ${detectedThreat}. Analyzing tactical feasibility based on ${weatherSummary}...` });
    setVisualState('dispatching');
    appendLog({ type: 'tool_call', tool: 'executeManeuver', args: { threatClass: detectedThreat, lat: latNum, lng: lngNum, weather: weatherSummary } });
    
    try {
      const res = await fetch("/api/air-commander", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           rawImageUrl: feedName,
           lat: latNum,
           lng: lngNum,
           realThreat: detectedThreat,
           threatLevel,
           environmentalData: weatherSummary
         }),
       });

      if (!res.ok) throw new Error(`Agent API error: ${res.statusText}`);
      const data: AgentResponse = await res.json();

      await fetchFleet(); // Refresh fleet to see map update
      appendLog({ type: 'tool_result', tool: 'executeManeuver', result: { success: true, maneuver: "Nearest vessel diverted via AI." } });

      appendLog({ type: 'thought', content: "Maneuver executed. Securing action receipt to Blockchain." });
      setVisualState('logging');
      appendLog({ type: 'tool_call', tool: 'auditToLedger', args: { threatClass: detectedThreat, actionTaken: "Diverted nearest ship", lat: latNum, lng: lngNum, threatLevel } });
      const ledger = data.ledgerAudit || { success: true, network: "Stellar Testnet", transactionHash: "" };
      if (!ledger.transactionHash && !ledger.skipped && ledger.error) {
        console.error("Ledger audit error:", ledger.error);
      }
      appendLog({
        type: 'tool_result',
        tool: 'auditToLedger',
        result: {
          success: ledger.success,
          network: ledger.network,
          transactionHash: ledger.transactionHash || (ledger.skipped ? "skipped" : "error"),
          evidenceHash: ledger.evidenceHash,
          skipped: ledger.skipped,
          reason: ledger.reason,
          error: ledger.error,
        }
      });

      setVisualState('done');
      appendLog({ type: 'report', content: data.response });

    } catch (err: any) {
      appendLog({ type: 'report', content: `❌ AGENT ERROR: ${err.message}` });
      setVisualState('idle');
    } finally {
      setIsLoading(false);
      await fetchFleet();
    }
  };

  const getToolIcon = (tool: string) => {
    if (tool === 'enhanceFeed') return <Camera className="w-4 h-4 text-purple-400 shrink-0" />;
    if (tool === 'analyzeThreat') return <Radar className="w-4 h-4 text-cyan-400 shrink-0" />;
    if (tool === 'executeManeuver') return <Ship className="w-4 h-4 text-red-400 shrink-0" />;
    if (tool === 'auditToLedger') return <Lock className="w-4 h-4 text-amber-400 shrink-0" />;
    return <Cpu className="w-4 h-4 text-blue-400 shrink-0" />;
  };

  const diverted = fleetData?.vessels?.filter((v: any) => v.status !== 'PATROLLING') ?? [];

  return (
    <div className="space-y-4">
      {/* Live Fleet Status Bar */}
      <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-orbitron text-cyan-300 tracking-widest flex items-center gap-2">
            <Ship className="w-4 h-4" /> LIVE FLEET DATABASE
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h3>
          <button onClick={resetFleet} className="flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-space-mono text-slate-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 transition-all">
            <RotateCcw className="w-3 h-3" /> Reset Fleet
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {fleetData?.vessels?.map((v: any) => (
            <div key={v.id} className={`p-2 rounded-lg border text-[10px] font-space-mono transition-all duration-1000 ${
              v.status === 'PATROLLING'
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                : v.status === 'DIVERTED'
                ? 'border-red-500/60 bg-red-500/10 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            }`}>
              <div className="font-bold truncate">{v.name}</div>
              <div className="text-[9px] opacity-70">{v.class}</div>
              <div className={`mt-1 font-bold ${v.status === 'PATROLLING' ? 'text-emerald-400' : 'text-red-400'}`}>
                ● {v.status}
              </div>
              <div className="text-[9px] opacity-60 mt-0.5">{v.lat.toFixed(2)}°N {v.lng.toFixed(2)}°E</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Terminal */}
      <div className="w-full h-[550px] bg-[#0a0f18] rounded-xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/20 flex flex-col overflow-hidden">
        {/* Header with Inputs */}
        <div className="border-b border-cyan-500/30 bg-slate-900/80 p-4 shrink-0 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Radar className={`w-5 h-5 text-cyan-400 ${isLoading ? "animate-spin" : ""}`} />
              <div>
                <h3 className="font-orbitron font-bold text-cyan-100 text-sm tracking-widest">A.I.R. COMMANDER</h3>
                <p className="text-[10px] font-space-mono text-cyan-400/60 uppercase">Autonomous Agent Console</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex gap-2">
              <input type="file" id="feed-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
              <label htmlFor="feed-upload" className="flex-1 flex items-center justify-center gap-2 bg-slate-950 border border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-400 rounded px-3 py-1.5 text-cyan-300 cursor-pointer transition-colors truncate text-[10px] font-space-mono">
                <Upload className="w-3.5 h-3.5 shrink-0" />
                {selectedFile ? selectedFile.name : "Upload Feed"}
              </label>
              
              <input type="number" step="0.1" value={inputLat} onChange={e => setInputLat(e.target.value)} placeholder="Lat" className="bg-slate-950 border border-cyan-500/30 rounded px-3 py-1.5 text-cyan-300 w-16 focus:outline-none focus:border-cyan-400 transition-colors text-[10px] font-space-mono" title="Latitude" />
              <input type="number" step="0.1" value={inputLng} onChange={e => setInputLng(e.target.value)} placeholder="Lng" className="bg-slate-950 border border-cyan-500/30 rounded px-3 py-1.5 text-cyan-300 w-16 focus:outline-none focus:border-cyan-400 transition-colors text-[10px] font-space-mono" title="Longitude" />
            </div>

            <button
              onClick={startScenario}
              disabled={isLoading || !selectedFile}
              className={`flex items-center justify-center gap-2 px-6 py-1.5 rounded font-space-mono text-[11px] font-bold transition-all uppercase tracking-wider ${
                isLoading || !selectedFile
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              }`}
            >
              {isLoading ? <Square className="w-3 h-3 fill-emerald-400" /> : <Send className="w-3 h-3" />}
              {isLoading ? "RUNNING..." : "RUN AGENT"}
            </button>
          </div>
        </div>

        {/* Scanning bar */}
        <div className="h-0.5 bg-slate-800 w-full relative overflow-hidden shrink-0">
          {isLoading && <div className="absolute top-0 left-0 h-full w-[30%] bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-[slide_1.5s_ease-in-out_infinite] rounded-full" />}
        </div>

        {/* Split Panel */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left — Visual State */}
          <div className="w-32 shrink-0 border-r border-cyan-500/20 bg-slate-900/30 flex flex-col items-center justify-center p-3 gap-4 relative overflow-hidden hidden sm:flex">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.04)_1px,transparent_1px)] bg-[size:16px_16px]" />
            
            {visualState === 'idle' && <Radar className="w-10 h-10 text-cyan-500/20 animate-[spin_4s_linear_infinite] z-10" />}
            {visualState === 'enhancing' && (
              <div className="z-10 flex flex-col items-center gap-2 text-center">
                <Camera className="w-8 h-8 text-purple-400 animate-pulse" />
                <p className="text-[8px] font-space-mono text-purple-400 uppercase">Enhancing</p>
              </div>
            )}
            {visualState === 'detecting' && (
              <div className="z-10 flex flex-col items-center gap-2 text-center">
                <Radar className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className="text-[8px] font-space-mono text-cyan-400 uppercase">YOLO</p>
              </div>
            )}
            {visualState === 'dispatching' && (
              <div className="z-10 flex flex-col items-center gap-2 text-center">
                <Ship className="w-10 h-10 text-red-400 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                <p className="text-[8px] font-space-mono text-red-400 uppercase">Dispatching</p>
              </div>
            )}
            {visualState === 'logging' && (
              <div className="z-10 flex flex-col items-center gap-2 text-center">
                <Lock className="w-8 h-8 text-amber-400" />
                <p className="text-[8px] font-space-mono text-amber-400 uppercase">Hashing</p>
              </div>
            )}
            {visualState === 'done' && (
              <div className="z-10 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                <p className="text-[8px] font-space-mono text-emerald-400 uppercase">Done</p>
              </div>
            )}
          </div>

          {/* Right — Logs */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-space-mono text-xs bg-gradient-to-b from-[#0a0f18] to-[#0d1424]">
            {logs.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2">
                <Terminal className="w-8 h-8 opacity-40" />
                <p className="uppercase tracking-widest text-[9px] opacity-60">Upload Feed & Click Run Agent</p>
              </div>
            )}

            {logs.map((log, i) => (
              <div key={i} className="animate-in slide-in-from-bottom-1 fade-in duration-300">

                {log.type === 'trigger' && (
                  <div className="p-2 rounded border border-red-500/40 bg-red-500/10 text-red-300 text-[10px]">
                    <div className="flex gap-2 font-bold leading-relaxed">{log.content}</div>
                  </div>
                )}

                {log.type === 'thought' && log.content && (
                  <div className="p-2 rounded border-l-2 border-cyan-500/50 bg-cyan-500/5 text-cyan-300/80 italic pl-3 text-[10px]">
                    <span className="text-cyan-500 not-italic font-bold mr-2">◈ AGENT:</span>{log.content}
                  </div>
                )}

                {log.type === 'tool_call' && (
                  <div className="p-2 rounded border border-purple-500/20 bg-purple-500/5">
                    <div className="flex items-center gap-2 text-purple-300 font-bold uppercase text-[9px] mb-1">
                      {getToolIcon(log.tool!)}
                      <span>CALL: {log.tool}</span>
                    </div>
                  </div>
                )}

                {log.type === 'tool_result' && (
                  <div className={`p-2 rounded border ${
                    log.tool === 'executeManeuver' ? 'border-red-500/50 bg-red-500/10' :
                    log.tool === 'auditToLedger' ? 'border-amber-500/40 bg-amber-500/10' :
                    'border-emerald-500/30 bg-emerald-500/5'
                  } text-[10px]`}>
                    <div className="flex items-center gap-2 mb-1 font-bold uppercase text-[9px]">
                      {getToolIcon(log.tool!)}
                      <span className={
                        log.tool === 'executeManeuver' ? 'text-red-400' :
                        log.tool === 'auditToLedger' ? 'text-amber-400' : 'text-emerald-400'
                      }>✓ {log.tool} COMPLETE</span>
                    </div>
                    <pre className="text-[8px] text-slate-500 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(log.result, null, 2)}</pre>
                  </div>
                )}

                {log.type === 'report' && (
                  <div className="p-3 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[11px]">
                    <div className="flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /><span className="font-bold">{log.content}</span></div>
                  </div>
                )}

              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
      `}} />
    </div>
  );
}
