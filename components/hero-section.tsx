"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SonarGridBackground } from "@/components/sonar-grid-background"
import { TacticalCornerBrackets } from "@/components/tactical-corner-brackets"
import { AnimatedCounter } from "@/components/animated-counter"
import { SubmarineSonarSVG } from "@/components/custom-svgs/submarine-sonar"
import { ArrowRight, Shield, Crosshair, AlertTriangle } from "lucide-react"

interface HeroStats {
  speciesIdentified: number
  waterQualityPoints: number
  conservationProjects: number
}

export function HeroSection() {
  const router = useRouter()
  const [stats, setStats] = useState<HeroStats>({
    speciesIdentified: 0,
    waterQualityPoints: 0,
    conservationProjects: 0,
  })
  const [loading, setLoading] = useState(true)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    fetchHeroStats()
  }, [])

  const fetchHeroStats = async () => {
    try {
      const response = await fetch("/api/dashboard-data?timeframe=all")
      if (response.ok) {
        const data = await response.json()
        setStats({
          speciesIdentified: data.totalSpecies || 0,
          waterQualityPoints: data.waterQualityPoints || 0,
          conservationProjects: data.conservationProjects || 0,
        })
      }
    } catch (error) {
      console.error("Failed to fetch hero stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToSolutions = () => {
    router.push("/subscription")
  }

  const scrollToData = () => {
    router.push("/solutions/data-collection")
  }

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <SonarGridBackground />

      {/* Premium background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/50 to-slate-950/80" />

      {/* Animated accent blobs - Premium effect */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div
          className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-3xl opacity-20"
          style={{
            animation: "float 6s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-15"
          style={{
            animation: "float 8s ease-in-out infinite reverse",
            animationDelay: "1s",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content - Premium messaging */}
          <div className="space-y-8">
            {/* Premium badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/15 to-blue-500/10 border border-cyan-400/40 backdrop-blur-sm hover:border-cyan-400/60 transition-all duration-300 w-fit group cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-space-mono font-bold tracking-widest text-cyan-300 uppercase">
                ADVANCED DETECTION ACTIVE
              </span>
            </div>

            {/* Premium headline */}
            <div className="space-y-6">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-orbitron font-black text-balance leading-tight tracking-wider">
                <span className="block text-white drop-shadow-2xl">MAREYE</span>
                <span className="block bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent animate-pulse duration-4000">
                  COMMAND CENTER
                </span>
              </h1>
              <p className="text-lg md:text-xl text-cyan-100/80 text-pretty max-w-2xl leading-relaxed font-space-mono">
                Next-generation AI-powered marine security platform with real-time submarine detection, threat analysis, 
                and mission coordination for advanced naval operations.
              </p>
            </div>

            {/* Premium capability badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {[
                { icon: Shield, label: "SUBMARINE DETECTION", color: "cyan" },
                { icon: Crosshair, label: "THREAT ANALYSIS", color: "blue" },
                { icon: AlertTriangle, label: "REAL-TIME ALERTS", color: "red" },
              ].map((item, idx) => {
                const Icon = item.icon
                const colorMap = {
                  cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-400/40 hover:border-cyan-400/80",
                  blue: "from-blue-500/20 to-blue-600/10 border-blue-400/40 hover:border-blue-400/80",
                  red: "from-red-500/20 to-red-600/10 border-red-400/40 hover:border-red-400/80",
                }
                return (
                  <div
                    key={idx}
                    className={`group relative p-4 rounded-lg bg-gradient-to-br ${colorMap[item.color as keyof typeof colorMap]} backdrop-blur-xl border transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer`}
                  >
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative z-10 flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${item.color === "cyan" ? "bg-cyan-500/30" : item.color === "blue" ? "bg-blue-500/30" : "bg-red-500/30"} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-5 w-5 ${item.color === "cyan" ? "text-cyan-300" : item.color === "blue" ? "text-blue-300" : "text-red-300"}`} />
                      </div>
                      <span className="font-orbitron font-bold text-xs text-white tracking-wide group-hover:translate-x-1 transition-transform">
                        {item.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Premium CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <button
                onClick={scrollToSolutions}
                className="group relative px-8 py-4 rounded-lg font-orbitron font-bold text-white uppercase tracking-wider overflow-hidden text-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center justify-center space-x-2">
                  <span>LAUNCH SYSTEM</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </span>
              </button>

              <button
                onClick={scrollToData}
                className="group relative px-8 py-4 rounded-lg font-orbitron font-bold text-cyan-300 uppercase tracking-wider overflow-hidden text-sm border-2 border-cyan-500/50 hover:border-cyan-400 transition-all"
              >
                <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center justify-center space-x-2">
                  <span>VIEW CAPABILITIES</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </span>
              </button>
            </div>

            {/* Premium stats display */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-cyan-500/20">
              {[
                { value: stats.speciesIdentified, label: "TARGETS TRACKED", suffix: "+" },
                { value: stats.waterQualityPoints, label: "SYSTEMS ACTIVE", suffix: "%" },
                { value: stats.conservationProjects, label: "MISSIONS COMPLETED", suffix: "+" },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-2xl md:text-3xl font-orbitron font-black text-cyan-300 mb-2">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-xs font-space-mono text-cyan-300/60 uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Premium SVG visualization */}
          <div className="relative h-96 md:h-full min-h-96 hidden lg:flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent rounded-3xl" />
            <div className="relative w-full h-full">
              <SubmarineSonarSVG />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(20px);
          }
        }
      `}</style>
    </section>
  )
}
