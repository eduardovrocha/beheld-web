/**
 * Rich hover/focus tooltip — icon · label · title · description, in the site's
 * visual identity (cantos retos, label mono maiúscula, vars de cor).
 *
 * Opens on mouse hover AND keyboard focus (accessible). The trigger lives in
 * `children`; wrap any element (button, icon, chip).
 */
import { useState, type ReactNode } from "react";

export function Tooltip({ children, icon, label, title, description, tone, align = "right" }: {
  children:    ReactNode;
  icon?:       ReactNode;
  label:       string;
  title:       string;
  description: string;
  tone?:       "danger" | "ok";
  align?:      "right" | "left";   // which edge the card aligns to
}) {
  const [open, setOpen] = useState(false);
  const accent =
    tone === "danger" ? "var(--warn)" :
    tone === "ok"     ? "var(--ok)"   :
                        "var(--accent)";
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}>
      {children}
      {open && (
        <span role="tooltip"
              style={{
                position: "absolute", top: "calc(100% + 8px)",
                ...(align === "right" ? { right: 0 } : { left: 0 }),
                zIndex: 20, width: 280, textAlign: "left",
                background: "var(--card-bg)",
                border: "1px solid var(--rule)",
                boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
                padding: 14, cursor: "default",
              }}>
          <span className="flex items-center" style={{ gap: 8 }}>
            {icon && (
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 20, height: 20,
                background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                color: accent,
              }}>
                {icon}
              </span>
            )}
            <span className="font-mono uppercase"
                  style={{ color: accent, fontSize: 10, letterSpacing: "0.14em" }}>
              {label}
            </span>
          </span>
          <div style={{ color: "var(--text)", fontSize: 14, fontWeight: 600, marginTop: 8, lineHeight: 1.3 }}>
            {title}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>
            {description}
          </div>
        </span>
      )}
    </span>
  );
}
