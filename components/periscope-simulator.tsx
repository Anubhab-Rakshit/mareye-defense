"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Crosshair,
  Compass,
  ArrowUp,
  ChevronUp,
  ChevronDown,
  Target,
  Radio,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useSonarAudio } from "./sonar-audio-system";

interface PeriscopeContact {
  id: string;
  name: string;
  type: "surface" | "submarine" | "aircraft" | "unknown";
  bearing: number; // 0-360
  range: number; // km
  speed: number; // knots
  heading: number;
  threat: "hostile" | "neutral" | "friendly" | "unknown";
  classification: string;
}

// Generate contacts from real intelligence API data
function generateContactsFromIntel(zones: any[]): PeriscopeContact[] {
  const contacts: PeriscopeContact[] = [];

  // Fixed Indian Navy assets
  contacts.push(
    {
      id: "F1",
      name: "INS Kolkata",
      type: "surface",
      bearing: 210,
      range: 15.0,
      speed: 18,
      heading: 180,
      threat: "friendly",
      classification: "Kolkata-class Destroyer — DDG P63",
    },
    {
      id: "F2",
      name: "P-8I Neptune",
      type: "aircraft",
      bearing: 90,
      range: 25.0,
      speed: 490,
      heading: 180,
      threat: "friendly",
      classification: "Boeing P-8I — Maritime Patrol Aircraft",
    },
  );

  // Generate contacts dynamically based on zone threat data
  zones.forEach((zone, i) => {
    const baseBearing = (i * 60 + 30) % 360;

    if (zone.threat.level >= 65) {
      // High threat zone → hostile contact
      contacts.push({
        id: `H${i + 1}`,
        name: `Hostile Contact ${String.fromCharCode(65 + i)}`,
        type: zone.threat.level > 75 ? "submarine" : "surface",
        bearing:
          (baseBearing + Math.sin(Date.now() / 60000 + i) * 15 + 360) % 360,
        range: 2 + Math.random() * 6,
        speed: zone.threat.level > 75 ? 8 : 22,
        heading: Math.round(Math.random() * 360),
        threat: "hostile",
        classification:
          zone.threat.level > 75
            ? `Unidentified SSK — ${zone.name} — Threat: ${zone.threat.category}`
            : `Hostile Surface Vessel — ${zone.name} — ${zone.threat.factors?.[0]?.name || "Multiple alerts"}`,
      });
    } else if (zone.threat.level >= 35) {
      // Moderate threat → unknown or neutral
      contacts.push({
        id: `U${i + 1}`,
        name: `Contact ${String.fromCharCode(65 + i)}`,
        type: "unknown",
        bearing:
          (baseBearing + 45 + Math.sin(Date.now() / 50000 + i) * 10 + 360) %
          360,
        range: 4 + Math.random() * 8,
        speed: 6 + Math.round(Math.random() * 8),
        heading: Math.round(Math.random() * 360),
        threat: zone.threat.level >= 50 ? "neutral" : "unknown",
        classification: `Unidentified — ${zone.name} — Conditions: Wave ${zone.marine?.current?.wave_height?.toFixed(1) || "?"}m, Wind ${zone.weather?.current?.wind_speed_10m?.toFixed(0) || "?"}km/h`,
      });
    }

    // Merchant traffic in low threat zones
    if (zone.threat.level < 35 && i % 2 === 0) {
      contacts.push({
        id: `M${i + 1}`,
        name: `Merchant ${String.fromCharCode(65 + i)}`,
        type: "surface",
        bearing: (baseBearing + 120 + 360) % 360,
        range: 10 + Math.random() * 15,
        speed: 12,
        heading: Math.round(Math.random() * 360),
        threat: "neutral",
        classification: `Merchant Vessel — ${zone.name} — Normal traffic`,
      });
    }
  });

  return contacts;
}

