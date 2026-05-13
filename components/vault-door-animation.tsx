"use client";

import { useEffect, useRef, useState } from "react";

interface VaultDoorAnimationProps {
  onComplete: () => void;
}

/**
 * Cinematic vault-door intro – 5 seconds, two sounds (each once), then calls onComplete.
 *
 * Timeline (t = normalised 0→1 over 5 000 ms):
 *  0.00→0.45  Wheel spins 720°, lock pins retract one-by-one, hydraulic glow builds
 *  0.45→0.50  Wheel slams to stop, metallic clunk, flash
 *  0.50→0.80  Blast doors split open, heavy smoke erupts, volumetric light beams
 *  0.80→0.90  ACCESS GRANTED glitch text
 *  0.88→1.00  Everything fades + zooms into the darkness
 *
 * Sounds:
 *  t=0.00  → control_room_voice.mp3   (once)
 *  t=0.50  → smoke_sound_realease.mp3 (once)
 */
export function VaultDoorAnimation({ onComplete }: VaultDoorAnimationProps) {
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const doneRef = useRef(false);
  const mountedRef = useRef(true);
  const voice1Ref = useRef<HTMLAudioElement | null>(null);
  const voice2Ref = useRef<HTMLAudioElement | null>(null);
  const voice2Fired = useRef(false);

  // Keep callback ref fresh without re-triggering effects
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const DURATION = 5000;

  // Start animation only after user click (satisfies browser autoplay policy)
  const handleStart = () => {
    if (started) return;
    setStarted(true);
  };

  useEffect(() => {
    if (!started) return;
    mountedRef.current = true;
    startRef.current = performance.now();
    voice2Fired.current = false;
    doneRef.current = false;

    // Play first sound – user already clicked so autoplay is allowed
    try {
      const a1 = voice1Ref.current;
      const a2 = voice2Ref.current;
      if (a1) {
        a1.loop = false;
        a1.volume = 0.85;
        a1.currentTime = 0;
        // When voice1 ends, immediately start voice2 (back-to-back, zero gap)
        a1.onended = () => {
          if (!voice2Fired.current && a2 && mountedRef.current) {
            voice2Fired.current = true;
            a2.loop = false;
            a2.volume = 0.9;
            a2.currentTime = 0;
            a2.play().catch(() => {});
          }
        };
        a1.play().catch(() => {});
      }
    } catch {}

    const tick = (now: number) => {
      if (!mountedRef.current) return;
      const t = Math.min((now - startRef.current) / DURATION, 1);
      setProgress(t);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // Animation complete
        if (!doneRef.current) {
          doneRef.current = true;
          [voice1Ref, voice2Ref].forEach((r) => {
            try {
              if (r.current) {
                r.current.pause();
              }
            } catch {}
          });
          setTimeout(() => {
            if (mountedRef.current) onCompleteRef.current();
          }, 50);
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]); // Runs when user clicks start

  /* ============ DERIVED ANIMATION VALUES ============ */
  const t = progress;

  // Wheel spin: 0→0.45  (720° with slight overshoot)
  const wheelPhase = clamp(t / 0.45, 0, 1);
  const wheelDeg = easeOutBack(wheelPhase) * 720;

  // Wheel slam flash at t ≈ 0.45
  const slamFlash = t >= 0.44 && t <= 0.52 ? 1 - Math.abs(t - 0.48) / 0.04 : 0;

  // Lock pins (8 pins unlock between t 0.05→0.42)
  const pinPhase = clamp((t - 0.05) / 0.37, 0, 1);
  const unlockedPins = Math.floor(easeOutCubic(pinPhase) * 8);

  // Glow rises 0→0.5
  const glow = easeOutCubic(clamp(t / 0.5, 0, 1));

  // Doors open: t 0.50→0.80
  const doorPhase = clamp((t - 0.5) / 0.3, 0, 1);
  const doorOpenPct = easeInOutQuart(doorPhase) * 100;

  // Smoke intensity: t 0.48→0.90
  const smokePhase = clamp((t - 0.48) / 0.42, 0, 1);

  // Screen shake – strongest during door opening
  const shakeAmt =
    t < 0.45
      ? glow * 2
      : t < 0.5
        ? 6
        : t < 0.8
          ? 4 + easeOutCubic(doorPhase) * 6
          : Math.max(0, (1 - clamp((t - 0.8) / 0.1, 0, 1)) * 8);

  const shakeX = Math.sin(t * 237) * shakeAmt;
  const shakeY = Math.cos(t * 193) * shakeAmt * 0.6;

  // ACCESS GRANTED: t 0.78→0.90
  const showAccess = t >= 0.78 && t <= 0.9;
  const accessFlicker = showAccess ? 0.7 + Math.sin(t * 500) * 0.3 : 0;

  // Fade out: t 0.88→1.0
  const fadeOut = clamp((t - 0.88) / 0.12, 0, 1);

  // Progress bar
  const pct = Math.round(t * 100);

  // Phase text
  const phaseText =
    t < 0.05
      ? "INITIATING SECURITY PROTOCOL..."
      : t < 0.2
        ? "AUTHENTICATING CLEARANCE..."
        : t < 0.42
          ? "DISENGAGING LOCK MECHANISMS..."
          : t < 0.5
            ? "RELEASING VAULT MECHANISM..."
            : t < 0.8
              ? "OPENING BLAST DOORS..."
              : t < 0.88
                ? "PRESSURIZING CHAMBER..."
                : "ACCESS GRANTED";

  // Door translate values
  const leftDoorX = -(doorOpenPct * 0.52);
  const rightDoorX = doorOpenPct * 0.52;

  // Wheel scale down and fade when doors open
  const wheelScale =
    t > 0.5 ? Math.max(0, 1 - easeOutCubic(doorPhase) * 0.8) : 1;
  const wheelOpacity = t > 0.5 ? Math.max(0, 1 - doorPhase * 1.5) : 1;

  if (doneRef.current && fadeOut >= 1) return null;

  // ─── CLICK TO ENTER SCREEN (pre-animation) ───
  if (!started) {
    return (
      <div
        className="fixed inset-0 z-[9999] overflow-hidden select-none cursor-pointer"
        onClick={handleStart}
        style={{
          background:
            "radial-gradient(ellipse at center, #0b1929 0%, #040a14 50%, #000 100%)",
        }}
      >
        {/* Preload audio */}
        <audio ref={voice1Ref} src="/control_room_voice.mp3" preload="auto" />
        <audio ref={voice2Ref} src="/smoke_sound_realease.mp3" preload="auto" />

        {/* CRT scanlines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
          }}
        />

        {/* Corner brackets */}
        {CORNERS.map((c) => (
          <div
            key={c.k}
            className="absolute pointer-events-none"
            style={{
              ...c.pos,
              width: 48,
              height: 48,
              opacity: 0.5,
            }}
          >
            <div
              className="absolute"
              style={{
                ...c.h,
                background: "#06b6d4",
                width: "100%",
                height: 2,
                opacity: 0.6,
              }}
            />
            <div
              className="absolute"
              style={{
                ...c.v,
                background: "#06b6d4",
                width: 2,
                height: "100%",
                opacity: 0.6,
              }}
            />
          </div>
        ))}

        {/* HUD: top-left */}
        <div className="absolute top-4 left-5 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full bg-red-500"
              style={{ animation: "vdPulse 1s ease-in-out infinite" }}
            />
            <span
              className="text-red-400 text-xs font-bold tracking-[0.35em]"
              style={{ fontFamily: "'Orbitron', monospace" }}
            >
              RESTRICTED ACCESS
            </span>
          </div>
          <div className="text-cyan-500/50 font-mono text-[10px] tracking-[0.2em]">
            CLASSIFICATION: OMEGA-7
          </div>
        </div>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Vault icon */}
          <div className="mb-8" style={{ opacity: 0.5 }}>
            <svg width="80" height="80" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                opacity="0.3"
              />
              <circle
                cx="100"
                cy="100"
                r="70"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1"
                opacity="0.2"
              />
              {[0, 72, 144, 216, 288].map((a, i) => {
                const rad = (a * Math.PI) / 180;
                return (
                  <line
                    key={i}
                    x1={100 + Math.cos(rad) * 30}
                    y1={100 + Math.sin(rad) * 30}
                    x2={100 + Math.cos(rad) * 75}
                    y2={100 + Math.sin(rad) * 75}
                    stroke="#06b6d4"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.3"
                  />
                );
              })}
              <circle
                cx="100"
                cy="100"
                r="28"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                opacity="0.3"
              />
              <text
                x="100"
                y="106"
                textAnchor="middle"
                fill="#06b6d4"
                fontSize="16"
                opacity="0.5"
              >
                ⚓
              </text>
            </svg>
          </div>

          {/* Title */}
          <div
            className="text-cyan-400/80 text-lg sm:text-xl font-bold tracking-[0.5em] mb-3"
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            MAREYE COMMAND
          </div>
          <div className="text-cyan-500/40 font-mono text-[11px] tracking-[0.3em] mb-10">
            NAVAL INTELLIGENCE PLATFORM
          </div>

          {/* Click to enter button */}
          <div className="relative group">
            <div
              className="absolute -inset-1 rounded-lg opacity-40"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent)",
                animation: "vdPulse 2s ease-in-out infinite",
              }}
            />
            <div
              className="relative px-10 py-4 rounded-lg border border-cyan-500/40 backdrop-blur-sm"
              style={{ background: "rgba(6,182,212,0.06)" }}
            >
              <div
                className="text-cyan-400 font-bold tracking-[0.4em] text-sm"
                style={{ fontFamily: "'Orbitron', monospace" }}
              >
                ▶ CLICK TO INITIATE
              </div>
            </div>
          </div>

          <div className="mt-6 text-cyan-600/30 font-mono text-[9px] tracking-[0.2em]">
            SECURITY PROTOCOL REQUIRES USER AUTHORIZATION
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-4 left-5 pointer-events-none">
          <div className="text-cyan-600/25 font-mono text-[9px]">
            DEEP-SEA COMMAND FACILITY
          </div>
        </div>
        <div className="absolute bottom-4 right-5 pointer-events-none">
          <div className="text-cyan-600/25 font-mono text-[9px]">
            CLEARANCE: LEVEL-5 REQUIRED
          </div>
        </div>

        <style jsx>{`
          @keyframes vdPulse {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.4;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden select-none cursor-default"
      style={{
        opacity: 1 - fadeOut,
        transform: `scale(${1 + fadeOut * 0.2})`,
        transition: "none",
      }}
    >
      {/* Audio – no loop */}
      <audio ref={voice1Ref} src="/control_room_voice.mp3" preload="auto" />
      <audio ref={voice2Ref} src="/smoke_sound_realease.mp3" preload="auto" />

      {/* ── BACKGROUND + SHAKE WRAPPER ── */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${shakeX.toFixed(1)}px, ${shakeY.toFixed(1)}px)`,
          background:
            "radial-gradient(ellipse at center, #0b1929 0%, #040a14 50%, #000 100%)",
        }}
      >
        {/* Floating dust */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.s,
              height: p.s,
              left: `${p.x}%`,
              top: `${(p.y + t * p.v * 40) % 105}%`,
              background: `rgba(56,189,248,${0.2 + p.b * 0.4})`,
              opacity: 0.3 + glow * 0.5,
              filter: "blur(0.5px)",
            }}
          />
        ))}

        {/* Radial glow behind wheel */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: glow * 0.9 }}
        >
          <div
            style={{
              width: "80vmin",
              height: "80vmin",
              background:
                "radial-gradient(circle, rgba(6,182,212,0.35) 0%, rgba(6,182,212,0.06) 45%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
        </div>

        {/* Slam flash overlay */}
        {slamFlash > 0 && (
          <div
            className="absolute inset-0"
            style={{
              background: `rgba(6,182,212,${slamFlash * 0.15})`,
              zIndex: 25,
            }}
          />
        )}

        {/* ===== LEFT DOOR ===== */}
        <div
          className="absolute top-0 left-0 w-1/2 h-full"
          style={{
            transform: `translateX(${leftDoorX}%)`,
            willChange: "transform",
          }}
        >
          <DoorPanel side="left" glow={glow} unlockedPins={unlockedPins} />
        </div>

        {/* ===== RIGHT DOOR ===== */}
        <div
          className="absolute top-0 right-0 w-1/2 h-full"
          style={{
            transform: `translateX(${rightDoorX}%)`,
            willChange: "transform",
          }}
        >
          <DoorPanel side="right" glow={glow} unlockedPins={unlockedPins} />
        </div>

        {/* ===== VAULT WHEEL ===== */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            zIndex: 20,
            opacity: wheelOpacity,
            transform: `scale(${wheelScale})`,
            willChange: "transform, opacity",
          }}
        >
          <VaultWheel deg={wheelDeg} glow={glow} />
          {/* Outer glow ring */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: "min(340px, 46vmin)",
              height: "min(340px, 46vmin)",
              border: `2px solid rgba(6,182,212,${glow * 0.5})`,
              boxShadow: `0 0 ${25 * glow}px rgba(6,182,212,${glow * 0.35}), inset 0 0 ${25 * glow}px rgba(6,182,212,${glow * 0.12})`,
            }}
          />
        </div>

        {/* ===== HEAVY SMOKE – both sides ===== */}
        {smokePhase > 0 && <SmokeEffect smokeT={smokePhase} />}

        {/* ===== VOLUMETRIC LIGHT BEAMS ===== */}
        {doorOpenPct > 3 && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 28 }}
          >
            {/* Central vertical beam */}
            <div
              className="absolute"
              style={{
                width: `${Math.max(2, doorOpenPct * 0.4)}%`,
                height: "100%",
                background: `linear-gradient(180deg, transparent 5%, rgba(6,182,212,${doorOpenPct * 0.003}) 30%, rgba(56,189,248,${doorOpenPct * 0.004}) 50%, rgba(6,182,212,${doorOpenPct * 0.003}) 70%, transparent 95%)`,
                filter: "blur(8px)",
              }}
            />
            {/* Horizontal beam lines */}
            {BEAMS.map((b, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  width: `${doorOpenPct * 0.6}%`,
                  height: b.h,
                  top: `${b.y}%`,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: `linear-gradient(90deg, transparent, rgba(6,182,212,${b.a * (doorOpenPct / 100)}) 40%, rgba(56,189,248,${b.a * 1.2 * (doorOpenPct / 100)}) 50%, rgba(6,182,212,${b.a * (doorOpenPct / 100)}) 60%, transparent)`,
                  filter: `blur(${b.blur}px)`,
                }}
              />
            ))}
            {/* Bright center glow */}
            <div
              className="absolute"
              style={{
                width: `${doorOpenPct * 0.3}%`,
                height: "80%",
                background: `radial-gradient(ellipse at center, rgba(56,189,248,${doorOpenPct * 0.002}) 0%, transparent 70%)`,
                filter: "blur(25px)",
              }}
            />
          </div>
        )}

        {/* ===== ACCESS GRANTED ===== */}
        {showAccess && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 58 }}
          >
            {/* Bright flash behind text */}
            <div
              className="absolute"
              style={{
                width: "120vw",
                height: "30vh",
                background: `radial-gradient(ellipse at center, rgba(6,182,212,${accessFlicker * 0.12}) 0%, transparent 60%)`,
                filter: "blur(40px)",
              }}
            />
            <div className="relative">
              <div
                className="text-5xl sm:text-6xl md:text-8xl font-black tracking-[0.2em]"
                style={{
                  fontFamily: "'Orbitron', monospace",
                  color: `rgba(6,182,212,${accessFlicker})`,
                  textShadow: `0 0 60px rgba(6,182,212,${accessFlicker * 0.9}), 0 0 120px rgba(6,182,212,${accessFlicker * 0.5}), 0 0 200px rgba(6,182,212,${accessFlicker * 0.3})`,
                  animation: "vdGlitch 0.1s infinite",
                }}
              >
                ACCESS GRANTED
              </div>
              {/* RGB split layers */}
              <div
                className="absolute inset-0 text-5xl sm:text-6xl md:text-8xl font-black tracking-[0.2em]"
                style={{
                  fontFamily: "'Orbitron', monospace",
                  color: "rgba(239,68,68,0.3)",
                  clipPath: "inset(30% 0 40% 0)",
                  animation: "vdGlitchR 0.15s infinite",
                }}
              >
                ACCESS GRANTED
              </div>
              <div
                className="absolute inset-0 text-5xl sm:text-6xl md:text-8xl font-black tracking-[0.2em]"
                style={{
                  fontFamily: "'Orbitron', monospace",
                  color: "rgba(59,130,246,0.3)",
                  clipPath: "inset(60% 0 10% 0)",
                  animation: "vdGlitchB 0.18s infinite",
                }}
              >
                ACCESS GRANTED
              </div>
              {/* Underline */}
              <div
                className="mt-3 h-[2px] mx-auto"
                style={{
                  width: `${accessFlicker * 100}%`,
                  background:
                    "linear-gradient(90deg, transparent, #06b6d4, transparent)",
                }}
              />
            </div>
          </div>
        )}

        {/* CRT scanlines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 55,
            background:
              "repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
            mixBlendMode: "multiply",
          }}
        />
        {/* Moving scanline */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            zIndex: 55,
            height: 3,
            top: `${(t * 400) % 110}%`,
            background:
              "linear-gradient(90deg, transparent, rgba(6,182,212,0.18), transparent)",
            boxShadow: "0 0 15px rgba(6,182,212,0.1)",
          }}
        />

        {/* Corner brackets */}
        {CORNERS.map((c) => (
          <div
            key={c.k}
            className="absolute pointer-events-none"
            style={{
              ...c.pos,
              zIndex: 56,
              opacity: Math.min(t * 6, 0.55),
              width: 48,
              height: 48,
            }}
          >
            <div
              className="absolute"
              style={{
                ...c.h,
                background: "#06b6d4",
                width: "100%",
                height: 2,
                opacity: 0.6,
              }}
            />
            <div
              className="absolute"
              style={{
                ...c.v,
                background: "#06b6d4",
                width: 2,
                height: "100%",
                opacity: 0.6,
              }}
            />
          </div>
        ))}

        {/* ── HUD: top-left ── */}
        <div
          className="absolute top-4 left-5 pointer-events-none"
          style={{ zIndex: 57, opacity: Math.min(t * 8, 1) }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full bg-red-500"
              style={{ animation: "vdPulse 1s ease-in-out infinite" }}
            />
            <span
              className="text-red-400 text-xs font-bold tracking-[0.35em]"
              style={{ fontFamily: "'Orbitron', monospace" }}
            >
              TOP SECRET
            </span>
          </div>
          <div className="text-cyan-500/50 font-mono text-[10px] tracking-[0.2em]">
            CLASSIFICATION: OMEGA-7
          </div>
          <div className="text-cyan-500/35 font-mono text-[10px]">
            FACILITY: DEEP-SEA COMMAND
          </div>
          <div className="text-cyan-500/25 font-mono text-[9px] mt-1">
            SESSION: {SESSION_ID}
          </div>
        </div>

        {/* ── HUD: top-right ── */}
        <div
          className="absolute top-4 right-5 text-right pointer-events-none"
          style={{ zIndex: 57, opacity: Math.min(t * 8, 1) }}
        >
          <div className="text-cyan-400/70 font-mono text-[10px] tracking-[0.2em]">
            AUTH: OPERATOR
          </div>
          <div className="text-cyan-400/45 font-mono text-[10px]">
            CLEARANCE: LEVEL-5
          </div>
          <div className="text-cyan-500/30 font-mono text-[9px] mt-1">
            PROTOCOL: DEEP-NAVY
          </div>
        </div>

        {/* ── Bottom HUD ── */}
        <div
          className="absolute bottom-4 left-5 right-20 pointer-events-none"
          style={{ zIndex: 57, opacity: Math.min(t * 8, 1) }}
        >
          <div
            className="text-cyan-300 text-sm font-bold tracking-[0.25em] mb-1.5"
            style={{ fontFamily: "'Orbitron', monospace" }}
          >
            {phaseText}
          </div>
          <div className="flex items-center gap-3">
            <div
              className="h-[3px] bg-cyan-900/50 rounded-full overflow-hidden"
              style={{ width: 220 }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background:
                    "linear-gradient(90deg, #06b6d4, #38bdf8, #06b6d4)",
                  boxShadow: "0 0 8px rgba(6,182,212,0.6)",
                  transition: "width 0.05s linear",
                }}
              />
            </div>
            <span className="text-cyan-400/60 font-mono text-xs font-bold tabular-nums">
              {pct}%
            </span>
          </div>
          <div className="mt-1 text-cyan-600/25 font-mono text-[8px] tracking-wider">
            {HEX_LINES.map((h, i) => (
              <span key={i} className="mr-3">
                {h}
              </span>
            ))}
          </div>
        </div>

        {/* Skip button */}
        {t > 0.08 && t < 0.86 && (
          <button
            onClick={() => {
              if (!doneRef.current) {
                doneRef.current = true;
                cancelAnimationFrame(rafRef.current);
                [voice1Ref, voice2Ref].forEach((r) => {
                  try {
                    r.current?.pause();
                  } catch {}
                });
                onCompleteRef.current();
              }
            }}
            className="absolute bottom-4 right-5 z-[60] px-5 py-2 rounded border text-xs tracking-[0.2em] font-mono transition-all"
            style={{
              background: "rgba(6,182,212,0.08)",
              borderColor: "rgba(6,182,212,0.3)",
              color: "rgba(6,182,212,0.7)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(6,182,212,0.18)";
              e.currentTarget.style.borderColor = "rgba(6,182,212,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(6,182,212,0.08)";
              e.currentTarget.style.borderColor = "rgba(6,182,212,0.3)";
            }}
          >
            SKIP ▶▶
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes vdGlitch {
          0% {
            transform: translate(0, 0) skewX(0);
          }
          20% {
            transform: translate(-3px, 1px) skewX(-1deg);
          }
          40% {
            transform: translate(3px, -1px) skewX(1deg);
          }
          60% {
            transform: translate(-1px, 3px) skewX(-0.5deg);
          }
          80% {
            transform: translate(2px, -2px) skewX(0.5deg);
          }
          100% {
            transform: translate(0, 0) skewX(0);
          }
        }
        @keyframes vdGlitchR {
          0% {
            transform: translate(0, 0);
          }
          33% {
            transform: translate(4px, 0);
          }
          66% {
            transform: translate(-3px, 0);
          }
          100% {
            transform: translate(0, 0);
          }
        }
        @keyframes vdGlitchB {
          0% {
            transform: translate(0, 0);
          }
          33% {
            transform: translate(-4px, 0);
          }
          66% {
            transform: translate(3px, 0);
          }
          100% {
            transform: translate(0, 0);
          }
        }
        @keyframes vdPulse {
          0%,
          100% {
            opacity: 1;
            box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
          }
          50% {
            opacity: 0.4;
            box-shadow: 0 0 2px rgba(239, 68, 68, 0.3);
          }
        }
      `}</style>
    </div>
  );
}

/* ================================================================
   DOOR PANEL SUB-COMPONENT
   ================================================================ */
function DoorPanel({
  side,
  glow,
  unlockedPins,
}: {
  side: "left" | "right";
  glow: number;
  unlockedPins: number;
}) {
  const isLeft = side === "left";
  const pinIndices = isLeft ? [0, 1, 2, 3] : [4, 5, 6, 7];

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Base metal texture */}
      <div
        className="absolute inset-0"
        style={{
          background: isLeft
            ? "linear-gradient(135deg, #162a48 0%, #0e1a30 20%, #14243e 40%, #0c1628 60%, #162a48 80%, #0e1a30 100%)"
            : "linear-gradient(225deg, #162a48 0%, #0e1a30 20%, #14243e 40%, #0c1628 60%, #162a48 80%, #0e1a30 100%)",
        }}
      />
      {/* Metal grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
        }}
      />

      {/* Horizontal plate lines */}
      {PLATE_LINES.map((y, i) => (
        <div
          key={i}
          className="absolute left-0 right-0"
          style={{
            top: `${y}%`,
            height: 1,
            background: `linear-gradient(${isLeft ? "90deg" : "270deg"}, rgba(100,160,220,0.08), rgba(100,160,220,0.03) 70%, transparent)`,
          }}
        />
      ))}

      {/* Rivets – two columns */}
      {RIVET_ROWS.map((y, i) => (
        <div key={`r1-${i}`}>
          <Rivet x={isLeft ? "calc(100% - 22px)" : "10px"} y={`${y}%`} />
          <Rivet x={isLeft ? "calc(100% - 48px)" : "36px"} y={`${y}%`} />
        </div>
      ))}

      {/* Hydraulic bar on door edge */}
      <div
        className="absolute top-0 h-full"
        style={{
          [isLeft ? "right" : "left"]: 0,
          width: 6,
          background: `linear-gradient(180deg, #0a2a4a 0%, #1a4a6a 30%, #0d3552 50%, #1a4a6a 70%, #0a2a4a 100%)`,
          boxShadow: `0 0 ${12 + glow * 20}px rgba(6,182,212,${0.15 + glow * 0.45}), inset 0 0 8px rgba(6,182,212,${glow * 0.2})`,
        }}
      />

      {/* Warning/hazard stripes at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden"
        style={{ opacity: 0.55 }}
      >
        <div
          style={{
            width: "300%",
            height: "100%",
            background: `repeating-linear-gradient(${isLeft ? "45deg" : "-45deg"}, #d4a017 0, #d4a017 18px, #111 18px, #111 36px)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.3) 100%)",
          }}
        />
      </div>

      {/* Warning stripes at top (thinner) */}
      <div
        className="absolute top-0 left-0 right-0 h-8 overflow-hidden"
        style={{ opacity: 0.3 }}
      >
        <div
          style={{
            width: "300%",
            height: "100%",
            background: `repeating-linear-gradient(${isLeft ? "45deg" : "-45deg"}, #d4a017 0, #d4a017 12px, #111 12px, #111 24px)`,
          }}
        />
      </div>

      {/* Lock pins */}
      {pinIndices.map((pi, idx) => {
        const unlocked = pi < unlockedPins;
        const yPos = 22 + idx * 16;
        return (
          <div
            key={pi}
            className="absolute"
            style={{
              [isLeft ? "right" : "left"]: unlocked ? "-32px" : "2px",
              top: `${yPos}%`,
              width: 32,
              height: 12,
              background: unlocked
                ? "linear-gradient(90deg, #0ea5e9 0%, #06b6d4 50%, #0ea5e9 100%)"
                : "linear-gradient(90deg, #555e6e 0%, #6b7888 50%, #555e6e 100%)",
              borderRadius: 3,
              boxShadow: unlocked
                ? "0 0 18px rgba(6,182,212,0.85), 0 0 6px rgba(6,182,212,0.5), inset 0 1px 1px rgba(255,255,255,0.2)"
                : "inset 0 1px 1px rgba(255,255,255,0.08), 0 2px 3px rgba(0,0,0,0.4)",
              transition: `${isLeft ? "right" : "left"} 0.2s cubic-bezier(0.68,-0.55,0.27,1.55)`,
            }}
          />
        );
      })}

      {/* Edge highlight */}
      <div
        className="absolute top-0 h-full"
        style={{
          [isLeft ? "right" : "left"]: 0,
          width: 1,
          background: `rgba(6,182,212,${0.1 + glow * 0.3})`,
        }}
      />

      {/* Large text watermark */}
      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={{ [isLeft ? "right" : "left"]: 24 }}
      >
        <div
          className="text-cyan-400/20 font-black tracking-[0.15em]"
          style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "clamp(48px, 8vw, 90px)",
          }}
        >
          {isLeft ? "MAR" : "EYE"}
        </div>
        <div
          className="text-cyan-500/10 font-mono text-[10px] tracking-[0.4em] mt-1"
          style={{
            textAlign: isLeft ? "right" : "left",
          }}
        >
          {isLeft ? "CLASSIFIED" : "AUTHORIZED"}
        </div>
      </div>

      {/* Embossed panel number */}
      <div
        className="absolute"
        style={{
          [isLeft ? "right" : "left"]: 24,
          top: 80,
        }}
      >
        <div className="text-cyan-600/15 font-mono text-[9px] tracking-widest">
          {isLeft ? "PANEL-L7" : "PANEL-R7"}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   RIVET SUB-COMPONENT
   ================================================================ */
