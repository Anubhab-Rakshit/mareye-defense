"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Globe2, Radar, Shield, Target, AlertTriangle,
  Anchor, RefreshCw, Activity, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import { WarRoomHoneypotFeed } from "@/components/war-room-honeypot-feed";
import { loadDetections } from "@/lib/detection-storage";

// Dynamically import Tactical Globe to prevent SSR window issues
const TacticalGlobe = dynamic(
  () => import("@/components/tactical-globe"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 rounded-xl">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-2" />
          <p className="text-[10px] text-cyan-500/50 font-space-mono">INITIALIZING 3D TACTICAL ENGINE...</p>
        </div>
      </div>
    ),
  }
);

interface ZoneData {
  id: string; name: string; lat: number; lon: number; command: string; hq: string;
  marine: any; weather: any;
  threat: { level: number; category: string; factors: { name: string; score: number; detail: string }[] };
  ops: { operation: string; ready: boolean; confidence: number; status: string; conditions: string }[];
}

interface IntelResponse {
  timestamp: string; zones: ZoneData[];
  summary: { totalZones: number; criticalZones: number; highZones: number; moderateZones: number; lowZones: number; avgThreat: number; overallReadiness: number };
  brief: string;
}

interface NavalAsset {
  id: string; name: string; type: "carrier" | "submarine" | "destroyer" | "patrol" | "aircraft" | "base";
  lat: number; lng: number; heading: number; speed: number;
  status: "active" | "alert" | "patrol" | "docked";
  threat: "friendly" | "hostile" | "neutral";
  details: string;
}

function generateAssets(zones: ZoneData[]): NavalAsset[] {
  const assets: NavalAsset[] = [
    { id: "INS-VKT", name: "INS Vikrant", type: "carrier", lat: 15.4, lng: 73.8, heading: 180, speed: 18, status: "active", threat: "friendly", details: "Vikrant-class Aircraft Carrier — CBG Alpha\n40,000t / Deck: MiG-29K, KA-31" },
    { id: "INS-ARH", name: "INS Arihant", type: "submarine", lat: 10, lng: 72, heading: 90, speed: 12, status: "patrol", threat: "friendly", details: "Arihant-class SSBN — Strategic Deterrence Patrol\n6,000t / K-15 SLBM / Nuclear Powered" },
    { id: "INS-KOL", name: "INS Kolkata", type: "destroyer", lat: 18.9, lng: 72.8, heading: 270, speed: 22, status: "active", threat: "friendly", details: "Kolkata-class DDG — Western Fleet\n7,500t / BrahMos AShM / Barak-8 SAM" },
    { id: "INS-SHV", name: "INS Shivalik", type: "destroyer", lat: 17, lng: 83, heading: 150, speed: 16, status: "patrol", threat: "friendly", details: "Shivalik-class Frigate — Eastern Fleet\n6,200t / BrahMos / 76mm OTO" },
    { id: "P8I-01", name: "Neptune-1", type: "aircraft", lat: 12, lng: 75, heading: 45, speed: 490, status: "active", threat: "friendly", details: "P-8I Neptune — Maritime Patrol\nAPS-154 Radar / Mk 54 Torpedoes" },
    { id: "INS-BZ", name: "INS Baaz", type: "base", lat: 6.8, lng: 93.9, heading: 0, speed: 0, status: "active", threat: "friendly", details: "Naval Air Station Baaz — Andaman & Nicobar\nForward Operating Base" },
    { id: "KRW-B", name: "Karwar NB", type: "base", lat: 14.8, lng: 74.1, heading: 0, speed: 0, status: "active", threat: "friendly", details: "Project Seabird — Western Naval Command\nLargest naval base in Indian Ocean" },
    { id: "VSK-B", name: "Vizag NB", type: "base", lat: 17.7, lng: 83.3, heading: 0, speed: 0, status: "active", threat: "friendly", details: "Eastern Naval Command HQ\nSubmarine arm / Ship Building Centre" },
    { id: "INS-VKM", name: "INS Vikramaditya", type: "carrier", lat: 8.5, lng: 76, heading: 120, speed: 15, status: "patrol", threat: "friendly", details: "Modified Kiev-class Carrier\n45,400t / MiG-29K Air Wing" },
    { id: "INS-CKR", name: "INS Chakra II", type: "submarine", lat: 5, lng: 80, heading: 200, speed: 18, status: "patrol", threat: "friendly", details: "Akula-II class SSN — Hunter-Killer\n12,000t / Klub-S Missiles" },
    { id: "DRN-01", name: "Drishti-10", type: "patrol", lat: 20, lng: 65, heading: 90, speed: 180, status: "active", threat: "friendly", details: "Heron TP UAV — Surveillance Drone\nEO/IR + Maritime Radar" },
  ];
  zones.forEach((z, i) => {
    if (z.threat.level > 35) {
      const t = Date.now() / 30000 + i;
      assets.push({
        id: `TRK-${String.fromCharCode(65 + i)}`,
        name: `Contact ${String.fromCharCode(65 + i)}`,
        type: z.threat.level > 65 ? "submarine" : "patrol",
        lat: z.lat + Math.sin(t) * 2.5,
        lng: z.lon + Math.cos(t) * 2.5,
        heading: Math.round((Date.now() / 1000 + i * 37) % 360),
        speed: z.threat.level > 65 ? 8 : 14,
        status: z.threat.level > 65 ? "alert" : "patrol",
        threat: z.threat.level > 65 ? "hostile" : "neutral",
        details: z.threat.level > 65
          ? `Unidentified subsurface contact — ${z.name}\nSonar classification pending`
          : `Merchant/fishing traffic — ${z.name}`,
      });
    }
  });
  return assets;
}

