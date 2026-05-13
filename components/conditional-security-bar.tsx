"use client";

import { usePathname } from "next/navigation";
import {
  SecurityClassifiedBar,
  SecurityWatermark,
  SecurityPerimeter,
} from "./security-classified-bar";

const levelMap: Record<
  string,
  "TOP SECRET" | "SECRET" | "CLASSIFIED" | "RESTRICTED"
> = {
  "/": "CLASSIFIED",
  "/cnn": "SECRET",
  "/detection": "TOP SECRET",
  "/command-center": "TOP SECRET",
  "/analytics": "SECRET",
  "/intelligence": "TOP SECRET",
  "/war-room": "TOP SECRET",
  "/mission-planner": "TOP SECRET",
  "/threat-prediction": "TOP SECRET",
  "/contact": "CLASSIFIED",
  "/profile": "SECRET",
  "/try": "RESTRICTED",
  "/auth/login": "TOP SECRET",
  "/auth/register": "TOP SECRET",
};

export function ConditionalSecurityBar() {
  const pathname = usePathname();

  // Match the most specific path first
  const level =
    Object.entries(levelMap)
      .sort(([a], [b]) => b.length - a.length)
      .find(([path]) => pathname.startsWith(path))?.[1] || "CLASSIFIED";

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50">
        <SecurityClassifiedBar level={level} />
      </div>
      <SecurityWatermark />
      <SecurityPerimeter />
    </>
  );
}
