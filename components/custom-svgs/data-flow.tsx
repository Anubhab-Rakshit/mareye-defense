export const DataFlowViz = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 500 400"
      className="w-full h-full"
    >
      <defs>
        <linearGradient
          id="dataFlowGrad"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="50%" stopColor="#0891B2" />
          <stop offset="100%" stopColor="#0E7490" />
        </linearGradient>
      </defs>

      {/* Nodes */}
      {[
        { x: 80, y: 100, label: "Input", size: 30 },
        { x: 250, y: 80, label: "Process", size: 28 },
        { x: 420, y: 100, label: "Output", size: 30 },
        { x: 250, y: 250, label: "Analysis", size: 28 },
      ].map((node, i) => (
        <g key={`node-${i}`}>
          {/* Outer glow */}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.size + 12}
            fill="none"
            stroke="rgba(6, 182, 212, 0.2)"
            strokeWidth="2"
            style={{
              animation: "nodeGlow 2s ease-in-out infinite",
              animationDelay: `${i * 0.3}s`,
            }}
          />
          {/* Node */}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.size}
            fill="url(#dataFlowGrad)"
            stroke="rgba(6, 182, 212, 0.8)"
            strokeWidth="2"
          />
          {/* Center highlight */}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.size * 0.5}
            fill="rgba(255, 255, 255, 0.1)"
          />
          {/* Label */}
          <text
            x={node.x}
            y={node.y + 4}
            textAnchor="middle"
            fontSize="10"
            fill="white"
            fontFamily="Space Mono"
            fontWeight="bold"
          >
            {node.label}
          </text>
        </g>
      ))}

      {/* Connection paths */}
      {[
        {
          x1: 110,
          y1: 100,
          x2: 222,
          y2: 85,
          delay: 0,
        },
        {
          x1: 278,
          y1: 108,
          x2: 390,
          y2: 100,
          delay: 1,
        },
        {
          x1: 250,
          y1: 140,
          x2: 250,
          y2: 222,
          delay: 2,
        },
      ].map((path, i) => (
        <g key={`path-${i}`}>
          {/* Background line */}
          <line
            x1={path.x1}
            y1={path.y1}
            x2={path.x2}
            y2={path.y2}
            stroke="rgba(6, 182, 212, 0.15)"
            strokeWidth="3"
          />
          {/* Animated flow line */}
          <line
            x1={path.x1}
            y1={path.y1}
            x2={path.x2}
            y2={path.y2}
            stroke="url(#dataFlowGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              animation: "flowAnimation 2s ease-in-out infinite",
              animationDelay: `${path.delay}s`,
              strokeDasharray: `${Math.hypot(path.x2 - path.x1, path.y2 - path.y1)}`,
              strokeDashoffset: `${Math.hypot(path.x2 - path.x1, path.y2 - path.y1)}`,
            }}
          />
        </g>
      ))}

      {/* Data packets - moving particles */}
      {[
        { path: "M 110 100 L 222 85", delay: 0, duration: 2 },
        { path: "M 278 108 L 390 100", delay: 1, duration: 2 },
        { path: "M 250 140 L 250 222", delay: 2, duration: 2 },
      ].map((packet, i) => (
        <g key={`packet-${i}`}>
          <circle
            cx="110"
            cy="100"
            r="5"
            fill="#06B6D4"
            opacity="0.8"
            style={{
              animation: `movePacket 2s ease-in-out infinite`,
              animationDelay: `${packet.delay}s`,
            }}
          />
        </g>
      ))}

      {/* Statistics */}
      <g fontSize="11" fill="rgba(6, 182, 212, 0.6)" fontFamily="Space Mono">
        <text x="20" y="360">
          Throughput: 1.2 GB/s
        </text>
        <text x="20" y="380">
          Latency: {"<"}12ms
        </text>
        <text x="280" y="360" textAnchor="middle">
          Processing
        </text>
        <text x="280" y="380" textAnchor="middle">
          Real-time Analysis
        </text>
        <text x="460" y="360" textAnchor="end">
          Accuracy: 99.2%
        </text>
        <text x="460" y="380" textAnchor="end">
          Status: Active
        </text>
      </g>

      <style>{`
        @keyframes nodeGlow {
          0%, 100% {
            r: 42px;
            opacity: 0.3;
          }
          50% {
            r: 48px;
            opacity: 0.1;
          }
        }
        @keyframes flowAnimation {
          0% {
            stroke-dashoffset: 100%;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0%;
            opacity: 0;
          }
        }
        @keyframes movePacket {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(var(--end-x), var(--end-y));
          }
        }
      `}</style>
    </svg>
  );
};
