"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Navigation, Crosshair, Anchor, Radio, Shield, AlertTriangle, Target,
  MapPin, Play, Pause, Trash2, Settings, Globe2, Activity, RefreshCw, Radar,
  Eye, EyeOff, Layers, Waves, Wind, Zap, ChevronDown, Brain, Route,
} from "lucide-react";
import { loadDetections } from "@/lib/detection-storage";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
interface Waypoint {
  id: string; lat: number; lng: number; label: string;
  type: "waypoint" | "patrol" | "strike" | "rendezvous" | "refuel";
  notes: string; marker?: L.Marker; circle?: L.Circle;
}
interface ThreatZone {
  lat: number; lon: number; radius: number;
  level: "low" | "medium" | "high" | "critical";
  name: string; threatLevel: number;
}
interface ApiZone {
  id: string; name: string; lat: number; lon: number; command: string; hq: string;
  threat: { level: number; category: string; factors: { name: string; score: number; detail: string }[] };
  marine: any; weather: any;
  ops: { operation: string; ready: boolean; confidence: number; status: string; conditions: string }[];
}
interface IntelResponse {
  timestamp: string; zones: ApiZone[];
  summary: { totalZones: number; criticalZones: number; highZones: number; moderateZones: number; lowZones: number; avgThreat: number; overallReadiness: number };
  brief: string;
}
interface MissionProfile {
  name: string; type: "patrol" | "strike" | "recon" | "escort" | "blockade";
  vessel: string; speed: number; fuelCapacity: number; maxRange: number;
  armament: string; crew: number; displacement: string;
}

// ═══════════════════════════════════════════════════════════
// MISSION PROFILES (real Indian Navy vessels)
// ═══════════════════════════════════════════════════════════
const MISSION_PROFILES: MissionProfile[] = [
  { name: "Long Range Patrol", type: "patrol", vessel: "INS Shivalik (P-17)", speed: 18, fuelCapacity: 4000, maxRange: 5500, armament: "BrahMos, 76mm OTO, Barak-1", crew: 257, displacement: "6,200t" },
  { name: "Strike Mission", type: "strike", vessel: "INS Kolkata (P-15A)", speed: 30, fuelCapacity: 3200, maxRange: 4200, armament: "BrahMos x16, Barak-8 x32", crew: 325, displacement: "7,500t" },
  { name: "Submarine Recon", type: "recon", vessel: "INS Arihant (SSBN)", speed: 12, fuelCapacity: 999999, maxRange: 999999, armament: "K-15 SLBM x12, 533mm Torpedoes", crew: 95, displacement: "6,000t" },
  { name: "Carrier Escort", type: "escort", vessel: "INS Vikrant CBG", speed: 16, fuelCapacity: 8000, maxRange: 7500, armament: "MiG-29K x26, KA-31 x10, Barak-8", crew: 1600, displacement: "45,000t" },
  { name: "Naval Blockade", type: "blockade", vessel: "Task Force Bravo", speed: 14, fuelCapacity: 5000, maxRange: 4800, armament: "Mixed — 3 DDG + 2 FFG + 1 SSK", crew: 1800, displacement: "Combined 32,000t" },
];

// ═══════════════════════════════════════════════════════════
// NAVAL MARKERS (real locations)
// ═══════════════════════════════════════════════════════════
interface NavalMarker { lat: number; lng: number; name: string; type: "base" | "port" | "choke" | "airfield"; details: string; }
const MARKERS: NavalMarker[] = [
  { lat: 18.94, lng: 72.84, name: "Mumbai (WNC HQ)", type: "base", details: "Western Naval Command Headquarters" },
  { lat: 14.82, lng: 74.12, name: "Karwar (Project Seabird)", type: "base", details: "Largest naval base in Indian Ocean — INS Kadamba" },
  { lat: 9.97, lng: 76.27, name: "Kochi (SNC HQ)", type: "base", details: "Southern Naval Command — Training Command" },
  { lat: 17.70, lng: 83.30, name: "Visakhapatnam (ENC HQ)", type: "base", details: "Eastern Naval Command HQ — Submarine Arm" },
  { lat: 6.83, lng: 93.93, name: "INS Baaz (Campbell Bay)", type: "airfield", details: "Southernmost air station — A&N Islands" },
  { lat: 11.67, lng: 92.73, name: "Port Blair (A&N Command)", type: "base", details: "Andaman & Nicobar Command — Tri-service" },
  { lat: 10.00, lng: 76.27, name: "INS Garuda (Kochi NAS)", type: "airfield", details: "Naval Air Station — P-8I, MiG-29K" },
  { lat: 19.09, lng: 72.87, name: "INS Hansa (Dabolim NAS)", type: "airfield", details: "Naval Air Station Goa — MiG-29K OTU" },
  { lat: 13.08, lng: 80.28, name: "Chennai", type: "port", details: "Major commercial port — Eastern seaboard" },
  { lat: 15.41, lng: 73.88, name: "Goa (Mormugao)", type: "port", details: "Naval Dockyard — Fleet maintenance" },
  { lat: 4.17, lng: 73.51, name: "Malé (Maldives)", type: "port", details: "Republic of Maldives — Strategic partner" },
  { lat: 6.93, lng: 79.85, name: "Colombo", type: "port", details: "Sri Lanka — Key shipping hub" },
  { lat: 25.27, lng: 55.30, name: "Dubai (Jebel Ali)", type: "port", details: "UAE — Largest port in Middle East" },
  { lat: 23.61, lng: 58.54, name: "Muscat", type: "port", details: "Oman — Strategic ally at Hormuz approach" },
  { lat: 11.59, lng: 43.15, name: "Djibouti", type: "port", details: "Horn of Africa — Anti-piracy operations" },
  { lat: 1.29, lng: 103.85, name: "Singapore (Changi NB)", type: "port", details: "Key transit port — Malacca Strait" },
  { lat: 12.63, lng: 45.03, name: "Bab el-Mandeb", type: "choke", details: "Chokepoint — 20nm wide — Red Sea entry" },
  { lat: 26.60, lng: 56.50, name: "Strait of Hormuz", type: "choke", details: "Chokepoint — 21nm wide — 40% global oil" },
  { lat: 2.50, lng: 101.40, name: "Malacca Strait", type: "choke", details: "Chokepoint — 1.5nm narrowest — 25% global trade" },
  { lat: -8.40, lng: 115.70, name: "Lombok Strait", type: "choke", details: "Alternative to Malacca — Deep water passage" },
  { lat: 21.15, lng: 72.68, name: "Surat", type: "port", details: "Gujarat — Growing commercial port" },
  { lat: 12.91, lng: 74.86, name: "Mangalore (New Mangalore)", type: "port", details: "Karnataka — Oil imports hub" },
  { lat: 8.48, lng: 76.95, name: "Thiruvananthapuram", type: "port", details: "Kerala — Vizhinjam deep-water port (under construction)" },
];

// Shipping lanes (real routes)
const SHIPPING_LANES: [number, number][][] = [
  [[25.0,56.5],[22.0,60.0],[18.0,65.0],[15.0,70.0],[10.0,76.0],[6.0,80.0],[2.0,98.0],[1.5,103.5]], // Gulf-Malacca
  [[12.5,44.0],[12.0,50.0],[10.0,55.0],[8.0,60.0],[6.0,70.0],[5.0,73.5],[4.0,80.0],[2.0,95.0]], // Suez-SE Asia
  [[18.0,72.5],[15.0,73.5],[10.0,76.0],[8.0,77.5],[6.5,80.0],[5.0,85.0],[6.0,90.0],[8.0,93.0],[10.0,98.0]], // India West-East
  [[12.5,44.0],[10.0,51.0],[8.0,60.0],[9.0,72.0],[15.0,73.5],[18.0,72.8]], // E Africa-Mumbai
  [[-6.0,39.0],[-4.0,45.0],[-2.0,50.0],[0.0,60.0],[2.0,73.0],[5.0,80.0],[1.0,103.5]], // Cape route feeder
];

// EEZ boundaries (approximate)
const EEZ_LINES: [number, number][][] = [
  [[24.0,65.0],[22.0,62.0],[18.0,64.0],[15.0,65.0],[12.0,67.0],[8.0,72.0],[5.0,75.0],[5.0,80.0],[7.0,84.0],[10.0,86.0],[14.0,85.0],[17.0,86.0],[20.0,88.5],[22.0,90.0]],
  [[24.0,65.0],[25.0,68.0],[23.0,69.0],[20.0,66.0],[18.0,64.0]],
  [[3.0,71.5],[5.0,74.0],[7.0,72.0],[5.0,70.0],[3.0,71.5]], // Lakshadweep EEZ
];

// ═══════════════════════════════════════════════════════════
// MAP TILE LAYERS
// ═══════════════════════════════════════════════════════════
const TILE_LAYERS = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
    name: "Dark (Tactical)",
    subdomains: "abcd",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    name: "Satellite",
    subdomains: undefined,
  },
  ocean: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; Esri, GEBCO, NOAA',
    name: "Ocean Chart",
    subdomains: undefined,
  },
  topo: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    name: "Street Map",
    subdomains: "abc",
  },
};

// ═══════════════════════════════════════════════════════════
// WAYPOINT COLORS & ICONS
// ═══════════════════════════════════════════════════════════
const WP_COLORS: Record<Waypoint["type"], string> = {
  waypoint: "#10b981",
  patrol: "#06b6d4",
  strike: "#ef4444",
  rendezvous: "#a78bfa",
  refuel: "#eab308",
};