function Rivet({ x, y }: { x: string; y: string }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        width: 14,
        height: 14,
        left: x,
        top: y,
        background:
          "radial-gradient(circle at 35% 35%, #5a7a9a 0%, #2a3a4a 60%, #1a2a3a 100%)",
        boxShadow:
          "inset 0 1px 2px rgba(255,255,255,0.18), inset 0 -1px 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.5)",
      }}
    />
  );
}

/* ================================================================
   VAULT WHEEL SVG
   ================================================================ */
function VaultWheel({ deg, glow }: { deg: number; glow: number }) {
  return (
    <div style={{ width: "min(300px, 40vmin)", height: "min(300px, 40vmin)" }}>
      <div
        className="w-full h-full"
        style={{
          transform: `rotate(${deg}deg)`,
          willChange: "transform",
        }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <radialGradient id="vw_bg" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#1f3555" />
              <stop offset="60%" stopColor="#162a48" />
              <stop offset="100%" stopColor="#0e1c34" />
            </radialGradient>
            <linearGradient id="vw_spoke" x1="0%" y1="0%" x2="100%">
              <stop offset="0%" stopColor="#3a5a7a" />
              <stop offset="50%" stopColor="#5a7a9a" />
              <stop offset="100%" stopColor="#3a5a7a" />
            </linearGradient>
            <filter id="vw_glow">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="4"
                floodColor="#06b6d4"
                floodOpacity={0.2 + glow * 0.5}
              />
            </filter>
          </defs>

          {/* Outer ring */}
          <circle
            cx="100"
            cy="100"
            r="97"
            fill="none"
            stroke="#1a3a5a"
            strokeWidth="3"
          />
          <circle
            cx="100"
            cy="100"
            r="94"
            fill="url(#vw_bg)"
            filter="url(#vw_glow)"
          />
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#1a4a6a"
            strokeWidth="1.5"
            opacity="0.6"
          />

          {/* Outer tick marks */}
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i * 15 * Math.PI) / 180;
            const r1 = 90;
            const r2 = i % 3 === 0 ? 82 : 86;
            return (
              <line
                key={i}
                x1={100 + Math.cos(a) * r1}
                y1={100 + Math.sin(a) * r1}
                x2={100 + Math.cos(a) * r2}
                y2={100 + Math.sin(a) * r2}
                stroke="#06b6d4"
                strokeWidth={i % 3 === 0 ? "2" : "0.8"}
                opacity={i % 3 === 0 ? 0.7 : 0.3}
              />
            );
          })}

          {/* Inner ring */}
          <circle
            cx="100"
            cy="100"
            r="72"
            fill="none"
            stroke="#1a3a5a"
            strokeWidth="1"
            opacity="0.5"
          />

          {/* 5 spokes with handles */}
          {[0, 72, 144, 216, 288].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const ix = 100 + Math.cos(rad) * 32;
            const iy = 100 + Math.sin(rad) * 32;
            const ox = 100 + Math.cos(rad) * 82;
            const oy = 100 + Math.sin(rad) * 82;
            return (
              <g key={i}>
                <line
                  x1={ix}
                  y1={iy}
                  x2={ox}
                  y2={oy}
                  stroke="url(#vw_spoke)"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
                <line
                  x1={ix}
                  y1={iy}
                  x2={ox}
                  y2={oy}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                {/* Handle knob */}
                <circle
                  cx={ox}
                  cy={oy}
                  r="10"
                  fill="#1a2e4a"
                  stroke="#4a6a8a"
                  strokeWidth="2"
                />
                <circle
                  cx={ox}
                  cy={oy}
                  r="4"
                  fill="#0a1828"
                  stroke="#06b6d4"
                  strokeWidth="0.8"
                  opacity="0.5"
                />
              </g>
            );
          })}

          {/* Center hub */}
          <circle
            cx="100"
            cy="100"
            r="32"
            fill="#0c1828"
            stroke="#1a3a5a"
            strokeWidth="2.5"
          />
          <circle
            cx="100"
            cy="100"
            r="18"
            fill="#0a1420"
            stroke="#06b6d4"
            strokeWidth="1"
            opacity="0.7"
          />
          <circle cx="100" cy="100" r="8" fill="#06b6d4" opacity="0.15" />
          <text
            x="100"
            y="104"
            textAnchor="middle"
            fill="#06b6d4"
            fontSize="12"
            fontWeight="bold"
            opacity="0.7"
          >
            ⚓
          </text>
        </svg>
      </div>
    </div>
  );
}

