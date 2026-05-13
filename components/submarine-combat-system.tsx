"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Crosshair,
  Shield,
  Radar,
  AlertTriangle,
  Anchor,
  Zap,
  ChevronDown,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════
//  REAL INDIAN NAVAL WEAPONS DATA
// ══════════════════════════════════════════════════════════════
interface Weapon {
  id: string;
  name: string;
  designation: string;
  type: "torpedo" | "missile";
  range_km: number;
  speed_mach: number;
  speed_ms: number;
  warhead_kg: number;
  warhead_type: string;
  blast_radius_lethal_m: number;
  blast_radius_damage_m: number;
  max_depth_m: number;
  guidance: string;
  manufacturer: string;
  count: number;
  maxCount: number;
}

interface IndianSubmarine {
  id: string;
  name: string;
  pennant: string;
  class_name: string;
  type: "SSBN" | "SSK" | "SSN";
  displacement_t: number;
  propulsion: string;
  max_depth_m: number;
  max_speed_kts: number;
  crew: number;
  weapons: Weapon[];
}

interface CombatTarget {
  id: string;
  designation: string;
  type: string;
  classification: "hostile" | "friendly" | "unknown";
  detected_by: string;
  bearing_deg: number;
  range_km: number;
  depth_m: number;
  speed_kts: number;
  heading_deg: number;
  confidence: number;
  nation: string;
  threat_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  x: number;
  y: number;
  destroyed: boolean;
}

type Phase =
  | "scanning"
  | "locked"
  | "armed"
  | "countdown"
  | "firing"
  | "impact"
  | "destroyed";

// ══ INDIAN SUBMARINES — REAL SPECIFICATIONS ══
const SUBMARINES: IndianSubmarine[] = [
  {
    id: "arihant",
    name: "INS Arihant",
    pennant: "S2",
    class_name: "Arihant-class",
    type: "SSBN",
    displacement_t: 6000,
    propulsion: "83 MW PWR Nuclear Reactor",
    max_depth_m: 300,
    max_speed_kts: 24,
    crew: 95,
    weapons: [
      {
        id: "varu-1",
        name: "Varunastra",
        designation: "Heavy Weight Torpedo",
        type: "torpedo",
        range_km: 40,
        speed_mach: 0.059,
        speed_ms: 20.6,
        warhead_kg: 250,
        warhead_type: "PBX High Explosive",
        blast_radius_lethal_m: 21,
        blast_radius_damage_m: 52,
        max_depth_m: 400,
        guidance: "Wire-guided + Active/Passive Homing",
        manufacturer: "BDL Hyderabad",
        count: 6,
        maxCount: 6,
      },
      {
        id: "k15-1",
        name: "K-15 Sagarika",
        designation: "SLBM",
        type: "missile",
        range_km: 750,
        speed_mach: 6.5,
        speed_ms: 2223,
        warhead_kg: 500,
        warhead_type: "Strategic Nuclear / Conventional HE",
        blast_radius_lethal_m: 27,
        blast_radius_damage_m: 65,
        max_depth_m: 50,
        guidance: "Inertial + Stellar + GPS Terminal",
        manufacturer: "DRDO",
        count: 12,
        maxCount: 12,
      },
      {
        id: "brahmos-1",
        name: "BrahMos-A",
        designation: "Submarine-launched Cruise Missile",
        type: "missile",
        range_km: 290,
        speed_mach: 2.8,
        speed_ms: 952,
        warhead_kg: 300,
        warhead_type: "Semi-armor Piercing HE",
        blast_radius_lethal_m: 23,
        blast_radius_damage_m: 55,
        max_depth_m: 40,
        guidance: "Inertial + Active Radar Terminal Seeker",
        manufacturer: "BrahMos Aerospace",
        count: 4,
        maxCount: 4,
      },
    ],
  },
  {
    id: "arighat",
    name: "INS Arighat",
    pennant: "S3",
    class_name: "Arihant-class",
    type: "SSBN",
    displacement_t: 6000,
    propulsion: "83 MW PWR Nuclear Reactor",
    max_depth_m: 300,
    max_speed_kts: 24,
    crew: 95,
    weapons: [
      {
        id: "varu-2",
        name: "Varunastra",
        designation: "Heavy Weight Torpedo",
        type: "torpedo",
        range_km: 40,
        speed_mach: 0.059,
        speed_ms: 20.6,
        warhead_kg: 250,
        warhead_type: "PBX High Explosive",
        blast_radius_lethal_m: 21,
        blast_radius_damage_m: 52,
        max_depth_m: 400,
        guidance: "Wire-guided + Active/Passive Homing",
        manufacturer: "BDL Hyderabad",
        count: 6,
        maxCount: 6,
      },
      {
        id: "k4-1",
        name: "K-4",
        designation: "Intermediate Range SLBM",
        type: "missile",
        range_km: 3500,
        speed_mach: 7.0,
        speed_ms: 2401,
        warhead_kg: 2000,
        warhead_type: "Strategic Thermonuclear",
        blast_radius_lethal_m: 43,
        blast_radius_damage_m: 103,
        max_depth_m: 50,
        guidance: "Ring Laser Gyro INS + Stellar",
        manufacturer: "DRDO",
        count: 4,
        maxCount: 4,
      },
    ],
  },
  {
    id: "kalvari",
    name: "INS Kalvari",
    pennant: "S21",
    class_name: "Kalvari-class (Scorpène)",
    type: "SSK",
    displacement_t: 1775,
    propulsion: "Diesel-Electric (360 cells)",
    max_depth_m: 350,
    max_speed_kts: 20,
    crew: 44,
    weapons: [
      {
        id: "varu-3",
        name: "Varunastra",
        designation: "Heavy Weight Torpedo",
        type: "torpedo",
        range_km: 40,
        speed_mach: 0.059,
        speed_ms: 20.6,
        warhead_kg: 250,
        warhead_type: "PBX High Explosive",
        blast_radius_lethal_m: 21,
        blast_radius_damage_m: 52,
        max_depth_m: 400,
        guidance: "Wire-guided + Active/Passive Homing",
        manufacturer: "BDL Hyderabad",
        count: 6,
        maxCount: 6,
      },
      {
        id: "shyena-1",
        name: "TAL Shyena",
        designation: "Anti-Submarine Lightweight Torpedo",
        type: "torpedo",
        range_km: 14,
        speed_mach: 0.049,
        speed_ms: 17.0,
        warhead_kg: 45,
        warhead_type: "Shaped Charge HE",
        blast_radius_lethal_m: 12,
        blast_radius_damage_m: 29,
        max_depth_m: 500,
        guidance: "Active/Passive Acoustic Homing",
        manufacturer: "NSTL Visakhapatnam",
        count: 6,
        maxCount: 6,
      },
    ],
  },
  {
    id: "vagsheer",
    name: "INS Vagsheer",
    pennant: "S26",
    class_name: "Kalvari-class (Scorpène)",
    type: "SSK",
    displacement_t: 1775,
    propulsion: "Diesel-Electric + AIP Module",
    max_depth_m: 350,
    max_speed_kts: 20,
    crew: 44,
    weapons: [
      {
        id: "varu-4",
        name: "Varunastra",
        designation: "Heavy Weight Torpedo",
        type: "torpedo",
        range_km: 40,
        speed_mach: 0.059,
        speed_ms: 20.6,
        warhead_kg: 250,
        warhead_type: "PBX High Explosive",
        blast_radius_lethal_m: 21,
        blast_radius_damage_m: 52,
        max_depth_m: 400,
        guidance: "Wire-guided + Active/Passive Homing",
        manufacturer: "BDL Hyderabad",
        count: 6,
        maxCount: 6,
      },
      {
        id: "shyena-2",
        name: "TAL Shyena",
        designation: "Anti-Submarine Lightweight Torpedo",
        type: "torpedo",
        range_km: 14,
        speed_mach: 0.049,
        speed_ms: 17.0,
        warhead_kg: 45,
        warhead_type: "Shaped Charge HE",
        blast_radius_lethal_m: 12,
        blast_radius_damage_m: 29,
        max_depth_m: 500,
        guidance: "Active/Passive Acoustic Homing",
        manufacturer: "NSTL Visakhapatnam",
        count: 6,
        maxCount: 6,
      },
      {
        id: "brahmos-2",
        name: "BrahMos-NG",
        designation: "Next-Gen Cruise Missile (VLS)",
        type: "missile",
        range_km: 290,
        speed_mach: 3.5,
        speed_ms: 1190,
        warhead_kg: 300,
        warhead_type: "Semi-armor Piercing HE",
        blast_radius_lethal_m: 23,
        blast_radius_damage_m: 55,
        max_depth_m: 40,
        guidance: "Inertial + Active Radar Terminal",
        manufacturer: "BrahMos Aerospace",
        count: 2,
        maxCount: 2,
      },
    ],
  },
];

