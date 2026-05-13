"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX, X, Radar, Shield, Mic } from "lucide-react";
import { DeepSeaBorderEffect } from "./deep-sea-border-effect";

type AssistantState =
  | "listening-wake"
  | "listening-command"
  | "processing"
  | "speaking";

interface TranscriptEntry {
  type: "user" | "mareye";
  text: string;
  timestamp: Date;
}

const WAKE_WORD_ALIASES = [
  "mareye",
  "mar eye",
  "marine eye",
  "marine ai",
  "marine i",
  "marine aye",
  "marina eye",
  "marinee eye",
  "ma rye",
  "my rain eye",
  "marry eye",
  "miracle eye",
  "marry ai",
  "hey mar",
  "hi mar",
];

export function MareyeVoiceAssistant() {
  const [state, setState] = useState<AssistantState>("listening-wake");
  const [initialized, setInitialized] = useState(false);
  const [micLevel, setMicLevel] = useState(0); 
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null); // null until hydrated
  const [borderActive, setBorderActive] = useState(false);
  const [isLikelyDataQuery, setIsLikelyDataQuery] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("AWAITING SYNC");
  const [isSecure, setIsSecure] = useState(true);

  // ═══ REFS ═══
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isMutedRef = useRef(false);
  const currentTranscriptRef = useRef("");
  const wakeWordHeardRef = useRef(false);
  const speechDetectedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const commandTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wakeRestartPendingRef = useRef(false);
  const ttsSafetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRequestIdRef = useRef(0);
  const startWakeRef = useRef<() => void>(() => {});
  const sessionActiveRef = useRef(false);
  const mountedRef = useRef(true);
  const debugEnabledRef = useRef(false);
  const lastDebugTranscriptRef = useRef("");
  const lastDebugAtRef = useRef(0);

  const ensureMicrophoneReady = useCallback(async () => {
    if (typeof window === "undefined") return null;
    if (!navigator.mediaDevices?.getUserMedia) {
      setSyncStatus("API_UNSUPPORTED");
      return null;
    }

    try {
      setSyncStatus("CONNECTING...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevel = () => {
        if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          audioCtx.close();
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / (bufferLength || 1);
        setMicLevel(average || 0);
        
        if (average > 1) {
          setSyncStatus("SIGNAL_LOCKED");
        }
        requestAnimationFrame(updateLevel);
      };
      updateLevel();

      return stream;
    } catch (err: any) {
      setSyncStatus(`OFFLINE: ${err.name || 'DENIED'}`);
      console.error("Mic error:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);
  useEffect(() => {
    currentTranscriptRef.current = currentTranscript;
  }, [currentTranscript]);

  // Debug logging disabled
  const sendVoiceDebug = (data?: any) => {};

  // ═══ KILL any recognition — detach handlers, null ref, abort ═══
  const killRecognition = useCallback(() => {
    if (recognitionRef.current) {
      const old = recognitionRef.current;
      recognitionRef.current = null;
      try {
        old.onend = null;
        old.onerror = null;
        old.onresult = null;
        old.onstart = null;
      } catch {}
      try {
        old.abort();
      } catch {}
    }
  }, []);

  // ═══ Clear all timers ═══
  const clearTimers = useCallback(() => {
    if (commandTimerRef.current) {
      clearTimeout(commandTimerRef.current);
      commandTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    wakeRestartPendingRef.current = false;
    if (ttsSafetyTimerRef.current) {
      clearTimeout(ttsSafetyTimerRef.current);
      ttsSafetyTimerRef.current = null;
    }
  }, []);

  const scheduleWakeRestart = useCallback(
    (delayMs: number) => {
      if (!mountedRef.current || wakeWordHeardRef.current) return;

      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }

      wakeRestartPendingRef.current = true;
      restartTimerRef.current = setTimeout(() => {
        wakeRestartPendingRef.current = false;
        restartTimerRef.current = null;
        if (mountedRef.current && !wakeWordHeardRef.current) {
          startWakeRef.current();
        }
      }, delayMs);
    },
    [],
  );

  // ═══ BROWSER SUPPORT ═══
  useEffect(() => {
    setIsSecure(window.isSecureContext || window.location.hostname === "localhost");

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);
    synthRef.current = window.speechSynthesis;
    // Pre-warm voices
    synthRef.current.getVoices();
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = () => synthRef.current?.getVoices();
    }
  }, []);

  const initializeAssistant = useCallback(async () => {
    if (initialized) return;

    // 1. satisfies user gesture for AudioContext/Speech
    if (synthRef.current) {
      const ping = new SpeechSynthesisUtterance("");
      ping.volume = 0;
      synthRef.current.speak(ping);
    }

    // 2. ensures mic permission is active
    const stream = await ensureMicrophoneReady();
    if (stream) {
      setInitialized(true);
    } else {
      alert("Microphone connection failed. Neural-link requires active bio-input. Please allow microphone access.");
    }
  }, [ensureMicrophoneReady, initialized]);

  // NEW: React to initialization to start the listener safely
  useEffect(() => {
    if (initialized) {
      startWakeRef.current();
    }
  }, [initialized]);

  // ═══ INDIAN ENGLISH VOICE ═══
  const getVoice = useCallback(() => {
    if (!synthRef.current) return undefined;
    const voices = synthRef.current.getVoices();
    const indian = voices.find(
      (v) =>
        v.lang === "en-IN" ||
        v.name.toLowerCase().includes("india") ||
        v.name.includes("Ravi") ||
        v.name.includes("Microsoft Ravi"),
    );
    if (indian) return indian;
    const enIn = voices.find((v) => v.lang.startsWith("en-IN"));
    if (enIn) return enIn;
    const brit = voices.find(
      (v) =>
        (v.lang === "en-GB" && v.name.toLowerCase().includes("male")) ||
        v.name.includes("Google UK English Male") ||
        v.name.includes("Daniel"),
    );
    if (brit) return brit;
    return voices.find((v) => v.lang.startsWith("en")) || voices[0];
  }, []);

  // ═══ SPEAK — calls onDone when finished ═══
  const splitForSpeech = useCallback((text: string): string[] => {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) return [];

    const sentenceLike = cleaned
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    const chunks: string[] = [];
    const maxLen = 180;
    for (const piece of sentenceLike.length ? sentenceLike : [cleaned]) {
      if (piece.length <= maxLen) {
        chunks.push(piece);
        continue;
      }

      const words = piece.split(" ");
      let current = "";
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxLen) {
          if (current) chunks.push(current);
          current = word;
        } else {
          current = next;
        }
      }
      if (current) chunks.push(current);
    }
    return chunks;
  }, []);

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!synthRef.current || isMutedRef.current) {
        onDone?.();
        return;
      }

      let completed = false;
      const requestId = ++speechRequestIdRef.current;
      const chunks = splitForSpeech(text);

      const finish = () => {
        if (completed) return;
        completed = true;
        if (ttsSafetyTimerRef.current) {
          clearTimeout(ttsSafetyTimerRef.current);
          ttsSafetyTimerRef.current = null;
        }
        onDone?.();
      };

      synthRef.current.cancel();
      try {
        synthRef.current.resume();
      } catch {}

      if (!chunks.length) {
        finish();
        return;
      }

      ttsSafetyTimerRef.current = setTimeout(
        () => {
          finish();
        },
        Math.max(15000, chunks.length * 5000),
      );

      let idx = 0;
      const speakNext = () => {
        if (!synthRef.current) {
          finish();
          return;
        }
        if (requestId !== speechRequestIdRef.current) {
          finish();
          return;
        }
        if (idx >= chunks.length) {
          finish();
          return;
        }

        const utt = new SpeechSynthesisUtterance(chunks[idx]);
        idx += 1;
        utt.rate = 0.95;
        utt.pitch = 0.9;
        utt.volume = 0.95;
        const v = getVoice();
        if (v) utt.voice = v;

        utt.onend = () => {
          setTimeout(speakNext, 25);
        };
        utt.onerror = () => {
          setTimeout(speakNext, 25);
        };

        try {
          synthRef.current.speak(utt);
        } catch {
          setTimeout(speakNext, 25);
        }
      };

      speakNext();
    },
    [getVoice, splitForSpeech],
  );

  const normalizeSpeech = useCallback((text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const levenshtein = useCallback((a: string, b: string) => {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const dp: number[][] = Array.from({ length: rows }, () =>
      Array(cols).fill(0),
    );
    for (let i = 0; i < rows; i++) dp[i][0] = i;
    for (let j = 0; j < cols; j++) dp[0][j] = j;
    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
      }
    }
    return dp[a.length][b.length];
  }, []);

  const isWakeWordDetected = useCallback(
    (rawInput: string): { detected: boolean; command?: string } => {
      const normalized = normalizeSpeech(rawInput);
      if (!normalized) return { detected: false };

      // 1. DIRECT REGEX MATCH (Fast path)
      const wakePatterns = [
        /\b(hey|hi|hello|okay|ok|aye|yo|ready)\s+(marine|mar|mareye|ma\s*eye|eye)\s*(eye|ai|i|aye|eye)?\b/i,
        /\b(marine|mar|mareye|ma\s*eye)\s*(eye|ai|i|aye)?\b/i,
        /\bmareye\b/i,
      ];

      for (const pattern of wakePatterns) {
        const match = normalized.match(pattern);
        if (match) {
          // Extract everything after the wake word as the command
          const command = normalized.slice(match.index! + match[0].length).trim();
          return { detected: true, command: command.length > 2 ? command : undefined };
        }
      }

      // 2. N-GRAM / FUZZY MATCH (Robust path)
      const words = normalized.split(" ").filter(Boolean);
      const targets = WAKE_WORD_ALIASES.map((w) => w.replace(/\s/g, ""));
      const collapsed = normalized.replace(/\s/g, "");

      // Check for exact collapsed match
      for (const target of targets) {
        if (collapsed.startsWith(target)) {
          const cmd = normalized.slice(target.length).trim();
          return { detected: true, command: cmd.length > 2 ? cmd : undefined };
        }
      }

      // N-gram checking for fuzzy match
      for (let size = 1; size <= Math.min(4, words.length); size++) {
        for (let i = 0; i <= words.length - size; i++) {
          const slice = words.slice(i, i + size);
          const chunk = slice.join("");
          const phrase = slice.join(" ");

          for (const target of targets) {
            const maxDistance = target.length >= 8 ? 2 : 1;
            if (Math.abs(chunk.length - target.length) > maxDistance) continue;
            
            if (levenshtein(chunk, target) <= maxDistance) {
              // Found it. Command is everything after this n-gram in the original normalized string
              const phraseIndex = normalized.indexOf(phrase);
              const command = normalized.slice(phraseIndex + phrase.length).trim();
              return { detected: true, command: command.length > 2 ? command : undefined };
            }
          }
        }
      }

      return { detected: false };
    },
    [levenshtein, normalizeSpeech],
  );

  const shouldScanPlatformData = useCallback((command: string) => {
    const cmd = command.toLowerCase().trim();
    const casualPatterns = [
      /^(hi|hey|hello|howdy|yo|hola|namaste|namaskar)\b/,
      /^(good\s*(morning|afternoon|evening|night|day))\b/,
      /^(how are you|how do you do|what'?s up|sup|whats up)\b/,
      /^(thank|thanks|thank you|dhanyavaad|shukriya)\b/,
      /^(bye|goodbye|see you|take care|good night)\b/,
      /^(who are you|what are you|what is your name|what can you do)\b/,
      /^(ok|okay|alright|roger|copy|understood|aye|yes|no|yeah|nah|nope|yep)\b/,
    ];
    if (casualPatterns.some((p) => p.test(cmd))) return false;

    const infoKeywords = [
      "threat",
      "status",
      "report",
      "sitrep",
      "intel",
      "intelligence",
      "zone",
      "readiness",
      "fleet",
      "detection",
      "analytics",
      "model",
      "health",
      "data",
      "weather",
      "sea",
    ];
    return infoKeywords.some((k) => cmd.includes(k));
  }, []);

  // Forward-declared so processCommand can reference it
  const startCommandListeningDirect = useRef<() => void>(() => {});

  // ═══ RESTART WAKE WORD LISTENING — the core loop ═══
  const restartWakeWordListening = useCallback(() => {
    if (!mountedRef.current || !initialized) return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // Kill everything first
    killRecognition();
    clearTimers();
    // Don't cancel synth here — if called after TTS onend, cancelling can glitch Chrome's audio

    // Reset ALL flags
    wakeWordHeardRef.current = false;
    speechDetectedRef.current = false;
    isProcessingRef.current = false;
    sessionActiveRef.current = false;
    currentTranscriptRef.current = "";

    // Reset UI
    setBorderActive(false);
    setState("listening-wake");
    setCurrentTranscript("");

    // Start fresh recognition
    // NOTE: Using continuous=false and restarting onEnd is significantly more robust 
    // on macOS/Mobile than continuous=true which often "hangs" without error.
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US"; // Use standard EN-US for best secondary matching
    rec.maxAlternatives = 3;
    recognitionRef.current = rec;

    rec.onstart = () => {
      setState("listening-wake");
      sendVoiceDebug({ event: "wake.onstart", state: "listening-wake" });
    };

    rec.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          text += " " + event.results[i][j].transcript;
        }
      }
      const candidates = [text.trim()];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          const alt = event.results[i][j].transcript?.trim();
          if (alt) candidates.push(alt);
        }
      }

      const resultData = candidates.reduce<{ detected: boolean; command?: string }>(
        (acc, c) => {
          if (acc.detected) return acc;
          return isWakeWordDetected(c);
        },
        { detected: false },
      );

      if (resultData.detected && !wakeWordHeardRef.current) {
        wakeWordHeardRef.current = true;
        sessionActiveRef.current = true;
        isProcessingRef.current = false;
        setShowPanel(true);
        setBorderActive(true);

        const phraseHeard = candidates[0] ?? "mareye";
        const wakeDetail = { phrase: phraseHeard };
        window.dispatchEvent(new CustomEvent("mareye:wake", { detail: wakeDetail }));
        window.dispatchEvent(
          new CustomEvent("mareye:wake-word-detected", { detail: wakeDetail }),
        );
        sendVoiceDebug({
          event: "wake.detected",
          state: "speaking",
          transcript: phraseHeard,
          detected: true,
          proactiveCommand: resultData.command
        });

        // Kill wake word recognition immediately
        killRecognition();

        if (resultData.command) {
          // PROACTIVE MODE: User said "Hi MarEye, status report"
          // We bypass "Aye Commander" and go straight to processing
          setCurrentTranscript(resultData.command);
          processCommandDirect(resultData.command);
        } else {
          // STANDBY MODE: User just said "Hi MarEye"
          setState("speaking");
          speak("Aye Commander", () => {
            if (mountedRef.current) startCommandListeningDirect.current();
          });
        }
      }
    };

    rec.onerror = async (event: any) => {
      sendVoiceDebug({
        event: "wake.onerror",
        state: "listening-wake",
        error: event?.error || "unknown",
      });

      // "aborted" is expected during controlled restarts; onend will handle restart.
      if (event?.error === "aborted") {
        return;
      }

      // Auto-restart on any error — never stop listening
      if (mountedRef.current && !wakeWordHeardRef.current) {
        if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
          await ensureMicrophoneReady();
          scheduleWakeRestart(1200);
          return;
        }
        scheduleWakeRestart(300);
      }
    };

    rec.onend = () => {
      sendVoiceDebug({ event: "wake.onend", state: "listening-wake" });
      // Auto-restart if it stops for any reason — never stop listening
      if (mountedRef.current && !wakeWordHeardRef.current) {
        scheduleWakeRestart(220);
      }
    };

    try {
      rec.start();
    } catch {
      restartTimerRef.current = setTimeout(() => startWakeRef.current(), 500);
    }
  }, [
    killRecognition,
    clearTimers,
    ensureMicrophoneReady,
    isWakeWordDetected,
    scheduleWakeRestart,
    speak,
  ]);

  // ═══ PROCESS COMMAND ═══
  const processCommandDirect = useCallback(
    async (command: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      setState("processing");
      setTranscript((prev) => [
        ...prev,
        { type: "user", text: command, timestamp: new Date() },
      ]);

      try {
        const res = await fetch("/api/ai/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        const dataScanned = Boolean(data.dataScanned);
        setIsLikelyDataQuery(dataScanned);
        const response =
          data.response || "Commander, I could not process that request.";

        setTranscript((prev) => [
          ...prev,
          { type: "mareye", text: response, timestamp: new Date() },
        ]);
        setState("speaking");

        // After speaking → stay in active conversation unless user timed out
        speak(response, () => {
          isProcessingRef.current = false;
          // Chrome needs brief settle time after TTS
          setTimeout(() => {
            if (!mountedRef.current) return;
            if (sessionActiveRef.current) startCommandListeningDirect.current();
            else startWakeRef.current();
          }, 250);
        });
      } catch {
        const errText =
          "Commander, communications disrupted. Unable to process.";
        setTranscript((prev) => [
          ...prev,
          { type: "mareye", text: errText, timestamp: new Date() },
        ]);
        setState("speaking");
        speak(errText, () => {
          isProcessingRef.current = false;
          setTimeout(() => {
            if (!mountedRef.current) return;
            if (sessionActiveRef.current) startCommandListeningDirect.current();
            else startWakeRef.current();
          }, 250);
        });
      }
    },
    [speak],
  );

  // ═══ COMMAND LISTENING — 5s silence timeout, 15s hard cutoff ═══
  const startCommandListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR || !mountedRef.current) return;

    killRecognition();
    clearTimers();
    speechDetectedRef.current = false;
    currentTranscriptRef.current = "";

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language?.startsWith("en")
      ? navigator.language
      : "en-IN";
    recognitionRef.current = rec;

    const resetSilenceTimer = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      silenceTimerRef.current = setTimeout(() => {
        sessionActiveRef.current = false;
        wakeWordHeardRef.current = false;
        killRecognition();
        if (mountedRef.current) startWakeRef.current();
      }, 5000);
    };

    rec.onstart = () => {
      setState("listening-command");
      setCurrentTranscript("");
      sendVoiceDebug({ event: "command.onstart", state: "listening-command" });
      resetSilenceTimer();

      // 15s hard cutoff
      commandTimerRef.current = setTimeout(() => {
        try {
          if (recognitionRef.current) recognitionRef.current.stop();
        } catch {}
      }, 15000);
    };

    rec.onresult = (event: any) => {
      if (!speechDetectedRef.current) {
        speechDetectedRef.current = true;
      }
      resetSilenceTimer();

      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      const t = final || interim;
      setCurrentTranscript(t);
      currentTranscriptRef.current = t;
      sendVoiceDebug({
        event: "command.onresult",
        state: "listening-command",
        transcript: t,
        detected: Boolean(final),
      });

      if (final) {
        if (commandTimerRef.current) clearTimeout(commandTimerRef.current);
        commandTimerRef.current = setTimeout(() => {
          try {
            if (recognitionRef.current) recognitionRef.current.stop();
          } catch {}
        }, 1500);
      }
    };

    rec.onend = () => {
      clearTimers();
      if (isProcessingRef.current) {
        isProcessingRef.current = false;
      }

      const cmd = currentTranscriptRef.current.trim();
      sendVoiceDebug({
        event: "command.onend",
        state: "listening-command",
        transcript: cmd,
        detected: Boolean(cmd && speechDetectedRef.current),
      });
      if (cmd && speechDetectedRef.current) {
        setIsLikelyDataQuery(shouldScanPlatformData(cmd));
        processCommandDirect(cmd);
      } else {
        sessionActiveRef.current = false;
        wakeWordHeardRef.current = false;
        if (mountedRef.current) startWakeRef.current();
      }
    };

    rec.onerror = () => {
      sendVoiceDebug({ event: "command.onerror", state: "listening-command" });
      clearTimers();
      if (isProcessingRef.current) {
        isProcessingRef.current = false;
      }
      if (!mountedRef.current) return;
      if (sessionActiveRef.current) startCommandListeningDirect.current();
      else startWakeRef.current();
    };

    try {
      rec.start();
    } catch {
      if (mountedRef.current) startWakeRef.current();
    }
  }, [
    killRecognition,
    clearTimers,
    processCommandDirect,
    sendVoiceDebug,
    shouldScanPlatformData,
  ]);

  // Wire forward refs so callbacks can call latest version
  useEffect(() => {
    startWakeRef.current = restartWakeWordListening;
  }, [restartWakeWordListening]);

  useEffect(() => {
    startCommandListeningDirect.current = startCommandListening;
  }, [startCommandListening]);

  // ═══ AUTO-START ON MOUNT — always on, no button needed ═══
  useEffect(() => {
    mountedRef.current = true;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const timer = setTimeout(async () => {
      // Auto-start only if already initialized (rare case)
      if (initialized) startWakeRef.current();
    }, 400);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (synthRef.current) synthRef.current.cancel();
      speechRequestIdRef.current += 1;
      if (ttsSafetyTimerRef.current) {
        clearTimeout(ttsSafetyTimerRef.current);
        ttsSafetyTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureMicrophoneReady]);


  // ═══ STATE COLORS ═══
  const dotColor: Record<AssistantState, string> = {
    "listening-wake": "bg-cyan-400",
    "listening-command": "bg-emerald-400",
    processing: "bg-amber-400",
    speaking: "bg-violet-400",
  };

  const stateLabels: Record<AssistantState, string> = {
    "listening-wake": "ALWAYS LISTENING",
    "listening-command": "LISTENING...",
    processing: "PROCESSING INTEL",
    speaking: "RESPONDING",
  };

  const renderOverlay = () => {
    if (supported === null) return null; // Hide until hydration
    
    if (!supported) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl text-center">
          <div className="p-8 rounded-2xl border border-red-500/30 bg-slate-900/50 max-w-sm">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-orbitron text-red-400 mb-2">INTERFACE OFFLINE</h2>
            <p className="text-xs text-slate-400 font-space-mono mb-4">
              Your browser does not support the Web Speech API. Visual tactical interface only.
            </p>
            {!isSecure && (
              <p className="text-[10px] text-amber-500 font-space-mono mb-4 uppercase">
                ⚠️ Connection not secure. Platform requires HTTPS.
              </p>
            )}
            <button 
              onClick={() => setSupported(true)}
              className="px-4 py-2 border border-slate-700 text-slate-400 text-[10px] rounded hover:bg-slate-800 transition-colors uppercase tracking-widest font-orbitron"
            >
              Continue without Voice
            </button>
          </div>
        </div>
      );
    }

    if (!initialized) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="text-center p-8 rounded-2xl border border-cyan-500/30 bg-slate-900/50 shadow-2xl shadow-cyan-500/20 max-w-sm">
            <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <div 
                className="absolute inset-0 rounded-full border-2 border-cyan-500/20 transition-all duration-75"
                style={{ transform: `scale(${1 + micLevel / 100})`, opacity: 0.1 + micLevel / 50 }}
              />
              <div 
                className="absolute inset-0 rounded-full border border-cyan-400/40 transition-all duration-100"
                style={{ transform: `scale(${1 + micLevel / 150})` }}
              />
              <Radar className="w-12 h-12 text-cyan-400" />
            </div>
            <h2 className="text-xl font-orbitron text-cyan-300 mb-2 tracking-widest">
              NEURO-LINK READY
            </h2>
            <p className="text-xs text-cyan-500/60 font-space-mono mb-8 leading-relaxed">
              Tactical AI requires operator synchronization. Speak clearly into the bio-input once initialized.
            </p>
            {!isSecure && (
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded mb-6">
                <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest">
                  CRITICAL: SECURE CONTEXT REQUIRED
                </p>
                <p className="text-[8px] text-red-500/80 font-space-mono mt-1">
                  Neural link cannot bridge on unencrypted lines (HTTP). Use localhost or HTTPS.
                </p>
              </div>
            )}
            <button
              onClick={initializeAssistant}
              className="w-full py-4 px-6 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-orbitron text-xs tracking-[0.2em] transition-all shadow-lg shadow-cyan-500/30 active:scale-95 group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                INITIALIZE TACTICAL AI
                <Shield className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
            </button>
            <p className="mt-4 text-[8px] text-cyan-500/40 font-space-mono uppercase tracking-[0.3em]">
              LINK STATUS: <span className={syncStatus.includes('OFFLINE') ? 'text-red-400' : 'text-cyan-300'}>{syncStatus}</span>
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderOverlay()}

      {/* ═══ DEEP SEA BORDER EFFECT ═══ */}
      <DeepSeaBorderEffect
        active={borderActive}
        intensity={
          state === "listening-command"
            ? "critical"
            : state === "processing"
              ? "high"
              : "medium"
        }
      />

      {/* ═══ Tiny Always-On Indicator — Bottom Left (NO mic button) ═══ */}
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 mb-16 sm:mb-0">
        <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-cyan-500/20 backdrop-blur-sm shadow-lg shadow-black/20">
          {/* Pulsing dot — always alive */}
          <div className="relative">
            <div
              className={`w-2 h-2 rounded-full ${dotColor[state]} animate-pulse`}
            />
            {(state === "listening-wake" || state === "listening-command") && (
              <div
                className={`absolute inset-0 w-2 h-2 rounded-full ${dotColor[state]} animate-ping opacity-40`}
              />
            )}
          </div>
          <span className="text-[8px] font-orbitron text-cyan-400/70 uppercase tracking-widest select-none">
            {stateLabels[state]}
          </span>
        </div>
      </div>

      {/* ═══ Transcript Panel ═══ */}
      {showPanel && (
        <div className="fixed bottom-14 left-6 z-50 w-80 max-h-96">
          <div className="bg-slate-950/95 backdrop-blur-xl rounded-xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Radar className="w-4 h-4 text-cyan-400" />
                  {(state === "listening-wake" ||
                    state === "listening-command") && (
                    <div className="absolute inset-0 text-cyan-400 animate-ping opacity-40">
                      <Radar className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <span className="text-xs font-orbitron text-cyan-300 tracking-wider">
                  MAREYE VOICE
                </span>
                <div
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor[state]}`}
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 rounded hover:bg-slate-800 transition-colors"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <VolumeX className="w-3 h-3 text-red-400" />
                  ) : (
                    <Volume2 className="w-3 h-3 text-cyan-400" />
                  )}
                </button>
                <button
                  onClick={() => {
                    // Close panel — restart wake word listening
                    setShowPanel(false);
                    setBorderActive(false);
                    setCurrentTranscript("");

                    killRecognition();
                    clearTimers();
                    if (synthRef.current) {
                      try {
                        synthRef.current.cancel();
                      } catch {}
                    }
                    speechRequestIdRef.current += 1;
                    isProcessingRef.current = false;
                    sessionActiveRef.current = false;
                    wakeWordHeardRef.current = false;
                    speechDetectedRef.current = false;
                    currentTranscriptRef.current = "";
                    setIsLikelyDataQuery(false);

                    // Immediately back to listening
                    setTimeout(() => {
                      if (mountedRef.current) startWakeRef.current();
                    }, 100);
                  }}
                  className="p-1 rounded hover:bg-slate-800 transition-colors"
                >
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Live transcript */}
            {currentTranscript && state === "listening-command" && (
              <div className="px-4 py-2 border-b border-cyan-500/10 bg-emerald-500/5">
                <p className="text-[10px] text-emerald-400/60 font-space-mono uppercase mb-1">
                  Live Input
                </p>
                <p className="text-xs text-emerald-300 font-space-mono">
                  {currentTranscript}
                </p>
              </div>
            )}

            {/* Processing indicator */}
            {state === "processing" && (
              <div className="px-4 py-3 border-b border-amber-500/10 bg-amber-500/5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                  <span className="text-[10px] font-orbitron text-amber-400 tracking-wider">
                    {isLikelyDataQuery
                      ? "SCANNING PLATFORM DATA..."
                      : "PROCESSING REQUEST..."}
                  </span>
                </div>
              </div>
            )}

            {/* Conversation log */}
            <div className="max-h-60 overflow-y-auto p-3 space-y-3 mareye-voice-scroll">
              {transcript.length === 0 && (
                <div className="text-center py-6">
                  <Shield className="w-8 h-8 text-cyan-500/20 mx-auto mb-2" />
                  <p className="text-[10px] text-cyan-500/40 font-orbitron">
                    SAY &quot;MAREYE&quot; TO ACTIVATE
                  </p>
                  <p className="text-[9px] text-cyan-500/25 font-space-mono mt-1">
                    Then ask about threats, readiness, or status
                  </p>
                </div>
              )}
              {transcript.map((entry, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${entry.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  {entry.type === "mareye" && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <Radar className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-xs font-space-mono leading-relaxed ${
                      entry.type === "user"
                        ? "bg-cyan-500/15 border border-cyan-500/25 text-cyan-200"
                        : "bg-slate-800/80 border border-slate-700/50 text-cyan-100"
                    }`}
                  >
                    {entry.text}
                  </div>
                  {entry.type === "user" && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <Mic className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Hint */}
            <div className="px-4 py-2 border-t border-cyan-500/10 bg-slate-900/30">
              <p className="text-[8px] text-cyan-500/30 font-space-mono text-center">
                &quot;MarEye, current threat level?&quot; &bull; &quot;MarEye,
                give me a sitrep&quot;
              </p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mareye-voice-scroll::-webkit-scrollbar {
          width: 3px;
        }
        .mareye-voice-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .mareye-voice-scroll::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.2);
          border-radius: 2px;
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
}
