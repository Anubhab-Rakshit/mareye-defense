"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollAnimation(options: ScrollAnimationOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = "0px 0px -50px 0px",
    triggerOnce = true,
  } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) observer.unobserve(element);
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

export function useParallax(speed: number = 0.5) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY * speed);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return offset;
}

export function useMouseParallax(intensity: number = 0.02) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const current = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const MAX_OFFSET = 4;
    const PARALLAX_SCALE = 0.08;
    const SMOOTHING = 0.02;
    const IDLE_AMPLITUDE = Math.min(Math.max(intensity * 70, 0.4), 1.1);
    const IDLE_X_SPEED = 0.00012;
    const IDLE_Y_SPEED = 0.00009;

    let lastMouseMoveAt = performance.now();
    let rafId = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rawX =
        (e.clientX - window.innerWidth / 2) * intensity * PARALLAX_SCALE;
      const rawY =
        (e.clientY - window.innerHeight / 2) * intensity * PARALLAX_SCALE;

      target.x = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, rawX));
      target.y = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, rawY));
      lastMouseMoveAt = performance.now();
    };

    const animate = (now: number) => {
      const idleForMs = now - lastMouseMoveAt;
      const isIdle = idleForMs > 80;

      const driftX = isIdle ? Math.sin(now * IDLE_X_SPEED) * IDLE_AMPLITUDE : 0;
      const driftY = isIdle
        ? Math.cos(now * IDLE_Y_SPEED) * IDLE_AMPLITUDE * 0.8
        : 0;

      const targetX = target.x + driftX;
      const targetY = target.y + driftY;

      current.x += (targetX - current.x) * SMOOTHING;
      current.y += (targetY - current.y) * SMOOTHING;

      setPosition({ x: current.x, y: current.y });
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, [intensity]);

  return position;
}

export function useCountUp(
  end: number,
  duration: number = 2000,
  startOnVisible: boolean = true,
) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnVisible);
  const ref = useRef<HTMLDivElement>(null);

  const start = useCallback(() => setHasStarted(true), []);

  useEffect(() => {
    if (!startOnVisible) return;
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [startOnVisible]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [hasStarted, end, duration]);

  return { count, ref, start };
}

export function useTypingEffect(
  text: string,
  speed: number = 50,
  startDelay: number = 0,
) {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText("");
    setIsComplete(false);

    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayText(text.slice(0, i + 1));
          i++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, speed);

      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);

  return { displayText, isComplete };
}
