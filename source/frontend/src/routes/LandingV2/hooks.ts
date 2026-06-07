/* ============================================================
   useHeroRotation
   Auto-cycles through hero variant ids ('a' → 'b' → 'c' → 'd' → 'a').
   Pauses while document.hidden. Clicking a dot jumps + the loop keeps
   running (no manual pause in production — see kit README §4).

   Copy-to-clipboard, counter animation and scroll reveal from the kit
   were replaced by the codebase equivalents: InstallBox,
   MachineCounter and useRevealMany (src/hooks/useReveal.ts).
   ============================================================ */
import { useEffect, useRef, useState } from "react";

export function useHeroRotation(
  order: readonly string[] = ["a", "b", "c", "d"],
  intervalMs = 6000,
) {
  const [active, setActive] = useState<string>(order[0]);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      const cur = activeRef.current;
      const next = order[(order.indexOf(cur) + 1) % order.length];
      setActive(next);
    }, intervalMs);
    return () => clearInterval(id);
  }, [order, intervalMs]);

  return [active, setActive] as const;
}