// ══ TARGETS — Linked to YOLOv8 Detection Model classes (submarine, auv, mines, divers) ══
const INITIAL_TARGETS: CombatTarget[] = [
  {
    id: "s1",
    designation: "Sierra-1",
    type: "Type 039A Yuan-class SSK",
    classification: "hostile",
    detected_by: "submarine",
    bearing_deg: 42,
    range_km: 14.5,
    depth_m: -120,
    speed_kts: 8,
    heading_deg: 215,
    confidence: 94.7,
    nation: "PLA Navy (China)",
    threat_level: "CRITICAL",
    x: 68,
    y: 25,
    destroyed: false,
  },
  {
    id: "s2",
    designation: "Master-2",
    type: "Type 052D Luyang III Destroyer",
    classification: "hostile",
    detected_by: "submarine",
    bearing_deg: 315,
    range_km: 28.2,
    depth_m: 0,
    speed_kts: 22,
    heading_deg: 135,
    confidence: 89.1,
    nation: "PLA Navy (China)",
    threat_level: "HIGH",
    x: 22,
    y: 20,
    destroyed: false,
  },
  {
    id: "a1",
    designation: "Victor-3",
    type: "HSU-001 Large Displacement UUV",
    classification: "hostile",
    detected_by: "auv",
    bearing_deg: 168,
    range_km: 8.7,
    depth_m: -45,
    speed_kts: 4,
    heading_deg: 350,
    confidence: 76.3,
    nation: "PLA Navy (China)",
    threat_level: "MEDIUM",
    x: 55,
    y: 68,
    destroyed: false,
  },
  {
    id: "m1",
    designation: "Mine-Field-Alpha",
    type: "EM-52 Rocket-Propelled Sea Mine",
    classification: "hostile",
    detected_by: "mines",
    bearing_deg: 195,
    range_km: 5.2,
    depth_m: -30,
    speed_kts: 0,
    heading_deg: 0,
    confidence: 82.4,
    nation: "Unknown",
    threat_level: "HIGH",
    x: 40,
    y: 72,
    destroyed: false,
  },
  {
    id: "d1",
    designation: "Diver-Team-X",
    type: "Combat Diver Team (6 pax)",
    classification: "hostile",
    detected_by: "divers",
    bearing_deg: 78,
    range_km: 2.1,
    depth_m: -15,
    speed_kts: 2,
    heading_deg: 280,
    confidence: 71.0,
    nation: "Unknown",
    threat_level: "MEDIUM",
    x: 72,
    y: 55,
    destroyed: false,
  },
  {
    id: "f1",
    designation: "Friendly-1",
    type: "INS Shivalik (P17 Frigate)",
    classification: "friendly",
    detected_by: "submarine",
    bearing_deg: 88,
    range_km: 32.0,
    depth_m: 0,
    speed_kts: 15,
    heading_deg: 270,
    confidence: 99.2,
    nation: "Indian Navy",
    threat_level: "LOW",
    x: 88,
    y: 45,
    destroyed: false,
  },
  {
    id: "s3",
    designation: "Unknown-7",
    type: "Agosta 90B Hashmat-class SSK",
    classification: "unknown",
    detected_by: "submarine",
    bearing_deg: 255,
    range_km: 22.8,
    depth_m: -180,
    speed_kts: 6,
    heading_deg: 45,
    confidence: 62.8,
    nation: "Unconfirmed (Suspected PN)",
    threat_level: "HIGH",
    x: 15,
    y: 55,
    destroyed: false,
  },
];

