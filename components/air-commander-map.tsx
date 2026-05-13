"use client";

import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function createShipIcon(status: string, name: string) {
  const isPatrolling = status === "PATROLLING";
  const color = isPatrolling ? "#10b981" : "#ef4444";
  const glow = isPatrolling ? "rgba(16,185,129,0.6)" : "rgba(239,68,68,0.8)";
  return L.divIcon({
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="
          width:14px;height:14px;
          background:${color};
          border-radius:50%;
          box-shadow:0 0 12px ${glow}, 0 0 4px ${glow};
          ${!isPatrolling ? 'animation:blink 0.6s infinite alternate;' : ''}
          border:2px solid white;
        "></div>
        <div style="
          margin-top:3px;
          background:rgba(2,8,19,0.85);
          color:${color};
          font-size:8px;
          font-family:monospace;
          font-weight:bold;
          padding:1px 4px;
          border-radius:2px;
          border:1px solid ${color}44;
          white-space:nowrap;
          letter-spacing:0.05em;
        ">${name.replace("INS ", "")}</div>
      </div>
      <style>@keyframes blink{from{opacity:1}to{opacity:0.3}}</style>
    `,
    className: "",
    iconSize: [60, 40],
    iconAnchor: [30, 20],
    popupAnchor: [0, -20],
  });
}

function createThreatIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="
          width:24px;height:24px;
          background:rgba(239,68,68,0.2);
          border:2px dashed #ef4444;
          border-radius:50%;
          box-shadow:0 0 30px rgba(239,68,68,0.5);
          animation:pulse 1s infinite;
        "></div>
        <div style="
          margin-top:4px;
          background:#ef4444;
          color:white;
          font-size:9px;
          font-family:monospace;
          font-weight:900;
          padding:2px 6px;
          border-radius:4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          white-space:nowrap;
        ">⚠ HOSTILE</div>
      </div>
      <style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}</style>
    `,
    className: "",
    iconSize: [80, 50],
    iconAnchor: [40, 25],
  });
}

// Smoothly re-center map when threat is detected
function MapController({ threats }: { threats: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (threats.length > 0) {
      map.flyTo([threats[0].lat, threats[0].lng], 6, { duration: 1.5 });
    }
  }, [threats.length]);
  return null;
}

interface Props {
  fleetData: any;
}

export default function AirCommanderMap({ fleetData }: Props) {
  const vessels = fleetData?.vessels ?? [];
  const threats = fleetData?.active_threats ?? [];
  const diverted = vessels.filter((v: any) => v.status !== "PATROLLING");

  const center: [number, number] = threats.length > 0
    ? [threats[0].lat, threats[0].lng]
    : [15.0, 73.5];

  return (
    <div className="w-full h-[380px] rounded-xl overflow-hidden border border-cyan-500/30 relative shadow-[0_0_30px_rgba(6,182,212,0.1)]">
      <MapContainer
        center={center}
        zoom={6}
        style={{ width: "100%", height: "100%", background: "#020617" }}
        zoomControl={false}
      >
        <MapController threats={threats} />

        {/* Dark tactical basemap */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='© OpenStreetMap © CARTO'
        />

        {/* Threat markers with pulse circle */}
        {threats.map((t: any) => (
          <React.Fragment key={t.id}>
            <Circle
              center={[t.lat, t.lng]}
              radius={80000}
              pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.08, weight: 1, dashArray: "5 8" }}
            />
            <Marker position={[t.lat, t.lng]} icon={createThreatIcon()}>
              <Popup>
                <div style={{ background: "#0f172a", color: "#f87171", padding: "8px", borderRadius: "6px", fontFamily: "monospace", fontSize: "11px", minWidth: "160px" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "4px" }}>⚠ HOSTILE CONTACT</div>
                  <div>Class: {t.classification}</div>
                  <div>Coords: {t.lat}°N, {t.lng}°E</div>
                  <div>Detected: {new Date(t.detected_at).toLocaleTimeString()}</div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Lines from diverted ships to threat */}
        {diverted.map((v: any) =>
          threats.map((t: any) => (
            <Polyline
              key={`${v.id}-${t.id}`}
              positions={[[v.lat, v.lng], [t.lat, t.lng]]}
              pathOptions={{ color: "#ef4444", weight: 1.5, dashArray: "6 10", opacity: 0.5 }}
            />
          ))
        )}

        {/* All vessel markers */}
        {vessels.map((v: any) => (
          <Marker key={v.id} position={[v.lat, v.lng]} icon={createShipIcon(v.status, v.name)}>
            <Popup>
              <div style={{
                background: "#0f172a", padding: "10px", borderRadius: "8px", fontFamily: "monospace",
                fontSize: "11px", minWidth: "180px",
                border: `1px solid ${v.status === "PATROLLING" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
              }}>
                <div style={{ fontWeight: "bold", color: v.status === "PATROLLING" ? "#10b981" : "#ef4444", marginBottom: "6px", fontSize: "12px" }}>
                  {v.name}
                </div>
                <div style={{ color: "#94a3b8" }}>Class: <span style={{ color: "#e2e8f0" }}>{v.class}</span></div>
                <div style={{ color: "#94a3b8" }}>Status: <span style={{ color: v.status === "PATROLLING" ? "#10b981" : "#ef4444", fontWeight: "bold" }}>● {v.status}</span></div>
                <div style={{ color: "#94a3b8" }}>Position: <span style={{ color: "#e2e8f0" }}>{v.lat.toFixed(3)}°N, {v.lng.toFixed(3)}°E</span></div>
                <div style={{ color: "#94a3b8" }}>Speed: <span style={{ color: "#e2e8f0" }}>{v.speed_knots} knots</span></div>
                <div style={{ color: "#94a3b8" }}>Zone: <span style={{ color: "#e2e8f0" }}>{v.zone}</span></div>
                <div style={{ color: "#94a3b8", fontSize: "9px", marginTop: "4px" }}>
                  Updated: {new Date(v.last_updated).toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map legend overlay */}
      <div style={{
        position: "absolute", bottom: "12px", left: "12px", zIndex: 1000,
        background: "rgba(2,8,19,0.85)", backdropFilter: "blur(8px)",
        border: "1px solid rgba(6,182,212,0.3)", borderRadius: "8px",
        padding: "8px 12px", fontFamily: "monospace", fontSize: "9px",
      }}>
        <div style={{ color: "#64748b", marginBottom: "4px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Legend</div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981", marginBottom: "3px" }}>
          <div style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%" }} />
          Patrolling
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#ef4444", marginBottom: "3px" }}>
          <div style={{ width: "8px", height: "8px", background: "#ef4444", borderRadius: "50%" }} />
          Diverted by A.I.R
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#ef4444" }}>
          <div style={{ width: "8px", height: "8px", background: "transparent", border: "2px solid #ef4444", borderRadius: "50%" }} />
          Threat Zone
        </div>
      </div>

      {/* Live indicator */}
      <div style={{
        position: "absolute", top: "12px", right: "12px", zIndex: 1000,
        background: "rgba(2,8,19,0.85)", backdropFilter: "blur(8px)",
        border: "1px solid rgba(6,182,212,0.3)", borderRadius: "6px",
        padding: "4px 10px", fontFamily: "monospace", fontSize: "9px",
        display: "flex", alignItems: "center", gap: "6px", color: "#22d3ee",
        letterSpacing: "0.1em", textTransform: "uppercase",
      }}>
        <div style={{ width: "6px", height: "6px", background: "#22d3ee", borderRadius: "50%", animation: "pulse 2s infinite" }} />
        Live · {vessels.length} vessels tracked
      </div>
    </div>
  );
}
