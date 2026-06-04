/**
 * useReveal — adds the `in` class to a node the first time it intersects
 * the viewport, then unobserves. Pair with the `.reveal` base styles in
 * index.css (opacity/translateY → 0 on `.reveal.in`).
 *
 * Honours `prefers-reduced-motion: reduce` by adding `in` immediately
 * (no transition triggered if the CSS also disables transitions for
 * reduced motion).
 *
 * Usage:
 *   const ref = useReveal<HTMLDivElement>();
 *   return <div ref={ref} className="reveal">…</div>;
 */
import { useEffect, useRef } from "react";

export function useReveal<T extends Element = HTMLElement>(
  options: IntersectionObserverInit = { threshold: 0.16 },
): React.RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      node.classList.add("in");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      options,
    );
    io.observe(node);
    return () => io.disconnect();
  }, [options]);

  return ref;
}

/**
 * useRevealMany — same idea, but for a container whose direct .reveal
 * descendants should all be observed. Useful inside lists/grids where
 * spawning a ref per item is awkward.
 */
export function useRevealMany<T extends Element = HTMLElement>(
  selector = ".reveal",
  options: IntersectionObserverInit = { threshold: 0.16 },
): React.RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const nodes = Array.from(root.querySelectorAll(selector));
    if (prefersReducedMotion) {
      nodes.forEach((n) => n.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      options,
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [selector, options]);

  return ref;
}
