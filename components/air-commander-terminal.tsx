"use client";

import React, { useRef, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Terminal, ShieldAlert, Cpu, Database,
  Map as MapIcon, Lock, CheckCircle2,
  Play, Square, Radar, RotateCcw,
  Ship, ArrowRightLeft
} from "lucide-react";

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
  finalText: string;
  steps: Step[];
  totalSteps: number;
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
  const [visualState, setVisualState] = useState<'idle' | 'scanning' | 'routing' | 'dispatching' | 'logging' | 'done'>('idle');
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

  const startScenario = async () => {
    if (isLoading) return;

    const threatObjects = searchParams.get("objects") || "UNAUTHORIZED SUBMARINE";
    const threatLevel = searchParams.get("threat") || "CRITICAL";

    setIsLoading(true);
    setLogs([]);
    setVisualState('scanning');
    appendLog({
      type: 'trigger',
      content: `⚠ YOLO V8 ALERT: ${threatObjects} | Threat Level: ${threatLevel} | Sector 7 [14.8°N, 74.0°E] | Autonomous response initiated...`
    });

    try {
      const res = await fetch("/api/air-commander", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threatData: `${threatObjects} — Threat Level: ${threatLevel}`,
          threatLat: 14.8,
          threatLng: 74.0,
        }),
      });

      if (!res.ok) throw new Error(`Agent API error: ${res.statusText}`);
      const data: AgentResponse = await res.json();

      // Animate through steps with real data
      for (const step of data.steps) {

        if (step.toolCalls) {
          for (const tc of step.toolCalls) {
            if (tc.tool === 'get_friendly_vessels') setVisualState('scanning');
            if (tc.tool === 'calculate_tactical_path') setVisualState('routing');
            if (tc.tool === 'dispatch_fleet_command') setVisualState('dispatching');
            if (tc.tool === 'log_to_blockchain') setVisualState('logging');

            appendLog({ type: 'tool_call', tool: tc.tool, args: tc.args });
            await new Promise(r => setTimeout(r, 800));
          }
        }

        if (step.toolResults) {
          for (const tr of step.toolResults) {
            appendLog({ type: 'tool_result', tool: tr.tool, result: tr.result });
            await fetchFleet(); // Refresh fleet immediately after tool result
            await new Promise(r => setTimeout(r, 600));
          }
        }

        if (step.text && step.text.trim()) {
          appendLog({ type: 'thought', content: step.text });
          await new Promise(r => setTimeout(r, 400));
        }
      }

      setVisualState('done');
      appendLog({ type: 'report', content: data.finalText });

    } catch (err: any) {
      appendLog({ type: 'report', content: `❌ AGENT ERROR: ${err.message}` });
      setVisualState('idle');
    } finally {
      setIsLoading(false);
      await fetchFleet();
    }
  };

  const getToolIcon = (tool: string) => {
    if (tool.includes('vessel')) return <Radar className="w-4 h-4 text-purple-400 shrink-0" />;
    if (tool.includes('path')) return <MapIcon className="w-4 h-4 text-cyan-400 shrink-0" />;
    if (tool.includes('command')) return <Ship className="w-4 h-4 text-red-400 shrink-0" />;
    if (tool.includes('blockchain')) return <Lock className="w-4 h-4 text-amber-400 shrink-0" />;
    return <Cpu className="w-4 h-4 text-blue-400 shrink-0" />;
  };

  const diverted = fleetData?.vessels?.filter((v: any) => v.status !== 'PATROLLING') ?? [];
  const patrolling = fleetData?.vessels?.filter((v: any) => v.status === 'PATROLLING') ?? [];

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
        {diverted.length > 0 && (
          <div className="mt-3 p-2 rounded border border-red-500/30 bg-red-500/5 flex items-center gap-2 text-[10px] font-space-mono text-red-300">
            <ArrowRightLeft className="w-4 h-4 animate-pulse" />
            <span className="font-bold">{diverted.length} vessel(s) physically repositioned by A.I.R Agent:</span>
            {diverted.map((v: any) => <span key={v.id} className="bg-red-500/20 px-2 py-0.5 rounded">{v.name}</span>)}
          </div>
        )}
      </div>

      {/* Main Terminal */}
      <div className="w-full h-[550px] bg-[#0a0f18] rounded-xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-cyan-500/30 bg-slate-900/80 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <Radar className={`w-5 h-5 text-cyan-400 ${isLoading ? "animate-spin" : ""}`} />
            <div>
              <h3 className="font-orbitron font-bold text-cyan-100 text-sm tracking-widest">A.I.R. COMMANDER</h3>
              <p className="text-[10px] font-space-mono text-cyan-400/60 uppercase">Real-time Autonomous Tool Execution</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && <span className="text-[10px] font-space-mono text-emerald-400 animate-pulse uppercase tracking-widest">Agent Running</span>}
            <button
              onClick={startScenario}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-sm font-space-mono text-xs font-bold transition-all uppercase tracking-wider ${
                isLoading
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 border border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
              }`}
            >
              {isLoading ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isLoading ? "Executing..." : "Trigger Scenario"}
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
          <div className="w-36 shrink-0 border-r border-cyan-500/20 bg-slate-900/30 flex flex-col items-center justify-center p-3 gap-4 relative overflow-hidden hidden sm:flex">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.04)_1px,transparent_1px)] bg-[size:16px_16px]" />
            
            {visualState === 'idle' && <Radar className="w-12 h-12 text-cyan-500/20 animate-[spin_4s_linear_infinite] z-10" />}
            {visualState === 'scanning' && (
              <div className="z-10 flex flex-col items-center gap-2">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute w-16 h-16 border border-purple-500/60 rounded-full animate-ping" />
                  <div className="absolute w-8 h-8 border border-purple-400 rounded-full animate-pulse" />
                  <Radar className="w-5 h-5 text-purple-400 animate-spin" />
                </div>
                <p className="text-[9px] font-space-mono text-purple-400 uppercase text-center">Scanning</p>
              </div>
            )}
            {visualState === 'routing' && (
              <div className="z-10 flex flex-col items-center gap-2">
                <MapIcon className="w-10 h-10 text-cyan-400 animate-pulse" />
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <div className="w-8 border-t-2 border-dashed border-cyan-400 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[9px] font-space-mono text-cyan-400 uppercase text-center">Routing</p>
              </div>
            )}
            {visualState === 'dispatching' && (
              <div className="z-10 flex flex-col items-center gap-2">
                <Ship className="w-12 h-12 text-red-400 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                <p className="text-[9px] font-space-mono text-red-400 uppercase text-center">Dispatching</p>
              </div>
            )}
            {visualState === 'logging' && (
              <div className="z-10 flex flex-col items-center gap-2">
                <Lock className="w-10 h-10 text-amber-400" />
                <div className="flex gap-0.5">
                  {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 bg-amber-400 rounded-sm animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />)}
                </div>
                <p className="text-[9px] font-space-mono text-amber-400 uppercase text-center">Hashing</p>
              </div>
            )}
            {visualState === 'done' && (
              <div className="z-10 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                <p className="text-[9px] font-space-mono text-emerald-400 uppercase text-center">Complete</p>
              </div>
            )}
          </div>

          {/* Right — Logs */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-space-mono text-xs bg-gradient-to-b from-[#0a0f18] to-[#0d1424]">
            {logs.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2">
                <Terminal className="w-10 h-10" />
                <p className="uppercase tracking-widest text-[10px]">Agent Standby — Click Trigger Scenario</p>
              </div>
            )}

            {logs.map((log, i) => (
              <div key={i} className="animate-in slide-in-from-bottom-2 fade-in duration-300">

                {log.type === 'trigger' && (
                  <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.1)]">
                    <div className="flex gap-2"><ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /><span className="font-bold leading-relaxed">{log.content}</span></div>
                  </div>
                )}

                {log.type === 'thought' && log.content && (
                  <div className="p-2 rounded border-l-2 border-cyan-500/50 bg-cyan-500/5 text-cyan-300/80 italic pl-3">
                    <span className="text-cyan-500 not-italic font-bold mr-2">◈ THOUGHT:</span>{log.content}
                  </div>
                )}

                {log.type === 'tool_call' && (
                  <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/10">
                    <div className="flex items-center gap-2 text-purple-300 font-bold uppercase tracking-wider mb-1">
                      {getToolIcon(log.tool!)}
                      <span>CALLING: {log.tool}</span>
                      <span className="ml-auto text-[9px] text-purple-400/60 normal-case tracking-normal">args:</span>
                    </div>
                    <pre className="text-[9px] text-slate-400 overflow-x-auto whitespace-pre-wrap bg-slate-950/50 p-2 rounded">{JSON.stringify(log.args, null, 2)}</pre>
                  </div>
                )}

                {log.type === 'tool_result' && (
                  <div className={`p-3 rounded-lg border ${
                    log.tool === 'dispatch_fleet_command' ? 'border-red-500/50 bg-red-500/10' :
                    log.tool === 'log_to_blockchain' ? 'border-amber-500/40 bg-amber-500/10' :
                    'border-emerald-500/30 bg-emerald-500/5'
                  }`}>
                    <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider text-[10px]">
                      {getToolIcon(log.tool!)}
                      <span className={
                        log.tool === 'dispatch_fleet_command' ? 'text-red-400' :
                        log.tool === 'log_to_blockchain' ? 'text-amber-400' : 'text-emerald-400'
                      }>✓ RESULT: {log.tool}</span>
                    </div>

                    {/* Special render for dispatch command */}
                    {log.tool === 'dispatch_fleet_command' && log.result?.success && (
                      <div className="space-y-1 text-[10px]">
                        <div className="text-red-300 font-bold">🚨 VESSEL PHYSICALLY REPOSITIONED IN DATABASE</div>
                        <div className="text-slate-400">Ship: <span className="text-white">{log.result.vessel_name}</span></div>
                        <div className="text-slate-400">Command: <span className="text-red-300 font-bold">{log.result.command_issued}</span></div>
                        <div className="flex gap-4">
                          <div className="text-slate-500">FROM: <span className="text-slate-300">{log.result.previous_position?.lat}°N, {log.result.previous_position?.lng}°E</span></div>
                          <div className="text-emerald-400">→ TO: {log.result.new_position?.lat}°N, {log.result.new_position?.lng}°E</div>
                        </div>
                        <div className="text-slate-500">Confirmation: <span className="text-cyan-300">{log.result.confirmation_code}</span></div>
                      </div>
                    )}

                    {/* Special render for vessel scan */}
                    {log.tool === 'get_friendly_vessels' && log.result?.success && (
                      <div className="space-y-1 text-[10px]">
                        <div className="text-emerald-300 font-bold">{log.result.vessels_found} vessels found in {log.result.scan_zone}</div>
                        {log.result.vessels?.slice(0, 3).map((v: any) => (
                          <div key={v.id} className="text-slate-400 pl-2 border-l border-emerald-500/30">
                            <span className="text-emerald-300">{v.name}</span> ({v.class}) — {v.lat}°N, {v.lng}°E
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Special render for blockchain */}
                    {log.tool === 'log_to_blockchain' && log.result?.success && (
                      <div className="space-y-1 text-[10px]">
                        <div className="text-amber-300 font-bold">Decision Matrix Hashed — Pending Stellar Wallet Signature</div>
                        <div className="text-slate-500 break-all">Hash: <span className="text-amber-400">{log.result.tx_hash?.substring(0, 32)}...</span></div>
                        <div className="text-slate-500">Stellar TX: <span className="text-amber-400">{log.result.stellar_tx_id?.substring(0, 20)}...</span></div>
                        <div className="text-amber-500/70">Status: {log.result.status}</div>
                      </div>
                    )}

                    {/* Fallback for other tools */}
                    {!['dispatch_fleet_command','get_friendly_vessels','log_to_blockchain'].includes(log.tool!) && (
                      <pre className="text-[9px] text-slate-400 overflow-x-auto whitespace-pre-wrap bg-slate-950/50 p-2 rounded">{JSON.stringify(log.result, null, 2)}</pre>
                    )}
                  </div>
                )}

                {log.type === 'report' && (
                  <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]">
                    <div className="flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /><span className="font-bold">{log.content}</span></div>
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
