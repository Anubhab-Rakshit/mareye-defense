export const ThreatDetectionViz = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 500 300"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="threatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
        <linearGradient id="safeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Background grid */}
      {[...Array(6)].map((_, i) => (
        <line
          key={`h-${i}`}
          x1="40"
          y1={30 + i * 50}
          x2="460"
          y2={30 + i * 50}
          stroke="rgba(6, 182, 212, 0.1)"
          strokeWidth="1"
        />
      ))}
      {[...Array(9)].map((_, i) => (
        <line
          key={`v-${i}`}
          x1={40 + i * 50}
          y1="30"
          x2={40 + i * 50}
          y2="270"
          stroke="rgba(6, 182, 212, 0.1)"
          strokeWidth="1"
        />
      ))}

      {/* Threat zones - animated scanning lines */}
      <g opacity="0.3">
        <line
          x1="40"
          y1="30"
          x2="460"
          y2="30"
          stroke="rgba(239, 68, 68, 0.5)"
          strokeWidth="2"
          style={{ animation: "scan 3s ease-in-out infinite" }}
        />
      </g>

      {/* Detected threats - bouncing indicators */}
      {[
        { x: 120, y: 80, size: 12, delay: 0 },
        { x: 280, y: 150, size: 10, delay: 0.2 },
        { x: 380, y: 200, size: 14, delay: 0.4 },
      ].map((threat, i) => (
        <g key={`threat-${i}`}>
          <circle
            cx={threat.x}
            cy={threat.y}
            r={threat.size + 8}
            fill="none"
            stroke="url(#threatGrad)"
            strokeWidth="2"
            opacity="0.6"
            style={{
              animation: `pulse-threat 1.5s ease-in-out infinite`,
              animationDelay: `${threat.delay}s`,
            }}
          />
          <circle
            cx={threat.x}
            cy={threat.y}
            r={threat.size}
            fill="url(#threatGrad)"
            style={{
              animation: `float-threat 4s ease-in-out infinite`,
              animationDelay: `${threat.delay}s`,
            }}
          />
        </g>
      ))}

      {/* Safe zones - stable indicators */}
      {[
        { x: 150, y: 220, size: 8 },
        { x: 350, y: 100, size: 8 },
      ].map((safe, i) => (
        <g key={`safe-${i}`}>
          <circle
            cx={safe.x}
            cy={safe.y}
            r={safe.size + 4}
            fill="none"
            stroke="url(#safeGrad)"
            strokeWidth="2"
            opacity="0.5"
          />
          <circle cx={safe.x} cy={safe.y} r={safe.size} fill="url(#safeGrad)" />
        </g>
      ))}

      {/* Connection lines */}
      <g stroke="rgba(6, 182, 212, 0.2)" strokeWidth="1">
        <line x1="120" y1="80" x2="280" y2="150" />
        <line x1="280" y1="150" x2="380" y2="200" />
      </g>

      {/* Status indicators */}
      <g fontSize="12" fill="rgba(6, 182, 212, 0.7)" fontFamily="Space Mono">
        <text x="40" y="290">
          Threats: 3 | Safe: 2
        </text>
        <text x="350" y="290" textAnchor="end">
          Confidence: 94%
        </text>
      </g>

      <style>{`
        @keyframes scan {
          0% {
            y1: 30px;
            y2: 30px;
          }
          50% {
            y1: 150px;
            y2: 150px;
          }
          100% {
            y1: 270px;
            y2: 270px;
          }
        }
        @keyframes pulse-threat {
          0%, 100% {
            r: var(--size-plus-8);
            stroke-width: 2px;
            opacity: 0.6;
          }
          50% {
            r: var(--size-plus-14);
            stroke-width: 1px;
            opacity: 0.3;
          }
        }
        @keyframes float-threat {
          0%, 100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(4px, -3px);
          }
          50% {
            transform: translate(0, 3px);
          }
          75% {
            transform: translate(-4px, -3px);
          }
        }
      `}</style>
    </svg>
  );
};
