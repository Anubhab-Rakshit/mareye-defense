"use client";

import dynamic from "next/dynamic";

const AIThreatPrediction = dynamic(
  () => import("@/components/ai-threat-prediction"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-950 pt-[128px] flex items-center justify-center">
        <div className="text-cyan-400 font-orbitron animate-pulse">
          INITIALIZING THREAT ENGINE...
        </div>
      </div>
    ),
  },
);

export default function ThreatPredictionPage() {
  return <AIThreatPrediction />;
}
