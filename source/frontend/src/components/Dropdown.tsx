// Fully-custom dropdown (not <select>) so the menu panel uses the same
// hairline + chip vocabulary as the rest of the app. Closes on outside click
// and Escape; arrow keys + Enter for keyboard nav. The trigger looks like an
// Input field with a chevron; the panel is a card with mono-marked options
// that invert on hover. Shared by /directory (Status do bundle) and the
// contact form (Cargo da vaga).
import { useEffect, useRef, useState } from "react";

export function Dropdown({ value, onChange, options, disabled, maxWidth = 360 }: {
  value:    string;
  onChange: (next: string) => void;
  options:  Array<{ value: string; label: string }>;
  disabled?: boolean;
  maxWidth?: number;
}) {
  const [open, setOpen]             = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const containerRef                = useRef<HTMLDivElement>(null);
  const selected                    = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIndex((i) => Math.min(options.length - 1, i + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIndex((i) => Math.max(0, i - 1));
      }
      if (e.key === "Enter" && focusIndex >= 0) {
        e.preventDefault();
        onChange(options[focusIndex].value);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown",   onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown",   onKeyDown);
    };
  }, [open, focusIndex, options, onChange]);

  function toggle() {
    if (disabled) return;
    setOpen((v) => {
      if (!v) setFocusIndex(Math.max(0, options.findIndex((o) => o.value === value)));
      return !v;
    });
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", maxWidth }}>
      {/* trigger */}
      <button type="button" onClick={toggle} disabled={disabled}
              aria-haspopup="listbox" aria-expanded={open}
              style={{
                font: "inherit", fontSize: 14,
                padding: "8px 12px",
                color: "var(--text)", background: "var(--bg)",
                border: "1px solid var(--rule)",
                borderRadius: 0,
                outline: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                width: "100%",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12,
                letterSpacing: "0.01em",
              }}>
        <span style={{ color: "var(--text)" }}>{selected?.label}</span>
        <span aria-hidden="true"
              className="font-mono"
              style={{
                color: "var(--muted)", fontSize: 10, letterSpacing: "0.14em",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 120ms ease",
                display: "inline-block",
              }}>
          ▾
        </span>
      </button>

      {/* panel */}
      {open && (
        <ul role="listbox"
            style={{
              position: "absolute", top: "calc(100% - 1px)", left: 0, right: 0,
              margin: 0, padding: 0,
              listStyle: "none",
              background: "var(--card-bg)",
              border: "1px solid var(--rule)",
              zIndex: 50,
              boxShadow: "0 12px 28px -16px rgba(0,0,0,0.25)",
            }}>
          {options.map((o, i) => {
            const isSelected = o.value === value;
            const isFocused  = i === focusIndex;
            return (
              <li key={o.value}
                  role="option" aria-selected={isSelected}
                  onMouseEnter={() => setFocusIndex(i)}
                  onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false); }}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: 13.5,
                    color:      isFocused ? "var(--bg)"   : "var(--text)",
                    background: isFocused ? "var(--text)" : "transparent",
                    display: "flex", alignItems: "center", gap: 10,
                    borderTop: i === 0 ? "none" : "1px solid var(--rule-soft)",
                  }}>
                <span className="font-mono"
                      style={{
                        fontSize: 10, letterSpacing: "0.14em",
                        color: isSelected
                          ? (isFocused ? "var(--bg)" : "var(--accent)")
                          : (isFocused ? "var(--bg)" : "var(--muted)"),
                        width: 12,
                      }}>
                  {isSelected ? "●" : "○"}
                </span>
                <span style={{ flex: 1 }}>{o.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
