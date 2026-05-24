/**
 * Ambient constellation background — particle network rendered behind page
 * content. Each particle is an observed signal; each hairline between two
 * particles is a correlation. Drift is autonomous and slow, opacity breathes
 * per-particle with desynced periods. Theme-reactive via --accent.
 *
 * Spec: see project notes "Constellation background — prompt de implementação".
 *
 * React shell here is thin: it owns the <canvas> ref + lifecycle (cleanup of
 * rAF, MutationObserver, resize, visibilitychange) so HMR remounts don't leak.
 * All drawing logic stays in this module to keep it framework-agnostic.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  period: number; // ms
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex(raw: string): Rgb {
  const hex = raw.replace("#", "").trim();
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  return {
    r: parseInt(expanded.substr(0, 2), 16) || 0,
    g: parseInt(expanded.substr(2, 2), 16) || 0,
    b: parseInt(expanded.substr(4, 2), 16) || 0,
  };
}

function readAccent(): Rgb {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--accent")
    .trim();
  if (raw.startsWith("#")) return parseHex(raw);
  // fallback if --accent is rgb() or unset
  const m = raw.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  return { r: 138, g: 111, b: 62 }; // light --accent default
}

export function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    const COUNT = isMobile ? 32 : 64;
    const MAX_DIST = isMobile ? 100 : 140;
    const MAX_DIST_SQ = MAX_DIST * MAX_DIST;
    const DRIFT_SPEED = 0.12;
    const BREATH_MIN = 0.32;
    const BREATH_MAX = 0.72;
    const LINE_ALPHA_MAX = 0.14;
    const DOT_BASE_R = 1.1;
    const DOT_VAR_R = 1.4;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let rafId: number | null = null;
    let last = performance.now();
    let elapsed = 0;
    let accent: Rgb = readAccent();

    function resize() {
      dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(dpr, dpr);
    }
    resize();

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * DRIFT_SPEED * 2,
      vy: (Math.random() - 0.5) * DRIFT_SPEED * 2,
      r: DOT_BASE_R + Math.random() * DOT_VAR_R,
      phase: Math.random() * Math.PI * 2,
      period: 3200 + Math.random() * 4800,
    }));

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.lineWidth = 0.6;

      // links between near pairs
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;
          if (distSq < MAX_DIST_SQ) {
            const a =
              (1 - Math.sqrt(distSq) / MAX_DIST) * LINE_ALPHA_MAX;
            ctx!.strokeStyle = `rgba(${accent.r},${accent.g},${accent.b},${a})`;
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }

      // particles with per-particle breathing
      for (const p of particles) {
        const t = Math.sin((elapsed * 2 * Math.PI) / p.period + p.phase);
        const a = BREATH_MIN + (BREATH_MAX - BREATH_MIN) * (0.5 + 0.5 * t);
        ctx!.fillStyle = `rgba(${accent.r},${accent.g},${accent.b},${a})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function frame(now: number) {
      const dt = now - last;
      last = now;
      elapsed += dt;
      for (const p of particles) {
        p.x += p.vx * (dt / 16.6);
        p.y += p.vy * (dt / 16.6);
        if (p.x < -10) p.x = W + 10;
        else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        else if (p.y > H + 10) p.y = -10;
      }
      draw();
      if (!document.hidden) rafId = requestAnimationFrame(frame);
    }

    // ── listeners with cleanup ────────────────────────────────────────────
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    // Observe BOTH attributes — `class` flips on every theme change
    // (auto/light/dark), `data-theme` only on explicit picks. Watching
    // class is the canonical signal in this app's ThemeToggle.
    const themeObserver = new MutationObserver(() => {
      accent = readAccent();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const onVisibility = () => {
      if (!document.hidden && !reduceMotion) {
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduceMotion) {
      draw();
    } else {
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      themeObserver.disconnect();
    };
  }, []);

  // Portal to body so the canvas is a sibling of #root and not affected by
  // its `zoom: 1.2`. Position:fixed then behaves predictably across browsers.
  return createPortal(
    <canvas ref={canvasRef} aria-hidden="true" className="constellation" />,
    document.body,
  );
}