/* ================================================================
   HEAVY SMOKE EFFECT
   ================================================================ */
function SmokeEffect({ smokeT }: { smokeT: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 35 }}
    >
      {/* Left smoke cloud burst */}
      <div className="absolute inset-0">
        {SMOKE_LEFT.map((s, i) => (
          <div
            key={`sl-${i}`}
            className="absolute rounded-full"
            style={{
              width: s.w,
              height: s.h,
              left: `${48 - smokeT * s.dx}%`,
              top: `${s.y}%`,
              opacity: Math.min(smokeT * s.maxO, s.maxO) * (1 - smokeT * 0.3),
              background: `radial-gradient(ellipse at center, ${s.color} 0%, rgba(100,120,140,${s.innerO}) 30%, transparent 70%)`,
              filter: `blur(${s.blur}px)`,
              transform: `scale(${1 + smokeT * s.scale}) rotate(${smokeT * s.rot}deg)`,
            }}
          />
        ))}
      </div>
      {/* Right smoke cloud burst */}
      <div className="absolute inset-0">
        {SMOKE_RIGHT.map((s, i) => (
          <div
            key={`sr-${i}`}
            className="absolute rounded-full"
            style={{
              width: s.w,
              height: s.h,
              right: `${48 - smokeT * s.dx}%`,
              top: `${s.y}%`,
              opacity: Math.min(smokeT * s.maxO, s.maxO) * (1 - smokeT * 0.3),
              background: `radial-gradient(ellipse at center, ${s.color} 0%, rgba(100,120,140,${s.innerO}) 30%, transparent 70%)`,
              filter: `blur(${s.blur}px)`,
              transform: `scale(${1 + smokeT * s.scale}) rotate(${-smokeT * s.rot}deg)`,
            }}
          />
        ))}
      </div>
      {/* Steam wisps rising from center gap */}
      {smokeT > 0.2 &&
        STEAM_WISPS.map((w, i) => (
          <div
            key={`w-${i}`}
            className="absolute"
            style={{
              left: `${49 + w.ox}%`,
              bottom: `${w.startY + smokeT * w.rise}%`,
              width: w.size,
              height: w.size * 2,
              background: `radial-gradient(ellipse at center, rgba(180,200,220,0.3) 0%, transparent 70%)`,
              transform: `translateX(${Math.sin(smokeT * 10 + i) * 15}px) scaleY(${1 + smokeT * 2})`,
              opacity:
                Math.min((smokeT - 0.2) * 2, 0.5) * w.o * (1 - smokeT * 0.4),
            }}
          />
        ))}
    </div>
  );
}

