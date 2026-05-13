"use client";

import {
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  Send,
  Radar,
  MessageSquare,
  Building2,
} from "lucide-react";
import { useState } from "react";
import { SonarGridBackground } from "@/components/sonar-grid-background";
import { SecurityFooter } from "@/components/security-classified-bar";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={`reveal-up ${isVisible ? "visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

export function ContactSection() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    institution: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({ type: "success", message: data.message });
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          institution: "",
          message: "",
        });
      } else {
        setSubmitStatus({
          type: "error",
          message: data.error || "Failed to send message",
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <section
      id="contact"
      className="relative min-h-screen py-24 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950"
    >
      <SonarGridBackground />

      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <RevealSection>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/5 border border-cyan-500/15 rounded-full mb-5">
              <MessageSquare className="w-3 h-3 text-cyan-400/60" />
              <span className="text-[10px] font-space-mono text-cyan-300/60 font-bold uppercase tracking-widest">
                Secure Channel
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black gradient-text-ocean font-orbitron mb-4">
              CONTACT & COLLABORATION
            </h2>
            <p className="text-base text-cyan-200/50 max-w-2xl mx-auto font-space-mono">
              Join our research network or get in touch to learn more about our
              AI-driven marine security platform
            </p>
          </div>
        </RevealSection>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <RevealSection delay={0.1}>
            <div className="glass-card rounded-2xl p-7 relative overflow-hidden">
              {/* HUD Corners */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40" />

              {/* Scan line */}
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent animate-scan"
                  style={{ animationDuration: "4s" }}
                />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Send className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-cyan-100 font-orbitron tracking-wider">
                      SEND TRANSMISSION
                    </h3>
                    <p className="text-[10px] font-space-mono text-cyan-300/40 uppercase tracking-widest">
                      Encrypted Channel
                    </p>
                  </div>
                </div>

                {submitStatus.type && (
                  <div
                    className={`p-3 rounded-lg flex items-center gap-2 mb-5 ${
                      submitStatus.type === "success"
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                        : "bg-red-500/10 border border-red-500/20 text-red-300"
                    }`}
                  >
                    {submitStatus.type === "success" ? (
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="text-sm font-space-mono">
                      {submitStatus.message}
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-space-mono text-cyan-300/50 uppercase tracking-wider mb-1.5 block font-bold">
                        First Name *
                      </label>
                      <input
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="John"
                        className="w-full px-3 py-2.5 bg-slate-800/50 border border-cyan-500/15 rounded-lg text-white text-sm font-space-mono placeholder:text-cyan-300/20 focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/20 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-space-mono text-cyan-300/50 uppercase tracking-wider mb-1.5 block font-bold">
                        Last Name *
                      </label>
                      <input
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Doe"
                        className="w-full px-3 py-2.5 bg-slate-800/50 border border-cyan-500/15 rounded-lg text-white text-sm font-space-mono placeholder:text-cyan-300/20 focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/20 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-space-mono text-cyan-300/50 uppercase tracking-wider mb-1.5 block font-bold">
                      Email *
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john.doe@university.edu"
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-cyan-500/15 rounded-lg text-white text-sm font-space-mono placeholder:text-cyan-300/20 focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/20 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-space-mono text-cyan-300/50 uppercase tracking-wider mb-1.5 block font-bold">
                      Institution
                    </label>
                    <input
                      name="institution"
                      value={formData.institution}
                      onChange={handleInputChange}
                      placeholder="Marine Research Institute"
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-cyan-500/15 rounded-lg text-white text-sm font-space-mono placeholder:text-cyan-300/20 focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-space-mono text-cyan-300/50 uppercase tracking-wider mb-1.5 block font-bold">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us about your research interests or collaboration ideas..."
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-cyan-500/15 rounded-lg text-white text-sm font-space-mono placeholder:text-cyan-300/20 focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/20 transition-all min-h-[120px] resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-[1.02] font-orbitron tracking-wider disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <span className="relative flex items-center justify-center gap-2">
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          TRANSMITTING...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          SEND TRANSMISSION
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </RevealSection>

          {/* Contact Information */}
          <div className="space-y-5">
            <RevealSection delay={0.2}>
              <div className="glass-card rounded-2xl p-6 relative overflow-hidden hover-glow transition-all duration-300">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-500/30" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-500/30" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-cyan-400" />
                    </div>
                    <h3 className="text-base font-black text-cyan-100 font-orbitron tracking-wider">
                      RESEARCH CENTER
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3 group">
                      <MapPin className="h-4 w-4 text-cyan-400/60 mt-0.5 flex-shrink-0 group-hover:text-cyan-300 transition-colors" />
                      <div>
                        <div className="text-sm font-space-mono text-white/80 font-bold">
                          Jadavpur University , Kolkata
                        </div>
                        <div className="text-xs text-cyan-300/40 font-space-mono mt-0.5">
                          Kolkata, West Bengal, India
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 group">
                      <Mail className="h-4 w-4 text-cyan-400/60 flex-shrink-0 group-hover:text-cyan-300 transition-colors" />
                      <div>
                        <div className="text-sm font-space-mono text-white/80 font-bold">
                          coder.anubhab26@gmail.com
                        </div>
                        <div className="text-[10px] text-cyan-300/30 font-space-mono uppercase tracking-wider">
                          General Inquiries
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 group">
                      <Phone className="h-4 w-4 text-cyan-400/60 flex-shrink-0 group-hover:text-cyan-300 transition-colors" />
                      <div>
                        <div className="text-sm font-space-mono text-white/80 font-bold">
                          9832098320
                        </div>
                        <div className="text-[10px] text-cyan-300/30 font-space-mono uppercase tracking-wider">
                          Research Collaboration
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </RevealSection>

            {/* Status Panel */}
            <RevealSection delay={0.3}>
              <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-500/30" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-500/30" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Radar className="w-5 h-5 text-emerald-400 animate-spin-slow" />
                    </div>
                    <h3 className="text-base font-black text-emerald-100 font-orbitron tracking-wider">
                      SYSTEM STATUS
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { label: "AI Engine", status: "Operational" },
                      { label: "Detection API", status: "Active" },
                      { label: "CNN Pipeline", status: "Ready" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 bg-slate-800/30 rounded-lg border border-emerald-500/10"
                      >
                        <span className="text-xs font-space-mono text-cyan-200/60 uppercase tracking-wider">
                          {item.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          <span className="text-[10px] font-space-mono text-emerald-300/80 font-bold uppercase">
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </div>

      {/* Security Footer */}
      <SecurityFooter />
    </section>
  );
}
