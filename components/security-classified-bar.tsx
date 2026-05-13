"use client";

import { useEffect, useState } from "react";

interface SecurityClassifiedBarProps {
  level?: "TOP SECRET" | "SECRET" | "CLASSIFIED" | "RESTRICTED";
  showTimer?: boolean;
}

export function SecurityClassifiedBar({
  level = "CLASSIFIED",
  showTimer = true,
}: SecurityClassifiedBarProps) {
  const [time, setTime] = useState("");
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    // Generate session ID
    setSessionId(
      `SES-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    );

    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour12: false,
          timeZone: "Asia/Kolkata",
        }) + " IST",
      );
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      {/* Top classified bar */}
      <div className="classified-bar">
        {level} // INDIAN NAVAL COMMAND // MAREYE DEFENSE SYSTEM // {level}
      </div>

      {/* Security info strip below */}
      <div className="bg-slate-950/95 border-b border-cyan-500/20 px-4 py-1.5 flex items-center justify-between text-[9px] font-space-mono tracking-widest relative z-50">
        <div className="flex items-center gap-4">
          <span className="access-level access-level-classified">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
            CLEARANCE: LEVEL 5
          </span>
          <span className="text-cyan-500/50">SESSION: {sessionId}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-cyan-500/50">ENCRYPTION: AES-256-GCM</span>
          {showTimer && (
            <span className="text-cyan-400/70 font-orbitron">{time}</span>
          )}
        </div>
      </div>
    </>
  );
}

export function SecurityWatermark() {
  return (
    <div className="security-watermark" aria-hidden="true">
      CLASSIFIED
    </div>
  );
}

export function SecurityPerimeter() {
  return <div className="security-perimeter" aria-hidden="true" />;
}

export function SecurityFooter() {
  return (
    <div className="relative z-20 border-t border-cyan-500/20 bg-slate-950/90 backdrop-blur-md">
      <div className="classified-bar">
        CLASSIFIED // MINISTRY OF DEFENCE // GOVERNMENT OF INDIA // CLASSIFIED
      </div>
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center border border-amber-500/50">
            <span className="text-amber-300 text-xs font-orbitron font-black">
              ⚓
            </span>
          </div>
          <div>
            <p className="text-[10px] text-cyan-300/60 font-space-mono uppercase tracking-wider">
              Indian Naval Command • MarEye AI Defense System
            </p>
            <p className="text-[8px] text-cyan-500/40 font-space-mono">
              Authorized Personnel Only • All Activities Monitored & Logged
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <span className="security-badge">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            System Secure
          </span>
          <span className="text-[8px] text-cyan-500/40 font-space-mono">
            v4.2.1
          </span>
        </div>
      </div>
    </div>
  );
}
