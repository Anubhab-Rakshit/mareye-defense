"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import { Radar, Anchor, Shield, Target, Info, AlertTriangle, Crosshair } from "lucide-react";

interface NavalAsset {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  threat: "friendly" | "hostile" | "neutral";
  details: string;
  heading?: number;
  speed?: number;
  status?: string;
  distance?: number;
  vulnerability?: string;
  damagePotential?: string;
}

interface TacticalGlobeProps {
  assets: any[];
  zones?: any[];
  userLocation?: [number, number];
  onAssetClick?: (asset: any) => void;
  selectedAssetId?: string | null;
}

// Haversine distance formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function TacticalGlobe({ 
  assets, 
  zones = [],
  userLocation = [21.0, 88.0],
  onAssetClick, 
  selectedAssetId 
}: TacticalGlobeProps) {
  const globeRef = useRef<GlobeMethods>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive handling
  useEffect(() => {
    if (containerRef.current) {
      const updateDimensions = () => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight
          });
        }
      };
      
      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, []);

  const gData = useMemo(() => {
    // Only show "detected" points (hostiles/alerts) or specific base locations
    const filteredAssets = assets.map(asset => {
      const dist = calculateDistance(userLocation[0], userLocation[1], asset.lat, asset.lng);
      return {
        ...asset,
        distance: Math.round(dist),
        size: asset.id === selectedAssetId ? 0.8 : 0.4,
        color: asset.threat === "hostile" ? "#ef4444" : 
               asset.threat === "friendly" ? "#10b981" : "#f59e0b"
      };
    });
    
    // Add user location
    filteredAssets.push({
      id: "USER_LOC",
      name: "NSC-01 (Your Location)",
      type: "base",
      lat: userLocation[0],
      lng: userLocation[1],
      threat: "friendly",
      details: "Command Center",
      size: 0.6,
      color: "#06b6d4" // Cyan
    });

    return filteredAssets;
  }, [assets, selectedAssetId, userLocation]);

  // Arcs for "detected" threats (simulation) - relative to user
  const arcsData = useMemo(() => {
    const hostile = assets.filter(a => a.threat === "hostile");
    
    if (hostile.length > 0) {
      return hostile.map(h => ({
        startLat: userLocation[0],
        startLng: userLocation[1],
        endLat: h.lat,
        endLng: h.lng,
        color: ["rgba(6, 182, 212, 0.4)", "rgba(239, 68, 68, 0.6)"]
      }));
    }
    return [];
  }, [assets, userLocation]);

  // Threat rings based on zones
  const ringsData = useMemo(() => zones.map(z => ({
    lat: z.lat,
    lng: z.lon || z.lng,
    maxR: (z.threat.level / 100) * 5 + 2,
    propagationSpeed: (z.threat.level / 100) * 2 + 0.5,
    color: z.threat.level > 60 ? "rgba(239, 68, 68, 0.3)" : z.threat.level > 30 ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.1)"
  })), [zones]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-slate-950 overflow-hidden">
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Atmosphere
        showAtmosphere={true}
        atmosphereColor="#06b6d4"
        atmosphereAltitude={0.15}

        // Points (Naval Assets/detections)
        pointsData={gData}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius="size"
        pointAltitude={0.01}
        pointsMerge={true}
        onPointClick={(p: any) => onAssetClick?.(p)}

        // Arcs (Tactical Links)
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={4}
        arcDashAnimateTime={1500}
        arcStroke={0.5}

        // Rings (Threat Zones)
        ringsData={ringsData}
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod={1500}

        // Labels
        labelsData={gData}
        labelLat="lat"
        labelLng="lng"
        labelText="name"
        labelSize={0.3}
        labelDotRadius={0.15}
        labelColor={(d: any) => d.color}
        labelResolution={2}
      />

      {/* 3D UI Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="flex flex-col gap-2">
           <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/30 px-3 py-1.5 rounded-lg backdrop-blur-md shadow-lg shadow-cyan-500/10">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-orbitron text-cyan-300 tracking-widest uppercase">HD SATELLITE TACTICAL ENGINE</span>
           </div>
           {selectedAssetId && (() => {
             const asset = gData.find(d => d.id === selectedAssetId);
             if (!asset || asset.id === "USER_LOC") return null;
             
             return (
               <div className="bg-slate-900/95 border border-cyan-500/40 p-4 rounded-xl backdrop-blur-xl animate-in fade-in zoom-in duration-300 shadow-2xl shadow-cyan-500/20 w-64">
                 <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                     <Target className="w-4 h-4 text-red-500 animate-pulse" />
                     <span className="text-[10px] font-orbitron text-cyan-300 tracking-tighter uppercase font-bold">CONTACT ANALYSIS</span>
                   </div>
                   <div className="px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-[8px] text-red-400 font-bold">HOSTILE</div>
                 </div>

                 <div className="space-y-3">
                   {/* Target Info */}
                   <div>
                     <p className="text-[9px] font-space-mono text-slate-500 uppercase">Identification</p>
                     <p className="text-[12px] font-orbitron text-white">{asset.name}</p>
                   </div>

                   {/* Distance & Position */}
                   <div className="grid grid-cols-2 gap-2">
                     <div>
                       <p className="text-[8px] font-space-mono text-slate-500 uppercase">Distance</p>
                       <p className="text-[11px] font-space-mono text-cyan-400">{asset.distance} KM</p>
                     </div>
                     <div>
                       <p className="text-[8px] font-space-mono text-slate-500 uppercase">Tracking</p>
                       <p className="text-[11px] font-space-mono text-emerald-400">STABLE</p>
                     </div>
                   </div>

                   {/* AI Vulnerability Section */}
                   <div className="pt-2 border-t border-cyan-500/20">
                     <div className="flex items-center gap-1.5 mb-2">
                       <Shield className="w-3 h-3 text-amber-500" />
                       <span className="text-[9px] font-orbitron text-amber-400 uppercase">Vulnerability Profile</span>
                     </div>
                     
                     <div className="space-y-2 bg-black/40 p-2 rounded-lg border border-amber-500/10">
                       <div>
                         <p className="text-[7px] font-space-mono text-amber-500/70 uppercase">Primary Weakness</p>
                         <p className="text-[10px] font-space-mono text-white leading-tight">{asset.vulnerability || "Analyzing..."}</p>
                       </div>
                       <div>
                         <p className="text-[7px] font-space-mono text-amber-500/70 uppercase">Damage Potential</p>
                         <div className="flex items-center gap-2 mt-0.5">
                           <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                             <div 
                               className={`h-full animate-pulse ${asset.damagePotential === 'Critical' ? 'bg-red-500' : 'bg-amber-500'}`} 
                               style={{ width: asset.damagePotential === 'Critical' ? '95%' : '65%' }} 
                             />
                           </div>
                           <span className="text-[9px] font-space-mono text-white">{asset.damagePotential}</span>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Tactical Recommendation */}
                   <div className="pt-2">
                     <div className="flex items-center gap-1.5 mb-1.5">
                       <AlertTriangle className="w-3 h-3 text-cyan-400" />
                       <span className="text-[9px] font-orbitron text-cyan-300 uppercase">Recommendation</span>
                     </div>
                     <p className="text-[9px] font-space-mono text-cyan-300/80 italic leading-relaxed">
                       {asset.details.split('Tactical Rec: ')[1] || "Triangulate for strike coordinates..."}
                     </p>
                   </div>
                 </div>

                 {/* Bottom interactive hint */}
                 <div className="mt-4 flex items-center justify-center gap-2 border-t border-cyan-500/10 pt-3">
                   <div className="w-1 h-1 rounded-full bg-cyan-500 animate-ping" />
                   <span className="text-[7px] font-space-mono text-cyan-500/60 uppercase tracking-widest">Awaiting Command Override</span>
                 </div>
               </div>
             );
           })()}
        </div>
      </div>

      <style jsx global>{`
        .scene-container .clickable {
          cursor: crosshair !important;
        }
      `}</style>
    </div>
  );
}
