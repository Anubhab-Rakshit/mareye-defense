"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════
// SONAR AUDIO SYSTEM — Immersive submarine audio using Web Audio API
// All sounds generated procedurally — no audio files needed
// ═══════════════════════════════════════════════════════════════

interface SonarAudioControls {
  playSonarPing: () => void;
  playTorpedoLaunch: () => void;
  playDepthCharge: () => void;
  playAlarm: (type: "dive" | "battle" | "collision" | "general") => void;
  playContactDetected: () => void;
  playMissileAlert: () => void;
  playSubmarineDive: () => void;
  playAmbientSonar: () => void;
  stopAll: () => void;
  setMasterVolume: (v: number) => void;
  isPlaying: boolean;
}

export function useSonarAudio(): SonarAudioControls {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<Set<AudioNode>>(new Set());
  const ambientIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const getCtx = useCallback((): {
    ctx: AudioContext;
    master: GainNode;
  } | null => {
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new AudioContext();
        masterGainRef.current = ctxRef.current.createGain();
        masterGainRef.current.gain.value = 0.3;
        masterGainRef.current.connect(ctxRef.current.destination);
      }
      if (ctxRef.current.state === "suspended") ctxRef.current.resume();
      return { ctx: ctxRef.current, master: masterGainRef.current! };
    } catch {
      return null;
    }
  }, []);

  const trackNode = useCallback((node: AudioNode) => {
    activeNodesRef.current.add(node);
    setIsPlaying(true);
    return node;
  }, []);

  const untrackNode = useCallback((node: AudioNode) => {
    activeNodesRef.current.delete(node);
    if (activeNodesRef.current.size === 0) setIsPlaying(false);
  }, []);

  // ═══ SONAR PING — the classic submarine sound ═══
  const playSonarPing = useCallback(() => {
    const result = getCtx();
    if (!result) return;
    const { ctx, master } = result;
    const now = ctx.currentTime;

    // Main ping oscillator — sine wave sweep from 1500Hz down to 800Hz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    trackNode(osc);
    osc.start(now);
    osc.stop(now + 1.5);
    osc.onended = () => {
      untrackNode(osc);
      osc.disconnect();
    };

    // Echo/reverb simulation — delayed quieter pings
    for (let i = 1; i <= 3; i++) {
      const echoOsc = ctx.createOscillator();
      const echoGain = ctx.createGain();
      echoOsc.type = "sine";
      echoOsc.frequency.setValueAtTime(1500 - i * 100, now + i * 0.4);
      echoOsc.frequency.exponentialRampToValueAtTime(
        800 - i * 50,
        now + i * 0.4 + 0.2,
      );
      echoGain.gain.setValueAtTime(0.15 / i, now + i * 0.4);
      echoGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.4 + 0.8);
      echoOsc.connect(echoGain);
      echoGain.connect(master);
      trackNode(echoOsc);
      echoOsc.start(now + i * 0.4);
      echoOsc.stop(now + i * 0.4 + 0.8);
      echoOsc.onended = () => {
        untrackNode(echoOsc);
        echoOsc.disconnect();
      };
    }
  }, [getCtx, trackNode, untrackNode]);

  // ═══ TORPEDO LAUNCH — metallic whoosh + propeller whine ═══
  const playTorpedoLaunch = useCallback(() => {
    const result = getCtx();
    if (!result) return;
    const { ctx, master } = result;
    const now = ctx.currentTime;

    // Tube launch — noise burst
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(2000, now);
    noiseFilter.frequency.linearRampToValueAtTime(500, now + 0.5);
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    trackNode(noise);
    noise.start(now);
    noise.onended = () => {
      untrackNode(noise);
      noise.disconnect();
    };

    // Propeller whine — rising frequency
    const prop = ctx.createOscillator();
    const propGain = ctx.createGain();
    prop.type = "sawtooth";
    prop.frequency.setValueAtTime(80, now + 0.3);
    prop.frequency.exponentialRampToValueAtTime(400, now + 2.5);
    propGain.gain.setValueAtTime(0, now);
    propGain.gain.linearRampToValueAtTime(0.3, now + 0.5);
    propGain.gain.linearRampToValueAtTime(0.05, now + 2.5);
    prop.connect(propGain);
    propGain.connect(master);
    trackNode(prop);
    prop.start(now + 0.3);
    prop.stop(now + 2.5);
    prop.onended = () => {
      untrackNode(prop);
      prop.disconnect();
    };

    // Metallic clang
    const clang = ctx.createOscillator();
    const clangGain = ctx.createGain();
    clang.type = "square";
    clang.frequency.value = 220;
    clangGain.gain.setValueAtTime(0.5, now);
    clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    clang.connect(clangGain);
    clangGain.connect(master);
    trackNode(clang);
    clang.start(now);
    clang.stop(now + 0.15);
    clang.onended = () => {
      untrackNode(clang);
      clang.disconnect();
    };
  }, [getCtx, trackNode, untrackNode]);

  // ═══ DEPTH CHARGE — deep explosion + rumble ═══
  const playDepthCharge = useCallback(() => {
    const result = getCtx();
    if (!result) return;
    const { ctx, master } = result;
    const now = ctx.currentTime;

    // Deep boom
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = "sine";
    boom.frequency.setValueAtTime(60, now);
    boom.frequency.exponentialRampToValueAtTime(20, now + 1.5);
    boomGain.gain.setValueAtTime(0.8, now + 0.05);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
    boom.connect(boomGain);
    boomGain.connect(master);
    trackNode(boom);
    boom.start(now);
    boom.stop(now + 2);
    boom.onended = () => {
      untrackNode(boom);
      boom.disconnect();
    };

    // Explosion noise
    const expLen = ctx.sampleRate * 2;
    const expBuf = ctx.createBuffer(1, expLen, ctx.sampleRate);
    const expData = expBuf.getChannelData(0);
    for (let i = 0; i < expLen; i++) {
      expData[i] =
        (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.4));
    }
    const expNoise = ctx.createBufferSource();
    expNoise.buffer = expBuf;
    const expGain = ctx.createGain();
    const expFilter = ctx.createBiquadFilter();
    expFilter.type = "lowpass";
    expFilter.frequency.setValueAtTime(800, now);
    expFilter.frequency.exponentialRampToValueAtTime(100, now + 2);
    expGain.gain.setValueAtTime(0.6, now + 0.02);
    expGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
    expNoise.connect(expFilter);
    expFilter.connect(expGain);
    expGain.connect(master);
    trackNode(expNoise);
    expNoise.start(now);
    expNoise.onended = () => {
      untrackNode(expNoise);
      expNoise.disconnect();
    };

    // Hull rattle
    const rattle = ctx.createOscillator();
    const rattleGain = ctx.createGain();
    rattle.type = "triangle";
    rattle.frequency.setValueAtTime(150, now + 0.1);
    rattle.frequency.setValueAtTime(200, now + 0.15);
    rattle.frequency.setValueAtTime(120, now + 0.2);
    rattle.frequency.setValueAtTime(180, now + 0.25);
    rattleGain.gain.setValueAtTime(0.3, now + 0.1);
    rattleGain.gain.exponentialRampToValueAtTime(0.001, now + 1);
    rattle.connect(rattleGain);
    rattleGain.connect(master);
    trackNode(rattle);
    rattle.start(now + 0.1);
    rattle.stop(now + 1);
    rattle.onended = () => {
      untrackNode(rattle);
      rattle.disconnect();
    };
  }, [getCtx, trackNode, untrackNode]);

  // ═══ ALARM — dive/battle/collision/general ═══
  const playAlarm = useCallback(
    (type: "dive" | "battle" | "collision" | "general") => {
      const result = getCtx();
      if (!result) return;
      const { ctx, master } = result;
      const now = ctx.currentTime;

      const configs = {
        dive: { freq1: 400, freq2: 600, interval: 0.5, count: 6 },
        battle: { freq1: 800, freq2: 1200, interval: 0.25, count: 10 },
        collision: { freq1: 300, freq2: 500, interval: 0.3, count: 8 },
        general: { freq1: 600, freq2: 900, interval: 0.4, count: 5 },
      };
      const cfg = configs[type];

      for (let i = 0; i < cfg.count; i++) {
        const t = now + i * cfg.interval;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(cfg.freq1, t);
        osc.frequency.linearRampToValueAtTime(
          cfg.freq2,
          t + cfg.interval * 0.4,
        );
        osc.frequency.linearRampToValueAtTime(
          cfg.freq1,
          t + cfg.interval * 0.8,
        );
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.setValueAtTime(0, t + cfg.interval * 0.9);
        osc.connect(gain);
        gain.connect(master);
        trackNode(osc);
        osc.start(t);
        osc.stop(t + cfg.interval);
        osc.onended = () => {
          untrackNode(osc);
          osc.disconnect();
        };
      }
    },
    [getCtx, trackNode, untrackNode],
  );

  // ═══ CONTACT DETECTED — sonar blip + notification ═══
  const playContactDetected = useCallback(() => {
    const result = getCtx();
    if (!result) return;
    const { ctx, master } = result;
    const now = ctx.currentTime;

    // Double blip
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 2000;
      gain.gain.setValueAtTime(0.4, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.1);
      osc.connect(gain);
      gain.connect(master);
      trackNode(osc);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.1);
      osc.onended = () => {
        untrackNode(osc);
        osc.disconnect();
      };
    }

    // Low confirmation tone
    const conf = ctx.createOscillator();
    const confGain = ctx.createGain();
    conf.type = "sine";
    conf.frequency.value = 440;
    confGain.gain.setValueAtTime(0.2, now + 0.35);
    confGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    conf.connect(confGain);
    confGain.connect(master);
    trackNode(conf);
    conf.start(now + 0.35);
    conf.stop(now + 0.8);
    conf.onended = () => {
      untrackNode(conf);
      conf.disconnect();
    };
  }, [getCtx, trackNode, untrackNode]);

  // ═══ MISSILE ALERT — urgent ascending sirens ═══
  const playMissileAlert = useCallback(() => {
    const result = getCtx();
    if (!result) return;
    const { ctx, master } = result;
    const now = ctx.currentTime;

    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.6;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(2000, t + 0.3);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.5);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.setValueAtTime(0, t + 0.55);
      osc.connect(gain);
      gain.connect(master);
      trackNode(osc);
      osc.start(t);
      osc.stop(t + 0.6);
      osc.onended = () => {
        untrackNode(osc);
        osc.disconnect();
      };
    }
  }, [getCtx, trackNode, untrackNode]);

  // ═══ SUBMARINE DIVE — ballast flooding sound ═══
  const playSubmarineDive = useCallback(() => {
    const result = getCtx();
    if (!result) return;
    const { ctx, master } = result;
    const now = ctx.currentTime;

    // Water rushing noise
    const waterLen = ctx.sampleRate * 4;
    const waterBuf = ctx.createBuffer(1, waterLen, ctx.sampleRate);
    const waterData = waterBuf.getChannelData(0);
    for (let i = 0; i < waterLen; i++) {
      const env = Math.sin((i / waterLen) * Math.PI);
      waterData[i] = (Math.random() * 2 - 1) * env * 0.5;
    }
    const water = ctx.createBufferSource();
    water.buffer = waterBuf;
    const waterFilter = ctx.createBiquadFilter();
    waterFilter.type = "lowpass";
    waterFilter.frequency.setValueAtTime(2000, now);
    waterFilter.frequency.linearRampToValueAtTime(400, now + 4);
    const waterGain = ctx.createGain();
    waterGain.gain.value = 0.4;
    water.connect(waterFilter);
    waterFilter.connect(waterGain);
    waterGain.connect(master);
    trackNode(water);
    water.start(now);
    water.onended = () => {
      untrackNode(water);
      water.disconnect();
    };

    // Creaking hull
    for (let i = 0; i < 3; i++) {
      const creak = ctx.createOscillator();
      const creakGain = ctx.createGain();
      creak.type = "triangle";
      const t = now + 0.8 + i * 1.2;
      creak.frequency.setValueAtTime(80 + Math.random() * 40, t);
      creak.frequency.linearRampToValueAtTime(60 + Math.random() * 30, t + 0.4);
      creakGain.gain.setValueAtTime(0.15, t);
      creakGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      creak.connect(creakGain);
      creakGain.connect(master);
      trackNode(creak);
      creak.start(t);
      creak.stop(t + 0.5);
      creak.onended = () => {
        untrackNode(creak);
        creak.disconnect();
      };
    }

    // Dive alarm klaxon — 2 blasts
    for (let i = 0; i < 2; i++) {
      const klaxon = ctx.createOscillator();
      const klaxonGain = ctx.createGain();
      klaxon.type = "square";
      klaxon.frequency.value = 500;
      klaxonGain.gain.setValueAtTime(0.2, now + i * 0.8);
      klaxonGain.gain.setValueAtTime(0, now + i * 0.8 + 0.6);
      klaxon.connect(klaxonGain);
      klaxonGain.connect(master);
      trackNode(klaxon);
      klaxon.start(now + i * 0.8);
      klaxon.stop(now + i * 0.8 + 0.6);
      klaxon.onended = () => {
        untrackNode(klaxon);
        klaxon.disconnect();
      };
    }
  }, [getCtx, trackNode, untrackNode]);

  // ═══ AMBIENT SONAR — periodic pings for immersion ═══
  const playAmbientSonar = useCallback(() => {
    if (ambientIntervalRef.current) return; // Already playing
    playSonarPing();
    ambientIntervalRef.current = setInterval(() => {
      playSonarPing();
    }, 6000); // Ping every 6 seconds
  }, [playSonarPing]);

  // ═══ STOP EVERYTHING ═══
  const stopAll = useCallback(() => {
    if (ambientIntervalRef.current) {
      clearInterval(ambientIntervalRef.current);
      ambientIntervalRef.current = null;
    }
    activeNodesRef.current.forEach((node) => {
      try {
        (node as any).stop?.();
      } catch {}
      try {
        node.disconnect();
      } catch {}
    });
    activeNodesRef.current.clear();
    setIsPlaying(false);
    if (ctxRef.current) {
      try {
        ctxRef.current.close();
      } catch {}
      ctxRef.current = null;
    }
  }, []);

  const setMasterVolume = useCallback((v: number) => {
    if (masterGainRef.current)
      masterGainRef.current.gain.value = Math.max(0, Math.min(1, v));
  }, []);

  useEffect(() => {
    return () => {
      if (ambientIntervalRef.current) clearInterval(ambientIntervalRef.current);
      if (ctxRef.current) {
        try {
          ctxRef.current.close();
        } catch {}
      }
    };
  }, []);

  return {
    playSonarPing,
    playTorpedoLaunch,
    playDepthCharge,
    playAlarm,
    playContactDetected,
    playMissileAlert,
    playSubmarineDive,
    playAmbientSonar,
    stopAll,
    setMasterVolume,
    isPlaying,
  };
}

