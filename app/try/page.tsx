"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useRef } from "react";
import { VideoBackground } from "@/components/video-background";
import { SonarGridBackground } from "@/components/sonar-grid-background";
import { SecurityFooter } from "@/components/security-classified-bar";
import {
  useScrollAnimation,
  useMouseParallax,
} from "@/hooks/use-scroll-animation";
import {
  Target,
  Anchor,
  Shield,
  Eye,
  Radar,
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

function RevealSection({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.15,
    triggerOnce: true,
  });
  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        transitionDelay: `${delay}s`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(30px)",
      }}
    >
      {children}
    </div>
  );
}

export default function TryPage() {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const mouseOffset = useMouseParallax(0.01);

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Pre-compute stable random positions for particles
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        left: `${(i * 37 + 13) % 100}%`,
        top: `${(i * 53 + 7) % 100}%`,
        size: `${(i % 4) + 1}px`,
        delay: `${(i * 0.7) % 5}s`,
        duration: `${((i * 1.3) % 4) + 3}s`,
      })),
    [],
  );

  const orbs = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        left: `${(i * 23 + 10) % 90}%`,
        top: `${(i * 31 + 5) % 80}%`,
        size: `${200 + i * 60}px`,
        delay: `${i * 2}s`,
        duration: `${8 + i * 2}s`,
      })),
    [],
  );

  const features = [
    {
      icon: Target,
      title: "Submarine Detection",
      desc: "AI-powered detection for identifying submarines and underwater vehicles using sonar and visual recognition.",
      color: "cyan",
    },
    {
      icon: Shield,
      title: "Mine Identification",
      desc: "Intelligent mine detection and classification for underwater explosive threat assessment.",
      color: "blue",
    },
    {
      icon: Eye,
      title: "Diver Tracking",
      desc: "Real-time diver monitoring and tracking for underwater security operations.",
      color: "teal",
    },
    {
      icon: Radar,
      title: "Threat Assessment",
      desc: "Comprehensive threat analysis and risk evaluation for marine defense planning.",
      color: "cyan",
    },
  ];

  const colorMap: Record<
    string,
    { border: string; bg: string; dot: string; text: string; textBody: string }
  > = {
    cyan: {
      border: "border-cyan-400/20 hover:border-cyan-400/40",
      bg: "from-cyan-400/10 to-blue-400/10",
      dot: "bg-cyan-400",
      text: "text-cyan-100",
      textBody: "text-cyan-200/70",
    },
    blue: {
      border: "border-blue-400/20 hover:border-blue-400/40",
      bg: "from-blue-400/10 to-teal-400/10",
      dot: "bg-blue-400",
      text: "text-blue-100",
      textBody: "text-blue-200/70",
    },
    teal: {
      border: "border-teal-400/20 hover:border-teal-400/40",
      bg: "from-teal-400/10 to-cyan-400/10",
      dot: "bg-teal-400",
      text: "text-teal-100",
      textBody: "text-teal-200/70",
    },
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950">
      <VideoBackground />
      <SonarGridBackground />

      {/* Porthole glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border-[8px] border-slate-700/10" />
        <div className="absolute inset-4 rounded-full border border-cyan-500/5" />
        <div className="absolute inset-8 rounded-full border border-dashed border-cyan-500/[0.03]" />
        <div className="absolute inset-0 rounded-full bg-gradient-radial from-cyan-500/[0.02] to-transparent" />
      </div>

      {/* Submarine hull ambient glow */}
      <div
        className="absolute top-1/3 -left-40 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "8s" }}
      />
      <div
        className="absolute bottom-1/3 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "12s" }}
      />

      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {orbs.map((orb, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full bg-gradient-to-r from-cyan-400/10 via-blue-400/5 to-teal-400/10 blur-3xl animate-pulse"
            style={{
              left: orb.left,
              top: orb.top,
              width: orb.size,
              height: orb.size,
              animationDelay: orb.delay,
              animationDuration: orb.duration,
              transform: `translate(${mouseOffset.x * 0.5}px, ${mouseOffset.y * 0.5}px)`,
            }}
          />
        ))}
      </div>

      {/* Subtle particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={`p-${i}`}
            className="absolute rounded-full bg-cyan-400/25 animate-pulse"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      {/* HUD Overlay - Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start pointer-events-none">
        {/* System Status */}
        <div
          className="transition-all duration-700 delay-500"
          style={{
            opacity: heroLoaded ? 1 : 0,
            transform: heroLoaded ? "translateX(0)" : "translateX(-20px)",
          }}
        >
          <div className="glass-light rounded-lg p-3 space-y-1.5">
            {[
              { name: "AI Processing", status: "Active" },
              { name: "Analysis Engine", status: "Online" },
            ].map((sys, i) => (
              <div
                key={sys.name}
                className="flex items-center gap-2 text-[10px] font-space-mono"
              >
                <div
                  className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.5}s` }}
                />
                <span className="text-cyan-200/60 uppercase tracking-wider">
                  {sys.name}
                </span>
                <span className="text-emerald-300/80 font-bold">
                  {sys.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Depth Indicator */}
        <div
          className="transition-all duration-700 delay-700"
          style={{
            opacity: heroLoaded ? 1 : 0,
            transform: heroLoaded ? "translateX(0)" : "translateX(20px)",
          }}
        >
          <div className="glass-light rounded-lg p-3">
            <div className="text-[10px] text-cyan-300/50 font-space-mono uppercase tracking-widest mb-2 font-bold">
              Ocean Depth
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-1.5 h-14 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="absolute bottom-0 w-full bg-gradient-to-t from-cyan-500 to-blue-400 rounded-full animate-pulse"
                  style={{ height: "75%", animationDuration: "3s" }}
                />
              </div>
              <div>
                <div className="text-base font-black text-cyan-100 font-orbitron">
                  3,847m
                </div>
                <div className="text-[10px] text-cyan-300/40 font-space-mono uppercase tracking-wider">
                  Abyssal Zone
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Environmental Readings */}
      <div
        className="absolute top-28 right-4 z-20 pointer-events-none transition-all duration-700 delay-[900ms]"
        style={{
          opacity: heroLoaded ? 1 : 0,
          transform: heroLoaded ? "translateY(0)" : "translateY(15px)",
        }}
      >
        <div className="glass-light rounded-lg p-3">
          <div className="text-[10px] text-cyan-300/50 font-space-mono uppercase tracking-widest mb-2 font-bold">
            Environmental Data
          </div>
          <div className="space-y-1.5 text-[10px] font-space-mono">
            {[
              { label: "Temperature", value: "2.1°C" },
              { label: "Pressure", value: "384 atm" },
              { label: "Salinity", value: "34.7 ppt" },
            ].map((d) => (
              <div key={d.label} className="flex justify-between gap-6">
                <span className="text-cyan-200/40 uppercase tracking-wider">
                  {d.label}
                </span>
                <span className="text-cyan-100/70 font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col min-h-screen items-center justify-center px-6 pt-20">
        <div className="text-center max-w-5xl mx-auto">
          {/* Logo & Badge */}
          <div
            className="mb-10 flex flex-col items-center transition-all duration-700"
            style={{
              opacity: heroLoaded ? 1 : 0,
              transform: heroLoaded ? "translateY(0)" : "translateY(20px)",
            }}
          >
            <div className="relative flex items-center gap-4 mb-6">
              <div className="relative">
                <div
                  className="absolute -inset-4 rounded-full border border-dashed border-cyan-500/10 animate-spin"
                  style={{ animationDuration: "30s" }}
                />
                <div
                  className="absolute -inset-2 rounded-full border border-dotted border-blue-500/10 animate-spin"
                  style={{
                    animationDuration: "20s",
                    animationDirection: "reverse",
                  }}
                />
                <div
                  className="absolute -inset-6 rounded-full border border-cyan-500/5 animate-ping"
                  style={{ animationDuration: "4s" }}
                />
                <div className="absolute inset-0 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 blur-lg opacity-50 animate-pulse" />
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center shadow-2xl">
                  <Anchor className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black gradient-text-cyan font-orbitron tracking-wider">
                  AI-DRIVEN
                </h3>
                <p className="text-sm text-cyan-200/60 font-space-mono font-bold tracking-widest">
                  MAREYE
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/5 border border-emerald-500/15 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-space-mono text-emerald-300/60 font-bold uppercase tracking-widest">
                Defense System Online
              </span>
            </div>
          </div>

          {/* Hero Title */}
          <div className="mb-8 relative">
            <div
              className="transition-all duration-700 delay-150"
              style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded
                  ? "translateY(0) scale(1)"
                  : "translateY(30px) scale(0.95)",
              }}
            >
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-black font-orbitron mb-3 leading-none tracking-tight">
                <span className="gradient-text-ocean">MAR</span>{" "}
                <span className="text-white text-glow-cyan">EYE</span>
              </h1>
            </div>
            <div
              className="transition-all duration-700 delay-300"
              style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "translateY(0)" : "translateY(20px)",
              }}
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-orbitron gradient-text-cyan mb-2 leading-none">
                MARINE
              </h2>
            </div>
            <div
              className="transition-all duration-700 delay-[450ms]"
              style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "translateY(0)" : "translateY(20px)",
              }}
            >
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-space-mono text-cyan-300/60 tracking-widest">
                SECURITY PLATFORM
              </h3>
            </div>
          </div>

          {/* Subtitle */}
          <div
            className="relative mb-12 transition-all duration-700 delay-[600ms]"
            style={{
              opacity: heroLoaded ? 1 : 0,
              transform: heroLoaded ? "translateY(0)" : "translateY(20px)",
            }}
          >
            <p className="text-lg md:text-xl text-cyan-200/50 max-w-3xl mx-auto leading-relaxed font-space-mono">
              Revolutionizing marine security through{" "}
              <span className="text-cyan-300/80 font-bold">
                advanced AI-powered
              </span>{" "}
              submarine detection, mine identification, and{" "}
              <span className="text-emerald-300/80 font-bold">
                threat assessment
              </span>{" "}
              for underwater defense systems.
            </p>
          </div>

          {/* Feature Cards */}
          <RevealSection>
            <div className="grid gap-4 md:grid-cols-2 mb-14 max-w-4xl mx-auto">
              {features.map((f, i) => {
                const c = colorMap[f.color];
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="relative group"
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    <div
                      className={`glass-card rounded-xl p-5 ${c.border} transition-all duration-300 hover-lift relative overflow-hidden`}
                    >
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-500/25" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-500/25" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-500/25" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-500/25" />
                      {/* Scan line on hover */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent animate-scan" />
                      </div>
                      <div className="flex items-center gap-3 mb-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg bg-${f.color}-500/10 border border-${f.color}-500/20 flex items-center justify-center`}
                        >
                          <Icon className={`w-4 h-4 text-${f.color}-400`} />
                        </div>
                        <h4
                          className={`text-sm font-black ${c.text} font-orbitron tracking-wider`}
                        >
                          {f.title.toUpperCase()}
                        </h4>
                      </div>
                      <p
                        className={`text-xs ${c.textBody} font-space-mono leading-relaxed`}
                      >
                        {f.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </RevealSection>

          {/* CTA Button */}
          <RevealSection delay={0.2}>
            <div className="relative mb-10">
              <Link
                href="/auth/login"
                className="relative inline-flex items-center gap-3 px-12 py-5 text-base font-black text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 rounded-2xl shadow-2xl shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:shadow-3xl transition-all duration-500 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 group overflow-hidden font-orbitron tracking-wider border border-cyan-400/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ boxShadow: "inset 0 0 30px rgba(6,182,212,0.2)" }}
                />
                <ShieldCheck className="relative w-5 h-5" />
                <span className="relative">ENTER COMMAND CENTER</span>
                <ArrowRight className="relative w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </RevealSection>

          {/* Scroll hint */}
          <div
            className="transition-all duration-700 delay-[1200ms]"
            style={{ opacity: heroLoaded ? 0.4 : 0 }}
          >
            <div
              className="flex flex-col items-center gap-1 animate-bounce"
              style={{ animationDuration: "2s" }}
            >
              <span className="text-[9px] font-space-mono text-cyan-300/40 uppercase tracking-widest">
                Scroll
              </span>
              <ChevronDown className="w-4 h-4 text-cyan-400/30" />
            </div>
          </div>
        </div>
      </div>

      {/* Security Footer */}
      <SecurityFooter />
    </div>
  );
}
