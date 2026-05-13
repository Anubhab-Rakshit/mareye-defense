"use client";

import { useEffect, useRef } from "react";

/**
 * BubbleCursor — Submarine interior ambient particles:
 *  • Rising air bubbles (slow, wobbly, varying sizes)
 *  • Tiny suspended sediment/plankton drifting slowly
 *  • Occasional bright "spark" particles from electronics
 *  • Depth-pressure micro-particles
 */

interface Bubble {
  x: number;
  y: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  vx: number;
  vy: number;
  wobblePhase: number;
  wobbleAmp: number;
  wobbleSpeed: number;
  type: "bubble" | "dust" | "spark";
  life: number;
  maxLife: number;
}

export function BubbleCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: Bubble[] = [];
    const BUBBLE_COUNT = 35;
    const DUST_COUNT = 50;
    const SPARK_COUNT = 8;

    let W = 0,
      H = 0;
    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawn bubbles (rise from bottom)
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: H * 0.3 + Math.random() * H * 0.7,
        size: Math.random() * 3 + 1.5,
        baseOpacity: Math.random() * 0.15 + 0.05,
        opacity: 0,
        vx: (Math.random() - 0.5) * 0.1,
        vy: -(Math.random() * 0.4 + 0.15), // rise upward
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp: Math.random() * 1.2 + 0.3,
        wobbleSpeed: Math.random() * 0.015 + 0.005,
        type: "bubble",
        life: 0,
        maxLife: Infinity,
      });
    }

    // Spawn dust/sediment (float slowly in all directions)
    for (let i = 0; i < DUST_COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 1.2 + 0.3,
        baseOpacity: Math.random() * 0.12 + 0.03,
        opacity: 0,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.06,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp: Math.random() * 0.5 + 0.1,
        wobbleSpeed: Math.random() * 0.003 + 0.001,
        type: "dust",
        life: 0,
        maxLife: Infinity,
      });
    }

    // Spawn sparks (tiny bright flashes)
    const spawnSpark = () => {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: Math.random() * 1.5 + 0.5,
        baseOpacity: 0.4 + Math.random() * 0.3,
        opacity: 0,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        wobblePhase: 0,
        wobbleAmp: 0,
        wobbleSpeed: 0,
        type: "spark",
        life: 0,
        maxLife: 60 + Math.random() * 120, // brief flash
      });
    };

    for (let i = 0; i < SPARK_COUNT; i++) spawnSpark();

    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = Math.min((time - lastTime) / 16.67, 3);
      lastTime = time;

      ctx.clearRect(0, 0, W, H);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += delta;

        if (p.type === "bubble") {
          p.wobblePhase += p.wobbleSpeed * delta;
          const wobbleX = Math.sin(p.wobblePhase) * p.wobbleAmp;

          p.x += (p.vx + wobbleX * 0.1) * delta;
          p.y += p.vy * delta;

          // Opacity breathing
          p.opacity = p.baseOpacity + Math.sin(p.wobblePhase * 0.6) * 0.04;

          // Wrap when reaching top
          if (p.y < -20) {
            p.y = H + 20;
            p.x = Math.random() * W;
            p.size = Math.random() * 3 + 1.5;
          }
          if (p.x < -20) p.x = W + 20;
          if (p.x > W + 20) p.x = -20;

          // Draw bubble with highlight
          const grad = ctx.createRadialGradient(
            p.x - p.size * 0.3,
            p.y - p.size * 0.3,
            0,
            p.x,
            p.y,
            p.size * 2,
          );
          grad.addColorStop(0, `rgba(120, 220, 255, ${p.opacity * 1.5})`);
          grad.addColorStop(0.3, `rgba(6, 182, 212, ${p.opacity})`);
          grad.addColorStop(0.7, `rgba(6, 182, 212, ${p.opacity * 0.3})`);
          grad.addColorStop(1, `rgba(6, 182, 212, 0)`);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Tiny highlight dot on bubble
          ctx.beginPath();
          ctx.arc(
            p.x - p.size * 0.25,
            p.y - p.size * 0.25,
            p.size * 0.2,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = `rgba(200, 240, 255, ${p.opacity * 0.8})`;
          ctx.fill();
        } else if (p.type === "dust") {
          p.wobblePhase += p.wobbleSpeed * delta;
          p.x += (p.vx + Math.sin(p.wobblePhase) * 0.05) * delta;
          p.y += (p.vy + Math.cos(p.wobblePhase * 0.7) * 0.03) * delta;
          p.opacity = p.baseOpacity + Math.sin(p.wobblePhase * 0.5) * 0.02;

          // Wrap
          if (p.x < -10) p.x = W + 10;
          if (p.x > W + 10) p.x = -10;
          if (p.y < -10) p.y = H + 10;
          if (p.y > H + 10) p.y = -10;

          // Simple soft dot
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          const dg = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.size * 1.5,
          );
          dg.addColorStop(0, `rgba(6, 182, 212, ${p.opacity})`);
          dg.addColorStop(1, `rgba(6, 182, 212, 0)`);
          ctx.fillStyle = dg;
          ctx.fill();
        } else if (p.type === "spark") {
          p.life += delta;
          if (p.life > p.maxLife) {
            particles.splice(i, 1);
            spawnSpark();
            continue;
          }
          const lifeRatio = p.life / p.maxLife;
          const sparkOpacity =
            lifeRatio < 0.2
              ? lifeRatio * 5 * p.baseOpacity
              : (1 - lifeRatio) * p.baseOpacity * 1.25;

          p.x += p.vx * delta * 0.5;
          p.y += p.vy * delta * 0.5;

          // Bright white-cyan flash
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
          const sg = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.size * 2,
          );
          sg.addColorStop(0, `rgba(200, 240, 255, ${sparkOpacity})`);
          sg.addColorStop(0.4, `rgba(6, 182, 212, ${sparkOpacity * 0.5})`);
          sg.addColorStop(1, `rgba(6, 182, 212, 0)`);
          ctx.fillStyle = sg;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