// ═══ AUDIO CONTROL PANEL — visual UI for testing sounds ═══
export function SonarAudioPanel() {
  const audio = useSonarAudio();
  const [volume, setVolume] = useState(30);

  return (
    <div className="bg-slate-950/90 border border-cyan-500/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-orbitron text-cyan-400 tracking-wider">
          SONAR AUDIO SYSTEM
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-space-mono text-cyan-400/50">
            VOL
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              setVolume(+e.target.value);
              audio.setMasterVolume(+e.target.value / 100);
            }}
            className="w-16 h-1 accent-cyan-500"
          />
          <span className="text-[9px] font-space-mono text-cyan-400/70">
            {volume}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "SONAR PING", fn: audio.playSonarPing, color: "cyan" },
          { label: "TORPEDO", fn: audio.playTorpedoLaunch, color: "red" },
          { label: "DEPTH CHARGE", fn: audio.playDepthCharge, color: "orange" },
          { label: "CONTACT", fn: audio.playContactDetected, color: "emerald" },
          {
            label: "DIVE ALARM",
            fn: () => audio.playAlarm("dive"),
            color: "yellow",
          },
          {
            label: "BATTLE",
            fn: () => audio.playAlarm("battle"),
            color: "red",
          },
          { label: "MISSILE", fn: audio.playMissileAlert, color: "red" },
          { label: "DIVE", fn: audio.playSubmarineDive, color: "blue" },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.fn}
            className={`px-2 py-1.5 rounded text-[8px] font-orbitron tracking-wider border transition-all hover:scale-105 active:scale-95
              ${
                btn.color === "red"
                  ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  : btn.color === "orange"
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                    : btn.color === "yellow"
                      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                      : btn.color === "emerald"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : btn.color === "blue"
                          ? "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                          : "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
              }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={audio.playAmbientSonar}
          className="flex-1 px-2 py-1.5 rounded text-[8px] font-orbitron tracking-wider border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all"
        >
          AMBIENT MODE
        </button>
        <button
          onClick={audio.stopAll}
          className="flex-1 px-2 py-1.5 rounded text-[8px] font-orbitron tracking-wider border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
        >
          STOP ALL
        </button>
      </div>
    </div>
  );
}
