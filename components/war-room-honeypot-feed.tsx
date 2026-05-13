"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Ban,
  Fingerprint,
  Loader2,
  PlayCircle,
  RefreshCw,
  Shield,
  ShieldOff,
  Skull,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

type HoneypotEvent = {
  id: string;
  timestamp: string;
  ip: string;
  targetPath: string;
  indicators: string[];
  riskScore: number;
};

export function WarRoomHoneypotFeed() {
  const [events, setEvents] = useState<HoneypotEvent[]>([]);
  const [blockedIps, setBlockedIps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, blockRes] = await Promise.all([
        fetch("/api/security/honeypot-logs?limit=40", { cache: "no-store" }),
        fetch("/api/security/block-ip", { cache: "no-store" }),
      ]);

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setEvents(Array.isArray(logsData.events) ? logsData.events : []);
      } else if (logsRes.status === 404 || logsRes.status === 403) {
        setError("HONEYPOT CONSOLE LOCKED (Admin only)");
        setEvents([]);
      }

      if (blockRes.ok) {
        const blockData = await blockRes.json();
        setBlockedIps(Array.isArray(blockData.blocked) ? blockData.blocked.map((b: any) => b.ip) : []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch activity.");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockAction = async (ip: string, action: "block" | "unblock") => {
    setActionLoading(ip);
    try {
      const res = await fetch("/api/security/block-ip", {
        method: action === "block" ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ip, reason: "Manual intervention via War Room Console" }),
      });

      if (res.ok) {
        toast.success(`IP successfully ${action === "block" ? "blocked" : "unblocked"}`);
        await fetchLogs();
      } else {
        toast.error(`Failed to ${action} IP`);
      }
    } catch (e) {
      toast.error("Network error modifying blocklist");
    } finally {
      setActionLoading(null);
    }
  };

  const simulateAttack = async () => {
    setLoading(true);
    try {
      // Small delay for dramatic effect
      await new Promise(r => setTimeout(r, 800));
      
      const mockIps = ["194.31.22.103", "45.155.205.233", "82.102.21.44", "103.14.244.11"];
      const mockPaths = ["/.env", "/wp-admin/config.php", "/api/v1/debug/dump", "/admin/login"];
      
      const ip = mockIps[Math.floor(Math.random() * mockIps.length)];
      const path = mockPaths[Math.floor(Math.random() * mockPaths.length)];

      const res = await fetch("/api/honeypot/trap?target=" + path, {
        method: "POST",
        headers: {
          "x-forwarded-for": ip,
          "User-Agent": "Mozilla/5.0 (compatible; Nmap Scripting Engine; https://nmap.org/book/nse.html)",
        }
      });

      if (res.ok) {
        toast.success("Attack Simulation Triggered", {
          description: `Intrusion attempt recorded from ${ip} → ${path}`,
          icon: <Skull className="w-4 h-4 text-red-500" />,
        });
        await fetchLogs();
      }
    } catch (e) {
      toast.error("Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 15_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const highRisk = useMemo(
    () => events.filter((e) => e.riskScore >= 70).length,
    [events],
  );

  return (
    <Card className="bg-slate-900/60 border border-red-500/30 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Skull className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[10px] font-orbitron text-red-300 tracking-wider">
            WAR ROOM HONEYPOT FEED
          </span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 border-red-500/40 text-red-300 hover:bg-red-500/10"
          onClick={fetchLogs}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-3 text-[9px] font-space-mono">
        <Badge className="bg-red-500/20 border-red-500/40 text-red-200 px-1.5 py-0">
          {highRisk} HIGH-RISK
        </Badge>
        <Badge className="bg-slate-800 border-slate-700 text-slate-200 px-1.5 py-0">
          {events.length} EVENTS
        </Badge>
        <Button 
          variant="ghost" 
          size="sm" 
          className="ml-auto h-5 px-1.5 text-[8px] text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1"
          onClick={simulateAttack}
          disabled={loading}
        >
          <Zap className="w-2.5 h-2.5" />
          SIMULATE ATTACK
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[9px] font-space-mono text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2 mb-2">
          <AlertTriangle className="w-3 h-3" />
          <span className="truncate">{error}</span>
        </div>
      )}

      <div className="max-h-52 overflow-y-auto war-scroll space-y-1">
        {events.slice(0, 25).map((event) => {
          const levelClass =
            event.riskScore >= 80
              ? "border-red-500/50 bg-red-500/5"
              : event.riskScore >= 50
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-emerald-500/30 bg-emerald-500/5";

          return (
            <div
              key={event.id}
              className={`px-2 py-1.5 rounded border text-[8px] font-space-mono flex items-start gap-2 relative group ${levelClass}`}
            >
              <div className="mt-0.5">
                <Shield className={`w-3 h-3 ${blockedIps.includes(event.ip) ? "text-red-500" : "text-red-300"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-100 truncate flex items-center gap-1">
                    {event.ip}
                    {blockedIps.includes(event.ip) && <Ban className="w-2.5 h-2.5 text-red-500" />}
                  </span>
                  <span className="text-[7px] text-slate-400">
                    {new Date(event.timestamp).toLocaleTimeString("en-IN", {
                      hour12: false,
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="truncate text-slate-300">
                    {event.targetPath}
                  </span>
                  <span className="text-[7px] text-red-300 font-bold">
                    RISK {event.riskScore}
                  </span>
                </div>
                
                {/* Action Row */}
                <div className="mt-1.5 flex items-center justify-between">
                  <div className="text-[6px] text-slate-500 uppercase tracking-tighter">
                    {event.indicators?.slice(0, 2).join(" | ") || "No indicators"}
                  </div>
                  <div className="flex gap-1">
                    {blockedIps.includes(event.ip) ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 px-1 text-[7px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        onClick={() => handleBlockAction(event.ip, "unblock")}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === event.ip ? <Loader2 className="w-2 h-2 animate-spin" /> : <ShieldOff className="w-2 h-2 mr-0.5" />}
                        UNBLOCK
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 px-1 text-[7px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleBlockAction(event.ip, "block")}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === event.ip ? <Loader2 className="w-2 h-2 animate-spin" /> : <Ban className="w-2 h-2 mr-0.5" />}
                        BLOCK
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && !error && events.length === 0 && (
          <p className="text-[8px] text-slate-500 font-space-mono text-center py-3">
            No honeypot activity in the current window.
          </p>
        )}
      </div>
    </Card>
  );
}

