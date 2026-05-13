export const SubmarineSonarSVG = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 600 400"
      className="w-full h-full"
      style={{ filter: "drop-shadow(0 0 30px rgba(6, 182, 212, 0.3))" }}
    >
      <defs>
        <radialGradient id="sonarPulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(6, 182, 212, 0.4)" />
          <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="submarineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="50%" stopColor="#0E7490" />
          <stop offset="100%" stopColor="#0C4A6E" />
        </linearGradient>
      </defs>

      {/* Animated sonar pulses */}
      <circle
        cx="300"
        cy="200"
        r="80"
        fill="none"
        stroke="rgba(6, 182, 212, 0.3)"
        strokeWidth="2"
        opacity="0"
        style={{
          animation: "sonarPulse1 3s ease-out infinite",
        }}
      />
      <circle
        cx="300"
        cy="200"
        r="80"
        fill="none"
        stroke="rgba(6, 182, 212, 0.2)"
        strokeWidth="2"
        opacity="0"
        style={{
          animation: "sonarPulse2 3s ease-out 1s infinite",
        }}
      />

      {/* Submarine body */}
      <g filter="url(#glow)">
        {/* Main hull */}
        <ellipse
          cx="300"
          cy="200"
          rx="120"
          ry="50"
          fill="url(#submarineGrad)"
          stroke="#06B6D4"
          strokeWidth="2"
        />

        {/* Conning tower */}
        <rect
          x="270"
          y="140"
          width="60"
          height="50"
          fill="#0E7490"
          stroke="#06B6D4"
          strokeWidth="2"
          rx="8"
        />

        {/* Periscope */}
        <line x1="300" y1="140" x2="300" y2="100" stroke="#06B6D4" strokeWidth="3" />
        <circle
          cx="300"
          cy="95"
          r="8"
          fill="none"
          stroke="#06B6D4"
          strokeWidth="2"
        />

        {/* Propeller */}
        <circle
          cx="420"
          cy="200"
          r="15"
          fill="none"
          stroke="#06B6D4"
          strokeWidth="2"
        />
        <line
          x1="420"
          y1="185"
          x2="420"
          y2="215"
          stroke="#06B6D4"
          strokeWidth="2"
        />
        <line
          x1="405"
          y1="200"
          x2="435"
          y2="200"
          stroke="#06B6D4"
          strokeWidth="2"
          style={{
            animation: "spin 2s linear infinite",
          }}
        />

        {/* Windows */}
        <circle cx="260" cy="190" r="6" fill="#06B6D4" opacity="0.8" />
        <circle cx="280" cy="185" r="6" fill="#06B6D4" opacity="0.8" />
        <circle cx="320" cy="185" r="6" fill="#06B6D4" opacity="0.8" />
        <circle cx="340" cy="190" r="6" fill="#06B6D4" opacity="0.8" />
      </g>

      {/* Sonar grid lines */}
      {[...Array(5)].map((_, i) => (
        <line
          key={`h-${i}`}
          x1="200"
          y1={120 + i * 20}
          x2="400"
          y2={120 + i * 20}
          stroke="rgba(6, 182, 212, 0.1)"
          strokeWidth="1"
        />
      ))}
      {[...Array(5)].map((_, i) => (
        <line
          key={`v-${i}`}
          x1={200 + i * 40}
          y1="120"
          x2={200 + i * 40}
          y2="280"
          stroke="rgba(6, 182, 212, 0.1)"
          strokeWidth="1"
        />
      ))}

      {/* Data points */}
      <circle cx="200" cy="150" r="3" fill="#06B6D4" opacity="0.6" />
      <circle cx="380" cy="240" r="3" fill="#06B6D4" opacity="0.6" />
      <circle cx="250" cy="280" r="3" fill="#06B6D4" opacity="0.6" />

      <style>{`
        @keyframes sonarPulse1 {
          from {
            r: 20px;
            opacity: 0.8;
          }
          to {
            r: 150px;
            opacity: 0;
          }
        }
        @keyframes sonarPulse2 {
          from {
            r: 20px;
            opacity: 0.8;
          }
          to {
            r: 150px;
            opacity: 0;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </svg>
  );
};
