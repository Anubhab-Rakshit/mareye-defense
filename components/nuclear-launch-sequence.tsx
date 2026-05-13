"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Shield,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  Radiation,
  Timer,
  XCircle,
  CheckCircle2,
  Fingerprint,
  Eye,
  Radio,
} from "lucide-react";
import { useSonarAudio } from "./sonar-audio-system";

type LaunchPhase =
  | "standby"
  | "authorization-request"
  | "biometric-scan"
  | "launch-code"
  | "dual-key"
  | "arming"
  | "countdown"
  | "launch"
  | "aborted";

interface LaunchLog {
  time: string;
  message: string;
  level: "info" | "warning" | "critical" | "success" | "error";
}

export function NuclearLaunchSequence() {
  const [phase, setPhase] = useState<LaunchPhase>("standby");
  const [logs, setLogs] = useState<LaunchLog[]>([]);
  const [countdown, setCountdown] = useState(10);
  const [launchCode, setLaunchCode] = useState("");
  const [key1Turned, setKey1Turned] = useState(false);
  const [key2Turned, setKey2Turned] = useState(false);
  const [bioProgress, setBioProgress] = useState(0);
  const [scanLine, setScanLine] = useState(0);
  const [armed, setArmed] = useState(false);
  const [warheadStatus, setWarheadStatus] = useState<string[]>([]);
  const [systemChecks, setSystemChecks] = useState<
    { name: string; status: "pending" | "checking" | "pass" | "fail" }[]
  >([]);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const audio = useSonarAudio();

  const CORRECT_CODE = "AGNI-5-ALPHA";

  const addLog = useCallback(
    (message: string, level: LaunchLog["level"] = "info") => {
      const time = new Date().toLocaleTimeString("en-IN", {
        hour12: false,
        timeZone: "Asia/Kolkata",
      });
      setLogs((prev) => [...prev, { time, message, level }]);
    },
    [],
  );

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // ═══ PHASE 1: INITIATE ═══
  const initiateSequence = useCallback(() => {
    try {
      audio.playAlarm("battle");
    } catch {}
    setPhase("authorization-request");
    setLogs([]);
    addLog("NUCLEAR LAUNCH SEQUENCE INITIATED", "critical");
    addLog("Requesting CDS authorization...", "warning");
    addLog("INS Arihant SSBN — K-4 SLBM System Online", "info");
    addLog("Strategic Forces Command — AUTHENTICATED", "info");
    setFlashRed(true);
    setTimeout(() => setFlashRed(false), 2000);

    // Auto-advance after drama
    setTimeout(() => {
      addLog("CDS AUTHORIZATION: GRANTED", "success");
      addLog("PMO Nuclear Command Authority: CONFIRMED", "critical");
      addLog("Proceeding to biometric verification...", "warning");
      setPhase("biometric-scan");
    }, 3000);
  }, [addLog, audio]);

  // ═══ PHASE 2: BIOMETRIC SCAN ═══
  useEffect(() => {
    if (phase !== "biometric-scan") return;
    setBioProgress(0);
    setScanLine(0);
    audio.playContactDetected();

    const scanInterval = setInterval(() => {
      setScanLine((prev) => (prev + 2) % 100);
    }, 30);

    const progressInterval = setInterval(() => {
      setBioProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(scanInterval);
          addLog("Retinal scan: VERIFIED — Commander Aarav Sharma", "success");
          addLog("Fingerprint: MATCHED — Authorization Level OMEGA", "success");
          addLog("Voice signature: CONFIRMED", "success");
          audio.playContactDetected();
          setTimeout(() => {
            addLog("Biometric verification COMPLETE", "success");
            addLog("Enter launch authorization code...", "warning");
            setPhase("launch-code");
          }, 1000);
          return 100;
        }
        if (prev === 30) addLog("Scanning retinal pattern...", "info");
        if (prev === 55) addLog("Analyzing fingerprint minutiae...", "info");
        if (prev === 80) addLog("Verifying voice signature...", "info");
        return prev + 1;
      });
    }, 50);

    return () => {
      clearInterval(scanInterval);
      clearInterval(progressInterval);
    };
  }, [phase, addLog, audio]);

  // ═══ PHASE 3: LAUNCH CODE ═══
  const submitLaunchCode = useCallback(() => {
    if (launchCode.toUpperCase() === CORRECT_CODE) {
      addLog(`Launch code "${launchCode.toUpperCase()}" — ACCEPTED`, "success");
      audio.playContactDetected();
      setTimeout(() => {
        addLog("Dual-key authorization required", "warning");
        addLog("Both officers must turn keys simultaneously", "critical");
        setPhase("dual-key");
      }, 1000);
    } else {
      addLog(`Launch code "${launchCode}" — REJECTED`, "error");
      audio.playAlarm("general");
      setLaunchCode("");
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 500);
    }
  }, [launchCode, addLog, audio]);

  // ═══ PHASE 4: DUAL KEY ═══
  useEffect(() => {
    if (key1Turned && key2Turned && phase === "dual-key") {
      addLog("KEY ALPHA: TURNED — Weapons Officer", "success");
      addLog("KEY BRAVO: TURNED — Executive Officer", "success");
      addLog("Dual authorization VERIFIED", "critical");
      audio.playContactDetected();
      setTimeout(() => {
        setPhase("arming");
        addLog("WARHEAD ARMING SEQUENCE INITIATED", "critical");
      }, 1500);
    }
  }, [key1Turned, key2Turned, phase, addLog, audio]);

  // ═══ PHASE 5: ARMING ═══
  useEffect(() => {
    if (phase !== "arming") return;
    audio.playAlarm("battle");

    const checks = [
      { name: "K-4 SLBM Guidance System", status: "pending" as const },
      { name: "Navigation Computer — INS", status: "pending" as const },
      { name: "Warhead Fusing Mechanism", status: "pending" as const },
      { name: "Propulsion — Solid Fuel Stage 1", status: "pending" as const },
      { name: "Propulsion — Liquid Fuel Stage 2", status: "pending" as const },
      { name: "Telemetry & Tracking", status: "pending" as const },
      { name: "MIRV Payload Separation", status: "pending" as const },
      { name: "Self-Destruct Failsafe", status: "pending" as const },
    ];
    setSystemChecks(checks);

    let idx = 0;
    const checkInterval = setInterval(() => {
      if (idx >= checks.length) {
        clearInterval(checkInterval);
        addLog("ALL SYSTEMS CHECK: PASS", "success");
        addLog("WARHEAD STATUS: ARMED", "critical");
        setArmed(true);
        audio.playMissileAlert();

        // Start warhead status messages
        const statuses = [
          "Warhead yield: 200 KT",
          "Target: PRE-SET COORDINATES",
          "Range: 3,500 km — WITHIN ENVELOPE",
          "CEP: 40 meters",
          "Flight time: 12 minutes",
          "MIRV: 3 independent warheads",
        ];
        setWarheadStatus(statuses);

        setTimeout(() => {
          addLog("COUNTDOWN INITIATED — T-10 SECONDS", "critical");
          setPhase("countdown");
        }, 2000);
        return;
      }

      setSystemChecks((prev) =>
        prev.map((c, i) =>
          i === idx
            ? { ...c, status: "checking" }
            : i === idx - 1
              ? { ...c, status: "pass" }
              : c,
        ),
      );
      addLog(`Checking: ${checks[idx].name}...`, "info");

      if (idx > 0) {
        setSystemChecks((prev) =>
          prev.map((c, i) => (i === idx - 1 ? { ...c, status: "pass" } : c)),
        );
      }

      idx++;
    }, 600);

    return () => clearInterval(checkInterval);
  }, [phase, addLog, audio]);

  // ═══ PHASE 6: COUNTDOWN ═══
  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(10);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setPhase("launch");
          addLog("██ MISSILE LAUNCHED ██", "critical");
          audio.playTorpedoLaunch();
          setShakeScreen(true);
          setFlashRed(true);
          setTimeout(() => {
            setShakeScreen(false);
            setFlashRed(false);
          }, 3000);
          return 0;
        }
        if (prev <= 5) audio.playSonarPing();
        addLog(`T-${prev - 1}...`, "warning");
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [phase, addLog, audio]);

  // ═══ ABORT ═══
  const abortLaunch = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    audio.playAlarm("collision");
    setPhase("aborted");
    addLog("██ LAUNCH ABORTED ██", "error");
    addLog("Warhead safing in progress...", "warning");
    addLog("All systems returning to standby", "info");
    setArmed(false);
    setKey1Turned(false);
    setKey2Turned(false);
    setLaunchCode("");
    setShakeScreen(true);
    setTimeout(() => setShakeScreen(false), 500);
  }, [addLog, audio]);

  // ═══ RESET ═══
  const resetSequence = useCallback(() => {
    audio.stopAll();
    setPhase("standby");
    setLogs([]);
    setCountdown(10);
    setLaunchCode("");
    setKey1Turned(false);
    setKey2Turned(false);
    setBioProgress(0);
    setArmed(false);
    setWarheadStatus([]);
    setSystemChecks([]);
  }, [audio]);

  const logColor = (level: LaunchLog["level"]) => {
    switch (level) {
      case "critical":
        return "text-red-400";
      case "warning":
        return "text-amber-400";
      case "success":
        return "text-emerald-400";
      case "error":
        return "text-red-500";
      default:
        return "text-cyan-400/70";
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 pt-[128px] pb-20 px-4 relative overflow-hidden transition-all
      ${shakeScreen ? "animate-pulse" : ""} ${flashRed ? "bg-red-950/30" : ""}`}
    >
      {/* Background radiation lines */}
      <div className="absolute inset-0 opacity-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-px bg-red-500"
            style={{
              top: `${5 + i * 5}%`,
              left: 0,
              right: 0,
              animation: `pulse ${2 + i * 0.3}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* DEFCON indicator */}
      <div className="fixed top-[128px] right-4 z-40">
        <div
          className={`px-4 py-2 rounded-lg border-2 font-orbitron text-sm tracking-wider ${
            phase === "countdown" || phase === "launch"
              ? "border-red-500 bg-red-500/20 text-red-400 animate-pulse"
              : phase === "arming" || phase === "dual-key"
                ? "border-orange-500 bg-orange-500/20 text-orange-400"
                : phase === "aborted"
                  ? "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                  : armed
                    ? "border-red-500 bg-red-500/20 text-red-400"
                    : "border-cyan-500/30 bg-slate-900/80 text-cyan-400"
          }`}
        >
          DEFCON{" "}
          {phase === "countdown" || phase === "launch"
            ? "1"
            : phase === "arming"
              ? "2"
              : phase === "dual-key" || phase === "launch-code"
                ? "3"
                : "5"}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-2">
            <Radiation className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-orbitron font-black text-red-500 tracking-wider">
              NUCLEAR LAUNCH AUTHORIZATION
            </h1>
            <Radiation className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-xs font-space-mono text-red-400/50 tracking-widest">
            INS ARIHANT SSBN // K-4 SUBMARINE-LAUNCHED BALLISTIC MISSILE //
            STRATEGIC FORCES COMMAND
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ═══ LEFT: CONTROL PANEL ═══ */}
          <div className="lg:col-span-2 space-y-6">
            {/* STANDBY */}
            {phase === "standby" && (
              <div className="bg-slate-900/80 border border-red-500/20 rounded-xl p-8 text-center">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full border-4 border-red-500/30 flex items-center justify-center bg-red-500/5">
                  <Radiation className="w-12 h-12 text-red-500/50" />
                </div>
                <h2 className="text-xl font-orbitron text-red-400 mb-2">
                  SYSTEM STANDBY
                </h2>
                <p className="text-sm font-space-mono text-slate-400 mb-6">
                  K-4 SLBM Launch Authorization System — Requires CDS
                  Authorization
                </p>
                <button
                  onClick={initiateSequence}
                  className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-orbitron text-sm tracking-wider rounded-lg 
                    border-2 border-red-400 shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all
                    hover:scale-105 active:scale-95"
                >
                  INITIATE LAUNCH SEQUENCE
                </button>
                <p className="text-[9px] font-space-mono text-red-400/30 mt-4">
                  This is a simulation. No actual weapons systems are connected.
                </p>
              </div>
            )}

            {/* ABORTED */}
            {phase === "aborted" && (
              <div className="bg-slate-900/80 border border-yellow-500/30 rounded-xl p-8 text-center">
                <XCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-xl font-orbitron text-yellow-400 mb-2">
                  LAUNCH ABORTED
                </h2>
                <p className="text-sm font-space-mono text-slate-400 mb-6">
                  All systems safed. Warhead returned to standby configuration.
                </p>
                <button
                  onClick={resetSequence}
                  className="px-6 py-2 border border-cyan-500/30 text-cyan-400 rounded-lg font-orbitron text-xs hover:bg-cyan-500/10 transition-all"
                >
                  RETURN TO STANDBY
                </button>
              </div>
            )}

            {/* LAUNCH COMPLETE */}
            {phase === "launch" && (
              <div className="bg-red-950/30 border-2 border-red-500 rounded-xl p-8 text-center animate-pulse">
                <div className="text-6xl mb-4">🚀</div>
                <h2 className="text-3xl font-orbitron text-red-400 mb-2 font-black">
                  MISSILE LAUNCHED
                </h2>
                <p className="text-sm font-space-mono text-red-300 mb-2">
                  K-4 SLBM — Trajectory nominal — All stages ignited
                </p>
                <p className="text-xs font-space-mono text-red-400/60 mb-6">
                  Impact ETA: 12 minutes — MIRV separation at T+480s
                </p>
                <button
                  onClick={resetSequence}
                  className="px-6 py-2 border border-cyan-500/30 text-cyan-400 rounded-lg font-orbitron text-xs hover:bg-cyan-500/10 transition-all"
                >
                  RESET SIMULATION
                </button>
              </div>
            )}

            {/* BIOMETRIC SCAN */}
            {phase === "biometric-scan" && (
              <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Fingerprint className="w-5 h-5 text-amber-400" />
                  <h2 className="text-sm font-orbitron text-amber-400 tracking-wider">
                    BIOMETRIC VERIFICATION
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Retinal Scan */}
                  <div className="relative bg-slate-800/50 rounded-lg p-4 border border-amber-500/20 overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-orbitron text-amber-400">
                        RETINAL SCAN
                      </span>
                    </div>
                    <div className="w-32 h-32 mx-auto rounded-full border-2 border-amber-500/30 relative overflow-hidden bg-slate-900">
                      {/* Iris pattern */}
                      <div className="absolute inset-4 rounded-full border border-amber-500/40" />
                      <div className="absolute inset-8 rounded-full border border-amber-500/30" />
                      <div className="absolute inset-12 rounded-full bg-amber-500/20" />
                      {/* Scanning line */}
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-amber-400/70 transition-all duration-75"
                        style={{ top: `${scanLine}%` }}
                      />
                    </div>
                    <div className="mt-2 text-center text-[9px] font-space-mono text-amber-400/50">
                      {bioProgress < 35 ? "SCANNING..." : "MATCHED"}
                    </div>
                  </div>

                  {/* Fingerprint */}
                  <div className="relative bg-slate-800/50 rounded-lg p-4 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Fingerprint className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-orbitron text-amber-400">
                        FINGERPRINT
                      </span>
                    </div>
                    <div className="w-32 h-32 mx-auto rounded-lg border-2 border-amber-500/30 relative overflow-hidden bg-slate-900 flex items-center justify-center">
                      <Fingerprint
                        className={`w-20 h-20 transition-colors duration-500 ${
                          bioProgress > 60
                            ? "text-emerald-400"
                            : "text-amber-400/30"
                        }`}
                      />
                      {bioProgress <= 60 && (
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/10 to-transparent animate-pulse" />
                      )}
                    </div>
                    <div className="mt-2 text-center text-[9px] font-space-mono text-amber-400/50">
                      {bioProgress < 60
                        ? "ANALYZING..."
                        : bioProgress < 85
                          ? "COMPARING..."
                          : "VERIFIED"}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[9px] font-space-mono text-amber-400/50 mb-1">
                    <span>VERIFICATION PROGRESS</span>
                    <span>{bioProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-200"
                      style={{ width: `${bioProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* LAUNCH CODE ENTRY */}
            {phase === "launch-code" && (
              <div className="bg-slate-900/80 border border-red-500/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-red-400" />
                  <h2 className="text-sm font-orbitron text-red-400 tracking-wider">
                    LAUNCH AUTHORIZATION CODE
                  </h2>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-6 border border-red-500/20">
                  <p className="text-xs font-space-mono text-slate-400 mb-4">
                    Enter the nuclear launch authorization code provided by
                    Strategic Forces Command.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={launchCode}
                      onChange={(e) =>
                        setLaunchCode(e.target.value.toUpperCase())
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitLaunchCode();
                      }}
                      placeholder="ENTER CODE..."
                      className="flex-1 bg-slate-900 border-2 border-red-500/30 rounded-lg px-4 py-3 font-orbitron text-red-400 text-lg tracking-[0.3em] 
                        placeholder:text-red-400/20 focus:outline-none focus:border-red-500 transition-colors"
                      autoFocus
                    />
                    <button
                      onClick={submitLaunchCode}
                      className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-orbitron text-sm rounded-lg border border-red-400 transition-all hover:scale-105"
                    >
                      VERIFY
                    </button>
                  </div>
                  <p className="text-[9px] font-space-mono text-red-400/30 mt-3">
                    HINT: The code is AGNI-5-ALPHA
                  </p>
                </div>
              </div>
            )}

            {/* DUAL KEY TURN */}
            {phase === "dual-key" && (
              <div className="bg-slate-900/80 border border-orange-500/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-5 h-5 text-orange-400" />
                  <h2 className="text-sm font-orbitron text-orange-400 tracking-wider">
                    DUAL-KEY AUTHORIZATION
                  </h2>
                </div>
                <p className="text-xs font-space-mono text-slate-400 mb-6">
                  Both keys must be turned simultaneously. Click both key
                  switches below.
                </p>
                <div className="grid grid-cols-2 gap-8">
                  {/* Key 1 */}
                  <div className="text-center">
                    <div
                      className={`w-32 h-32 mx-auto rounded-full border-4 flex items-center justify-center cursor-pointer transition-all duration-500 hover:scale-110 active:scale-95
                      ${key1Turned ? "border-emerald-500 bg-emerald-500/20 shadow-lg shadow-emerald-500/30" : "border-orange-500/30 bg-slate-800/50 hover:border-orange-400"}`}
                      onClick={() => {
                        setKey1Turned(true);
                        audio.playContactDetected();
                      }}
                    >
                      <Key
                        className={`w-12 h-12 transition-all duration-500 ${key1Turned ? "text-emerald-400 rotate-90" : "text-orange-400/50"}`}
                      />
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-orbitron text-orange-400">
                        KEY ALPHA
                      </p>
                      <p className="text-[9px] font-space-mono text-slate-500">
                        Weapons Officer
                      </p>
                      <span
                        className={`text-[9px] font-orbitron ${key1Turned ? "text-emerald-400" : "text-orange-400/50"}`}
                      >
                        {key1Turned ? "TURNED" : "STANDBY"}
                      </span>
                    </div>
                  </div>

                  {/* Key 2 */}
                  <div className="text-center">
                    <div
                      className={`w-32 h-32 mx-auto rounded-full border-4 flex items-center justify-center cursor-pointer transition-all duration-500 hover:scale-110 active:scale-95
                      ${key2Turned ? "border-emerald-500 bg-emerald-500/20 shadow-lg shadow-emerald-500/30" : "border-orange-500/30 bg-slate-800/50 hover:border-orange-400"}`}
                      onClick={() => {
                        setKey2Turned(true);
                        audio.playContactDetected();
                      }}
                    >
                      <Key
                        className={`w-12 h-12 transition-all duration-500 ${key2Turned ? "text-emerald-400 rotate-90" : "text-orange-400/50"}`}
                      />
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-orbitron text-orange-400">
                        KEY BRAVO
                      </p>
                      <p className="text-[9px] font-space-mono text-slate-500">
                        Executive Officer
                      </p>
                      <span
                        className={`text-[9px] font-orbitron ${key2Turned ? "text-emerald-400" : "text-orange-400/50"}`}
                      >
                        {key2Turned ? "TURNED" : "STANDBY"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ARMING / SYSTEM CHECKS */}
            {phase === "arming" && (
              <div className="bg-slate-900/80 border border-red-500/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                  <h2 className="text-sm font-orbitron text-red-400 tracking-wider">
                    WARHEAD ARMING — SYSTEM CHECKS
                  </h2>
                </div>
                <div className="space-y-2">
                  {systemChecks.map((check, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-slate-800/30 rounded-lg px-4 py-2 border border-slate-700/30"
                    >
                      {check.status === "pending" && (
                        <div className="w-4 h-4 rounded-full border border-slate-600" />
                      )}
                      {check.status === "checking" && (
                        <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                      )}
                      {check.status === "pass" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      {check.status === "fail" && (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span
                        className={`text-xs font-space-mono ${
                          check.status === "pass"
                            ? "text-emerald-400"
                            : check.status === "checking"
                              ? "text-amber-400"
                              : check.status === "fail"
                                ? "text-red-400"
                                : "text-slate-500"
                        }`}
                      >
                        {check.name}
                      </span>
                      <span
                        className={`ml-auto text-[9px] font-orbitron ${
                          check.status === "pass"
                            ? "text-emerald-400"
                            : check.status === "checking"
                              ? "text-amber-400 animate-pulse"
                              : "text-slate-600"
                        }`}
                      >
                        {check.status === "pass"
                          ? "PASS"
                          : check.status === "checking"
                            ? "CHECKING..."
                            : check.status === "fail"
                              ? "FAIL"
                              : "PENDING"}
                      </span>
                    </div>
                  ))}
                </div>

                {warheadStatus.length > 0 && (
                  <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <p className="text-[10px] font-orbitron text-red-400 mb-2">
                      WARHEAD PARAMETERS
                    </p>
                    {warheadStatus.map((s, i) => (
                      <p
                        key={i}
                        className="text-[10px] font-space-mono text-red-300/70"
                      >
                        {s}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COUNTDOWN */}
            {phase === "countdown" && (
              <div className="bg-red-950/20 border-2 border-red-500 rounded-xl p-8 text-center">
                <h2 className="text-sm font-orbitron text-red-400 tracking-wider mb-4 animate-pulse">
                  ⚠ LAUNCH COUNTDOWN ACTIVE ⚠
                </h2>
                <div className="text-8xl font-orbitron font-black text-red-500 mb-6 animate-pulse">
                  T-{countdown}
                </div>
                <p className="text-xs font-space-mono text-red-300/60 mb-6">
                  K-4 SLBM — All systems armed — Launch in progress
                </p>
                <button
                  onClick={abortLaunch}
                  className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-orbitron text-lg tracking-wider rounded-lg 
                    border-2 border-yellow-400 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all
                    hover:scale-110 active:scale-95 animate-bounce"
                >
                  ⛔ ABORT LAUNCH ⛔
                </button>
              </div>
            )}
          </div>

          {/* ═══ RIGHT: STATUS LOG ═══ */}
          <div className="space-y-4">
            {/* Status panel */}
            <div className="bg-slate-900/80 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-4 h-4 text-red-400" />
                <span className="text-xs font-orbitron text-red-400">
                  SYSTEM STATUS
                </span>
              </div>
              <div className="space-y-2 text-[10px] font-space-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Phase:</span>
                  <span
                    className={`font-orbitron ${
                      phase === "countdown" || phase === "launch"
                        ? "text-red-400 animate-pulse"
                        : phase === "aborted"
                          ? "text-yellow-400"
                          : "text-cyan-400"
                    }`}
                  >
                    {phase.toUpperCase().replace("-", " ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Warhead:</span>
                  <span
                    className={
                      armed ? "text-red-400 animate-pulse" : "text-emerald-400"
                    }
                  >
                    {armed ? "ARMED" : "SAFE"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Missile:</span>
                  <span className="text-cyan-400">K-4 SLBM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Platform:</span>
                  <span className="text-cyan-400">INS Arihant</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Authorization:</span>
                  <span
                    className={
                      phase === "standby"
                        ? "text-slate-600"
                        : "text-emerald-400"
                    }
                  >
                    {phase === "standby" ? "NONE" : "SFC/CDS"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action log */}
            <div className="bg-slate-900/80 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Timer className="w-4 h-4 text-red-400" />
                <span className="text-xs font-orbitron text-red-400">
                  ACTION LOG
                </span>
              </div>
              <div
                ref={logContainerRef}
                className="h-72 overflow-y-auto space-y-1 font-space-mono text-[9px] launch-log-scroll"
              >
                {logs.length === 0 && (
                  <p className="text-slate-600 text-center py-8">
                    Awaiting launch sequence initiation...
                  </p>
                )}
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-slate-600 flex-shrink-0">
                      [{log.time}]
                    </span>
                    <span className={logColor(log.level)}>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Abort button (always visible when active) */}
            {phase !== "standby" &&
              phase !== "aborted" &&
              phase !== "launch" && (
                <button
                  onClick={abortLaunch}
                  className="w-full px-4 py-3 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 font-orbitron text-xs tracking-wider rounded-lg 
                  border-2 border-yellow-500/30 hover:border-yellow-400 transition-all"
                >
                  ⛔ EMERGENCY ABORT
                </button>
              )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .launch-log-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .launch-log-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .launch-log-scroll::-webkit-scrollbar-thumb {
          background: rgba(239, 68, 68, 0.2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
