"use client";

import { useEffect, useRef, useState } from "react";

/**
 * SubmarineHUD — A full-screen canvas overlay that renders the inside of
 * a high-tech submarine control room: rotating radar sweep, sonar pings,
 * depth gauge, compass, scrolling data feed, pressure readouts, and
 * animated bulkhead elements. Purely decorative / pointer-events-none.
 */
export function SubmarineHUD() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = 0,
      H = 0;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ─── Sonar ping ripples ────────────────────────────────────────
    interface Ping {
      x: number;
      y: number;
      r: number;
      maxR: number;
      alpha: number;
      born: number;
    }
    const pings: Ping[] = [];
    let nextPing = 0;
    const spawnPing = (t: number) => {
      pings.push({
        x: W * (0.15 + Math.random() * 0.7),
        y: H * (0.15 + Math.random() * 0.7),
        r: 0,
        maxR: 60 + Math.random() * 80,
        alpha: 0.25 + Math.random() * 0.15,
        born: t,
      });
    };

    // ─── Data stream columns ──────────────────────────────────────
    interface DataCol {
      x: number;
      chars: string[];
      y: number;
      speed: number;
      alpha: number;
    }
    const dataCols: DataCol[] = [];
    const hexChars = "0123456789ABCDEF:.-";
    for (let i = 0; i < 12; i++) {
      const chars: string[] = [];
      for (let j = 0; j < 18; j++)
        chars.push(hexChars[Math.floor(Math.random() * hexChars.length)]);
      dataCols.push({
        x: Math.random() * W,
        chars,
        y: Math.random() * H,
        speed: 0.3 + Math.random() * 0.5,
        alpha: 0.04 + Math.random() * 0.06,
      });
    }

    // ─── Gauge ticks helpers ──────────────────────────────────────
    const drawGauge = (
      cx: number,
      cy: number,
      radius: number,
      value: number,
      label: string,
      unit: string,
      t: number,
    ) => {
      ctx.save();
      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(6,182,212,0.12)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Tick marks
      for (let a = 0; a < 360; a += 15) {
        const rad = (a * Math.PI) / 180;
        const inner = a % 45 === 0 ? radius - 8 : radius - 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
        ctx.lineTo(cx + Math.cos(rad) * radius, cy + Math.sin(rad) * radius);
        ctx.strokeStyle =
          a % 45 === 0 ? "rgba(6,182,212,0.25)" : "rgba(6,182,212,0.1)";
        ctx.lineWidth = a % 45 === 0 ? 1.5 : 0.8;
        ctx.stroke();
      }

      // Needle
      const needleAngle =
        (-90 + value * 2.7 + Math.sin(t * 0.0008) * 3) * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(needleAngle) * (radius - 12),
        cy + Math.sin(needleAngle) * (radius - 12),
      );
      ctx.strokeStyle = "rgba(6,182,212,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(6,182,212,0.4)";
      ctx.fill();

      // Value text
      ctx.font = "bold 11px 'Space Mono', monospace";
      ctx.fillStyle = "rgba(6,182,212,0.35)";
      ctx.textAlign = "center";
      ctx.fillText(
        `${Math.floor(value + Math.sin(t * 0.001) * 2)}${unit}`,
        cx,
        cy + radius + 14,
      );

      // Label
      ctx.font = "8px 'Space Mono', monospace";
      ctx.fillStyle = "rgba(6,182,212,0.2)";
      ctx.fillText(label, cx, cy + radius + 25);
      ctx.restore();
    };

    // ─── Compass ──────────────────────────────────────────────────
    const drawCompass = (cx: number, cy: number, size: number, t: number) => {
      ctx.save();
      const bearing = (t * 0.003) % 360;
      // Background bar
      ctx.fillStyle = "rgba(10,22,40,0.5)";
      ctx.fillRect(cx - size / 2, cy - 10, size, 20);
      ctx.strokeStyle = "rgba(6,182,212,0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - size / 2, cy - 10, size, 20);

      // Bearing marks
      const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      ctx.font = "8px 'Space Mono', monospace";
      ctx.textAlign = "center";
      for (let i = 0; i < 36; i++) {
        const deg = i * 10;
        const offset = (((deg - bearing + 540) % 360) - 180) * (size / 360);
        if (Math.abs(offset) > size / 2 - 10) continue;
        const x = cx + offset;
        if (i % 4.5 === 0) {
          const dirIdx = Math.floor(i / 4.5) % 8;
          ctx.fillStyle =
            i === 0 ? "rgba(239,68,68,0.5)" : "rgba(6,182,212,0.3)";
          ctx.fillText(dirs[dirIdx], x, cy + 4);
        } else {
          ctx.beginPath();
          ctx.moveTo(x, cy - 5);
          ctx.lineTo(x, cy + 5);
          ctx.strokeStyle = "rgba(6,182,212,0.1)";
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Center marker
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 10);
      ctx.lineTo(cx, cy - 6);
      ctx.lineTo(cx + 4, cy - 10);
      ctx.strokeStyle = "rgba(6,182,212,0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bearing readout
      ctx.font = "bold 9px 'Space Mono', monospace";
      ctx.fillStyle = "rgba(6,182,212,0.3)";
      ctx.fillText(
        `BRG ${Math.floor(bearing).toString().padStart(3, "0")}°`,
        cx,
        cy + 22,
      );
      ctx.restore();
    };

    // ─── Bulkhead frame elements ──────────────────────────────────
    const drawBulkhead = () => {
      ctx.save();
      const bw = 3; // border thickness

      // Top-left bulkhead bracket
      ctx.strokeStyle = "rgba(100,120,140,0.08)";
      ctx.lineWidth = bw;
      ctx.beginPath();
      ctx.moveTo(0, 80);
      ctx.lineTo(0, 0);
      ctx.lineTo(80, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(8, 60);
      ctx.lineTo(8, 8);
      ctx.lineTo(60, 8);
      ctx.strokeStyle = "rgba(6,182,212,0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Top-right
      ctx.strokeStyle = "rgba(100,120,140,0.08)";
      ctx.lineWidth = bw;
      ctx.beginPath();
      ctx.moveTo(W, 80);
      ctx.lineTo(W, 0);
      ctx.lineTo(W - 80, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W - 8, 60);
      ctx.lineTo(W - 8, 8);
      ctx.lineTo(W - 60, 8);
      ctx.strokeStyle = "rgba(6,182,212,0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bottom-left
      ctx.strokeStyle = "rgba(100,120,140,0.08)";
      ctx.lineWidth = bw;
      ctx.beginPath();
      ctx.moveTo(0, H - 80);
      ctx.lineTo(0, H);
      ctx.lineTo(80, H);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(W, H - 80);
      ctx.lineTo(W, H);
      ctx.lineTo(W - 80, H);
      ctx.stroke();

      // Rivets (small dots at corners)
      const rivets = [
        [16, 16],
        [W - 16, 16],
        [16, H - 16],
        [W - 16, H - 16],
        [40, 16],
        [W - 40, 16],
        [16, 40],
        [W - 16, 40],
        [40, H - 16],
        [W - 40, H - 16],
        [16, H - 40],
        [W - 16, H - 40],
      ];
      for (const [rx, ry] of rivets) {
        ctx.beginPath();
        ctx.arc(rx, ry, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100,130,160,0.1)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rx, ry, 1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6,182,212,0.06)";
        ctx.fill();
      }

      // Horizontal panel seams
      ctx.setLineDash([12, 20]);
      ctx.strokeStyle = "rgba(100,120,140,0.04)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(100, H * 0.25);
      ctx.lineTo(W - 100, H * 0.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(100, H * 0.75);
      ctx.lineTo(W - 100, H * 0.75);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    };

    // ─── Side status panels ───────────────────────────────────────
    const drawSidePanel = (
      x: number,
      topY: number,
      w: number,
      items: { label: string; value: string; color: string }[],
      t: number,
    ) => {
      ctx.save();
      const h = items.length * 22 + 16;
      ctx.fillStyle = "rgba(10,22,40,0.3)";
      ctx.fillRect(x, topY, w, h);
      ctx.strokeStyle = "rgba(6,182,212,0.1)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x, topY, w, h);

      // Header line
      ctx.fillStyle = "rgba(6,182,212,0.15)";
      ctx.fillRect(x, topY, w, 1);

      items.forEach((item, i) => {
        const iy = topY + 14 + i * 22;
        ctx.font = "7px 'Space Mono', monospace";
        ctx.fillStyle = "rgba(148,163,184,0.25)";
        ctx.textAlign = "left";
        ctx.fillText(item.label, x + 8, iy);
        ctx.font = "bold 9px 'Space Mono', monospace";
        ctx.fillStyle = item.color;
        ctx.textAlign = "right";
        const flicker = Math.sin(t * 0.002 + i) * 0.05;
        ctx.globalAlpha = 0.3 + flicker;
        ctx.fillText(item.value, x + w - 8, iy);
        ctx.globalAlpha = 1;
      });
      ctx.restore();
    };

    // ─── Mini radar ───────────────────────────────────────────────
    const drawRadar = (cx: number, cy: number, r: number, t: number) => {
      ctx.save();

      // Background circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(10,22,40,0.4)";
      ctx.fill();
      ctx.strokeStyle = "rgba(6,182,212,0.15)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Grid rings
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (r / 3) * i, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(6,182,212,0.06)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Cross hairs
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
      ctx.strokeStyle = "rgba(6,182,212,0.06)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Sweep beam
      const sweepAngle = (t * 0.0015) % (Math.PI * 2);

      // Sweep trail (draw several arcs with decreasing opacity)
      for (let a = 0; a < 8; a++) {
        const angle = sweepAngle - a * 0.08;
        const alpha = 0.25 - a * 0.03;
        if (alpha <= 0) continue;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        ctx.strokeStyle = `rgba(6,182,212,${alpha})`;
        ctx.lineWidth = 1.5 - a * 0.1;
        ctx.stroke();
      }

      // Blips (fake contacts)
      const blips = [
        { a: 0.8, d: 0.6 },
        { a: 2.1, d: 0.4 },
        { a: 3.9, d: 0.8 },
        { a: 5.2, d: 0.3 },
        { a: 1.4, d: 0.9 },
      ];
      for (const blip of blips) {
        const angleDiff =
          (((sweepAngle - blip.a) % (Math.PI * 2)) + Math.PI * 2) %
          (Math.PI * 2);
        if (angleDiff < 1.5) {
          const alpha = Math.max(0, 0.6 - angleDiff * 0.4);
          const bx = cx + Math.cos(blip.a) * r * blip.d;
          const by = cy + Math.sin(blip.a) * r * blip.d;
          ctx.beginPath();
          ctx.arc(bx, by, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(6,182,212,${alpha})`;
          ctx.fill();
        }
      }

      // Label
      ctx.font = "7px 'Space Mono', monospace";
      ctx.fillStyle = "rgba(6,182,212,0.2)";
      ctx.textAlign = "center";
      ctx.fillText("SONAR", cx, cy + r + 12);

      ctx.restore();
    };

    // ─── Main animation loop ──────────────────────────────────────
    const animate = (t: number) => {
      ctx.clearRect(0, 0, W, H);

      // Bulkhead frame
      drawBulkhead();

      // Mini radar – bottom-left
      drawRadar(70, H - 90, 50, t);

      // Compass – top center
      drawCompass(W / 2, 20, Math.min(280, W * 0.35), t);

      // Gauges – bottom-right
      drawGauge(W - 65, H - 130, 35, 73, "DEPTH", "m", t);
      drawGauge(W - 65, H - 55, 30, 45, "PRESS", "atm", t);

      // Left status panel
      drawSidePanel(
        8,
        H * 0.35,
        110,
        [
          { label: "HULL INT", value: "98.2%", color: "rgba(16,185,129,0.5)" },
          { label: "REACTOR", value: "NOMINAL", color: "rgba(6,182,212,0.4)" },
          { label: "O₂ LEVEL", value: "21.4%", color: "rgba(16,185,129,0.4)" },
          { label: "TEMP", value: "18.7°C", color: "rgba(6,182,212,0.4)" },
          { label: "BALLAST", value: "TRIM", color: "rgba(251,191,36,0.4)" },
        ],
        t,
      );

      // Right status panel
      drawSidePanel(
        W - 118,
        H * 0.35,
        110,
        [
          { label: "SPEED", value: "12.4 KN", color: "rgba(6,182,212,0.4)" },
          {
            label: "HEADING",
            value: `${Math.floor((t * 0.003) % 360)
              .toString()
              .padStart(3, "0")}°`,
            color: "rgba(6,182,212,0.4)",
          },
          { label: "COMMS", value: "ACTIVE", color: "rgba(16,185,129,0.4)" },
          { label: "THREAT", value: "LOW", color: "rgba(16,185,129,0.5)" },
          { label: "POWER", value: "94.1%", color: "rgba(6,182,212,0.4)" },
        ],
        t,
      );

      // Data stream columns (matrix-style falling hex)
      ctx.font = "9px 'Space Mono', monospace";
      for (const col of dataCols) {
        col.y += col.speed;
        if (col.y > H + 200) {
          col.y = -200;
          col.x = Math.random() * W;
        }
        for (let j = 0; j < col.chars.length; j++) {
          const cy = col.y + j * 14;
          if (cy < 0 || cy > H) continue;
          // Randomly mutate characters for "live data" feel
          if (Math.random() < 0.01) {
            col.chars[j] =
              hexChars[Math.floor(Math.random() * hexChars.length)];
          }
          ctx.fillStyle = `rgba(6,182,212,${col.alpha})`;
          ctx.textAlign = "left";
          ctx.fillText(col.chars[j], col.x, cy);
        }
      }

      // Sonar pings
      if (t > nextPing) {
        spawnPing(t);
        nextPing = t + 3000 + Math.random() * 4000;
      }
      for (let i = pings.length - 1; i >= 0; i--) {
        const p = pings[i];
        const age = (t - p.born) / 1000;
        p.r = age * 60;
        const life = 1 - p.r / p.maxR;
        if (life <= 0) {
          pings.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(6,182,212,${life * p.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Scan line (slow horizontal sweep)
      const scanY = ((t * 0.02) % (H + 60)) - 30;
      ctx.fillStyle = "rgba(6,182,212,0.015)";
      ctx.fillRect(0, scanY, W, 2);
      const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      scanGrad.addColorStop(0, "rgba(6,182,212,0)");
      scanGrad.addColorStop(0.5, "rgba(6,182,212,0.02)");
      scanGrad.addColorStop(1, "rgba(6,182,212,0)");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 30, W, 60);

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[5]"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
