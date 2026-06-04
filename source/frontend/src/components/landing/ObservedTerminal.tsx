/**
 * ObservedTerminal — the marketing-mock terminal in the hero right
 * column. It is NOT real telemetry of the visitor; values are static
 * representative numbers chosen to match the landing copy. Treat as
 * canvas, not data.
 *
 * Animation sequence (triggered when ≥40% of the element enters the
 * viewport, once per page-life):
 *
 *   1. Type `$ beheld view --snapshot` char-by-char (~40ms/char,
 *      initial prompt char is slower at 120ms).
 *   2. Three process steps with a braille spinner, each turning into
 *      a green `✓` when done:
 *        · scan L1 · git history     (900ms)
 *        · ler sessões L2            (800ms)
 *        · computar sinais agregados (700ms)
 *   3. Snapshot block fades in. Three signal rows enter in cascade
 *      (340ms stagger). Each row counts its `%` value up to target
 *      via easeOutCubic and fills its bar (CSS-driven transition).
 *   4. Three summary stats count up (180ms stagger).
 *   5. After 700ms, a permanent liveline fades in with a continuous
 *      braille spinner: "⠋ daemon ativo · observando sessões".
 *
 * Under `prefers-reduced-motion: reduce`, the component renders the
 * final state immediately (typing skipped, steps shown done, bars
 * filled, stats showing target numbers, liveline visible but its
 * spinner static at the first frame).
 */
import { useEffect, useMemo, useRef, useState } from "react";

import { useT } from "@/i18n/I18nProvider";
import type { TKey } from "@/i18n/dict";

const BRAILLE_FRAMES = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
const TYPED_CMD = "$ beheld view --snapshot";

type Step = { labelKey: TKey; duration: number };
const STEPS: Step[] = [
  { labelKey: "landing.term.step1", duration: 900 },
  { labelKey: "landing.term.step2", duration: 800 },
  { labelKey: "landing.term.step3", duration: 700 },
];

type Signal = { labelKey: TKey; value: number; suffix: string };
const SIGNALS: Signal[] = [
  { labelKey: "landing.term.signal_stack", value: 87, suffix: "%" },
  { labelKey: "landing.term.signal_test", value: 38, suffix: "%" },
  { labelKey: "landing.term.signal_react", value: 2, suffix: "%" },
];

type Stat = { labelKey: TKey; value: number; suffixKey?: TKey };
const STATS: Stat[] = [
  { labelKey: "landing.term.stat_sessions", value: 878 },
  { labelKey: "landing.term.stat_repos", value: 8 },
  { labelKey: "landing.term.stat_continuous", value: 7, suffixKey: "landing.term.years_suffix" },
];

