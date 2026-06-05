/**
 * MachineCounter — "estou em N máquinas" row in the hero (pulsing green
 * dot + B3-voice count).
 *
 * Wired to the real install counter: GET /api/install/count (the same
 * endpoint InstallCounter uses; 60s server-side cache). On mount the
 * number animates 0 → count over 1.7s with an ease-out cubic, formatted
 * per-locale via Intl. Honours `prefers-reduced-motion` by jumping
 * straight to the final value.
 *
 * Failure policy follows the InstallCounter convention: API down /
 * non-numeric payload → the row does NOT render. Better absent than
 * wrong.
 */
import { useEffect, useState } from "react";

import { useFmt, useI18n } from "@/i18n/I18nProvider";

const COUNT_URL = "/api/install/count";
const DURATION_MS = 1700;

interface CountResponse {
  count: number;
}

export function MachineCounter() {
  const { tp } = useI18n();
  const { number } = useFmt();
  const [target, setTarget] = useState<number | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(COUNT_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CountResponse | null) => {
        if (cancelled) return;
        if (data && typeof data.count === "number" && Number.isFinite(data.count) && data.count >= 0) {
          setTarget(data.count);
        }
      })
      .catch(() => {
        /* falha silenciosa — componente não renderiza */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (target === null) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || target === 0) {
      setDisplay(target);
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / DURATION_MS);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplay(Math.round(e * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  if (target === null) return null;

  // Plural category follows the real target; the animated display value
  // is injected pre-formatted, then split back out so the number can be
  // bolded in signal green.
  const formatted = number(display);
  const text = tp("landing.machines.text", target, { count: formatted });
  const at = text.indexOf(formatted);
  const before = at >= 0 ? text.slice(0, at) : text;
  const after = at >= 0 ? text.slice(at + formatted.length) : "";

  return (
    <p className="hero__counter">
      <span className="dot" />
      {before}
      {at >= 0 && <b>{formatted}</b>}
      {after}
    </p>
  );
}
