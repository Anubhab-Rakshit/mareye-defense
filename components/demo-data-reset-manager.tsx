"use client";

import { useEffect } from "react";

const DEMO_RESET_FLAG_KEY = "mareye_demo_reset_done_v1";
const DETECTION_KEYS_TO_CLEAR = ["mareye_detections", "activeThreats"];

function clearDemoDetectionData() {
  for (const key of DETECTION_KEYS_TO_CLEAR) {
    localStorage.removeItem(key);
  }
}

export function DemoDataResetManager() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const alreadyReset = localStorage.getItem(DEMO_RESET_FLAG_KEY);
    if (alreadyReset) return;

    clearDemoDetectionData();
    localStorage.setItem(DEMO_RESET_FLAG_KEY, new Date().toISOString());

    // Notify mounted client components and force a one-time refresh so all views read clean data.
    window.dispatchEvent(new CustomEvent("mareye:demo-data-reset"));
    window.location.reload();
  }, []);

  return null;
}
