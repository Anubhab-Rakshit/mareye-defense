"use client";

import dynamic from "next/dynamic";

const GlobeWarRoom = dynamic(
  () => import("@/components/globe-war-room"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-950 pt-[128px] flex items-center justify-center">
        <div className="text-cyan-400 font-orbitron animate-pulse">
          INITIALIZING WAR ROOM...
        </div>
      </div>
    ),
  },
);

export default function WarRoomPage() {
  return <GlobeWarRoom />;
}
