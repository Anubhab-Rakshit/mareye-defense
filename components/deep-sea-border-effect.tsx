"use client";

import { useEffect, useState } from "react";

interface DeepSeaBorderEffectProps {
  active: boolean;
  intensity?: "low" | "medium" | "high" | "critical";
}

export function DeepSeaBorderEffect({
  active,
  intensity = "high",
}: DeepSeaBorderEffectProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (active) {
      // Small delay so the CSS transition animates in
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [active]);

  if (!active && !mounted) return null;

  const intensityConfig = {
    low: { borderWidth: 2, glowSize: 30, opacity: 0.3, pulseSpeed: 4 },
    medium: { borderWidth: 3, glowSize: 50, opacity: 0.5, pulseSpeed: 3 },
    high: { borderWidth: 4, glowSize: 80, opacity: 0.7, pulseSpeed: 2 },
    critical: { borderWidth: 5, glowSize: 120, opacity: 0.9, pulseSpeed: 1.5 },
  };

  const cfg = intensityConfig[intensity];

  return (
    <div
      className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-700 ${
        active && mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* ═══ TOP BORDER ═══ */}
      <div
        className="absolute top-0 left-0 right-0 deep-sea-border-top"
        style={{ height: `${cfg.glowSize}px` }}
      />

      {/* ═══ BOTTOM BORDER ═══ */}
      <div
        className="absolute bottom-0 left-0 right-0 deep-sea-border-bottom"
        style={{ height: `${cfg.glowSize}px` }}
      />

      {/* ═══ LEFT BORDER ═══ */}
      <div
        className="absolute top-0 bottom-0 left-0 deep-sea-border-left"
        style={{ width: `${cfg.glowSize}px` }}
      />

      {/* ═══ RIGHT BORDER ═══ */}
      <div
        className="absolute top-0 bottom-0 right-0 deep-sea-border-right"
        style={{ width: `${cfg.glowSize}px` }}
      />

      {/* ═══ CORNER ACCENTS — Top Left ═══ */}
      <div className="absolute top-0 left-0 w-32 h-32">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-cyan-400 via-cyan-500/60 to-transparent deep-sea-pulse" />
        <div className="absolute top-0 left-0 h-full w-[3px] bg-gradient-to-b from-cyan-400 via-cyan-500/60 to-transparent deep-sea-pulse" />
        <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-300 deep-sea-pulse-bright" />
      </div>

      {/* ═══ CORNER ACCENTS — Top Right ═══ */}
      <div className="absolute top-0 right-0 w-32 h-32">
        <div className="absolute top-0 right-0 w-full h-[3px] bg-gradient-to-l from-cyan-400 via-cyan-500/60 to-transparent deep-sea-pulse" />
        <div className="absolute top-0 right-0 h-full w-[3px] bg-gradient-to-b from-cyan-400 via-cyan-500/60 to-transparent deep-sea-pulse" />
        <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-300 deep-sea-pulse-bright" />
      </div>

      {/* ═══ CORNER ACCENTS — Bottom Left ═══ */}
      <div className="absolute bottom-0 left-0 w-32 h-32">
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-cyan-400 via-cyan-500/60 to-transparent deep-sea-pulse" />
        <div className="absolute bottom-0 left-0 h-full w-[3px] bg-gradient-to-t from-cyan-400 via-cyan-500/60 to-transparent deep-sea-pulse" />
        <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-300 deep-sea-pulse-bright" />
      </div>

      {/* ═══ CORNER ACCENTS — Bottom Right ═══ */}
      <div className="absolute bottom-0 right-0 w-32 h-32">
        <div className="absolute bottom-0 right-0 w-full h-[3px] bg-gradient-to-l from-cyan-400 via-cyan-500/60 to-transparent deep-sea-pulse" />
        <div className="absolute bottom-0 right-0 h-full w-[3px] bg-gradient-to-t from-cyan-400 via-cyan-500/60 to-transparent deep-sea-pulse" />
        <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-300 deep-sea-pulse-bright" />
      </div>

      {/* ═══ SCANNING LINE — Horizontal sweep ═══ */}
      <div className="absolute top-0 left-0 right-0 h-[2px] deep-sea-scan-h" />

      {/* ═══ SCANNING LINE — Vertical sweep ═══ */}
      <div className="absolute top-0 left-0 bottom-0 w-[2px] deep-sea-scan-v" />

      {/* ═══ SONAR RIPPLE from corners ═══ */}
      <div
        className="absolute top-0 left-0 deep-sea-sonar-ring"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="absolute bottom-0 right-0 deep-sea-sonar-ring"
        style={{ animationDelay: "1.5s" }}
      />

      {/* ═══ DEPTH PARTICLES — floating bubbles along edges ═══ */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute deep-sea-particle"
          style={{
            left:
              i < 3
                ? `${4 + i * 2}px`
                : i < 6
                  ? `calc(100% - ${4 + (i - 3) * 2}px)`
                  : `${10 + (i - 6) * 16}%`,
            bottom: i < 6 ? `${10 + (i % 3) * 30}%` : "4px",
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${3 + (i % 3)}s`,
          }}
        />
      ))}

      {/* ═══ "LISTENING" indicator at top center ═══ */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2 rounded-full bg-slate-950/80 border border-cyan-400/40 backdrop-blur-md deep-sea-pulse">
        <div className="flex gap-1">
          <div
            className="w-1.5 h-4 bg-cyan-400 rounded-full deep-sea-bar"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-1.5 h-4 bg-cyan-400 rounded-full deep-sea-bar"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-1.5 h-4 bg-cyan-400 rounded-full deep-sea-bar"
            style={{ animationDelay: "300ms" }}
          />
          <div
            className="w-1.5 h-4 bg-cyan-400 rounded-full deep-sea-bar"
            style={{ animationDelay: "450ms" }}
          />
          <div
            className="w-1.5 h-4 bg-cyan-400 rounded-full deep-sea-bar"
            style={{ animationDelay: "600ms" }}
          />
        </div>
        <span className="text-[10px] font-orbitron text-cyan-300 tracking-[0.2em] uppercase">
          MarEye Listening
        </span>
        <div className="flex gap-1">
          <div
            className="w-1.5 h-4 bg-cyan-400 rounded-full deep-sea-bar"
            style={{ animationDelay: "600ms" }}
          />
          <div
            className="w-1.5 h-4 bg-cyan-400 rounded-full deep-sea-bar"
            style={{ animationDelay: "450ms" }}
          />
          <div
            className="w-1.5 h-4 bg-cyan-400 rounded-full deep-sea-bar"
            style={{ animationDelay: "300ms" }}
          />
          <div
            className="w-1.5 h-4 bg-cyan-400 rounded-full deep-sea-bar"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-1.5 h-4 bg-cyan-400 rounded-full deep-sea-bar"
            style={{ animationDelay: "0ms" }}
          />
        </div>
      </div>

      <style jsx>{`
        .deep-sea-border-top {
          background: linear-gradient(
            to bottom,
            rgba(6, 182, 212, ${cfg.opacity * 0.5}) 0%,
            rgba(6, 182, 212, ${cfg.opacity * 0.2}) 30%,
            rgba(8, 145, 178, ${cfg.opacity * 0.05}) 60%,
            transparent 100%
          );
          animation: deepSeaPulseGlow ${cfg.pulseSpeed}s ease-in-out infinite;
        }
        .deep-sea-border-bottom {
          background: linear-gradient(
            to top,
            rgba(6, 182, 212, ${cfg.opacity * 0.5}) 0%,
            rgba(6, 182, 212, ${cfg.opacity * 0.2}) 30%,
            rgba(8, 145, 178, ${cfg.opacity * 0.05}) 60%,
            transparent 100%
          );
          animation: deepSeaPulseGlow ${cfg.pulseSpeed}s ease-in-out infinite;
          animation-delay: ${cfg.pulseSpeed / 2}s;
        }
        .deep-sea-border-left {
          background: linear-gradient(
            to right,
            rgba(6, 182, 212, ${cfg.opacity * 0.4}) 0%,
            rgba(6, 182, 212, ${cfg.opacity * 0.15}) 30%,
            rgba(8, 145, 178, ${cfg.opacity * 0.03}) 60%,
            transparent 100%
          );
          animation: deepSeaPulseGlow ${cfg.pulseSpeed * 1.2}s ease-in-out
            infinite;
          animation-delay: ${cfg.pulseSpeed / 4}s;
        }
        .deep-sea-border-right {
          background: linear-gradient(
            to left,
            rgba(6, 182, 212, ${cfg.opacity * 0.4}) 0%,
            rgba(6, 182, 212, ${cfg.opacity * 0.15}) 30%,
            rgba(8, 145, 178, ${cfg.opacity * 0.03}) 60%,
            transparent 100%
          );
          animation: deepSeaPulseGlow ${cfg.pulseSpeed * 1.2}s ease-in-out
            infinite;
          animation-delay: ${cfg.pulseSpeed * 0.75}s;
        }
        .deep-sea-pulse {
          animation: deepSeaPulseGlow ${cfg.pulseSpeed}s ease-in-out infinite;
        }
        .deep-sea-pulse-bright {
          animation: deepSeaPulseBright ${cfg.pulseSpeed * 0.8}s ease-in-out
            infinite;
        }
        .deep-sea-scan-h {
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(6, 182, 212, 0.6) 50%,
            transparent 100%
          );
          animation: scanHorizontal 4s linear infinite;
        }
        .deep-sea-scan-v {
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(6, 182, 212, 0.4) 50%,
            transparent 100%
          );
          animation: scanVertical 6s linear infinite;
        }
        .deep-sea-sonar-ring {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          border: 1px solid rgba(6, 182, 212, 0.3);
          animation: sonarExpand 3s ease-out infinite;
        }
        .deep-sea-particle {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: rgba(6, 182, 212, 0.5);
          box-shadow: 0 0 6px rgba(6, 182, 212, 0.3);
          animation: particleFloat 3s ease-in-out infinite;
        }
        .deep-sea-bar {
          animation: audioBar 0.8s ease-in-out infinite alternate;
        }

        @keyframes deepSeaPulseGlow {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes deepSeaPulseBright {
          0%,
          100% {
            opacity: 0.5;
            box-shadow: 0 0 4px rgba(6, 182, 212, 0.3);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 12px rgba(6, 182, 212, 0.7);
          }
        }
        @keyframes scanHorizontal {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100vw);
          }
        }
        @keyframes scanVertical {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100vh);
          }
        }
        @keyframes sonarExpand {
          0% {
            transform: scale(0);
            opacity: 0.6;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
        @keyframes particleFloat {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-20px) scale(1.5);
            opacity: 0.8;
          }
        }
        @keyframes audioBar {
          0% {
            transform: scaleY(0.3);
          }
          100% {
            transform: scaleY(1.2);
          }
        }
      `}</style>
    </div>
  );
}
