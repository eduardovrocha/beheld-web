/**
 * useDropdown — open/close de um menu com fechamento por click-outside e
 * Esc. Genérico (nav company/idioma, qualquer popover ancorado).
 *
 *   const dd = useDropdown<HTMLDivElement>();
 *   <div ref={dd.ref} data-open={dd.open ? "1" : "0"}>
 *     <button onClick={dd.toggle} aria-expanded={dd.open}>…</button>
 *     <div role="menu" onClick={dd.close}>…</div>
 *   </div>
 *
 * Abrir um e clicar em qualquer lugar fora (mousedown) fecha — então
 * abrir um segundo dropdown fecha o primeiro naturalmente.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export function useDropdown<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  return { ref, open, setOpen, toggle, close } as const;
}
