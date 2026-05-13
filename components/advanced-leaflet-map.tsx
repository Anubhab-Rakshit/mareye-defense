"use client";

import React, { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

// Create custom icons dynamically
function createHtmlIcon(htmlContent: string) {
  return L.divIcon({
    html: htmlContent,
    className: "", // Clear default Leaflet classes
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

// Map Updater Hook
function GlobalMapViewUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.5,
    });
  }, [center, zoom, map]);
  return null;
}

export default function AdvancedLeafletMap() {
  const [userLocation, setUserLocation] = useState<[number, number]>([21.0, 88.0]); // Default to Bay of Bengal vicinity
  const [threats, setThreats] = useState<any[]>([]);

  // Load state from local storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLocation = localStorage.getItem("userLocation");
      if (storedLocation) {
        const parsed = JSON.parse(storedLocation);
        setUserLocation([parsed.lat, parsed.lng]);
      }

      const storedThreats = localStorage.getItem("activeThreats");
      if (storedThreats) {
        setThreats(JSON.parse(storedThreats));
      }

      // Listen for new threats detected by CNN or Detection views
      const handleThreatEvent = (e: any) => {
        setThreats((prev) => {
          const newThreats = [e.detail, ...prev].slice(0, 10);
          return newThreats;
        });
      };

      window.addEventListener("threatDetected", handleThreatEvent);
      return () => window.removeEventListener("threatDetected", handleThreatEvent);
    }
  }, []);

  const SubmarineIcon = createHtmlIcon(`
    <div style="width: 24px; height: 24px; background: rgba(16, 185, 129, 0.2); border: 2px solid #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(16, 185, 129, 0.6); animation: pulse 2s infinite;">
      <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>
    </div>
  `);

  const ThreatIcon = createHtmlIcon(`
    <div style="width: 20px; height: 20px; background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);">
      <div style="width: 6px; height: 6px; background: #ef4444; border-radius: 50%;"></div>
    </div>
  `);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border-2 border-cyan-500/30">
      <MapContainer
        center={userLocation}
        zoom={5}
        style={{ width: "100%", height: "100%", background: "#020617" }}
        zoomControl={false}
      >
        <GlobalMapViewUpdater center={userLocation} zoom={5} />
        
        {/* Deep Ocean Tactical Basemap */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* User / Submarine Marker */}
        <Marker position={userLocation} icon={SubmarineIcon}>
          <Popup className="bg-slate-900 border border-emerald-500/50 text-white rounded-lg p-0">
            <div className="p-3 bg-slate-900 rounded-lg">
              <h4 className="text-emerald-400 font-orbitron font-bold text-sm">NCS-01 (Your Location)</h4>
              <p className="text-xs text-slate-400 font-space-mono mt-1">Status: Active Patrol</p>
              <p className="text-xs text-slate-400 font-space-mono">Coords: {userLocation[0].toFixed(2)}, {userLocation[1].toFixed(2)}</p>
            </div>
          </Popup>
        </Marker>

        {/* Threat Markers and Polylines */}
        {threats.map((threat) => (
          <React.Fragment key={threat.id}>
            <Polyline
              positions={[userLocation, [threat.lat, threat.lng]]}
              color="#ef4444"
              weight={2}
              dashArray="5, 10"
              opacity={0.6}
            />
            <Marker position={[threat.lat, threat.lng]} icon={ThreatIcon}>
              <Popup className="bg-slate-900 border border-red-500/50 text-white rounded-lg p-0">
                <div className="p-3 bg-slate-900 rounded-lg max-w-[250px]">
                  <h4 className="text-red-400 font-orbitron font-bold text-sm uppercase">{threat.classification}</h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-slate-300 font-space-mono"><span className="text-red-400">Distance:</span> {threat.distance} km</p>
                    <p className="text-xs text-slate-300 font-space-mono"><span className="text-red-400">Confidence:</span> {threat.threatScore}%</p>
                    <div className="my-2 border-t border-red-500/20 pt-2">
                       <p className="text-[10px] text-orange-300 font-bold uppercase">AI Insights:</p>
                       <p className="text-[10px] text-slate-400 leading-tight mt-1">- {threat.vulnerability}</p>
                       <p className="text-[10px] text-slate-400 leading-tight mt-1">- Expected Damage: {threat.damagePotential}</p>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

      </MapContainer>

      {/* Map Overlay UI */}
      <div className="absolute top-4 left-4 z-[400] bg-slate-900/80 backdrop-blur-md border border-cyan-500/40 p-3 rounded-xl pointer-events-none shadow-lg">
         <h3 className="text-cyan-400 font-orbitron text-xs tracking-widest uppercase mb-1">Global Threat Matrix</h3>
         <p className="text-[10px] text-slate-400 font-space-mono">Active Threats: <span className="text-red-400 font-bold">{threats.length}</span></p>
      </div>

      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          padding: 0;
          box-shadow: none !important;
        }
        .leaflet-popup-tip {
          background: #0f172a !important; /* slate-900 */
          border: 1px solid rgba(239, 68, 68, 0.5); /* Red border tint */
        }
        .leaflet-container {
          background: #020617;
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}