export default function GlobeWarRoom() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intel, setIntel] = useState<IntelResponse | null>(null);
  const [assets, setAssets] = useState<NavalAsset[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([21.0, 88.0]);
  const [selectedAsset, setSelectedAsset] = useState<NavalAsset | null>(null);

  useEffect(() => {
    // Initial load from localStorage
    const loadLocalData = () => {
      if (typeof window !== "undefined") {
        const storedLocation = localStorage.getItem("userLocation");
        let uLoc: [number, number] = [21.0, 88.0];
        if (storedLocation) {
          try {
            const parsed = JSON.parse(storedLocation);
            uLoc = [parsed.lat, parsed.lng];
          } catch (e) {}
        }

        // Load detections from the shared library
        const detections = loadDetections();
        
        // Convert stored detections to NavalAssets for the 3D globe
        const threatAssets: NavalAsset[] = detections
          .filter((d: any) => d.lat !== undefined && d.lng !== undefined)
          .flatMap((d: any, i: number) => 
            d.detections.map((obj: any, objIdx: number) => {
              const vulnerabilities = [
                'Hull Seal Instability (SS-S3)', 
                'Signal Cavitation Signature', 
                'Thermal Exhaust Leak (Port-side)', 
                'Electronic Scrambler Desync'
              ];
              const potentials = ['Critical', 'Severe', 'Moderate', 'Slight'];
              const recommendations = [
                'Acoustic Decoy Deployment', 
                'Depth Charge Alpha Strike', 
                'Electronic Suppression Pulse', 
                'Passive Buoy Triangulation'
              ];
              
              const vuln = vulnerabilities[Math.floor(Math.random() * vulnerabilities.length)];
              const pot = potentials[Math.floor(Math.random() * potentials.length)];
              const rec = recommendations[Math.floor(Math.random() * recommendations.length)];

              return {
                id: `${d.id}_${objIdx}`,
                name: obj.class.toUpperCase(),
                type: obj.class.toLowerCase().includes('submarine') ? 'submarine' : 'patrol',
                lat: Number(d.lat),
                lng: Number(d.lng),
                heading: Math.round(Math.random() * 360),
                speed: Math.round(Math.random() * 15),
                status: "alert",
                threat: "hostile",
                vulnerability: vuln,
                damagePotential: pot,
                details: `AI Scan Analysis #${d.id.slice(-4)}\nClass: ${obj.class}\nConfidence: ${(obj.confidence * 100).toFixed(1)}%\nTactical Rec: ${rec}`
              };
            })
          );

        setAssets(threatAssets);
        setUserLocation(uLoc); // Ensure state is updated so TacticalGlobe receives it
        setLoading(false);
      }
    };

    // Load initial data
    loadLocalData();

    // Listen for new detections
    const handleDetectionEvent = () => {
      loadLocalData();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("detectionAdded", handleDetectionEvent);
      // Also fetch the intel summary for the stats bar
      const fetchIntel = async () => {
        try {
          const res = await fetch("/api/intelligence");
          if (res.ok) {
            const json = await res.json();
            setIntel(json);
          }
        } catch (e) {}
      };
      fetchIntel();
      
      return () => window.removeEventListener("detectionAdded", handleDetectionEvent);
    }
  }, []);

  // Loading state — inline, no full-page takeover since we're inside a tab
  if (loading && !intel) return (
    <div className="flex items-center justify-center h-[70vh] w-full">
      <div className="text-center">
        <Radar className="w-12 h-12 text-cyan-400 mx-auto mb-3 animate-spin" />
        <p className="text-cyan-400 font-orbitron animate-pulse tracking-widest text-sm">CONNECTING TO INTEL NETWORK...</p>
        <div className="mt-3 w-40 mx-auto h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-500/60 rounded-full animate-pulse" style={{ width: "65%" }} />
        </div>
      </div>
    </div>
  );

  // Error state — inline
  if (error) return (
    <div className="flex items-center justify-center h-[70vh] w-full">
      <div className="text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-400 font-orbitron text-sm mb-1">INTELLIGENCE LINK FAILED</p>
        <p className="text-[11px] font-space-mono text-slate-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 border border-cyan-500/40 text-cyan-400 rounded-lg font-orbitron text-xs hover:bg-cyan-500/10 transition-all"
        >
          RETRY
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Quick Stat Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { l: "ZONES MONITORED", v: intel?.summary.totalZones ?? 0, c: "text-cyan-400", dot: "bg-cyan-400" },
          { l: "CRITICAL THREATS", v: intel?.summary.criticalZones ?? 0, c: "text-red-400", dot: "bg-red-400" },
          { l: "HIGH THREATS", v: intel?.summary.highZones ?? 0, c: "text-orange-400", dot: "bg-orange-400" },
          { l: "FLEET READINESS", v: `${intel?.summary.overallReadiness ?? 0}%`, c: "text-emerald-400", dot: "bg-emerald-400" },
        ].map(s => (
          <div key={s.l} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm">
            <div className={`w-2.5 h-2.5 rounded-full ${s.dot} animate-pulse flex-shrink-0`} />
            <div>
              <div className={`text-base font-orbitron font-bold ${s.c}`}>{s.v}</div>
              <div className="text-[9px] text-slate-500 font-space-mono tracking-widest uppercase">{s.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_240px] gap-3" style={{ minHeight: "600px" }}>

        {/* ── LEFT: Intel Feed + Honeypot ── */}
        <div className="flex flex-col gap-3">
          {/* Live Intel Feed */}
          <div className="bg-slate-900/50 border border-cyan-500/15 rounded-xl p-3 flex flex-col flex-1" style={{ maxHeight: "380px" }}>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cyan-500/10">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-orbitron text-cyan-400 tracking-wider">LIVE INTEL FEED</span>
              <span className="ml-auto text-[8px] text-emerald-400 font-space-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
                LIVE
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 war-scroll pr-1">
              {intel?.zones.map(z => (
                <div key={z.id} className="bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-cyan-500/20 rounded-lg p-2 transition-all cursor-pointer group">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-cyan-300 font-orbitron font-bold truncate mr-2">{z.name}</span>
                    <span className={`text-[8px] font-orbitron px-1.5 py-0.5 rounded flex-shrink-0 ${
                      z.threat.level > 60 ? "bg-red-500/20 text-red-400" :
                      z.threat.level > 30 ? "bg-amber-500/20 text-amber-400" :
                      "bg-emerald-500/10 text-emerald-400"
                    }`}>{z.threat.level}%</span>
                  </div>
                  <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      z.threat.level > 60 ? "bg-red-500" : z.threat.level > 30 ? "bg-amber-500" : "bg-emerald-500"
                    }`} style={{ width: `${z.threat.level}%` }} />
                  </div>
                  <div className="text-[8px] text-slate-600 font-space-mono mt-1">{z.threat.category}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Honeypot Feed */}
          <div className="flex-shrink-0">
            <WarRoomHoneypotFeed />
          </div>
        </div>

        {/* ── CENTRE: Leaflet Map ── */}
        <div className="relative rounded-xl border border-cyan-500/20 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.08)]" style={{ minHeight: "600px" }}>
          {/* Overlay badges */}
          <div className="absolute top-3 left-3 z-20 flex gap-2 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-lg border border-cyan-500/20 shadow-md">
              <Globe2 className="w-3 h-3 text-cyan-400" />
              <span className="text-[9px] font-orbitron text-cyan-300 tracking-wider">TACTICAL MAP</span>
            </div>
          </div>
          <div className="absolute top-3 right-3 z-20 flex gap-1.5 pointer-events-none">
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] backdrop-blur-md">LIVE</Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px] backdrop-blur-md">AI</Badge>
          </div>
          {/* Scan line effect */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent z-10 pointer-events-none" />

          <TacticalGlobe 
            assets={assets} 
            zones={intel?.zones || []}
            userLocation={userLocation}
            onAssetClick={setSelectedAsset}
            selectedAssetId={selectedAsset?.id}
          />
        </div>

        {/* ── RIGHT: Naval Assets + Zone Threats ── */}
        <div className="flex flex-col gap-3">
          {/* Naval Assets */}
          <div className="bg-slate-900/50 border border-cyan-500/15 rounded-xl p-3 flex flex-col flex-1" style={{ maxHeight: "380px" }}>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cyan-500/10">
              <Anchor className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[10px] font-orbitron text-red-400 tracking-wider">DETECTED HOSTILES</span>
              <span className="ml-auto text-[8px] text-slate-500 font-space-mono">{assets.length} isolated tracks</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 war-scroll pr-1">
              {assets.map(a => {
                const isS = selectedAsset?.id === a.id;
                const isHostile = a.threat === "hostile";
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAsset(isS ? null : a)}
                    className={`w-full text-left rounded-lg p-2 border transition-all ${
                      isS
                        ? "border-cyan-400/40 bg-cyan-950/30"
                        : isHostile
                        ? "border-red-500/20 bg-red-950/10 hover:bg-red-950/20"
                        : "border-slate-800 bg-slate-950/40 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-orbitron font-bold ${isHostile ? "text-red-400" : "text-cyan-300"}`}>
                        {a.id}
                      </span>
                      <span className={`text-[7px] font-space-mono px-1 py-0.5 rounded ${
                        isHostile ? "bg-red-500/20 text-red-400" :
                        a.status === "active" ? "bg-emerald-500/10 text-emerald-400" :
                        "bg-slate-700/50 text-slate-400"
                      }`}>{a.type.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[8px] text-slate-400 truncate mr-2">{a.name}</span>
                      {a.speed > 0 && <span className="text-[7px] text-slate-600 flex-shrink-0">{a.speed}kn</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asset Detail (when selected) OR Zone Threats */}
          {selectedAsset ? (
            <div className={`bg-slate-900/60 border rounded-xl p-3 flex-shrink-0 ${
              selectedAsset.threat === "hostile" ? "border-red-500/30" : "border-cyan-500/20"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Target className={`w-3.5 h-3.5 ${selectedAsset.threat === "hostile" ? "text-red-400" : "text-cyan-400"}`} />
                <span className="text-[10px] font-orbitron text-cyan-400 tracking-wider">ASSET INTEL</span>
                <button onClick={() => setSelectedAsset(null)} className="ml-auto text-[8px] text-slate-600 hover:text-slate-400 px-1">✕ CLOSE</button>
              </div>
              <div className="space-y-1.5 text-[8px] font-space-mono">
                {[
                  { l: "CALLSIGN", v: selectedAsset.name },
                  { l: "TYPE", v: selectedAsset.type.toUpperCase() },
                  { l: "POSITION", v: `${selectedAsset.lat.toFixed(2)}°N ${selectedAsset.lng.toFixed(2)}°E` },
                  { l: "COURSE/SPD", v: `${selectedAsset.heading}° / ${selectedAsset.speed}kn` },
                  { l: "STATUS", v: selectedAsset.status.toUpperCase() },
                  { l: "IFF", v: selectedAsset.threat.toUpperCase() },
                ].map(r => (
                  <div key={r.l} className="flex justify-between items-center">
                    <span className="text-slate-600">{r.l}</span>
                    <span className={selectedAsset.threat === "hostile" ? "text-red-300" : "text-slate-300"}>{r.v}</span>
                  </div>
                ))}
                <div className="mt-2 pt-2 border-t border-slate-800/40 text-[7px] text-slate-500 leading-relaxed whitespace-pre-line">
                  {selectedAsset.details}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-amber-500/15 rounded-xl p-3 flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-orbitron text-amber-400 tracking-wider">ZONE THREATS</span>
              </div>
              <div className="space-y-1.5">
                {intel?.zones
                  .slice()
                  .sort((a, b) => b.threat.level - a.threat.level)
                  .map(z => (
                    <div key={z.id} className="bg-slate-800/20 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] text-slate-400 font-space-mono truncate mr-2">{z.name.split(" ").slice(0, 2).join(" ")}</span>
                        <span className={`text-[7px] font-orbitron px-1 py-0.5 rounded flex-shrink-0 ${
                          z.threat.level >= 75 ? "bg-red-500/20 text-red-400" :
                          z.threat.level >= 50 ? "bg-orange-500/15 text-orange-400" :
                          z.threat.level >= 25 ? "bg-amber-500/10 text-amber-400" :
                          "bg-emerald-500/10 text-emerald-400"
                        }`}>{z.threat.level}%</span>
                      </div>
                      <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          z.threat.level >= 75 ? "bg-red-500" :
                          z.threat.level >= 50 ? "bg-orange-500" :
                          z.threat.level >= 25 ? "bg-amber-500" : "bg-emerald-500"
                        }`} style={{ width: `${z.threat.level}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .war-scroll::-webkit-scrollbar { width: 2px; }
        .war-scroll::-webkit-scrollbar-track { background: transparent; }
        .war-scroll::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.15); border-radius: 2px; }
      `}</style>
    </div>
  );
}
