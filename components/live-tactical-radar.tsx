"use client";

import { useEffect, useRef, useMemo } from "react";

interface ThreatBlip {
  id: string;
  class: string;
  confidence: number;
  threat_level?: string;
}

interface LiveTacticalRadarProps {
  threats: ThreatBlip[];
  size?: number;
  className?: string;
}

// Deterministically place blips at stable angles based on id hash
function stableAngle(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  return (Math.abs(h) % 360);
}
function stableRadius(id: string, min = 0.2, max = 0.85): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) & 0xffffffff;
  return min + (Math.abs(h) % 1000) / 1000 * (max - min);
}

function threatColor(level?: string, confidence = 0): string {
  const lvl = (level || "").toUpperCase();
  if (lvl === "CRITICAL") return "#ef4444";
  if (lvl === "HIGH") return "#f97316";
  if (lvl === "MEDIUM" || lvl === "MODERATE") return "#eab308";
  if (lvl === "LOW") return "#10b981";
  // Fallback: confidence-based
  if (confidence > 70) return "#ef4444";
  if (confidence > 40) return "#f97316";
  return "#10b981";
}

export function LiveTacticalRadar({ threats, size = 300, className = "" }: LiveTacticalRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const sweepAngleRef = useRef(0);

  const blips = useMemo(() => threats.map(t => {
    const angle = stableAngle(t.id);
    const r = stableRadius(t.id);
    const color = threatColor(t.threat_level, t.confidence);
    return { ...t, angle, r, color };
  }), [threats]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2 - 6;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);

      // Background
      ctx.fillStyle = "#020c14";
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.fill();

      // Outer border glow
      const borderGrad = ctx.createRadialGradient(cx, cy, maxR - 3, cx, cy, maxR + 1);
      borderGrad.addColorStop(0, "rgba(6,182,212,0.4)");
      borderGrad.addColorStop(1, "rgba(6,182,212,0)");
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.stroke();

      // Concentric rings
      [0.25, 0.5, 0.75, 1.0].forEach(f => {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * f, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(6,182,212,0.12)";
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Cross-hairs
      ctx.strokeStyle = "rgba(6,182,212,0.1)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.stroke();
      ctx.setLineDash([]);

      // Diagonal lines
      ctx.strokeStyle = "rgba(6,182,212,0.06)";
      [45, 135].forEach(deg => {
        const rad = (deg * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(rad) * maxR, cy - Math.sin(rad) * maxR);
        ctx.lineTo(cx + Math.cos(rad) * maxR, cy + Math.sin(rad) * maxR);
        ctx.stroke();
      });

      // Sweep gradient (trailing glow)
      const sweepRad = (sweepAngleRef.current * Math.PI) / 180;
      const numTrail = 60;
      for (let i = numTrail; i >= 0; i--) {
        const trailAngle = sweepRad - (i * Math.PI) / 180;
        const alpha = (1 - i / numTrail) * 0.18;
        // Manual trailing sector sweep

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, trailAngle - Math.PI / 180, trailAngle);
        ctx.fillStyle = `rgba(6,182,212,${alpha})`;
        ctx.fill();
      }

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepRad) * maxR, cy + Math.sin(sweepRad) * maxR);
      ctx.strokeStyle = "rgba(6,182,212,0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner bright dot at center (radar origin)
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
      coreGrad.addColorStop(0, "rgba(6,182,212,1)");
      coreGrad.addColorStop(1, "rgba(6,182,212,0)");
      ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad; ctx.fill();

      // Threat blips
      blips.forEach(b => {
        const blipAngle = (b.angle * Math.PI) / 180;
        const blipR = b.r * maxR;
        const bx = cx + Math.cos(blipAngle) * blipR;
        const by = cy + Math.sin(blipAngle) * blipR;

        // Glow
        const glowR = ctx.createRadialGradient(bx, by, 0, bx, by, 14);
        glowR.addColorStop(0, b.color + "88");
        glowR.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(bx, by, 14, 0, Math.PI * 2);
        ctx.fillStyle = glowR; ctx.fill();

        // Blip dot
        ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Blip ring pulse (when near sweep)
        const sweepDiff = Math.abs(((sweepAngleRef.current - b.angle + 360) % 360));
        if (sweepDiff < 30 || sweepDiff > 330) {
          const pulseAlpha = 1 - sweepDiff / 30;
          ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2);
          ctx.strokeStyle = b.color + Math.round(pulseAlpha * 255).toString(16).padStart(2, "0");
          ctx.lineWidth = 1.5; ctx.stroke();
        }

        // Class label (small)
        ctx.fillStyle = b.color + "cc";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText(b.class.split(" ")[0].substring(0, 7).toUpperCase(), bx, by - 10);
      });

      // Compass labels
      ctx.fillStyle = "rgba(6,182,212,0.35)";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const labels = [["N", cx, cy - maxR + 12], ["S", cx, cy + maxR - 12], ["E", cx + maxR - 12, cy], ["W", cx - maxR + 12, cy]];
      labels.forEach(([l, x, y]) => ctx.fillText(l as string, x as number, y as number));

      // Range ticks
      ctx.fillStyle = "rgba(6,182,212,0.25)";
      ctx.font = "6px monospace";
      ctx.textAlign = "left";
      [0.25, 0.5, 0.75].forEach((f, i) => {
        const ranges = ["5 NM", "10 NM", "15 NM"];
        ctx.fillText(ranges[i], cx + 4, cy - maxR * f);
      });

      // Advance sweep
      sweepAngleRef.current = (sweepAngleRef.current + 1.2) % 360;
      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [blips, size]);

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-full"
        style={{ imageRendering: "pixelated" }}
      />
      {/* Active threats count badge */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-4 text-[9px] font-space-mono">
        <span className="text-cyan-400/60">Active&nbsp;Threats:&nbsp;<span className="text-cyan-300 font-bold">{threats.length}</span></span>
        <span className="text-emerald-400/60">Live&nbsp;Tracking</span>
      </div>
    </div>
  );
}
