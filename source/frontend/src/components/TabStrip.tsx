/**
 * Shared horizontal tab strip used by /dashboard (dev) and /company/dashboard
 * (recruiter). One canonical implementation so both surfaces share the
 * same visual rhythm: hairline border, accent underline on the active tab,
 * mono badge for counts.
 *
 * Behavior is dumb — callers manage the active state + URL hash sync;
 * this component only renders the buttons and emits onSelect.
 */
import { type ReactNode } from "react";

export interface TabDef<Id extends string> {
  id:    Id;
  label: string;
  badge?: number | null;   // shown only when > 0
}

export function TabStrip<Id extends string>({
  tabs, active, onSelect, trailing,
}: {
  tabs:     readonly TabDef<Id>[];
  active:   Id;
  onSelect: (id: Id) => void;
  // Optional element pinned to the right end of the strip, vertically aligned
  // with the tab titles (e.g. a legend/key icon with a tooltip).
  trailing?: ReactNode;
}) {
  return (
    <div role="tablist"
         className="flex flex-wrap items-stretch gap-x-0 gap-y-2"
         style={{ borderBottom: "1px solid var(--rule)" }}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        const showBadge = typeof t.badge === "number" && t.badge > 0;
        return (
          <button key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelect(t.id)}
                  style={tabStyle(isActive)}>
            {t.label}
            {showBadge && (
              <span className="font-mono"
                    style={{
                      marginLeft: 8, padding: "1px 7px",
                      fontSize: 10, letterSpacing: "0.06em",
                      background: isActive ? "var(--accent)" : "var(--rule-soft)",
                      color:      isActive ? "var(--bg)"     : "var(--muted)",
                      border: `1px solid ${isActive ? "var(--accent)" : "var(--rule)"}`,
                      fontFeatureSettings: '"tnum"',
                    }}>
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
      {trailing && (
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", paddingRight: 4 }}>
          {trailing}
        </span>
      )}
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    font: "inherit",
    background: "transparent",
    border: "none",
    padding: "10px 16px",
    cursor: "pointer",
    color: active ? "var(--text)" : "var(--muted)",
    fontWeight: active ? 600 : 400,
    fontSize: 14,
    letterSpacing: "-0.005em",
    // Active-tab indicator — a 2px accent rule that sits on the strip's
    // own hairline border so the active label visually owns its slot.
    borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
    marginBottom: "-1px",
    transition: "color 120ms ease",
  };
}
