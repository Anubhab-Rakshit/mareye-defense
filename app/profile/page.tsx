"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Calendar,
  Camera,
  LogOut,
  Shield,
  CheckCircle2,
  Edit,
  Save,
  X,
  Activity,
  TrendingUp,
  Award,
  Settings,
  Lock,
  Bell,
  ArrowRight,
  Anchor,
  AlertTriangle,
  ShieldCheck,
  Radar,
} from "lucide-react";
import { SonarGridBackground } from "@/components/sonar-grid-background";
// Security elements are now provided globally via ConditionalSecurityBar in layout

interface ProfileData {
  firstName?: string;
  lastName?: string;
  dob?: string;
  email?: string;
  avatar?: string;
  subscription?: {
    plan?: string;
    status?: string;
  };
  tokens?: {
    dailyLimit?: number;
    usedToday?: number;
    totalUsed?: number;
  };
  latitude?: string;
  longitude?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ProfileData>>({});
  const [currentTime, setCurrentTime] = useState("");
  const [typedText, setTypedText] = useState("");
  const terminalLines = useRef<string[]>([
    "> INIT DOSSIER_VIEW v5.1.2",
    "> CLEARANCE: VERIFIED",
    "> BIOMETRIC MATCH: 99.8%",
    "> PERSONNEL FILE LOADED",
    "> STATUS: ALL SYSTEMS NOMINAL",
  ]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
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

  // Typewriter effect
  useEffect(() => {
    let lineIdx = 0;
    let charIdx = 0;
    let current = "";
    const typeInterval = setInterval(() => {
      if (lineIdx < terminalLines.current.length) {
        const line = terminalLines.current[lineIdx];
        if (charIdx < line.length) {
          current += line[charIdx];
          charIdx++;
          setTypedText(current);
        } else {
          current += "\n";
          lineIdx++;
          charIdx = 0;
        }
      } else {
        clearInterval(typeInterval);
      }
    }, 30);
    return () => clearInterval(typeInterval);
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        let data;
        try {
          data = await res.json();
        } catch {
          data = { error: "Invalid response from server" };
        }
        if (!res.ok) {
          setError(
            data?.error ?? data?.message ?? `Request failed (${res.status})`,
          );
          return;
        }
        if (!data.user) {
          setError("No user data received from server");
          return;
        }
        setProfile(data.user);
        setEditData(data.user);
      } catch (err) {
        setError(
          `Network error: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

  const handleEdit = () => {
    setIsEditing(true);
    // Load local coordinates if available
    const localLocation = localStorage.getItem('userLocation');
    const parsedLoc = localLocation ? JSON.parse(localLocation) : null;
    
    setEditData({
      ...profile,
      latitude: parsedLoc?.lat || profile?.latitude || "",
      longitude: parsedLoc?.lng || profile?.longitude || "",
    });
  };
  const handleCancel = () => {
    setIsEditing(false);
    setEditData(profile || {});
  };
  const handleSave = async () => {
    setIsEditing(false);
    
    // Save coordinates to local storage for the Map component
    if (editData.latitude && editData.longitude) {
      localStorage.setItem('userLocation', JSON.stringify({
        lat: parseFloat(editData.latitude),
        lng: parseFloat(editData.longitude)
      }));
    }
    
    // Optimistically update UI
    setProfile(prev => prev ? { ...prev, ...editData } : editData as ProfileData);
  };

  function logout() {
    fetch("/api/logout", { method: "POST", credentials: "include" }).finally(
      () => {
        try {
          localStorage.removeItem("profile");
          localStorage.removeItem("user");
        } catch {}
        router.push("/try");
      },
    );
  }

  /* ---------- LOADING STATE ---------- */
  if (loading) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a1628] to-slate-950">
        <SonarGridBackground />
        <div className="relative z-10 min-h-screen flex items-center justify-center pt-32">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div
                className="absolute -inset-8 rounded-full border border-dashed border-cyan-500/10 animate-spin"
                style={{ animationDuration: "30s" }}
              />
              <div
                className="absolute -inset-4 rounded-full border border-dotted border-amber-500/10 animate-spin"
                style={{
                  animationDuration: "20s",
                  animationDirection: "reverse",
                }}
              />
              <div className="absolute inset-0 bg-cyan-500/30 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
            </div>
            <p className="text-lg text-cyan-300/80 font-orbitron tracking-[0.3em] uppercase animate-pulse">
              Retrieving Dossier...
            </p>
            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse"
                style={{ width: "60%" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- ERROR STATE ---------- */
  if (error || !profile) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a1628] to-slate-950">
        <SonarGridBackground />
        <div className="relative z-10 min-h-screen flex items-start justify-center p-8 pt-28">
          <div className="max-w-lg w-full bg-slate-900/70 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-ambient-hum">
            <div className="bg-gradient-to-r from-red-900/30 via-red-800/20 to-red-900/30 px-4 py-2 border-b border-red-500/20 flex items-center justify-between">
              <span className="text-[8px] font-space-mono text-red-300/60 uppercase tracking-widest">
                Security Alert
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            </div>
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500/30" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-500/30" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-500/30" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500/30" />
            <div className="p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="relative w-12 h-12 bg-red-500/15 rounded-xl flex items-center justify-center border border-red-500/30">
                  <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-red-300 font-orbitron tracking-wider mb-0.5">
                    Access Denied
                  </h2>
                  <p className="text-[11px] text-red-300/60 font-space-mono">
                    {error ?? "No dossier returned"}
                  </p>
                </div>
              </div>

              {(error?.includes("Invalid or expired token") ||
                error?.includes("Authentication") ||
                error?.includes("session")) && (
                <div className="mb-5 p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg">
                  <p className="text-[11px] text-amber-200 mb-1 font-space-mono">
                    Your session has expired. Please re-authenticate.
                  </p>
                  <p className="text-[9px] text-amber-300/50 font-space-mono">
                    Sessions are valid for 30 days.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/auth/login")}
                  className="relative flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-orbitron text-[10px] tracking-[0.2em] uppercase rounded-lg border border-cyan-400/20 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:shadow-xl transition-all overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  Re-Authenticate
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2.5 bg-slate-800/60 border border-cyan-500/25 text-cyan-300 font-orbitron text-[10px] tracking-[0.2em] uppercase rounded-lg hover:border-cyan-400/40 transition-all"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      icon: Activity,
      label: "Daily Usage",
      value: `${profile.tokens?.usedToday || 0}/${profile.tokens?.dailyLimit || 10}`,
      color: "cyan",
    },
    {
      icon: TrendingUp,
      label: "Total Processed",
      value: profile.tokens?.totalUsed || 0,
      color: "blue",
    },
    {
      icon: Award,
      label: "Clearance",
      value: profile.subscription?.plan?.toUpperCase() || "BASIC",
      color: "emerald",
    },
    {
      icon: Shield,
      label: "Status",
      value: profile.subscription?.status?.toUpperCase() || "ACTIVE",
      color: "amber",
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a1628] to-slate-950">
      <SonarGridBackground />

      {/* Submarine hull ambient glow */}
      <div
        className="absolute top-1/3 -left-40 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "8s" }}
      />
      <div
        className="absolute bottom-1/3 -right-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "12s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-emerald-500/3 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "15s" }}
      />

      {/* Porthole glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border-[6px] border-slate-700/10" />
        <div className="absolute inset-4 rounded-full border border-cyan-500/5" />
        <div className="absolute inset-0 rounded-full bg-gradient-radial from-cyan-500/[0.015] to-transparent" />
      </div>

      <div className="relative z-10 min-h-screen pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Indian Defence Header with enhanced submarine animations */}
          <div className="text-center mb-6">
            <div className="relative inline-block mb-3">
              <div
                className="absolute -inset-6 rounded-full border border-dashed border-cyan-500/10 animate-spin"
                style={{ animationDuration: "40s" }}
              />
              <div
                className="absolute -inset-4 rounded-full border border-dotted border-amber-500/10 animate-spin"
                style={{
                  animationDuration: "25s",
                  animationDirection: "reverse",
                }}
              />
              <div
                className="absolute -inset-2 rounded-full border border-dashed border-cyan-500/15 animate-spin"
                style={{ animationDuration: "30s" }}
              />
              <div
                className="absolute -inset-8 rounded-full border border-cyan-500/5 animate-ping"
                style={{ animationDuration: "4s" }}
              />

              <div
                className="absolute inset-0 bg-cyan-500/15 rounded-full blur-2xl animate-pulse"
                style={{ animationDuration: "3s" }}
              />
              <div className="relative w-16 h-16 rounded-full border-2 border-amber-500/50 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shadow-2xl shadow-amber-500/10">
                <div className="absolute inset-1 rounded-full border border-amber-400/30" />
                <Anchor
                  className="w-7 h-7 text-amber-400/90 animate-pulse"
                  style={{ animationDuration: "4s" }}
                />
              </div>
            </div>
            <h1 className="font-orbitron text-sm font-bold tracking-[0.25em] text-amber-100/90 uppercase mb-1">
              Indian Naval Command
            </h1>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-px flex-1 max-w-16 bg-gradient-to-r from-transparent to-cyan-500/30" />
              <span className="text-[8px] font-space-mono text-cyan-300/50 uppercase tracking-[0.4em]">
                Personnel Dossier
              </span>
              <div className="h-px flex-1 max-w-16 bg-gradient-to-l from-transparent to-cyan-500/30" />
            </div>

            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[8px] font-space-mono text-emerald-300/60 uppercase tracking-wider">
                  TLS 1.3
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Radar
                  className="w-3 h-3 text-cyan-400/50 animate-spin"
                  style={{ animationDuration: "4s" }}
                />
                <span className="text-[8px] font-space-mono text-cyan-300/50 uppercase tracking-wider">
                  Secure Channel
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-amber-400/60" />
                <span className="text-[8px] font-space-mono text-amber-300/50 uppercase tracking-wider">
                  AES-256
                </span>
              </div>
            </div>
          </div>

          {/* Mini terminal readout */}
          <div className="mb-6 max-w-xl mx-auto bg-slate-950/60 border border-cyan-500/10 rounded-lg p-3 overflow-hidden max-h-20">
            <pre className="text-[8px] font-space-mono text-cyan-400/40 leading-relaxed whitespace-pre-wrap">
              {typedText}
              <span className="animate-pulse text-cyan-400/80"></span>
            </pre>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* ====== LEFT: OFFICER CARD ====== */}
            <div className="lg:col-span-1">
              <div className="relative bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-cyan-500/15 shadow-2xl shadow-black/40 overflow-hidden animate-ambient-hum">
                <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/20 to-cyan-900/30 px-4 py-2 border-b border-cyan-500/10 flex items-center justify-between">
                  <span className="text-[8px] font-space-mono text-cyan-300/40 uppercase tracking-widest">
                    Officer Identity
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"
                      style={{ animationDelay: "0.3s" }}
                    />
                    <span className="text-[7px] font-space-mono text-cyan-300/25 ml-1 uppercase">
                      ACTIVE
                    </span>
                  </div>
                </div>

                {/* Enhanced HUD corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40" />

                {/* Scan line in card */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-scan" />
                </div>

                <div className="p-6">
                  {/* Avatar with submarine rings */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative mb-3">
                      <div
                        className="absolute -inset-4 rounded-full border border-dashed border-cyan-500/15 animate-spin"
                        style={{ animationDuration: "25s" }}
                      />
                      <div
                        className="absolute -inset-2 rounded-full border border-dotted border-amber-500/10 animate-spin"
                        style={{
                          animationDuration: "18s",
                          animationDirection: "reverse",
                        }}
                      />
                      <div
                        className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse"
                        style={{ animationDuration: "3s" }}
                      />
                      <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/10 bg-slate-800">
                        {profile.avatar ? (
                          <img
                            src={profile.avatar}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-blue-500/10">
                            <User className="w-12 h-12 text-cyan-300/40" />
                          </div>
                        )}
                      </div>
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-cyan-600/80 hover:bg-cyan-500 rounded-full flex items-center justify-center border-2 border-slate-900 transition-all hover:scale-110 hover:shadow-lg hover:shadow-cyan-500/30">
                        <Camera className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <h2 className="text-lg font-bold text-white font-orbitron tracking-wider mb-1">
                      {profile.firstName || "Officer"} {profile.lastName || ""}
                    </h2>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-[9px] text-emerald-300 font-space-mono uppercase tracking-wider">
                        Verified Personnel
                      </span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-cyan-500/10 text-center hover:border-cyan-400/25 transition-all group">
                      <Activity className="w-4 h-4 text-cyan-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                      <div className="text-xl font-bold text-cyan-300 font-orbitron">
                        {profile.tokens?.usedToday || 0}
                      </div>
                      <div className="text-[8px] text-cyan-300/50 font-space-mono uppercase tracking-wider">
                        Today
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-blue-500/10 text-center hover:border-blue-400/25 transition-all group">
                      <TrendingUp className="w-4 h-4 text-blue-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                      <div className="text-xl font-bold text-blue-300 font-orbitron">
                        {profile.tokens?.totalUsed || 0}
                      </div>
                      <div className="text-[8px] text-blue-300/50 font-space-mono uppercase tracking-wider">
                        Total
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={isEditing ? handleSave : handleEdit}
                      className="relative w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 text-white font-orbitron text-[9px] tracking-[0.25em] uppercase overflow-hidden group border border-cyan-400/20 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <span
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          boxShadow: "inset 0 0 20px rgba(6,182,212,0.15)",
                        }}
                      />
                      {isEditing ? (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4" />
                          Edit Dossier
                        </>
                      )}
                    </button>
                    {isEditing && (
                      <button
                        onClick={handleCancel}
                        className="w-full py-2.5 bg-slate-800/50 border border-cyan-500/20 hover:border-cyan-400/40 text-cyan-300 rounded-lg font-orbitron text-[9px] tracking-[0.25em] uppercase flex items-center justify-center gap-2 transition-all"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={logout}
                      className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 hover:border-red-400/40 text-red-300 rounded-lg font-orbitron text-[9px] tracking-[0.25em] uppercase flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-red-500/10"
                    >
                      <LogOut className="w-4 h-4" />
                      Terminate Session
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-slate-900/80 via-cyan-900/10 to-slate-900/80 px-4 py-1.5 border-t border-cyan-500/10 flex items-center justify-between">
                  <span className="text-[7px] font-space-mono text-slate-600 uppercase tracking-wider">
                    Session: AES-256-GCM
                  </span>
                  <span className="text-[7px] font-space-mono text-slate-600 uppercase tracking-wider">
                    Protocol: TLS 1.3
                  </span>
                </div>
              </div>
            </div>

            {/* ====== RIGHT: DETAILS & STATS ====== */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Grid with enhanced animations */}
              <div className="grid sm:grid-cols-2 gap-4">
                {stats.map((stat, i) => (
                  <div
                    key={i}
                    className="relative bg-slate-900/70 backdrop-blur-xl rounded-xl border border-cyan-500/15 p-5 shadow-lg shadow-black/30 overflow-hidden group hover:border-cyan-400/30 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/5"
                  >
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-500/25 group-hover:border-cyan-400/40 transition-colors" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-500/25 group-hover:border-cyan-400/40 transition-colors" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-500/25 group-hover:border-cyan-400/40 transition-colors" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-500/25 group-hover:border-cyan-400/40 transition-colors" />
                    {/* Subtle scan line */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-scan" />
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <stat.icon
                        className={`w-6 h-6 group-hover:scale-110 transition-transform ${stat.color === "cyan" ? "text-cyan-400" : stat.color === "blue" ? "text-blue-400" : stat.color === "emerald" ? "text-emerald-400" : "text-amber-400"}`}
                      />
                      <span
                        className={`text-[8px] font-space-mono uppercase tracking-wider px-2 py-0.5 rounded border ${stat.color === "cyan" ? "text-cyan-300/70 bg-cyan-500/10 border-cyan-500/20" : stat.color === "blue" ? "text-blue-300/70 bg-blue-500/10 border-blue-500/20" : stat.color === "emerald" ? "text-emerald-300/70 bg-emerald-500/10 border-emerald-500/20" : "text-amber-300/70 bg-amber-500/10 border-amber-500/20"}`}
                      >
                        {stat.label}
                      </span>
                    </div>
                    <div
                      className={`text-3xl font-bold font-orbitron ${stat.color === "cyan" ? "text-cyan-300" : stat.color === "blue" ? "text-blue-300" : stat.color === "emerald" ? "text-emerald-300" : "text-amber-300"}`}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Account Details Card with enhanced submarine aesthetics */}
              <div className="relative bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-cyan-500/15 shadow-2xl shadow-black/40 overflow-hidden animate-ambient-hum">
                <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/20 to-cyan-900/30 px-4 py-2 border-b border-cyan-500/10 flex items-center justify-between">
                  <span className="text-[8px] font-space-mono text-cyan-300/40 uppercase tracking-widest">
                    Account Details Terminal
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"
                      style={{ animationDelay: "0.3s" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"
                      style={{ animationDelay: "0.6s" }}
                    />
                    <span className="text-[7px] font-space-mono text-cyan-300/25 ml-1 uppercase">
                      ONLINE
                    </span>
                  </div>
                </div>

                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40" />

                {/* Scan line */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-scan" />
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-cyan-300 font-orbitron tracking-[0.2em] uppercase flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Personnel Records
                    </h3>
                    {!isEditing && (
                      <button
                        onClick={handleEdit}
                        className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-400/40 text-cyan-300 rounded-lg transition-all flex items-center gap-1.5 hover:shadow-lg hover:shadow-cyan-500/10"
                      >
                        <Edit className="w-3 h-3" />
                        <span className="text-[9px] font-space-mono uppercase tracking-wider">
                          Edit
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-space-mono text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        First Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.firstName || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              firstName: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 px-3 py-2.5 text-sm text-cyan-100 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                        />
                      ) : (
                        <div className="px-3 py-2.5 bg-slate-800/40 border border-cyan-500/10 rounded-lg text-sm text-cyan-100 font-space-mono">
                          {profile.firstName || "-"}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-space-mono text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        Last Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.lastName || ""}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              lastName: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 px-3 py-2.5 text-sm text-cyan-100 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                        />
                      ) : (
                        <div className="px-3 py-2.5 bg-slate-800/40 border border-cyan-500/10 rounded-lg text-sm text-cyan-100 font-space-mono">
                          {profile.lastName || "-"}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[9px] font-space-mono text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <Mail className="w-3 h-3" />
                        Service Email
                      </label>
                      <div className="px-3 py-2.5 bg-slate-800/40 border border-cyan-500/10 rounded-lg text-sm text-cyan-100 font-space-mono flex items-center justify-between">
                        <span>{profile.email || "-"}</span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-[8px] text-emerald-300 font-space-mono uppercase">
                            Verified
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[9px] font-space-mono text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        Date of Birth
                      </label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editData.dob || ""}
                          onChange={(e) =>
                            setEditData({ ...editData, dob: e.target.value })
                          }
                          className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 px-3 py-2.5 text-sm text-cyan-100 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                        />
                      ) : (
                        <div className="px-3 py-2.5 bg-slate-800/40 border border-cyan-500/10 rounded-lg text-sm text-cyan-100 font-space-mono">
                          {profile.dob || "-"}
                        </div>
                      )}
                    </div>
                    
                    {/* Location Settings */}
                    <div className="col-span-1 md:col-span-2 mt-4">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/10">
                        <Radar className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-[10px] font-orbitron text-cyan-300 tracking-widest uppercase">Global Positioning Offset</h4>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-space-mono text-amber-400/80 uppercase tracking-widest flex items-center gap-1.5">
                            Latitude
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              placeholder="e.g. 22.5726"
                              value={editData.latitude || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  latitude: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-amber-500/20 bg-slate-900/60 px-3 py-2.5 text-sm text-amber-100 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 focus:shadow-lg focus:shadow-amber-500/10 transition-all font-space-mono placeholder:text-slate-600"
                            />
                          ) : (
                            <div className="px-3 py-2.5 bg-slate-900/40 border border-slate-700/50 rounded-lg text-sm text-slate-300 font-space-mono">
                              {profile.latitude || "(Not set)"}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-space-mono text-amber-400/80 uppercase tracking-widest flex items-center gap-1.5">
                            Longitude
                          </label>
                          {isEditing ? (
                            <input
                              type="number"
                              step="any"
                              placeholder="e.g. 88.3639"
                              value={editData.longitude || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  longitude: e.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-amber-500/20 bg-slate-900/60 px-3 py-2.5 text-sm text-amber-100 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 focus:shadow-lg focus:shadow-amber-500/10 transition-all font-space-mono placeholder:text-slate-600"
                            />
                          ) : (
                            <div className="px-3 py-2.5 bg-slate-900/40 border border-slate-700/50 rounded-lg text-sm text-slate-300 font-space-mono">
                              {profile.longitude || "(Not set)"}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-[8px] font-space-mono text-slate-500 leading-relaxed">
                        Setting coordinates automatically routes detected threats relative to this tactical position in the Command Center map.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-slate-900/80 via-cyan-900/10 to-slate-900/80 px-4 py-1.5 border-t border-cyan-500/10 flex items-center justify-between">
                  <span className="text-[7px] font-space-mono text-slate-600 uppercase tracking-wider">
                    Records: Read-Only
                  </span>
                  <span className="text-[7px] font-space-mono text-slate-600 uppercase tracking-wider">
                    {isEditing ? "Edit Mode Active" : "Secured"}
                  </span>
                </div>
              </div>

              {/* Subscription & Security with enhanced effects */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="relative bg-slate-900/70 backdrop-blur-xl rounded-xl border border-cyan-500/15 shadow-lg shadow-black/30 overflow-hidden group hover:border-cyan-400/25 transition-all">
                  <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/20 to-cyan-900/30 px-4 py-2 border-b border-cyan-500/10">
                    <span className="text-[8px] font-space-mono text-cyan-300/40 uppercase tracking-widest">
                      Security Clearance
                    </span>
                  </div>
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-500/25" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-500/25" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-500/25" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-500/25" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-cyan-500/10 hover:border-cyan-400/20 transition-all">
                      <span className="text-[9px] text-slate-400 font-space-mono uppercase tracking-wider">
                        Level
                      </span>
                      <span className="text-[10px] font-bold text-cyan-300 font-orbitron tracking-wider">
                        {profile.subscription?.plan?.toUpperCase() || "BASIC"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-emerald-500/10 hover:border-emerald-400/20 transition-all">
                      <span className="text-[9px] text-slate-400 font-space-mono uppercase tracking-wider">
                        Status
                      </span>
                      <span className="text-[10px] font-bold text-emerald-300 font-orbitron tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" />
                        {profile.subscription?.status?.toUpperCase() ||
                          "ACTIVE"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="relative bg-slate-900/70 backdrop-blur-xl rounded-xl border border-cyan-500/15 shadow-lg shadow-black/30 overflow-hidden group hover:border-cyan-400/25 transition-all">
                  <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/20 to-cyan-900/30 px-4 py-2 border-b border-cyan-500/10">
                    <span className="text-[8px] font-space-mono text-cyan-300/40 uppercase tracking-widest">
                      Security Controls
                    </span>
                  </div>
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-500/25" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-500/25" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-500/25" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-500/25" />
                  <div className="p-5 space-y-2">
                    <button className="w-full flex items-center justify-between p-3 bg-slate-800/40 hover:bg-slate-800/60 rounded-lg border border-cyan-500/10 hover:border-cyan-400/25 transition-all group/btn">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-cyan-400 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[10px] text-cyan-300 font-space-mono uppercase tracking-wider">
                          Change Access Code
                        </span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-cyan-400/40 group-hover/btn:text-cyan-400 group-hover/btn:translate-x-0.5 transition-all" />
                    </button>
                    <button className="w-full flex items-center justify-between p-3 bg-slate-800/40 hover:bg-slate-800/60 rounded-lg border border-cyan-500/10 hover:border-cyan-400/25 transition-all group/btn">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-cyan-400 group-hover/btn:scale-110 transition-transform" />
                        <span className="text-[10px] text-cyan-300 font-space-mono uppercase tracking-wider">
                          Alert Preferences
                        </span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-cyan-400/40 group-hover/btn:text-cyan-400 group-hover/btn:translate-x-0.5 transition-all" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ministry Footer */}
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-700/50 rounded bg-slate-900/40">
              <Shield className="w-3 h-3 text-slate-600" />
              <span className="text-[7px] font-space-mono text-slate-600 uppercase tracking-[0.3em]">
                Ministry of Defence Government of India Naval Cyber Command
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