function createWaypointIcon(type: Waypoint["type"], index: number, selected: boolean) {
  const color = WP_COLORS[type];
  const size = selected ? 32 : 24;
  const border = selected ? `3px solid ${color}` : `2px solid ${color}`;
  const glow = selected ? `0 0 12px ${color}88, 0 0 4px ${color}66` : `0 0 6px ${color}44`;

  const shape = type === "strike" ? "polygon(50% 0%, 100% 100%, 0% 100%)" :
                type === "patrol" ? "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" :
                "circle(50%)";

  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color}cc;
      clip-path:${shape};
      border:${border};
      box-shadow:${glow};
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:${selected ? 11 : 9}px;font-weight:bold;font-family:monospace;
      position:relative;
    "><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-shadow:0 0 4px #000">${index + 1}</span></div>`,
  });
}

function createNavalIcon(type: NavalMarker["type"]) {
  const colors: Record<string, string> = { base: "#06b6d4", port: "#94a3b8", choke: "#f97316", airfield: "#a78bfa" };
  const icons: Record<string, string> = { base: "◆", port: "●", choke: "▲", airfield: "✦" };
  const c = colors[type] || "#94a3b8";
  const ic = icons[type] || "●";
  return L.divIcon({
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    html: `<div style="color:${c};font-size:12px;text-shadow:0 0 6px ${c}88;line-height:1">${ic}</div>`,
  });
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function TacticalMissionPlanner() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const simMarkerRef = useRef<L.Marker | null>(null);
  const simTrailRef = useRef<L.Polyline | null>(null);
  const threatLayersRef = useRef<L.LayerGroup | null>(null);
  const markerLayersRef = useRef<L.LayerGroup | null>(null);
  const shippingLayersRef = useRef<L.LayerGroup | null>(null);
  const eezLayersRef = useRef<L.LayerGroup | null>(null);
  const wpLayersRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const aiPathLayerRef = useRef<L.LayerGroup | null>(null);
  const liveThreatLayersRef = useRef<L.LayerGroup | null>(null);

  const [intel, setIntel] = useState<IntelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [threatZones, setThreatZones] = useState<ThreatZone[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWp, setSelectedWp] = useState<string | null>(null);
  const [wpType, setWpType] = useState<Waypoint["type"]>("waypoint");
  const [missionProfile, setMissionProfile] = useState<MissionProfile>(MISSION_PROFILES[0]);
  const [simulating, setSimulating] = useState(false);
  const [simulatingSwarm, setSimulatingSwarm] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showShipping, setShowShipping] = useState(true);
  const [showEEZ, setShowEEZ] = useState(true);
  const [showThreats, setShowThreats] = useState(true);
  const [tileType, setTileType] = useState<keyof typeof TILE_LAYERS>("topo");
  const [cursorPos, setCursorPos] = useState<{lat: number; lng: number} | null>(null);
  const [liveDetections, setLiveDetections] = useState<any[]>([]);
  const [showLiveDetections, setShowLiveDetections] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);

  // ── AI Path Planner state ──
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [aiPathStats, setAiPathStats] = useState<any | null>(null);
  const [aiPathError, setAiPathError] = useState<string | null>(null);
  const [showAiPath, setShowAiPath] = useState(true);
  const [showAiAnalysis, setShowAiAnalysis] = useState(true);
  const [simOnAiPath, setSimOnAiPath] = useState(false);

  // ── Fetch intel ──
  const fetchIntel = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/intelligence");
      if (!res.ok) throw new Error("Intel API failed");
      const data: IntelResponse = await res.json();
      setIntel(data);
      setThreatZones(data.zones.map(z => ({
        lat: z.lat, lon: z.lon,
        radius: 120000 + z.threat.level * 2500, // meters
        level: z.threat.level >= 75 ? "critical" : z.threat.level >= 50 ? "high" : z.threat.level >= 25 ? "medium" : "low",
        name: z.name, threatLevel: z.threat.level,
      })));
    } catch (e) { console.error("Intel fetch:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchIntel(); }, [fetchIntel]);
  
  // ── Fetch live detections ──
  const fetchLiveDetections = useCallback(() => {
    try {
      // 1. Load from mareye_detections (full detailed set)
      const detections = loadDetections();
      const withCoords = detections.filter((d): d is (typeof d & { lat: number; lng: number }) => 
        d.lat !== undefined && d.lng !== undefined && 
        !isNaN(Number(d.lat)) && !isNaN(Number(d.lng))
      );

      // 2. Load from activeThreats (tactical map set used in War Room)
      const activeThreatsStr = localStorage.getItem("activeThreats");
      const activeThreats = activeThreatsStr ? JSON.parse(activeThreatsStr) : [];
      
      // Combine them, avoiding duplicates by lat/lng if possible
      const combined = [...withCoords];
      activeThreats.forEach((at: any) => {
        const exists = combined.some(d => Math.abs(d.lat - at.lat) < 0.0001 && Math.abs(d.lng - at.lng) < 0.0001);
        if (!exists) {
            combined.push({
                id: at.id,
                lat: at.lat,
                lng: at.lng,
                overallThreatScore: at.threatScore,
                detections: [{ 
                  class: at.classification, 
                  confidence: at.threatScore / 100, 
                  bbox: [0, 0, 0, 0], 
                  color: "#ef4444" 
                }],
                timestamp: at.timestamp || Date.now(),
                // Dummy data for missing required fields
                originalImage: "",
                detectedImage: "",
                processingTime: 0,
                totalObjects: 1
            });
        }
      });

      setLiveDetections(combined);
    } catch (e) { console.error("Live detection fetch:", e); }
  }, []);

  useEffect(() => {
    fetchLiveDetections();
    const iv = setInterval(fetchLiveDetections, 5000);
    
    // Listen for custom events and storage changes (cross-tab sync)
    const handleSync = () => fetchLiveDetections();
    
    window.addEventListener("detectionAdded", handleSync);
    window.addEventListener("threatDetected", handleSync);
    window.addEventListener("storage", handleSync);
    
    return () => {
      clearInterval(iv);
      window.removeEventListener("detectionAdded", handleSync);
      window.removeEventListener("threatDetected", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [fetchLiveDetections]);

  useEffect(() => { const iv = setInterval(fetchIntel, 60000); return () => clearInterval(iv); }, [fetchIntel]);

  // ── Route calculations ──
  const routeStats = useMemo(() => {
    if (waypoints.length < 2) return { distance: 0, eta: "—", fuel: 0, legs: 0 };
    let dist = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const p1 = L.latLng(waypoints[i - 1].lat, waypoints[i - 1].lng);
      const p2 = L.latLng(waypoints[i].lat, waypoints[i].lng);
      dist += p1.distanceTo(p2) / 1852; // meters to nautical miles
    }
    const hours = dist / missionProfile.speed;
    const etaH = Math.floor(hours);
    const etaM = Math.round((hours - etaH) * 60);
    const fuel = dist * (missionProfile.fuelCapacity / missionProfile.maxRange);
    return { distance: Math.round(dist), eta: `${etaH}h ${etaM}m`, fuel: Math.round(fuel), legs: waypoints.length - 1 };
  }, [waypoints, missionProfile]);

  // Threat assessment for each leg
  const legThreats = useMemo(() => {
    if (waypoints.length < 2) return [];
    return waypoints.slice(1).map((wp, i) => {
      const prev = waypoints[i];
      let maxThreat = 0;
      let nearestZone = "";
      threatZones.forEach(z => {
        // Check midpoint of leg proximity to threat zone
        const midLat = (prev.lat + wp.lat) / 2;
        const midLng = (prev.lng + wp.lng) / 2;
        const dist = L.latLng(midLat, midLng).distanceTo(L.latLng(z.lat, z.lon));
        if (dist < z.radius * 1.5 && z.threatLevel > maxThreat) {
          maxThreat = z.threatLevel;
          nearestZone = z.name;
        }
      });
      return { legIndex: i, maxThreat, nearestZone };
    });
  }, [waypoints, threatZones]);

  // ── Initialize Leaflet Map ──
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 78], // India-centric view for immediate visible landmass
      zoom: 5,
      minZoom: 3,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    // Add zoom control (top-right to avoid overlapping toolbar)
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Attribution (bottom)
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

    // Set initial tile layer
    const initialLayer = TILE_LAYERS[tileType];
    const tileOptions: L.TileLayerOptions = {
      attribution: initialLayer.attribution,
      maxZoom: 19,
    };
    if (initialLayer.subdomains) tileOptions.subdomains = initialLayer.subdomains;
    const tile = L.tileLayer(initialLayer.url, tileOptions).addTo(map);
    let initialFallbackApplied = false;
    let initialTileLoaded = false;
    tile.on("tileload", () => {
      initialTileLoaded = true;
    });
    tile.on("tileerror", () => {
      if (initialFallbackApplied) return;
      initialFallbackApplied = true;
      tile.options.subdomains = "abc";
      tile.setUrl("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
    });
    setTimeout(() => {
      if (!initialTileLoaded && !initialFallbackApplied) {
        initialFallbackApplied = true;
        tile.options.subdomains = "abc";
        tile.setUrl("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
      }
    }, 2000);
    tileLayerRef.current = tile;

    // Layer groups
    threatLayersRef.current = L.layerGroup().addTo(map);
    markerLayersRef.current = L.layerGroup().addTo(map);
    shippingLayersRef.current = L.layerGroup().addTo(map);
    eezLayersRef.current = L.layerGroup().addTo(map);
    wpLayersRef.current = L.layerGroup().addTo(map);
    aiPathLayerRef.current = L.layerGroup().addTo(map);
    liveThreatLayersRef.current = L.layerGroup().addTo(map);

    // Cursor position tracking
    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      setCursorPos({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    setIsMapReady(true);

    // Force map to recalculate size after CSS loads and container renders
    const timers = [
      setTimeout(() => map.invalidateSize(), 100),
      setTimeout(() => map.invalidateSize(), 300),
      setTimeout(() => map.invalidateSize(), 800),
    ];

    return () => {
      timers.forEach(clearTimeout);
      map.remove();
      mapRef.current = null;
    };
  }, [tileType]);

  // ── Tile layer switching ──
  useEffect(() => {
    if (!mapRef.current) return;
    const cfg = TILE_LAYERS[tileType];
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    const tileOptions: L.TileLayerOptions = {
      attribution: cfg.attribution,
      maxZoom: 19,
    };
    if (cfg.subdomains) tileOptions.subdomains = cfg.subdomains;
    const nextLayer = L.tileLayer(cfg.url, tileOptions).addTo(mapRef.current);
    let fallbackApplied = false;
    let tileLoaded = false;
    nextLayer.on("tileload", () => {
      tileLoaded = true;
    });
    nextLayer.on("tileerror", () => {
      if (fallbackApplied) return;
      fallbackApplied = true;
      nextLayer.options.subdomains = "abc";
      nextLayer.setUrl("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
    });
    setTimeout(() => {
      if (!tileLoaded && !fallbackApplied) {
        fallbackApplied = true;
        nextLayer.options.subdomains = "abc";
        nextLayer.setUrl("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
      }
    }, 2000);
    tileLayerRef.current = nextLayer;
  }, [tileType]);

  // ── Click to add waypoints ──
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const onClick = (e: L.LeafletMouseEvent) => {
      const id = `wp-${Date.now()}`;
      setWaypoints(prev => [
        ...prev,
        { id, lat: e.latlng.lat, lng: e.latlng.lng, label: `WP-${prev.length + 1}`, type: wpType, notes: "" },
      ]);
      setSelectedWp(id);
    };

    map.on("click", onClick);
    return () => { map.off("click", onClick); };
  }, [wpType]);

  // ── Draw threat zones ──
  useEffect(() => {
    if (!threatLayersRef.current) return;
    threatLayersRef.current.clearLayers();
    if (!showThreats) return;

    threatZones.forEach(z => {
      const color = z.level === "critical" ? "#ef4444" : z.level === "high" ? "#f97316" : z.level === "medium" ? "#eab308" : "#10b981";

      // Outer zone
      L.circle([z.lat, z.lon], {
        radius: z.radius,
        color: color,
        weight: 1.5,
        opacity: 0.4,
        fillColor: color,
        fillOpacity: 0.06,
        dashArray: "8,6",
      }).addTo(threatLayersRef.current!);

      // Inner core
      L.circle([z.lat, z.lon], {
        radius: z.radius * 0.4,
        color: color,
        weight: 1,
        opacity: 0.3,
        fillColor: color,
        fillOpacity: 0.1,
      }).addTo(threatLayersRef.current!);

      // Label
      L.marker([z.lat, z.lon], {
        icon: L.divIcon({
          className: "",
          iconSize: [140, 40],
          iconAnchor: [70, -10],
          html: `<div style="text-align:center;pointer-events:none">
            <div style="color:${color};font-size:9px;font-family:'Orbitron',monospace;font-weight:bold;text-shadow:0 0 8px ${color}44">${z.name.toUpperCase()}</div>
            <div style="color:${color}99;font-size:7px;font-family:monospace">THREAT: ${z.threatLevel}% [${z.level.toUpperCase()}]</div>
          </div>`,
        }),
        interactive: false,
      }).addTo(threatLayersRef.current!);
    });
  }, [threatZones, showThreats]);

  // ── Draw live detections (pulsing markers) ──
  useEffect(() => {
    if (!liveThreatLayersRef.current) return;
    liveThreatLayersRef.current.clearLayers();
    if (!showLiveDetections) return;

    liveDetections.forEach(d => {
      const color = "#ef4444"; // Pulsing red for live threats
      
      const marker = L.marker([d.lat, d.lng], {
        icon: L.divIcon({
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          html: `<div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center">
            <div style="position:absolute;inset:0;background:${color}44;border-radius:50%;animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite"></div>
            <div style="width:10px;height:10px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px ${color}"></div>
            <div style="position:absolute;top:-14px;color:${color};font-size:7px;font-weight:bold;font-family:monospace;white-space:nowrap;text-shadow:0 0 4px #000">${d.detections?.[0]?.class.toUpperCase()}</div>
          </div>`,
        })
      }).addTo(liveThreatLayersRef.current!);

      marker.bindPopup(`
        <div style="background:#0f172a;border:1px solid ${color}44;border-radius:8px;padding:8px 12px;min-width:180px;font-family:monospace">
           <div style="color:${color};font-size:10px;font-weight:bold;font-family:'Orbitron',monospace;margin-bottom:4px;display:flex;align-items:center;gap:2px">
            <span style="display:inline-block;width:6px;height:6px;background:${color};border-radius:50%;animation:pulse 1s infinite"></span>
            LIVE CNN DETECTION
           </div>
           <div style="color:#fff;font-size:11px;margin-bottom:4px">${d.detections?.[0]?.class || "Unknown Object"}</div>
           <div style="color:#94a3b8;font-size:8px">Confidence: ${(d.overallThreatScore || 0)}%</div>
           <div style="color:#94a3b8;font-size:8px">Time: ${new Date(d.timestamp).toLocaleTimeString()}</div>
           <div style="color:#64748b;font-size:7px;margin-top:4px">${d.lat.toFixed(4)}°N / ${d.lng.toFixed(4)}°E</div>
           ${d.detectedImage ? `<img src="${d.detectedImage}" style="width:100%;height:80px;object-fit:cover;border-radius:4px;margin-top:8px;border:1px solid #ffffff11" />` : ""}
        </div>
      `, { className: "tactical-popup" });
    });
  }, [liveDetections, showLiveDetections, isMapReady]);

  // ── Draw naval markers ──
  useEffect(() => {
    if (!markerLayersRef.current) return;
    markerLayersRef.current.clearLayers();
    if (!showMarkers) return;

    MARKERS.forEach(m => {
      const marker = L.marker([m.lat, m.lng], { icon: createNavalIcon(m.type) })
        .addTo(markerLayersRef.current!);

      const color = m.type === "base" ? "#06b6d4" : m.type === "choke" ? "#f97316" : m.type === "airfield" ? "#a78bfa" : "#94a3b8";
      marker.bindPopup(`
        <div style="background:#0f172a;border:1px solid ${color}44;border-radius:8px;padding:8px 12px;min-width:180px;font-family:monospace">
          <div style="color:${color};font-size:10px;font-weight:bold;font-family:'Orbitron',monospace;margin-bottom:4px">${m.name}</div>
          <div style="color:#94a3b8;font-size:8px">${m.details}</div>
          <div style="color:#64748b;font-size:7px;margin-top:4px">${m.lat.toFixed(2)}°N / ${m.lng.toFixed(2)}°E</div>
          <div style="color:${color}88;font-size:7px;text-transform:uppercase;margin-top:2px">${m.type}</div>
        </div>
      `, { className: "tactical-popup" });

      // Name label
      L.marker([m.lat, m.lng], {
        icon: L.divIcon({
          className: "",
          iconSize: [100, 14],
          iconAnchor: [50, -8],
          html: `<div style="text-align:center;color:${color}aa;font-size:7px;font-family:monospace;text-shadow:0 0 4px #00000088;pointer-events:none;white-space:nowrap">${m.name.split("(")[0].trim()}</div>`,
        }),
        interactive: false,
      }).addTo(markerLayersRef.current!);
    });
  }, [showMarkers]);

  // ── Draw shipping lanes ──
  useEffect(() => {
    if (!shippingLayersRef.current) return;
    shippingLayersRef.current.clearLayers();
    if (!showShipping) return;

    SHIPPING_LANES.forEach(lane => {
      L.polyline(lane.map(([lat, lng]) => [lat, lng] as [number, number]), {
        color: "#eab308",
        weight: 1.2,
        opacity: 0.18,
        dashArray: "6,10",
      }).addTo(shippingLayersRef.current!);
    });
  }, [showShipping]);

  // ── Draw EEZ ──
  useEffect(() => {
    if (!eezLayersRef.current) return;
    eezLayersRef.current.clearLayers();
    if (!showEEZ) return;

    EEZ_LINES.forEach(line => {
      L.polyline(line.map(([lat, lng]) => [lat, lng] as [number, number]), {
        color: "#06b6d4",
        weight: 1.5,
        opacity: 0.15,
        dashArray: "10,8",
      }).addTo(eezLayersRef.current!);
    });
  }, [showEEZ]);

  // ── Draw waypoints & route ──
  useEffect(() => {
    if (!wpLayersRef.current || !mapRef.current) return;
    wpLayersRef.current.clearLayers();

    // Remove old route line
    if (routeLineRef.current) {
      mapRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    // Route line
    if (waypoints.length > 1) {
      const latlngs = waypoints.map(wp => [wp.lat, wp.lng] as [number, number]);
      routeLineRef.current = L.polyline(latlngs, {
        color: "#06b6d4",
        weight: 2.5,
        opacity: 0.7,
        dashArray: "8,5",
      }).addTo(mapRef.current);

      // Distance labels at midpoints
      for (let i = 1; i < waypoints.length; i++) {
        const midLat = (waypoints[i - 1].lat + waypoints[i].lat) / 2;
        const midLng = (waypoints[i - 1].lng + waypoints[i].lng) / 2;
        const dist = Math.round(L.latLng(waypoints[i - 1].lat, waypoints[i - 1].lng).distanceTo(L.latLng(waypoints[i].lat, waypoints[i].lng)) / 1852);
        const threat = legThreats[i - 1];
        const threatColor = threat && threat.maxThreat > 50 ? "#ef4444" : threat && threat.maxThreat > 25 ? "#eab308" : "#06b6d4";

        L.marker([midLat, midLng], {
          icon: L.divIcon({
            className: "",
            iconSize: [70, 24],
            iconAnchor: [35, 28],
            html: `<div style="text-align:center;pointer-events:none">
              <div style="color:#06b6d4aa;font-size:8px;font-family:monospace;background:#0f172acc;padding:1px 4px;border-radius:3px;border:1px solid #06b6d422">${dist} nm</div>
              ${threat && threat.maxThreat > 0 ? `<div style="color:${threatColor};font-size:6px;font-family:monospace">⚠ ${threat.maxThreat}%</div>` : ""}
            </div>`,
          }),
          interactive: false,
        }).addTo(wpLayersRef.current!);
      }
    }

    // Waypoint markers
    waypoints.forEach((wp, i) => {
      const isSelected = selectedWp === wp.id;
      const marker = L.marker([wp.lat, wp.lng], {
        icon: createWaypointIcon(wp.type, i, isSelected),
        draggable: true,
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(wpLayersRef.current!);

      marker.on("click", (e: L.LeafletEvent) => {
        L.DomEvent.stopPropagation(e as any);
        setSelectedWp(wp.id);
      });

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setWaypoints(prev => prev.map(w => w.id === wp.id ? { ...w, lat: pos.lat, lng: pos.lng } : w));
      });

      // Tooltip
      const color = WP_COLORS[wp.type];
      marker.bindTooltip(`
        <div style="font-family:monospace;font-size:8px">
          <div style="color:${color};font-weight:bold">${wp.label} (${wp.type.toUpperCase()})</div>
          <div style="color:#94a3b8">${wp.lat.toFixed(3)}°N ${wp.lng.toFixed(3)}°E</div>
        </div>
      `, { className: "tactical-tooltip", direction: "top", offset: [0, -12] });
    });
  }, [waypoints, selectedWp, legThreats]);

  // ── Simulation ──
  // Resolve which path points to use for simulation
  const simPath: [number, number][] = useMemo(() => {
    if (simOnAiPath && aiPathStats?.waypoints?.length >= 2) {
      return aiPathStats.waypoints.map((w: number[]) => [w[0], w[1]] as [number, number]);
    }
    return waypoints.map(wp => [wp.lat, wp.lng] as [number, number]);
  }, [simOnAiPath, aiPathStats, waypoints]);

  // Compute cumulative distances for accurate speed-based simulation
  const simDistances = useMemo(() => {
    if (simPath.length < 2) return { cumDist: [], totalDist: 0 };
    const cumDist = [0];
    let total = 0;
    for (let i = 1; i < simPath.length; i++) {
      const d = L.latLng(simPath[i - 1][0], simPath[i - 1][1]).distanceTo(L.latLng(simPath[i][0], simPath[i][1]));
      total += d;
      cumDist.push(total);
    }
    return { cumDist, totalDist: total };
  }, [simPath]);

  useEffect(() => {
    if (!simulating || simPath.length < 2) return;
    const iv = setInterval(() => {
      setSimProgress(p => {
        if (p >= 1) { setSimulating(false); setSimOnAiPath(false); return 0; }
        return p + 0.002;
      });
    }, 50);
    return () => clearInterval(iv);
  }, [simulating, simPath.length]);

  // Swarm and single ship marker logic
  const swarmMarkersRef = useRef<L.Marker[]>([]);
  const swarmTrailsRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (simMarkerRef.current) { mapRef.current.removeLayer(simMarkerRef.current); simMarkerRef.current = null; }
    if (simTrailRef.current) { mapRef.current.removeLayer(simTrailRef.current); simTrailRef.current = null; }
    swarmMarkersRef.current.forEach(m => mapRef.current?.removeLayer(m));
    swarmTrailsRef.current.forEach(t => mapRef.current?.removeLayer(t));
    swarmMarkersRef.current = [];
    swarmTrailsRef.current = [];

    if ((!simulating && !simulatingSwarm) || simPath.length < 2) return;

    const { cumDist, totalDist } = simDistances;
    const targetDist = simProgress * totalDist;

    // Find which leg we're on based on actual distance
    let legIdx = 0;
    for (let i = 1; i < cumDist.length; i++) {
      if (cumDist[i] >= targetDist) { legIdx = i - 1; break; }
      if (i === cumDist.length - 1) legIdx = i - 1;
    }

    const legStart = cumDist[legIdx];
    const legLen = cumDist[legIdx + 1] - legStart;
    const legProg = legLen > 0 ? (targetDist - legStart) / legLen : 0;

    const baseLat = simPath[legIdx][0] + (simPath[legIdx + 1][0] - simPath[legIdx][0]) * legProg;
    const baseLng = simPath[legIdx][1] + (simPath[legIdx + 1][1] - simPath[legIdx][1]) * legProg;

    // Compute bearing for ship heading
    const nextLat = simPath[Math.min(legIdx + 1, simPath.length - 1)][0];
    const nextLng = simPath[Math.min(legIdx + 1, simPath.length - 1)][1];
    const dLng = ((nextLng - baseLng) * Math.PI) / 180;
    const lat1R = (baseLat * Math.PI) / 180;
    const lat2R = (nextLat * Math.PI) / 180;
    const bearing = (Math.atan2(Math.sin(dLng) * Math.cos(lat2R), Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng)) * 180) / Math.PI;

    // Determine risk color at current position
    const isAiSim = simOnAiPath && aiPathStats;
    const riskSegs = aiPathStats?.stats?.risk_segments ?? [];
    let currentRisk = "low";
    if (isAiSim && riskSegs.length > 0 && legIdx < riskSegs.length) {
      currentRisk = riskSegs[legIdx]?.risk ?? "low";
    }
    const riskColorMap: Record<string, string> = { low: "#10b981", medium: "#eab308", high: "#f97316", critical: "#ef4444", LOW: "#10b981", MEDIUM: "#eab308", HIGH: "#f97316", CRITICAL: "#ef4444" };

    const distCovered = (targetDist / 1852).toFixed(0);
    const distTotal = (totalDist / 1852).toFixed(0);

    if (simulatingSwarm) {
       // --- SWARM LOGIC ---
       const NUM_DRONES = 5;
       const shipColor = "#06b6d4"; // Cyan for drones
       
       for (let d = 0; d < NUM_DRONES; d++) {
           // Drones fan out up to 0.5 degrees in latitude/longitude depending on progress
           const fanFactor = Math.pow(simProgress, 3) * 0.5; 
           const angle = (d / NUM_DRONES) * Math.PI * 2 + (simProgress * Math.PI); // rotate slightly
           const dLat = baseLat + Math.cos(angle) * fanFactor;
           const dLng = baseLng + Math.sin(angle) * fanFactor;

           const marker = L.marker([dLat, dLng], {
            icon: L.divIcon({
              className: "",
              iconSize: [20, 20],
              iconAnchor: [10, 10],
              html: `<div style="width:20px;height:20px;position:relative;transform:rotate(${bearing}deg)">
                <div style="position:absolute;inset:0;background:${shipColor}44;border-radius:50%;box-shadow:0 0 8px ${shipColor}66;animation:pulse 0.5s infinite"></div>
                <div style="position:absolute;inset:4px;background:${shipColor};border-radius:50%;border:1px solid #fff;display:flex;align-items:center;justify-content:center">
                   <div style="width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-bottom:4px solid #fff;margin-top:-1px"></div>
                </div>
              </div>`,
            }),
            zIndexOffset: 2000,
          }).addTo(mapRef.current);
          
          marker.bindTooltip(`
             <div style="font-family:monospace;font-size:8px">
              <div style="color:${shipColor};font-weight:bold">UCAV SWARM ALPHA-${d+1}</div>
              <div style="color:#94a3b8">Formation: Perimeter Defend</div>
              <div style="color:#ef4444;margin-top:2px">Weapons Hot</div>
            </div>
          `, { className: "tactical-tooltip", direction: "right", permanent: d === 0 });

          swarmMarkersRef.current.push(marker);
       }
    } else {
      // --- REGULAR SHIP LOGIC ---
      const trailPts: [number, number][] = [];
      for (let i = 0; i <= legIdx; i++) trailPts.push(simPath[i]);
      trailPts.push([baseLat, baseLng]);
      
      const realShipColor = isAiSim ? (riskColorMap[currentRisk] ?? "#f59e0b") : "#10b981";
      simTrailRef.current = L.polyline(trailPts, { color: realShipColor, weight: 3, opacity: 0.6 }).addTo(mapRef.current);
  
      simMarkerRef.current = L.marker([baseLat, baseLng], {
        icon: L.divIcon({
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: `<div style="width:28px;height:28px;position:relative;transform:rotate(${bearing}deg)">
            <div style="position:absolute;inset:0;background:${realShipColor}33;border-radius:50%;box-shadow:0 0 16px ${realShipColor}66,0 0 32px ${realShipColor}22;animation:pulse 1.5s infinite"></div>
            <div style="position:absolute;inset:4px;background:${realShipColor};border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center">
              <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:6px solid #fff;margin-top:-2px"></div>
            </div>
          </div>`,
        }),
        zIndexOffset: 2000,
      }).addTo(mapRef.current);
  
      simMarkerRef.current.bindTooltip(`
        <div style="font-family:monospace;font-size:8px">
          <div style="color:${realShipColor};font-weight:bold">${isAiSim ? "AI NAV" : "MANUAL"} — ${missionProfile.vessel.split("(")[0].trim()}</div>
          <div style="color:#94a3b8">${distCovered} / ${distTotal} nm</div>
          <div style="color:${realShipColor}">${currentRisk.toUpperCase()} RISK</div>
        </div>
      `, { className: "tactical-tooltip", direction: "top", permanent: true, offset: [0, -18] });
    }
  }, [simulating, simulatingSwarm, simProgress, simPath, simDistances, missionProfile, aiPathStats, simOnAiPath]);

  // ── Actions ──
  const deleteWp = (id: string) => {
    setWaypoints(prev => prev.filter(wp => wp.id !== id));
    if (selectedWp === id) setSelectedWp(null);
  };
  const clearRoute = () => {
    setWaypoints([]); setSelectedWp(null); setSimulating(false); setSimProgress(0);
    setAiPathStats(null); setAiPathError(null);
    aiPathLayerRef.current?.clearLayers();
  };
  const centerOnIndia = () => {
    mapRef.current?.flyTo([12, 78], 5, { duration: 1.5 });
  };

  // ── AI Path Planning ──
  const planAiPath = useCallback(async () => {
    if (waypoints.length < 2) return;
    const start = waypoints[0];
    const goal = waypoints[waypoints.length - 1];
    setAiPlanLoading(true);
    setAiPathError(null);
    setAiPathStats(null);
    aiPathLayerRef.current?.clearLayers();

    try {
      const now = new Date();
      const body = {
        start: { lat: start.lat, lng: start.lng },
        goal:  { lat: goal.lat,  lng: goal.lng },
        threat_zones: threatZones.map(z => ({
          lat: z.lat, lon: z.lon, radius: z.radius, threatLevel: z.threatLevel,
        })),
        vessel_speed: missionProfile.speed,
        utc_hour: now.getUTCHours(),
        month: now.getUTCMonth() + 1,
      };

      const res = await fetch("/api/mission/plan-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Planner failed");

      setAiPathStats(data);

      // Draw AI path on map
      if (aiPathLayerRef.current && mapRef.current) {
        const layer = aiPathLayerRef.current;
        layer.clearLayers();

        const riskColors: Record<string, string> = {
          low: "#10b981", medium: "#eab308", high: "#f97316", critical: "#ef4444",
        };

        // Draw risk-coloured segments
        const segs = data.stats?.risk_segments ?? [];
        if (segs.length > 0) {
          segs.forEach((seg: any) => {
            const c = riskColors[seg.risk] ?? "#f59e0b";
            L.polyline([[seg.from[0], seg.from[1]], [seg.to[0], seg.to[1]]], {
              color: c, weight: 4, opacity: 0.85,
            }).addTo(layer);
          });
        } else {
          // fallback: plain orange line
          const latlngs: [number, number][] = data.waypoints.map((w: number[]) => [w[0], w[1]]);
          L.polyline(latlngs, { color: "#f59e0b", weight: 4, opacity: 0.8, dashArray: "1,0" }).addTo(layer);
        }

        // Start / goal markers on AI path
        const svgMarker = (label: string, color: string) => L.divIcon({
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: `<div style="width:28px;height:28px;border-radius:50%;background:${color}33;border:2.5px solid ${color};box-shadow:0 0 10px ${color}66;display:flex;align-items:center;justify-content:center;color:${color};font-size:9px;font-family:'Orbitron',monospace;font-weight:bold">${label}</div>`,
        });

        L.marker([start.lat, start.lng], { icon: svgMarker("S", "#10b981"), zIndexOffset: 1500 })
          .bindTooltip("AI PATH START", { className: "tactical-tooltip", direction: "top" })
          .addTo(layer);
        L.marker([goal.lat, goal.lng], { icon: svgMarker("G", "#ef4444"), zIndexOffset: 1500 })
          .bindTooltip("AI PATH GOAL", { className: "tactical-tooltip", direction: "top" })
          .addTo(layer);

        // Waypoint dots
        data.waypoints.forEach((w: number[], i: number) => {
          if (i === 0 || i === data.waypoints.length - 1) return;
          if (i % 3 !== 0) return; // show every 3rd
          L.circleMarker([w[0], w[1]], { radius: 2.5, color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.7, weight: 1 }).addTo(layer);
        });

        // Zoom to fit
        const latlngs: L.LatLngExpression[] = data.waypoints.map((w: number[]) => [w[0], w[1]] as [number, number]);
        mapRef.current.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 7, animate: true });
      }
    } catch (err: any) {
      setAiPathError(err.message ?? "Unknown error");
    } finally {
      setAiPlanLoading(false);
    }
  }, [waypoints, threatZones, missionProfile]);

  const fuelPct = missionProfile.fuelCapacity > 0 && missionProfile.fuelCapacity < 999999
    ? Math.min(100, (routeStats.fuel / missionProfile.fuelCapacity) * 100) : 0;
  const rangePct = missionProfile.maxRange > 0 && missionProfile.maxRange < 999999
    ? Math.min(100, (routeStats.distance / missionProfile.maxRange) * 100) : 0;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  if (loading && !intel) return (
    <div className="min-h-screen bg-slate-950 pt-[128px] flex items-center justify-center">
      <div className="text-center">
        <Radar className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-spin" />
        <p className="text-cyan-400 font-orbitron animate-pulse">LOADING INTELLIGENCE DATA...</p>
        <p className="text-[10px] font-space-mono text-cyan-400/40 mt-2">Fetching live threat data for mission planning</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 pt-[128px] pb-20 px-3">
      <div className="max-w-[1600px] mx-auto">
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyan-500/30" />
            <h1 className="text-xl md:text-2xl font-orbitron font-black text-cyan-400 tracking-[0.2em]">TACTICAL MISSION PLANNER</h1>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyan-500/30" />
          </div>
          <p className="text-[9px] font-space-mono text-cyan-400/30 tracking-[0.3em]">
            NAVAL OPERATIONS CENTER // REAL-TIME MAP // ROUTE PLANNING & THREAT ANALYSIS
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* ─── MAP ─── */}
          <div className="lg:col-span-9">
            <div className="relative bg-slate-900/50 border border-cyan-500/15 rounded-xl overflow-hidden shadow-2xl shadow-cyan-500/5"
                 style={{ height: "clamp(450px, 70vh, 700px)" }}>
              <div ref={mapContainerRef} className="leaflet-host" style={{ width: "100%", height: "100%", minHeight: "500px", background: "#060d18", position: "relative", zIndex: 10 }} />

              {/* Waypoint type toolbar */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1 z-[1000]">
                {(["waypoint","patrol","strike","rendezvous","refuel"] as const).map(t => (
                  <button key={t} onClick={() => setWpType(t)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[7px] font-orbitron transition-all backdrop-blur-sm ${wpType === t ? "text-white border" : "bg-slate-900/70 text-slate-500 border border-slate-700/20 hover:text-slate-300"}`}
                    style={wpType === t ? { backgroundColor: `${WP_COLORS[t]}22`, borderColor: `${WP_COLORS[t]}55`, color: WP_COLORS[t] } : {}}>
                    {t === "waypoint" && <MapPin className="w-3 h-3" />}
                    {t === "patrol" && <Navigation className="w-3 h-3" />}
                    {t === "strike" && <Target className="w-3 h-3" />}
                    {t === "rendezvous" && <Anchor className="w-3 h-3" />}
                    {t === "refuel" && <Radio className="w-3 h-3" />}
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Layer toggles */}
              <div className="absolute top-3 right-3 space-y-1 z-[1000]">
                {([
                  { key: "markers", label: "MARKERS", show: showMarkers, set: setShowMarkers, color: "cyan" },
                  { key: "shipping", label: "SHIPPING", show: showShipping, set: setShowShipping, color: "amber" },
                  { key: "eez", label: "EEZ", show: showEEZ, set: setShowEEZ, color: "cyan" },
                  { key: "threats", label: "THREATS", show: showThreats, set: setShowThreats, color: "red" },
                  { key: "live", label: "LIVE DETECTIONS", show: showLiveDetections, set: setShowLiveDetections, color: "emerald" },
                ] as const).map(l => (
                  <button key={l.key} onClick={() => l.set((p: boolean) => !p)}
                    className={`block w-full text-left px-2 py-1 rounded text-[7px] font-orbitron transition-all backdrop-blur-sm ${l.show
                      ? `bg-${l.color}-500/15 text-${l.color}-400 border border-${l.color}-500/20`
                      : "bg-slate-900/70 text-slate-600 border border-slate-700/20"}`}>
                    {l.show ? <Eye className="w-2.5 h-2.5 inline mr-1" /> : <EyeOff className="w-2.5 h-2.5 inline mr-1" />}
                    {l.label}
                  </button>
                ))}

                {/* Map type */}
                <select value={tileType} onChange={e => setTileType(e.target.value as keyof typeof TILE_LAYERS)}
                  className="block w-full px-2 py-1 rounded text-[7px] font-orbitron bg-slate-900/70 text-cyan-400 border border-cyan-500/20 backdrop-blur-sm focus:outline-none cursor-pointer">
                  {Object.entries(TILE_LAYERS).map(([k, v]) => (
                    <option key={k} value={k}>{v.name}</option>
                  ))}
                </select>

                <button onClick={fetchIntel}
                  className="block w-full text-left px-2 py-1 rounded text-[7px] font-orbitron bg-slate-900/70 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 backdrop-blur-sm">
                  <RefreshCw className="w-2.5 h-2.5 inline mr-1" /> REFRESH
                </button>
                <button onClick={centerOnIndia}
                  className="block w-full text-left px-2 py-1 rounded text-[7px] font-orbitron bg-slate-900/70 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/10 backdrop-blur-sm">
                  <Crosshair className="w-2.5 h-2.5 inline mr-1" /> CENTER
                </button>
              </div>

              {/* Sim controls */}
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 z-[1000]">
                <button disabled={waypoints.length < 2}
                  onClick={() => { setSimOnAiPath(false); setSimulating(!simulating); if (!simulating) setSimProgress(0); }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[7px] font-orbitron bg-slate-900/70 text-emerald-400 border border-emerald-500/20 disabled:opacity-30 hover:bg-emerald-500/10 backdrop-blur-sm transition-all">
                  {simulating && !simOnAiPath ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {simulating && !simOnAiPath ? "PAUSE" : "SIMULATE"}
                </button>
                <button
                  disabled={waypoints.length < 2 || aiPlanLoading}
                  onClick={planAiPath}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[7px] font-orbitron bg-slate-900/70 text-amber-400 border border-amber-500/25 disabled:opacity-30 hover:bg-amber-500/10 backdrop-blur-sm transition-all">
                  {aiPlanLoading
                    ? <><Radar className="w-3 h-3 animate-spin" /> PLANNING…</>
                    : <><Brain className="w-3 h-3" /> AI PLAN PATH</>}
                </button>
                {aiPathStats && (
                  <>
                    <button
                      onClick={() => { setSimOnAiPath(true); setSimProgress(0); setSimulating(true); }}
                      disabled={simulating && simOnAiPath}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[7px] font-orbitron bg-slate-900/70 text-amber-400 border border-amber-500/25 disabled:opacity-30 hover:bg-amber-500/10 backdrop-blur-sm transition-all">
                      {simulating && simOnAiPath ? <><Radar className="w-3 h-3 animate-spin" /> AI SIM…</> : <><Play className="w-3 h-3" /> SIM AI ROUTE</>}
                    </button>
                    <button
                      onClick={() => { setShowAiPath(p => !p); aiPathLayerRef.current?.eachLayer((l: any) => { showAiPath ? mapRef.current?.removeLayer(l) : aiPathLayerRef.current?.addLayer(l); }); }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[7px] font-orbitron bg-slate-900/70 text-amber-300 border border-amber-500/15 hover:bg-amber-500/10 backdrop-blur-sm transition-all">
                      <Route className="w-3 h-3" /> {showAiPath ? "HIDE PATH" : "SHOW PATH"}
                    </button>
                  </>
                )}
                {simulating && (
                  <button onClick={() => { setSimulating(false); setSimulatingSwarm(false); setSimProgress(0); setSimOnAiPath(false); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[7px] font-orbitron bg-slate-900/70 text-red-400 border border-red-500/20 hover:bg-red-500/10 backdrop-blur-sm transition-all">
                    <Pause className="w-3 h-3" /> STOP
                  </button>
                )}
                <button onClick={clearRoute}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[7px] font-orbitron bg-slate-900/70 text-red-400 border border-red-500/20 hover:bg-red-500/10 backdrop-blur-sm transition-all">
                  <Trash2 className="w-3 h-3" /> CLEAR
                </button>
                {aiPathStats && !simulating && !simulatingSwarm && (
                    <button
                      onClick={() => { setSimOnAiPath(true); setSimulatingSwarm(true); setSimProgress(0); }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[7px] font-orbitron bg-red-900/90 text-white font-bold border border-red-500 hover:bg-red-500 transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse"
                    >
                      <Target className="w-3 h-3" /> DEPLOY SWARM 
                    </button>
                )}
              </div>

              {/* Sim progress bar */}
              {(simulating || simulatingSwarm) && (
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-slate-900/85 border border-emerald-500/20 rounded-lg px-4 py-2 z-[1000] backdrop-blur-sm min-w-[240px]">
                  <div className={`text-[7px] font-orbitron mb-1 ${simulatingSwarm ? "text-cyan-400" : simOnAiPath ? "text-amber-400" : "text-emerald-400"}`}>
                    {simulatingSwarm ? "UCAV SWARM DEPLOYMENT" : simOnAiPath ? "AI ROUTE SIMULATION" : "MANUAL ROUTE SIMULATION"} — {Math.round(simProgress * 100)}%
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full">
                    <div className={`h-full rounded-full transition-all ${simulatingSwarm ? "bg-cyan-500" : simOnAiPath ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${simProgress * 100}%` }} />
                  </div>
                  {(simOnAiPath && aiPathStats) && (
                    <div className="flex justify-between text-[6px] font-space-mono text-slate-500 mt-1">
                      <span>{Math.round((aiPathStats.stats?.total_km ?? 0) * simProgress)} / {aiPathStats.stats?.total_km} km</span>
                      <span>{simulatingSwarm ? "SWARM GROUP ALPHA" : `${missionProfile.vessel.split("(")[0].trim()} @ ${missionProfile.speed}kn`}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Cursor coords */}
              {cursorPos && (
                <div className="absolute bottom-3 right-16 bg-slate-900/70 border border-cyan-500/10 rounded px-2 py-0.5 z-[1000] backdrop-blur-sm">
                  <span className="text-[7px] font-space-mono text-cyan-400/50">
                    {cursorPos.lat.toFixed(3)}°{cursorPos.lat >= 0 ? "N" : "S"} / {cursorPos.lng.toFixed(3)}°{cursorPos.lng >= 0 ? "E" : "W"}
                  </span>
                </div>
              )}

              {/* HUD corners */}
              <div className="absolute inset-0 pointer-events-none z-[999]">
                <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-cyan-500/15" />
                <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-cyan-500/15" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-cyan-500/15" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-cyan-500/15" />
              </div>
            </div>

            {/* ── AI MODEL EXPLAINER (fills space below map) ── */}
            <div className="mt-3 bg-slate-900/40 border border-cyan-500/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-orbitron text-amber-400 tracking-[0.15em]">HOW AI PATH PLANNING WORKS</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  {
                    step: "01",
                    title: "COST GRID",
                    desc: "DynCostNet (32-feature Residual MLP) evaluates every cell in a 140×180 grid covering the Indian Ocean. Each cell gets a traversal cost based on threat proximity, weather, time, and season.",
                    color: "#f59e0b",
                    icon: "🧠",
                  },
                  {
                    step: "02",
                    title: "LAND MASKING",
                    desc: "Polygon-based coastline detection marks land cells as impassable (cost=1.0). Uses ray-casting on real coastline coordinates for India, Sri Lanka, Arabia, Myanmar, and more.",
                    color: "#ef4444",
                    icon: "🗺️",
                  },
                  {
                    step: "03",
                    title: "A* PATHFINDING",
                    desc: "8-directional A* search finds the minimum-cost path from start to goal. Cells above 0.985 cost are blocked. The algorithm balances distance with threat avoidance.",
                    color: "#06b6d4",
                    icon: "📍",
                  },
                  {
                    step: "04",
                    title: "ROUTE SMOOTHING",
                    desc: "Catmull-Rom spline interpolation smooths the grid path into natural waypoints. Risk segments are computed with haversine distance and per-segment cost analysis.",
                    color: "#10b981",
                    icon: "🛳️",
                  },
                ].map(s => (
                  <div key={s.step} className="bg-slate-800/30 border rounded-lg p-3" style={{ borderColor: `${s.color}20` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{s.icon}</span>
                      <div>
                        <span className="text-[7px] font-orbitron tracking-wide" style={{ color: s.color }}>STEP {s.step}</span>
                        <div className="text-[8px] font-orbitron text-slate-300">{s.title}</div>
                      </div>
                    </div>
                    <p className="text-[7px] font-space-mono text-slate-500 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
              {/* Feature list */}
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: "Input Features", value: "32-dim vector", color: "text-amber-400" },
                  { label: "Architecture", value: "Residual MLP (256h)", color: "text-amber-400" },
                  { label: "Grid Resolution", value: "140×180 cells", color: "text-cyan-400" },
                  { label: "Coverage", value: "5°S–30°N, 55°E–100°E", color: "text-cyan-400" },
                  { label: "Threat Factors", value: "Proximity + density", color: "text-red-400" },
                  { label: "Weather Inputs", value: "Sea state, wind, vis", color: "text-blue-400" },
                  { label: "Temporal", value: "Hour + season encoded", color: "text-emerald-400" },
                  { label: "Geographic", value: "EEZ, lanes, chokepoints", color: "text-emerald-400" },
                ].map(f => (
                  <div key={f.label} className="flex justify-between text-[7px] font-space-mono bg-slate-800/20 rounded px-2 py-1.5">
                    <span className="text-slate-500">{f.label}</span>
                    <span className={f.color}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── RIGHT PANEL ─── */}
          <div className="lg:col-span-3 space-y-3">
            {/* Mission Profile */}
            <div className="bg-slate-900/60 border border-cyan-500/15 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-orbitron text-cyan-400 tracking-wider">MISSION PROFILE</span>
              </div>
              <select value={MISSION_PROFILES.indexOf(missionProfile)}
                onChange={e => setMissionProfile(MISSION_PROFILES[+e.target.value])}
                className="w-full bg-slate-800/40 border border-cyan-500/15 rounded px-2 py-1.5 text-[8px] font-space-mono text-cyan-400 mb-2 focus:outline-none">
                {MISSION_PROFILES.map((p, i) => (<option key={i} value={i}>{p.name}</option>))}
              </select>
              <div className="space-y-1 text-[8px] font-space-mono">
                {[
                  { l: "Vessel", v: missionProfile.vessel },
                  { l: "Speed", v: `${missionProfile.speed} kn` },
                  { l: "Max Range", v: missionProfile.maxRange >= 999999 ? "UNLIMITED (Nuclear)" : `${missionProfile.maxRange} nm` },
                  { l: "Displacement", v: missionProfile.displacement },
                  { l: "Crew", v: missionProfile.crew.toString() },
                  { l: "Armament", v: missionProfile.armament },
                ].map(r => (
                  <div key={r.l} className="flex justify-between items-start">
                    <span className="text-slate-600">{r.l}:</span>
                    <span className="text-slate-300 text-right max-w-[60%]">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Route Analysis */}
            <div className="bg-slate-900/60 border border-cyan-500/15 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-orbitron text-cyan-400 tracking-wider">ROUTE ANALYSIS</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                {[
                  { label: "NM", value: routeStats.distance, color: "text-cyan-400" },
                  { label: "ETA", value: routeStats.eta, color: "text-cyan-400" },
                  { label: "FUEL (L)", value: routeStats.fuel, color: fuelPct > 90 ? "text-red-400" : "text-cyan-400" },
                  { label: "WAYPOINTS", value: waypoints.length, color: "text-cyan-400" },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800/20 rounded-lg p-2 text-center">
                    <div className={`text-sm font-orbitron ${s.color}`}>{s.value}</div>
                    <div className="text-[6px] font-space-mono text-slate-600 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[6px] font-space-mono text-slate-600 mb-0.5">
                    <span>FUEL CONSUMPTION</span>
                    <span>{fuelPct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full">
                    <div className={`h-full rounded-full transition-all ${fuelPct > 90 ? "bg-red-500" : fuelPct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${fuelPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[6px] font-space-mono text-slate-600 mb-0.5">
                    <span>RANGE USAGE</span>
                    <span>{rangePct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full">
                    <div className={`h-full rounded-full transition-all ${rangePct > 90 ? "bg-red-500" : rangePct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${rangePct}%` }} />
                  </div>
                </div>
              </div>
              {/* Leg threat summary */}
              {legThreats.length > 0 && legThreats.some(l => l.maxThreat > 0) && (
                <div className="mt-2 pt-2 border-t border-slate-800/30">
                  <div className="text-[6px] font-orbitron text-amber-400/60 mb-1">LEG THREAT ASSESSMENT</div>
                  {legThreats.filter(l => l.maxThreat > 0).map(l => (
                    <div key={l.legIndex} className="flex items-center justify-between text-[7px] font-space-mono mb-0.5">
                      <span className="text-slate-500">Leg {l.legIndex + 1}→{l.legIndex + 2}</span>
                      <span className={`${l.maxThreat > 50 ? "text-red-400" : l.maxThreat > 25 ? "text-amber-400" : "text-emerald-400"}`}>
                        ⚠ {l.maxThreat}% ({l.nearestZone.split(" ").slice(0, 2).join(" ")})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Waypoints */}
            <div className="bg-slate-900/60 border border-cyan-500/15 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-orbitron text-cyan-400 tracking-wider">WAYPOINTS</span>
                <span className="ml-auto text-[7px] font-space-mono text-slate-600">{waypoints.length} pts</span>
              </div>
              {waypoints.length === 0 ? (
                <p className="text-[8px] font-space-mono text-slate-600 text-center py-4">Click on map to add waypoints</p>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto plan-scroll">
                  {waypoints.map((wp, i) => (
                    <div key={wp.id}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-[8px] font-space-mono cursor-pointer transition-all border ${selectedWp === wp.id
                        ? "bg-cyan-500/10 border-cyan-500/20"
                        : "hover:bg-slate-800/40 border-transparent"}`}
                      onClick={() => {
                        setSelectedWp(wp.id);
                        mapRef.current?.panTo([wp.lat, wp.lng], { animate: true });
                      }}>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 flex items-center justify-center rounded-full text-[7px] font-bold"
                          style={{ backgroundColor: `${WP_COLORS[wp.type]}22`, color: WP_COLORS[wp.type] }}>{i + 1}</span>
                        <div>
                          <div className="text-slate-300">{wp.label} <span className="text-slate-600 text-[6px]">({wp.type})</span></div>
                          <div className="text-slate-600 text-[7px]">{wp.lat.toFixed(2)}°N {wp.lng.toFixed(2)}°E</div>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); deleteWp(wp.id); }}
                        className="text-red-400/40 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Threat Zones */}
            <div className="bg-slate-900/60 border border-cyan-500/15 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-orbitron text-amber-400 tracking-wider">LIVE THREAT ZONES</span>
              </div>
              {threatZones.length === 0 ? (
                <p className="text-[8px] font-space-mono text-slate-600 text-center">No threat data</p>
              ) : (
                <div className="space-y-1.5">
                  {threatZones.sort((a, b) => b.threatLevel - a.threatLevel).map((z, i) => (
                    <div key={i} className="bg-slate-800/20 rounded-lg p-1.5"
                      onClick={() => mapRef.current?.flyTo([z.lat, z.lon], 6, { duration: 1 })}>
                      <div className="flex items-center justify-between text-[8px] font-space-mono cursor-pointer">
                        <span className="text-slate-400 truncate max-w-[55%]">{z.name}</span>
                        <span className={`text-[6px] font-orbitron px-1.5 py-0.5 rounded ${
                          z.level === "critical" ? "bg-red-500/20 text-red-400" :
                          z.level === "high" ? "bg-orange-500/15 text-orange-400" :
                          z.level === "medium" ? "bg-amber-500/10 text-amber-400" :
                          "bg-emerald-500/10 text-emerald-400"
                        }`}>{z.level.toUpperCase()} ({z.threatLevel}%)</span>
                      </div>
                      <div className="mt-1 h-0.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          z.level === "critical" ? "bg-red-500" : z.level === "high" ? "bg-orange-500" :
                          z.level === "medium" ? "bg-amber-500" : "bg-emerald-500"
                        }`} style={{ width: `${z.threatLevel}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Path Stats */}
            {(aiPlanLoading || aiPathStats || aiPathError) && (
              <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <Brain className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-orbitron text-amber-400 tracking-wider">AI PATH PLANNER</span>
                  {aiPlanLoading && <Radar className="w-3 h-3 text-amber-400 animate-spin ml-auto" />}
                </div>
                {aiPlanLoading && (
                  <div className="space-y-1">
                    {["Building cost grid…", "Running A* search…", "Smoothing route…"].map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-[7px] font-space-mono text-amber-400/50">
                        <div className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                        {s}
                      </div>
                    ))}
                  </div>
                )}
                {aiPathError && (
                  <div className="text-[8px] font-space-mono text-red-400 bg-red-500/5 border border-red-500/15 rounded p-2">
                    ⚠ {aiPathError}
                  </div>
                )}
                {aiPathStats && !aiPlanLoading && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "DISTANCE", value: `${aiPathStats.stats?.total_km} km` },
                        { label: "ETA", value: aiPathStats.stats?.eta },
                        { label: "WAYPOINTS", value: aiPathStats.waypoints?.length },
                        { label: "PEAK THREAT", value: aiPathStats.stats?.peak_threat },
                      ].map(s => (
                        <div key={s.label} className="bg-amber-500/5 border border-amber-500/10 rounded p-1.5 text-center">
                          <div className="text-[10px] font-orbitron text-amber-400">{s.value ?? "—"}</div>
                          <div className="text-[6px] font-space-mono text-slate-600 mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[7px] font-space-mono space-y-0.5">
                      <div className="flex justify-between text-slate-500">
                        <span>Season</span>
                        <span className="text-amber-300/70">{aiPathStats.context?.season ?? "—"}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Sea State</span>
                        <span className="text-amber-300/70">{aiPathStats.weather?.sea_state ?? "—"} ({aiPathStats.weather?.wave_height ?? "—"}m)</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Model</span>
                        <span className={`text-[6px] font-orbitron px-1 py-0.5 rounded ${aiPathStats.model_used === "dyn_cost_net" ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-400"}`}>
                          {aiPathStats.model_used === "dyn_cost_net" ? "NEURAL NET" : "EXPERT RULES"}
                        </span>
                      </div>
                    </div>
                    {/* Risk segments mini-legend */}
                    <div className="flex gap-1.5 flex-wrap">
                      {[["low","#10b981"],["medium","#eab308"],["high","#f97316"],["critical","#ef4444"]].map(([r,c]) => (
                        <div key={r} className="flex items-center gap-1 text-[6px] font-space-mono" style={{ color: c as string }}>
                          <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: c as string }} />
                          {(r as string).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sea State */}
            {intel && (
              <div className="bg-slate-900/60 border border-cyan-500/15 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-orbitron text-cyan-400 tracking-wider">SEA STATE (LIVE)</span>
                </div>
                <div className="space-y-1 text-[8px] font-space-mono">
                  {intel.zones.slice(0, 4).map(z => (
                    <div key={z.id} className="flex items-center justify-between">
                      <span className="text-slate-500 truncate max-w-[35%]">{z.name.split(" ").slice(0, 2).join(" ")}</span>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span><Waves className="w-2.5 h-2.5 inline" /> {z.marine?.wave_height ?? "—"}m</span>
                        <span><Wind className="w-2.5 h-2.5 inline" /> {z.weather?.wind_speed ?? "—"}km/h</span>
                        <span className="text-slate-600">{z.weather?.temperature ?? "—"}°C</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* AI ROUTE ANALYSIS — BELOW MAP                              */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {aiPathStats && (
          <div className="mt-1">
            {/* ── TOGGLE HEADER ── */}
            <button onClick={() => setShowAiAnalysis(p => !p)}
              className="w-full flex items-center justify-between bg-slate-900/80 border border-amber-500/25 rounded-xl px-5 py-3.5 hover:bg-amber-950/20 transition-all"
              style={showAiAnalysis ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-amber-500/15 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-[11px] font-orbitron text-amber-400 tracking-[0.15em] text-left">AI ROUTE ANALYSIS</div>
                  <div className="text-[7px] font-space-mono text-slate-500 text-left mt-0.5">
                    DynCostNet · {aiPathStats.model_used === "dyn_cost_net" ? "32-Feature Deep Residual MLP" : "Expert Cost Rules"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[7px] font-orbitron px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/15">
                  {aiPathStats.stats?.total_km} km
                </span>
                <span className="text-[7px] font-orbitron px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
                  {aiPathStats.waypoints?.length} WP
                </span>
                <span className={`text-[7px] font-orbitron px-2 py-0.5 rounded border ${
                  aiPathStats.stats?.threat_exposure === "CRITICAL" ? "bg-red-500/10 text-red-400 border-red-500/15" :
                  aiPathStats.stats?.threat_exposure === "HIGH" ? "bg-orange-500/10 text-orange-400 border-orange-500/15" :
                  "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                }`}>
                  {aiPathStats.stats?.threat_exposure}
                </span>
                <ChevronDown className={`w-4 h-4 text-amber-400/50 transition-transform duration-300 ml-1 ${showAiAnalysis ? "rotate-180" : ""}`} />
              </div>
            </button>

            {/* ── EXPANDABLE CONTENT ── */}
            {showAiAnalysis && (
              <div className="bg-slate-900/50 border border-t-0 border-amber-500/15 rounded-b-xl">

                {/* ── ROW 1: STAT CARDS ── */}
                <div className="p-4 pb-3">
                  <div className="text-[7px] font-orbitron text-slate-500 tracking-[0.2em] mb-2.5 pl-1">KEY METRICS</div>
                  <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
                    {[
                      { label: "DISTANCE",   value: `${aiPathStats.stats?.total_km ?? "—"}`,  unit: "km",   color: "#f59e0b", borderC: "#f59e0b" },
                      { label: "NAUTICAL MI", value: `${aiPathStats.stats?.total_nm ?? "—"}`,  unit: "nm",   color: "#06b6d4", borderC: "#06b6d4" },
                      { label: "ETA",         value: aiPathStats.stats?.eta ?? "—",            unit: `@${missionProfile.speed}kn`, color: "#06b6d4", borderC: "#06b6d4" },
                      { label: "WAYPOINTS",   value: `${aiPathStats.waypoints?.length ?? "—"}`, unit: "pts",  color: "#10b981", borderC: "#10b981" },
                      { label: "PEAK THREAT", value: `${((aiPathStats.stats?.peak_threat || 0) * 100).toFixed(1)}`, unit: "%", color: (aiPathStats.stats?.peak_threat || 0) > 0.7 ? "#ef4444" : "#f59e0b", borderC: (aiPathStats.stats?.peak_threat || 0) > 0.7 ? "#ef4444" : "#f59e0b" },
                      { label: "SEA STATE",   value: `${aiPathStats.weather?.sea_state ?? "—"}`, unit: `${aiPathStats.weather?.wave_height ?? "—"}m`, color: "#3b82f6", borderC: "#3b82f6" },
                      { label: "WIND SPEED",  value: `${aiPathStats.weather?.wind_speed ?? "—"}`, unit: "km/h", color: "#3b82f6", borderC: "#3b82f6" },
                      { label: "GRID",        value: `${aiPathStats.grid_shape?.[0] ?? "—"}×${aiPathStats.grid_shape?.[1] ?? "—"}`, unit: "cells", color: "#94a3b8", borderC: "#94a3b8" },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: `${s.borderC}08`, border: `1px solid ${s.borderC}25` }}>
                        <div className="text-sm font-orbitron leading-none" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[6px] font-space-mono text-slate-500 mt-1 leading-none">{s.unit}</div>
                        <div className="text-[5px] font-orbitron text-slate-600 mt-1.5 tracking-[0.1em] leading-none">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── ROW 2: RISK PROFILE GRAPH + DONUT ── */}
                <div className="px-4 pb-3">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {/* GRAPH 1: Risk Profile Line Chart */}
                    {(() => {
                      const segs = aiPathStats.stats?.risk_segments ?? [];
                      if (segs.length === 0) return null;
                      const costs: number[] = segs.map((s: any) => typeof s.cost === "number" ? s.cost : parseFloat(s.cost) || 0);
                      const W = 660, H = 280, PL = 45, PR = 60, PT = 25, PB = 30;
                      const gW = W - PL - PR, gH = H - PT - PB;
                      const stepX = gW / Math.max(costs.length - 1, 1);
                      const rc = (c: number) => c >= 0.85 ? "#ef4444" : c >= 0.6 ? "#f97316" : c >= 0.3 ? "#eab308" : "#10b981";
                      const pts = costs.map((c, i) => [PL + i * stepX, PT + gH - c * gH]);
                      const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
                      const areaD = lineD + ` L${pts[pts.length - 1][0].toFixed(1)},${(PT + gH).toFixed(1)} L${pts[0][0].toFixed(1)},${(PT + gH).toFixed(1)} Z`;
                      const labelStep = Math.max(1, Math.ceil(costs.length / 10));
                      return (
                        <div className="bg-slate-800/25 border border-amber-500/10 rounded-lg p-4 lg:col-span-2">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Activity className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-[9px] font-orbitron text-amber-400 tracking-[0.15em]">RISK PROFILE ALONG ROUTE</span>
                            </div>
                            <span className="text-[7px] font-space-mono text-slate-600">{segs.length} seg · {aiPathStats.stats?.total_km} km</span>
                          </div>
                          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                            <defs>
                              <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
                              </linearGradient>
                              <filter id="gl"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                            </defs>
                            {/* Background risk zones */}
                            <rect x={PL} y={PT} width={gW} height={gH * 0.15} fill="#ef444408" />
                            <rect x={PL} y={PT + gH * 0.15} width={gW} height={gH * 0.25} fill="#f9731605" />
                            {/* Y-axis grid + labels */}
                            {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map(v => {
                              const y = PT + gH - v * gH;
                              return (
                                <g key={v}>
                                  <line x1={PL} y1={y} x2={PL + gW} y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />
                                  <text x={PL - 5} y={y + 3} textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">{v.toFixed(1)}</text>
                                </g>
                              );
                            })}
                            {/* Area fill */}
                            <path d={areaD} fill="url(#areaG)" />
                            {/* Colored segments */}
                            {pts.map((p, i) => i > 0 ? (
                              <line key={i} x1={pts[i-1][0]} y1={pts[i-1][1]} x2={p[0]} y2={p[1]} stroke={rc(costs[i])} strokeWidth="2.5" strokeLinecap="round" />
                            ) : null)}
                            {/* Glow */}
                            <path d={lineD} fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.25" filter="url(#gl)" />
                            {/* Data points + labels */}
                            {pts.map((p, i) => (
                              <g key={i}>
                                <circle cx={p[0]} cy={p[1]} r="3.5" fill={rc(costs[i])} stroke="#0f172a" strokeWidth="1.5" />
                                {(i % labelStep === 0 || i === costs.length - 1) && (
                                  <text x={p[0]} y={p[1] - 7} textAnchor="middle" fill={rc(costs[i])} fontSize="7" fontFamily="monospace" fontWeight="bold">{costs[i].toFixed(2)}</text>
                                )}
                              </g>
                            ))}
                            {/* Threshold lines with right-side labels */}
                            {[[0.85, "#ef4444", "CRITICAL"], [0.6, "#f97316", "HIGH"], [0.3, "#eab308", "MEDIUM"]].map(([v, c, l]) => {
                              const y = PT + gH - (v as number) * gH;
                              return (
                                <g key={l as string}>
                                  <line x1={PL} y1={y} x2={PL + gW} y2={y} stroke={c as string} strokeWidth="0.7" strokeDasharray="5,3" opacity="0.5" />
                                  <text x={PL + gW + 4} y={y + 3} fill={c as string} fontSize="6" fontFamily="monospace" opacity="0.6">{l} {(v as number).toFixed(1)}</text>
                                </g>
                              );
                            })}
                            {/* X-axis labels */}
                            {pts.map((p, i) => (i % labelStep === 0 || i === costs.length - 1) ? (
                              <text key={i} x={p[0]} y={PT + gH + 14} textAnchor="middle" fill="#64748b" fontSize="7" fontFamily="monospace">S{i + 1}</text>
                            ) : null)}
                            {/* Axis titles */}
                            <text x={10} y={PT + gH / 2} textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace" transform={`rotate(-90, 10, ${PT + gH / 2})`}>COST</text>
                            <text x={PL + gW / 2} y={H - 5} textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">ROUTE SEGMENT</text>
                          </svg>
                        </div>
                      );
                    })()}

                    {/* GRAPH 2: Threat Donut */}
                    {(() => {
                      const segs = aiPathStats.stats?.risk_segments ?? [];
                      if (segs.length === 0) return null;
                      const counts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
                      const dKm: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
                      segs.forEach((s: any) => { const r = (s.risk || "").toLowerCase(); if (r in counts) { counts[r]++; dKm[r] += parseFloat(s.dist_km) || 0; } });
                      const total = segs.length || 1;
                      const R = 58, CX = 75, CY = 75, SW = 16;
                      const circ = 2 * Math.PI * R;
                      const colors: Record<string, string> = { low: "#10b981", medium: "#eab308", high: "#f97316", critical: "#ef4444" };
                      let off = 0;
                      const arcs = Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => {
                        const pct = v / total;
                        const dl = circ * pct;
                        const dg = circ - dl;
                        const a = { key: k, da: `${dl} ${dg}`, off: -off, color: colors[k], pct: (pct * 100).toFixed(1), count: v };
                        off += dl;
                        return a;
                      });
                      const totalD = Object.values(dKm).reduce((a, b) => a + b, 0);
                      return (
                        <div className="bg-slate-800/25 border border-amber-500/10 rounded-lg p-4 flex flex-col">
                          <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[9px] font-orbitron text-amber-400 tracking-[0.15em]">THREAT EXPOSURE</span>
                          </div>
                          <div className="flex-1 flex items-center justify-center">
                            <svg viewBox="0 0 150 150" width="150" height="150">
                              <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e293b" strokeWidth={SW} />
                              {arcs.map(a => (
                                <circle key={a.key} cx={CX} cy={CY} r={R} fill="none" stroke={a.color} strokeWidth={SW}
                                  strokeDasharray={a.da} strokeDashoffset={a.off}
                                  strokeLinecap="butt" transform={`rotate(-90 ${CX} ${CY})`} />
                              ))}
                              <text x={CX} y={CY - 8} textAnchor="middle" fill="#f59e0b" fontSize="18" fontFamily="Orbitron, monospace" fontWeight="bold">{total}</text>
                              <text x={CX} y={CY + 4} textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">SEGMENTS</text>
                              <text x={CX} y={CY + 14} textAnchor="middle" fill="#64748b" fontSize="6" fontFamily="monospace">{totalD.toFixed(0)} km total</text>
                            </svg>
                          </div>
                          {/* Legend rows */}
                          <div className="mt-3 space-y-1.5">
                            {arcs.map(a => (
                              <div key={a.key} className="grid grid-cols-4 items-center text-[7px] font-space-mono gap-1">
                                <div className="flex items-center gap-1.5 col-span-1">
                                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: a.color }} />
                                  <span className="font-orbitron tracking-wide" style={{ color: a.color }}>{a.key.toUpperCase()}</span>
                                </div>
                                <span className="text-slate-400 text-right">{a.count} seg</span>
                                <span className="text-slate-500 text-right">{a.pct}%</span>
                                <span className="text-slate-400 text-right">{dKm[a.key].toFixed(0)} km</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ── ROW 3: BAR CHART + COST ANALYSIS ── */}
                <div className="px-4 pb-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* GRAPH 3: Distance by Risk (Horizontal Bar) */}
                    {(() => {
                      const segs = aiPathStats.stats?.risk_segments ?? [];
                      if (segs.length === 0) return null;
                      const dKm: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
                      segs.forEach((s: any) => { const r = (s.risk || "").toLowerCase(); if (r in dKm) dKm[r] += parseFloat(s.dist_km) || 0; });
                      const maxD = Math.max(...Object.values(dKm), 1);
                      const colors: Record<string, string> = { low: "#10b981", medium: "#eab308", high: "#f97316", critical: "#ef4444" };
                      const labels: Record<string, string> = { low: "LOW", medium: "MEDIUM", high: "HIGH", critical: "CRITICAL" };
                      const totalD = Object.values(dKm).reduce((a, b) => a + b, 0);
                      const W = 480, PL = 65, PR = 80, PT = 15, barH = 22, gap = 12;
                      const H = PT + 4 * (barH + gap);
                      const barArea = W - PL - PR;
                      return (
                        <div className="bg-slate-800/25 border border-cyan-500/10 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Route className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="text-[9px] font-orbitron text-cyan-400 tracking-[0.15em]">DISTANCE BY RISK</span>
                            </div>
                            <span className="text-[7px] font-space-mono text-slate-600">{totalD.toFixed(0)} km total</span>
                          </div>
                          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                            {Object.entries(dKm).map(([k, v], i) => {
                              const y = PT + i * (barH + gap);
                              const bW = maxD > 0 ? (v / maxD) * barArea : 0;
                              const pct = totalD > 0 ? ((v / totalD) * 100).toFixed(1) : "0";
                              return (
                                <g key={k}>
                                  {/* Label */}
                                  <text x={PL - 6} y={y + barH / 2 + 1} textAnchor="end" dominantBaseline="middle" fill={colors[k]} fontSize="8" fontFamily="Orbitron, monospace" fontWeight="bold">{labels[k]}</text>
                                  {/* Bar bg */}
                                  <rect x={PL} y={y} width={barArea} height={barH} rx="3" fill="#1e293b" opacity="0.3" />
                                  {/* Bar fill */}
                                  <rect x={PL} y={y} width={Math.max(bW, 3)} height={barH} rx="3" fill={colors[k]} opacity="0.7" />
                                  {/* Value */}
                                  <text x={PL + Math.max(bW, 3) + 6} y={y + barH / 2 - 2} dominantBaseline="middle" fill={colors[k]} fontSize="9" fontFamily="monospace" fontWeight="bold">{v.toFixed(0)} km</text>
                                  <text x={PL + Math.max(bW, 3) + 6} y={y + barH / 2 + 9} fill="#64748b" fontSize="7" fontFamily="monospace">{pct}%</text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      );
                    })()}

                    {/* GRAPH 4: Cost Analysis */}
                    {(() => {
                      const segs = aiPathStats.stats?.risk_segments ?? [];
                      if (segs.length === 0) return null;
                      const costs: number[] = segs.map((s: any) => typeof s.cost === "number" ? s.cost : parseFloat(s.cost) || 0);
                      const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
                      const mn = Math.min(...costs), mx = Math.max(...costs);
                      const sd = Math.sqrt(costs.reduce((a, c) => a + Math.pow(c - avg, 2), 0) / costs.length);
                      const rc = (c: number) => c >= 0.85 ? "#ef4444" : c >= 0.6 ? "#f97316" : c >= 0.3 ? "#eab308" : "#10b981";
                      const W = 480, PAD = 10;
                      const cW = (W - 2 * PAD) / costs.length;
                      return (
                        <div className="bg-slate-800/25 border border-emerald-500/10 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[9px] font-orbitron text-emerald-400 tracking-[0.15em]">COST ANALYSIS</span>
                          </div>
                          {/* Heatmap */}
                          <div className="mb-3">
                            <div className="text-[6px] font-orbitron text-slate-600 tracking-[0.1em] mb-1">SEGMENT COST HEATMAP</div>
                            <svg viewBox={`0 0 ${W} 40`} className="w-full" preserveAspectRatio="xMidYMid meet">
                              {costs.map((c, i) => (
                                <rect key={i} x={PAD + i * cW} y={4} width={cW + 0.5} height={24} fill={rc(c)} opacity={0.3 + c * 0.7} rx="1" />
                              ))}
                              <text x={PAD} y={36} fill="#64748b" fontSize="6" fontFamily="monospace">START</text>
                              <text x={W - PAD} y={36} fill="#64748b" fontSize="6" fontFamily="monospace" textAnchor="end">GOAL</text>
                            </svg>
                          </div>
                          {/* Stats — 2×2 grid */}
                          <div className="grid grid-cols-2 gap-1.5 mb-3">
                            {[
                              { lbl: "AVG COST",   val: avg.toFixed(4), ic: "●", clr: "#f59e0b" },
                              { lbl: "PEAK COST",  val: mx.toFixed(4),  ic: "▲", clr: mx >= 0.85 ? "#ef4444" : "#f97316" },
                              { lbl: "MIN COST",   val: mn.toFixed(4),  ic: "▼", clr: "#10b981" },
                              { lbl: "STD DEV",    val: sd.toFixed(4),  ic: "σ", clr: "#94a3b8" },
                            ].map(s => (
                              <div key={s.lbl} className="bg-slate-900/40 border border-slate-700/15 rounded p-2 flex items-center justify-between">
                                <span className="text-[6px] font-orbitron text-slate-500 tracking-wide">{s.lbl}</span>
                                <span className="text-[10px] font-orbitron" style={{ color: s.clr }}>{s.ic} {s.val}</span>
                              </div>
                            ))}
                          </div>
                          {/* Cost range */}
                          <div className="bg-slate-900/30 border border-slate-700/10 rounded p-2">
                            <div className="text-[6px] font-orbitron text-slate-600 tracking-[0.1em] mb-1">COST RANGE</div>
                            <div className="relative h-2.5 rounded-full overflow-hidden bg-slate-800/50">
                              <div className="absolute inset-0 flex">
                                <div className="bg-emerald-500" style={{ width: "30%" }} />
                                <div className="bg-amber-500" style={{ width: "30%" }} />
                                <div className="bg-orange-500" style={{ width: "25%" }} />
                                <div className="bg-red-500" style={{ width: "15%" }} />
                              </div>
                              <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${mn * 100}%` }} />
                              <div className="absolute top-0 bottom-0 w-0.5 bg-amber-300" style={{ left: `${avg * 100}%` }} />
                              <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${Math.min(mx * 100, 99)}%` }} />
                            </div>
                            <div className="flex justify-between mt-1 text-[6px] font-space-mono">
                              <span className="text-emerald-400">min {mn.toFixed(2)}</span>
                              <span className="text-amber-400">avg {avg.toFixed(2)}</span>
                              <span style={{ color: mx >= 0.85 ? "#ef4444" : "#f97316" }}>max {mx.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ── ROW 4: SEGMENT TABLE + INFO CARDS ── */}
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* LEFT: Risk Segments Table */}
                    <div className="bg-slate-800/25 border border-amber-500/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[9px] font-orbitron text-amber-400 tracking-[0.15em]">RISK SEGMENT TABLE</span>
                        </div>
                        <span className="text-[7px] font-space-mono text-slate-600">{aiPathStats.stats?.risk_segments?.length ?? 0} segments</span>
                      </div>
                      {/* Table */}
                      <div className="max-h-64 overflow-y-auto plan-scroll">
                        <table className="w-full text-[7px] font-space-mono">
                          <thead>
                            <tr className="text-[6px] font-orbitron text-slate-500 border-b border-slate-700/30">
                              <th className="text-left py-1.5 pl-2 w-[5%]">#</th>
                              <th className="text-left py-1.5 w-[25%]">FROM</th>
                              <th className="text-left py-1.5 w-[25%]">TO</th>
                              <th className="text-right py-1.5 w-[15%]">DIST</th>
                              <th className="text-right py-1.5 w-[12%]">COST</th>
                              <th className="text-right py-1.5 pr-2 w-[18%]">RISK</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(aiPathStats.stats?.risk_segments ?? []).map((seg: any, i: number) => {
                              const rc2 = (seg.risk || "").toLowerCase();
                              const clr = rc2 === "critical" ? "text-red-400" : rc2 === "high" ? "text-orange-400" : rc2 === "medium" ? "text-amber-400" : "text-emerald-400";
                              const bg2 = rc2 === "critical" ? "bg-red-500/10" : rc2 === "high" ? "bg-orange-500/10" : rc2 === "medium" ? "bg-amber-500/10" : "bg-emerald-500/10";
                              return (
                                <tr key={i} className={`${i % 2 === 0 ? "bg-slate-800/10" : ""} hover:bg-amber-500/5 cursor-pointer transition-colors`}
                                  onClick={() => { if (mapRef.current && seg.from) { mapRef.current.flyTo([(seg.from[0] + seg.to[0]) / 2, (seg.from[1] + seg.to[1]) / 2], 7, { duration: 0.8 }); } }}>
                                  <td className="py-1 pl-2 text-slate-600">{i + 1}</td>
                                  <td className="py-1 text-slate-400">{seg.from?.[0]?.toFixed(2)}°, {seg.from?.[1]?.toFixed(2)}°</td>
                                  <td className="py-1 text-slate-400">{seg.to?.[0]?.toFixed(2)}°, {seg.to?.[1]?.toFixed(2)}°</td>
                                  <td className="py-1 text-right text-slate-300">{seg.dist_km} km</td>
                                  <td className={`py-1 text-right ${clr}`}>{typeof seg.cost === "number" ? seg.cost.toFixed(2) : seg.cost}</td>
                                  <td className="py-1 text-right pr-2">
                                    <span className={`text-[6px] font-orbitron px-1.5 py-0.5 rounded ${bg2} ${clr}`}>
                                      {(typeof seg.risk === "string" ? seg.risk : "—").toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {/* Distribution bar */}
                      {(() => {
                        const segs = aiPathStats.stats?.risk_segments ?? [];
                        const ct: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
                        segs.forEach((s: any) => { const r = (s.risk || "").toLowerCase(); if (r in ct) ct[r]++; });
                        const tot = segs.length || 1;
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-700/20">
                            <div className="text-[6px] font-orbitron text-slate-600 tracking-[0.1em] mb-1.5">DISTRIBUTION</div>
                            <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-800/40">
                              {ct.low > 0 && <div className="bg-emerald-500" style={{ width: `${(ct.low / tot) * 100}%` }} />}
                              {ct.medium > 0 && <div className="bg-amber-500" style={{ width: `${(ct.medium / tot) * 100}%` }} />}
                              {ct.high > 0 && <div className="bg-orange-500" style={{ width: `${(ct.high / tot) * 100}%` }} />}
                              {ct.critical > 0 && <div className="bg-red-500" style={{ width: `${(ct.critical / tot) * 100}%` }} />}
                            </div>
                            <div className="flex gap-3 mt-1.5">
                              {Object.entries(ct).filter(([, v]) => v > 0).map(([k, v]) => (
                                <span key={k} className={`text-[6px] font-space-mono ${
                                  k === "critical" ? "text-red-400" : k === "high" ? "text-orange-400" : k === "medium" ? "text-amber-400" : "text-emerald-400"
                                }`}>{k.toUpperCase()} {v}/{tot}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* RIGHT: Info Cards */}
                    <div className="space-y-3">
                      {/* Model + Context — side by side */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Model */}
                        <div className="bg-slate-800/25 border border-amber-500/10 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Brain className="w-3 h-3 text-amber-400" />
                            <span className="text-[8px] font-orbitron text-amber-400 tracking-[0.1em]">MODEL</span>
                          </div>
                          <div className={`text-[10px] font-orbitron text-center py-1.5 rounded border mb-2 ${
                            aiPathStats.model_used === "dyn_cost_net"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : "bg-slate-700/20 border-slate-600/15 text-slate-400"
                          }`}>
                            {aiPathStats.model_used === "dyn_cost_net" ? "NEURAL NET" : "EXPERT RULES"}
                          </div>
                          <div className="space-y-1">
                            {[
                              ["Arch",   aiPathStats.model_used === "dyn_cost_net" ? "ResidualMLP" : "Rule-based"],
                              ["Feats",  aiPathStats.model_used === "dyn_cost_net" ? "32-dim" : "N/A"],
                              ["Grid",   `${aiPathStats.grid_shape?.[0]}×${aiPathStats.grid_shape?.[1]}`],
                              ["A*",     "8-directional"],
                              ["Smooth", "Catmull-Rom"],
                            ].map(([l, v]) => (
                              <div key={l} className="flex justify-between text-[7px] font-space-mono">
                                <span className="text-slate-500">{l}</span>
                                <span className="text-slate-400">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Context */}
                        <div className="bg-slate-800/25 border border-cyan-500/10 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Globe2 className="w-3 h-3 text-cyan-400" />
                            <span className="text-[8px] font-orbitron text-cyan-400 tracking-[0.1em]">CONTEXT</span>
                          </div>
                          <div className="space-y-1">
                            {[
                              ["Season",  aiPathStats.context?.season ?? "—",         "text-cyan-300/80"],
                              ["Month",   `${aiPathStats.context?.month ?? "—"}`,     "text-cyan-300/80"],
                              ["UTC",     `${aiPathStats.context?.utc_hour ?? "—"}:00`, "text-cyan-300/80"],
                              ["Ops",     (aiPathStats.context?.utc_hour ?? 12) >= 20 || (aiPathStats.context?.utc_hour ?? 12) < 6 ? "NIGHT ●" : "DAY ○",
                                          (aiPathStats.context?.utc_hour ?? 12) >= 20 || (aiPathStats.context?.utc_hour ?? 12) < 6 ? "text-emerald-400" : "text-amber-400"],
                              ["Sea",     `${aiPathStats.weather?.sea_state ?? "—"} (${aiPathStats.weather?.wave_height ?? "—"}m)`, "text-cyan-300/80"],
                              ["Wind",    `${aiPathStats.weather?.wind_speed ?? "—"} km/h`, "text-cyan-300/80"],
                              ["Vis",     `${aiPathStats.weather?.visibility ?? "—"} km`, "text-cyan-300/80"],
                            ].map(([l, v, c]) => (
                              <div key={l as string} className="flex justify-between text-[7px] font-space-mono">
                                <span className="text-slate-500">{l}</span>
                                <span className={c as string}>{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Vessel */}
                      <div className="bg-slate-800/25 border border-emerald-500/10 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Anchor className="w-3 h-3 text-emerald-400" />
                          <span className="text-[8px] font-orbitron text-emerald-400 tracking-[0.1em]">VESSEL & MISSION</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {[
                            [`${missionProfile.speed}`, "SPEED KN"],
                            [`${missionProfile.crew}`, "CREW"],
                            [missionProfile.displacement, "DISPL"],
                          ].map(([v, l]) => (
                            <div key={l} className="bg-slate-800/30 rounded p-1.5 text-center">
                              <div className="text-[10px] font-orbitron text-emerald-400 leading-none">{v}</div>
                              <div className="text-[5px] font-orbitron text-slate-600 mt-1 tracking-wide">{l}</div>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-0.5 text-[7px] font-space-mono">
                          <div className="flex justify-between"><span className="text-slate-500">Vessel</span><span className="text-slate-300">{missionProfile.vessel}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="text-emerald-300 uppercase">{missionProfile.type}</span></div>
                          <div className="flex justify-between"><span className="text-slate-500">Arms</span><span className="text-slate-400 text-right max-w-[60%]">{missionProfile.armament}</span></div>
                        </div>
                      </div>

                      {/* Route Comparison */}
                      {waypoints.length >= 2 && (
                        <div className="bg-slate-800/25 border border-cyan-500/10 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Route className="w-3 h-3 text-cyan-400" />
                            <span className="text-[8px] font-orbitron text-cyan-400 tracking-[0.1em]">ROUTE COMPARISON</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="text-center bg-cyan-500/5 rounded p-2">
                              <div className="text-[6px] font-orbitron text-cyan-400/60 mb-0.5">MANUAL</div>
                              <div className="text-sm font-orbitron text-cyan-400 leading-none">{routeStats.distance} nm</div>
                              <div className="text-[7px] font-space-mono text-slate-500 mt-1">{routeStats.eta}</div>
                              <div className="text-[6px] font-space-mono text-slate-600">{waypoints.length} WP</div>
                            </div>
                            <div className="text-center bg-amber-500/5 rounded p-2">
                              <div className="text-[6px] font-orbitron text-amber-400/60 mb-0.5">AI ROUTE</div>
                              <div className="text-sm font-orbitron text-amber-400 leading-none">{aiPathStats.stats?.total_nm} nm</div>
                              <div className="text-[7px] font-space-mono text-slate-500 mt-1">{aiPathStats.stats?.eta}</div>
                              <div className="text-[6px] font-space-mono text-slate-600">{aiPathStats.waypoints?.length} WP</div>
                            </div>
                          </div>
                          {(() => {
                            const mNm = routeStats.distance;
                            const aNm = aiPathStats.stats?.total_nm ?? 0;
                            const d = aNm - mNm;
                            const p = mNm > 0 ? ((d / mNm) * 100).toFixed(1) : "0";
                            return (
                              <div className="pt-2 border-t border-slate-700/15 text-center">
                                <span className={`text-[7px] font-orbitron ${d > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                  AI is {Math.abs(d)} nm {d > 0 ? "LONGER" : "SHORTER"} ({p}%)
                                </span>
                                <div className="text-[6px] font-space-mono text-slate-600 mt-0.5">
                                  {d > 0 ? "Avoids threat zones — tactical advantage" : "More efficient path found"}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Risk Legend */}
                      <div className="bg-slate-800/25 border border-slate-500/10 rounded-lg p-3">
                        <div className="text-[6px] font-orbitron text-slate-500 tracking-[0.15em] mb-2">RISK LEVELS</div>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { r: "LOW",      c: "#10b981", rng: "0 – 0.3",   d: "Safe" },
                            { r: "MEDIUM",   c: "#eab308", rng: "0.3 – 0.6", d: "Elevated" },
                            { r: "HIGH",     c: "#f97316", rng: "0.6 – 0.85",d: "Threat" },
                            { r: "CRITICAL", c: "#ef4444", rng: "0.85 – 1.0",d: "Danger" },
                          ].map(x => (
                            <div key={x.r} className="text-center">
                              <div className="w-full h-1.5 rounded-full mb-1" style={{ backgroundColor: x.c }} />
                              <div className="text-[7px] font-orbitron" style={{ color: x.c }}>{x.r}</div>
                              <div className="text-[6px] font-space-mono text-slate-600">{x.rng}</div>
                              <div className="text-[5px] font-space-mono text-slate-700">{x.d}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* @ts-ignore */}
      <style dangerouslySetInnerHTML={{ __html: `
        .plan-scroll::-webkit-scrollbar { width: 2px; }
        .plan-scroll::-webkit-scrollbar-track { background: transparent; }
        .plan-scroll::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.15); border-radius: 2px; }
        .tactical-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        .tactical-popup .leaflet-popup-tip { display: none !important; }
        .tactical-popup .leaflet-popup-content { margin: 0 !important; }
        .tactical-tooltip {
          background: #0f172aee !important;
          border: 1px solid #06b6d433 !important;
          border-radius: 6px !important;
          padding: 4px 8px !important;
          box-shadow: 0 0 12px #06b6d422 !important;
          color: #e2e8f0 !important;
          font-family: monospace !important;
        }
        .tactical-tooltip::before { border-top-color: #06b6d433 !important; }
        .leaflet-control-zoom a {
          background: #0f172acc !important;
          color: #06b6d4 !important;
          border-color: #06b6d422 !important;
          font-family: 'Orbitron', monospace !important;
        }
        .leaflet-control-zoom a:hover {
          background: #0f172a !important;
          color: #22d3ee !important;
        }
        .leaflet-control-attribution {
          background: #0f172a88 !important;
          color: #64748b !important;
          font-size: 7px !important;
        }
        .leaflet-control-attribution a { color: #06b6d4 !important; }
        .leaflet-host .leaflet-container,
        .leaflet-host .leaflet-pane,
        .leaflet-host .leaflet-map-pane,
        .leaflet-host .leaflet-tile-pane {
          z-index: 10 !important;
        }
        .leaflet-host .leaflet-tile-pane img.leaflet-tile {
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }
      ` }} />
    </div>
  );
}
