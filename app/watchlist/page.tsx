"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TacticalDataPanel } from "@/components/tactical-data-panel";
import {
  Activity,
  AlertTriangle,
  BookmarkPlus,
  Brain,
  CheckCircle2,
  Database,
  Loader2,
  Search,
  Target,
  Trash2,
} from "lucide-react";

type ItemType = "gene_sequence" | "image_recognition";

interface WatchlistItem {
  _id: string;
  itemType: ItemType;
  referenceId?: string | null;
  title?: string | null;
  summary?: string | null;
  dataPreview?: string | null;
  score?: number | null;
  createdAt: string;
}

export default function WatchlistPage() {
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeType, setActiveType] = useState<ItemType | "all">("all");
  const [query, setQuery] = useState("");

  const [formType, setFormType] = useState<ItemType>("image_recognition");
  const [formTitle, setFormTitle] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formScore, setFormScore] = useState<string>("");

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/try");
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load watchlist (${res.status})`);
      }
      const data = await res.json();
      const fetched = Array.isArray(data.items) ? data.items : [];
      setItems(fetched);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load watchlist items.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeType !== "all" && item.itemType !== activeType) return false;
      if (!query.trim()) return true;
      const text = query.toLowerCase();
      const joined = [
        item.title,
        item.summary,
        item.referenceId,
        item.dataPreview,
        item.itemType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return joined.includes(text);
    });
  }, [items, activeType, query]);

  const handleCreate = async () => {
    if (!formTitle.trim() && !formSummary.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        itemType: formType,
        title: formTitle || undefined,
        summary: formSummary || undefined,
        score: formScore ? Number(formScore) : undefined,
      };
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to add to watchlist");
      }
      setFormTitle("");
      setFormSummary("");
      setFormScore("");
      await fetchItems();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add to watchlist.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this item from the watchlist?")) return;
    try {
      const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove from watchlist");
      }
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to remove item from watchlist.",
      );
    }
  };

  const totalByType = useMemo(
    () => ({
      gene: items.filter((i) => i.itemType === "gene_sequence").length,
      vision: items.filter((i) => i.itemType === "image_recognition").length,
    }),
    [items],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 relative pb-16">
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.9),_transparent_55%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center shadow-xl shadow-cyan-500/20">
              <Target className="w-8 h-8 text-cyan-100" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-orbitron font-black text-white tracking-[0.2em]">
                WATCHLIST
              </h1>
              <p className="text-cyan-200/80 font-space-mono text-xs md:text-sm mt-1">
                Curate high-value targets and critical AI outputs for ongoing
                scrutiny.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <span className="text-[10px] font-space-mono text-cyan-300/70 uppercase tracking-[0.25em]">
              REAL-TIME OPERATOR WATCHBOARD
            </span>
            <span className="text-[10px] font-space-mono text-slate-400">
              {new Date().toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour12: false,
              })}{" "}
              IST
            </span>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card className="bg-slate-950/60 border border-cyan-500/30 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-cyan-200">
                    <BookmarkPlus className="w-5 h-5 text-cyan-400" />
                    <span className="font-orbitron tracking-[0.2em] text-xs">
                      ADD TO WATCHLIST
                    </span>
                  </span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Auto-pins latest intelligence
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-space-mono text-cyan-300/70 uppercase tracking-[0.2em] mb-1 block">
                      Signal Type
                    </label>
                    <Tabs
                      value={formType}
                      onValueChange={(v) =>
                        setFormType(v as ItemType)
                      }
                      className="w-full"
                    >
                      <TabsList className="w-full grid grid-cols-2 bg-slate-900/60 border border-cyan-500/30">
                        <TabsTrigger
                          value="image_recognition"
                          className="text-[10px] font-space-mono"
                        >
                          <Brain className="w-3 h-3 mr-1" />
                          Vision
                        </TabsTrigger>
                        <TabsTrigger
                          value="gene_sequence"
                          className="text-[10px] font-space-mono"
                        >
                          <Database className="w-3 h-3 mr-1" />
                          Sequence
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-space-mono text-cyan-300/70 uppercase tracking-[0.2em] mb-1 block">
                      Title
                    </label>
                    <Input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Submerged contact near choke point BRAVO"
                      className="bg-slate-950 border-cyan-500/40 text-cyan-100 placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-space-mono text-cyan-300/70 uppercase tracking-[0.2em] mb-1 block">
                      Score
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={formScore}
                      onChange={(e) => setFormScore(e.target.value)}
                      placeholder="0 - 100"
                      className="bg-slate-950 border-cyan-500/40 text-cyan-100 placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-space-mono text-cyan-300/70 uppercase tracking-[0.2em] mb-1 block">
                    Brief
                  </label>
                  <textarea
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    rows={3}
                    placeholder="Short operator rationale: why this target stays on the board."
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-md px-3 py-2 text-sm text-cyan-100 font-space-mono resize-none placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-[10px] font-space-mono text-slate-400">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    {items.length} total watch entries
                  </div>
                  <Button
                    onClick={handleCreate}
                    disabled={submitting}
                    className="bg-cyan-600 hover:bg-cyan-500 text-xs font-orbitron tracking-[0.2em] px-5"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ARMED...
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-4 h-4 mr-2" />
                        COMMIT ENTRY
                      </>
                    )}
                  </Button>
                </div>

                {error && (
                  <div className="mt-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-space-mono text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-950/60 border border-cyan-500/30 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-cyan-200">
                    <Target className="w-5 h-5 text-cyan-400" />
                    <span className="font-orbitron tracking-[0.2em] text-xs">
                      ACTIVE WATCH TARGETS
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2 top-[7px] text-cyan-400/50" />
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Filter by title, summary, signal..."
                        className="pl-7 h-8 w-56 bg-slate-950 border-cyan-500/40 text-[11px] font-space-mono text-cyan-100 placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={activeType}
                  onValueChange={(v) =>
                    setActiveType(v as ItemType | "all")
                  }
                  className="w-full"
                >
                  <TabsList className="bg-slate-900/70 border border-cyan-500/30 mb-4">
                    <TabsTrigger
                      value="all"
                      className="text-[10px] font-space-mono"
                    >
                      All ({items.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="image_recognition"
                      className="text-[10px] font-space-mono"
                    >
                      Vision ({totalByType.vision})
                    </TabsTrigger>
                    <TabsTrigger
                      value="gene_sequence"
                      className="text-[10px] font-space-mono"
                    >
                      Sequence ({totalByType.gene})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeType} className="mt-0">
                    {loading ? (
                      <div className="py-12 flex flex-col items-center justify-center text-cyan-200">
                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                        <p className="text-xs font-space-mono">
                          Synchronising watch targets from command core...
                        </p>
                      </div>
                    ) : filteredItems.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 text-sm font-space-mono">
                        No entries match the current filters.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                        {filteredItems.map((item) => {
                          const isVision = item.itemType === "image_recognition";
                          const score = item.score ?? undefined;
                          const tone =
                            typeof score === "number" && score >= 80
                              ? "text-red-400"
                              : typeof score === "number" && score >= 60
                                ? "text-amber-300"
                                : "text-emerald-300";

                          return (
                            <div
                              key={item._id}
                              className="group flex items-start gap-3 rounded-lg border border-cyan-500/20 bg-slate-900/70 px-3 py-2 hover:border-cyan-400/50 hover:bg-slate-900/90 transition-all"
                            >
                              <div className="mt-1">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                                    isVision
                                      ? "border-cyan-400/60 bg-cyan-500/10"
                                      : "border-emerald-400/60 bg-emerald-500/10"
                                  }`}
                                >
                                  {isVision ? (
                                    <Brain className="w-3 h-3 text-cyan-300" />
                                  ) : (
                                    <Database className="w-3 h-3 text-emerald-300" />
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-xs font-orbitron text-white tracking-[0.15em] truncate">
                                    {item.title || "UNTITLED SIGNAL"}
                                  </p>
                                  {typeof score === "number" && (
                                    <Badge
                                      className={`ml-auto text-[9px] font-space-mono ${tone.replace("text-", "border-")} ${tone.replace("text-", "bg-")}/20`}
                                    >
                                      SCORE {score}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] font-space-mono text-slate-300 line-clamp-2">
                                  {item.summary ||
                                    item.dataPreview ||
                                    "No summary provided."}
                                </p>
                                <div className="mt-1 flex items-center gap-3 text-[10px] font-space-mono text-slate-500">
                                  <span>
                                    {new Date(item.createdAt).toLocaleString(
                                      "en-IN",
                                      {
                                        timeZone: "Asia/Kolkata",
                                        hour12: false,
                                      },
                                    )}
                                  </span>
                                  {item.referenceId && (
                                    <span className="truncate">
                                      Ref: {item.referenceId}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                className="mt-1 h-8 w-8 border-red-500/40 text-red-300 hover:bg-red-500/15"
                                onClick={() => handleDelete(item._id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <TacticalDataPanel
              title="WATCHLIST HEALTH"
              icon={<Activity className="w-4 h-4" />}
              color="cyan"
              className="text-sm"
            >
              <div className="space-y-3 text-[11px] font-space-mono text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Total Entries</span>
                  <span className="font-orbitron text-cyan-300">
                    {items.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Vision Targets</span>
                  <span className="font-orbitron text-cyan-300">
                    {totalByType.vision}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sequence Intel</span>
                  <span className="font-orbitron text-cyan-300">
                    {totalByType.gene}
                  </span>
                </div>
                <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400"
                    style={{
                      width: `${
                        items.length === 0
                          ? 5
                          : Math.min(100, items.length * 8)
                      }%`,
                    }}
                  />
                </div>
              </div>
            </TacticalDataPanel>

            <TacticalDataPanel
              title="CURATION DOCTRINE"
              icon={<Brain className="w-4 h-4" />}
              color="emerald"
              className="text-[11px] font-space-mono text-slate-300"
            >
              <ul className="space-y-2 list-disc list-inside">
                <li>Keep only high-signal events that influence tasking.</li>
                <li>Collapse duplicates into a single curated entry.</li>
                <li>Use scores to prioritise war-room call-outs.</li>
              </ul>
            </TacticalDataPanel>
          </div>
        </section>
      </div>
    </div>
  );
}