/* ================================================================
   EASING FUNCTIONS
   ================================================================ */
function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - x, 3);
}
function easeInOutQuart(x: number) {
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}
function easeOutBack(x: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}
function clamp(v: number, mn: number, mx: number) {
  return Math.max(mn, Math.min(mx, v));
}

/* ================================================================
   STATIC DATA (pre-computed once, deterministic)
   ================================================================ */
const S = (n: number) => {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
};

const SESSION_ID = Array.from({ length: 8 }, (_, i) =>
  Math.floor(S(i * 13.7) * 16).toString(16),
)
  .join("")
  .toUpperCase();

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: S(i * 7.1) * 100,
  y: S(i * 3.3) * 100,
  s: 1 + S(i * 5.5) * 3,
  b: S(i * 2.2),
  v: 0.3 + S(i * 9.9) * 0.8,
}));

const RIVET_ROWS = [8, 22, 36, 50, 64, 78, 92];

const PLATE_LINES = [16, 33, 50, 67, 84];

const BEAMS = Array.from({ length: 5 }, (_, i) => ({
  y: 15 + i * 16,
  a: 0.06 + (i % 3) * 0.05,
  h: 2 + (i % 2),
  blur: 1 + (i % 2),
}));

// Big, visible smoke puffs – 10 per side (fewer = less GPU blur cost)
const SMOKE_LEFT = Array.from({ length: 10 }, (_, i) => ({
  w: 150 + S(i * 4.1) * 200,
  h: 130 + S(i * 3.7) * 170,
  y: S(i * 8.3) * 85 + 5,
  dx: 30 + S(i * 5.1) * 35,
  maxO: 0.45 + S(i * 2.9) * 0.25,
  innerO: 0.18 + S(i * 6.1) * 0.12,
  color: `rgba(${150 + Math.floor(S(i * 7.2) * 50)},${170 + Math.floor(S(i * 3.4) * 50)},${190 + Math.floor(S(i * 9.1) * 40)},${0.28 + S(i * 1.8) * 0.18})`,
  blur: 15 + S(i * 4.4) * 15,
  scale: 1.8 + S(i * 6.6) * 2,
  rot: 10 + S(i * 2.3) * 30,
}));

