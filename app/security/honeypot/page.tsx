"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SonarGridBackground } from "@/components/sonar-grid-background";
import { SecurityFooter } from "@/components/security-classified-bar";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Copy,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  Skull,
} from "lucide-react";

type BlockedIpEntry = {
  ip: string;
  blockedAt: string;
  reason: string;
  source: "manual" | "auto";
  expiresAt: string | null;
};

type HoneypotEvent = {
  id: string;
  timestamp: string;
  ip: string;
  ipHash: string;
  userAgent: string;
  method: string;
  targetPath: string;
  query: Record<string, string>;
  bodySample: string;
  indicators: string[];
  riskScore: number;
  requestHeaders: {
    referer: string;
    acceptLanguage: string;
    origin: string;
  };
};

export default function HoneypotAdminPage() {
  const router = useRouter();
  const [events, setEvents] = useState<HoneypotEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [queryText, setQueryText] = useState("");
  const [minRisk, setMinRisk] = useState(0);
  const [limit, setLimit] = useState(100);
  const [blockedIps, setBlockedIps] = useState<BlockedIpEntry[]>([]);
  const [blockingIp, setBlockingIp] = useState<string | null>(null);
  const [blockSuccess, setBlockSuccess] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) {
          router.replace("/try");
          return;
        }

        const data = await res.json();
        if (!data?.user?.isHoneypotAdmin) {
          router.replace("/");
          return;
        }
      } catch {
        router.replace("/");
        return;
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAdminAccess();
    fetchBlockedIps();
  }, [router]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (event.riskScore < minRisk) return false;
      if (!queryText.trim()) return true;

      const text = queryText.toLowerCase();
      const joined = [
        event.ip,
        event.ipHash,
        event.targetPath,
        event.method,
        event.userAgent,
        event.bodySample,
        event.indicators.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return joined.includes(text);
    });
  }, [events, minRisk, queryText]);

  const highRiskCount = useMemo(
    () => events.filter((event) => event.riskScore >= 70).length,
    [events],
  );

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    setAccessDenied(false);

    try {
      const res = await fetch(`/api/security/honeypot-logs?limit=${limit}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setEvents([]);
        if (res.status === 404 || res.status === 403) {
          setAccessDenied(true);
          throw new Error("Access denied. This panel is restricted to honeypot admin login only.");
        }
        throw new Error(`Failed to load logs (${res.status})`);
      }

      const data = await res.json();
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedIps = async () => {
    try {
      const res = await fetch("/api/security/block-ip", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setBlockedIps(Array.isArray(data.blocked) ? data.blocked : []);
      }
    } catch {}
  };

  const handleBlockIp = async (ip: string, reason: string) => {
    setBlockingIp(ip);
    setBlockSuccess(null);
    try {
      const res = await fetch("/api/security/block-ip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ip, reason }),
      });
      if (res.ok) {
        setBlockSuccess(`Blocked ${ip}`);
        await fetchBlockedIps();
        setTimeout(() => setBlockSuccess(null), 3000);
      }
    } catch {}
    setBlockingIp(null);
  };

  const handleUnblockIp = async (ip: string) => {
    setBlockingIp(ip);
    try {
      await fetch("/api/security/block-ip", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ip }),
      });
      await fetchBlockedIps();
    } catch {}
    setBlockingIp(null);
  };

  const isBlocked = (ip: string) => blockedIps.some((e) => e.ip === ip);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filteredEvents, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `honeypot-events-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyIoc = async (event: HoneypotEvent) => {
    const text = [
      `timestamp=${event.timestamp}`,
      `ip=${event.ip}`,
      `ipHash=${event.ipHash}`,
      `method=${event.method}`,
      `targetPath=${event.targetPath}`,
      `riskScore=${event.riskScore}`,
      `indicators=${event.indicators.join(",")}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <SonarGridBackground />

      <div className="relative z-10 pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-orbitron font-black text-cyan-300 tracking-wider">
            HONEYPOT SECURITY CONSOLE
          </h1>
          <p className="text-cyan-500/60 font-space-mono text-sm mt-2">
            Internal incident triage dashboard (restricted operator use)
          </p>
        </div>

        <Card className="bg-slate-900/70 border-cyan-500/20 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-cyan-300 font-orbitron text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" /> ACCESS + CONTROLS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input
                type="number"
                min={1}
                max={500}
                value={limit}
                onChange={(e) => setLimit(Math.max(1, Math.min(500, Number(e.target.value) || 100)))}
                className="md:col-span-3 bg-slate-950 border-cyan-500/30 text-cyan-100"
              />
              <Button
                onClick={fetchLogs}
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-500 font-orbitron"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> LOADING
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" /> REFRESH LOGS
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-cyan-500/60" />
                <Input
                  placeholder="Search IP/path/indicator..."
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  className="pl-9 bg-slate-950 border-cyan-500/30 text-cyan-100"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-3 text-cyan-500/60" />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={minRisk}
                  onChange={(e) => setMinRisk(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="pl-9 bg-slate-950 border-cyan-500/30 text-cyan-100"
                />
              </div>
              <Button
                onClick={exportJson}
                disabled={filteredEvents.length === 0}
                className="bg-amber-600/20 border border-amber-500/30 text-amber-300 hover:bg-amber-600/30 font-orbitron"
              >
                <Download className="w-4 h-4 mr-2" /> EXPORT FILTERED JSON
              </Button>
            </div>

            {error && (
              <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-red-300 text-sm font-space-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
            )}

            {accessDenied && (
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300 text-sm font-space-mono">
                Login with configured admin email + password to access honeypot logs.
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-xs font-space-mono">
              <Badge className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                Total: {events.length}
              </Badge>
              <Badge className="bg-red-500/20 border border-red-500/40 text-red-300">
                High Risk (70+): {highRiskCount}
              </Badge>
              <Badge className="bg-amber-500/20 border border-amber-500/40 text-amber-300">
                Filtered: {filteredEvents.length}
              </Badge>
              <Badge className="bg-rose-500/20 border border-rose-500/40 text-rose-300">
                <Ban className="w-3 h-3 mr-1" /> Blocked IPs: {blockedIps.length}
              </Badge>
            </div>

            {blockSuccess && (
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300 text-sm font-space-mono flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> {blockSuccess}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Blocked IPs Panel ── */}
        {blockedIps.length > 0 && (
          <Card className="bg-slate-900/70 border-rose-500/30 backdrop-blur-sm mb-6">
            <CardHeader>
              <CardTitle className="text-rose-300 font-orbitron text-sm flex items-center gap-2">
                <Skull className="w-4 h-4" /> BLOCKED IPs — ACTIVE FIREWALL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {blockedIps.map((entry) => (
                  <div
                    key={entry.ip}
                    className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-slate-950 border border-rose-500/20"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs font-space-mono">
                      <Badge className="bg-rose-500/30 border-rose-500/50 text-rose-200">
                        {entry.ip}
                      </Badge>
                      <span className="text-slate-400">{entry.reason}</span>
                      <span className="text-slate-500">
                        {new Date(entry.blockedAt).toLocaleString("en-IN", { hour12: false, timeZone: "Asia/Kolkata" })}
                      </span>
                      <Badge className={entry.source === "auto" ? "bg-amber-500/20 text-amber-300" : "bg-cyan-500/20 text-cyan-300"}>
                        {entry.source}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => handleUnblockIp(entry.ip)}
                      disabled={blockingIp === entry.ip}
                      variant="outline"
                      className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-xs"
                    >
                      {blockingIp === entry.ip ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <ShieldOff className="w-3 h-3 mr-1" />
                      )}
                      UNBLOCK
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <Card
              key={event.id}
              className="bg-slate-900/60 border-cyan-500/20 backdrop-blur-sm"
            >
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-slate-800 border-slate-700 text-slate-200">
                      {event.method}
                    </Badge>
                    <Badge className="bg-cyan-500/20 border-cyan-500/40 text-cyan-300">
                      {event.targetPath}
                    </Badge>
                    <Badge
                      className={`${event.riskScore >= 70 ? "bg-red-500/20 border-red-500/40 text-red-300" : event.riskScore >= 40 ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"}`}
                    >
                      Risk {event.riskScore}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {isBlocked(event.ip) ? (
                      <Button
                        onClick={() => handleUnblockIp(event.ip)}
                        disabled={blockingIp === event.ip}
                        variant="outline"
                        className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 w-fit"
                      >
                        {blockingIp === event.ip ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ShieldOff className="w-4 h-4 mr-2" />
                        )}
                        UNBLOCK
                      </Button>
                    ) : (
                      <Button
                        onClick={() =>
                          handleBlockIp(
                            event.ip,
                            `Blocked for ${event.indicators.join(", ") || event.targetPath} (risk ${event.riskScore})`,
                          )
                        }
                        disabled={blockingIp === event.ip}
                        variant="outline"
                        className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10 w-fit"
                      >
                        {blockingIp === event.ip ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Ban className="w-4 h-4 mr-2" />
                        )}
                        BLOCK IP
                      </Button>
                    )}
                    <Button
                      onClick={() => copyIoc(event)}
                      variant="outline"
                      className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 w-fit"
                    >
                      <Copy className="w-4 h-4 mr-2" /> COPY IOC
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-space-mono">
                  <div className="text-cyan-100/80">
                    <span className="text-cyan-500/70">IP:</span> {event.ip}
                  </div>
                  <div className="text-cyan-100/80">
                    <span className="text-cyan-500/70">IP Hash:</span> {event.ipHash}
                  </div>
                  <div className="text-cyan-100/80">
                    <span className="text-cyan-500/70">Time:</span>{" "}
                    {new Date(event.timestamp).toLocaleString("en-IN", {
                      hour12: false,
                      timeZone: "Asia/Kolkata",
                    })}
                  </div>
                </div>

                {event.indicators.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.indicators.map((indicator) => (
                      <Badge
                        key={`${event.id}-${indicator}`}
                        className="bg-purple-500/20 border-purple-500/40 text-purple-300"
                      >
                        {indicator}
                      </Badge>
                    ))}
                  </div>
                )}

                {event.bodySample && (
                  <div className="mt-3 p-2 rounded bg-slate-950 border border-slate-700 text-xs font-space-mono text-slate-300 break-all">
                    {event.bodySample}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {!loading && filteredEvents.length === 0 && (
            <Card className="bg-slate-900/60 border-cyan-500/20">
              <CardContent className="p-6 text-center text-cyan-500/60 font-space-mono text-sm">
                No events match current filters.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SecurityFooter />
    </div>
  );
}
