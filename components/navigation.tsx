"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BubbleButton } from "@/components/bubble-button";
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Radar,
  Shield,
  Brain,
  Target,
  BarChart3,
  Home,
  MessageSquare,
  Globe,
  Map,
  Activity,
  Radio,
  Cpu,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [avatar, setAvatar] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);
  const [activeIndicator, setActiveIndicator] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user: userData, logout } = useAuth();
  const isSecurityAdmin = Boolean(userData?.isHoneypotAdmin);

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/cnn", label: "CNN", icon: Brain },
    { href: "/detection", label: "Detection", icon: Target },
    { href: "/command-center", label: "Command", icon: Radar },
    { href: "/watchlist", label: "Watchlist", icon: Activity },
    { href: "/intelligence", label: "Intel", icon: Globe },
    { href: "/mission-planner", label: "Planner", icon: Map },
    { href: "/comm-intercept", label: "SIGINT", icon: Radio },
    { href: "/threat-prediction", label: "Threats", icon: Activity },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/air-commander", label: "A.I.R", icon: Cpu },
  ];

  const visibleNavItems = isSecurityAdmin
    ? [...navItems, { href: "/security/honeypot", label: "Honeypot", icon: Shield }]
    : navItems;

  // Scroll-aware navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Update active indicator position
  useEffect(() => {
    if (!navRef.current) return;
    const activeLink = navRef.current.querySelector(
      '[data-active="true"]',
    ) as HTMLElement;
    if (activeLink) {
      const navRect = navRef.current.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      setActiveIndicator({
        left: linkRect.left - navRect.left,
        width: linkRect.width,
      });
    }
  }, [pathname]);

  useEffect(() => {
    if (userData?.avatar) {
      setAvatar(userData.avatar);
    }
  }, [userData]);

  const handleLogout = async () => {
    await logout();
    router.push("/try");
  };

  return (
    <>
      <nav
        className={`fixed top-[52px] left-0 right-0 z-[60] transition-all duration-500 ${
          scrolled
            ? "bg-slate-950/80 backdrop-blur-2xl border-b border-cyan-500/30 shadow-lg shadow-cyan-500/10 py-0"
            : "bg-transparent backdrop-blur-sm border-b border-transparent py-1"
        }`}
      >
        {/* Animated top border line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        <div className="w-full px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16 relative w-full gap-2">
            {/* Logo and Brand */}
            <Link href="/" className="flex items-center flex-shrink-0 group">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500/30 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-lg flex items-center justify-center border border-cyan-500/40 group-hover:border-cyan-400/70 transition-all duration-300 group-hover:scale-105">
                    <Radar className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300 transition-colors animate-spin-slow" />
                  </div>
                </div>
                <div className="hidden min-[1100px]:flex flex-col leading-tight">
                  <span className="text-sm font-orbitron font-black tracking-wider text-cyan-400 group-hover:text-cyan-300 transition-colors text-glow-cyan">
                    MAREYE
                  </span>
                  <span className="text-[8px] font-space-mono text-cyan-300/50 font-bold tracking-[0.2em] uppercase">
                    DEFENSE PLATFORM
                  </span>
                </div>
              </div>
            </Link>

            {/* Navigation Links - Improved Responsiveness */}
            <div className="hidden lg:flex items-center flex-1 justify-center min-w-0">
              <div
                ref={navRef}
                className="relative flex items-center gap-0.5 bg-slate-900/50 backdrop-blur-xl rounded-full p-1 border border-cyan-500/15 hover:border-cyan-400/30 transition-all duration-500 overflow-x-auto no-scrollbar max-w-full"
              >
                {/* Animated active indicator */}
                <div
                  className="absolute top-1 h-[calc(100%-8px)] bg-gradient-to-r from-cyan-500/25 to-blue-500/25 rounded-full border border-cyan-400/40 shadow-lg shadow-cyan-500/20 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  style={{
                    left: `${activeIndicator.left}px`,
                    width: `${activeIndicator.width}px`,
                    opacity: activeIndicator.width > 0 ? 1 : 0,
                  }}
                />

                {visibleNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-active={isActive}
                      className={`relative flex items-center space-x-1 px-2 xl:px-3 py-1.5 rounded-full text-[9px] xl:text-[10px] font-space-mono font-bold uppercase tracking-wider transition-all duration-300 group/link flex-shrink-0 ${
                        isActive
                          ? "text-cyan-100"
                          : "text-cyan-300/70 hover:text-cyan-100"
                      }`}
                    >
                      <Icon
                        className={`w-3 h-3 xl:w-3.5 xl:h-3.5 transition-all duration-300 ${
                          isActive
                            ? "text-cyan-300 scale-110"
                            : "text-cyan-400/50 group-hover/link:text-cyan-300 group-hover/link:scale-110"
                        }`}
                      />
                      <span className="hidden xl:inline-block">{item.label}</span>
                      <span className="xl:hidden inline-block">{item.label.substring(0, 5)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center gap-1 xl:gap-2 flex-shrink-0">
              {/* Status Indicator */}
              <div className="hidden min-[1400px]:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[8px] font-space-mono text-emerald-300/80 font-bold uppercase tracking-wider">
                  Online
                </span>
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="group flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-900/40 backdrop-blur-xl border border-cyan-500/15 hover:border-cyan-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-cyan-400/30 group-hover:border-cyan-300/60 transition-all duration-300 group-hover:scale-105">
                      {avatar ? (
                        <img
                          src={avatar || "/placeholder.svg"}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-cyan-300" />
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
                  </div>
                  <div className="hidden xl:block text-left">
                    <div className="text-[10px] font-space-mono font-bold text-cyan-100 uppercase tracking-wider">
                      {userData?.firstName || "OPERATOR"}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-3 h-3 text-cyan-400/60 transition-transform duration-300 ${
                      isProfileOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-72 glass-heavy rounded-xl shadow-2xl shadow-cyan-500/20 py-2 z-[70] animate-slide-up">
                    {/* Dropdown glow border */}
                    <div className="absolute inset-0 rounded-xl border border-cyan-500/20" />

                    <div className="relative z-10">
                      <div className="px-4 py-3 border-b border-cyan-500/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-400/40 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-cyan-300" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-orbitron font-bold text-cyan-100 tracking-wide">
                              {userData?.firstName} {userData?.lastName}
                            </div>
                            <div className="text-[10px] font-space-mono text-cyan-300/50">
                              {userData?.email}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Link
                        href="/profile"
                        className="flex items-center space-x-3 px-4 py-2.5 text-xs font-space-mono text-cyan-200 hover:text-cyan-100 hover:bg-cyan-500/10 transition-all duration-200 uppercase tracking-wider font-bold group/item"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <User className="w-4 h-4 group-hover/item:scale-110 transition-transform" />
                        <span>Profile Settings</span>
                      </Link>
                      <div className="border-t border-cyan-500/10 my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-2.5 text-xs font-space-mono text-red-300/80 hover:text-red-200 hover:bg-red-500/10 transition-all duration-200 w-full text-left uppercase tracking-wider font-bold group/item"
                      >
                        <LogOut className="w-4 h-4 group-hover/item:scale-110 transition-transform" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Button */}
              <Link href="/contact" className="hidden sm:block">
                <button className="relative px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/15 to-emerald-500/15 border border-cyan-400/25 hover:border-cyan-300/50 text-[10px] font-space-mono font-bold uppercase tracking-wider text-cyan-200 hover:text-cyan-100 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/15 hover:scale-105 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" />
                    CONTACT
                  </span>
                </button>
              </Link>

              {/* Mobile menu button */}
              <div className="lg:hidden ml-2">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="relative p-2 rounded-lg text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-100 transition-all duration-300 border border-cyan-500/15 hover:border-cyan-400/30"
                >
                  <div
                    className={`transition-all duration-300 ${isMenuOpen ? "rotate-90 scale-110" : ""}`}
                  >
                    {isMenuOpen ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Menu className="h-5 w-5" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Mobile Navigation with slide animation */}
          <div
            className={`lg:hidden overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              isMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-3 pt-3 pb-5 space-y-1 border-t border-cyan-500/10">
              {visibleNavItems.map((item, index) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-2.5 text-xs font-space-mono font-bold rounded-xl transition-all duration-300 uppercase tracking-wider ${
                      isActive
                        ? "text-cyan-100 bg-cyan-500/15 border border-cyan-400/30 shadow-lg shadow-cyan-500/10"
                        : "text-cyan-300/70 hover:text-cyan-100 hover:bg-cyan-500/5"
                    }`}
                    style={{ transitionDelay: `${index * 50}ms` }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-cyan-300" : "text-cyan-400/50"}`}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                    )}
                  </Link>
                );
              })}

              {/* Mobile Profile */}
              {userData && (
                <div className="pt-3 mt-2 border-t border-cyan-500/10">
                  <div className="px-4 py-3 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-400/30">
                        {avatar ? (
                          <img
                            src={avatar || "/placeholder.svg"}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-cyan-300" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-space-mono font-bold text-cyan-100 uppercase tracking-wider">
                          {userData.firstName}
                        </div>
                        <div className="text-[10px] font-space-mono text-cyan-300/50">
                          {userData.email}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Link
                      href="/profile"
                      className="flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 text-[10px] font-space-mono text-cyan-200 hover:text-cyan-100 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-lg transition-all duration-200 uppercase tracking-wider font-bold border border-cyan-500/10"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="w-3 h-3" />
                      <span>Profile</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 text-[10px] font-space-mono text-red-300/70 hover:text-red-200 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-all duration-200 uppercase tracking-wider font-bold border border-red-500/10"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href="/contact"
                  onClick={() => setIsMenuOpen(false)}
                  className="block"
                >
                  <button className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-400/20 hover:border-cyan-300/40 text-xs font-space-mono font-bold uppercase tracking-wider text-cyan-200 hover:text-cyan-100 transition-all duration-300 flex items-center justify-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Contact Us
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Click outside to close */}
      {isProfileOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsProfileOpen(false)}
        />
      )}
    </>
  );
}
