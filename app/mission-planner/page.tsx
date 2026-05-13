"use client";

import dynamic from "next/dynamic";

const TacticalMissionPlanner = dynamic(
  () => import("@/components/tactical-mission-planner"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-950 pt-[128px] flex items-center justify-center">
        <div className="text-cyan-400 font-orbitron animate-pulse">
          LOADING MISSION PLANNER...
        </div>
      </div>
    ),
  },
);

export default function MissionPlannerPage() {
  return <TacticalMissionPlanner />;
}