export function SubmarineCombatSystem() {
  const [activeSub, setActiveSub] = useState<IndianSubmarine>(
    JSON.parse(JSON.stringify(SUBMARINES[0])),
  );
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("scanning");
  const [selectedTarget, setSelectedTarget] = useState<CombatTarget | null>(
    null,
  );
  const [selectedWeapon, setSelectedWeapon] = useState<Weapon | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [missileProgress, setMissileProgress] = useState(0);
  const [screenShake, setScreenShake] = useState(false);
  const [targets, setTargets] = useState<CombatTarget[]>(INITIAL_TARGETS);
  const [debrisParticles, setDebrisParticles] = useState<
    Array<{
      dx: number;
      dy: number;
      size: number;
      delay: number;
      duration: number;
      color: string;
    }>
  >([]);
  const [aiScanning, setAiScanning] = useState(false);
  const [weaponLog, setWeaponLog] = useState<string[]>([]);
  const [firingElapsed, setFiringElapsed] = useState<number>(0);
  const animFrameRef = useRef<number>(0);

  const subPos = { x: 50, y: 85 };
  const targetPos = selectedTarget
    ? { x: selectedTarget.x, y: selectedTarget.y }
    : { x: 50, y: 50 };

  // Physics: real time-to-impact calculation
  const physicsCalc = useMemo(() => {
    if (!selectedTarget || !selectedWeapon) return null;
    const dist_m = selectedTarget.range_km * 1000;
    const speed = selectedWeapon.speed_ms;
    const time_s = dist_m / speed;
    const kinetic_energy_mj =
      (0.5 * selectedWeapon.warhead_kg * speed * speed) / 1e6;
    const overpressure_kpa = selectedWeapon.warhead_kg * 4.2;
    return { dist_m, speed, time_s, kinetic_energy_mj, overpressure_kpa };
  }, [selectedTarget, selectedWeapon]);

  const formatTime = (s: number) => {
    if (s <= 0) return "0s";
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}m ${sec}s`;
  };

  // ═══ AI SCAN EFFECT ═══
  useEffect(() => {
    if (selectedTarget) {
      setAiScanning(true);
      const t = setTimeout(() => setAiScanning(false), 2200);
      return () => clearTimeout(t);
    }
  }, [selectedTarget]);

  // Auto-select best weapon for target
  useEffect(() => {
    if (!selectedTarget) {
      setSelectedWeapon(null);
      return;
    }
    const available = activeSub.weapons.filter(
      (w) => w.count > 0 && w.range_km >= selectedTarget.range_km,
    );
    if (available.length > 0 && !selectedWeapon)
      setSelectedWeapon(available[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTarget, activeSub]);

  // ═══ COUNTDOWN ═══
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("firing");
      setMissileProgress(0);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // ═══ TRAJECTORY — physics-based animation ═══
  useEffect(() => {
    if (phase !== "firing" || !physicsCalc) return;
    // Compress time for visual: 2–5s animation, display real ETA numbers
    const animDuration = Math.min(Math.max(physicsCalc.time_s * 8, 2000), 5000);
    const start = performance.now();
    const animate = () => {
      const elapsed = performance.now() - start;
      const p = Math.min(elapsed / animDuration, 1);
      // S-curve: acceleration → cruise → terminal guidance
      const eased =
        p < 0.15
          ? (p / 0.15) * (p / 0.15) * 0.15
          : p < 0.85
            ? 0.15 + (p - 0.15) * (0.85 / 0.7)
            : 0.85 + 0.15 * (1 - Math.pow(1 - (p - 0.85) / 0.15, 2));
      setMissileProgress(Math.min(eased, 1));
      setFiringElapsed(physicsCalc.time_s * p);
      if (p < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setScreenShake(true);
        setPhase("impact");
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [phase, physicsCalc]);

  // ═══ IMPACT ═══
  useEffect(() => {
    if (phase !== "impact") return;
    const isUnderwater = selectedTarget ? selectedTarget.depth_m < 0 : true;
    setDebrisParticles(
      Array.from({ length: 40 }, (_, i) => {
        const angle = (i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = 20 + Math.random() * 200;
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist * (isUnderwater ? 0.6 : 1),
          size: 1 + Math.random() * 6,
          delay: Math.random() * 300,
          duration: 600 + Math.random() * 1200,
          color: isUnderwater
            ? [
                "#e0f7fa",
                "#b2ebf2",
                "#80cbc4",
                "#ffffff",
                "#90a4ae",
                "#b0bec5",
              ][Math.floor(Math.random() * 6)]
            : ["#ff4500", "#ff6347", "#ffd700", "#ff8c00", "#333", "#ff0000"][
                Math.floor(Math.random() * 6)
              ],
        };
      }),
    );
    const t1 = setTimeout(() => setScreenShake(false), 600);
    const t2 = setTimeout(() => {
      setPhase("destroyed");
      if (selectedTarget)
        setTargets((prev) =>
          prev.map((t) =>
            t.id === selectedTarget.id ? { ...t, destroyed: true } : t,
          ),
        );
    }, 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase, selectedTarget]);

  // ═══ DESTROYED → SCANNING ═══
  useEffect(() => {
    if (phase !== "destroyed") return;
    const t = setTimeout(() => {
      setPhase("scanning");
      setSelectedTarget(null);
      setSelectedWeapon(null);
      setMissileProgress(0);
    }, 3500);
    return () => clearTimeout(t);
  }, [phase]);

  // ═══ HANDLERS ═══
  const selectTarget = useCallback(
    (t: CombatTarget) => {
      if (
        phase !== "scanning" ||
        t.destroyed ||
        t.classification === "friendly"
      )
        return;
      setSelectedTarget(t);
      setSelectedWeapon(null);
    },
    [phase],
  );

  const lockTarget = useCallback(() => {
    if (
      !selectedTarget ||
      !selectedWeapon ||
      selectedTarget.classification === "friendly" ||
      phase !== "scanning"
    )
      return;
    setPhase("locked");
    setWeaponLog((prev) => [
      ...prev,
      `[LOCK] ${selectedTarget.designation} — BRG ${selectedTarget.bearing_deg}° RNG ${selectedTarget.range_km}km — ${selectedWeapon.name}`,
    ]);
  }, [selectedTarget, selectedWeapon, phase]);

  const armWeapons = useCallback(() => {
    if (phase !== "locked") return;
    setPhase("armed");
    setWeaponLog((prev) => [
      ...prev,
      `[ARM] ${selectedWeapon?.name} — Weapons free authorized`,
    ]);
  }, [phase, selectedWeapon]);

  const fire = useCallback(() => {
    if (phase !== "armed" || !selectedWeapon) return;
    // Decrement ammo
    setActiveSub((prev) => ({
      ...prev,
      weapons: prev.weapons.map((w) =>
        w.id === selectedWeapon.id
          ? { ...w, count: Math.max(0, w.count - 1) }
          : w,
      ),
    }));
    setCountdown(3);
    setPhase("countdown");
    setWeaponLog((prev) => [
      ...prev,
      `[FIRE] ${selectedWeapon.name} → ${selectedTarget?.designation} | ${selectedTarget?.range_km}km | ETA ${physicsCalc ? formatTime(physicsCalc.time_s) : "—"}`,
    ]);
  }, [phase, selectedWeapon, selectedTarget, physicsCalc]);

  // ═══ MISSILE TRAIL ═══
  const missileX = subPos.x + (targetPos.x - subPos.x) * missileProgress;
  const missileY = subPos.y + (targetPos.y - subPos.y) * missileProgress;
  const trailPoints = useMemo(() => {
    if (phase !== "firing") return [];
    return Array.from({ length: 15 }, (_, i) => {
      const p = Math.max(0, missileProgress - (i + 1) * 0.018);
      return {
        x: subPos.x + (targetPos.x - subPos.x) * p,
        y: subPos.y + (targetPos.y - subPos.y) * p,
        opacity: 0.8 - i * 0.05,
        size: 5 - i * 0.25,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, missileProgress]);

  const classColor = (c: string) =>
    c === "hostile"
      ? "text-red-400"
      : c === "friendly"
        ? "text-green-400"
        : "text-amber-400";
  const classBg = (c: string) =>
    c === "hostile"
      ? "bg-red-500/20 border-red-500/40"
      : c === "friendly"
        ? "bg-green-500/20 border-green-500/40"
        : "bg-amber-500/20 border-amber-500/40";
  const classDot = (c: string) =>
    c === "hostile" ? "#ef4444" : c === "friendly" ? "#22c55e" : "#f59e0b";
  const activeTargets = targets.filter((t) => !t.destroyed);

  return (
    <div
      className={`h-screen flex flex-col bg-slate-950 text-cyan-100 pt-[128px] ${screenShake ? "combat-shake" : ""}`}
    >
      {/* ════ HEADER ════ */}
      <div className="flex-shrink-0 bg-slate-900/90 border-b border-cyan-800/30 px-4 py-2 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Anchor className="w-4 h-4 text-cyan-400" />
            <span className="font-orbitron text-cyan-300 text-xs tracking-wider">
              SUBMARINE TACTICAL COMBAT SYSTEM
            </span>
            <div className="h-4 w-px bg-cyan-800/40" />
            <span className="text-[9px] font-mono text-cyan-500/60">
              {activeSub.name} ({activeSub.pennant}) — {activeSub.type} —{" "}
              {activeSub.class_name}
            </span>
          </div>
          <div className="flex items-center gap-5 text-[9px] font-mono">
            <span>
              <span className="text-slate-500">DEPTH:</span>{" "}
              <span className="text-cyan-300">157m</span>
            </span>
            <span>
              <span className="text-slate-500">HDG:</span>{" "}
              <span className="text-cyan-300">045°</span>
            </span>
            <span>
              <span className="text-slate-500">SPD:</span>{" "}
              <span className="text-cyan-300">
                {activeSub.max_speed_kts} kts
              </span>
            </span>
            <span>
              <span className="text-slate-500">REACTOR:</span>{" "}
              <span className="text-green-400">NOMINAL</span>
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-orbitron tracking-widest text-[10px]">
                BATTLE STATIONS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ════ SUBMARINE SELECTOR ════ */}
      <div className="flex-shrink-0 bg-slate-900/50 border-b border-cyan-800/20 px-4 py-1.5">
        <div className="max-w-[1800px] mx-auto flex items-center gap-3">
          <span className="text-[8px] font-orbitron text-cyan-600 tracking-wider">
            LAUNCH PLATFORM:
          </span>
          <div className="relative">
            <button
              onClick={() => setSubMenuOpen(!subMenuOpen)}
              disabled={phase !== "scanning"}
              className="flex items-center gap-2 px-3 py-1 rounded border border-cyan-700/30 bg-slate-800/60 text-[10px] font-mono text-cyan-300 hover:bg-cyan-900/30 transition disabled:opacity-40"
            >
              <span className="font-bold">{activeSub.name}</span>
              <span className="text-cyan-500/50">({activeSub.pennant})</span>
              <span className="text-[8px] text-slate-500">
                {activeSub.type} • {activeSub.displacement_t}t
              </span>
              <ChevronDown className="w-3 h-3 text-cyan-500/50" />
            </button>
            {subMenuOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-slate-900 border border-cyan-700/40 rounded-lg shadow-xl min-w-[400px]">
                {SUBMARINES.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      setActiveSub(JSON.parse(JSON.stringify(sub)));
                      setSubMenuOpen(false);
                      setSelectedTarget(null);
                      setSelectedWeapon(null);
                    }}
                    className={`w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-cyan-900/20 transition border-b border-slate-800/50 last:border-0
                      ${sub.id === activeSub.id ? "bg-cyan-900/30 text-cyan-300" : "text-slate-400"}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-cyan-300">
                        {sub.name}{" "}
                        <span className="text-cyan-500/50">
                          ({sub.pennant})
                        </span>
                      </span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                        {sub.type}
                      </span>
                    </div>
                    <div className="text-[8px] text-slate-500 mt-0.5">
                      {sub.class_name} • {sub.displacement_t}t •{" "}
                      {sub.propulsion} • Crew: {sub.crew}
                    </div>
                    <div className="text-[8px] text-slate-600 mt-0.5">
                      Weapons:{" "}
                      {sub.weapons
                        .map((w) => `${w.count}× ${w.name}`)
                        .join(" | ")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4 text-[8px] font-mono text-slate-500">
            {activeSub.weapons.map((w) => (
              <span key={w.id}>
                {w.name}:{" "}
                <span
                  className={w.count > 0 ? "text-green-400" : "text-red-400"}
                >
                  {w.count}/{w.maxCount}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ════ MAIN GRID ════ */}
      <div className="flex-1 min-h-0 max-w-[1800px] mx-auto w-full grid grid-cols-12 gap-2 p-3 pb-[72px]">
        {/* ═══ LEFT — SONAR + CONTACTS ═══ */}
        <div className="col-span-3 flex flex-col gap-2 min-h-0 overflow-hidden">
          <div className="relative bg-slate-950 rounded-lg border border-cyan-800/30 overflow-hidden flex-shrink-0 max-h-[42vh]">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle
                cx="100"
                cy="100"
                r="96"
                fill="rgba(0,12,12,0.95)"
                stroke="rgba(6,182,212,0.12)"
                strokeWidth="0.5"
              />
              {[24, 48, 72, 96].map((r) => (
                <circle
                  key={r}
                  cx="100"
                  cy="100"
                  r={r}
                  fill="none"
                  stroke="rgba(6,182,212,0.06)"
                  strokeWidth="0.3"
                  strokeDasharray="2,3"
                />
              ))}
              <line
                x1="4"
                y1="100"
                x2="196"
                y2="100"
                stroke="rgba(6,182,212,0.05)"
                strokeWidth="0.3"
              />
              <line
                x1="100"
                y1="4"
                x2="100"
                y2="196"
                stroke="rgba(6,182,212,0.05)"
                strokeWidth="0.3"
              />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                const rad = ((deg - 90) * Math.PI) / 180;
                return (
                  <text
                    key={deg}
                    x={100 + 88 * Math.cos(rad)}
                    y={100 + 88 * Math.sin(rad)}
                    fill="rgba(6,182,212,0.2)"
                    fontSize="4.5"
                    fontFamily="monospace"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {deg}°
                  </text>
                );
              })}
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 100 100"
                  to="360 100 100"
                  dur="4s"
                  repeatCount="indefinite"
                />
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="6"
                  stroke="rgba(34,211,238,0.6)"
                  strokeWidth="1"
                />
                <path
                  d="M100,100 L100,6 A94,94,0,0,0,40,28 Z"
                  fill="rgba(34,211,238,0.04)"
                />
              </g>
              {activeTargets.map((t) => {
                const cx = t.x * 1.84 + 8,
                  cy = t.y * 1.84 + 8;
                const sel = selectedTarget?.id === t.id;
                return (
                  <g
                    key={t.id}
                    onClick={() => selectTarget(t)}
                    className="cursor-pointer"
                  >
                    {sel && (
                      <>
                        <circle
                          cx={cx}
                          cy={cy}
                          r="10"
                          fill="none"
                          stroke={classDot(t.classification)}
                          strokeWidth="0.6"
                          opacity="0.3"
                        >
                          <animate
                            attributeName="r"
                            values="6;12;6"
                            dur="1.5s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      </>
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="2.2"
                      fill={classDot(t.classification)}
                    >
                      {t.classification === "hostile" && (
                        <animate
                          attributeName="opacity"
                          values="1;0.3;1"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      )}
                    </circle>
                    <text
                      x={cx + 4}
                      y={cy - 3}
                      fill={classDot(t.classification)}
                      fontSize="4"
                      fontFamily="monospace"
                      opacity="0.7"
                    >
                      {t.designation}
                    </text>
                  </g>
                );
              })}
              <polygon
                points="100,94 104,104 100,101 96,104"
                fill="#22d3ee"
                stroke="#22d3ee"
                strokeWidth="0.4"
              />
              <text
                x="100"
                y="110"
                fill="rgba(34,211,238,0.3)"
                fontSize="3.5"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {activeSub.pennant}
              </text>
            </svg>
            <div className="absolute bottom-1.5 left-2 text-[7px] font-mono text-cyan-500/30">
              SONAR • ACTIVE
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 combat-scroll min-h-0">
            <div className="text-[9px] font-orbitron text-cyan-500/50 tracking-wider mb-1">
              CONTACTS ({activeTargets.length}) — YOLOv8 + SONAR
            </div>
            {activeTargets.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTarget(t)}
                disabled={
                  phase !== "scanning" || t.classification === "friendly"
                }
                className={`w-full text-left p-2 rounded-lg border text-[9px] font-mono transition-all
                  ${selectedTarget?.id === t.id ? "border-cyan-400/50 bg-cyan-500/10" : "border-slate-800/50 bg-slate-900/30 hover:border-cyan-800/30"}
                  ${phase !== "scanning" || t.classification === "friendly" ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex justify-between items-center">
                  <span className={`font-bold ${classColor(t.classification)}`}>
                    {t.designation}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] text-slate-600 border border-slate-700/30 rounded px-1">
                      {t.detected_by.toUpperCase()}
                    </span>
                    <span
                      className={`px-1 py-0.5 rounded border text-[6px] ${classBg(t.classification)}`}
                    >
                      {t.classification.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-[7px] text-slate-500 mt-0.5">{t.type}</div>
                <div className="text-[7px] text-slate-600 mt-0.5 flex gap-2">
                  <span>BRG:{t.bearing_deg}°</span>
                  <span>RNG:{t.range_km}km</span>
                  <span>D:{t.depth_m}m</span>
                  <span>SPD:{t.speed_kts}kts</span>
                </div>
              </button>
            ))}
            {activeTargets.length === 0 && (
              <div className="text-center py-4 text-slate-600 font-mono text-[10px]">
                <Shield className="w-5 h-5 mx-auto mb-1 opacity-30" />
                ALL THREATS NEUTRALIZED
              </div>
            )}
          </div>
        </div>

        {/* ═══ CENTER — TACTICAL DISPLAY ═══ */}
        <div className="col-span-5 relative bg-slate-950 rounded-lg border border-cyan-800/30 overflow-hidden min-h-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(6,182,212,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.02) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/15 via-transparent to-blue-950/20" />
          <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-cyan-500/20" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-cyan-500/20" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-cyan-500/20" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-cyan-500/20" />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-orbitron text-cyan-500/20 tracking-[0.2em]">
            TACTICAL DISPLAY
          </div>

          {activeTargets.map((t) => (
            <div
              key={t.id}
              className="absolute"
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: classDot(t.classification),
                  boxShadow: `0 0 6px ${classDot(t.classification)}50`,
                }}
              >
                {t.classification === "hostile" && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      backgroundColor: classDot(t.classification),
                      opacity: 0.2,
                    }}
                  />
                )}
              </div>
              <div
                className="absolute -top-3 left-3 text-[6px] font-mono whitespace-nowrap"
                style={{ color: classDot(t.classification) }}
              >
                {t.designation}
              </div>
            </div>
          ))}

          <div
            className="absolute"
            style={{
              left: `${subPos.x}%`,
              top: `${subPos.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <Anchor className="w-4 h-4 text-cyan-400" />
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[6px] font-mono text-cyan-400/40 whitespace-nowrap">
              {activeSub.pennant}
            </div>
          </div>

          {/* LOCK-ON */}
          {(phase === "locked" || phase === "armed") && selectedTarget && (
            <div
              className="absolute z-30 lock-on-anim"
              style={{
                left: `${selectedTarget.x}%`,
                top: `${selectedTarget.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="relative w-16 h-16">
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-1/3 bg-red-500"
                  style={{ boxShadow: "0 0 4px #ef4444" }}
                />
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-1/3 bg-red-500"
                  style={{ boxShadow: "0 0 4px #ef4444" }}
                />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] w-1/3 bg-red-500"
                  style={{ boxShadow: "0 0 4px #ef4444" }}
                />
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 h-[2px] w-1/3 bg-red-500"
                  style={{ boxShadow: "0 0 4px #ef4444" }}
                />
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-500" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-500" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-500" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${phase === "armed" ? "bg-red-500 animate-ping" : "bg-red-400/80"}`}
                  />
                </div>
                <div className="absolute -inset-2 border border-red-500/25 rounded-full border-dashed lock-rotate" />
              </div>
              <div
                className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-orbitron tracking-wider whitespace-nowrap ${phase === "armed" ? "text-red-400 animate-pulse font-bold" : "text-red-400/60"}`}
              >
                {phase === "armed" ? "WEAPONS FREE" : "LOCKED"}
              </div>
            </div>
          )}

          {/* COUNTDOWN */}
          {phase === "countdown" && (
            <div className="absolute inset-0 flex items-center justify-center z-40 bg-slate-950/50">
              <div className="text-center countdown-pulse" key={countdown}>
                <div
                  className="text-[100px] font-orbitron font-black leading-none"
                  style={{
                    color: countdown > 0 ? "#ef4444" : "#ff6347",
                    textShadow:
                      "0 0 40px rgba(239,68,68,0.4), 0 0 100px rgba(239,68,68,0.2)",
                  }}
                >
                  {countdown > 0 ? countdown : "FIRE"}
                </div>
                <div className="text-xs font-orbitron text-red-400/50 tracking-[0.3em] mt-2">
                  {countdown > 0
                    ? "LAUNCH SEQUENCE"
                    : selectedWeapon?.type === "torpedo"
                      ? "TORPEDO IN THE WATER"
                      : "MISSILE AWAY"}
                </div>
              </div>
            </div>
          )}

          {/* WEAPON TRAJECTORY */}
          {phase === "firing" && (
            <>
              {trailPoints.map((pt, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${pt.x}%`,
                    top: `${pt.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: `${pt.size}px`,
                    height: `${pt.size}px`,
                    backgroundColor:
                      selectedWeapon?.type === "torpedo"
                        ? `rgba(34,211,238,${pt.opacity * 0.6})`
                        : `rgba(255,140,0,${pt.opacity})`,
                    boxShadow:
                      selectedWeapon?.type === "torpedo"
                        ? `0 0 ${4 - i * 0.2}px rgba(34,211,238,${pt.opacity * 0.3})`
                        : `0 0 ${5 - i * 0.3}px rgba(255,100,0,${pt.opacity * 0.5})`,
                  }}
                />
              ))}
              <div
                className="absolute z-20"
                style={{
                  left: `${missileX}%`,
                  top: `${missileY}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      selectedWeapon?.type === "torpedo" ? "#22d3ee" : "#fff",
                    boxShadow:
                      selectedWeapon?.type === "torpedo"
                        ? "0 0 12px rgba(34,211,238,0.7), 0 0 24px rgba(34,211,238,0.3)"
                        : "0 0 10px rgba(255,165,0,0.8), 0 0 25px rgba(255,69,0,0.4)",
                  }}
                />
              </div>
              {/* weapon telemetry overlay */}
              <div className="absolute bottom-3 left-3 z-30 bg-slate-950/80 border border-cyan-800/30 rounded p-2 text-[7px] font-mono backdrop-blur-sm">
                <div className="text-cyan-400 font-orbitron text-[8px] mb-1 tracking-wider">
                  WEAPON TRACKING
                </div>
                <div className="space-y-0.5 text-slate-400">
                  <div>
                    {selectedWeapon?.name}{" "}
                    <span className="text-slate-600">
                      ({selectedWeapon?.designation})
                    </span>
                  </div>
                  <div>
                    Speed:{" "}
                    <span className="text-cyan-300">
                      {selectedWeapon?.speed_ms} m/s (Mach{" "}
                      {selectedWeapon?.speed_mach})
                    </span>
                  </div>
                  <div>
                    Remaining:{" "}
                    <span className="text-amber-300">
                      {physicsCalc
                        ? (
                            ((1 - missileProgress) * physicsCalc.dist_m) /
                            1000
                          ).toFixed(1)
                        : "—"}
                      km
                    </span>
                  </div>
                  <div>
                    ETA:{" "}
                    <span className="text-red-400">
                      {physicsCalc
                        ? formatTime(
                            Math.max(0, physicsCalc.time_s - firingElapsed),
                          )
                        : "—"}
                    </span>
                  </div>
                  <div>
                    Warhead:{" "}
                    <span className="text-orange-300">
                      {selectedWeapon?.warhead_kg}kg{" "}
                      {selectedWeapon?.warhead_type}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* EXPLOSION */}
          {phase === "impact" && (
            <>
              <div
                className="absolute inset-0 z-50 explosion-flash"
                style={{
                  backgroundColor:
                    selectedTarget && selectedTarget.depth_m < 0
                      ? "rgba(200,230,255,0.6)"
                      : "rgba(255,255,255,0.7)",
                }}
              />
              <div
                className="absolute z-40 explosion-fireball"
                style={{
                  left: `${targetPos.x}%`,
                  top: `${targetPos.y}%`,
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background:
                    selectedTarget && selectedTarget.depth_m < 0
                      ? "radial-gradient(circle, #fff 0%, #b2ebf2 25%, #4dd0e1 45%, #00838f 65%, transparent 100%)"
                      : "radial-gradient(circle, #fff 0%, #ffd700 20%, #ff8c00 40%, #ff4500 60%, #8b0000 80%, transparent 100%)",
                }}
              />
              {[0, 120, 250].map((delay, i) => (
                <div
                  key={i}
                  className="absolute z-30 explosion-shockwave rounded-full"
                  style={{
                    left: `${targetPos.x}%`,
                    top: `${targetPos.y}%`,
                    width: "12px",
                    height: "12px",
                    border: `${2 - i * 0.5}px solid ${selectedTarget && selectedTarget.depth_m < 0 ? `rgba(34,211,238,${0.5 - i * 0.12})` : `rgba(255,165,0,${0.5 - i * 0.12})`}`,
                    animationDelay: `${delay}ms`,
                  }}
                />
              ))}
              {debrisParticles.map((d, i) => (
                <div
                  key={i}
                  className="absolute z-40 rounded-sm explosion-debris"
                  style={
                    {
                      left: `${targetPos.x}%`,
                      top: `${targetPos.y}%`,
                      width: `${d.size}px`,
                      height: `${d.size}px`,
                      backgroundColor: d.color,
                      boxShadow: `0 0 3px ${d.color}`,
                      "--dx": `${d.dx}px`,
                      "--dy": `${d.dy}px`,
                      animationDelay: `${d.delay}ms`,
                      animationDuration: `${d.duration}ms`,
                    } as React.CSSProperties
                  }
                />
              ))}
              {/* impact analysis overlay */}
              <div className="absolute bottom-3 left-3 z-[51] bg-slate-950/85 border border-red-800/40 rounded p-2 text-[7px] font-mono backdrop-blur-sm">
                <div className="text-red-400 font-orbitron text-[8px] mb-1">
                  IMPACT ANALYSIS
                </div>
                <div className="space-y-0.5 text-slate-400">
                  <div>
                    Detonation: <span className="text-red-300">CONFIRMED</span>
                  </div>
                  <div>
                    Yield:{" "}
                    <span className="text-orange-300">
                      {selectedWeapon?.warhead_kg}kg{" "}
                      {selectedWeapon?.warhead_type}
                    </span>
                  </div>
                  <div>
                    Overpressure:{" "}
                    <span className="text-red-300">
                      {physicsCalc?.overpressure_kpa.toFixed(0)} kPa (peak)
                    </span>
                  </div>
                  <div>
                    Lethal Radius:{" "}
                    <span className="text-red-400">
                      {selectedWeapon?.blast_radius_lethal_m}m
                    </span>
                  </div>
                  <div>
                    Damage Radius:{" "}
                    <span className="text-amber-400">
                      {selectedWeapon?.blast_radius_damage_m}m
                    </span>
                  </div>
                  <div>
                    KE:{" "}
                    <span className="text-cyan-300">
                      {physicsCalc?.kinetic_energy_mj.toFixed(1)} MJ
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TARGET DESTROYED */}
          {phase === "destroyed" && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <div className="text-center target-destroyed-text">
                <div
                  className="text-3xl font-orbitron font-black tracking-widest"
                  style={{
                    color: "#ef4444",
                    textShadow: "0 0 30px rgba(239,68,68,0.5)",
                  }}
                >
                  TARGET NEUTRALIZED
                </div>
                <div className="text-[9px] font-mono text-red-400/40 mt-2">
                  {selectedTarget?.designation} — {selectedTarget?.type}
                </div>
                <div className="text-[8px] font-mono text-slate-500 mt-1">
                  {selectedWeapon?.name} ({selectedWeapon?.designation})
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT — AI + WEAPONS + PHYSICS ═══ */}
        <div className="col-span-4 flex flex-col gap-2 min-h-0 overflow-y-auto combat-scroll pr-1">
          {/* AI CLASSIFICATION */}
          <div className="border border-cyan-800/30 rounded-lg p-2.5 bg-slate-900/40 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Radar className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[9px] font-orbitron text-cyan-500 tracking-wider">
                AI DEEP LEARNING CLASSIFICATION
              </span>
            </div>
            {selectedTarget ? (
              <>
                <div className="flex items-center justify-between px-1 mb-2 py-1.5 bg-slate-950/50 rounded border border-slate-800/40">
                  <div className="flex flex-col gap-1">
                    {["SIG", "ACO", "MAG", "THM"].map((l, i) => (
                      <div
                        key={i}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center text-[4.5px] font-mono font-bold ${aiScanning ? "ai-node-scan border-cyan-400 bg-cyan-500/15 text-cyan-300" : "border-cyan-500/30 bg-cyan-500/10 text-cyan-500"}`}
                        style={{ animationDelay: `${i * 120}ms` }}
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/20 to-blue-500/15 mx-1" />
                  <div className="flex flex-col gap-[2px]">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-full border ${aiScanning ? "ai-node-scan border-blue-400 bg-blue-500/15" : "border-blue-500/20 bg-blue-500/5"}`}
                        style={{ animationDelay: `${500 + i * 80}ms` }}
                      />
                    ))}
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-500/15 to-purple-500/15 mx-1" />
                  <div className="flex flex-col gap-1">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-full border ${aiScanning ? "ai-node-scan border-purple-400 bg-purple-500/15" : "border-purple-500/20 bg-purple-500/5"}`}
                        style={{ animationDelay: `${1000 + i * 100}ms` }}
                      />
                    ))}
                  </div>
                  <div className="flex-1 h-px bg-gradient-to-r from-purple-500/15 to-red-500/15 mx-1" />
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[9px] font-bold ${aiScanning ? "ai-node-scan" : ""} ${selectedTarget.classification === "hostile" ? "border-red-400 bg-red-500/15 text-red-300" : selectedTarget.classification === "friendly" ? "border-green-400 bg-green-500/15 text-green-300" : "border-amber-400 bg-amber-500/15 text-amber-300"}`}
                    style={{ animationDelay: "1500ms" }}
                  >
                    {selectedTarget.classification === "hostile"
                      ? "!"
                      : selectedTarget.classification === "friendly"
                        ? "✓"
                        : "?"}
                  </div>
                </div>
                <div className="space-y-1 text-[8px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">VESSEL:</span>
                    <span className={classColor(selectedTarget.classification)}>
                      {selectedTarget.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">NATION:</span>
                    <span className="text-cyan-300">
                      {selectedTarget.nation}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DETECTED:</span>
                    <span className="text-cyan-300">
                      {selectedTarget.detected_by.toUpperCase()} (YOLOv8)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">CONFIDENCE:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-14 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                          style={{ width: `${selectedTarget.confidence}%` }}
                        />
                      </div>
                      <span className="text-emerald-400 text-[8px]">
                        {selectedTarget.confidence}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">THREAT:</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-orbitron tracking-wider text-[7px] border ${selectedTarget.threat_level === "CRITICAL" ? "bg-red-500/15 border-red-500/30 text-red-400" : selectedTarget.threat_level === "HIGH" ? "bg-orange-500/15 border-orange-500/30 text-orange-400" : selectedTarget.threat_level === "MEDIUM" ? "bg-amber-500/15 border-amber-500/30 text-amber-400" : "bg-green-500/15 border-green-500/30 text-green-400"}`}
                    >
                      {selectedTarget.threat_level}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">BRG / RNG:</span>
                    <span className="text-cyan-300">
                      {selectedTarget.bearing_deg}° / {selectedTarget.range_km}
                      km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DEPTH:</span>
                    <span className="text-cyan-300">
                      {selectedTarget.depth_m}m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">COURSE:</span>
                    <span className="text-cyan-300">
                      {selectedTarget.heading_deg}° @ {selectedTarget.speed_kts}
                      kts
                    </span>
                  </div>
                </div>
                {selectedTarget.classification === "hostile" && (
                  <div className="mt-1.5 p-1.5 rounded border border-red-500/20 bg-red-500/5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                    <span className="text-[7px] text-red-400/70 font-mono">
                      HOSTILE — ENGAGEMENT AUTHORIZED PER ROE ALPHA
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-3 text-slate-600 text-[9px] font-mono">
                SELECT A HOSTILE CONTACT
              </div>
            )}
          </div>

          {/* WEAPON SELECTION */}
          <div className="border border-cyan-800/30 rounded-lg p-2.5 bg-slate-900/40 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[9px] font-orbitron text-cyan-500 tracking-wider">
                WEAPON SELECTION
              </span>
            </div>
            <div className="space-y-1.5">
              {activeSub.weapons.map((w) => {
                const inRange = selectedTarget
                  ? w.range_km >= selectedTarget.range_km
                  : false;
                const isSelected = selectedWeapon?.id === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => {
                      if (phase === "scanning" && w.count > 0 && inRange)
                        setSelectedWeapon(w);
                    }}
                    disabled={phase !== "scanning" || w.count === 0 || !inRange}
                    className={`w-full text-left p-2 rounded border text-[8px] font-mono transition-all ${isSelected ? "border-amber-400/50 bg-amber-500/10" : "border-slate-800/40 bg-slate-900/20"} ${phase !== "scanning" || w.count === 0 || !inRange ? "opacity-30 cursor-not-allowed" : "hover:border-cyan-700/30 cursor-pointer"}`}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        className={`font-bold ${isSelected ? "text-amber-300" : "text-cyan-300"}`}
                      >
                        {w.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[6px] px-1 py-0.5 rounded border ${w.type === "torpedo" ? "border-cyan-500/20 text-cyan-400" : "border-amber-500/20 text-amber-400"}`}
                        >
                          {w.type.toUpperCase()}
                        </span>
                        <span
                          className={`text-[7px] font-bold ${w.count > 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          {w.count}/{w.maxCount}
                        </span>
                      </div>
                    </div>
                    <div className="text-[7px] text-slate-500 mt-0.5">
                      {w.designation} • {w.manufacturer}
                    </div>
                    <div className="text-[6px] text-slate-600 mt-0.5 flex flex-wrap gap-x-2">
                      <span>Range: {w.range_km}km</span>
                      <span>
                        Mach {w.speed_mach} ({w.speed_ms}m/s)
                      </span>
                      <span>Warhead: {w.warhead_kg}kg</span>
                    </div>
                    <div className="text-[6px] text-slate-600">
                      {w.guidance}
                    </div>
                    {selectedTarget && !inRange && w.count > 0 && (
                      <div className="text-[6px] text-red-400/60 mt-0.5">
                        OUT OF RANGE (target {selectedTarget.range_km}km &gt;
                        weapon {w.range_km}km)
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FIRE CONTROL SOLUTION */}
          {physicsCalc && selectedTarget && selectedWeapon && (
            <div className="border border-cyan-800/30 rounded-lg p-2.5 bg-slate-900/40 flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[9px] font-orbitron text-cyan-500 tracking-wider">
                  FIRE CONTROL SOLUTION
                </span>
              </div>
              <div className="space-y-1 text-[8px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">WEAPON:</span>
                  <span className="text-cyan-300">{selectedWeapon.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TARGET:</span>
                  <span className="text-red-400">
                    {selectedTarget.designation}
                  </span>
                </div>
                <div className="h-px bg-slate-800/40 my-0.5" />
                <div className="flex justify-between">
                  <span className="text-slate-500">RANGE:</span>
                  <span className="text-amber-300">
                    {selectedTarget.range_km}km ({physicsCalc.dist_m.toFixed(0)}
                    m)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">VELOCITY:</span>
                  <span className="text-cyan-300">
                    {selectedWeapon.speed_ms} m/s (Mach{" "}
                    {selectedWeapon.speed_mach})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TIME TO IMPACT:</span>
                  <span className="text-red-300 font-bold">
                    {formatTime(physicsCalc.time_s)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">KINETIC ENERGY:</span>
                  <span className="text-orange-300">
                    {physicsCalc.kinetic_energy_mj.toFixed(2)} MJ
                  </span>
                </div>
                <div className="h-px bg-slate-800/40 my-0.5" />
                <div className="flex justify-between">
                  <span className="text-slate-500">WARHEAD:</span>
                  <span className="text-orange-300">
                    {selectedWeapon.warhead_kg}kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">LETHAL RADIUS:</span>
                  <span className="text-red-400">
                    {selectedWeapon.blast_radius_lethal_m}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DAMAGE RADIUS:</span>
                  <span className="text-amber-400">
                    {selectedWeapon.blast_radius_damage_m}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">OVERPRESSURE:</span>
                  <span className="text-red-300">
                    {physicsCalc.overpressure_kpa.toFixed(0)} kPa
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GUIDANCE:</span>
                  <span className="text-cyan-300">
                    {selectedWeapon.guidance}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SHIP SYSTEMS */}
          <div className="border border-cyan-800/30 rounded-lg p-2.5 bg-slate-900/40 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[9px] font-orbitron text-cyan-500 tracking-wider">
                SHIP SYSTEMS
              </span>
            </div>
            <div className="space-y-1.5 text-[8px] font-mono">
              {[
                {
                  name: "REACTOR",
                  status: "ONLINE",
                  pct: 94,
                  color: "#10b981",
                },
                {
                  name: "SONAR ARRAY",
                  status: "ACTIVE",
                  pct: 100,
                  color: "#22d3ee",
                },
                {
                  name: "FIRE CONTROL",
                  status: phase === "armed" ? "WEAPONS FREE" : "STANDBY",
                  pct: 100,
                  color: phase === "armed" ? "#ef4444" : "#22d3ee",
                },
                {
                  name: "ECM/ECCM",
                  status: "ACTIVE",
                  pct: 88,
                  color: "#f59e0b",
                },
                {
                  name: "COMMS (ULF)",
                  status: "SILENT",
                  pct: 100,
                  color: "#22d3ee",
                },
                {
                  name: "LIFE SUPPORT",
                  status: "NOMINAL",
                  pct: 97,
                  color: "#22c55e",
                },
              ].map((sys, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-slate-500">{sys.name}</span>
                    <span
                      style={{ color: sys.color }}
                      className={
                        sys.name === "FIRE CONTROL" && phase === "armed"
                          ? "animate-pulse font-bold"
                          : ""
                      }
                    >
                      {sys.status}
                    </span>
                  </div>
                  <div className="w-full h-[3px] bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${sys.pct}%`,
                        backgroundColor: sys.color,
                        opacity: 0.5,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COMBAT LOG */}
          {weaponLog.length > 0 && (
            <div className="border border-cyan-800/30 rounded-lg p-2.5 bg-slate-900/40 flex-shrink-0">
              <div className="text-[9px] font-orbitron text-cyan-500 tracking-wider mb-1">
                COMBAT LOG
              </div>
              <div className="space-y-0.5 text-[7px] font-mono max-h-16 overflow-y-auto combat-scroll">
                {weaponLog.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.startsWith("[FIRE]")
                        ? "text-red-400"
                        : log.startsWith("[ARM]")
                          ? "text-amber-400"
                          : "text-cyan-400/60"
                    }
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════ FIRE CONTROL BAR ════ */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-cyan-800/30 backdrop-blur-md z-40">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[9px] font-mono">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${phase === "scanning" ? "bg-cyan-400 animate-pulse" : phase === "locked" || phase === "armed" ? "bg-red-400 animate-pulse" : phase === "firing" || phase === "impact" ? "bg-orange-400 animate-pulse" : "bg-green-400"}`}
              />
              <span className="text-cyan-300 font-orbitron tracking-wider text-[10px]">
                {phase === "scanning"
                  ? "SCANNING"
                  : phase === "locked"
                    ? "LOCKED"
                    : phase === "armed"
                      ? "WEAPONS FREE"
                      : phase === "countdown"
                        ? `T-${countdown}`
                        : phase === "firing"
                          ? selectedWeapon?.type === "torpedo"
                            ? "TORPEDO RUNNING"
                            : "MISSILE IN FLIGHT"
                          : phase === "impact"
                            ? "IMPACT"
                            : "NEUTRALIZED"}
              </span>
            </div>
            {selectedTarget && (
              <span className="text-slate-500">
                {selectedTarget.designation} • {selectedTarget.bearing_deg}° •{" "}
                {selectedTarget.range_km}km
              </span>
            )}
            {selectedWeapon && (
              <span className="text-amber-400/50">| {selectedWeapon.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={lockTarget}
              disabled={
                !selectedTarget ||
                !selectedWeapon ||
                selectedTarget.classification === "friendly" ||
                phase !== "scanning"
              }
              className={`px-4 py-1.5 rounded-lg font-orbitron text-[10px] tracking-wider transition-all flex items-center gap-1.5 ${selectedTarget && selectedWeapon && selectedTarget.classification !== "friendly" && phase === "scanning" ? "bg-cyan-600/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 cursor-pointer" : "bg-slate-800/40 text-slate-600 border border-slate-700/20 cursor-not-allowed"}`}
            >
              <Crosshair className="w-3.5 h-3.5" /> LOCK
            </button>
            <button
              onClick={armWeapons}
              disabled={phase !== "locked"}
              className={`px-4 py-1.5 rounded-lg font-orbitron text-[10px] tracking-wider transition-all flex items-center gap-1.5 ${phase === "locked" ? "bg-amber-600/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer" : "bg-slate-800/40 text-slate-600 border border-slate-700/20 cursor-not-allowed"}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> ARM
            </button>
            <button
              onClick={fire}
              disabled={phase !== "armed"}
              className={`relative px-7 py-2.5 rounded-xl font-orbitron text-sm font-black tracking-[0.12em] transition-all ${phase === "armed" ? "bg-gradient-to-b from-red-600 to-red-800 text-white border-2 border-red-400/70 shadow-xl shadow-red-500/30 hover:from-red-500 hover:to-red-700 active:scale-95 cursor-pointer fire-btn-pulse" : "bg-slate-800/40 text-slate-600 border-2 border-slate-700/20 cursor-not-allowed"}`}
            >
              {phase === "armed" && (
                <div className="absolute inset-0 rounded-xl border-2 border-red-400/20 animate-ping" />
              )}
              <span className="flex items-center gap-2 relative z-10">
                <Zap className="w-4 h-4" /> FIRE
              </span>
            </button>
          </div>
          <div className="text-[8px] font-mono text-slate-500 text-right min-w-[100px]">
            {activeSub.weapons.map((w) => (
              <div key={w.id}>
                {w.name}:{" "}
                <span
                  className={w.count > 0 ? "text-green-400" : "text-red-400"}
                >
                  {w.count}/{w.maxCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .combat-shake {
          animation: combatShake 0.6s ease-out;
        }
        @keyframes combatShake {
          0%,
          100% {
            transform: translate(0, 0) rotate(0);
          }
          10% {
            transform: translate(-8px, 4px) rotate(-0.5deg);
          }
          20% {
            transform: translate(6px, -6px) rotate(0.4deg);
          }
          30% {
            transform: translate(-5px, 3px) rotate(-0.3deg);
          }
          40% {
            transform: translate(4px, -3px) rotate(0.2deg);
          }
          50% {
            transform: translate(-2px, 2px);
          }
        }
        .lock-on-anim {
          animation: lockSnap 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes lockSnap {
          0% {
            transform: translate(-50%, -50%) scale(2.5) rotate(60deg);
            opacity: 0;
          }
          60% {
            transform: translate(-50%, -50%) scale(0.9) rotate(-3deg);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
          }
        }
        .lock-rotate {
          animation: lockSpin 4s linear infinite;
        }
        @keyframes lockSpin {
          from {
            transform: rotate(0);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .countdown-pulse {
          animation: cntPulse 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes cntPulse {
          0% {
            transform: scale(2.5);
            opacity: 0;
          }
          50% {
            transform: scale(0.9);
            opacity: 1;
          }
          100% {
            transform: scale(1);
          }
        }
        .explosion-flash {
          animation: eFlash 300ms ease-out forwards;
        }
        @keyframes eFlash {
          0% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
          }
        }
        .explosion-fireball {
          transform: translate(-50%, -50%) scale(0.5);
          animation: eFire 2.5s ease-out forwards;
        }
        @keyframes eFire {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 1;
          }
          20% {
            transform: translate(-50%, -50%) scale(8);
            opacity: 0.9;
          }
          50% {
            transform: translate(-50%, -50%) scale(14);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(20);
            opacity: 0;
          }
        }
        .explosion-shockwave {
          transform: translate(-50%, -50%) scale(0.5);
          animation: eShock 1.8s ease-out forwards;
        }
        @keyframes eShock {
          0% {
            transform: translate(-50%, -50%) scale(0.5);
            opacity: 0.7;
          }
          100% {
            transform: translate(-50%, -50%) scale(28);
            opacity: 0;
          }
        }
        .explosion-debris {
          animation: eDebris var(--duration, 800ms) ease-out var(--delay, 0ms)
            forwards;
          transform: translate(-50%, -50%);
        }
        @keyframes eDebris {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) rotate(0deg)
              scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%)
              translate(var(--dx, 80px), var(--dy, 80px)) rotate(540deg)
              scale(0);
            opacity: 0;
          }
        }
        .target-destroyed-text {
          animation: destroyReveal 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes destroyReveal {
          0% {
            transform: scale(2.5);
            opacity: 0;
            filter: blur(8px);
          }
          50% {
            transform: scale(0.95);
            opacity: 1;
            filter: blur(0);
          }
          100% {
            transform: scale(1);
          }
        }
        .fire-btn-pulse {
          animation: fPulse 1.3s ease-in-out infinite;
        }
        @keyframes fPulse {
          0%,
          100% {
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.25);
          }
          50% {
            box-shadow: 0 0 35px rgba(239, 68, 68, 0.5);
          }
        }
        .ai-node-scan {
          animation: aiPulse 0.4s ease-in-out forwards;
        }
        @keyframes aiPulse {
          0% {
            box-shadow: 0 0 0 rgba(6, 182, 212, 0);
            opacity: 0.3;
          }
          50% {
            box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
            opacity: 1;
          }
          100% {
            box-shadow: 0 0 3px rgba(6, 182, 212, 0.2);
            opacity: 1;
          }
        }
        .combat-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .combat-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .combat-scroll::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.12);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
