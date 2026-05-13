"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SonarGridBackground } from "@/components/sonar-grid-background";
// Security elements are now provided globally via ConditionalSecurityBar in layout
import { useState, useEffect, useRef } from "react";
import {
  Mail,
  Shield,
  ArrowLeft,
  CheckCircle,
  User,
  Upload,
  Lock,
  Fingerprint,
  Anchor,
  ShieldCheck,
  AlertTriangle,
  Radar,
} from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-signin-button";

export default function RegisterPage() {
  const router = useRouter();
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [userData, setUserData] = useState<any>(null);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [typedText, setTypedText] = useState("");
  const terminalLines = useRef<string[]>([
    "> INIT PERSONNEL_REG v3.8.0",
    "> BIOMETRIC MODULE STANDBY",
    "> ENCRYPTION: AES-256-GCM",
    "> CLEARANCE LEVEL: PENDING",
    "> AWAITING REGISTRATION DATA...",
  ]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const form = new FormData(e.currentTarget);
    let avatar = "";
    const file = form.get("avatar");
    if (file && file instanceof File && file.size > 0)
      avatar = await fileToBase64(file);

    const firstName = String(form.get("firstName") || "");
    const lastName = String(form.get("lastName") || "");
    const dob = String(form.get("dob") || "");
    const latitudeStr = String(form.get("latitude") || "").trim();
    const longitudeStr = String(form.get("longitude") || "").trim();
    const email = String(form.get("email") || "");
    const confirmEmail = String(form.get("confirmEmail") || "");
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    if (email !== confirmEmail) {
      setError("Email addresses do not match");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError("Access codes do not match");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Access code must be at least 6 characters");
      setLoading(false);
      return;
    }

    const latitude = Number(latitudeStr);
    const longitude = Number(longitudeStr);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Enter a valid latitude (-90 to 90) and longitude (-180 to 180)");
      setLoading(false);
      return;
    }

    const ud = {
      username: firstName + " " + lastName,
      email,
      password,
      firstName,
      lastName,
      dob,
      avatar,
      location: {
        latitude,
        longitude,
      },
    };

    try {
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "registration", userData: ud }),
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Server returned invalid response.");
      }
      if (!response.ok)
        throw new Error(data?.message || "Server error: " + response.status);

      setUserData(ud);
      setStep("otp");
      setSuccess("Verification code dispatched. Check your email.");
      setCountdown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOTP(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    if (!otp || otp.length !== 6) {
      setError("Enter a valid 6-digit code");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userData?.email,
          otp,
          type: "registration",
        }),
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Server returned invalid response.");
      }
      if (!response.ok) throw new Error(data?.message || "Verification failed");

      if (data.user) localStorage.setItem("profile", JSON.stringify(data.user));
      setSuccess("Access granted. Redirecting to command centre...");
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function resendOTP() {
    if (countdown > 0 || !userData) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userData.email,
          type: "registration",
          userData,
        }),
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid response");
      }
      if (!response.ok) throw new Error(data?.message || "Failed");
      setSuccess("Code re-dispatched.");
      setCountdown(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  }

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
  }

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
        className="absolute top-2/3 left-1/3 w-60 h-60 bg-emerald-500/3 rounded-full blur-3xl animate-pulse"
        style={{ animationDuration: "15s" }}
      />

      {/* Porthole glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border-[6px] border-slate-700/10" />
        <div className="absolute inset-4 rounded-full border border-cyan-500/5" />
        <div className="absolute inset-0 rounded-full bg-gradient-radial from-cyan-500/[0.02] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-lg px-6 pt-20 pb-16">
        {step === "form" ? (
          <>
            {/* Indian Defence Header with enhanced submarine animations */}
            <div className="text-center mb-6">
              <div className="relative inline-block mb-4">
                {/* Multiple spinning security rings */}
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

                {/* Sonar ping ring */}
                <div
                  className="absolute -inset-8 rounded-full border border-cyan-500/5 animate-ping"
                  style={{ animationDuration: "4s" }}
                />

                <div
                  className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl animate-pulse"
                  style={{ animationDuration: "3s" }}
                />
                <div className="relative w-20 h-20 rounded-full border-2 border-amber-500/50 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shadow-2xl shadow-amber-500/10">
                  <div className="absolute inset-1 rounded-full border border-amber-400/30" />
                  <Anchor
                    className="w-9 h-9 text-amber-400/90 animate-pulse"
                    style={{ animationDuration: "4s" }}
                  />
                </div>
              </div>

              <h1 className="font-orbitron text-lg font-bold tracking-[0.25em] text-amber-100/90 uppercase mb-1">
                Indian Naval Command
              </h1>
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-px flex-1 max-w-16 bg-gradient-to-r from-transparent to-cyan-500/30" />
                <span className="text-[9px] font-space-mono text-cyan-300/50 uppercase tracking-[0.4em]">
                  MarEye Defence System
                </span>
                <div className="h-px flex-1 max-w-16 bg-gradient-to-l from-transparent to-cyan-500/30" />
              </div>

              <div
                className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/25 rounded animate-pulse mb-4"
                style={{ animationDuration: "6s" }}
              >
                <Shield className="w-3 h-3 text-red-400" />
                <span className="text-[8px] font-space-mono text-red-300/80 uppercase tracking-[0.3em] font-bold">
                  Security Clearance Required
                </span>
              </div>

              <h2 className="font-orbitron text-2xl font-bold tracking-wider gradient-text-ocean mb-1">
                REQUEST ACCESS
              </h2>
              <p className="text-[10px] text-slate-400 font-space-mono uppercase tracking-widest">
                Personnel registration with OTP verification
              </p>
            </div>

            {/* Mini terminal readout */}
            <div className="mb-4 bg-slate-950/60 border border-cyan-500/10 rounded-lg p-3 overflow-hidden max-h-20">
              <pre className="text-[8px] font-space-mono text-cyan-400/40 leading-relaxed whitespace-pre-wrap">
                {typedText}
                <span className="animate-pulse text-cyan-400/80"></span>
              </pre>
            </div>

            {/* Security status */}
            <div className="flex items-center justify-between mb-4 px-1">
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

            {/* Form Card with submarine aesthetics */}
            <form onSubmit={onSubmit}>
              <div className="relative bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-cyan-500/15 shadow-2xl shadow-black/40 overflow-hidden animate-ambient-hum">
                <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/20 to-cyan-900/30 px-4 py-2 border-b border-cyan-500/10 flex items-center justify-between">
                  <span className="text-[8px] font-space-mono text-cyan-300/40 uppercase tracking-widest">
                    Personnel Registration Terminal
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

                {/* Enhanced HUD corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40" />

                {/* Scan line within card */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-scan" />
                </div>

                <div className="p-6">
                  {error && (
                    <div
                      className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 animate-pulse"
                      style={{
                        animationDuration: "2s",
                        animationIterationCount: 3,
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="text-red-300 text-[11px] font-space-mono">
                        {error}
                      </span>
                    </div>
                  )}
                  {success && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-emerald-300 text-[11px] font-space-mono">
                        {success}
                      </span>
                    </div>
                  )}

                  {/* Avatar Upload */}
                  <div className="mb-5">
                    <label className="text-[9px] font-space-mono uppercase tracking-[0.2em] text-slate-400 block mb-2">
                      Personnel Photo
                    </label>
                    <div className="flex items-center gap-4">
                      <div
                        className="relative group w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-500/20 bg-slate-800/50 flex items-center justify-center cursor-pointer hover:border-cyan-400/50 transition-colors"
                        onClick={() =>
                          document.getElementById("avatar")?.click()
                        }
                      >
                        {/* Spinning ring around avatar */}
                        <div
                          className="absolute -inset-1 rounded-full border border-dashed border-cyan-500/15 animate-spin group-hover:border-cyan-400/30"
                          style={{ animationDuration: "20s" }}
                        />
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Upload className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                        )}
                      </div>
                      <div className="flex-1">
                        <label
                          htmlFor="avatar"
                          className="inline-flex items-center px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-cyan-500/15 hover:border-cyan-400/30 rounded-lg cursor-pointer transition-all text-[10px] font-space-mono text-slate-300 uppercase tracking-wider hover:shadow-lg hover:shadow-cyan-500/5"
                        >
                          <Upload className="w-3 h-3 mr-2" />
                          Upload Photo
                        </label>
                        <input
                          id="avatar"
                          name="avatar"
                          type="file"
                          accept="image/*"
                          onChange={onAvatarChange}
                          className="hidden"
                        />
                        <p className="text-[8px] text-slate-600 mt-1 font-space-mono">
                          JPG/PNG, up to ~2MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Name Row */}
                  <div className="grid gap-3 sm:grid-cols-2 mb-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="firstName"
                        className="text-[9px] font-space-mono uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5"
                      >
                        <User className="w-3 h-3" />
                        First Name
                      </label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/40 group-focus-within:text-cyan-400/70 transition-colors" />
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          required
                          placeholder="First name"
                          className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 pl-10 pr-3 py-2.5 text-sm text-cyan-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="lastName"
                        className="text-[9px] font-space-mono uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5"
                      >
                        <User className="w-3 h-3" />
                        Last Name
                      </label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/40 group-focus-within:text-cyan-400/70 transition-colors" />
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          required
                          placeholder="Last name"
                          className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 pl-10 pr-3 py-2.5 text-sm text-cyan-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DOB */}
                  <div className="space-y-1.5 mb-4">
                    <label
                      htmlFor="dob"
                      className="text-[9px] font-space-mono uppercase tracking-[0.2em] text-slate-400"
                    >
                      Date of Birth
                    </label>
                    <input
                      id="dob"
                      name="dob"
                      type="date"
                      required
                      className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 px-3 py-2.5 text-sm text-cyan-100 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                    />
                  </div>

                  {/* Location (Latitude / Longitude) */}
                  <div className="grid gap-3 sm:grid-cols-2 mb-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="latitude"
                        className="text-[9px] font-space-mono uppercase tracking-[0.2em] text-slate-400"
                      >
                        Latitude
                      </label>
                      <input
                        id="latitude"
                        name="latitude"
                        type="number"
                        step="any"
                        required
                        placeholder="e.g. 22.5726"
                        className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 px-3 py-2.5 text-sm text-cyan-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="longitude"
                        className="text-[9px] font-space-mono uppercase tracking-[0.2em] text-slate-400"
                      >
                        Longitude
                      </label>
                      <input
                        id="longitude"
                        name="longitude"
                        type="number"
                        step="any"
                        required
                        placeholder="e.g. 88.3639"
                        className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 px-3 py-2.5 text-sm text-cyan-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-3 mb-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="email"
                        className="text-[9px] font-space-mono uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5"
                      >
                        <Mail className="w-3 h-3" />
                        Service Email
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/40 group-focus-within:text-cyan-400/70 transition-colors" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          placeholder="officer@navy.gov.in"
                          className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 pl-10 pr-3 py-2.5 text-sm text-cyan-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="confirmEmail"
                        className="text-[9px] font-space-mono uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5"
                      >
                        <Mail className="w-3 h-3" />
                        Confirm Service Email
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/40 group-focus-within:text-cyan-400/70 transition-colors" />
                        <input
                          id="confirmEmail"
                          name="confirmEmail"
                          type="email"
                          required
                          placeholder="officer@navy.gov.in"
                          className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 pl-10 pr-3 py-2.5 text-sm text-cyan-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Passwords */}
                  <div className="space-y-3 mb-5">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="password"
                        className="text-[9px] font-space-mono uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5"
                      >
                        <Lock className="w-3 h-3" />
                        Create Access Code
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/40 group-focus-within:text-cyan-400/70 transition-colors" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="Min 6 characters"
                          className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 pl-10 pr-10 py-2.5 text-sm text-cyan-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="confirmPassword"
                        className="text-[9px] font-space-mono uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5"
                      >
                        <Lock className="w-3 h-3" />
                        Confirm Access Code
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/40 group-focus-within:text-cyan-400/70 transition-colors" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          placeholder="Re-enter access code"
                          className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 pl-10 pr-10 py-2.5 text-sm text-cyan-100 placeholder:text-slate-600 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit with enhanced animation */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 text-white font-orbitron text-[10px] tracking-[0.3em] uppercase overflow-hidden group disabled:opacity-40 disabled:cursor-not-allowed border border-cyan-400/20 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:shadow-xl transition-all duration-300"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span
                      className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        boxShadow: "inset 0 0 20px rgba(6,182,212,0.15)",
                      }}
                    />
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Dispatching Verification...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Mail className="w-4 h-4" />
                        Send OTP & Register
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-3 my-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-500/20" />
                    <span className="text-[8px] font-space-mono text-slate-600 uppercase tracking-widest">
                      or
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-500/20" />
                  </div>

                  <GoogleSignInButton label="Continue with Google" />
                </div>

                <div className="bg-gradient-to-r from-slate-900/80 via-cyan-900/10 to-slate-900/80 px-4 py-2 border-t border-cyan-500/10 flex items-center justify-between">
                  <span className="text-[7px] font-space-mono text-slate-600 uppercase tracking-wider">
                    Session: AES-256-GCM
                  </span>
                  <span className="text-[7px] font-space-mono text-slate-600 uppercase tracking-wider">
                    Protocol: TLS 1.3
                  </span>
                </div>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* OTP Step */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <div
                  className="absolute -inset-6 rounded-full border border-dashed border-emerald-500/15 animate-spin"
                  style={{ animationDuration: "35s" }}
                />
                <div
                  className="absolute -inset-4 rounded-full border border-dotted border-cyan-500/10 animate-spin"
                  style={{
                    animationDuration: "20s",
                    animationDirection: "reverse",
                  }}
                />
                <div
                  className="absolute -inset-8 rounded-full border border-emerald-500/5 animate-ping"
                  style={{ animationDuration: "4s" }}
                />

                <div
                  className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"
                  style={{ animationDuration: "3s" }}
                />
                <div className="relative w-20 h-20 rounded-full border-2 border-amber-500/50 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shadow-2xl shadow-emerald-500/10">
                  <ShieldCheck
                    className="w-9 h-9 text-emerald-400/90 animate-pulse"
                    style={{ animationDuration: "4s" }}
                  />
                </div>
              </div>
              <h2 className="font-orbitron text-2xl font-bold tracking-wider gradient-text-ocean mb-1">
                VERIFY IDENTITY
              </h2>
              <p className="text-[10px] font-space-mono text-slate-400">
                6-digit code dispatched to{" "}
                <strong className="text-cyan-400">{userData?.email}</strong>
              </p>
            </div>

            <form onSubmit={verifyOTP}>
              <div className="relative bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-cyan-500/15 shadow-2xl shadow-black/40 overflow-hidden animate-ambient-hum">
                <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/20 to-cyan-900/30 px-4 py-2 border-b border-cyan-500/10 flex items-center justify-between">
                  <span className="text-[8px] font-space-mono text-cyan-300/40 uppercase tracking-widest">
                    Verification Terminal
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[8px] font-space-mono text-amber-300/60 uppercase tracking-wider">
                      Awaiting Code
                    </span>
                  </div>
                </div>

                {/* Enhanced HUD corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40" />

                {/* Scan line within card */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-scan" />
                </div>

                <div className="p-6">
                  {error && (
                    <div
                      className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 animate-pulse"
                      style={{
                        animationDuration: "2s",
                        animationIterationCount: 3,
                      }}
                    >
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="text-red-300 text-[11px] font-space-mono">
                        {error}
                      </span>
                    </div>
                  )}
                  {success && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-emerald-300 text-[11px] font-space-mono">
                        {success}
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="otp"
                        className="text-[9px] font-space-mono uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5"
                      >
                        <Fingerprint className="w-3 h-3" />
                        Enter 6-Digit Verification Code
                      </label>
                      <input
                        id="otp"
                        name="otp"
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="------"
                        className="w-full rounded-lg border border-cyan-500/15 bg-slate-800/60 px-3 py-3 text-center text-xl tracking-[0.5em] text-cyan-100 outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-lg focus:shadow-cyan-500/5 transition-all font-space-mono"
                        disabled={false}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-space-mono">
                      <button
                        type="button"
                        onClick={() => setStep("form")}
                        className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={resendOTP}
                        disabled={countdown > 0 || loading}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wider"
                      >
                        {countdown > 0
                          ? `Resend in ${countdown}s`
                          : "Resend Code"}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="relative w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 text-white font-orbitron text-[10px] tracking-[0.3em] uppercase overflow-hidden group disabled:opacity-40 disabled:cursor-not-allowed border border-cyan-400/20 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:shadow-xl transition-all duration-300"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <span
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          boxShadow: "inset 0 0 20px rgba(6,182,212,0.15)",
                        }}
                      />
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Verifying...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Verify & Grant Access
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-slate-900/80 via-cyan-900/10 to-slate-900/80 px-4 py-2 border-t border-cyan-500/10 flex items-center justify-between">
                  <span className="text-[7px] font-space-mono text-slate-600 uppercase tracking-wider">
                    Session: AES-256-GCM
                  </span>
                  <span className="text-[7px] font-space-mono text-slate-600 uppercase tracking-wider">
                    Protocol: TLS 1.3
                  </span>
                </div>
              </div>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-[10px] text-slate-500 font-space-mono tracking-wider">
          Already authorized?{" "}
          <Link
            href="/auth/login"
            className="text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-widest font-bold"
          >
            Sign In
          </Link>
        </p>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-700/50 rounded bg-slate-900/40">
            <Shield className="w-3 h-3 text-slate-600" />
            <span className="text-[7px] font-space-mono text-slate-600 uppercase tracking-[0.3em]">
              Ministry of Defence Government of India Naval Cyber Command
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