type StepStatus = "pending" | "running" | "done";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function ObservedTerminal() {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  // Resolve all i18n strings once per render so the closures used in
  // setTimeout chains (`runSteps`, `streamSnapshot`) read the latest
  // values without re-reading t() per tick.
  const labels = useMemo(
    () => ({
      title: t("landing.term.title"),
      live: t("landing.term.live"),
      observedHeader: t("landing.term.observed_header"),
      concl1: t("landing.term.concl1"),
      concl2: t("landing.term.concl2"),
      liveline: t("landing.term.liveline"),
      steps: STEPS.map((s) => t(s.labelKey)),
      signals: SIGNALS.map((s) => t(s.labelKey)),
      stats: STATS.map((s) => ({
        label: t(s.labelKey),
        suffix: s.suffixKey ? t(s.suffixKey) : "",
      })),
    }),
    [t],
  );

  // typing
  const [typed, setTyped] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [cursorBlink, setCursorBlink] = useState(true);

  // process steps — index, status array, spinner frame
  const [stepStatus, setStepStatus] = useState<StepStatus[]>(
    () => STEPS.map(() => "pending"),
  );
  const [stepFrame, setStepFrame] = useState(0);

  // snapshot
  const [snapVisible, setSnapVisible] = useState(false);
  const [sigVisible, setSigVisible] = useState<boolean[]>(
    () => SIGNALS.map(() => false),
  );
  const [sigCount, setSigCount] = useState<number[]>(
    () => SIGNALS.map(() => 0),
  );
  const [statCount, setStatCount] = useState<number[]>(
    () => STATS.map(() => 0),
  );

  // liveline
  const [liveVisible, setLiveVisible] = useState(false);
  const [liveFrame, setLiveFrame] = useState(0);

  // ── Trigger on intersect (or immediately if reduced motion) ────────────
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    if (startedRef.current) return;

    if (prefersReducedMotion()) {
      // Skip everything: render final state directly.
      startedRef.current = true;
      setTyped(TYPED_CMD);
      setCursorVisible(false);
      setStepStatus(STEPS.map(() => "done"));
      setSnapVisible(true);
      setSigVisible(SIGNALS.map(() => true));
      setSigCount(SIGNALS.map((s) => s.value));
      setStatCount(STATS.map((s) => s.value));
      setLiveVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !startedRef.current) {
          startedRef.current = true;
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Liveline spinner (continuous, only after liveline visible) ─────────
  useEffect(() => {
    if (!liveVisible) return;
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      setLiveFrame((f) => (f + 1) % BRAILLE_FRAMES.length);
    }, 90);
    return () => window.clearInterval(id);
  }, [liveVisible]);

  // ── Per-step spinner ticking while any step is "running" ───────────────
  useEffect(() => {
    if (!stepStatus.some((s) => s === "running")) return;
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      setStepFrame((f) => (f + 1) % BRAILLE_FRAMES.length);
    }, 80);
    return () => window.clearInterval(id);
  }, [stepStatus]);

  // ── Sequencing helpers ────────────────────────────────────────────────
  function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
  }

  function countUp(
    target: number,
    durMs: number,
    onUpdate: (v: number) => void,
  ) {
    const t0 = performance.now();
    function tick(t: number) {
      const k = Math.min(1, (t - t0) / durMs);
      onUpdate(Math.round(target * easeOutCubic(k)));
      if (k < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function run() {
    // Phase 1: typing
    let i = 0;
    function typeNext() {
      if (i >= TYPED_CMD.length) {
        setCursorBlink(false);
        window.setTimeout(() => {
          setCursorVisible(false);
          runSteps(0);
        }, 300);
        return;
      }
      const ch = TYPED_CMD[i];
      setTyped((prev) => prev + ch);
      i += 1;
      window.setTimeout(typeNext, i < 2 ? 120 : 40);
    }
    typeNext();
  }

  function runSteps(idx: number) {
    if (idx >= STEPS.length) {
      streamSnapshot();
      return;
    }
    setStepStatus((prev) => {
      const next = [...prev];
      next[idx] = "running";
      return next;
    });
    window.setTimeout(() => {
      setStepStatus((prev) => {
        const next = [...prev];
        next[idx] = "done";
        return next;
      });
      runSteps(idx + 1);
    }, STEPS[idx].duration);
  }

  function streamSnapshot() {
    setSnapVisible(true);
    let i = 0;
    function nextSig() {
      if (i >= SIGNALS.length) {
        // start the stats cascade
        STATS.forEach((s, k) => {
          window.setTimeout(() => {
            countUp(s.value, 900, (v) =>
              setStatCount((prev) => {
                const next = [...prev];
                next[k] = v;
                return next;
              }),
            );
          }, k * 180);
        });
        window.setTimeout(() => setLiveVisible(true), 700);
        return;
      }
      const idx = i;
      setSigVisible((prev) => {
        const next = [...prev];
        next[idx] = true;
        return next;
      });
      countUp(SIGNALS[idx].value, 900, (v) =>
        setSigCount((prev) => {
          const next = [...prev];
          next[idx] = v;
          return next;
        }),
      );
      i += 1;
      window.setTimeout(nextSig, 340);
    }
    nextSig();
  }

  const spinChar = BRAILLE_FRAMES[stepFrame] ?? "⠋";
  const liveSpinChar = BRAILLE_FRAMES[liveFrame] ?? "⠋";

  return (
    <div className="term reveal d3" ref={rootRef}>
      <div className="term-bar">
        <span className="tdot r" />
        <span className="tdot y" />
        <span className="tdot g" />
        <span className="term-title">{labels.title}</span>
        <span className="live-tag">
          <span className="live-dot" />
          {labels.live}
        </span>
      </div>
      <div className="term-body">
        <div className="tline">
          <span style={{ color: "var(--term-prompt)" }}>{typed.charAt(0)}</span>
          {typed.slice(1)}
          {cursorVisible && (
            <span className={cursorBlink ? "cursor blink" : "cursor"} />
          )}
        </div>

        <div className="proclog">
          {STEPS.map((_s, k) => {
            const status = stepStatus[k];
            if (status === "pending") return null;
            const label = labels.steps[k];
            if (status === "running") {
              return (
                <div key={k}>
                  <span className="sp">{spinChar}</span> {label}…
                </div>
              );
            }
            return (
              <div key={k}>
                <span className="ok">✓</span> {label}
              </div>
            );
          })}
        </div>

        <div className={snapVisible ? "snap in" : "snap"}>
          <div className="snap-h">{labels.observedHeader}</div>

          {SIGNALS.map((s, k) => (
            <div
              key={s.labelKey}
              className={sigVisible[k] ? "sig in" : "sig"}
            >
              <div className="sh">
                <b>{labels.signals[k]}</b>
                <span className="v">
                  {sigCount[k]}
                  {s.suffix}
                </span>
              </div>
              <div className="sbar">
                <i
                  style={{
                    width: sigVisible[k] ? `${s.value}%` : "0%",
                  }}
                />
              </div>
            </div>
          ))}

          <div className="snap-stats">
            {STATS.map((s, k) => (
              <div className="it" key={s.labelKey}>
                <div className="n">
                  {statCount[k]}
                  {labels.stats[k].suffix}
                </div>
                <div className="l">{labels.stats[k].label}</div>
              </div>
            ))}
          </div>

          <div className="snap-concl">
            {labels.concl1}
            <br />
            {labels.concl2}
          </div>
        </div>

        <div className={liveVisible ? "liveline in" : "liveline"}>
          <span className="sp">{liveSpinChar}</span> {labels.liveline}
        </div>
      </div>
    </div>
  );
}