const SMOKE_RIGHT = Array.from({ length: 10 }, (_, i) => ({
  w: 150 + S(i * 5.3) * 200,
  h: 130 + S(i * 4.9) * 170,
  y: S(i * 7.1) * 85 + 5,
  dx: 30 + S(i * 6.3) * 35,
  maxO: 0.45 + S(i * 3.1) * 0.25,
  innerO: 0.18 + S(i * 5.5) * 0.12,
  color: `rgba(${150 + Math.floor(S(i * 8.4) * 50)},${170 + Math.floor(S(i * 2.6) * 50)},${190 + Math.floor(S(i * 4.3) * 40)},${0.28 + S(i * 7.7) * 0.18})`,
  blur: 15 + S(i * 3.2) * 15,
  scale: 1.8 + S(i * 7.8) * 2,
  rot: 10 + S(i * 5.5) * 30,
}));

const STEAM_WISPS = Array.from({ length: 4 }, (_, i) => ({
  ox: (S(i * 3.3) - 0.5) * 4,
  startY: 10 + S(i * 5.5) * 30,
  rise: 20 + S(i * 7.7) * 40,
  size: 50 + S(i * 4.4) * 60,
  o: 0.6 + S(i * 2.2) * 0.4,
}));

const CORNERS = [
  {
    k: "tl",
    pos: { top: 14, left: 14 } as const,
    h: { top: 0, left: 0 } as const,
    v: { top: 0, left: 0 } as const,
  },
  {
    k: "tr",
    pos: { top: 14, right: 14 } as const,
    h: { top: 0, right: 0 } as const,
    v: { top: 0, right: 0 } as const,
  },
  {
    k: "bl",
    pos: { bottom: 14, left: 14 } as const,
    h: { bottom: 0, left: 0 } as const,
    v: { bottom: 0, left: 0 } as const,
  },
  {
    k: "br",
    pos: { bottom: 14, right: 14 } as const,
    h: { bottom: 0, right: 0 } as const,
    v: { bottom: 0, right: 0 } as const,
  },
];

const HEX_LINES = Array.from({ length: 3 }, (_, i) =>
  Array.from({ length: 12 }, (_, j) =>
    (((i * 16 + j) * 7) % 16).toString(16),
  ).join(""),
);