export function PeriscopeSimulator() {
  const [rotation, setRotation] = useState(0);
  const [elevation, setElevation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedContact, setSelectedContact] =
    useState<PeriscopeContact | null>(null);
  const [depth, setDepth] = useState(18);
  const [isNightVision, setIsNightVision] = useState(false);
  const [waterLine, setWaterLine] = useState(50);
  const [loading, setLoading] = useState(true);
  const [contactPositions, setContactPositions] = useState<PeriscopeContact[]>(
    [],
  );
  const [weatherInfo, setWeatherInfo] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const audio = useSonarAudio();

  // Fetch real contacts from intelligence API
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/intelligence");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const contacts = generateContactsFromIntel(data.zones);
      setContactPositions(contacts);
      // Build weather info from real data
      const avgWave =
        data.zones.reduce(
          (s: number, z: any) => s + (z.marine?.current?.wave_height || 0),
          0,
        ) / data.zones.length;
      const avgWind =
        data.zones.reduce(
          (s: number, z: any) => s + (z.weather?.current?.wind_speed_10m || 0),
          0,
        ) / data.zones.length;
      const avgVis =
        data.zones.reduce(
          (s: number, z: any) => s + (z.weather?.current?.visibility || 50000),
          0,
        ) / data.zones.length;
      setWeatherInfo(
        `SEA STATE: ${avgWave.toFixed(1)}m | WIND: ${avgWind.toFixed(0)}km/h | VIS: ${(avgVis / 1000).toFixed(0)}km`,
      );
    } catch {
      // Fallback if API fails
      setContactPositions([
        {
          id: "F1",
          name: "INS Kolkata",
          type: "surface",
          bearing: 210,
          range: 15.0,
          speed: 18,
          heading: 180,
          threat: "friendly",
          classification: "Kolkata-class Destroyer",
        },
      ]);
      setWeatherInfo("API OFFLINE — Limited data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Animate water line
  useEffect(() => {
    const interval = setInterval(() => {
      setWaterLine(
        50 + Math.sin(Date.now() / 800) * 3 + Math.sin(Date.now() / 1300) * 2,
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Move contacts slowly
  useEffect(() => {
    if (contactPositions.length === 0) return;
    const interval = setInterval(() => {
      setContactPositions((prev) =>
        prev.map((c) => ({
          ...c,
          bearing: (c.bearing + (Math.random() - 0.5) * 0.3 + 360) % 360,
          range: Math.max(1, c.range + (Math.random() - 0.5) * 0.05),
        })),
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [contactPositions.length]);

  // Mouse drag for rotation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastX.current;
    const dy = e.clientY - lastY.current;
    setRotation((prev) => (prev - dx * 0.3 + 360) % 360);
    setElevation((prev) => Math.max(-10, Math.min(30, prev + dy * 0.2)));
    lastX.current = e.clientX;
    lastY.current = e.clientY;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setRotation((prev) => (prev + 2 + 360) % 360);
      if (e.key === "ArrowRight") setRotation((prev) => (prev - 2 + 360) % 360);
      if (e.key === "ArrowUp") setElevation((prev) => Math.min(30, prev + 1));
      if (e.key === "ArrowDown")
        setElevation((prev) => Math.max(-10, prev - 1));
      if (e.key === "+" || e.key === "=")
        setZoom((prev) => Math.min(8, prev + 1));
      if (e.key === "-") setZoom((prev) => Math.max(1, prev - 1));
      if (e.key === "n") setIsNightVision((prev) => !prev);
      if (e.key === "m") {
        setMarkings((prev) => [
          ...prev,
          { bearing: 0, label: `MK-${prev.length + 1}` },
        ]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [rotation]);

  // Check if a contact is visible in current FOV
  const getVisibleContacts = useCallback(() => {
    const fov = 40 / zoom; // Field of view narrows with zoom
    return contactPositions
      .filter((c) => {
        let diff = c.bearing - rotation;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        return Math.abs(diff) < fov / 2;
      })
      .map((c) => {
        let relBearing = c.bearing - rotation;
        if (relBearing > 180) relBearing -= 360;
        if (relBearing < -180) relBearing += 360;
        return {
          ...c,
          relBearing,
          screenX: 50 + (relBearing / (40 / zoom)) * 50,
        };
      });
  }, [rotation, zoom, contactPositions]);

  const visibleContacts = getVisibleContacts();

  const threatColor = (threat: string) => {
    switch (threat) {
      case "hostile":
        return "text-red-400 border-red-500";
      case "friendly":
        return "text-emerald-400 border-emerald-500";
      case "neutral":
        return "text-amber-400 border-amber-500";
      default:
        return "text-slate-400 border-slate-500";
    }
  };

  const threatBg = (threat: string) => {
    switch (threat) {
      case "hostile":
        return "bg-red-500/20";
      case "friendly":
        return "bg-emerald-500/20";
      case "neutral":
        return "bg-amber-500/20";
      default:
        return "bg-slate-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-[128px] pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-orbitron font-black text-cyan-400 tracking-wider mb-1">
            PERISCOPE STATION
          </h1>
          <p className="text-[10px] font-space-mono text-cyan-400/40 tracking-widest">
            INS ARIHANT // ATTACK PERISCOPE // LIVE INTELLIGENCE CONTACTS
          </p>
          {weatherInfo && (
            <p className="text-[9px] font-space-mono text-emerald-400/40 mt-1">
              {weatherInfo}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* ═══ MAIN PERISCOPE VIEW ═══ */}
          <div className="lg:col-span-3">
            <div
              ref={containerRef}
              className={`relative w-full aspect-[16/9] rounded-xl overflow-hidden cursor-crosshair select-none border-2 ${
                isNightVision ? "border-green-500/30" : "border-cyan-500/20"
              }`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Sky / Sea background */}
              <div
                className={`absolute inset-0 ${
                  isNightVision
                    ? "bg-gradient-to-b from-green-950 via-green-900/80 to-green-950"
                    : "bg-gradient-to-b from-slate-700 via-slate-600 to-slate-800"
                }`}
              >
                {/* Horizon line */}
                <div
                  className={`absolute left-0 right-0 h-px ${isNightVision ? "bg-green-400/30" : "bg-cyan-400/20"}`}
                  style={{ top: `${waterLine - elevation}%` }}
                />

                {/* Water surface below horizon */}
                <div
                  className={`absolute left-0 right-0 bottom-0 ${
                    isNightVision
                      ? "bg-gradient-to-b from-green-900/50 to-green-950"
                      : "bg-gradient-to-b from-blue-900/50 to-slate-900"
                  }`}
                  style={{ top: `${waterLine - elevation}%` }}
                >
                  {/* Wave patterns */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`absolute left-0 right-0 h-px ${isNightVision ? "bg-green-400/10" : "bg-cyan-400/5"}`}
                      style={{
                        top: `${12 + i * 12}%`,
                        transform: `translateX(${Math.sin(Date.now() / 1000 + i) * 5}px)`,
                      }}
                    />
                  ))}
                </div>

                {/* Stars (night vision) */}
                {isNightVision &&
                  Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-px h-px bg-green-400/40 rounded-full"
                      style={{
                        top: `${Math.random() * (waterLine - elevation)}%`,
                        left: `${Math.random() * 100}%`,
                      }}
                    />
                  ))}
              </div>

              {/* Contact markers in view */}
              {visibleContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`absolute cursor-pointer transition-all duration-300 group`}
                  style={{
                    left: `${contact.screenX}%`,
                    top:
                      contact.type === "aircraft"
                        ? "20%"
                        : `${waterLine - elevation - 2}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onClick={() => {
                    setSelectedContact(contact);
                    audio.playContactDetected();
                  }}
                >
                  <div className={`relative ${threatColor(contact.threat)}`}>
                    {/* Contact diamond/triangle */}
                    <div
                      className={`w-4 h-4 rotate-45 border-2 ${threatBg(contact.threat)} ${threatColor(contact.threat)}`}
                    />
                    {/* Range label */}
                    <div
                      className={`absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-space-mono ${threatColor(contact.threat).split(" ")[0]}`}
                    >
                      {contact.id} — {contact.range.toFixed(1)}km
                    </div>
                    {/* Threat pulse for hostile */}
                    {contact.threat === "hostile" && (
                      <div className="absolute inset-[-4px] rotate-45 border border-red-500/50 animate-ping" />
                    )}
                  </div>
                </div>
              ))}

              {/* ═══ PERISCOPE RETICLE OVERLAY ═══ */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Circular vignette */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, transparent 35%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 65%, black 75%)",
                  }}
                />

                {/* Crosshair */}
                <div
                  className={`absolute left-0 right-0 top-1/2 h-px ${isNightVision ? "bg-green-400/30" : "bg-cyan-400/20"}`}
                />
                <div
                  className={`absolute top-0 bottom-0 left-1/2 w-px ${isNightVision ? "bg-green-400/30" : "bg-cyan-400/20"}`}
                />

                {/* Center crosshair detail */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div
                    className={`w-8 h-8 border-2 rounded-full ${isNightVision ? "border-green-400/40" : "border-cyan-400/30"}`}
                  />
                  <div
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${isNightVision ? "bg-green-400/50" : "bg-cyan-400/40"}`}
                  />
                </div>

                {/* Bearing scale at top */}
                <div className="absolute top-2 left-0 right-0">
                  <div
                    className="flex justify-center items-end gap-0 mx-auto"
                    style={{ width: "80%" }}
                  >
                    {Array.from({ length: 41 }).map((_, i) => {
                      const offset = i - 20;
                      const bearing =
                        (rotation + offset * (40 / zoom / 40) + 360) % 360;
                      const isMajor = Math.round(bearing) % 10 === 0;
                      const isCardinal = Math.round(bearing) % 90 === 0;
                      return (
                        <div
                          key={i}
                          className="flex flex-col items-center"
                          style={{ width: `${100 / 41}%` }}
                        >
                          {(isMajor || isCardinal) && (
                            <span
                              className={`text-[7px] font-space-mono mb-0.5 ${
                                isCardinal
                                  ? isNightVision
                                    ? "text-green-400"
                                    : "text-cyan-400"
                                  : isNightVision
                                    ? "text-green-400/40"
                                    : "text-cyan-400/30"
                              }`}
                            >
                              {isCardinal
                                ? Math.round(bearing) === 0
                                  ? "N"
                                  : Math.round(bearing) === 90
                                    ? "E"
                                    : Math.round(bearing) === 180
                                      ? "S"
                                      : Math.round(bearing) === 270
                                        ? "W"
                                        : Math.round(bearing).toString()
                                : Math.round(bearing).toString()}
                            </span>
                          )}
                          <div
                            className={`w-px ${isCardinal ? "h-3" : isMajor ? "h-2" : "h-1"} ${
                              isNightVision
                                ? "bg-green-400/30"
                                : "bg-cyan-400/15"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Elevation scale at right */}
                <div className="absolute right-4 top-1/4 bottom-1/4 flex flex-col justify-between">
                  {[-10, -5, 0, 5, 10, 15, 20, 25, 30].reverse().map((deg) => (
                    <div key={deg} className="flex items-center gap-1">
                      <div
                        className={`w-2 h-px ${isNightVision ? "bg-green-400/20" : "bg-cyan-400/10"}`}
                      />
                      <span
                        className={`text-[7px] font-space-mono ${
                          Math.abs(deg - elevation) < 3
                            ? isNightVision
                              ? "text-green-400"
                              : "text-cyan-400"
                            : isNightVision
                              ? "text-green-400/20"
                              : "text-cyan-400/10"
                        }`}
                      >
                        {deg > 0 ? `+${deg}` : deg}°
                      </span>
                    </div>
                  ))}
                </div>

                {/* Range rings */}
                <div
                  className={`absolute bottom-2 left-2 text-[8px] font-space-mono ${isNightVision ? "text-green-400/40" : "text-cyan-400/30"}`}
                >
                  ZOOM: {zoom}x | FOV: {(40 / zoom).toFixed(0)}°
                </div>

                {/* Bearing readout */}
                <div
                  className={`absolute top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded ${
                    isNightVision
                      ? "bg-green-950/80 border border-green-500/30"
                      : "bg-slate-900/80 border border-cyan-500/20"
                  }`}
                >
                  <span
                    className={`text-sm font-orbitron ${isNightVision ? "text-green-400" : "text-cyan-400"}`}
                  >
                    {Math.round(rotation).toString().padStart(3, "0")}°
                  </span>
                </div>
              </div>

              {/* Night vision filter */}
              {isNightVision && (
                <div className="absolute inset-0 pointer-events-none mix-blend-multiply">
                  <div className="absolute inset-0 bg-green-500/10" />
                  {/* Scan lines */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.05) 2px, rgba(0,255,0,0.05) 4px)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Controls bar */}
            <div className="mt-3 flex items-center justify-between bg-slate-900/80 border border-cyan-500/20 rounded-lg px-4 py-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-space-mono text-cyan-400/50">
                    BRG:
                  </span>
                  <span className="text-xs font-orbitron text-cyan-400">
                    {Math.round(rotation).toString().padStart(3, "0")}°
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-space-mono text-cyan-400/50">
                    ELEV:
                  </span>
                  <span className="text-xs font-orbitron text-cyan-400">
                    {elevation > 0 ? "+" : ""}
                    {elevation.toFixed(0)}°
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-space-mono text-cyan-400/50">
                    ZOOM:
                  </span>
                  <span className="text-xs font-orbitron text-cyan-400">
                    {zoom}x
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-space-mono text-cyan-400/50">
                    DEPTH:
                  </span>
                  <span className="text-xs font-orbitron text-cyan-400">
                    {depth}m
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom((prev) => Math.max(1, prev - 1))}
                  className="px-2 py-1 text-[9px] font-orbitron text-cyan-400 border border-cyan-500/20 rounded hover:bg-cyan-500/10"
                >
                  ZOOM-
                </button>
                <button
                  onClick={() => setZoom((prev) => Math.min(8, prev + 1))}
                  className="px-2 py-1 text-[9px] font-orbitron text-cyan-400 border border-cyan-500/20 rounded hover:bg-cyan-500/10"
                >
                  ZOOM+
                </button>
                <button
                  onClick={() => setIsNightVision((prev) => !prev)}
                  className={`px-2 py-1 text-[9px] font-orbitron rounded border transition-all ${
                    isNightVision
                      ? "text-green-400 border-green-500/30 bg-green-500/10"
                      : "text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10"
                  }`}
                >
                  NV
                </button>
                <button
                  onClick={() => audio.playSonarPing()}
                  className="px-2 py-1 text-[9px] font-orbitron text-cyan-400 border border-cyan-500/20 rounded hover:bg-cyan-500/10"
                >
                  PING
                </button>
                <button
                  onClick={fetchContacts}
                  className="px-2 py-1 text-[9px] font-orbitron text-emerald-400 border border-emerald-500/20 rounded hover:bg-emerald-500/10"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* ═══ RIGHT PANEL — Contacts ═══ */}
          <div className="space-y-4">
            {/* Contact list */}
            <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-orbitron text-cyan-400">
                  CONTACTS ({contactPositions.length})
                </span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto periscope-scroll">
                {contactPositions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedContact(c);
                      setRotation(c.bearing);
                      audio.playContactDetected();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-[10px] font-space-mono hover:scale-[1.02] ${
                      selectedContact?.id === c.id
                        ? `${threatBg(c.threat)} ${threatColor(c.threat)}`
                        : "border-slate-700/30 bg-slate-800/30 text-slate-400 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-orbitron">{c.id}</span>
                      <span
                        className={`text-[8px] px-1.5 py-0.5 rounded font-orbitron ${
                          c.threat === "hostile"
                            ? "bg-red-500/20 text-red-400"
                            : c.threat === "friendly"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : c.threat === "neutral"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {c.threat.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[9px] opacity-70">{c.name}</div>
                    <div className="flex gap-3 mt-1 text-[8px] opacity-50">
                      <span>BRG: {Math.round(c.bearing)}°</span>
                      <span>RNG: {c.range.toFixed(1)}km</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected contact detail */}
            {selectedContact && (
              <div
                className={`bg-slate-900/80 border rounded-xl p-4 ${threatColor(selectedContact.threat).split(" ")[1]}/20`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs font-orbitron">CONTACT DETAIL</span>
                </div>
                <div className="space-y-1.5 text-[10px] font-space-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Designation:</span>
                    <span>
                      {selectedContact.id} — {selectedContact.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type:</span>
                    <span className="uppercase">{selectedContact.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Classification:</span>
                    <span className="text-right max-w-[60%]">
                      {selectedContact.classification}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bearing:</span>
                    <span>{Math.round(selectedContact.bearing)}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Range:</span>
                    <span>{selectedContact.range.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Speed:</span>
                    <span>{selectedContact.speed} kn</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Course:</span>
                    <span>{selectedContact.heading}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Threat:</span>
                    <span
                      className={`font-orbitron ${
                        selectedContact.threat === "hostile"
                          ? "text-red-400"
                          : selectedContact.threat === "friendly"
                            ? "text-emerald-400"
                            : selectedContact.threat === "neutral"
                              ? "text-amber-400"
                              : "text-slate-400"
                      }`}
                    >
                      {selectedContact.threat.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Mini compass */}
            <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-orbitron text-cyan-400">
                  COMPASS
                </span>
              </div>
              <div className="w-32 h-32 mx-auto relative">
                {/* Compass rose */}
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20">
                  {["N", "E", "S", "W"].map((dir, i) => (
                    <div
                      key={dir}
                      className="absolute text-[10px] font-orbitron text-cyan-400/60"
                      style={{
                        top:
                          i === 0
                            ? "2px"
                            : i === 2
                              ? "calc(100% - 14px)"
                              : "50%",
                        left:
                          i === 3
                            ? "4px"
                            : i === 1
                              ? "calc(100% - 10px)"
                              : "50%",
                        transform:
                          i === 0 || i === 2
                            ? "translateX(-50%)"
                            : "translateY(-50%)",
                      }}
                    >
                      {dir}
                    </div>
                  ))}
                </div>
                {/* Periscope direction indicator */}
                <div
                  className="absolute top-1/2 left-1/2 w-px h-12 bg-cyan-400 origin-bottom"
                  style={{
                    transform: `translate(-50%, -100%) rotate(${rotation}deg)`,
                  }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rotate-45" />
                </div>
                <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400" />

                {/* Contact dots */}
                {contactPositions.map((c) => {
                  const rad = ((c.bearing - 90) * Math.PI) / 180;
                  const dist = Math.min(c.range / 30, 1) * 50;
                  return (
                    <div
                      key={c.id}
                      className={`absolute w-1.5 h-1.5 rounded-full ${
                        c.threat === "hostile"
                          ? "bg-red-400"
                          : c.threat === "friendly"
                            ? "bg-emerald-400"
                            : c.threat === "neutral"
                              ? "bg-amber-400"
                              : "bg-slate-400"
                      }`}
                      style={{
                        top: `${50 + Math.sin(rad) * dist}%`,
                        left: `${50 + Math.cos(rad) * dist}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .periscope-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .periscope-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .periscope-scroll::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
