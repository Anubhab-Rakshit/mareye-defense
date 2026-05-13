"use client";

import { useState, useEffect, useRef } from "react";
import { Radio, AlertTriangle, Shield, Terminal, Volume2 } from "lucide-react";

const SAMPLE_INTERCEPTS = [
  "ALPHA TANGO 9... ZZZCH... CARGO SIGHTED... ZZZCH... PREPARE TO BOARD...",
  "WHISKEY ACTUAL... ZZZCH... NIGHT OPS GREEN... ZZZCH... THREE MILES OUT...",
  "ZZZCH... VECTOR 045... ZZZCH... RADAR BLIND... ZZZCH... GOING DARK...",
];

export default function CommIntercept() {
  const [scanning, setScanning] = useState(true);
  const [interceptText, setInterceptText] = useState("");
  const [decryption, setDecryption] = useState("");
  const [isDecrypting, setIsDecrypting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Audio Waveform Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerY = canvas.height / 2;
      
      ctx.beginPath();
      ctx.moveTo(0, centerY);

      // Amplitude based on scanning/decrypting state
      const baseAmp = scanning ? 20 : isDecrypting ? 50 : 5;
      
      for (let i = 0; i < canvas.width; i++) {
        // Complex waveform using multiple sine waves
        const amplitude = baseAmp * Math.random() * (scanning ? 0.5 : 1);
        const y = centerY + Math.sin(i * 0.05 + time) * amplitude * Math.sin(i * 0.01) + (Math.random() - 0.5) * (scanning ? 5 : isDecrypting ? 20 : 2);
        ctx.lineTo(i, y);
      }

      ctx.strokeStyle = isDecrypting ? "#ef4444" : "#06b6d4";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.stroke();

      time += 0.1;
      animFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animFrame);
  }, [scanning, isDecrypting]);

  const handleIntercept = async () => {
    setScanning(false);
    setIsDecrypting(true);
    setDecryption("");
    
    // Pick a random simulated intercept
    const rawSignal = "STATIC..." + SAMPLE_INTERCEPTS[Math.floor(Math.random() * SAMPLE_INTERCEPTS.length)] + "...END STATIC";
    setInterceptText(rawSignal);

    try {
      const response = await fetch("/api/ai/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intercept: rawSignal }),
      });

      if (!response.ok) throw new Error("Decryption failed");

      const data = await response.json();
      
      // Simulate typing effect for decryption
      const text = data.decryption || "ERROR: SIGNAL DECRYPT FAILURE.";
      let i = 0;
      const typeWriter = setInterval(() => {
        setDecryption(prev => prev + text.charAt(i));
        i++;
        if (i >= text.length) {
          clearInterval(typeWriter);
          setIsDecrypting(false);
        }
      }, 30); // 30ms per character for a fast terminal feel

    } catch (err) {
      console.error(err);
      setDecryption("ERROR: CONNECTION TO SIGINT SERVER LOST.");
      setIsDecrypting(false);
    }
  };

  const resetScanner = () => {
    setScanning(true);
    setIsDecrypting(false);
    setInterceptText("");
    setDecryption("");
  };

  return (
    <div className="min-h-screen bg-slate-950 font-space-mono text-cyan-400 p-8 pt-32 overflow-hidden flex flex-col relative">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[url('/tactical-grid.png')] bg-center opacity-10 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
          <Radio className="w-8 h-8 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-orbitron font-bold tracking-widest text-white shadow-cyan-500/50 drop-shadow-lg">SIGINT INTERCEPT ENGINE</h1>
          <p className="text-sm opacity-60 uppercase tracking-widest">Marine Security // Artificial Intelligence Division</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        {/* Left Column: Scanner Control */}
        <div className="lg:col-span-1 border border-cyan-500/20 bg-slate-900/50 rounded-xl p-6 flex flex-col relative overflow-hidden backdrop-blur-sm">
           {/* Animated Scanner Bar if scanning */}
           {scanning && <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-400/50 animate-scan pointer-events-none" />}

          <h2 className="text-xl font-orbitron mb-6 flex items-center gap-2 border-b border-cyan-500/20 pb-4">
            <Volume2 className="w-5 h-5" /> RECEIVER STATUS
          </h2>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between border border-cyan-500/10 p-3 rounded bg-black/40">
              <span className="opacity-50">FREQ</span>
              <span className="text-cyan-300 font-bold">{scanning ? "AUTO-SCAN" : "156.800 MHz"}</span>
            </div>
            <div className="flex justify-between border border-cyan-500/10 p-3 rounded bg-black/40">
              <span className="opacity-50">CHANNEL</span>
              <span className="text-cyan-300 font-bold">VHF 16 (DISTRESS/CALL)</span>
            </div>
            <div className="flex justify-between border border-cyan-500/10 p-3 rounded bg-black/40">
              <span className="opacity-50">ENCRYPTION</span>
              <span className={`font-bold ${scanning ? "text-amber-500" : "text-red-500"}`}>{scanning ? "UNKNOWN" : "DETECTED"}</span>
            </div>
          </div>

          <div className="mt-auto">
            {scanning ? (
              <button 
                onClick={handleIntercept}
                className="w-full py-4 bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/50 rounded flex items-center justify-center gap-2 transition-all font-bold tracking-widest"
              >
                <AlertTriangle className="w-5 h-5" /> FORCE INTERCEPT
              </button>
            ) : (
              <button 
                onClick={resetScanner}
                disabled={isDecrypting}
                className="w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              >
                Reset Receiver
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Waveform & Output */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Waveform Canvas */}
          <div className="h-48 border border-cyan-500/30 bg-black/60 rounded-xl relative overflow-hidden flex items-center justify-center">
             <div className="absolute top-2 left-2 text-[10px] opacity-50 tracking-widest z-10">LIVE_AUDIO_FEED</div>
             <canvas 
                ref={canvasRef} 
                width={800} 
                height={200} 
                className="w-full h-full opacity-80"
             />
             {isDecrypting && <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />}
             {scanning && <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-2xl font-orbitron text-cyan-500/20 tracking-widest animate-pulse">MONITORING FREQUENCIES...</span>
             </div>}
          </div>

          {/* Terminal Output */}
          <div className="flex-1 border border-cyan-500/30 bg-black/80 rounded-xl p-6 relative flex flex-col">
            <div className="flex items-center gap-2 mb-4 border-b border-cyan-500/30 pb-4">
               <Terminal className="w-5 h-5 opacity-70" />
               <span className="font-orbitron tracking-widest opacity-70">DECRYPTION ENGINE V4</span>
               {isDecrypting && <span className="ml-auto text-red-400 text-xs animate-pulse">PROCESSING NEURAL DECRYPT...</span>}
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
               {!scanning && (
                  <div className="space-y-2">
                    <div className="text-xs opacity-50 uppercase">Raw Intercept Signal:</div>
                    <div className="p-3 bg-red-900/20 border border-red-500/20 rounded text-red-300/70 font-mono break-all text-sm">
                       {interceptText}
                    </div>
                  </div>
               )}

               {(!scanning && (decryption || isDecrypting)) && (
                   <div className="space-y-2">
                   <div className="text-xs opacity-50 uppercase flex items-center gap-2">
                     <Shield className="w-3 h-3 text-cyan-400" /> AI Decrypted Intel:
                   </div>
                   <div className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded text-cyan-100 font-mono text-sm leading-relaxed whitespace-pre-wrap relative shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]">
                      {decryption}
                      {isDecrypting && <span className="inline-block w-2 h-4 bg-cyan-500 ml-1 animate-pulse align-middle" />}
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
