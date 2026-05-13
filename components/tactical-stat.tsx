"use client";

import type React from "react";

interface TacticalStatProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "stable";
  variant?: "primary" | "secondary" | "success" | "warning" | "danger";
}

export default function TacticalStat({
  label,
  value,
  unit,
  icon,
  trend,
  variant = "primary",
}: TacticalStatProps) {
  const colorMap = {
    primary: "text-cyan-300",
    secondary: "text-emerald-400",
    success: "text-green-400",
    warning: "text-yellow-400",
    danger: "text-red-400",
  };

  const bgColorMap = {
    primary: "from-cyan-500/10 to-cyan-500/5",
    secondary: "from-emerald-500/10 to-emerald-500/5",
    success: "from-green-500/10 to-green-500/5",
    warning: "from-yellow-500/10 to-yellow-500/5",
    danger: "from-red-500/10 to-red-500/5",
  };

  return (
    <div
      className={`border border-cyan-500/20 rounded-lg p-4 bg-gradient-to-br ${bgColorMap[variant]} backdrop-blur-xl`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 mb-2">{label}</p>
          <div className="flex items-baseline gap-2">
            <div
              className={`text-2xl font-bold font-space-mono ${colorMap[variant]}`}
            >
              {value}
            </div>
            {unit && <span className="text-xs text-slate-400">{unit}</span>}
          </div>
        </div>
        {icon && <div className={colorMap[variant]}>{icon}</div>}
      </div>
      {trend && (
        <div className="mt-2 text-xs text-slate-400">
          {trend === "up" && <span>▲ Increasing</span>}
          {trend === "down" && <span>▼ Decreasing</span>}
          {trend === "stable" && <span>→ Stable</span>}
        </div>
      )}
    </div>
  );
}
