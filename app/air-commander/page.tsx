"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Radar, ShieldCheck, Database, AlertTriangle, Ship, Lock, RefreshCw, FileText } from "lucide-react";
import { AirCommanderTerminal } from "@/components/air-commander-terminal";

// Dynamically import the map to prevent SSR issues
const AirCommanderMap = dynamic(() => import("@/components/air-commander-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-900/50 flex items-center justify-center">
      <span className="text-cyan-400 font-space-mono text-xs animate-pulse">LOADING TACTICAL MAP...</span>
    </div>
  ),
});

export default function AirCommanderPage() {
  const [fleetData, setFleetData] = useState<any>(null);
  const [auditLog, setAuditLog] = useState<any[]>([]);

  const fetchFleet = async () => {
    try {
      const res = await fetch("/api/fleet");
      if (res.ok) {
        const data = await res.json();
        setFleetData(data);
        setAuditLog(data.audit_log || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#020813] text-cyan-50 pt-20 pb-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full space-y-6 relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-cyan-500/20 pb-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-space-mono text-cyan-400 tracking-[0.3em] uppercase">Tactical Command</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-orbitron font-black tracking-tight text-white flex items-center gap-3">
              A.I.R. COMMANDER <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded text-cyan-400 font-normal">AGENT V1.0</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[9px] text-slate-500 font-space-mono uppercase">System Status</div>
              <div className="text-xs text-emerald-400 font-orbitron flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> AGENT ACTIVE
              </div>
            </div>
            <button 
              onClick={() => fetchFleet()}
              className="p-2.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all group"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400 group-active:animate-spin" />
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden min-h-0">
          
          {/* Left/Main Column: Agent Console */}
          <div className="flex flex-col gap-6 overflow-hidden min-h-0 h-full">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl flex-1">
              <div className="p-4 border-b border-white/5 bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm font-orbitron text-cyan-400 tracking-widest uppercase font-bold">Agentic Interface</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-[10px] font-space-mono text-cyan-400/60 uppercase tracking-widest">SECURE LINK ESTABLISHED</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <AirCommanderTerminal />
              </div>
            </div>
          </div>

          {/* Right Column: Blockchain Audit Log & Mini-Fleet Status */}
          <div className="flex flex-col gap-6 overflow-hidden min-h-0">
            {/* Blockchain Audit Log */}
            <div className="bg-slate-950/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col flex-1 overflow-hidden min-h-0 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] font-orbitron tracking-wider">BLOCKCHAIN AUDIT</span>
                </div>
                <span className="text-[8px] font-space-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20 uppercase">Verified</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {auditLog.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20">
                    <Database className="w-8 h-8 mb-2" />
                    <span className="text-[9px] font-space-mono uppercase text-center px-4">Awaiting Data Synchronization</span>
                  </div>
                ) : (
                  auditLog.slice().reverse().map((log: any, i: number) => (
                    <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-xl hover:border-cyan-500/20 transition-all group">
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-[9px] font-bold text-cyan-300 font-orbitron uppercase tracking-tighter">{log.event}</span>
                        <span className="text-[8px] text-slate-500 font-space-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed font-space-mono group-hover:text-slate-300 transition-colors">
                        {log.details}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.2);
        }
      `}</style>
    </div>
  );
}
