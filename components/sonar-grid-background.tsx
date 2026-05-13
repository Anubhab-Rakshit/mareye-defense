"use client";

export function SonarGridBackground() {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none">
      {/* Base deep ocean / submarine interior background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050d1a] via-[#0a1628] to-[#060e1c]" />

      {/* Metallic panel texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            rgba(100,130,160,0.3) 0px,
            transparent 1px,
            transparent 80px
          ),
          repeating-linear-gradient(
            0deg,
            rgba(100,130,160,0.2) 0px,
            transparent 1px,
            transparent 80px
          )`,
        }}
      />

      {/* Submarine bulkhead seam lines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 49.5%, rgba(6,182,212,0.15) 49.5%, rgba(6,182,212,0.15) 50.5%, transparent 50.5%),
            linear-gradient(0deg, transparent 49.5%, rgba(6,182,212,0.1) 49.5%, rgba(6,182,212,0.1) 50.5%, transparent 50.5%)
          `,
          backgroundSize: "200px 200px",
        }}
      />

      {/* Radial sonar pulse from center */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute border rounded-full"
            style={{
              width: `${80 + i * 140}px`,
              height: `${80 + i * 140}px`,
              borderColor:
                i === 0 ? "rgba(6,182,212,0.12)" : "rgba(6,182,212,0.06)",
              animation: `sonar-pulse ${3 + i * 0.7}s ease-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Hexagonal grid overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.06]"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="hex-grid"
            x="0"
            y="0"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 30 0 L 60 15 L 60 45 L 30 60 L 0 45 L 0 15 Z"
              fill="none"
              stroke="url(#cyan-gradient)"
              strokeWidth="0.6"
            />
          </pattern>
          <linearGradient
            id="cyan-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="rgb(6,182,212)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(6,182,212)" stopOpacity="0.08" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-grid)" />
      </svg>

      {/* Coordinate grid lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035]"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgb(6,182,212)"
              strokeWidth="0.4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Ambient submarine lighting - top light panels */}
      <div className="absolute top-0 left-1/4 w-40 h-1 bg-gradient-to-b from-cyan-400/15 to-transparent blur-sm" />
      <div className="absolute top-0 right-1/4 w-40 h-1 bg-gradient-to-b from-cyan-400/10 to-transparent blur-sm" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-1 bg-gradient-to-b from-cyan-300/12 to-transparent blur-sm" />

      {/* Submarine overhead light cones */}
      <div className="absolute inset-0">
        <div
          className="absolute top-0 left-[25%] w-32 h-[40vh] opacity-[0.03]"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,182,212,0.4) 0%, transparent 100%)",
            clipPath: "polygon(40% 0%, 60% 0%, 80% 100%, 20% 100%)",
          }}
        />
        <div
          className="absolute top-0 left-[50%] -translate-x-1/2 w-40 h-[50vh] opacity-[0.04]"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,182,212,0.5) 0%, transparent 100%)",
            clipPath: "polygon(35% 0%, 65% 0%, 85% 100%, 15% 100%)",
          }}
        />
        <div
          className="absolute top-0 right-[25%] w-32 h-[40vh] opacity-[0.03]"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,182,212,0.4) 0%, transparent 100%)",
            clipPath: "polygon(40% 0%, 60% 0%, 80% 100%, 20% 100%)",
          }}
        />
      </div>

      {/* Animated gradient mesh - deeper, more submarine-like */}
      <div className="absolute inset-0 opacity-[0.08]">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600 rounded-full blur-[120px] animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-600 rounded-full blur-[100px] animate-pulse"
          style={{ animationDuration: "12s", animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/2 right-1/4 w-72 h-72 bg-cyan-500 rounded-full blur-[100px] animate-pulse"
          style={{ animationDuration: "10s", animationDelay: "4s" }}
        />
      </div>

      {/* Control panel status indicators (tiny flashing dots along edges) */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => {
          const isLeft = i < 10;
          const idx = isLeft ? i : i - 10;
          const colors = [
            "bg-emerald-400",
            "bg-cyan-400",
            "bg-amber-400",
            "bg-cyan-400",
            "bg-emerald-400",
          ];
          return (
            <div
              key={i}
              className={`absolute w-1 h-1 rounded-full ${colors[idx % 5]} animate-pulse`}
              style={{
                left: isLeft ? "4px" : "auto",
                right: isLeft ? "auto" : "4px",
                top: `${15 + idx * 7}%`,
                opacity: 0.15 + (idx % 3) * 0.08,
                animationDuration: `${2 + (idx % 4) * 1.5}s`,
                animationDelay: `${idx * 0.4}s`,
              }}
            />
          );
        })}
      </div>

      {/* Subtle CRT scan line effect */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.3) 2px, rgba(6,182,212,0.3) 4px)",
        }}
      />

      {/* Vignette for depth feel */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </div>
  );
}
