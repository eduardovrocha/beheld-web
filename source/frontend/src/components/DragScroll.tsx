/**
 * Horizontal scroll container you can drag with the mouse (click-and-drag),
 * on top of the usual wheel/trackpad scroll. The grab cursor only appears
 * when the content actually overflows — a row that fits stays a normal cursor.
 *
 * Uses Pointer Events so mouse + touch share one path; pointer capture keeps
 * the drag alive even if the cursor leaves the element mid-drag.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type PointerEvent } from "react";

export function DragScroll({ children, className, style }: {
  children:   ReactNode;
  className?: string;
  style?:     CSSProperties;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const start = useRef({ x: 0, left: 0 });
  const [dragging,   setDragging]   = useState(false);
  const [scrollable, setScrollable] = useState(false);

  // Track whether the content overflows, so the grab cursor / drag only kick
  // in when there's actually something to scroll. Re-measures on resize.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || !scrollable) return;
    start.current = { x: e.clientX, left: el.scrollLeft };
    setDragging(true);
    el.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || !dragging) return;
    el.scrollLeft = start.current.left - (e.clientX - start.current.x);
  }

  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragging(false);
    ref.current?.releasePointerCapture?.(e.pointerId);
  }

  const cursor = !scrollable ? undefined : dragging ? "grabbing" : "grab";

  return (
    <div ref={ref}
         className={`no-scrollbar ${className ?? ""}`}
         onPointerDown={onPointerDown}
         onPointerMove={onPointerMove}
         onPointerUp={endDrag}
         onPointerLeave={endDrag}
         style={{
           overflowX: "auto",
           cursor,
           userSelect: dragging ? "none" : undefined,
           ...style,
         }}>
      {children}
    </div>
  );
}
